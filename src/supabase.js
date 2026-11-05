create or replace function public.customer_track_order(
  p_order_number text,
  p_phone text
)
returns table (
  order_number text,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    o.order_number::text,
    o.status::text,
    o.created_at
  from public.orders o
  where o.order_number::text = trim(p_order_number)
    and regexp_replace(coalesce(o.customer_phone, ''), '\D', '', 'g')
        = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
  limit 1;
$$;

revoke all on function public.customer_track_order(text, text) from public;

grant execute on function public.customer_track_order(text, text)
to anon, authenticated;