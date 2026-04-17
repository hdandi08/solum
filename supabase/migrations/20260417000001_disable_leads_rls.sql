-- Leads table is read by anon for the public waitlist count widget.
-- RLS is not needed here — no user-specific row filtering required.
alter table public.leads disable row level security;
