import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = "https://mjkielian-debug.github.io/daily-life/";
const adminKey = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || "";
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
const bounce = (status: string) => Response.redirect(`${APP_URL}?gmail=${encodeURIComponent(status)}`, 303);

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return new Response("GET required", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL"), key = adminKey();
  if (!url || !key) return new Response("Daily Life Gmail connection is not configured.", { status: 500 });
  const query = new URL(req.url).searchParams;
  if (query.has("error")) return bounce("cancelled");
  const code = query.get("code") || "", rawState = query.get("state") || "";
  if (!code || !rawState || rawState.length > 200) return new Response("Google did not return a usable authorization.", { status: 400 });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: state, error: stateError } = await admin.from("gmail_oauth_states")
    .select("owner_user_id")
    .eq("state_hash", await sha256(rawState))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (stateError || !state) return new Response("This Gmail connection expired. Return to Daily Life and try again.", { status: 400 });
  await admin.from("gmail_oauth_states").delete().eq("state_hash", await sha256(rawState));

  const { data: config, error: configError } = await admin.rpc("get_gmail_oauth_config", { p_owner_user_id: state.owner_user_id });
  const client = Array.isArray(config) ? config[0] : config;
  if (configError || !client?.client_id || !client?.client_secret) return bounce("setup-error");
  const redirectUri = `${url}/functions/v1/gmail-oauth-callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: client.client_id,
      client_secret: client.client_secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const token = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !token.access_token || !token.refresh_token) return bounce("authorization-error");

  const profileResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const profile = await profileResponse.json().catch(() => ({}));
  const emailAddress = String(profile.emailAddress || "").trim();
  if (!profileResponse.ok || !emailAddress) return bounce("profile-error");
  const { error: storeError } = await admin.rpc("store_gmail_refresh_token", {
    p_owner_user_id: state.owner_user_id,
    p_email_address: emailAddress,
    p_refresh_token: token.refresh_token,
  });
  if (storeError) return bounce("save-error");
  return bounce("connected");
});
