import { createClient } from "npm:@supabase/supabase-js@2";

const APP_ORIGIN = "https://mjkielian-debug.github.io";
const cors = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, x-daily-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});
const adminKey = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || "";
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}
async function requireUser(admin: any, req: Request) {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!bearer) return null;
  const { data, error } = await admin.auth.getUser(bearer);
  return error ? null : data.user;
}
async function gmailRequest(path: string, accessToken: string) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`gmail_api_${response.status}`);
  return body;
}
async function syncOwner(admin: any, ownerId: string) {
  const { data: connection, error: connectionError } = await admin.from("gmail_connections")
    .select("owner_user_id,status")
    .eq("owner_user_id", ownerId)
    .maybeSingle();
  if (connectionError) throw new Error("connection_lookup_failed");
  if (!connection || connection.status !== "connected") return { skipped: true, count: 0 };

  const [{ data: config, error: configError }, { data: refreshToken, error: refreshError }] = await Promise.all([
    admin.rpc("get_gmail_oauth_config", { p_owner_user_id: ownerId }),
    admin.rpc("get_gmail_refresh_token", { p_owner_user_id: ownerId }),
  ]);
  const client = Array.isArray(config) ? config[0] : config;
  if (configError || refreshError || !client?.client_id || !client?.client_secret || !refreshToken) throw new Error("connection_secret_missing");

  const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: client.client_id,
      client_secret: client.client_secret,
      refresh_token: String(refreshToken),
      grant_type: "refresh_token",
    }),
  });
  const refreshed = await refreshResponse.json().catch(() => ({}));
  if (!refreshResponse.ok || !refreshed.access_token) {
    if (refreshed.error === "invalid_grant") {
      await admin.from("gmail_connections").update({ status: "reconnect_required", last_sync_error: "Google authorization needs reconnecting.", updated_at: new Date().toISOString() }).eq("owner_user_id", ownerId);
    }
    throw new Error(refreshed.error === "invalid_grant" ? "reconnect_required" : "google_token_refresh_failed");
  }

  let pageToken = "";
  const messageIds: string[] = [];
  for (let page = 0; page < 3; page++) {
    const params = new URLSearchParams({
      q: "in:inbox newer_than:2d -in:spam -in:trash -category:promotions -category:social",
      maxResults: "50",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const list = await gmailRequest(`messages?${params.toString()}`, refreshed.access_token);
    messageIds.push(...(Array.isArray(list.messages) ? list.messages.map((message: any) => String(message.id || "")).filter(Boolean) : []));
    pageToken = String(list.nextPageToken || "");
    if (!pageToken) break;
  }

  const rows: any[] = [];
  for (const messageId of messageIds) {
    const message = await gmailRequest(`messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, refreshed.access_token);
    const headers = Array.isArray(message.payload?.headers) ? message.payload.headers : [];
    const header = (name: string) => String(headers.find((item: any) => String(item.name || "").toLowerCase() === name.toLowerCase())?.value || "");
    const internalMs = Number(message.internalDate || 0);
    rows.push({
      owner_user_id: ownerId,
      gmail_message_id: messageId,
      thread_id: String(message.threadId || "") || null,
      sender: header("From").slice(0, 400),
      subject: (header("Subject") || "(no subject)").slice(0, 500),
      snippet: String(message.snippet || "").slice(0, 2000),
      received_at: Number.isFinite(internalMs) && internalMs > 0 ? new Date(internalMs).toISOString() : new Date().toISOString(),
      review_state: "new",
    });
  }
  if (rows.length) {
    const { error } = await admin.from("gmail_inbox_messages").upsert(rows, {
      onConflict: "owner_user_id,gmail_message_id",
      ignoreDuplicates: true,
    });
    if (error) throw new Error("inbox_write_failed");
  }
  await admin.from("gmail_connections").update({
    last_sync_at: new Date().toISOString(),
    last_sync_error: null,
    updated_at: new Date().toISOString(),
  }).eq("owner_user_id", ownerId);
  return { skipped: false, count: rows.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = adminKey();
  if (!url || !key) return json({ error: "server_not_configured" }, 500);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const user = await requireUser(admin, req);
  let scheduled = false;
  if (!user) {
    const supplied = req.headers.get("x-daily-cron-key") || "";
    const { data: expected, error } = await admin.rpc("get_daily_cron_key");
    if (error || !expected || !safeEqual(supplied, String(expected))) return json({ error: "unauthorized" }, 401);
    scheduled = true;
  }

  const owners: string[] = [];
  if (user) owners.push(String(user.id));
  else {
    const [{ data: connections, error: connectionError }, { data: profiles, error: profileError }] = await Promise.all([
      admin.from("gmail_connections").select("owner_user_id").eq("status", "connected"),
      admin.from("profiles").select("user_id,timezone"),
    ]);
    if (connectionError || profileError) return json({ error: "database_error" }, 500);
    const zones = new Map((profiles || []).map((profile: any) => [String(profile.user_id), String(profile.timezone || "America/Chicago")]));
    for (const connection of connections || []) {
      const ownerId = String(connection.owner_user_id), zone = String(zones.get(ownerId) || "America/Chicago");
      const local = localParts(new Date(), zone);
      if (["07", "12", "18"].includes(String(local.hour)) && Number(local.minute) < 35) owners.push(ownerId);
    }
  }

  if (scheduled && !owners.length) return json({ ok: true, scanned: 0, reason: "outside_scan_times" });
  const results: any[] = [];
  for (const ownerId of owners) {
    try {
      results.push({ owner_id: ownerId, ...(await syncOwner(admin, ownerId)) });
    } catch (error: any) {
      const message = String(error?.message || "sync_failed").slice(0, 80);
      await admin.from("gmail_connections").update({ last_sync_error: message, updated_at: new Date().toISOString() }).eq("owner_user_id", ownerId);
      results.push({ owner_id: ownerId, error: message });
    }
  }
  return json({ ok: true, scheduled, results });
});
