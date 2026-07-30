create or replace function public.admin_mutate_order(
  p_order_id uuid,
  p_action text,
  p_tracking_number text,
  p_carrier text,
  p_actor_user_id uuid,
  p_actor_email text,
  p_environment text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_error_code text;
  v_error_message text;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    insert into public.admin_audit_events (
      request_id,
      actor_user_id,
      actor_email,
      environment,
      action,
      target_type,
      target_id,
      status,
      error_code,
      completed_at
    ) values (
      p_request_id,
      p_actor_user_id,
      p_actor_email,
      p_environment,
      'order.' || p_action,
      'order',
      p_order_id::text,
      'failed',
      'ORDER_NOT_FOUND',
      now()
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'ORDER_NOT_FOUND',
      'message', 'Order was not found.'
    );
  end if;

  v_before := jsonb_build_object(
    'dispatch_status', v_order.dispatch_status,
    'tracking_number', v_order.tracking_number,
    'carrier', v_order.carrier
  );

  if p_action = 'dispatch' then
    if v_order.dispatch_status <> 'pending' then
      v_error_code := 'INVALID_TRANSITION';
      v_error_message := 'Only pending orders can be dispatched.';
    elsif p_carrier not in (
      'royal-mail',
      'evri',
      'dpd',
      'dhl',
      'parcelforce',
      'other'
    ) then
      v_error_code := 'VALIDATION_FAILED';
      v_error_message := 'Carrier is invalid.';
    elsif p_tracking_number is null
      or length(trim(p_tracking_number)) = 0
      or length(trim(p_tracking_number)) > 100
    then
      v_error_code := 'VALIDATION_FAILED';
      v_error_message := 'Tracking number is invalid.';
    end if;
  elsif p_action = 'deliver' then
    if v_order.dispatch_status <> 'dispatched' then
      v_error_code := 'INVALID_TRANSITION';
      v_error_message := 'Order must be dispatched before delivery.';
    end if;
  elsif p_action = 'reset_pending' then
    if v_order.dispatch_status <> 'dispatched' then
      v_error_code := 'INVALID_TRANSITION';
      v_error_message := 'Only dispatched orders can be reset to pending.';
    end if;
  else
    v_error_code := 'VALIDATION_FAILED';
    v_error_message := 'Order action is invalid.';
  end if;

  if v_error_code is not null then
    insert into public.admin_audit_events (
      request_id,
      actor_user_id,
      actor_email,
      environment,
      action,
      target_type,
      target_id,
      status,
      before_state,
      error_code,
      completed_at
    ) values (
      p_request_id,
      p_actor_user_id,
      p_actor_email,
      p_environment,
      'order.' || p_action,
      'order',
      p_order_id::text,
      'failed',
      v_before,
      v_error_code,
      now()
    );

    return jsonb_build_object(
      'ok', false,
      'code', v_error_code,
      'message', v_error_message
    );
  end if;

  if p_action = 'dispatch' then
    update public.orders
    set
      dispatch_status = 'dispatched',
      tracking_number = trim(p_tracking_number),
      carrier = p_carrier,
      dispatched_at = now()
    where id = p_order_id
    returning * into v_order;
  elsif p_action = 'deliver' then
    update public.orders
    set dispatch_status = 'delivered'
    where id = p_order_id
    returning * into v_order;
  else
    update public.orders
    set
      dispatch_status = 'pending',
      tracking_number = null,
      carrier = 'royal-mail',
      dispatched_at = null
    where id = p_order_id
    returning * into v_order;
  end if;

  v_after := jsonb_build_object(
    'dispatch_status', v_order.dispatch_status,
    'tracking_number', v_order.tracking_number,
    'carrier', v_order.carrier
  );

  insert into public.admin_audit_events (
    request_id,
    actor_user_id,
    actor_email,
    environment,
    action,
    target_type,
    target_id,
    status,
    before_state,
    after_state,
    completed_at
  ) values (
    p_request_id,
    p_actor_user_id,
    p_actor_email,
    p_environment,
    'order.' || p_action,
    'order',
    p_order_id::text,
    'succeeded',
    v_before,
    v_after,
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'dispatch_status', v_order.dispatch_status,
      'tracking_number', v_order.tracking_number,
      'carrier', v_order.carrier,
      'dispatched_at', v_order.dispatched_at
    )
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'DUPLICATE_REQUEST',
      'message', 'This admin request was already processed.'
    );
  when others then
    begin
      insert into public.admin_audit_events (
        request_id,
        actor_user_id,
        actor_email,
        environment,
        action,
        target_type,
        target_id,
        status,
        before_state,
        error_code,
        completed_at
      ) values (
        p_request_id,
        p_actor_user_id,
        p_actor_email,
        p_environment,
        'order.' || coalesce(p_action, 'unknown'),
        'order',
        p_order_id::text,
        'failed',
        v_before,
        'ORDER_MUTATION_FAILED',
        now()
      )
      on conflict (request_id) do nothing;
    exception
      when others then null;
    end;

    return jsonb_build_object(
      'ok', false,
      'code', 'ORDER_MUTATION_FAILED',
      'message', 'Order could not be updated.'
    );
end;
$$;

revoke all on function public.admin_mutate_order(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.admin_mutate_order(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  uuid
) to service_role;
