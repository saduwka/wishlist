-- Add gift price in KZT. Run once in Supabase SQL Editor.

alter table public.items
  add column if not exists price int;

drop function if exists public.admin_create_item(text, text, text, text, text);
drop function if exists public.admin_create_item(text, text, text, text, text, int);
drop function if exists public.admin_create_item(text, text, text, text, text, int, int);
drop function if exists public.admin_update_item(text, bigint, text, text, text, text);
drop function if exists public.admin_update_item(text, bigint, text, text, text, text, int);
drop function if exists public.admin_update_item(text, bigint, text, text, text, text, int, int);

create or replace function public.admin_create_item(
  p_token text,
  p_title text,
  p_kaspi_url text,
  p_image_url text default '',
  p_notes text default '',
  p_priority int default 5,
  p_price int default null
)
returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.items;
  pri int;
begin
  if not public.verify_admin(p_token) then
    raise exception 'Нужен админ-пароль';
  end if;
  if p_title is null or trim(p_title) = '' or p_kaspi_url is null or trim(p_kaspi_url) = '' then
    raise exception 'Нужны title и kaspi_url';
  end if;

  pri := coalesce(p_priority, 5);
  if pri < 1 then pri := 1; end if;
  if pri > 10 then pri := 10; end if;

  insert into public.items (title, kaspi_url, image_url, notes, priority, price)
  values (
    trim(p_title),
    trim(p_kaspi_url),
    coalesce(trim(p_image_url), ''),
    coalesce(trim(p_notes), ''),
    pri,
    p_price
  )
  returning * into row;

  return row;
end;
$$;

create or replace function public.admin_update_item(
  p_token text,
  p_id bigint,
  p_title text default null,
  p_kaspi_url text default null,
  p_image_url text default null,
  p_notes text default null,
  p_priority int default null,
  p_price int default null
)
returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.items;
  pri int;
begin
  if not public.verify_admin(p_token) then
    raise exception 'Нужен админ-пароль';
  end if;

  if p_priority is not null then
    pri := p_priority;
    if pri < 1 then pri := 1; end if;
    if pri > 10 then pri := 10; end if;
  end if;

  update public.items
  set
    title = case when p_title is null then title else trim(p_title) end,
    kaspi_url = case when p_kaspi_url is null then kaspi_url else trim(p_kaspi_url) end,
    image_url = case when p_image_url is null then image_url else trim(p_image_url) end,
    notes = case when p_notes is null then notes else trim(p_notes) end,
    priority = case when p_priority is null then priority else pri end,
    price = p_price
  where id = p_id
  returning * into row;

  if not found then
    raise exception 'Подарок не найден';
  end if;

  return row;
end;
$$;

grant execute on function public.admin_create_item(text, text, text, text, text, int, int) to anon, authenticated;
grant execute on function public.admin_update_item(text, bigint, text, text, text, text, int, int) to anon, authenticated;
