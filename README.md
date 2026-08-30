# Wishlist — новоселье

Статический фронт (Vite + React) на GitHub Pages + **Supabase** (Postgres). Гости отмечают подарок своим именем; список правится в админке.

Raspberry Pi / Cloudflare Tunnel больше не нужны для продакшена.

## Структура

- `frontend/` — UI
- `supabase/schema.sql` — таблицы, RLS, RPC
- `backend/` — старый Express API (локальный прототип; можно не трогать)

## Supabase (один раз)

1. Создай проект на [supabase.com](https://supabase.com).
2. **SQL Editor** → вставь содержимое [`supabase/schema.sql`](supabase/schema.sql) → Run.
3. В скрипте поменяй `change-me-admin` на свой пароль админки (или выполни):
   ```sql
   update public.app_settings set admin_token = 'твой-пароль' where id = 1;
   ```
4. **Settings → API**: скопируй Project URL и `anon` `public` key.

## Локальный запуск UI

```bash
cd frontend
cp .env.example .env.local
# заполни VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Открой http://localhost:5173 — главная для гостей, `/admin` — админка.

## GitHub Pages

Сайт: **https://saduwka.github.io/wishlist/**

1. Репозиторий: https://github.com/saduwka/wishlist
2. **Settings → Pages → Build and deployment → Source: GitHub Actions** (один раз, если ещё не включено).
3. При push в `main` workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) собирает и публикует фронт.

Переменные Supabase уже прописаны в workflow (anon key публичный). При желании можно переопределить через Settings → Actions → Variables.

## Как это работает

| Действие | Реализация |
|----------|------------|
| Список | `SELECT` из `items` (RLS: только чтение) |
| Выбрать / снять | RPC `reserve_item` / `unreserve_item` |
| Админ CRUD | RPC с проверкой `admin_token` |

Anon key в бандле — нормально; прямых `INSERT/UPDATE/DELETE` для гостей нет.

## Парсинг Kaspi (админка)

1. Войди в `/admin` (пароль по умолчанию после `schema.sql`: **`house2026`**, если не менял в SQL).
2. Вставь ссылку на товар → **Подтянуть** → проверь название и картинку → **Добавить**.

Edge Function: `parse-kaspi` (деплой: `npx supabase functions deploy parse-kaspi --project-ref mnxxnomcwzsisusejuqx`).

Сменить пароль админки в SQL Editor:

```sql
update public.app_settings set admin_token = 'новый-пароль' where id = 1;
```

## Остановка старого API на Pi (опционально)

```bash
ssh root@100.99.85.87
systemctl disable --now wishlist-api cloudflared-wishlist
```
