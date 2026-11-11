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
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = adminKey();
  if (!url || !key) return json({ error: "server_not_configured" }, 500);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth, error: authError } = bearer ? await admin.auth.getUser(bearer) : { data: { user: null }, error: true as any };
  if (authError || !auth?.user) return json({ error: "unauthorized" }, 401);

  const { data: config, error: configError } = await admin.rpc("get_gmail_oauth_config", { p_owner_user_id: auth.user.id });
  const row = Array.isArray(config) ? config[0] : config;
  if (configError || !row?.client_id || !row?.client_secret) {
    return json({ error: "gmail_oauth_not_configured", message: "Save your Google OAuth client first." }, 409);
  }

  const rawState = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  const stateHash = await sha256(rawState);
  await admin.from("gmail_oauth_states").delete().lt("expires_at", new Date().toISOString());
  const { error: stateError } = await admin.from("gmail_oauth_states").insert({
    state_hash: stateHash,
    owner_user_id: auth.user.id,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (stateError) return json({ error: "could_not_start_google_connection" }, 500);

  const redirectUri = `${url}/functions/v1/gmail-oauth-callback`;
  const query = new URLSearchParams({
    client_id: row.client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: rawState,
  });
  return json({ auth_url: `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}` });
});
