import {
  getServiceClient,
  verifyAdminToken,
  verifyCronSecret,
} from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  canonicalKaspiUrl,
  isKaspiUrl,
  loadKaspiHtml,
  parseProduct,
  sleep,
} from "../_shared/kaspi.ts";

type ItemRow = {
  id: number;
  kaspi_url: string;
  price: number | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const admin = getServiceClient();
    const cronOk = verifyCronSecret(req);
    let adminOk = false;

    if (!cronOk) {
      const body = await req.json().catch(() => ({}));
      const token = String(body?.token || "");
      if (!token) {
        return json({ error: "Нужен админ-пароль или cron secret" }, 401);
      }
      adminOk = await verifyAdminToken(admin, token);
      if (!adminOk) {
        return json({ error: "Неверный пароль админки. Войдите заново." }, 401);
      }
    }

    const { data: items, error: listErr } = await admin
      .from("items")
      .select("id, kaspi_url, price")
      .order("id", { ascending: true });

    if (listErr) {
      console.error(listErr);
      return json({ error: "Не удалось загрузить список подарков" }, 500);
    }

    const rows = (items || []) as ItemRow[];
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      const kaspiUrl = isKaspiUrl(item.kaspi_url);
      if (!kaspiUrl) {
        skipped += 1;
        errors.push(`id ${item.id}: некорректная ссылка Kaspi`);
        continue;
      }

      try {
        const loaded = await loadKaspiHtml(kaspiUrl.toString());
        const parsed = parseProduct(loaded.html);
        if (!parsed.price) {
          skipped += 1;
          errors.push(`id ${item.id}: цена не найдена`);
          continue;
        }

        const canonical = canonicalKaspiUrl(
          loaded.html,
          loaded.finalUrl,
          kaspiUrl.toString()
        );

        const { error: updateErr } = await admin
          .from("items")
          .update({ price: parsed.price, kaspi_url: canonical })
          .eq("id", item.id);

        if (updateErr) {
          skipped += 1;
          errors.push(`id ${item.id}: ${updateErr.message}`);
          continue;
        }

        updated += 1;
      } catch (err) {
        skipped += 1;
        const msg = err instanceof Error ? err.message : "ошибка парсинга";
        errors.push(`id ${item.id}: ${msg}`);
      }

      if (i < rows.length - 1) {
        await sleep(500);
      }
    }

    return json({ updated, skipped, errors, total: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка обновления цен";
    return json({ error: message }, 500);
  }
});
