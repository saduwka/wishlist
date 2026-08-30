import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDb,
  createItem,
  deleteItem,
  listItems,
  reserveItem,
  unreserveItem,
  updateItem,
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8791);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "change-me";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "..", "data", "wishlist.json");

const db = createDb(DB_PATH);
const app = express();

const allowedOrigins = CORS_ORIGIN.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "100kb" }));

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Нужен админ-пароль" });
    return;
  }
  next();
}

function normalizeName(name) {
  if (typeof name !== "string") return "";
  return name.trim().slice(0, 80);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/admin/verify", requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/items", (_req, res) => {
  res.json({ items: listItems(db) });
});

app.post("/api/items/:id/reserve", (req, res) => {
  const id = Number(req.params.id);
  const name = normalizeName(req.body?.name);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  if (name.length < 2) {
    res.status(400).json({ error: "Укажите имя (минимум 2 символа)" });
    return;
  }
  const result = reserveItem(db, id, name);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json({ item: result.item });
});

app.post("/api/items/:id/unreserve", (req, res) => {
  const id = Number(req.params.id);
  const name = normalizeName(req.body?.name);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  if (name.length < 2) {
    res.status(400).json({ error: "Укажите имя (минимум 2 символа)" });
    return;
  }
  const result = unreserveItem(db, id, name);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json({ item: result.item });
});

app.post("/api/items", requireAdmin, (req, res) => {
  const title = String(req.body?.title || "").trim();
  const kaspi_url = String(req.body?.kaspi_url || "").trim();
  const image_url = String(req.body?.image_url || "").trim();
  const notes = String(req.body?.notes || "").trim();
  if (!title || !kaspi_url) {
    res.status(400).json({ error: "Нужны title и kaspi_url" });
    return;
  }
  const item = createItem(db, { title, kaspi_url, image_url, notes });
  res.status(201).json({ item });
});

app.patch("/api/items/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  const patch = {};
  if (req.body?.title !== undefined) patch.title = String(req.body.title).trim();
  if (req.body?.kaspi_url !== undefined)
    patch.kaspi_url = String(req.body.kaspi_url).trim();
  if (req.body?.image_url !== undefined)
    patch.image_url = String(req.body.image_url).trim();
  if (req.body?.notes !== undefined) patch.notes = String(req.body.notes).trim();
  const item = updateItem(db, id, patch);
  if (!item) {
    res.status(404).json({ error: "Подарок не найден" });
    return;
  }
  res.json({ item });
});

app.delete("/api/items/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  const ok = deleteItem(db, id);
  if (!ok) {
    res.status(404).json({ error: "Подарок не найден" });
    return;
  }
  res.status(204).end();
});

app.use((err, _req, res, _next) => {
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({ error: "CORS" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`wishlist-api listening on :${PORT}`);
  console.log(`db: ${DB_PATH}`);
});
