import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
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

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return json({ error: "server_not_configured" }, 500);

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const category = String(input.category || "").trim().toLowerCase();
  const payload = input.payload;
  const memberId = input.member_id ? String(input.member_id) : null;
  const source = input.source === "chatgpt" ? "chatgpt" : "app";
  const occurredAt = input.occurred_at ? String(input.occurred_at) : new Date().toISOString();
  const localDate = input.local_date ? String(input.local_date) : occurredAt.slice(0, 10);
  const externalId = input.external_id ? String(input.external_id) : null;

  if (!/^[a-z][a-z0-9_]{1,39}$/.test(category)) {
    return json({ error: "invalid_category" }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json({ error: "payload_must_be_object" }, 400);
  }
  if (JSON.stringify(payload).length > 100_000) {
    return json({ error: "payload_too_large" }, 413);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return json({ error: "invalid_local_date" }, 400);
  }

  const row = {
    owner_user_id: user.id,
    member_id: memberId,
    category,
    occurred_at: occurredAt,
    local_date: localDate,
    payload,
    source,
    external_id: externalId,
  };

  if (externalId) {
    const { data, error } = await supabase
      .from("life_entries")
      .upsert(row, { onConflict: "owner_user_id,source,external_id" })
      .select()
      .single();
    if (error) return json({ error: "write_failed", detail: error.message }, 400);
    return json({ ok: true, entry: data }, 201);
  }

  const { data, error } = await supabase.from("life_entries").insert(row).select().single();
  if (error) return json({ error: "write_failed", detail: error.message }, 400);
  return json({ ok: true, entry: data }, 201);
});
