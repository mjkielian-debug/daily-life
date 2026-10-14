/* Chase card balance is a live-linked credit liability, not a repeating fixed bill.
   Never place a current outstanding credit balance into upcoming cash bill reserves.
   No bank figures or card identifiers are hardcoded in the public source. */

function chaseBalanceOnlyBill(b){
  return /^chase\s+(?:(?:credit\s+)?card\s+)?auto[\s-]?pay\b/i.test(String(b?.name||"").trim());
}
function chaseBillIsUnconfirmed(b){
  return chaseBalanceOnlyBill(b)&&b?.status!=="paid";
}
function billForecastIncluded(b){
  // Keep recorded paid history intact. Unpaid legacy Chase clones are not new
  // statement bills: the live card balance is shown separately instead.
  return !chaseBillIsUnconfirmed(b);
}
function chaseLinkedCreditCards(){
  if(typeof cloudFinancialAccounts==="undefined")return[];
  return (cloudFinancialAccounts||[]).filter(r=>r.account_type==="credit"&&
    /\bchase\b|jpmorgan/i.test(String(r.financial_connections?.institution_name||"")));
}
function chaseSelectedCreditCard(){
  const cards=chaseLinkedCreditCards();
  const selected=String(state?.settings?.chaseCreditAccountId||"");
  if(selected){
    const match=cards.find(r=>String(r.id)===selected);
    if(match)return match;
    // A bank reconnect may replace the account ID. If there is exactly one
    // Chase credit card available, follow it rather than a dead selection.
    // Never guess when multiple Chase cards remain available.
  }
  return cards.length===1?cards[0]:null;
}
function chaseBalanceSnapshot(){
  const cards=chaseLinkedCreditCards(),card=chaseSelectedCreditCard();
  if(!card)return {card:null,amount:null,cards,needsSelection:cards.length>1};
  const amount=card.current_balance===null||card.current_balance===undefined||card.current_balance===""?null:Number(card.current_balance);
  const asOf=String(card.balance_as_of||"");
  const date=asOf?new Date(asOf):null;
  const age=date&&Number.isFinite(date.getTime())?(Date.now()-date.getTime())/86400000:null;
  return {card,cards,amount:Number.isFinite(amount)?Math.max(0,amount):null,asOf,
    ageDays:age,stale:age===null||age>3,needsSelection:false};
}
function chaseBalanceMetric(){
  const x=chaseBalanceSnapshot();
  if(x.needsSelection)return "Choose card";
  if(!x.card)return "Connect card";
  if(x.amount===null)return "Unavailable";
  return typeof money==="function"?money(x.amount):"$"+x.amount.toFixed(2);
}
function chaseBalancePanel(){
  const x=chaseBalanceSnapshot(),select=x.cards.length>1,
    choose='<button type="button" class="btn small" onclick="openChaseCardPicker()">Choose Chase card</button>';
  if(!x.cards.length){
    return '<section class="card chase-balance-panel"><div class="eyebrow">Chase card balance</div>'+
      '<h2>No synced Chase balance available</h2><p class="muted small">Daily Life will not reuse an old bill amount. Refresh your connected accounts or connect Chase if it is not linked.</p>'+
      '<div class="actions"><button type="button" class="btn primary" onclick="cloudSyncBanks(true)">Refresh balances</button>'+
      '<button type="button" class="btn" onclick="startPlaidLink(\'bank\')">Connect card</button></div></section>';
  }
  if(!x.card){
    return '<section class="card chase-balance-panel"><div class="eyebrow">Chase credit card</div>'+
      '<h2>Select which card to follow</h2><p class="muted small">More than one Chase credit card is connected. Daily Life will not guess which balance belongs to your autopay.</p>'+choose+'</section>';
  }
  const suffix=x.card.mask?"•••• "+esc(x.card.mask):"Chase credit card",
    when=x.asOf?new Date(x.asOf).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"date unavailable",
    label=x.stale?"Last known balance":"Latest synced balance";
  return '<section class="card chase-balance-panel">'+
   '<div class="chase-balance-header"><div><div class="eyebrow">Chase autopay · card balance</div><h2>'+esc(suffix)+'</h2></div>'+
   (select?choose:'')+'</div>'+
   '<div class="chase-balance-number">'+(x.amount===null?'Balance unavailable':money(x.amount))+'</div>'+
   '<p class="chase-balance-date">'+esc(label)+' · '+esc(when)+'</p>'+
   '<p class="chase-balance-explain">This is the card’s outstanding balance, which changes with purchases, payments, and bank updates. It is not necessarily the next automatic payment. No repeated Chase bill is reserved in the budget.</p>'+
   '<button type="button" class="btn small" onclick="cloudSyncBanks(true)">Refresh bank balances</button>'+
   '</section>';
}
function openChaseCardPicker(){
  const cards=chaseLinkedCreditCards();
  if(!cards.length){alert("Connect Chase from Money → Accounts first.");return}
  const current=String(state?.settings?.chaseCreditAccountId||"");
  modal("Which Chase card?",'<div class="stack"><p>Choose the Chase card whose balance you want to see in Money. Your selection is saved on this device.</p>'+
   cards.map((c,i)=>'<button type="button" class="chase-card-option" onclick="chooseChaseCard('+i+')">'+
    '<span><b>Chase '+esc(c.mask?"•••• "+c.mask:String(c.display_name||"credit card"))+'</b><small>'+esc(c.account_subtype||"Credit card")+'</small></span>'+
    (String(c.id)===current?'<span aria-label="Selected">✓</span>':'<span aria-hidden="true">›</span>')+
    '</button>').join("")+'</div>',"Close",closeModal);
}
async function chooseChaseCard(index){
  const card=chaseLinkedCreditCards()[Number(index)];if(!card)return;
  if(!state.settings)state.settings={};
  const before=state.settings.chaseCreditAccountId;
  state.settings.chaseCreditAccountId=String(card.id);
  try{await save();closeModal();render();openMoneyHubSection("bills")}
  catch(e){state.settings.chaseCreditAccountId=before;alert("Could not save the Chase card selection. Please try again.")}
}
window.chaseBalanceOnlyBill=chaseBalanceOnlyBill;
window.chaseBillIsUnconfirmed=chaseBillIsUnconfirmed;
window.billForecastIncluded=billForecastIncluded;
window.chaseLinkedCreditCards=chaseLinkedCreditCards;
window.chaseSelectedCreditCard=chaseSelectedCreditCard;
window.chaseBalanceSnapshot=chaseBalanceSnapshot;
window.chaseBalanceMetric=chaseBalanceMetric;
window.chaseBalancePanel=chaseBalancePanel;
window.openChaseCardPicker=openChaseCardPicker;
window.chooseChaseCard=chooseChaseCard;
