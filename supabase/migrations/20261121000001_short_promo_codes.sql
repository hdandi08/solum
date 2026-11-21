-- DEV rollout only. Existing code uniqueness and email/visitor binding remain.
-- Eight independent crypto bytes map without bias to a 32-symbol alphabet:
-- 256 is divisible by 32, giving 40 effective bits across eight characters.
create or replace function public.generate_meta_promo_code()
returns text language plpgsql security invoker set search_path='' as $$
declare
 alphabet constant text:='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 entropy bytea; candidate text; i integer;
begin
 loop
  entropy:=extensions.gen_random_bytes(8);
  candidate:='BF-';
  for i in 0..7 loop
   candidate:=candidate||pg_catalog.substr(alphabet,(pg_catalog.get_byte(entropy,i)%32)+1,1);
  end loop;
  if not exists(select 1 from public.meta_promo_claims where code=candidate) then return candidate;end if;
 end loop;
 -- Concurrent generators can race; the unchanged UNIQUE(code) constraint is
 -- the final authority, just as for the previous random default.
end $$;
revoke all on function public.generate_meta_promo_code() from public,anon,authenticated;
grant execute on function public.generate_meta_promo_code() to service_role;

alter table public.meta_promo_claims alter column code set default public.generate_meta_promo_code();

-- Take the claim row lock used by payment preparation. Never rotate a code once
-- a payment attempt has been prepared or the grant has been redeemed.
do $shorten$
declare claim record;
begin
 for claim in
  select id from public.meta_promo_claims
  where redeemed_order_id is null and active_attempt_id is null
   and code!~'^BF-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'
  for update
 loop
  update public.meta_promo_claims set code=public.generate_meta_promo_code() where id=claim.id;
 end loop;
end $shorten$;
