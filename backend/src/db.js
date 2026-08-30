import fs from "node:fs";
import path from "node:path";

function nowIso() {
  return new Date().toISOString();
}

function emptyStore() {
  return { nextId: 1, items: [] };
}

export function createDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const store = {
    path: dbPath,
    data: load(dbPath),
  };
  if (store.data.items.length === 0) {
    createItem(store, {
      title: "Набор полотенец",
      kaspi_url: "https://kaspi.kz/",
      image_url:
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80",
      notes: "Пример — замени в админке",
    });
    createItem(store, {
      title: "Чайник электрический",
      kaspi_url: "https://kaspi.kz/",
      image_url:
        "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=600&q=80",
      notes: "Любой цвет",
    });
  }
  return store;
}

function load(dbPath) {
  if (!fs.existsSync(dbPath)) return emptyStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    if (!parsed || !Array.isArray(parsed.items)) return emptyStore();
    return {
      nextId: Number(parsed.nextId) || 1,
      items: parsed.items,
    };
  } catch {
    return emptyStore();
  }
}

function save(store) {
  const tmp = `${store.path}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store.data, null, 2));
  fs.renameSync(tmp, store.path);
}

export function listItems(store) {
  return store.data.items
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((item) => ({ ...item }));
}

export function getItem(store, id) {
  const item = store.data.items.find((i) => i.id === Number(id));
  return item ? { ...item } : undefined;
}

export function createItem(store, data) {
  const item = {
    id: store.data.nextId++,
    title: data.title,
    kaspi_url: data.kaspi_url,
    image_url: data.image_url || "",
    notes: data.notes || "",
    reserved_by: null,
    reserved_at: null,
    created_at: nowIso(),
  };
  store.data.items.push(item);
  save(store);
  return { ...item };
}

export function updateItem(store, id, data) {
  const idx = store.data.items.findIndex((i) => i.id === Number(id));
  if (idx < 0) return null;
  const current = store.data.items[idx];
  const next = {
    ...current,
    title: data.title ?? current.title,
    kaspi_url: data.kaspi_url ?? current.kaspi_url,
    image_url: data.image_url ?? current.image_url,
    notes: data.notes ?? current.notes,
  };
  store.data.items[idx] = next;
  save(store);
  return { ...next };
}

export function deleteItem(store, id) {
  const before = store.data.items.length;
  store.data.items = store.data.items.filter((i) => i.id !== Number(id));
  if (store.data.items.length === before) return false;
  save(store);
  return true;
}

export function reserveItem(store, id, name) {
  const idx = store.data.items.findIndex((i) => i.id === Number(id));
  if (idx < 0) return { ok: false, status: 404, error: "Подарок не найден" };
  const item = store.data.items[idx];
  if (item.reserved_by) {
    return {
      ok: false,
      status: 409,
      error: `Уже выбрал(а): ${item.reserved_by}`,
    };
  }
  const next = {
    ...item,
    reserved_by: name,
    reserved_at: nowIso(),
  };
  store.data.items[idx] = next;
  save(store);
  return { ok: true, item: { ...next } };
}

export function unreserveItem(store, id, name) {
  const idx = store.data.items.findIndex((i) => i.id === Number(id));
  if (idx < 0) return { ok: false, status: 404, error: "Подарок не найден" };
  const item = store.data.items[idx];
  if (!item.reserved_by) {
    return { ok: false, status: 409, error: "Подарок ещё свободен" };
  }
  if (item.reserved_by.trim().toLowerCase() !== name.trim().toLowerCase()) {
    return {
      ok: false,
      status: 403,
      error: "Снять можно только тем же именем, которым выбрали",
    };
  }
  const next = { ...item, reserved_by: null, reserved_at: null };
  store.data.items[idx] = next;
  save(store);
  return { ok: true, item: { ...next } };
}
