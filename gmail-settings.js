/* Daily Life — Gmail read-only inbox settings.
   Uses the deployed Gmail OAuth Edge Functions and owner-scoped inbox tables. */
(() => {
  const appClient = () => {
    try { return typeof cloudClient !== "undefined" ? cloudClient : null; } catch { return null; }
  };
  const appUser = () => {
    try { return typeof cloudUser === "function" ? cloudUser() : null; } catch { return null; }
  };
  const escMail = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
  const niceDate = (value) => {
    if (!value) return "Not yet";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "Not yet" : d.toLocaleString();
  };
  const statusText = (connection) => {
    if (!connection) return "Not connected";
    return connection.status === "reconnect_required" ? "Reconnect needed" : "Connected";
  };
  const callbackNotice = () => {
    const result = new URLSearchParams(location.search).get("gmail");
    if (result === "connected") return '<div class="notice"><b>Gmail connected.</b> Use “Check for new mail” to pull recent previews now.</div>';
    if (result === "cancelled") return '<div class="notice">Google sign-in was cancelled; no connection was made.</div>';
    if (result && result !== "connected") return '<div class="warning">Google connection did not finish. Check the OAuth setup and try again.</div>';
    return "";
  };
  window.gmailConnectionCard = () => `
    <section class="settings-flat-section">
      <div class="section-title">
        <div><div class="eyebrow">Email</div><h2>Gmail inbox</h2>
          <div class="muted small">Connect a read-only Gmail inbox to Daily Life for recent message previews and scheduled scans.</div>
        </div>
        <button class="btn primary" type="button" onclick="openGmailSettings()">Set up</button>
      </div>
    </section>`;

  window.openGmailSettings = async () => {
    const client = appClient(), user = appUser();
    if (!client || !user) {
      alert("Sign in to your Daily Life cloud account before connecting Gmail.");
      return;
    }
    const [{ data: connection, error: connectionError }, { data: messages, error: messagesError }] = await Promise.all([
      client.from("gmail_connections")
        .select("email_address,status,last_sync_at,last_sync_error")
        .eq("owner_user_id", user.id).maybeSingle(),
      client.from("gmail_inbox_messages")
        .select("id,sender,subject,snippet,received_at")
        .eq("owner_user_id", user.id).order("received_at", { ascending: false }).limit(20)
    ]);
    const notice = callbackNotice();
    const errorNotice = connectionError || messagesError
      ? '<div class="warning">Could not load Gmail status. Check that you are signed in, then reopen this panel.</div>'
      : "";
    const syncDetail = connection?.last_sync_error
      ? '<div class="warning">Last scan needs attention: ' + escMail(connection.last_sync_error) + '</div>'
      : "";
    const rows = (messages || []).map((m) => `
      <article class="card" style="margin:8px 0;padding:12px">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <div style="min-width:0"><b>${escMail(m.subject || "(no subject)")}</b>
            <div class="muted small">${escMail(m.sender || "Unknown sender")} · ${escMail(niceDate(m.received_at))}</div>
          </div>
          <button type="button" class="btn small" onclick="gmailDeletePreview('${escMail(m.id)}')">Delete</button>
        </div>
        <p class="small" style="white-space:pre-wrap;overflow-wrap:anywhere">${escMail(m.snippet || "")}</p>
      </article>`).join("");
    const body = `
      <div class="stack" style="max-height:70vh;overflow:auto">
        ${notice}${errorNotice}
        <div class="notice"><b>Status:</b> ${escMail(statusText(connection))}
          ${connection?.email_address ? " · " + escMail(connection.email_address) : ""}
          <br><span class="muted small">Last scan: ${escMail(niceDate(connection?.last_sync_at))}</span>
        </div>
        ${syncDetail}
        <div class="actions">
          <button type="button" class="btn primary" onclick="gmailConnect()">Connect with Google</button>
          <button type="button" class="btn" onclick="gmailSyncNow()">Check for new mail</button>
        </div>
        <details>
          <summary><b>Set up Google OAuth</b></summary>
          <p>Daily Life needs a Google OAuth web client to read message headers and short previews. In Google Cloud, enable the Gmail API, create a Web application OAuth client, and add this exact authorized redirect URI:</p>
          <pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escMail("https://lticktlgrlljlafmjsao.supabase.co/functions/v1/gmail-oauth-callback")}</pre>
          <p class="muted small">Save the client secret in the form below. Daily Life keeps it server-side; it is not displayed again. Grant read-only Gmail access on Google’s consent screen.</p>
          <label>OAuth client ID<input id="gmailClientId" type="text" autocomplete="off" placeholder="...apps.googleusercontent.com"></label>
          <label>OAuth client secret<input id="gmailClientSecret" type="password" autocomplete="new-password"></label>
          <button type="button" class="btn" onclick="gmailSaveOAuthClient()">Save OAuth setup</button>
          <div id="gmailSetupResult" class="muted small" aria-live="polite"></div>
        </details>
        <div>
          <h3>Recent previews</h3>
          <p class="muted small">Daily Life stores only sender, subject, date, and Gmail’s short preview. It does not download full message bodies.</p>
          ${rows || '<p class="muted">No previews yet. Connect Gmail, then check for new mail.</p>'}
        </div>
      </div>`;
    modal("Gmail inbox", body, "Close", closeModal);
  };

  window.gmailSaveOAuthClient = async () => {
    const client = appClient();
    const clientId = document.querySelector("#gmailClientId")?.value.trim() || "";
    const clientSecret = document.querySelector("#gmailClientSecret")?.value.trim() || "";
    const result = document.querySelector("#gmailSetupResult");
    if (!clientId.endsWith(".apps.googleusercontent.com") || !clientSecret) {
      if (result) result.textContent = "Enter both the Google OAuth client ID and client secret.";
      return;
    }
    if (result) result.textContent = "Saving securely…";
    const { data, error } = await client.functions.invoke("gmail-oauth-configure", {
      body: { client_id: clientId, client_secret: clientSecret }
    });
    if (error || !data?.ok) {
      if (result) result.textContent = data?.message || "Could not save the OAuth setup. Check the sign-in and try again.";
      return;
    }
    const secretField = document.querySelector("#gmailClientSecret");
    if (secretField) secretField.value = "";
    if (result) result.textContent = "Saved. The authorized redirect URI above must match Google Cloud exactly. Now choose “Connect with Google.”";
  };

  window.gmailConnect = async () => {
    const client = appClient();
    const { data, error } = await client.functions.invoke("gmail-oauth-start", { body: {} });
    if (error || !data?.auth_url) {
      alert(data?.message || "Gmail OAuth is not configured yet. Open Set up Google OAuth, save the client ID and secret, then try again.");
      return;
    }
    location.assign(data.auth_url);
  };

  window.gmailSyncNow = async () => {
    const client = appClient();
    const { data, error } = await client.functions.invoke("gmail-sync", { body: {} });
    if (error || !data?.ok) {
      alert("Gmail scan did not complete. Reopen Gmail settings to see whether Google needs reconnecting.");
      return;
    }
    const result = data.results?.[0];
    alert(result?.error
      ? "Gmail scan needs attention: " + result.error
      : "Gmail scan finished. " + Number(result?.count || 0) + " recent previews checked.");
    await window.openGmailSettings();
  };

  window.gmailDeletePreview = async (id) => {
    if (!id || !confirm("Delete this preview from Daily Life? The message will stay in Gmail.")) return;
    const client = appClient(), user = appUser();
    const { error } = await client.from("gmail_inbox_messages").delete()
      .eq("id", id).eq("owner_user_id", user.id);
    if (error) {
      alert("Could not delete that preview.");
      return;
    }
    await window.openGmailSettings();
  };
})();
