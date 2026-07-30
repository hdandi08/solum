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
  eventDateBounds,
  parseEventListInput,
} from '../_shared/adminEvents.ts'

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
      throw new AdminHttpError(
        400,
        'VALIDATION_FAILED',
        'Request body must be valid JSON.',
        context,
      )
    }

    let filters
    try {
      filters = parseEventListInput(body)
    } catch (error) {
      throw new AdminHttpError(
        400,
        'VALIDATION_FAILED',
        error instanceof Error ? error.message : 'Event filters are invalid.',
        context,
      )
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    let query = db
      .from('inventory_transactions')
      .select(`
        id,
        product_id,
        transaction_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by,
        created_at,
        products(name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(
        filters.page * filters.pageSize,
        (filters.page + 1) * filters.pageSize - 1,
      )

    if (filters.productId) {
      query = query.eq('product_id', filters.productId)
    }
    if (filters.transactionType) {
      query = query.eq('transaction_type', filters.transactionType)
    }
    const bounds = eventDateBounds(filters.dateFrom, filters.dateTo)
    if (bounds.fromInclusive) {
      query = query.gte('created_at', bounds.fromInclusive)
    }
    if (bounds.toExclusive) {
      query = query.lt('created_at', bounds.toExclusive)
    }

    const [eventsResult, productsResult] = await Promise.all([
      query,
      db
        .from('products')
        .select('id, name')
        .eq('is_active', true)
        .order('id'),
    ])
    if (eventsResult.error) throw new Error(eventsResult.error.message)
    if (productsResult.error) throw new Error(productsResult.error.message)

    const rows = (eventsResult.data ?? []).map((row) => {
      const product = relation(row.products)
      const { products: _products, ...fields } = row
      return {
        ...fields,
        product_name: typeof product?.name === 'string'
          ? product.name
          : row.product_id,
      }
    })

    return jsonOk({
      rows,
      total_count: eventsResult.count ?? 0,
      products: productsResult.data ?? [],
    }, context)
  } catch (error) {
    if (error instanceof AdminHttpError) return jsonError(error, context)

    console.error('ADMIN_EVENTS_ERROR', {
      request_id: context?.requestId,
      message: error instanceof Error ? error.message : String(error),
    })
    return jsonError(
      new AdminHttpError(
        500,
        'INTERNAL_ERROR',
        'Admin events could not be loaded.',
        context,
      ),
      context,
    )
  }
})
