-- Hilos Cotiy: actualización para tickets.
-- SOLO si ya habías ejecutado instalar.sql antes. Pégalo en Supabase > SQL Editor > Run.

-- 8) Tickets de venta: número correlativo único (lo da la base de datos, no se repite) ---------
create sequence if not exists public.ticket_seq;
create or replace function public.next_ticket() returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is null then raise exception 'Sin permiso'; end if;
  return nextval('public.ticket_seq');
end $$;
revoke all on function public.next_ticket() from public, anon;
grant execute on function public.next_ticket() to authenticated;

-- Numera las ventas anteriores que aún no tienen ticket (en orden de fecha). Se puede ejecutar varias veces.
do $$
declare r record;
begin
  for r in select id from public.docs
           where col = 'sales' and not (data ? 'ticket')
           order by coalesce((data->>'at')::bigint, 0), id loop
    update public.docs set data = data || jsonb_build_object('ticket', nextval('public.ticket_seq'))
     where col = 'sales' and id = r.id;
  end loop;
end $$;
