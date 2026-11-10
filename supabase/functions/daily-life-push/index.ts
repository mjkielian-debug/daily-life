import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import webpush from "npm:web-push@3.6.7";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
const APP_ORIGIN = "https://mjkielian-debug.github.io";

const cors = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const dueTime = (value: unknown) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || "")) ? String(value) : "09:00";

function localParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now);
  return Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
}
function equalSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function authorizedUser(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}
function dueItems(state: any, now: Date, timeZone: string) {
  const p = localParts(now, timeZone);
  const today = `${p.year}-${p.month}-${p.day}`;
  const current = `${p.hour}:${p.minute}`;
  const out: Array<{key: string; dueDate: string; title: string; body: string}> = [];
  for (const routine of Array.isArray(state?.petCareRoutines) ? state.petCareRoutines : []) {
    if (routine?.active === false || routine?.notify !== true || !routine?.id || routine?.nextDate !== today) continue;
    if (current < dueTime(routine.notifyTime)) continue;
    out.push({
      key: `pet-care:${routine.id}`, dueDate: today,
      title: String(routine.title || "Pet care reminder").slice(0, 120),
      body: String(routine.notes || "Due today in Daily Life.").slice(0, 220)
    });
  }
  for (const item of Array.isArray(state?.dailyLifeNotificationSchedule) ? state.dailyLifeNotificationSchedule : []) {
    if (!item?.id || item.date !== today || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(item.start || ""))) continue;
    const [hour, minute] = String(item.start).split(":").map(Number);
    const startMinute = hour * 60 + minute;
    const currentMinute = Number(p.hour) * 60 + Number(p.minute);
    if (currentMinute < startMinute - 5 || currentMinute > startMinute + 5) continue;
    out.push({
      key: `flow:${item.id}`, dueDate: today,
      title: String(item.title || "Daily Life schedule").slice(0, 120),
      body: "Coming up in your Day Flow."
    });
  }
  for (const task of Array.isArray(state?.tasks) ? state.tasks : []) {
    if (task?.done || task?.notificationsEnabled !== true || !task?.id || task?.date !== today) continue;
    if (current < dueTime(task.notifyTime)) continue;
    out.push({
      key: `task:${task.id}`, dueDate: today,
      title: String(task.title || "Daily Life reminder").slice(0, 120),
      body: String(task.notes || "Due today in Daily Life.").slice(0, 220)
    });
  }
  for (const habit of Array.isArray(state?.habits) ? state.habits : []) {
    if (!habit?.id || habit.status !== "active" || habit.reminderEnabled !== true) continue;
    const startDate = String(habit.reminderStartDate || "");
    const endDate = String(habit.reminderEndDate || "9999-12-31");
    const reminderTime = String(habit.reminderTime || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) continue;
    if (today < startDate || today > endDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) continue;
    const [hour, minute] = reminderTime.split(":").map(Number);
    const reminderMinute = hour * 60 + minute;
    const currentMinute = Number(p.hour) * 60 + Number(p.minute);
    if (currentMinute < reminderMinute - 5 || currentMinute > reminderMinute + 5) continue;
    const alreadyRecorded = (Array.isArray(state?.habitLogs) ? state.habitLogs : []).some((log: any) =>
      String(log?.habitId || "") === String(habit.id) && log?.localDate === today
    );
    if (alreadyRecorded) continue;
    const cue = String(habit.cue || "").trim();
    const minimum = String(habit.minimum || "").trim();
    out.push({
      key: `habit:${habit.id}`, dueDate: today,
      title: (`Habit: ${String(habit.name || "Practice").trim()}`).slice(0, 120),
      body: ((minimum ? `Small version: ${minimum}` : cue ? `Cue: ${cue}` : "A small practice for today.") +
        (cue && minimum ? ` · Cue: ${cue}` : "")).slice(0, 220)
    });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    if (action === "subscribe" || action === "unsubscribe") {
      const user = await authorizedUser(req);
      if (!user) return json({ error: "Sign in to Daily Life first." }, 401);
      const endpoint = String(body?.subscription?.endpoint || body?.endpoint || "");
      if (!endpoint.startsWith("https://")) return json({ error: "Invalid push endpoint." }, 400);
      if (action === "unsubscribe") {
        const { error } = await supabase.from("daily_life_push_subscriptions")
          .delete().eq("owner_user_id", user.id).eq("endpoint", endpoint);
        if (error) throw error;
        return json({ ok: true });
      }
      const subscription = body.subscription;
      if (!subscription?.keys?.p256dh || !subscription?.keys?.auth) return json({ error: "Incomplete push subscription." }, 400);
      const { error } = await supabase.from("daily_life_push_subscriptions").upsert({
        owner_user_id: user.id, endpoint, subscription, updated_at: new Date().toISOString()
      }, { onConflict: "owner_user_id,endpoint" });
      if (error) throw error;
      return json({ ok: true });
    }

    const { data: config, error: configError } = await supabase.from("daily_life_push_config")
      .select("vapid_public_key,vapid_private_key,cron_secret").eq("id", true).maybeSingle();
    if (configError || !config) throw configError || new Error("Push configuration is missing.");
    if (!equalSecret(String(req.headers.get("x-cron-secret") || ""), String(config.cron_secret || ""))) {
      return json({ error: "Unauthorized." }, 401);
    }

    webpush.setVapidDetails(APP_ORIGIN, config.vapid_public_key, config.vapid_private_key);
    const now = new Date();
    const [{ data: snapshots, error: snapshotError }, { data: profiles, error: profileError }, { data: subscriptions, error: subsError }] = await Promise.all([
      supabase.from("app_snapshots").select("owner_user_id,state"),
      supabase.from("profiles").select("user_id,timezone"),
      supabase.from("daily_life_push_subscriptions").select("owner_user_id,endpoint,subscription")
    ]);
    if (snapshotError || profileError || subsError) throw snapshotError || profileError || subsError;
    const timezoneByUser = new Map((profiles || []).map((p: any) => [p.user_id, p.timezone || "America/Chicago"]));
    const subscriptionsByUser = new Map<string, any[]>();
    for (const sub of subscriptions || []) {
      const rows = subscriptionsByUser.get(sub.owner_user_id) || [];
      rows.push(sub); subscriptionsByUser.set(sub.owner_user_id, rows);
    }
    let delivered = 0, skipped = 0, expired = 0;
    for (const snapshot of snapshots || []) {
      const userSubs = subscriptionsByUser.get(snapshot.owner_user_id) || [];
      if (!userSubs.length) continue;
      const timeZone = String(timezoneByUser.get(snapshot.owner_user_id) || "America/Chicago");
      for (const reminder of dueItems(snapshot.state, now, timeZone)) {
        const { data: claimed, error: claimError } = await supabase.from("daily_life_push_dispatch_log")
          .insert({ owner_user_id: snapshot.owner_user_id, reminder_key: reminder.key, due_date: reminder.dueDate })
          .select("reminder_key").maybeSingle();
        if (claimError?.code === "23505") { skipped++; continue; }
        if (claimError) throw claimError;
        if (!claimed) { skipped++; continue; }
        let sent = false;
        for (const sub of userSubs) {
          try {
            await webpush.sendNotification(sub.subscription, JSON.stringify({
              title: reminder.title, body: reminder.body, tag: `daily-life-${reminder.key}-${reminder.dueDate}`,
              url: APP_ORIGIN + "/daily-life/"
            }), { TTL: 86400 });
            sent = true; delivered++;
          } catch (e) {
            const status = Number((e as any)?.statusCode || 0);
            if (status === 404 || status === 410) {
              await supabase.from("daily_life_push_subscriptions").delete()
                .eq("owner_user_id", snapshot.owner_user_id).eq("endpoint", sub.endpoint);
              expired++;
            } else console.error("Push delivery failed", status, String(e));
          }
        }
        if (!sent) await supabase.from("daily_life_push_dispatch_log").delete()
          .eq("owner_user_id", snapshot.owner_user_id).eq("reminder_key", reminder.key).eq("due_date", reminder.dueDate);
      }
    }
    return json({ ok: true, delivered, skipped, expired });
  } catch (error) {
    console.error("daily-life-push error", error);
    return json({ error: String((error as any)?.message || error) }, 500);
  }
});
