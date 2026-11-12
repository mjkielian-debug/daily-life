import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://mjkielian-debug.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const MODEL = "gemini-2.5-flash-lite"; // Free-tier text+image analysis only. Never fall back to a paid model.
const HORDE = "https://aihorde.net/api/v2";
const HORDE_KEY = "0000000000"; // Anonymous public service account; no user key or payment required.
const HORDE_AGENT = "Daily-Life:20261112:https://mjkielian-debug.github.io/daily-life/";

function keysFromEnv() {
  let publishable: Record<string, string> = {}, secret: Record<string, string> = {};
  try { publishable = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}"); } catch { /* legacy project */ }
  try { secret = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); } catch { /* legacy project */ }
  return {
    publishableKey: publishable.default || Deno.env.get("SUPABASE_ANON_KEY"),
    serviceKey: secret.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

async function getUser(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const url = Deno.env.get("SUPABASE_URL"), { publishableKey } = keysFromEnv();
  if (!url || !publishableKey) return null;
  const client = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}

const schema = {
  type: "OBJECT",
  properties: {
    garment_type: { type: "STRING", enum: ["hoodie", "sweater", "t-shirt", "shirt", "blouse", "jacket", "vest", "coat", "dress", "skirt", "pants", "jeans", "shorts", "leggings", "shoes", "accessory", "outfit", "unknown"] },
    style: { type: "STRING" },
    silhouette: { type: "STRING", enum: ["fitted", "relaxed", "oversized", "cropped", "longline", "structured", "flowy", "straight", "unknown"] },
    sleeve_length: { type: "STRING", enum: ["sleeveless", "short", "three-quarter", "long", "not-visible", "not-applicable"] },
    neckline: { type: "STRING", enum: ["crew", "v-neck", "collared", "hooded", "scoop", "square", "high-neck", "not-visible", "not-applicable"] },
    pattern: { type: "STRING", enum: ["solid", "striped", "plaid", "floral", "polka-dot", "graphic", "textured", "animal-print", "other", "unknown"] },
    material_appearance: { type: "STRING" },
    primary_color: { type: "STRING" },
    accent_color: { type: "STRING" },
    visible_details: { type: "ARRAY", items: { type: "STRING" } },
    summary: { type: "STRING" },
    confidence: { type: "NUMBER" },
  },
  required: ["garment_type", "style", "silhouette", "sleeve_length", "neckline", "pattern", "material_appearance", "primary_color", "accent_color", "visible_details", "summary", "confidence"],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const user = await getUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const url = Deno.env.get("SUPABASE_URL"), { publishableKey, serviceKey } = keysFromEnv();
  if (!url || !publishableKey || !serviceKey) return json({ error: "server_not_configured" }, 503);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  if (input.action === "stylize_start") {
    const imageData = String(input.imageData || ""), match = imageData.match(/^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/);
    if (!match || imageData.length > 2_500_000) return json({ error: "invalid_image", message: "Choose a picture that can be prepared under 1.8 MB." }, 413);
    const sourceImage = match[1];
    const decodedBytes = Math.floor(sourceImage.length * 0.75);
    if (decodedBytes > 1_800_000) return json({ error: "invalid_image", message: "Choose a smaller picture for the free generator." }, 413);
    const width = Math.max(64, Math.min(768, Math.round(Number(input.width) / 64) * 64 || 512));
    const height = Math.max(64, Math.min(768, Math.round(Number(input.height) / 64) * 64 || 512));
    const prompt = "Transform the supplied photo into a polished, colorful 2D illustration in the My Little Pony: Equestria Girls style: expressive large eyes, clean bold outlines, smooth cel shading, lively pastel colors, cute confident human woman. Preserve the person, face, pose, and outfit from the source as closely as possible; retain natural brown hair and brown eyes when visible. Keep clothing recognizable and preserve its colors, cut, patterns, and visible details. Human character only; do not turn the person into a horse, pony, animal, or doll. No text, watermark, or extra people.";
    const response = await fetch(`${HORDE}/generate/async`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: HORDE_KEY, "Client-Agent": HORDE_AGENT },
      body: JSON.stringify({
        prompt,
        params: { n: 1, width, height, steps: 20, sampler_name: "k_euler", cfg_scale: 7.5, denoising_strength: 0.68, source_image: sourceImage, source_processing: "img2img" },
        nsfw: false, censor_nsfw: true, trusted_workers: false, validated_backends: true, slow_workers: true, extra_slow_workers: true,
      }),
    });
    let queued: any;
    try { queued = await response.json(); } catch { return json({ error: "generator_unavailable", message: "The free community image generator could not be reached." }, 502); }
    if (!response.ok || !queued?.id) return json({ error: "generator_unavailable", message: "The free community generator is busy. Try again in a little while." }, response.status === 429 ? 429 : 502);
    return json({ ok: true, requestId: queued.id, waitTime: Number(queued.wait_time) || 0, queuePosition: Number(queued.queue_position) || 0 });
  }

  if (input.action === "stylize_status") {
    const requestId = String(input.requestId || "");
    if (!/^[a-f\d-]{36}$/i.test(requestId)) return json({ error: "invalid_request" }, 400);
    const headers = { apikey: HORDE_KEY, "Client-Agent": HORDE_AGENT };
    const checked = await fetch(`${HORDE}/generate/check/${requestId}`, { headers });
    if (!checked.ok) return json({ error: "generator_status_failed", message: "The free generator could not check this request." }, 502);
    let progress: any;
    try { progress = await checked.json(); } catch { return json({ error: "generator_status_failed" }, 502); }
    if (progress.faulted) return json({ error: "generation_failed", message: "The volunteer generator could not complete this photo. The original is still saved." }, 502);
    if (!progress.done) return json({ ok: true, state: progress.processing ? "processing" : "waiting", queuePosition: Number(progress.queue_position) || 0, waitTime: Number(progress.wait_time) || 0 });
    const resultResponse = await fetch(`${HORDE}/generate/status/${requestId}`, { headers });
    if (!resultResponse.ok) return json({ error: "generator_result_failed", message: "The generated picture could not be retrieved." }, 502);
    let result: any;
    try { result = await resultResponse.json(); } catch { return json({ error: "generator_result_failed" }, 502); }
    let image = result?.generations?.find((x: any) => typeof x.img === "string" && !x.censored)?.img;
    if (!image) return json({ error: "no_image_result", message: "The free generator did not return an image. Your original is still saved." }, 502);
    if (/^https?:\/\//i.test(image)) {
      const imageResponse = await fetch(image);
      if (!imageResponse.ok) return json({ error: "image_download_failed", message: "The generated image could not be downloaded." }, 502);
      const bytes = new Uint8Array(await imageResponse.arrayBuffer());
      if (bytes.length > 5_000_000) return json({ error: "image_too_large", message: "The generated image was too large to save." }, 413);
      let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
      image = btoa(binary);
    } else image = image.replace(/^data:image\/webp;base64,/i, "");
    if (!/^[A-Za-z0-9+/=]+$/.test(image) || image.length > 6_700_000) return json({ error: "invalid_generated_image" }, 502);
    return json({ ok: true, state: "done", imageData: `data:image/webp;base64,${image}` });
  }

  if (input.action === "connect") {
    const apiKey = String(input.apiKey || "").trim();
    if (apiKey.length < 20 || apiKey.length > 256) return json({ error: "invalid_api_key" }, 400);
    const { error } = await admin.rpc("avatar_ai_set_key", { p_owner_user_id: user.id, p_api_key: apiKey });
    if (error) return json({ error: "vault_not_ready" }, 503);
    return json({ ok: true, stored: "vault" });
  }

  if (input.action !== "analyze") return json({ error: "invalid_action" }, 400);
  const imageData = String(input.imageData || ""), match = imageData.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || imageData.length > 1_600_000) return json({ error: "invalid_image", message: "Choose a clear picture under 1.1 MB for style analysis." }, 413);
  const { data: key, error: keyError } = await admin.rpc("avatar_ai_get_key", { p_owner_user_id: user.id });
  if (keyError || !key) return json({ error: "not_connected", message: "Connect the free photo analyzer first." }, 409);

  const prompt = "Analyze the clothing item clearly visible in this user-submitted wardrobe photo. Describe only visible clothing, not the person. Do not infer or guess a brand, price, body size, identity, or hidden features. If a detail is unclear, say unknown. Return concise JSON matching the requested schema. Identify garment type, style (for example workwear, sporty, casual, preppy, romantic), silhouette, visible sleeve and neckline, pattern, material appearance, approximate main and accent colors, and up to four distinctive visible details. Summary should be one short, concrete sentence useful for a digital wardrobe and illustrated outfit generator.";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": String(key) },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: match[1], data: match[2] } }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
    }),
  });
  if (response.status === 429) return json({ error: "free_quota_exhausted", message: "Google’s free image-analysis quota is temporarily used up. No paid model was called." }, 429);
  if (!response.ok) return json({ error: "image_analysis_failed", message: response.status === 403 ? "The connected key or model is unavailable on its free tier." : "The photo analyzer could not read that image. Try a clearer picture." }, 502);
  let result: any;
  try { result = await response.json(); } catch { return json({ error: "invalid_model_response" }, 502); }
  const raw = result?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p.text === "string")?.text;
  if (!raw) return json({ error: "empty_model_response" }, 502);
  try {
    const analysis = JSON.parse(raw);
    return json({ ok: true, model: MODEL, analysis });
  } catch {
    return json({ error: "invalid_model_response" }, 502);
  }
});
