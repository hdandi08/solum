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
  labelActionKey,
  runAuditedExternalAction,
} from '../_shared/adminExternalActions.ts'
import { sendDispatchEmail } from '../_shared/emails.ts'

const KIT_WEIGHT: Record<string, string> = {
  ground: '1.500',
  ritual: '2.000',
  sovereign: '2.500',
}

const BOX_PRODUCT: Record<string, string> = {
  first_box: 'box-first-kit',
  refill: 'box-monthly-refill',
}

type Customer = {
  first_name?: string | null
  last_name?: string | null
  email?: string
}

type OrderRow = {
  id: string
  customer_id: string
  kit_id: string
  order_type: string
  status: string
  sendcloud_parcel_id: string | number | null
  tracking_number: string | null
  customers: Customer | Customer[] | null
}

type AddressRow = {
  name: string
  line1: string
  line2: string | null
  city: string
  postcode: string
  phone: string | null
  country: string | null
}

function relation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function validationError(context: AdminContext, message: string) {
  return new AdminHttpError(
    400,
    'VALIDATION_FAILED',
    message,
    context,
  )
}

function actionFailureCode(error: unknown): string {
  if (
    error instanceof AdminHttpError
    && (
      error.code === 'SENDCLOUD_REQUEST_FAILED'
      || error.code === 'ORDER_UPDATE_FAILED'
    )
  ) {
    return error.code
  }
  return 'SHIPPING_LABEL_ACTION_FAILED'
}

function sendcloudCredentials(context: AdminContext) {
  const publicKey = Deno.env.get('SENDCLOUD_PUBLIC_KEY')
  const secretKey = Deno.env.get('SENDCLOUD_SECRET_KEY')
  if (!publicKey || !secretKey) {
    throw new AdminHttpError(
      500,
      'ADMIN_CONFIG_INVALID',
      'Shipping service configuration is invalid.',
      context,
    )
  }
  return {
    authorization: `Basic ${btoa(`${publicKey}:${secretKey}`)}`,
  }
}

function sendcloudFailure(context: AdminContext) {
  return new AdminHttpError(
    502,
    'SENDCLOUD_REQUEST_FAILED',
    'SendCloud could not complete the shipping-label request.',
    context,
  )
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const value = await response.json()
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function pdfBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunks: string[] = []
  const size = 0x8000
  for (let index = 0; index < bytes.length; index += size) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(index, index + size)),
    )
  }
  return btoa(chunks.join(''))
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
      throw validationError(
        context,
        'Shipping-label request must be an object.',
      )
    }

    const input = body as Record<string, unknown>
    if (input.list_options !== undefined) {
      throw validationError(
        context,
        'Shipping-options debug mode is not available.',
      )
    }
    if (typeof input.order_id !== 'string') {
      throw validationError(context, 'order_id must be a UUID.')
    }

    let actionKey: string
    try {
      actionKey = labelActionKey(input.order_id)
    } catch (error) {
      throw validationError(
        context,
        error instanceof Error ? error.message : 'order_id is invalid.',
      )
    }

    const orderId = input.order_id
    const getLabel = input.get_label === true
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    if (getLabel) {
      const { data: existing, error } = await db
        .from('orders')
        .select('sendcloud_parcel_id')
        .eq('id', orderId)
        .single()
      if (error || !existing?.sendcloud_parcel_id) {
        throw new AdminHttpError(
          404,
          'LABEL_NOT_FOUND',
          'No shipping label was found for this order.',
          context,
        )
      }

      const credentials = sendcloudCredentials(context)
      const response = await fetch(
        `https://panel.sendcloud.sc/api/v3/parcels/${
          encodeURIComponent(String(existing.sendcloud_parcel_id))
        }/documents/label`,
        {
          headers: {
            Authorization: credentials.authorization,
            Accept: 'application/pdf',
          },
        },
      )
      if (!response.ok) {
        console.error('ADMIN_LABEL_DOWNLOAD_FAILED', {
          request_id: context.requestId,
          order_id: orderId,
          status: response.status,
        })
        throw sendcloudFailure(context)
      }
      return jsonOk({
        pdf_base64: pdfBase64(await response.arrayBuffer()),
      }, context)
    }

    const { data, error: orderError } = await db
      .from('orders')
      .select(
        'id, customer_id, kit_id, order_type, status, sendcloud_parcel_id, tracking_number, customers(first_name, last_name, email)',
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
    if (order.sendcloud_parcel_id) {
      throw new AdminHttpError(
        409,
        'LABEL_ALREADY_EXISTS',
        'A shipping label already exists for this order.',
        context,
      )
    }
    if (order.status !== 'paid') {
      throw new AdminHttpError(
        409,
        'INVALID_TRANSITION',
        'Only paid orders can receive a shipping label.',
        context,
      )
    }

    const { data: addressData, error: addressError } = await db
      .from('addresses')
      .select('name, line1, line2, city, postcode, phone, country')
      .eq('customer_id', order.customer_id)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (addressError || !addressData) {
      throw validationError(
        context,
        'A current shipping address is required for this order.',
      )
    }

    const address = addressData as AddressRow
    const customer = relation(order.customers)
    const credentials = sendcloudCredentials(context)
    const auditDatabase = createSupabaseAuditDatabase(db)
    const fromAddress = {
      name: Deno.env.get('SENDCLOUD_FROM_NAME') ?? 'BySolum Limited',
      address_line_1: Deno.env.get('SENDCLOUD_FROM_ADDRESS_LINE1') ?? '',
      city: Deno.env.get('SENDCLOUD_FROM_CITY') ?? '',
      postal_code: Deno.env.get('SENDCLOUD_FROM_POSTAL_CODE') ?? '',
      country_code: Deno.env.get('SENDCLOUD_FROM_COUNTRY_CODE') ?? 'GB',
      phone_number: Deno.env.get('SENDCLOUD_FROM_PHONE') ?? '',
      email: Deno.env.get('SENDCLOUD_FROM_EMAIL') ?? '',
    }
    const weight = KIT_WEIGHT[order.kit_id] ?? '2.000'
    const toCountry = address.country ?? 'GB'
    const customerName = [
      customer?.first_name,
      customer?.last_name,
    ].filter(Boolean).join(' ') || address.name

    const result = await runAuditedExternalAction({
      orderId,
      context,
      auditDatabase,
      action: 'order.shipping_label.create',
      failureCode: actionFailureCode,
      beforeState: {
        order_status: order.status,
        parcel_id: null,
        action_key: actionKey,
      },
      execute: async () => {
        let shippingOptionCode = Deno.env.get(
          'SENDCLOUD_SHIPPING_OPTION_CODE',
        )
        if (!shippingOptionCode) {
          let optionsResponse: Response
          try {
            optionsResponse = await fetch(
              'https://panel.sendcloud.sc/api/v3/shipping-options',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: credentials.authorization,
                },
                body: JSON.stringify({
                  from_country_code: fromAddress.country_code,
                  to_country_code: toCountry,
                  from_postal_code: fromAddress.postal_code,
                  to_postal_code: address.postcode,
                  parcels: [{
                    weight: { value: weight, unit: 'kg' },
                  }],
                }),
              },
            )
          } catch (error) {
            console.error('ADMIN_LABEL_OPTIONS_FAILED', {
              request_id: context?.requestId,
              order_id: orderId,
              message: error instanceof Error ? error.message : String(error),
            })
            throw sendcloudFailure(context!)
          }
          const optionsPayload = await responseJson(optionsResponse)
          const options = Array.isArray(optionsPayload.data)
            ? optionsPayload.data as Array<Record<string, unknown>>
            : []
          if (!optionsResponse.ok || typeof options[0]?.code !== 'string') {
            console.error('ADMIN_LABEL_OPTIONS_FAILED', {
              request_id: context?.requestId,
              order_id: orderId,
              status: optionsResponse.status,
            })
            throw sendcloudFailure(context!)
          }
          shippingOptionCode = options[0].code
        }

        let shipmentResponse: Response
        try {
          shipmentResponse = await fetch(
            'https://panel.sendcloud.sc/api/v3/shipments/announce',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: credentials.authorization,
              },
              body: JSON.stringify({
                to_address: {
                  name: customerName,
                  address_line_1: address.line1,
                  address_line_2: address.line2 ?? '',
                  city: address.city,
                  postal_code: address.postcode,
                  country_code: toCountry,
                  phone_number: address.phone ?? '',
                  email: customer?.email ?? '',
                },
                from_address: fromAddress,
                ship_with: {
                  type: 'shipping_option_code',
                  properties: {
                    shipping_option_code: shippingOptionCode,
                  },
                },
                order_number: order.id,
                parcels: [{
                  weight: { value: weight, unit: 'kg' },
                }],
              }),
            },
          )
        } catch (error) {
          console.error('ADMIN_LABEL_CREATE_FAILED', {
            request_id: context?.requestId,
            order_id: orderId,
            message: error instanceof Error ? error.message : String(error),
          })
          throw sendcloudFailure(context!)
        }

        const shipmentPayload = await responseJson(shipmentResponse)
        const responseData = shipmentPayload.data
        const dataObject = responseData
          && typeof responseData === 'object'
          && !Array.isArray(responseData)
          ? responseData as Record<string, unknown>
          : {}
        const parcels = Array.isArray(dataObject.parcels)
          ? dataObject.parcels as Array<Record<string, unknown>>
          : []
        const parcel = parcels[0]
        if (
          !shipmentResponse.ok
          || !parcel
          || (typeof parcel.id !== 'string' && typeof parcel.id !== 'number')
          || typeof parcel.tracking_number !== 'string'
        ) {
          console.error('ADMIN_LABEL_CREATE_FAILED', {
            request_id: context?.requestId,
            order_id: orderId,
            status: shipmentResponse.status,
          })
          throw sendcloudFailure(context!)
        }

        const carrierValue = dataObject.carrier
        const carrier = carrierValue
          && typeof carrierValue === 'object'
          && !Array.isArray(carrierValue)
          ? carrierValue as Record<string, unknown>
          : {}
        const carrierCode = typeof carrier.code === 'string'
          ? carrier.code
          : 'royal-mail'
        const trackingNumber = parcel.tracking_number
        const parcelId = String(parcel.id)
        const trackingUrl = trackingNumber && carrierCode.includes('royal')
          ? `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`
          : typeof parcel.tracking_url === 'string'
          ? parcel.tracking_url
          : null
        const documents = Array.isArray(parcel.documents)
          ? parcel.documents as Array<Record<string, unknown>>
          : []
        const label = documents.find(document => document.type === 'label')
        const labelUrl = typeof label?.link === 'string' ? label.link : null

        const { error: updateError } = await db
          .from('orders')
          .update({
            sendcloud_parcel_id: parcel.id,
            tracking_number: trackingNumber,
            carrier: carrierCode,
            dispatch_status: 'dispatched',
            dispatched_at: new Date().toISOString(),
          })
          .eq('id', orderId)
        if (updateError) {
          console.error('ADMIN_LABEL_ORDER_UPDATE_FAILED', {
            request_id: context?.requestId,
            order_id: orderId,
            message: updateError.message,
          })
          throw new AdminHttpError(
            502,
            'ORDER_UPDATE_FAILED',
            'The label was created but the order needs reconciliation.',
            context,
          )
        }

        const productId = BOX_PRODUCT[order.order_type]
        if (productId) {
          const { data: product, error: productError } = await db
            .from('products')
            .select('current_stock')
            .eq('id', productId)
            .single()
          if (!productError && product) {
            const stock = Math.max(0, (product.current_stock ?? 0) - 1)
            const [stockUpdate, transactionInsert] = await Promise.all([
              db.from('products')
                .update({ current_stock: stock })
                .eq('id', productId),
              db.from('inventory_transactions').insert({
                product_id: productId,
                transaction_type: 'outbound_order',
                quantity: -1,
                reference_type: 'dispatch',
                notes: order.order_type === 'first_box'
                  ? 'SendCloud label — first kit box'
                  : 'SendCloud label — refill mailer',
                created_by: context?.actor.email,
              }),
            ])
            if (stockUpdate.error || transactionInsert.error) {
              console.error('ADMIN_LABEL_INVENTORY_RECONCILIATION_REQUIRED', {
                request_id: context?.requestId,
                order_id: orderId,
              })
            }
          }
        }

        return {
          parcel_id: parcelId,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          label_url: labelUrl,
          order_status: 'dispatched',
        }
      },
      summarize: value => ({
        parcel_id: value.parcel_id,
        tracking_number: value.tracking_number,
        order_status: value.order_status,
      }),
    })

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && customer?.email) {
      const emailResult = await sendDispatchEmail(
        resendKey,
        customer.email,
        customer.first_name ?? null,
        result.tracking_number,
        result.tracking_url,
      )
      if (!emailResult.ok) {
        console.error('ADMIN_LABEL_EMAIL_FAILED', {
          request_id: context.requestId,
          order_id: orderId,
        })
      }
    }

    return jsonOk({
      parcel_id: result.parcel_id,
      tracking_number: result.tracking_number,
      label_url: result.label_url,
    }, context)
  } catch (error) {
    if (error instanceof AdminHttpError) return jsonError(error, context)

    console.error('ADMIN_LABEL_ERROR', {
      request_id: context?.requestId,
      message: error instanceof Error ? error.message : String(error),
    })
    return jsonError(
      new AdminHttpError(
        500,
        'INTERNAL_ERROR',
        'The shipping-label request could not be processed.',
        context,
      ),
      context,
    )
  }
})
