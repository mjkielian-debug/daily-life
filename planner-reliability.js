/* Keep stale one-off items reviewable and avoid overlapping household blocks. */
(() => {
  const baseTaskCandidates = itineraryTaskCandidates;
  itineraryTaskCandidates = function(date) {
    const rows = baseTaskCandidates(date);
    if (String(date) !== String(ymd())) return rows;
    const cutoff = shiftDateString(date, -7);
    return rows.filter(task => {
      const taskDate = String(task.date || "");
      if (task.keepInToday === true || taskDate >= cutoff) return true;
      const due = String(task.dueDate || task.due || "");
      return /^\d{4}-\d{2}-\d{2}$/.test(due) && due >= String(date);
    });
  };

  const baseDayItems = itineraryDayItems;
  itineraryDayItems = function(date) {
    const rows = baseDayItems(date);
    const groupFor = row => {
      const text = String(row.title || "") + " " + String(row.detail || "");
      if (/scoop(?:ing)?\s+(?:the\s+)?litter|litter\s+(?:boxes?|reset)|cat litter|pet area reset/i.test(text)) return "litter";
      if (/bathroom reset|clean (?:one|a|the) toilet|toilet.{0,20}clean/i.test(text)) return "bathroom";
      if (/change.{0,20}bedding|kids['’]? bedding|bedroom.{0,20}linens|change.{0,20}sheets/i.test(text)) return "bedding";
      return "";
    };
    const score = (key, row) => {
      const title = String(row.title || "").toLowerCase();
      if (key === "litter") return /sunday litter reset/.test(title) ? 3 : /pet area reset|cat litter/.test(title) ? 2 : 1;
      if (key === "bathroom") return /bathroom reset/.test(title) ? 3 : 1;
      if (key === "bedding") return /bedroom.{0,20}linens/.test(title) ? 3 : /kids['’]? bedding/.test(title) ? 2 : 1;
      return 0;
    };
    const groups = new Map();
    for (const row of rows) {
      const key = groupFor(row);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const removed = new Set();
    for (const [key, candidates] of groups) {
      if (candidates.length < 2) continue;
      candidates.sort((a, b) => score(key, b) - score(key, a));
      const [winner, ...duplicates] = candidates;
      const included = duplicates.map(x => String(x.title || "")).filter(Boolean);
      const details = duplicates.map(x => String(x.detail || "")).filter(Boolean);
      winner.detail = [winner.detail, included.length ? "Also covers: " + included.join(", ") : "", ...details]
        .filter(Boolean).join(" · ");
      for (const duplicate of duplicates) removed.add(duplicate);
    }
    return rows.filter(row => !removed.has(row))
      .sort((a, b) => String(a.start || "").localeCompare(String(b.start || "")) || (a.kind === "gap" ? 1 : -1));
  };
})();
