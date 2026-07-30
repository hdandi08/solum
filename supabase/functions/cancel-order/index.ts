import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import {
  AdminHttpError,
  authorizeAdminRequest,
  handleAdminPreflight,
  jsonError,
  jsonOk,
  type AdminContext,
} from '../_shared/adminAuth.ts'
import { createSupabaseAuditDatabase } from '../_shared/adminAudit.ts'
import {
  refundIdempotencyKey,
  runAuditedExternalAction,
} from '../_shared/adminExternalActions.ts'
import { sendCancelEmail } from '../_shared/emails.ts'

type OrderRow = {
  id: string
  status: string
  stripe_payment_id: string | null
  sendcloud_parcel_id: string | number | null
  amount_pence: number
  customers:
    | { email?: string; first_name?: string | null }
    | Array<{ email?: string; first_name?: string | null }>
    | null
}

function validationError(context: AdminContext, message: string) {
  return new AdminHttpError(
    400,
    'VALIDATION_FAILED',
    message,
    context,
  )
}

function relation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function failureCode(error: unknown): string {
  if (
    error instanceof AdminHttpError
    && (
      error.code === 'STRIPE_REFUND_FAILED'
      || error.code === 'ORDER_UPDATE_FAILED'
    )
  ) {
    return error.code
  }
  return 'REFUND_ACTION_FAILED'
}

Deno.serve(async (req) => {
  const preflight = handleAdminPreflight(req)
  if (preflight) return preflight

  let context: AdminContext | undefined

  try {
    context = await authorizeAdminRequest(req)
    if (req.method !== 'POST') {
      throw new AdminHttpError(
        405,
        'METHOD_NOT_ALLOWED',
        'This admin operation requires POST.',
        context,
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      throw validationError(context, 'Request body must be valid JSON.')
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw validationError(context, 'Order refund request must be an object.')
    }

    const orderId = (body as Record<string, unknown>).order_id
    if (typeof orderId !== 'string') {
      throw validationError(context, 'order_id must be a UUID.')
    }

    let idempotencyKey: string
    try {
      idempotencyKey = refundIdempotencyKey(orderId)
    } catch (error) {
      throw validationError(
        context,
        error instanceof Error ? error.message : 'order_id is invalid.',
      )
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data, error: orderError } = await db
      .from('orders')
      .select(
        'id, status, stripe_payment_id, sendcloud_parcel_id, amount_pence, customers(email, first_name)',
      )
      .eq('id', orderId)
      .single()

    if (orderError || !data) {
      throw new AdminHttpError(
        404,
        'ORDER_NOT_FOUND',
        'Order was not found.',
        context,
      )
    }

    const order = data as OrderRow
    if (order.status !== 'paid') {
      throw new AdminHttpError(
        409,
        'INVALID_TRANSITION',
        'Only paid orders can be refunded.',
        context,
      )
    }
    if (!order.stripe_payment_id) {
      throw new AdminHttpError(
        422,
        'REFUND_UNAVAILABLE',
        'This order must be reviewed in Stripe before it can be refunded.',
        context,
      )
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) {
      throw new AdminHttpError(
        500,
        'ADMIN_CONFIG_INVALID',
        'Refund service configuration is invalid.',
        context,
      )
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })
    const auditDatabase = createSupabaseAuditDatabase(db)

    const result = await runAuditedExternalAction({
      orderId,
      context,
      auditDatabase,
      action: 'order.refund',
      failureCode,
      beforeState: {
        order_status: order.status,
        parcel_id: order.sendcloud_parcel_id === null
          ? null
          : String(order.sendcloud_parcel_id),
      },
      execute: async () => {
        let refundId: string
        try {
          const refund = await stripe.refunds.create(
            { payment_intent: order.stripe_payment_id! },
            { idempotencyKey },
          )
          if (refund.status === 'failed') throw new Error('refund failed')
          refundId = refund.id
        } catch (error) {
          console.error('ADMIN_REFUND_STRIPE_FAILED', {
            request_id: context?.requestId,
            order_id: orderId,
            message: error instanceof Error ? error.message : String(error),
          })
          throw new AdminHttpError(
            502,
            'STRIPE_REFUND_FAILED',
            'Stripe could not complete the refund. Use the request ID for support.',
            context,
          )
        }

        let sendcloudCancelled = false
        let cancelNotes: string | null = null
        if (order.sendcloud_parcel_id) {
          const publicKey = Deno.env.get('SENDCLOUD_PUBLIC_KEY')
          const secretKey = Deno.env.get('SENDCLOUD_SECRET_KEY')
          if (publicKey && secretKey) {
            try {
              const response = await fetch(
                `https://panel.sendcloud.sc/api/v2/parcels/${
                  encodeURIComponent(String(order.sendcloud_parcel_id))
                }/cancel`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Basic ${
                      btoa(`${publicKey}:${secretKey}`)
                    }`,
                  },
                },
              )
              sendcloudCancelled = response.ok
              if (!response.ok) {
                cancelNotes =
                  'SendCloud cancellation failed; manual review is required.'
                console.warn('ADMIN_REFUND_SENDCLOUD_CANCEL_FAILED', {
                  request_id: context?.requestId,
                  order_id: orderId,
                  status: response.status,
                })
              }
            } catch (error) {
              cancelNotes =
                'SendCloud cancellation failed; manual review is required.'
              console.warn('ADMIN_REFUND_SENDCLOUD_CANCEL_FAILED', {
                request_id: context?.requestId,
                order_id: orderId,
                message: error instanceof Error ? error.message : String(error),
              })
            }
          } else {
            cancelNotes =
              'SendCloud cancellation was not attempted; manual review is required.'
          }
        }

        const { error: updateError } = await db
          .from('orders')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            refund_id: refundId,
            cancel_notes: cancelNotes,
          })
          .eq('id', orderId)

        if (updateError) {
          console.error('ADMIN_REFUND_ORDER_UPDATE_FAILED', {
            request_id: context?.requestId,
            order_id: orderId,
            message: updateError.message,
          })
          throw new AdminHttpError(
            502,
            'ORDER_UPDATE_FAILED',
            'The refund completed but the order record needs reconciliation.',
            context,
          )
        }

        return {
          refund_id: refundId,
          sendcloud_cancelled: sendcloudCancelled,
          cancel_notes: cancelNotes,
          order_status: 'cancelled',
        }
      },
      summarize: value => ({
        refund_id: value.refund_id,
        sendcloud_cancelled: value.sendcloud_cancelled,
        order_status: value.order_status,
      }),
    })

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const customer = relation(order.customers)
    if (resendKey && customer?.email) {
      const emailResult = await sendCancelEmail(
        resendKey,
        customer.email,
        customer.first_name ?? null,
        result.refund_id,
        order.amount_pence,
      )
      if (!emailResult.ok) {
        console.error('ADMIN_REFUND_EMAIL_FAILED', {
          request_id: context.requestId,
          order_id: orderId,
        })
      }
    }

    return jsonOk({
      refund_id: result.refund_id,
      sendcloud_cancelled: result.sendcloud_cancelled,
      cancel_notes: result.cancel_notes,
    }, context)
  } catch (error) {
    if (error instanceof AdminHttpError) return jsonError(error, context)

    console.error('ADMIN_REFUND_ERROR', {
      request_id: context?.requestId,
      message: error instanceof Error ? error.message : String(error),
    })
    return jsonError(
      new AdminHttpError(
        500,
        'INTERNAL_ERROR',
        'The order refund could not be processed.',
        context,
      ),
      context,
    )
  }
})
