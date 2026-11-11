// Daily Life private SMS notification inbox.
// Requires the signed-in Supabase session; raw bridge tokens are shown once only.
(() => {
  const h = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
  let oneTimeToken = "";

  async function inboxReady() {
    if (typeof cloudClient === "undefined" || !cloudClient || !cloudUser?.()) {
      modal("Texts", '<p>Sign in to Daily Life first to open your private text inbox.</p>', "Close", closeModal);
      return false;
    }
    return true;
  }

  function tokenValue() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return "dl_" + btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  async function tokenHash(token) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function endpoint() {
    return "https://lticktlgrlljlafmjsao.supabase.co/functions/v1/text-ingest";
  }

  window.textInboxCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      alert("Copied.");
    } catch {
      prompt("Copy this value:", value);
    }
  };

  window.textInboxCopyToken = () => window.textInboxCopy(oneTimeToken);

  window.textInboxCopyMessage = (button) => {
    const card = button.closest(".text-inbox-message");
    if (!card) return;
    const sender = card.querySelector(".text-inbox-sender")?.innerText.trim();
    const meta = card.querySelector(".text-inbox-meta")?.innerText.trim();
    const body = card.querySelector(".text-inbox-body")?.innerText.trim();
    window.textInboxCopy([sender, meta, body].filter(Boolean).join("\n"));
  };

  window.textInboxReviewPackage = (button) => {
    const card = button.closest(".text-inbox-message");
    if (!card || typeof modal !== "function" || typeof state !== "object") return;
    const messageId = String(button.dataset.messageId || "");
    if ((state.deliveries || []).some(x => String(x.sourceInboxMessageId || "") === messageId)) {
      alert("This message is already saved as a delivery.");
      return;
    }
    const sender = card.querySelector(".text-inbox-sender")?.innerText.trim() || "";
    const body = card.querySelector(".text-inbox-body")?.innerText.trim() || "";
    modal("Review package notice",
      '<div class="stack"><p>Check the details, then save this as a package in Mail + Packages. Nothing is added until you tap Save.</p>' +
      '<label>Carrier (optional)<input id="textPackageCarrier" placeholder="UPS, USPS, FedEx…"></label>' +
      '<label>Sender / order<input id="textPackageSender" value="' + h(sender) + '"></label>' +
      '<label>Expected date (optional)<input id="textPackageDate" type="date"></label>' +
      '<label>Notes<textarea id="textPackageNotes" rows="4">' + h(body.slice(0, 1200)) + '</textarea></label></div>',
      "Save package", async () => {
        const deliveries = state.deliveries || (state.deliveries = []);
        if (deliveries.some(x => String(x.sourceInboxMessageId || "") === messageId)) {
          closeModal();
          alert("This message is already saved as a delivery.");
          return;
        }
        deliveries.push({
          id: uid(), kind: "package", date: ymd(),
          carrier: document.querySelector("#textPackageCarrier")?.value.trim() || "",
          sender: document.querySelector("#textPackageSender")?.value.trim() || "",
          status: "expected",
          expectedDate: document.querySelector("#textPackageDate")?.value || "",
          notes: document.querySelector("#textPackageNotes")?.value.trim() || "",
          sourceInboxMessageId: messageId
        });
        await save();
        closeModal();
        render();
      });
  };

  window.textInboxFilter = (query) => {
    const needle = String(query || "").trim().toLowerCase();
    const cards = Array.from(document.querySelectorAll("#textInboxMessages .text-inbox-message"));
    let visible = 0;
    for (const card of cards) {
      const match = String(card.dataset.search || "").toLowerCase().includes(needle);
      card.hidden = !match;
      if (match) visible++;
    }
    const empty = document.getElementById("textInboxNoMatches");
    if (empty) empty.hidden = visible > 0;
  };

  window.textInboxCreateToken = async () => {
    if (!(await inboxReady())) return;
    const { data: active, error: readError } = await cloudClient
      .from("text_inbox_tokens").select("id").is("revoked_at", null).limit(1);
    if (readError) {
      alert("Could not check your text bridge: " + readError.message);
      return;
    }
    if (active?.length) {
      alert("There is already an active phone connection. Revoke it below before making a replacement.");
      return;
    }

    oneTimeToken = tokenValue();
    const { error } = await cloudClient.from("text_inbox_tokens").insert({
      owner_user_id: cloudUser().id,
      token_hash: await tokenHash(oneTimeToken),
      token_prefix: oneTimeToken.slice(0, 9),
    });
    if (error) {
      oneTimeToken = "";
      alert("Could not create the phone connection: " + error.message);
      return;
    }
    await window.openTextInbox();
    const oneTime = document.getElementById("textInboxOneTime");
    if (oneTime) oneTime.innerHTML = `
      <div class="card" style="margin:12px 0;padding:14px">
        <b>Copy this connection token now</b>
        <p style="word-break:break-all">${h(oneTimeToken)}</p>
        <button class="btn primary" onclick="textInboxCopyToken()">Copy token</button>
        <p>This token is shown only once. It is stored as a hash and can be revoked below.</p>
      </div>`;
  };

  window.textInboxRevoke = async (id) => {
    if (!(await inboxReady())) return;
    if (!confirm("Stop forwarding new notifications from this phone?")) return;
    const { error } = await cloudClient.from("text_inbox_tokens")
      .update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) alert("Could not revoke the connection: " + error.message);
    else await window.openTextInbox();
  };

  window.textInboxDelete = async (id) => {
    if (!(await inboxReady())) return;
    if (!confirm("Delete this message from the Daily Life inbox?")) return;
    const { error } = await cloudClient.from("text_inbox_messages").delete().eq("id", id);
    if (error) alert("Could not delete the message: " + error.message);
    else await window.openTextInbox();
  };

  window.openTextInbox = async () => {
    if (!(await inboxReady())) return;
    const user = cloudUser();
    const [{ data: tokens, error: tokenError }, { data: messages, error: messageError }] = await Promise.all([
      cloudClient.from("text_inbox_tokens").select("id,token_prefix,created_at,revoked_at")
        .eq("owner_user_id", user.id).order("created_at", { ascending: false }).limit(10),
      cloudClient.from("text_inbox_messages").select("id,sender,body,received_at,source_app")
        .eq("owner_user_id", user.id).order("received_at", { ascending: false }).limit(100),
    ]);
    const token = (tokens || []).find((x) => !x.revoked_at);
    const latestMessage = (messages || [])[0] || null;
    const connectionHealth = token
      ? latestMessage
        ? `<div class="notice"><b>Last preview received:</b> ${h(new Date(latestMessage.received_at).toLocaleString())}${latestMessage.source_app ? " · " + h(latestMessage.source_app) : ""}</div>`
        : '<div class="notice"><b>Connection token active; no preview received yet.</b> Save your token in Daily Life Bridge and enable its notification access. The next incoming preview from a selected app will confirm delivery; an active token alone does not.</div>'
      : '<div class="notice">No active phone connection. Create one to receive new notification previews.</div>';
    const setup = token
      ? `<div class="card" style="margin:12px 0;padding:14px">
          <b>Phone connection active</b><p>Token ${h(token.token_prefix)}… · created ${h(new Date(token.created_at).toLocaleDateString())}</p>
          <button class="btn" onclick="textInboxRevoke('${h(token.id)}')">Revoke phone connection</button>
        </div>`
      : `<button class="btn primary" onclick="textInboxCreateToken()">Create phone connection</button>`;
    const steps = `
      <details open style="margin:14px 0"><summary><b>Connect this Android phone (Daily Life Bridge)</b></summary>
        <ol>
          <li>Open <b>Daily Life Bridge</b> on your phone.</li>
          <li>Paste the full connection token into its token field, select the messaging apps you want, and tap <b>Save connection</b>.</li>
          <li>Tap <b>Enable notification access</b> and turn on <b>Daily Life Bridge</b> in Android settings.</li>
          <li>Return here after your next incoming message. Its notification preview should appear below when delivery succeeds.</li>
        </ol>
        <p>Already saved your token and enabled access? Setup is complete; wait for a new incoming notification. No MacroDroid subscription is needed.</p>
        <p>Only new previews exposed by Android from your selected apps are forwarded. Old messages and MMS photos are not imported. You can revoke this connection here or turn off Daily Life Bridge notification access in Android settings.</p>
      </details>`;
    const messageList = (messages || []).length
      ? '<label>Find a recent message<input type="search" placeholder="Sender or message text" oninput="textInboxFilter(this.value)"></label>' +
        '<div id="textInboxMessages">' + (messages || []).map((m) => {
          const bodyId = "textInboxBody_" + String(m.id).replace(/[^A-Za-z0-9_-]/g, ""),
                searchText = [m.sender, m.source_app, m.body].filter(Boolean).join(" "),
                isPackageNotice = /\b(package|tracking|shipment|shipped|shipping|delivery|delivered|out for delivery|arriving)\b/i.test(String(m.body || "")) ||
                  (/walmart/i.test(String(m.sender || "") + " " + String(m.source_app || "")) && /\b(order|package|delivery)\b/i.test(String(m.body || ""))),
                alreadyAdded = (state.deliveries || []).some(x => String(x.sourceInboxMessageId || "") === String(m.id));
          return '<article class="card text-inbox-message" data-search="' + h(searchText) + '" style="margin:10px 0;padding:14px">' +
            '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b class="text-inbox-sender">' + h(m.sender) + '</b><span class="actions">' +
            (isPackageNotice ? '<button class="btn" data-message-id="' + h(m.id) + '" onclick="textInboxReviewPackage(this)">' + (alreadyAdded ? "Already saved" : "Review package") + '</button>' : '') +
            '<button class="btn" onclick="textInboxCopyMessage(this)">Copy message</button>' +
            '<button class="btn" data-message-id="' + h(m.id) + '" onclick="textInboxDelete(this.dataset.messageId)">Delete</button></span></div>' +
            '<small class="text-inbox-meta">' + h(new Date(m.received_at).toLocaleString()) + (m.source_app ? " · " + h(m.source_app) : "") + '</small>' +
            '<p class="text-inbox-body" id="' + h(bodyId) + '" style="white-space:pre-wrap;overflow-wrap:anywhere">' + h(m.body) + '</p>' +
          '</article>';
        }).join("") + '</div><p id="textInboxNoMatches" hidden>No recent messages match that search.</p>'
      : "<p>No forwarded messages yet.</p>";
    modal("Texts · private inbox", `
      <div style="max-height:70vh;overflow:auto">
        <p>New SMS notification previews forwarded from your phone stay in this private inbox until you delete them.</p>
        <div id="textInboxOneTime"></div>
        ${tokenError ? "<p>Could not load connection status.</p>" : setup + connectionHealth}
        ${steps}
        <h3>Recent messages</h3>
        ${messageError ? "<p>Could not load messages.</p>" : messageList}
      </div>`, "Close", closeModal);
  };
})();
