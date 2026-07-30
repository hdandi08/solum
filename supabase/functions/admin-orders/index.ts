import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import {
  AdminHttpError,
  authorizeAdminRequest,
  handleAdminPreflight,
  jsonError,
  jsonOk,
  type AdminContext,
} from '../_shared/adminAuth.ts'
import {
  buildDispatchBatches,
  escapePostgrestLike,
  parseOrderListInput,
  parseOrderMutation,
} from '../_shared/adminOrders.ts'

function validationError(context: AdminContext, message: string) {
  return new AdminHttpError(
    400,
    'VALIDATION_FAILED',
    message,
    context,
  )
}

function relation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const first = value[0]
    return first && typeof first === 'object'
      ? first as Record<string, unknown>
      : null
  }
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : null
}

function flattenOrder(row: Record<string, unknown>) {
  const customer = relation(row.customers)
  const addresses = Array.isArray(customer?.addresses)
    ? customer.addresses as Array<Record<string, unknown>>
    : []
  const address = addresses.find((item) => item.is_current === true)
    ?? addresses[0]
    ?? null

  const {
    addresses: _addresses,
    ...customerFields
  } = customer ?? {}
  const { customers: _customers, ...order } = row

  return {
    ...order,
    customer: customer ? customerFields : null,
    address: address
      ? {
        name: address.name ?? null,
        line1: address.line1 ?? null,
        line2: address.line2 ?? null,
        city: address.city ?? null,
        postcode: address.postcode ?? null,
        phone: address.phone ?? null,
      }
      : null,
  }
}

Deno.serve(async (req) => {
  const preflight = handleAdminPreflight(req)
  if (preflight) return preflight

  let context: AdminContext | undefined

  try {
    context = await authorizeAdminRequest(req)
    if (req.method !== 'POST' && req.method !== 'PATCH') {
      throw new AdminHttpError(
        405,
        'METHOD_NOT_ALLOWED',
        'This admin operation requires POST or PATCH.',
        context,
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      throw validationError(context, 'Request body must be valid JSON.')
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    if (req.method === 'PATCH') {
      let mutation
      try {
        mutation = parseOrderMutation(body)
      } catch (error) {
        throw validationError(
          context,
          error instanceof Error ? error.message : 'Order mutation is invalid.',
        )
      }

      const { data, error } = await db.rpc('admin_mutate_order', {
        p_order_id: mutation.orderId,
        p_action: mutation.action,
        p_tracking_number: mutation.trackingNumber,
        p_carrier: mutation.carrier,
        p_actor_user_id: context.actor.userId,
        p_actor_email: context.actor.email,
        p_environment: context.environment,
        p_request_id: context.requestId,
      })

      if (error) throw new Error(error.message)
      const result = data as {
        ok?: boolean
        code?: string
        message?: string
        order?: Record<string, unknown>
      } | null

      if (!result?.ok) {
        const code = result?.code ?? 'ORDER_MUTATION_FAILED'
        const status = code === 'ORDER_NOT_FOUND'
          ? 404
          : code === 'INVALID_TRANSITION' || code === 'DUPLICATE_REQUEST'
          ? 409
          : code === 'VALIDATION_FAILED'
          ? 400
          : 500
        throw new AdminHttpError(
          status,
          code,
          result?.message ?? 'Order could not be updated.',
          context,
        )
      }

      return jsonOk({ order: result.order }, context)
    }

    let filters
    try {
      filters = parseOrderListInput(body)
    } catch (error) {
      throw validationError(
        context,
        error instanceof Error ? error.message : 'Order filters are invalid.',
      )
    }

    let customerIds: string[] | null = null
    if (filters.search) {
      const pattern = `%${escapePostgrestLike(filters.search)}%`
      const customerResults = await Promise.all([
        db.from('customers').select('id').ilike('email', pattern).limit(100),
        db.from('customers').select('id').ilike('first_name', pattern).limit(100),
        db.from('customers').select('id').ilike('last_name', pattern).limit(100),
      ])
      const failed = customerResults.find((result) => result.error)
      if (failed?.error) throw new Error(failed.error.message)
      customerIds = [
        ...new Set(
          customerResults.flatMap((result) =>
            (result.data ?? []).map((customer) => customer.id)
          ),
        ),
      ]
    }

    const pendingBatchesPromise = db
      .from('orders')
      .select('kit_id, order_type, box_number, created_at')
      .eq('status', 'paid')
      .eq('dispatch_status', 'pending')

    if (customerIds?.length === 0) {
      const { data: pendingRows, error: pendingError } =
        await pendingBatchesPromise
      if (pendingError) throw new Error(pendingError.message)
      return jsonOk({
        rows: [],
        total_count: 0,
        dispatch_batches: buildDispatchBatches(pendingRows ?? []),
      }, context)
    }

    let query = db
      .from('orders')
      .select(`
        id,
        customer_id,
        subscription_id,
        stripe_payment_id,
        kit_id,
        order_type,
        box_number,
        amount_pence,
        status,
        source,
        dispatch_status,
        tracking_number,
        carrier,
        dispatched_at,
        delivered_at,
        sendcloud_parcel_id,
        cancelled_at,
        refund_id,
        cancel_notes,
        created_at,
        customers(
          id,
          first_name,
          last_name,
          email,
          addresses(name, line1, line2, city, postcode, phone, is_current)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(
        filters.page * filters.pageSize,
        (filters.page + 1) * filters.pageSize - 1,
      )

    if (filters.orderType) query = query.eq('order_type', filters.orderType)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.dispatchStatus) {
      query = query.eq('dispatch_status', filters.dispatchStatus)
    }
    if (customerIds) query = query.in('customer_id', customerIds)

    const [ordersResult, pendingResult] = await Promise.all([
      query,
      pendingBatchesPromise,
    ])
    if (ordersResult.error) throw new Error(ordersResult.error.message)
    if (pendingResult.error) throw new Error(pendingResult.error.message)

    return jsonOk({
      rows: (ordersResult.data ?? []).map((row) =>
        flattenOrder(row as Record<string, unknown>)
      ),
      total_count: ordersResult.count ?? 0,
      dispatch_batches: buildDispatchBatches(pendingResult.data ?? []),
    }, context)
  } catch (error) {
    if (error instanceof AdminHttpError) return jsonError(error, context)

    console.error('ADMIN_ORDERS_ERROR', {
      request_id: context?.requestId,
      message: error instanceof Error ? error.message : String(error),
    })
    return jsonError(
      new AdminHttpError(
        500,
        'INTERNAL_ERROR',
        'Admin orders could not be processed.',
        context,
      ),
      context,
    )
  }
})
