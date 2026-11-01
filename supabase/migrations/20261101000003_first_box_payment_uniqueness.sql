-- A single paid Stripe intent must not produce two first-box orders under
-- concurrent webhook deliveries. Existing duplicates require reconciliation,
-- never silent deletion; deployment should stop if the index cannot be created.
create unique index orders_first_box_payment_unique on public.orders(stripe_payment_id)
where order_type='first_box' and stripe_payment_id is not null;
