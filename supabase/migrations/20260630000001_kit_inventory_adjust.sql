-- Kit-level inventory adjustment: idempotency flags on orders + atomic RPC.
-- See docs/superpowers/specs/2026-06-29-kit-inventory-deduction-design.md

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_kit_deducted  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_kit_restocked boolean NOT NULL DEFAULT false;

-- Atomic, race-safe single-statement adjust. Floors at 0.
-- Returns the new available_count, or NULL if the kit_id has no row.
CREATE OR REPLACE FUNCTION public.adjust_kit_inventory(p_kit_id text, p_delta int)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.kit_inventory
     SET available_count = GREATEST(0, available_count + p_delta),
         updated_at      = now()
   WHERE kit_id = p_kit_id
  RETURNING available_count;
$$;

REVOKE ALL ON FUNCTION public.adjust_kit_inventory(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_kit_inventory(text, int) TO service_role;
