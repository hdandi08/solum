-- Preserve the original acknowledgement timestamp while a 202 batch remains
-- pending reconciliation. This makes the Phase C 24-hour exception deadline
-- enforceable even if a service-role caller bypasses the acceptance RPC.
alter table public.awin_conversion_outbox
  drop constraint awin_conversion_outbox_provider_batch_accepted_check;

alter table public.awin_conversion_outbox
  add constraint awin_conversion_outbox_provider_batch_accepted_check
    check (
      (provider_batch_accepted_at is null or provider_batch_id is not null)
      and (
        state <> 'processing'
        or provider_batch_id is null
        or provider_batch_accepted_at is not null
      )
    );
