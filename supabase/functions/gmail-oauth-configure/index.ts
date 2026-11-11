import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://mjkielian-debug.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});
const adminKey = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = adminKey();
  if (!url || !key) return json({ error: "server_not_configured" }, 500);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth, error: authError } = bearer ? await admin.auth.getUser(bearer) : { data: { user: null }, error: true as any };
  if (authError || !auth?.user) return json({ error: "unauthorized" }, 401);

  let input: any;
  try { input = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const clientId = String(input?.client_id || "").trim();
  const clientSecret = String(input?.client_secret || "").trim();
  if (!clientId.endsWith(".apps.googleusercontent.com") || clientId.length > 300 || !clientSecret || clientSecret.length > 1000) {
    return json({ error: "invalid_google_oauth_client", message: "Enter the OAuth client ID and client secret from Google Cloud." }, 400);
  }

  const { error } = await admin.rpc("set_gmail_oauth_config", {
    p_owner_user_id: auth.user.id,
    p_client_id: clientId,
    p_client_secret: clientSecret,
  });
  if (error) return json({ error: "could_not_save_oauth_client" }, 500);
  return json({ ok: true, redirect_uri: `${url}/functions/v1/gmail-oauth-callback` });
});
