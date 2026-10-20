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
const savedInventoryPhotoCache=new Map();
function itemSuggestionIds(item){
 return [...new Set([item?.sourceSuggestionId,...(Array.isArray(item?.sourceSuggestionIds)?item.sourceSuggestionIds:[])].filter(digits))];
}
const inventoryThumbStyle="width:54px;height:54px;object-fit:cover;border-radius:12px;flex:0 0 54px;background:#f5e8f0;";
window.inventoryItemPhotoHtml=function(item){
 if(!itemSuggestionIds(item).length)return "";
 const src=savedInventoryPhotoCache.get(String(item.id||""));
 if(src)return '<img src="'+esc(src)+'" alt="Photo of '+esc(item.name||"inventory item")+'" style="'+inventoryThumbStyle+'">';
 return '<span data-inventory-thumb="'+esc(item.id||"")+'" data-inventory-name="'+esc(item.name||"inventory item")+'" aria-hidden="true" style="'+inventoryThumbStyle+'display:grid;place-items:center">📷</span>';
};
window.inventoryLoadSavedItemPhotos=async function(){
 if(!signed())return;
 const items=(state.inventoryItems||[]).filter(item=>itemSuggestionIds(item).length).slice(0,30);
 const missing=items.filter(item=>!savedInventoryPhotoCache.has(String(item.id||"")));
 if(!missing.length)return;
 const suggestionIds=[...new Set(missing.flatMap(item=>itemSuggestionIds(item)))];
 if(!suggestionIds.length)return;
 const {data:suggestions,error}=await cloudClient.from("inventory_photo_suggestions").select("id,source_photo_id").in("id",suggestionIds);
 if(error||!suggestions?.length)return;
 const suggestionMap=new Map(suggestions.map(item=>[item.id,item.source_photo_id]));
 const photoIds=[...new Set(suggestions.map(item=>item.source_photo_id).filter(digits))];
 if(!photoIds.length)return;
 const {data:photos}=await cloudClient.from("photo_inbox").select("id,image_data").in("id",photoIds);
 const photosById=new Map((photos||[]).filter(photo=>/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(photo.image_data||"")).map(photo=>[photo.id,photo.image_data]));
 for(const item of missing){
  const photoId=itemSuggestionIds(item).map(id=>suggestionMap.get(id)).find(id=>photosById.has(id));
  if(photoId)savedInventoryPhotoCache.set(String(item.id||""),photosById.get(photoId));
 }
 document.querySelectorAll("[data-inventory-thumb]").forEach(node=>{
  const src=savedInventoryPhotoCache.get(node.getAttribute("data-inventory-thumb")||"");
  if(!src)return;
  const img=document.createElement("img");img.src=src;img.alt="Photo of "+(node.getAttribute("data-inventory-name")||"inventory item");img.style.cssText=inventoryThumbStyle;node.replaceWith(img);
 });
};

window.openInventoryPhotoReview=async function(roomFilter){
 const reviewRoom=String(roomFilter||"").trim();
 if(!signed()){
  modal("Photo inventory review",'<p class="muted">Sign in to Daily Life cloud to receive suggestions from photos you ask me to examine. Existing inventory stays on this phone.</p><button class="btn primary" onclick="openCloudAuth()">Sign in</button>',"Close",closeModal);return;
 }
 modal(reviewRoom?"📦 Review "+esc(reviewRoom)+" photo items":"📦 Review items from photos",'<div class="pi-main">'+
 '<div class="pi-help"><b>Only confirmed belongings go into inventory</b><p>After you ask ChatGPT to review your Photo Inbox, tentative items appear here. Confirm their name, quantity and location. Overlapping photos do not automatically create duplicates.</p></div>'+
 '<div class="pi-map-actions"><button class="btn primary" onclick="openPhotoInbox(\'inventory\')">+ Send inventory photos</button><button class="btn" onclick="openUseUpPlan()">Use-up + declutter plan</button></div>'+
 '<div id="inventoryReviewRows"><p class="pi-muted">Loading suggestions…</p></div></div>',"Close",closeModal);
 let query=cloudClient.from("inventory_photo_suggestions")
  .select("id,source_photo_id,item_name,category,quantity_estimate,unit,room_name,storage_spot,condition_notes,decision,replacement_criteria,suggested_next_step,review_status,evidence_note,app_item_id")
  .eq("review_status","pending");
 if(reviewRoom)query=query.eq("room_name",reviewRoom);
 const {data,error}=await query.order("created_at",{ascending:false}).limit(150);
 const target=document.getElementById("inventoryReviewRows");if(!target)return;
 if(error){target.textContent="Could not load suggestions: "+error.message;return}
 const pending=(data||[]).filter(x=>digits(x.id));
 const photoIds=[...new Set(pending.slice(0,6).map(x=>x.source_photo_id).filter(digits))];
 const photoById=new Map();
 if(photoIds.length){
  const {data:photos}=await cloudClient.from("photo_inbox").select("id,image_data").in("id",photoIds);
  for(const photo of photos||[])if(/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(photo.image_data||""))photoById.set(photo.id,photo.image_data);
 }
 const card=(x,focus=false)=>'<div class="pi-area-card pi-inventory-choice'+(focus?' pi-inventory-choice-focus':'')+'">'+
  (photoById.has(x.source_photo_id)?'<img class="pi-inventory-photo" src="'+esc(photoById.get(x.source_photo_id))+'" alt="Photo of '+esc(x.item_name||"inventory item")+'">':"")+
  '<b>'+esc(x.item_name||"Unnamed suggestion")+'</b>'+
  '<small>'+esc(x.category||"Household")+(x.quantity_estimate===null||x.quantity_estimate===undefined?" · quantity not verified":" · suggested count: "+esc(x.quantity_estimate)+" "+esc(x.unit||"each"))+'</small>'+
  '<p class="pi-muted">'+esc(x.room_name||"Room not verified")+(x.storage_spot?" → "+esc(x.storage_spot):"")+'</p>'+
  (x.evidence_note?'<p class="pi-muted">Seen in photo: '+esc(x.evidence_note)+'</p>':"")+
  '<div class="pi-map-actions"><button type="button" class="btn primary small" onclick="inventoryReviewEdit(&#39;'+x.id+'&#39;)">'+(focus?"Review this item":"Review / add")+'</button>'+
  '<button type="button" class="btn small" onclick="inventoryIgnoreSuggestion(&#39;'+x.id+'&#39;)">Not mine / skip</button></div></div>';
 target.innerHTML=pending.length?
  '<div class="pi-review-counter"><b>Photo suggestions</b><span>'+pending.length+' awaiting confirmation</span><small>Each card shows the photo and where it may belong. Confirm before it enters your counted inventory.</small></div>'+
  '<div class="pi-review-grid">'+pending.map((x,i)=>card(x,i===0)).join("")+'</div>':
  '<p class="pi-muted">No pending suggestions yet. Send pictures, then ask ChatGPT to review the Photo Inbox and prepare inventory candidates.</p>';

};
window.inventoryReviewEdit=async function(id){
 if(!signed()||!digits(id))return;
 const {data:x,error}=await cloudClient.from("inventory_photo_suggestions").select("*").eq("id",id).single();
 if(error||!x){alert("Could not load suggestion.");return}
 const existing=(state.inventoryItems||[]).find(i=>i.sourceSuggestionId===id);
 const candidates=(state.inventoryItems||[]).filter(i=>clean(i.name)===clean(x.item_name));
 // A proposed photo count is evidence to review, not a verified quantity.
 const confirmedQty=existing&&Number.isInteger(Number(existing.quantity))&&Number(existing.quantity)>0?String(existing.quantity):"";
 const inferredOwner=String(x.room_name||"").toLowerCase().includes("dolly")?"Dolly":"";
 const wardrobeOwner=String(existing?.wardrobeOwner||inferredOwner);
 const wardrobeType=String(existing?.wardrobeType||"");
 const wardrobeTypes=[["long_sleeve","Long-sleeve shirts"],["short_sleeve","Short-sleeve shirts"],["hoodie_jacket","Hoodies / jackets / zip-ups"],["winter_coat","Winter coat"],["pants","Pants"],["pajamas","Pajamas"]];

  const dupe=candidates.length?'<div class="pi-help"><b>Possible existing match</b><p>Do these photos show an item you already counted?</p>'+
 candidates.slice(0,8).map(i=>'<button class="btn small" type="button" onclick="inventoryMarkAlreadyCounted(\''+id+'\',\''+String(i.id||"").replace(/[^a-z0-9_-]/gi,"")+'\')">Already counted: '+esc(i.name||"")+' (×'+Number(i.quantity||0)+')</button>').join(" ")+'</div>':"";
 modal("Check before adding",'<div class="stack pi-form">'+dupe+
 '<label>Item name<input id="irName" value="'+esc(x.item_name)+'"></label>'+
 '<div class="grid2"><label>Quantity you actually confirmed<input id="irQty" type="number" min="1" step="1" required placeholder="Count before saving" value="'+confirmedQty+'"></label>'+
 '<label>Category<input id="irCategory" value="'+esc(x.category||"Household")+'"></label></div>'+
 '<div class="grid2"><label>Clothing type<select id="irWardrobeType"><option value="">Not categorized</option>'+wardrobeTypes.map(([k,v])=>'<option value="'+k+'" '+(wardrobeType===k?"selected":"")+'>'+v+'</option>').join("")+'</select></label>'+
 '<label>Belongs to<select id="irWardrobeOwner"><option value="">Not assigned</option>'+["Leo","Demitri","Dolly","Ambrose","Michelle"].map(v=>'<option value="'+v+'" '+(wardrobeOwner===v?"selected":"")+'>'+v+'</option>').join("")+'</select></label></div>'+
 '<small class="pi-muted">Set clothing type + owner if this should count toward a child’s wardrobe targets.</small>'+
 '<div class="grid2"><label>Room<input id="irRoom" value="'+esc(x.room_name||"")+'"></label>'+
 '<label>Storage spot<input id="irStorage" value="'+esc(x.storage_spot||"")+'"></label></div>'+
 '<label>What should happen next?<select id="irDecision">'+Object.entries(DECISIONS).map(([k,v])=>'<option value="'+k+'" '+(x.decision===k?"selected":"")+'>'+esc(v)+'</option>').join("")+'</select></label>'+
 '<label>Replacement criteria (only if needed later)<textarea id="irReplace" rows="2">'+esc(x.replacement_criteria||"")+'</textarea></label>'+
 '<label>Notes / condition / next action<textarea id="irNotes" rows="2">'+esc([x.condition_notes,x.suggested_next_step].filter(Boolean).join(" · "))+'</textarea></label>'+
 '<p class="pi-muted">Confirm the item actually belongs to your household; the photo may contain packaging, advertisements or things that are not yours.</p></div>',
 "Confirm as owned",async()=>{
  const get=id=>document.getElementById(id);
  const name=get("irName").value.trim(),qtyText=get("irQty").value.trim();
  const qty=Number(qtyText);
  if(!name||qtyText===""||!Number.isSafeInteger(qty)||qty<1){
   alert("Confirm the item name and a quantity of at least 1. Leave the suggestion pending until you can count it.");return;
  }
  const snapshot={
   inventoryItems:(state.inventoryItems||[]).map(x=>({...x})),
   houseRooms:(state.houseRooms||[]).map(x=>({...x})),
   inventoryLocations:(state.inventoryLocations||[]).map(x=>({...x}))
  };
  const roomId=inventoryEnsureRoom(get("irRoom").value.trim());
  const locationId=inventoryEnsureLocation(roomId,get("irStorage").value.trim());
  const decision=get("irDecision").value;
  let row=existing||((state.inventoryItems||[]).find(i=>i.sourceSuggestionId===id));
  if(!row){
   row={id:uid()};state.inventoryItems.push(row);
  }
  Object.assign(row,{name,category:get("irCategory").value.trim()||"Household",quantity:qty,status:decision==="donate"||decision==="sell"?"Donate / sell":"Have",
   roomId,locationId,notes:get("irNotes").value.trim(),organizingDecision:decision,
   replacementCriteria:get("irReplace").value.trim(),wardrobeType:get("irWardrobeType").value,wardrobeOwner:get("irWardrobeOwner").value,sourceSuggestionId:id,updatedAt:new Date().toISOString()});
  try{await save()}catch(e){
   state.inventoryItems=snapshot.inventoryItems;
   state.houseRooms=snapshot.houseRooms;
   state.inventoryLocations=snapshot.inventoryLocations;
   alert("Couldn't save this item on your phone. The changes were not kept; the suggestion remains available.");
   return;
  }
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