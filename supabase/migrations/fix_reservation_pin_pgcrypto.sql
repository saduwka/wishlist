-- Fix pgcrypto: gen_salt/crypt live in extensions schema on Supabase.

create or replace function public.reserve_item(
  p_id bigint,
  p_name text,
  p_pin text
)
returns public.items
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  row public.items;
  clean_name text;
  clean_pin text;
begin
  clean_name := trim(p_name);
  if clean_name is null or char_length(clean_name) < 2 then
    raise exception 'Укажите имя (минимум 2 символа)';
  end if;
  if char_length(clean_name) > 80 then
    clean_name := left(clean_name, 80);
  end if;

  clean_pin := trim(p_pin);
  if clean_pin is null or clean_pin !~ '^\d{4}$' then
    raise exception 'PIN должен состоять из 4 цифр';
  end if;

  select * into row from public.items where id = p_id for update;
  if not found then
    raise exception 'Подарок не найден';
  end if;
  if row.reserved_by is not null then
    raise exception 'Уже выбрал(а): %', row.reserved_by;
  end if;

  update public.items
  set
    reserved_by = clean_name,
    reserved_at = now(),
    reservation_pin_hash = crypt(clean_pin, gen_salt('bf'))
  where id = p_id
  returning * into row;

  row.reservation_pin_hash := null;
  return row;
end;
$$;

create or replace function public.unreserve_item(p_id bigint, p_pin text)
returns public.items
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  row public.items;
  clean_pin text;
begin
  clean_pin := trim(p_pin);
  if clean_pin is null or clean_pin !~ '^\d{4}$' then
    raise exception 'PIN должен состоять из 4 цифр';
  end if;

  select * into row from public.items where id = p_id for update;
  if not found then
    raise exception 'Подарок не найден';
  end if;
  if row.reserved_by is null then
    raise exception 'Подарок ещё свободен';
  end if;
  if row.reservation_pin_hash is null then
    raise exception 'Для этого выбора нужен PIN. Обратитесь к организаторам.';
  end if;
  if crypt(clean_pin, row.reservation_pin_hash) <> row.reservation_pin_hash then
    raise exception 'Неверный PIN';
  end if;

  update public.items
  set reserved_by = null, reserved_at = null, reservation_pin_hash = null
  where id = p_id
  returning * into row;

  return row;
end;
$$;

notify pgrst, 'reload schema';
