/* Reader wheel and book ownership fixes.
   Keeps the existing log format and makes the profile-scoped reading tools tappable. */
(function () {
  const normalizeReader = (value) => {
    const name = String(value || "").trim();
    if (!name || /^me$/i.test(name) || /^you$/i.test(name)) {
      return String(state.profile?.name || "Michelle").trim() || "Michelle";
    }
    return name;
  };
  const readerKey = (value) => normalizeReader(value).toLocaleLowerCase();
  const sameReader = (left, right) => readerKey(left) === readerKey(right);
  const arg = (value) => typeof lifeSimArg === "function"
    ? lifeSimArg(value)
    : esc(JSON.stringify(String(value ?? "")));

  function readerNames() {
    const names = [];
    const seen = new Set();
    const add = (value) => {
      const name = normalizeReader(value);
      const key = name.toLocaleLowerCase();
      if (name && !seen.has(key)) { seen.add(key); names.push(name); }
    };
    (state.settings?.readers || []).forEach(add);
    add(state.profile?.name || "Michelle");
    (state.readingLogs || []).forEach((row) => add(row.reader));
    return names;
  }

  function activeReader() {
    try {
      const roster = typeof lifeSimRoster === "function" ? lifeSimRoster() : [];
      const activeId = typeof lifeSimSelectedId === "function" ? lifeSimSelectedId(roster) : "self";
      const selected = roster.find((person) => String(person.id) === String(activeId));
      return normalizeReader(selected?.name || state.profile?.name || "Michelle");
    } catch {
      return normalizeReader(state.profile?.name || "Michelle");
    }
  }

  function ticketsForPages(pages) {
    if (pages >= 40) return 3;
    if (pages >= 20) return 2;
    if (pages >= 5) return 1;
    return 0;
  }

  window.monthlyReaderTickets = function monthlyReaderTickets() {
    const prefix = ymd().slice(0, 7);
    const logs = state.readingLogs || [];
    return readerNames().map((reader) => {
      const daily = new Map();
      for (const row of logs) {
        if (!sameReader(row.reader, reader) || !String(row.date || "").startsWith(prefix)) continue;
        daily.set(row.date, (daily.get(row.date) || 0) + Number(row.pages || 0));
      }
      let pages = 0;
      let tickets = 0;
      for (const total of daily.values()) {
        pages += total;
        tickets += ticketsForPages(total);
      }
      return { reader, tickets, pages, days: daily.size };
    });
  };

  window.openReadingChooser = function openReadingChooser() {
    const readers = readerNames();
    modal("Log reading", `<div class="stack">
      <div class="notice"><b>Who read?</b><div class="muted small">Choose a reader, then enter pages or page numbers.</div></div>
      <div class="people-hub-list">${readers.map((name) => `<button type="button" onclick="closeModal();openReading(${arg(name)})">
        <span class="person-avatar mini">${esc(name.charAt(0).toUpperCase())}</span>
        <span><b>${esc(name)}</b><small>Log pages</small></span><span>›</span>
      </button>`).join("")}</div>
      <button type="button" class="btn" onclick="closeModal();openPeople()">Edit readers</button>
    </div>`, "Close", closeModal);
  };

  window.readingReadersCard = function readingReadersCard() {
    const todayReads = reads();
    const rows = readerNames().map((name) => {
      const pages = todayReads.filter((row) => sameReader(row.reader, name)).reduce((sum, row) => sum + Number(row.pages || 0), 0);
      const tickets = ticketsForPages(pages);
      return `<div class="reader-card">
        <div><div class="eyebrow">${esc(name)}</div><div class="big">${pages} pages</div>
        <div class="muted small">${tickets} ticket${tickets === 1 ? "" : "s"} today</div></div>
        <button type="button" class="btn primary" onclick="openReading(${arg(name)})">Log pages</button>
      </div>`;
    }).join("");
    return `<div class="card"><div class="section-title"><div><div class="eyebrow">Readers</div><h2>Who is reading</h2>
      <div class="muted small">5+ pages = 1 ticket · 20+ = 2 · 40+ = 3 per day.</div></div>
      <button type="button" class="btn" onclick="openPeople()">Edit readers</button></div><div class="reader-grid">${rows}</div></div>`;
  };

  window.openReadingReaderSummary = function openReadingReaderSummary(reader) {
    const name = normalizeReader(reader);
    const prefix = ymd().slice(0, 7);
    const logs = (state.readingLogs || []).filter((row) =>
      sameReader(row.reader, name) && String(row.date || "").startsWith(prefix)
    );
    const byDay = new Map();
    for (const row of logs) byDay.set(row.date, (byDay.get(row.date) || 0) + Number(row.pages || 0));
    const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    const detail = days.length ? days.map(([date, pages]) =>
      `<div class="row"><span>${esc(dl(date))} · ${pages} pages</span><b>${ticketsForPages(pages)} ticket${ticketsForPages(pages) === 1 ? "" : "s"}</b></div>`
    ).join("") : `<div class="notice">No reading logged for ${esc(name)} this month yet.</div>`;
    const allTickets = days.reduce((sum, [, pages]) => sum + ticketsForPages(pages), 0);
    modal(`${name} · Reader Wheel`, `<div class="stack"><div class="notice"><b>${allTickets} tickets this month</b><div class="muted small">Tickets are based on pages logged per day and count toward the monthly drawing.</div></div>${detail}
      <button type="button" class="btn primary" onclick="closeModal();openReading(${arg(name)})">＋ Log pages</button></div>`, "Close", closeModal);
  };

  window.readingWheelCard = function readingWheelCard() {
    const rows = window.monthlyReaderTickets();
    const totalTickets = rows.reduce((sum, row) => sum + Number(row.tickets || 0), 0);
    const body = rows.map((row) => `<button type="button" class="reading-log-row" style="width:100%;text-align:left" onclick="openReadingReaderSummary(${arg(row.reader)})">
      <span><b>${esc(row.reader)}</b><small>${row.days} reading day${row.days === 1 ? "" : "s"}</small></span>
      <span class="reading-log-pages"><b>${row.tickets} ticket${row.tickets === 1 ? "" : "s"}</b><small>Details ›</small></span>
    </button>`).join("");
    return `<div class="card"><div class="section-title"><div><div class="eyebrow">Reader Wheel</div><h2>This month</h2>
      <div class="muted small">Each reader earns up to 3 tickets per day: 5+ pages = 1, 20+ = 2, and 40+ = 3.</div></div>
      <button type="button" class="btn primary" ${totalTickets ? "" : "disabled"} onclick="spinReaderWheel()">Spin</button></div>
      <div class="reading-wheel-rows">${body}</div>
      ${totalTickets ? "" : `<div class="notice">Log at least 5 pages in a day to earn the first ticket.</div>`}
    </div>`;
  };

  window.openReadingBookDetails = function openReadingBookDetails(reader, book) {
    const name = normalizeReader(reader);
    const title = String(book || "").trim();
    const key = typeof readingBookKey === "function" ? readingBookKey(title) : title.toLowerCase();
    const rows = (state.readingLogs || []).filter((row) =>
      sameReader(row.reader, name) &&
      (typeof readingBookKey === "function" ? readingBookKey(row.book) : String(row.book || "").toLowerCase()) === key
    ).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const entries = rows.map((row) => `<button type="button" class="reading-log-row" onclick="closeModal();openReading(${arg(name)},${arg(row.id)})">
      <span><b>${esc(dl(row.date))}</b><small>${Number(row.start || 0) ? `Pages ${Number(row.start) + 1}–${Number(row.end || 0)}` : "Reading log"}</small></span>
      <span class="reading-log-pages"><b>${Number(row.pages || 0)} pages</b><small>Edit ›</small></span>
    </button>`).join("");
    modal(`${name} · ${title}`, `<div class="stack"><div class="notice">${rows.reduce((sum, row) => sum + Number(row.pages || 0), 0)} pages logged across ${rows.length} entr${rows.length === 1 ? "y" : "ies"}.</div>
      ${entries || `<div class="notice">No reading logs found for this book.</div>`}
      <button type="button" class="btn primary" onclick="closeModal();openReading(${arg(name)} , \"\", ${arg(title)})">＋ Log more pages</button>
    </div>`, "Close", closeModal);
  };

  const originalOpenReading = window.openReading;
  if (typeof originalOpenReading === "function" && !originalOpenReading.__bookPrefill) {
    const wrappedOpenReading = function (reader, id = "", bookTitle = "") {
      const result = originalOpenReading.call(window, reader, id);
      if (!id && bookTitle) {
        const bookInput = document.getElementById("rb");
        if (bookInput) bookInput.value = String(bookTitle);
      }
      return result;
    };
    wrappedOpenReading.__bookPrefill = true;
    window.openReading = wrappedOpenReading;
  }

  window.readingBooksCard = function readingBooksCard() {
    const reader = activeReader();
    const logs = (state.readingLogs || []).filter((row) => sameReader(row.reader, reader));
    const books = new Map();
    for (const row of logs) {
      const book = String(row.book || "").trim();
      if (!book) continue;
      const key = typeof readingBookKey === "function" ? readingBookKey(book) : book.toLowerCase();
      const entry = books.get(key) || { book, pages: 0, logs: 0, last: "" };
      entry.pages += Number(row.pages || 0);
      entry.logs += 1;
      if (String(row.date || "") > entry.last) entry.last = row.date;
      books.set(key, entry);
    }
    const rows = [...books.values()].sort((a, b) => String(b.last).localeCompare(String(a.last)));
    const body = rows.map((entry) => `<button type="button" class="reading-log-row" style="width:100%;text-align:left" onclick="openReadingBookDetails(${arg(reader)},${arg(entry.book)})">
      <span><b>${esc(entry.book)}</b><small>${entry.logs} log${entry.logs === 1 ? "" : "s"} · last ${esc(dl(entry.last))}</small></span>
      <span class="reading-log-pages"><b>${entry.pages} pages</b><small>Open ›</small></span>
    </button>`).join("");
    return `<div class="card"><div class="eyebrow">Books · ${esc(reader)}</div><h2>${esc(reader)}’s books</h2>
      ${body || `<div class="notice">No books logged for ${esc(reader)} yet.</div>`}
      <button type="button" class="btn primary" onclick="openReading(${arg(reader)})">＋ Log pages for ${esc(reader)}</button>
    </div>`;
  };

  window.readingView = function readingView() {
    const tickets = window.monthlyReaderTickets();
    const selected = activeReader();
    const selectedMonth = tickets.find((row) => sameReader(row.reader, selected)) || { tickets: 0, days: 0 };
    const todayLogs = reads() || [];
    const todayPages = todayLogs.filter((row) => sameReader(row.reader, selected)).reduce((sum, row) => sum + Number(row.pages || 0), 0);
    const allTodayPages = todayLogs.reduce((sum, row) => sum + Number(row.pages || 0), 0);
    const month = ymd().slice(0, 7);
    const monthLogs = (state.readingLogs || []).filter((row) => String(row.date || "").startsWith(month));
    const monthPages = monthLogs.reduce((sum, row) => sum + Number(row.pages || 0), 0);
    const bookCount = new Set(monthLogs.map((row) => typeof readingBookKey === "function" ? readingBookKey(row.book) : String(row.book || "").toLowerCase()).filter(Boolean)).size;
    const allTickets = tickets.reduce((sum, row) => sum + Number(row.tickets || 0), 0);
    const recent = (state.readingLogs || []).filter((row) => row.date >= shiftDateString(ymd(), -6)).length;
    const segments = [
      { icon: "＋", title: "Log Pages", detail: "Add reading", section: "log" },
      { icon: "♡", title: "Readers", detail: readerNames().length + " readers", section: "readers" },
      { icon: "◌", title: "Wheel", detail: allTickets + " tickets", section: "wheel" },
      { icon: "☀", title: "Today", detail: todayPages + " pages for " + selected, section: "today" },
      { icon: "◫", title: "This Month", detail: monthPages + " pages", section: "month" },
      { icon: "▤", title: "Books", detail: bookCount + " this month", section: "books" },
      { icon: "↕", title: "History", detail: (state.readingLogs || []).length + " logs", section: "history" },
      { icon: "↗", title: "Patterns", detail: recent + " recent logs", section: "patterns" }
    ];
    return `<section class="reading-one-screen"><div class="reading-one-topline"><div><div class="eyebrow">Reading at a glance</div><b>Pages + Reader Wheel</b></div>
      <button type="button" class="btn small primary" onclick="openReadingChooser()">＋ Pages</button></div>
      <div class="life-wheel reading-wheel" role="group" aria-label="Reading dashboard">
        ${segments.map((item, index) => `<button type="button" class="life-wheel-segment" style="--i:${index};--seg:${index}" onclick="openReadingHubSection('${item.section}')" aria-label="${esc(item.title)}: ${esc(item.detail)}"><span><i>${item.icon}</i><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></span></button>`).join("")}
        <button type="button" class="life-wheel-center reading-wheel-center" onclick="event.stopPropagation();openReadingChooser();return false;">
          <span class="eyebrow">${esc(selected)}’S READING</span><b>${todayPages} pages today</b>
          <strong>${selectedMonth.tickets} tickets · ${selectedMonth.days} reading days this month</strong><small>Tap to log pages</small>
        </button>
      </div>
      <div class="muted small" style="text-align:center;margin-top:4px">${allTodayPages} pages logged by the household today.</div>
    </section>`;
  };

  const style = document.createElement("style");
  style.textContent = ".life-wheel-center{pointer-events:auto!important}.reading-log-row{cursor:pointer}.reading-log-row:focus-visible{outline:3px solid #8a5b9b;outline-offset:2px}";
  document.head.appendChild(style);
  if (typeof render === "function") render();
})();