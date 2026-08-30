import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export function getServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  }
  return createClient(supabaseUrl, serviceKey);
}

export async function verifyAdminToken(
  admin: SupabaseClient,
  token: string
): Promise<boolean> {
  const { data: settings, error } = await admin
    .from("app_settings")
    .select("admin_token")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error(error);
    throw new Error("Ошибка проверки пароля");
  }
  return Boolean(settings?.admin_token && token && token === settings.admin_token);
}

export function verifyCronSecret(req: Request): boolean {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) return false;
  const header = req.headers.get("x-cron-secret");
  return Boolean(header && header === expected);
}
