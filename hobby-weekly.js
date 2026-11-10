/* A gentle, one-session-per-week hobby rotation. Progress is additive to the existing hobby project tracker. */
(function () {
  "use strict";
  const plan = [
    { name: "Crochet", icon: "🧶", minutes: 15, step: "Make a small practice square: chain a short row, work a few rows, and stop when your timer ends.", done: "Done means spending the 15 minutes practicing; it does not have to become a finished item." },
    { name: "Punch needle", icon: "🪡", minutes: 15, step: "Choose one design from your kit and practice a small section. Once you show me the designs, I can help break your chosen one into steps.", done: "Done means one short practice section, not finishing the design." },
    { name: "Yoga", icon: "🧘", minutes: 15, step: "Try an easy 8–10-minute beginner flow, then take a few minutes to breathe and relax.", done: "Keep movements gentle and use the modifications from your yoga project." },
    { name: "Kombucha", icon: "🫙", minutes: 20, step: "Spend 15–20 minutes on one small step for your first batch: review your tested recipe, gather supplies, or make a batch note.", done: "Done means one small preparation step; the batch does not need to be finished in one session." }
  ];
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  function mondayOf(date) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return typeof ymd === "function" ? ymd(d) : d.toISOString().slice(0, 10);
  }
  function currentPlan() {
    const start = state.settings?.hobbyRotationStart || mondayOf(ymd());
    const weeks = Math.max(0, Math.floor((new Date(mondayOf(ymd()) + "T12:00:00") - new Date(mondayOf(start) + "T12:00:00")) / 604800000));
    const index = weeks % plan.length;
    return { start, week: weeks + 1, item: plan[index] };
  }
  function card() {
    if (typeof state === "undefined" || !state) return "";
    const current = currentPlan();
    const settings = state.settings || (state.settings = {});
    const sessions = Array.isArray(settings.hobbyRotationSessions) ? settings.hobbyRotationSessions : [];
    const done = sessions.some(x => x && x.weekStart === current.start && x.done);
    const completed = sessions.filter(x => x && x.done).length;
    const item = current.item;
    return '<section class="card hobby-weekly-card"><div class="section-title"><div><div class="eyebrow">A little time for you · weekly</div><h2>' + item.icon + ' ' + escapeHtml(item.name) + ' · ' + item.minutes + ' minutes</h2><div class="muted small">Week ' + current.week + ' of your gentle rotation · ' + completed + ' session' + (completed === 1 ? "" : "s") + ' logged</div></div><span class="tag">' + (done ? "done this week" : "one small step") + '</span></div><p>' + escapeHtml(item.step) + '</p><div class="notice small">' + escapeHtml(item.done) + '</div><button type="button" class="btn ' + (done ? "" : "primary") + '" onclick="logWeeklyHobbySession()">' + (done ? "✓ Session logged" : "Log this week’s session") + '</button><details class="compact-more"><summary>What comes later</summary><div class="muted small">The next session rotates through crochet, your punch needle kit, yoga, and kombucha, then repeats with a slightly more involved step when the earlier one feels easy. Guitar is saved for later, when you have one available; your couple of years of high-school lessons mean we can start with a beginner refresher instead of learning how to hold it.</div></details></section>';
  }
  window.logWeeklyHobbySession = async function () {
    if (typeof state === "undefined" || typeof save !== "function") return;
    const current = currentPlan();
    const settings = state.settings || (state.settings = {});
    settings.hobbyRotationStart = current.start;
    settings.hobbyRotationSessions = Array.isArray(settings.hobbyRotationSessions) ? settings.hobbyRotationSessions : [];
    if (!settings.hobbyRotationSessions.some(x => x && x.weekStart === current.start && x.done)) {
      settings.hobbyRotationSessions.push({ weekStart: current.start, hobby: current.item.name, minutes: current.item.minutes, done: true, loggedAt: new Date().toISOString() });
      await save();
      if (typeof render === "function") render();
    }
  };
  const previous = window.hobbiesView;
  if (typeof previous === "function") window.hobbiesView = function () {
    return previous.apply(this, arguments).replace(/(<div class="card glow hobby-page-hero"[\s\S]*?<\/div><\/div>)/, "$1" + card());
  };
  if (!document.getElementById("hobbyWeeklyRotationStyles")) {
    const style = document.createElement("style");
    style.id = "hobbyWeeklyRotationStyles";
    style.textContent = ".hobby-weekly-card{display:grid;gap:10px;margin:12px 0;background:linear-gradient(135deg,#fff8fc,#edf8f6);border-color:#ead8e8}.hobby-weekly-card h2{margin:3px 0;font-size:1.2rem}.hobby-weekly-card p{margin:0;line-height:1.5}.hobby-weekly-card .notice{margin:0}.hobby-weekly-card>button{justify-self:start}";
    document.head.appendChild(style);
  }
})();