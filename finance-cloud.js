// Daily Life financial-sync browser bridge.
// Plaid secrets and access tokens never reach this file. The browser receives
// only short-lived Link tokens and user-scoped financial rows protected by RLS.

let cloudFinancialAccounts=[];
let cloudFinanceBusy=false;
let cloudFinanceMessage="";

function cloudFinanceType(row){
  if(row.account_type==="depository")return row.account_subtype==="savings"?"savings":"checking";
  if(row.account_type==="credit")return "credit";
  if(row.account_type==="investment")return "investment";
  if(row.account_type==="loan")return "loan";
  return "other";
}

function cloudFinanceBalance(row){
  if(row.account_type==="depository"&&row.available_balance!=null)return Number(row.available_balance);
  return Number(row.current_balance||0);
}

async function cloudFinanceInit(){
  if(!cloudUser?.()||!cloudClient)return;
  await cloudRefreshFinancialAccounts(true);
  const params=new URLSearchParams(location.search);
  const savedToken=sessionStorage.getItem("dailyLifePlaidLinkToken");
  if(params.has("oauth_state_id")&&savedToken&&window.Plaid){
    setTimeout(()=>openPlaidHandler(savedToken,true),0);
  }
}

async function cloudRefreshFinancialAccounts(updateMapped=true){
  if(!cloudUser?.()||!cloudClient){cloudFinancialAccounts=[];return}
  const {data,error}=await cloudClient.from("financial_accounts")
    .select("id,connection_id,display_name,mask,account_type,account_subtype,currency,available_balance,current_balance,balance_as_of,metadata,financial_connections(institution_name,last_synced_at,status,sync_error)")
    .order("display_name",{ascending:true});
  if(error){cloudFinanceMessage=error.message;return}
  cloudFinancialAccounts=data||[];
  if(updateMapped&&typeof state!=="undefined"){
    let changed=false;
    for(const local of state.accounts||[]){
      if(!local.cloudAccountId)continue;
      const remote=cloudFinancialAccounts.find(x=>x.id===local.cloudAccountId);
      if(!remote)continue;
      const balance=cloudFinanceBalance(remote);
      if(Number.isFinite(balance)&&Number(local.balance)!==balance){local.balance=balance;changed=true}
      const asOf=remote.balance_as_of||remote.financial_connections?.last_synced_at||null;
      if(local.balanceAsOf!==asOf){local.balanceAsOf=asOf;changed=true}
      local.syncSource="plaid";
    }
    if(changed)await save();
  }
}

function cloudFinancePanel(){
  const user=cloudUser?.();
  if(!user){
    return `<div class="card"><div class="section-title"><h2>Automatic financial accounts</h2><span class="tag">cloud required</span></div><p class="muted">Sign in to a Daily Life cloud account before connecting banks.</p><button class="btn" onclick="openCloudAuth()">Sign in</button></div>`;
  }
  const rows=cloudFinancialAccounts;
  return `<div class="card"><div class="section-title"><h2>Automatic financial accounts</h2><div class="actions"><button class="btn primary" onclick="startPlaidLink()">Connect bank</button><button class="btn" onclick="cloudSyncBanks(true)">Sync now</button></div></div>
  <p class="muted small">Bank credentials are entered only in Plaid Link. Daily Life stores provider tokens server-side, never in this public app code. Balances below update mapped Money accounts.</p>
  ${cloudFinanceMessage?`<div class="notice">${esc(cloudFinanceMessage)}</div>`:""}
  ${rows.length?rows.map(r=>{
    const c=r.financial_connections||{},mapped=(state.accounts||[]).find(a=>a.cloudAccountId===r.id);
    const fresh=r.balance_as_of||c.last_synced_at;
    return `<div class="row budget-row"><span><b>${esc(r.display_name)}</b>${r.mask?` · ••••${esc(r.mask)}`:""}<div class="muted small">${esc(c.institution_name||"Connected institution")} · ${esc(r.account_subtype||r.account_type||"account")}${fresh?` · synced ${esc(new Date(fresh).toLocaleString())}`:""}</div></span><div><b>${money(cloudFinanceBalance(r))}</b><button class="btn small" onclick="openCloudAccountMap('${r.id}')">${mapped?"Mapped":"Use in Money"}</button></div></div>`;
  }).join(""):`<div class="notice">No financial accounts connected yet.</div>`}</div>`;
}

async function startPlaidLink(){
  if(cloudFinanceBusy)return;
  if(!cloudUser?.()){openCloudAuth();return}
  if(!window.Plaid){alert("Plaid Link did not load. Try reopening Daily Life.");return}
  cloudFinanceBusy=true;cloudFinanceMessage="";
  try{
    const {data,error}=await cloudClient.functions.invoke("plaid-link-token",{body:{}});
    if(error){
      const msg=String(error.message||"");
      if(msg.includes("non-2xx"))throw new Error("Bank sync is built but Plaid credentials still need to be added to the private backend.");
      throw error;
    }
    if(!data?.link_token)throw new Error(data?.error==="plaid_not_configured"?"Bank sync is built but Plaid credentials still need to be added to the private backend.":"Could not create a bank-link session.");
    sessionStorage.setItem("dailyLifePlaidLinkToken",data.link_token);
    openPlaidHandler(data.link_token,false);
  }catch(error){
    cloudFinanceMessage=error?.message||"Could not start bank connection.";
    alert(cloudFinanceMessage);render();
  }finally{cloudFinanceBusy=false}
}

function openPlaidHandler(token,returningFromOAuth){
  if(!window.Plaid)return;
  const config={
    token,
    onSuccess:async(publicToken,metadata)=>{
      try{
        const {data,error}=await cloudClient.functions.invoke("plaid-exchange",{body:{
          public_token:publicToken,
          institution_name:metadata?.institution?.name||null
        }});
        if(error||!data?.ok)throw error||new Error(data?.error||"Exchange failed");
        sessionStorage.removeItem("dailyLifePlaidLinkToken");
        if(location.search)history.replaceState({},"",location.pathname);
        await cloudSyncBanks(false);
        alert("Financial account connected.");
      }catch(error){
        cloudFinanceMessage="The bank connected in Plaid, but Daily Life could not finish saving it. Try again before deleting anything in Plaid.";
        alert(cloudFinanceMessage);render();
      }finally{handler.destroy()}
    },
    onExit:(error)=>{
      if(error?.error_code==="INVALID_LINK_TOKEN")sessionStorage.removeItem("dailyLifePlaidLinkToken");
      if(error?.display_message)cloudFinanceMessage=error.display_message;
      handler.destroy();render();
    }
  };
  if(returningFromOAuth)config.receivedRedirectUri=window.location.href;
  const handler=window.Plaid.create(config);
  handler.open();
}

async function cloudSyncBanks(showAlert=false){
  if(cloudFinanceBusy||!cloudUser?.()||!cloudClient)return;
  cloudFinanceBusy=true;cloudFinanceMessage="";
  try{
    const {data,error}=await cloudClient.functions.invoke("plaid-sync",{body:{}});
    if(error){
      const msg=String(error.message||"");
      if(msg.includes("non-2xx"))throw new Error("Plaid is not configured yet, or a connected bank needs attention.");
      throw error;
    }
    if(data?.error==="plaid_not_configured")throw new Error("Plaid credentials still need to be added to the private backend.");
    await cloudRefreshFinancialAccounts(true);
    if(showAlert){
      const connected=(data?.connections||[]).length;
      alert(connected?`Synced ${connected} financial connection${connected===1?"":"s"}.`:"No linked financial connections to sync yet.");
    }
    render();
  }catch(error){
    cloudFinanceMessage=error?.message||"Financial sync failed.";
    if(showAlert)alert(cloudFinanceMessage);
    render();
  }finally{cloudFinanceBusy=false}
}

function openCloudAccountMap(remoteId){
  const remote=cloudFinancialAccounts.find(x=>x.id===remoteId);if(!remote)return;
  const mapped=(state.accounts||[]).find(a=>a.cloudAccountId===remoteId);
  const options=(state.accounts||[]).map(a=>`<option value="${esc(a.key)}" ${mapped?.key===a.key?"selected":""}>${esc(a.name)} · ${esc(a.type)}</option>`).join("");
  modal("Use synced account in Money",`<p><b>${esc(remote.display_name)}</b>${remote.mask?` · ••••${esc(remote.mask)}`:""}</p><div class="stack"><label>Daily Life account<select id="cloudMapLocal"><option value="__new__">Create a new Money account</option>${options}</select></label></div><p class="muted small">Once mapped, the account's balance updates from the synced financial account. Bills can keep using the existing Daily Life account key.</p>`,"Map account",async()=>{
    const chosen=document.querySelector("#cloudMapLocal").value;
    let local=chosen==="__new__"?null:state.accounts.find(a=>a.key===chosen);
    if(!local){
      local={key:"sync_"+remote.id,name:remote.display_name,type:cloudFinanceType(remote),balance:cloudFinanceBalance(remote)};
      state.accounts.push(local);
    }
    // One remote account maps to only one local Money record.
    for(const a of state.accounts)if(a!==local&&a.cloudAccountId===remote.id)delete a.cloudAccountId;
    Object.assign(local,{
      cloudAccountId:remote.id,
      syncSource:"plaid",
      balance:cloudFinanceBalance(remote),
      balanceAsOf:remote.balance_as_of||remote.financial_connections?.last_synced_at||null
    });
    if(!local.type||local.type==="other")local.type=cloudFinanceType(remote);
    await save();closeModal();render();
  });
}

let financeAutoTimer=null;
function startFinanceAutoRefresh(){
  if(financeAutoTimer)clearInterval(financeAutoTimer);
  financeAutoTimer=setInterval(()=>{
    if(document.visibilityState==="visible"&&cloudUser?.())cloudSyncBanks(false);
  },15*60*1000);
}

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"&&cloudUser?.()){
    cloudRefreshFinancialAccounts(true).then(()=>{if(typeof render==="function")render()}).catch(()=>{});
  }
});
startFinanceAutoRefresh();
