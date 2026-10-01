// Daily Life financial-sync browser bridge.
// Plaid secrets and access tokens never reach this file. The browser receives
// only short-lived Link tokens and user-scoped financial rows protected by RLS.

let cloudFinancialAccounts=[];
let cloudRecentTransactions=[];
let cloudUnreviewedTransactions=[];
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
  await cloudImportBankSpending(false);
  const params=new URLSearchParams(location.search);
  const savedToken=sessionStorage.getItem("dailyLifePlaidLinkToken");
  const savedMode=sessionStorage.getItem("dailyLifePlaidMode")||"bank";
  if(params.has("oauth_state_id")&&savedToken&&window.Plaid){
    setTimeout(()=>openPlaidHandler(savedToken,true,savedMode),0);
  }
}

async function cloudRefreshFinancialAccounts(updateMapped=true){
  if(!cloudUser?.()||!cloudClient){cloudFinancialAccounts=[];return}
  const {data,error}=await cloudClient.from("financial_accounts")
    .select("id,connection_id,display_name,mask,account_type,account_subtype,currency,available_balance,current_balance,balance_as_of,metadata,financial_connections(institution_name,connection_type,last_synced_at,status,sync_error)")
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
  return `<div class="card"><div class="section-title"><h2>Automatic financial accounts</h2><div class="actions"><button class="btn primary" onclick="startPlaidLink('bank')">Connect bank / card</button><button class="btn" onclick="startPlaidLink('investment')">Connect retirement / investment</button><button class="btn" onclick="cloudSyncBanks(true)">Sync now</button></div></div>
  <p class="muted small">Bank credentials are entered only in Plaid Link. Daily Life stores provider tokens server-side, never in this public app code. Balances below update mapped Money accounts.</p>
  ${cloudFinanceMessage?`<div class="notice">${esc(cloudFinanceMessage)}</div>`:""}
  ${cloudUnreviewedTransactions.length?`<div class="warning"><b>${cloudUnreviewedTransactions.length} bank transaction${cloudUnreviewedTransactions.length===1?"":"s"} need a category.</b> Daily Life left them out of the budget instead of guessing. <button class="btn small" onclick="openBankTransactionReview(0)">Review</button></div>`:""}
  ${rows.length?rows.map(r=>{
    const c=r.financial_connections||{},mapped=(state.accounts||[]).find(a=>a.cloudAccountId===r.id);
    const fresh=r.balance_as_of||c.last_synced_at;
    return `<div class="row budget-row"><span><b>${esc(r.display_name)}</b>${r.mask?` · ••••${esc(r.mask)}`:""}<div class="muted small">${esc(c.institution_name||"Connected institution")} · ${esc(c.connection_type||"bank")} · ${esc(r.account_subtype||r.account_type||"account")}${fresh?` · synced ${esc(new Date(fresh).toLocaleString())}`:""}</div></span><div><b>${money(cloudFinanceBalance(r))}</b><button class="btn small" onclick="openCloudAccountMap('${r.id}')">${mapped?"Mapped":"Use in Money"}</button></div></div>`;
  }).join(""):`<div class="notice">No financial accounts connected yet.</div>`}</div>`;
}

async function startPlaidLink(mode="bank"){
  if(cloudFinanceBusy)return;
  mode=mode==="investment"?"investment":"bank";
  if(!cloudUser?.()){openCloudAuth();return}
  if(!window.Plaid){alert("Plaid Link did not load. Try reopening Daily Life.");return}
  cloudFinanceBusy=true;cloudFinanceMessage="";
  try{
    const {data,error}=await cloudClient.functions.invoke("plaid-link-token",{body:{mode}});
    if(error){
      const msg=String(error.message||"");
      if(msg.includes("non-2xx"))throw new Error("Bank sync is built but Plaid credentials still need to be added to the private backend.");
      throw error;
    }
    if(!data?.link_token)throw new Error(data?.error==="plaid_not_configured"?"Bank sync is built but Plaid credentials still need to be added to the private backend.":"Could not create a bank-link session.");
    sessionStorage.setItem("dailyLifePlaidLinkToken",data.link_token);
    sessionStorage.setItem("dailyLifePlaidMode",mode);
    openPlaidHandler(data.link_token,false,mode);
  }catch(error){
    cloudFinanceMessage=error?.message||"Could not start bank connection.";
    alert(cloudFinanceMessage);render();
  }finally{cloudFinanceBusy=false}
}

function openPlaidHandler(token,returningFromOAuth,mode="bank"){
  if(!window.Plaid)return;
  const config={
    token,
    onSuccess:async(publicToken,metadata)=>{
      try{
        const {data,error}=await cloudClient.functions.invoke("plaid-exchange",{body:{
          public_token:publicToken,
          institution_name:metadata?.institution?.name||null,
          mode
        }});
        if(error||!data?.ok)throw error||new Error(data?.error||"Exchange failed");
        sessionStorage.removeItem("dailyLifePlaidLinkToken");
        sessionStorage.removeItem("dailyLifePlaidMode");
        if(location.search)history.replaceState({},"",location.pathname);
        await cloudSyncBanks(false);
        alert("Financial account connected.");
      }catch(error){
        cloudFinanceMessage="The bank connected in Plaid, but Daily Life could not finish saving it. Try again before deleting anything in Plaid.";
        alert(cloudFinanceMessage);render();
      }finally{handler.destroy()}
    },
    onExit:(error)=>{
      if(error?.error_code==="INVALID_LINK_TOKEN"){sessionStorage.removeItem("dailyLifePlaidLinkToken");sessionStorage.removeItem("dailyLifePlaidMode")}
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
    await cloudImportBankSpending(false);
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

function bankBudgetCategory(t){
  const primary=String(t.category_primary||"");
  const detailed=String(t.category_detailed||"");
  if(primary==="FOOD_AND_DRINK")return detailed.includes("GROCERIES")?"grocery":"dining";
  if(primary==="TRANSPORTATION")return "transport";
  if(primary==="GENERAL_MERCHANDISE"||primary==="HOME_IMPROVEMENT")return "household";
  if(primary==="MEDICAL"||primary==="PERSONAL_CARE")return "personal";
  if(primary==="ENTERTAINMENT")return "fun";
  return null;
}

function normalizeBillWords(value){
  return String(value||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/)
    .filter(x=>x.length>=4&&!["payment","monthly","bill","autopay","subscription"].includes(x));
}

function bankLooksLikeKnownBill(t){
  const amount=Number(t.provider_amount||0),posted=new Date(String(t.posted_date||"")+"T12:00:00");
  if(!Number.isFinite(amount)||isNaN(posted))return false;
  const words=new Set(normalizeBillWords((t.merchant_name||"")+" "+(t.name||"")));
  return (state.bills||[]).some(b=>{
    const billAmount=Number(b.amount||0),due=new Date(String(b.due||"")+"T12:00:00");
    if(!Number.isFinite(billAmount)||isNaN(due)||Math.abs(billAmount-amount)>.05)return false;
    const days=Math.abs((posted-due)/86400000);if(days>5)return false;
    return normalizeBillWords(b.name).some(w=>words.has(w));
  });
}

async function cloudImportBankSpending(showAlert=false){
  if(!cloudUser?.()||!cloudClient||typeof state==="undefined")return 0;
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-93);
  const cutoffDate=cutoff.toISOString().slice(0,10);
  const {data,error}=await cloudClient.from("financial_transactions")
    .select("provider_transaction_id,account_id,posted_date,merchant_name,name,provider_amount,pending,is_transfer,category_primary,category_detailed")
    .gte("posted_date",cutoffDate)
    .eq("pending",false)
    .eq("is_transfer",false)
    .order("posted_date",{ascending:true})
    .limit(2000);
  if(error){cloudFinanceMessage=error.message;return 0}

  cloudRecentTransactions=data||[];
  const remoteIds=new Set((data||[]).map(t=>t.provider_transaction_id));
  cloudUnreviewedTransactions=[];
  let changed=0;
  // Remove disappeared provider transactions only when Daily Life auto-created
  // the entry and the user has not edited it.
  const before=state.budget.spending.length;
  state.budget.spending=state.budget.spending.filter(x=>!(
    x.source==="bank"&&x.autoImported&&!x.userEdited&&x.date>=cutoffDate&&x.bankTransactionId&&!remoteIds.has(x.bankTransactionId)
  ));
  changed+=before-state.budget.spending.length;

  for(const t of data||[]){
    if(Number(t.provider_amount||0)<=0)continue;
    const category=bankBudgetCategory(t);
    const existing=state.budget.spending.find(x=>x.bankTransactionId===t.provider_transaction_id);
    const review=state.settings.bankTransactionReviews?.[t.provider_transaction_id];
    const knownBill=bankLooksLikeKnownBill(t);
    if(review?.action==="ignored"||knownBill){
      if(existing?.autoImported&&!existing.userEdited){
        state.budget.spending.splice(state.budget.spending.indexOf(existing),1);changed++;
      }
      continue;
    }
    if(!category){
      if(existing?.autoImported&&!existing.userEdited){
        state.budget.spending.splice(state.budget.spending.indexOf(existing),1);changed++;
      }
      if(!existing&&!review)cloudUnreviewedTransactions.push(t);
      continue;
    }
    if(existing?.userEdited)continue;
    const entry={
      ...(existing||{id:uid()}),
      date:t.posted_date,
      amount:Math.round(Number(t.provider_amount||0)*100)/100,
      category,
      note:String(t.merchant_name||t.name||"Bank purchase"),
      source:"bank",
      autoImported:true,
      bankTransactionId:t.provider_transaction_id,
      cloudFinancialAccountId:t.account_id
    };
    if(existing)Object.assign(existing,entry);else state.budget.spending.push(entry);
    changed++;
  }
  if(changed)await save();
  if(showAlert)alert(changed?`Updated ${changed} bank-linked budget entr${changed===1?"y":"ies"}.`:"Bank-linked budget spending is already up to date.");
  return changed;
}


function cloudBudgetActuals(month){
  const rows=cloudRecentTransactions.filter(t=>String(t.posted_date||"").slice(0,7)===month&&!t.pending&&!t.is_transfer);
  const income=rows.filter(t=>Number(t.provider_amount)<0&&String(t.category_primary||"")==="INCOME")
    .reduce((sum,t)=>sum+Math.abs(Number(t.provider_amount||0)),0);
  const outflow=rows.filter(t=>Number(t.provider_amount)>0)
    .reduce((sum,t)=>sum+Number(t.provider_amount||0),0);
  const imported=(state.budget?.spending||[]).filter(x=>String(x.date||"").slice(0,7)===month&&x.source==="bank")
    .reduce((sum,x)=>sum+Number(x.amount||0),0);
  return {income,outflow,imported,count:rows.length};
}

function openBankTransactionReview(index=0){
  const t=cloudUnreviewedTransactions[index];if(!t)return;
  const label=String(t.merchant_name||t.name||"Bank transaction");
  const amount=Math.round(Number(t.provider_amount||0)*100)/100;
  const categories=[
    ["transport","Transportation/Gas"],["dining","Dining/Convenience"],["household","Household/Shopping"],
    ["personal","Personal/Health"],["grocery","Cash Grocery Overflow"],["fun","Entertainment/Fun"],
    ["cushion","Cushion"],["__ignore__","Not budget spending / ignore"]
  ];
  const options=categories.map(pair=>'<option value="'+pair[0]+'">'+pair[1]+'</option>').join("");
  modal("Review bank transaction",
    '<div class="row"><span><b>'+esc(label)+'</b><div class="muted small">'+esc(t.posted_date||"")+' · bank-synced</div></span><b>'+money(amount)+'</b></div>'+
    '<div class="stack"><label>Budget category<select id="bankReviewCategory">'+options+'</select></label>'+
    '<label>Budget note<input id="bankReviewNote" value="'+esc(label)+'"></label></div>'+
    '<p class="muted small">Daily Life could not categorize this confidently, so it was excluded until you review it.</p>',
    "Save review",async()=>{
      const category=document.querySelector("#bankReviewCategory").value;
      const id=t.provider_transaction_id;
      if(!state.settings.bankTransactionReviews)state.settings.bankTransactionReviews={};
      if(category==="__ignore__"){
        state.settings.bankTransactionReviews[id]={action:"ignored",reviewedAt:new Date().toISOString()};
      }else{
        state.budget.spending.push({
          id:uid(),date:t.posted_date,amount,category,
          note:document.querySelector("#bankReviewNote").value.trim()||label,
          source:"bank",autoImported:false,userEdited:true,
          bankTransactionId:id,cloudFinancialAccountId:t.account_id
        });
        state.settings.bankTransactionReviews[id]={action:"categorized",category,reviewedAt:new Date().toISOString()};
      }
      await save();closeModal();
      await cloudImportBankSpending(false);
      render();
    }
  );
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
