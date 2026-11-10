/* A gentle, one-session-per-week hobby rotation. Progress is additive to the existing hobby project tracker. */
(function () {
  "use strict";
  const plan = [
    { name: "Crochet", icon: "🧶", levels: [
      { minutes: 15, step: "Make a small practice square: chain a short row, work a few rows, and stop when your timer ends.", done: "Done means spending the 15 minutes practicing; it does not have to become a finished item." },
      { minutes: 18, step: "Build on your practice square with a few more rows, or turn it into a simple coaster-sized square.", done: "Done means one short practice session, whether or not the item is finished." },
      { minutes: 20, step: "Work toward finishing a simple coaster or another small useful piece at your own pace.", done: "Done means a focused 20-minute session." }
    ]},
    { name: "Punch needle", icon: "🪡", levels: [
      { minutes: 15, step: "Choose one design from your kit and practice a small section. Once you show me the designs, I can help break your chosen one into steps.", done: "Done means one short practice section, not finishing the design." },
      { minutes: 18, step: "Continue the chosen kit design by filling one small area, using the kit instructions.", done: "Done means a focused 18-minute practice session." },
      { minutes: 20, step: "Add another small area to the design, or repeat a stitch that you want to make more even.", done: "Done means a focused 20-minute session; progress on the design can be gradual." }
    ]},
    { name: "Yoga", icon: "🧘", levels: [
      { minutes: 15, step: "Try an easy 8–10-minute beginner flow, then take a few minutes to breathe and relax.", done: "Keep movements gentle and use the modifications from your yoga project." },
      { minutes: 18, step: "Repeat a comfortable beginner flow for about 12 minutes, then spend a few minutes relaxing.", done: "Keep movements gentle and stop or modify anything that does not feel right." },
      { minutes: 20, step: "Try a familiar beginner flow for about 15 minutes, then relax for the remaining few minutes.", done: "Stay focused on enjoyment, mobility, relaxation, strength, and body awareness." }
    ]},
    { name: "Kombucha", icon: "🫙", levels: [
      { minutes: 15, step: "Spend one small session step on your first batch: review your tested recipe, gather supplies, or write a batch note.", done: "The batch does not need to be finished in one session." },
      { minutes: 18, step: "Use your tested recipe to prepare the next manageable step and record the date and ingredients.", done: "Done means one preparation step and a simple log entry." },
      { minutes: 20, step: "Continue your first small batch or record a tasting note when it is ready.", done: "Enjoy the process; this project is for homemade kombucha, not an intoxicating effect." }
    ]}
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
    const track = plan[index], levels = state.settings?.hobbyRotationLevels || {};
    const level = Math.min(track.levels.length - 1, Math.max(0, Number(levels[track.name] || 0)));
    return { start, week: weeks + 1, track, level, item: { name: track.name, icon: track.icon, ...track.levels[level] } };
  }
  function card() {
    if (typeof state === "undefined" || !state) return "";
    const current = currentPlan();
    const settings = state.settings || (state.settings = {});
    const sessions = Array.isArray(settings.hobbyRotationSessions) ? settings.hobbyRotationSessions : [];
    const done = sessions.some(x => x && x.weekStart === current.start && x.done);
    const completed = sessions.filter(x => x && x.done).length;
    const item = current.item;
    return '<section class="card hobby-weekly-card"><div class="section-title"><div><div class="eyebrow">A little time for you · weekly</div><h2>' + item.icon + ' ' + escapeHtml(item.name) + ' · ' + item.minutes + ' minutes</h2><div class="muted small">Week ' + current.week + ' of your gentle rotation · ' + completed + ' session' + (completed === 1 ? "" : "s") + ' logged</div></div><span class="tag">' + (done ? "done this week" : "one small step") + '</span></div><p>' + escapeHtml(item.step) + '</p><div class="notice small">' + escapeHtml(item.done) + '</div><button type="button" class="btn ' + (done ? "" : "primary") + '" onclick="logWeeklyHobbySession()">' + (done ? "✓ Session logged" : "Log this week’s session") + '</button>' + (done && current.level < current.track.levels.length - 1 ? '<button type="button" class="btn small" onclick="levelUpWeeklyHobby()">That felt easy · make this hobby a little harder next time</button>' : "") + '<details class="compact-more"><summary>What comes later</summary><div class="muted small">The next session rotates through crochet, your punch needle kit, yoga, and kombucha, then repeats with a slightly more involved step when the earlier one feels easy. Guitar is saved for later, when you have one available; your couple of years of high-school lessons mean we can start with a beginner refresher instead of learning how to hold it.</div></details></section>';
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
  window.levelUpWeeklyHobby = async function () {
    if (typeof state === "undefined" || typeof save !== "function") return;
    const current = currentPlan(), settings = state.settings || (state.settings = {});
    settings.hobbyRotationLevels = settings.hobbyRotationLevels || {};
    if (current.level >= current.track.levels.length - 1) return;
    settings.hobbyRotationLevels[current.track.name] = current.level + 1;
    await save();
    if (typeof render === "function") render();
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