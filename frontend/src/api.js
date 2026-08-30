import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы — список подарков не загрузится."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function rpcError(error) {
  const msg = error?.message || "Ошибка запроса";
  // PostgREST wraps: "Подарок не найден" etc.
  return new Error(msg.replace(/^.*?: /, "").trim() || msg);
}

function normalizePrice(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n.toLocaleString("ru-KZ")} ₸`;
}

export async function fetchItems() {
  const { data, error } = await supabase
    .from("items")
    .select(
      "id, title, kaspi_url, image_url, notes, priority, price, reserved_by, reserved_at, created_at"
    )
    .order("priority", { ascending: false })
    .order("id", { ascending: true });
  if (error) throw rpcError(error);
  return { items: data || [] };
}

export async function reserveItem(id, name) {
  const { data, error } = await supabase.rpc("reserve_item", {
    p_id: id,
    p_name: name,
  });
  if (error) throw rpcError(error);
  return { item: data };
}

export async function unreserveItem(id, name) {
  const { data, error } = await supabase.rpc("unreserve_item", {
    p_id: id,
    p_name: name,
  });
  if (error) throw rpcError(error);
  return { item: data };
}

export async function verifyAdmin(token) {
  const { data, error } = await supabase.rpc("verify_admin", {
    p_token: token,
  });
  if (error) throw rpcError(error);
  if (!data) throw new Error("Нужен админ-пароль");
  return true;
}

export async function createItem(token, body) {
  const { data, error } = await supabase.rpc("admin_create_item", {
    p_token: token,
    p_title: body.title,
    p_kaspi_url: body.kaspi_url,
    p_image_url: body.image_url || "",
    p_notes: body.notes || "",
    p_priority: Number(body.priority) || 5,
    p_price: normalizePrice(body.price),
  });
  if (error) throw rpcError(error);
  return { item: data };
}

export async function updateItem(token, id, body) {
  const { data, error } = await supabase.rpc("admin_update_item", {
    p_token: token,
    p_id: id,
    p_title: body.title ?? null,
    p_kaspi_url: body.kaspi_url ?? null,
    p_image_url: body.image_url ?? null,
    p_notes: body.notes ?? null,
    p_priority:
      body.priority === undefined || body.priority === null
        ? null
        : Number(body.priority),
    p_price: normalizePrice(body.price),
  });
  if (error) throw rpcError(error);
  return { item: data };
}

export async function deleteItem(token, id) {
  const { error } = await supabase.rpc("admin_delete_item", {
    p_token: token,
    p_id: id,
  });
  if (error) throw rpcError(error);
  return null;
}

export async function refreshAllPrices(token) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/refresh-all-prices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Ошибка ${res.status}`);
  }
  return data;
}

export async function parseKaspiLink(token, url) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-kaspi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ token, url }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Ошибка ${res.status}`);
  }
  return {
    title: data.title || "",
    image_url: data.image_url || "",
    kaspi_url: data.kaspi_url || "",
    price: data.price ?? null,
  };
}
