alter table public.orders
  add column if not exists customer_confirmation_email_sent_at timestamptz,
  add column if not exists customer_confirmation_email_resend_id text,
  add column if not exists admin_notification_email_sent_at timestamptz,
  add column if not exists admin_notification_email_resend_id text;

comment on column public.orders.customer_confirmation_email_sent_at is
  'When Resend accepted the live customer order-confirmation email.';
comment on column public.orders.admin_notification_email_sent_at is
  'When Resend accepted the live founder order-notification email.';
