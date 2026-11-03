import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, x-daily-life-token, x-inbox-sender, x-inbox-event-id, x-inbox-source",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const token = (req.headers.get("x-daily-life-token") || "").trim();
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "server_not_configured" }, 500);

  const body = await req.text();
  if (!body.trim()) return json({ error: "empty_message" }, 400);
  if (body.length > 10000) return json({ error: "message_too_large" }, 413);

  const tokenHash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: tokenRow, error: tokenError } = await admin
    .from("text_inbox_tokens")
    .select("id,owner_user_id")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (tokenError || !tokenRow) return json({ error: "unauthorized" }, 401);

  const sender = (req.headers.get("x-inbox-sender") || "Unknown").trim().slice(0, 250) || "Unknown";
  const sourceApp = (req.headers.get("x-inbox-source") || "").trim().slice(0, 200) || null;
  const externalId = (req.headers.get("x-inbox-event-id") || "").trim().slice(0, 200) || null;

  const row = {
    owner_user_id: tokenRow.owner_user_id,
    sender,
    body,
    source_app: sourceApp,
    external_id: externalId,
    received_at: new Date().toISOString(),
  };

  const { error: insertError } = externalId
    ? await admin.from("text_inbox_messages").upsert(row, { onConflict: "owner_user_id,external_id", ignoreDuplicates: true })
    : await admin.from("text_inbox_messages").insert(row);

  if (insertError) return json({ error: "write_failed" }, 500);
  return json({ ok: true }, 201);
});
