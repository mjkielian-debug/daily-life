/* Human-reviewed findings, not automatic "I own it" guesses from photographs. */
(function(){
"use strict";
const DECISIONS={review:"Decide",keep:"Keep",use_up:"Use up first",donate:"Donate",sell:"Sell",recycle:"Recycle appropriately",replace_later:"Replace only when used up"};
function signed(){return typeof cloudClient!=="undefined"&&!!cloudClient&&typeof cloudUser==="function"&&!!cloudUser()}
const clean=s=>String(s||"").trim().toLowerCase().replace(/\s+/g," ");
const digits=id=>/^[a-f0-9-]{36}$/i.test(String(id||""));
function reviewedInventory(){
 return (state.inventoryItems||[]).filter(x=>x.organizingDecision&&x.organizingDecision!=="review");
}
window.openInventoryPhotoReview=async function(){
 if(!signed()){
  modal("Photo inventory review",'<p class="muted">Sign in to Daily Life cloud to receive suggestions from photos you ask me to examine. Existing inventory stays on this phone.</p><button class="btn primary" onclick="openCloudAuth()">Sign in</button>',"Close",closeModal);return;
 }
 modal("📦 Review items from photos",'<div class="pi-main">'+
 '<div class="pi-help"><b>Only confirmed belongings go into inventory</b><p>After you ask ChatGPT to review your Photo Inbox, tentative items appear here. Confirm their name, quantity and location. Overlapping photos do not automatically create duplicates.</p></div>'+
 '<div class="pi-map-actions"><button class="btn primary" onclick="openPhotoInbox(\'inventory\')">+ Send inventory photos</button><button class="btn" onclick="openUseUpPlan()">Use-up + declutter plan</button></div>'+
 '<div id="inventoryReviewRows"><p class="pi-muted">Loading suggestions…</p></div></div>',"Close",closeModal);
 const {data,error}=await cloudClient.from("inventory_photo_suggestions")
  .select("id,item_name,category,quantity_estimate,unit,room_name,storage_spot,condition_notes,decision,replacement_criteria,suggested_next_step,review_status,evidence_note,app_item_id")
  .eq("review_status","pending").order("created_at",{ascending:false}).limit(150);
 const target=document.getElementById("inventoryReviewRows");if(!target)return;
 if(error){target.textContent="Could not load suggestions: "+error.message;return}
 target.innerHTML=(data||[]).map(x=>'<div class="pi-area-card"><b>'+esc(x.item_name)+'</b>'+
  '<small>'+esc(x.category||"Household")+(x.quantity_estimate===null?" · count not verified":" · about "+esc(x.quantity_estimate)+" "+esc(x.unit||"each"))+'</small>'+
  '<p class="pi-muted">'+esc(x.room_name||"Room unknown")+(x.storage_spot?" → "+esc(x.storage_spot):"")+'</p>'+
  (x.evidence_note?'<p class="pi-muted">Seen in photo: '+esc(x.evidence_note)+'</p>':"")+
  '<div class="pi-map-actions"><button class="btn primary small" onclick="inventoryReviewEdit(\''+x.id+'\')">Review / add</button>'+
  '<button class="btn small" onclick="inventoryIgnoreSuggestion(\''+x.id+'\')">Not mine / skip</button></div></div>').join("")||
  '<p class="pi-muted">No pending suggestions yet. Send pictures, then ask ChatGPT to review the Photo Inbox and prepare inventory candidates.</p>';
};
window.inventoryReviewEdit=async function(id){
 if(!signed()||!digits(id))return;
 const {data:x,error}=await cloudClient.from("inventory_photo_suggestions").select("*").eq("id",id).single();
 if(error||!x){alert("Could not load suggestion.");return}
 const existing=(state.inventoryItems||[]).find(i=>i.sourceSuggestionId===id);
 const candidates=(state.inventoryItems||[]).filter(i=>clean(i.name)===clean(x.item_name));
  const dupe=candidates.length?'<div class="pi-help"><b>Possible existing match</b><p>Do these photos show an item you already counted?</p>'+
 candidates.slice(0,8).map(i=>'<button class="btn small" type="button" onclick="inventoryMarkAlreadyCounted(\''+id+'\',\''+String(i.id||"").replace(/[^a-z0-9_-]/gi,"")+'\')">Already counted: '+esc(i.name||"")+' (×'+Number(i.quantity||0)+')</button>').join(" ")+'</div>':"";
 modal("Check before adding",'<div class="stack pi-form">'+dupe+
 '<label>Item name<input id="irName" value="'+esc(x.item_name)+'"></label>'+
 '<div class="grid2"><label>Confirmed quantity<input id="irQty" type="number" min="0" step="1" value="'+(x.quantity_estimate===null?"1":Math.max(0,Math.floor(Number(x.quantity_estimate)||1)))+'"></label>'+
 '<label>Category<input id="irCategory" value="'+esc(x.category||"Household")+'"></label></div>'+
 '<div class="grid2"><label>Room<input id="irRoom" value="'+esc(x.room_name||"")+'"></label>'+
 '<label>Storage spot<input id="irStorage" value="'+esc(x.storage_spot||"")+'"></label></div>'+
 '<label>What should happen next?<select id="irDecision">'+Object.entries(DECISIONS).map(([k,v])=>'<option value="'+k+'" '+(x.decision===k?"selected":"")+'>'+esc(v)+'</option>').join("")+'</select></label>'+
 '<label>Replacement criteria (only if needed later)<textarea id="irReplace" rows="2">'+esc(x.replacement_criteria||"")+'</textarea></label>'+
 '<label>Notes / condition / next action<textarea id="irNotes" rows="2">'+esc([x.condition_notes,x.suggested_next_step].filter(Boolean).join(" · "))+'</textarea></label>'+
 '<p class="pi-muted">Confirm the item actually belongs to your household; the photo may contain packaging, advertisements or things that are not yours.</p></div>',
 "Confirm as owned",async()=>{
  const get=id=>document.getElementById(id);
  const name=get("irName").value.trim(),qty=Number(get("irQty").value);
  if(!name||!Number.isInteger(qty)||qty<0){alert("Enter a name and valid whole-number quantity.");return}
  const roomId=inventoryEnsureRoom(get("irRoom").value.trim());
  const locationId=inventoryEnsureLocation(roomId,get("irStorage").value.trim());
  const decision=get("irDecision").value;
  let row=existing||((state.inventoryItems||[]).find(i=>i.sourceSuggestionId===id));
  if(!row){
   row={id:uid()};state.inventoryItems.push(row);
  }
  Object.assign(row,{name,category:get("irCategory").value.trim()||"Household",quantity:qty,status:decision==="donate"||decision==="sell"?"Donate / sell":"Have",
   roomId,locationId,notes:get("irNotes").value.trim(),organizingDecision:decision,
   replacementCriteria:get("irReplace").value.trim(),sourceSuggestionId:id,updatedAt:new Date().toISOString()});
  try{await save()}catch(e){alert("Couldn't save this item on your phone. Keep the suggestion for another attempt.");return}
  const {error:err}=await cloudClient.from("inventory_photo_suggestions").update({review_status:"confirmed",app_item_id:row.id,updated_at:new Date().toISOString()}).eq("id",id);
  if(err)alert("Item saved locally; the cloud review badge could not update. Check it before confirming again.");
  render();window.openInventoryPhotoReview();
 });
};
window.inventoryMarkAlreadyCounted=async function(id,itemId){
 if(!signed()||!digits(id))return;
 const item=(state.inventoryItems||[]).find(x=>String(x.id)===itemId);if(!item)return;
 if(!confirm("Use the existing "+item.name+" entry without adding to its count?"))return;
 const photos=Array.isArray(item.sourceSuggestionIds)?item.sourceSuggestionIds:[];
 if(!photos.includes(id))photos.push(id);
 item.sourceSuggestionIds=photos;
 try{await save()}catch(e){alert("Could not save this match locally.");return}
 const {error}=await cloudClient.from("inventory_photo_suggestions").update({review_status:"confirmed",app_item_id:String(item.id),updated_at:new Date().toISOString()}).eq("id",id);
 if(error){alert("Matched locally; the cloud review entry couldn't be updated.");return}
 render();window.openInventoryPhotoReview();
};
window.inventoryIgnoreSuggestion=async function(id){
 if(!signed()||!digits(id)||!confirm("Dismiss this proposed item? It will not be added to your inventory."))return;
 const {error}=await cloudClient.from("inventory_photo_suggestions").update({review_status:"ignored"}).eq("id",id);
 if(error){alert("Could not dismiss item.");return}
 window.openInventoryPhotoReview();
};
window.openUseUpPlan=function(){
 const list=reviewedInventory().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
 const labels={use_up:"Use what you have",donate:"Donate",sell:"Sell",recycle:"Recycle",replace_later:"Replace later",keep:"Keep / organize"};
 const order=["use_up","donate","sell","recycle","replace_later","keep"];
 const groups=order.map(k=>{
 const items=list.filter(x=>x.organizingDecision===k);if(!items.length)return"";
 return '<section class="pi-useup-group"><h3>'+labels[k]+' · '+items.length+'</h3>'+
 items.map(x=>'<button class="inventory-item-row" onclick="openInventoryItem(\''+String(x.id).replace(/[^a-z0-9_-]/gi,"")+'\')"><span class="grow"><b>'+esc(x.name)+'</b>'+
 '<small>'+Number(x.quantity||0)+' on hand'+(x.replacementCriteria?' · Later: '+esc(x.replacementCriteria):"")+'</small></span></button>').join("")+'</section>';
 }).join("");
 modal("♻ Use up, reduce + replace thoughtfully",'<div class="pi-main"><div class="pi-help"><b>First use what is already in your home.</b>'+
 '<p>Prioritize using up safe, useful supplies; donate or sell genuine extras; recycle appropriately; then compare the best-value replacement for the family only when it is needed. This is a planning list, not a purchase or a completed disposal.</p></div>'+
 (groups||'<p class="pi-muted">Confirm items from inventory photos and choose Use up, Donate, Sell, Recycle or Replace later to build this plan.</p>')+
 '<div class="pi-map-actions"><button class="btn primary" onclick="openInventoryPhotoReview()">Review photo items</button><button class="btn" onclick="openPhotoInbox(\'inventory\')">Add photos</button></div></div>',"Close",closeModal);
};
})();