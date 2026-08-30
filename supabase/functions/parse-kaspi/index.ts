import { verifyAdminToken, getServiceClient } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  canonicalKaspiUrl,
  isKaspiUrl,
  loadKaspiHtml,
  parseProduct,
} from "../_shared/kaspi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const token = String(body?.token || "");
    const urlRaw = String(body?.url || "");

    if (!token) {
      return json({ error: "Сначала войдите в админку" }, 401);
    }

    const kaspiUrl = isKaspiUrl(urlRaw);
    if (!kaspiUrl) {
      return json({ error: "Нужна корректная ссылка на Kaspi" }, 400);
    }

    const admin = getServiceClient();
    if (!(await verifyAdminToken(admin, token))) {
      return json({ error: "Неверный пароль админки. Войдите заново." }, 401);
    }

    let html: string;
    let finalUrl: string;
    try {
      const loaded = await loadKaspiHtml(kaspiUrl.toString());
      html = loaded.html;
      finalUrl = loaded.finalUrl;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return json(
          { error: "Kaspi не ответил вовремя. Заполни поля вручную." },
          504
        );
      }
      console.error(err);
      return json(
        {
          error:
            "Kaspi недоступен с сервера (лимит/блок). Заполни название и картинку вручную.",
        },
        502
      );
    }

    const parsed = parseProduct(html);

    return json({
      title: parsed.title,
      image_url: parsed.image_url,
      kaspi_url: canonicalKaspiUrl(html, finalUrl, kaspiUrl.toString()),
      price: parsed.price,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось распознать, заполни вручную";
    return json({ error: message }, 422);
  }
});
