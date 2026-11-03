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
          <li>In MacroDroid, create a macro with trigger <b>Notification Received</b> and select your SMS app (Samsung Messages or Google Messages).</li>
          <li>Add an <b>HTTP Request</b> action: method <b>POST</b>, URL <code>${endpoint()}</code>, content type <code>text/plain; charset=utf-8</code>, body <code>{notification}</code>.</li>
          <li>Add these request headers. Replace the token with the one shown above:
            <pre>apikey: sb_publishable_S8rk3-LkoyPLuyw2p_v7gA_yskyW--m
x-daily-life-token: YOUR_TOKEN
x-inbox-sender: {not_title}
x-inbox-event-id: {not_timestamp}
x-inbox-source: {not_app_name}</pre>
          </li>
          <li>Allow MacroDroid notification access when Android prompts. Filter the trigger to your messaging app; the inbox starts receiving new notification previews after setup.</li>
        </ol>
        <p>Only notifications exposed by Android are forwarded. This does not import old messages or MMS photos. Notification access can reveal message previews to MacroDroid, so keep the app filter narrow. You can revoke this connection here or disable the macro in MacroDroid.</p>
      </details>`;
    const messageList = (messages || []).length
      ? (messages || []).map((m) => `<article class="card" style="margin:10px 0;padding:14px">
          <div style="display:flex;justify-content:space-between;gap:10px"><b>${h(m.sender)}</b><button class="btn" onclick="textInboxDelete('${h(m.id)}')">Delete</button></div>
          <small>${h(new Date(m.received_at).toLocaleString())}${m.source_app ? " · " + h(m.source_app) : ""}</small>
          <p style="white-space:pre-wrap;overflow-wrap:anywhere">${h(m.body)}</p>
        </article>`).join("")
      : "<p>No forwarded messages yet.</p>";
    modal("Texts · private inbox", `
      <div style="max-height:70vh;overflow:auto">
        <p>New SMS notification previews forwarded from your phone stay in this private inbox until you delete them.</p>
        ${tokenError ? "<p>Could not load connection status.</p>" : setup}
        ${steps}
        <h3>Recent messages</h3>
        ${messageError ? "<p>Could not load messages.</p>" : messageList}
      </div>`, "Close", closeModal);
  };
})();
