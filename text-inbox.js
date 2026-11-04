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
        <button class="btn primary" onclick="textInboxCopy(${JSON.stringify(oneTimeToken)})">Copy token</button>
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
        : '<div class="notice"><b>Connection token active; no preview received yet.</b> After saving and enabling the MacroDroid macro, send a short test message. This confirms delivery; an active token alone does not.</div>'
      : '<div class="notice">No active phone connection. Create one to receive new notification previews.</div>';
    const setup = token
      ? `<div class="card" style="margin:12px 0;padding:14px">
          <b>Phone connection active</b><p>Token ${h(token.token_prefix)}… · created ${h(new Date(token.created_at).toLocaleDateString())}</p>
          <button class="btn" onclick="textInboxRevoke('${h(token.id)}')">Revoke phone connection</button>
        </div>`
      : `<div id="textInboxOneTime"></div>
         <button class="btn primary" onclick="textInboxCreateToken()">Create phone connection</button>`;
    const steps = `
      <details open style="margin:14px 0"><summary><b>Connect this Android phone (MacroDroid)</b></summary>
        <ol>
          <li>In MacroDroid, create a macro with trigger <b>Notification Received</b> and select both your messaging app (Samsung Messages or Google Messages) and <b>Messenger</b>.</li>
          <li>Add an <b>HTTP Request</b> action: method <b>POST</b>, URL <code>${endpoint()}</code>, content type <code>text/plain; charset=utf-8</code>, body <code>{notification}</code>.</li>
          <li>Add these request headers. Replace the token with the one shown above:
            <pre>apikey: sb_publishable_S8rk3-LkoyPLuyw2p_v7gA_yskyW--m
x-daily-life-token: YOUR_TOKEN
x-inbox-sender: {not_title}
x-inbox-event-id: {not_timestamp}
x-inbox-source: {not_app_name}</pre>
          </li>
          <li>Allow MacroDroid notification access when Android prompts. For Messenger, make sure message previews are enabled. Then send yourself a short test message and check for it below; only new notification previews are forwarded.</li>
        </ol>
        <p>Only notifications exposed by Android are forwarded. This does not import old messages or MMS photos. Notification access can reveal message previews to MacroDroid, so keep the app filter narrow. You can revoke this connection here or disable the macro in MacroDroid.</p>
      </details>`;
    const messageList = (messages || []).length
      ? '<label>Find a recent message<input type="search" placeholder="Sender or message text" oninput="textInboxFilter(this.value)"></label>' +
        '<div id="textInboxMessages">' + (messages || []).map((m) => {
          const bodyId = "textInboxBody_" + String(m.id).replace(/[^A-Za-z0-9_-]/g, ""),
                searchText = [m.sender, m.source_app, m.body].filter(Boolean).join(" ");
          return '<article class="card text-inbox-message" data-search="' + h(searchText) + '" style="margin:10px 0;padding:14px">' +
            '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>' + h(m.sender) + '</b><span class="actions">' +
            '<button class="btn" data-copy-target="' + h(bodyId) + '" onclick="textInboxCopy(document.getElementById(this.dataset.copyTarget).innerText)">Copy preview</button>' +
            '<button class="btn" data-message-id="' + h(m.id) + '" onclick="textInboxDelete(this.dataset.messageId)">Delete</button></span></div>' +
            '<small>' + h(new Date(m.received_at).toLocaleString()) + (m.source_app ? " · " + h(m.source_app) : "") + '</small>' +
            '<p id="' + h(bodyId) + '" style="white-space:pre-wrap;overflow-wrap:anywhere">' + h(m.body) + '</p>' +
          '</article>';
        }).join("") + '</div><p id="textInboxNoMatches" hidden>No recent messages match that search.</p>'
      : "<p>No forwarded messages yet.</p>";
    modal("Texts · private inbox", `
      <div style="max-height:70vh;overflow:auto">
        <p>New SMS notification previews forwarded from your phone stay in this private inbox until you delete them.</p>
        ${tokenError ? "<p>Could not load connection status.</p>" : setup + connectionHealth}
        ${steps}
        <h3>Recent messages</h3>
        ${messageError ? "<p>Could not load messages.</p>" : messageList}
      </div>`, "Close", closeModal);
  };
})();
