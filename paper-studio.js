/* Paper sorting and kids' art books. All state migrations are additive.
   Art image bytes: IndexedDB KV per image, NOT a cloud image backup. */
(function(){
"use strict";
const KIDS=["Leo","Demitri","Dolly","Ambrose"];
const TYPE={review:["🗂","Decide"],recycle:["♻","Recycle after verification"],file:["🗄","File original"],action:["📌","Needs action"],practice:["✏","Optional practice"]};
const IMG_PREFIX="kid-art-photo:";
function papers(){return state.paperItems||(state.paperItems=[])}
function arts(){return state.kidArtworks||(state.kidArtworks=[])}
function rewards(){return state.paperRewardsRedeemed||(state.paperRewardsRedeemed=[])}
function practiceSessions(){return state.optionalPracticeSessions||(state.optionalPracticeSessions=[])}
function settings(){
 if(!state.settings)state.settings={};
 const x=state.settings.optionalPracticeRewards||(state.settings.optionalPracticeRewards={pointsPerPage:1,cost:10,prize:"Choose a small reward together"});
 if(!(Number(x.pointsPerPage)>0))x.pointsPerPage=1;
 if(!(Number(x.cost)>0))x.cost=10;
 return x;
}
function qid(x){return String(x||"").replace(/[^a-zA-Z0-9_-]/g,"")}
function pct(n,d){return d>0?Math.min(100,Math.max(0,Math.round(n/d*100))):0}
function bar(n,d){return '<div class="ps-bar" role="progressbar" aria-valuemin="0" aria-valuemax="'+Math.max(0,d)+'" aria-valuenow="'+Math.max(0,Math.min(n,d))+'"><span style="width:'+pct(n,d)+'%"></span></div>'}
function paperType(x){return TYPE[x] ? x:"review"}
function pageCount(x){return Math.max(1,Math.floor(Number(x)||1))}
function donePages(x){const proof=typeof window.practiceProofCounts==="function"?window.practiceProofCounts(x.id):null;
 return proof?proof.approved:Math.min(pageCount(x.pages),Math.max(0,Math.floor(Number(x.completedPages)||0)))}
function earned(child){return practiceSessions().filter(x=>x.child===child).reduce((n,x)=>n+Math.max(0,Number(x.points)||0),0)}
function spent(child){return rewards().filter(x=>x.child===child).reduce((n,x)=>n+Math.max(0,Number(x.points)||0),0)}
function remaining(child){return Math.max(0,earned(child)-spent(child))}
function paperCounts(){
 const data=papers(),decided=data.filter(x=>x.type!=="review").length,finished=data.filter(x=>x.physicallyFinished).length,practice=data.filter(x=>x.type==="practice");
 return{total:data.length,decided,finished,pending:data.length-finished,practicePages:practice.reduce((n,x)=>n+pageCount(x.pages),0),practiceDone:practice.reduce((n,x)=>n+donePages(x),0),practiceReview:practice.reduce((n,x)=>n+(typeof window.practiceProofCounts==="function"?(window.practiceProofCounts(x.id)?.waiting||0):0),0),percent:data.length?pct(decided,data.length):null};
}
function paperRow(x){
 const id=qid(x.id),type=paperType(x.type),practice=type==="practice",dp=donePages(x),max=pageCount(x.pages);
 const review=practice&&typeof window.practiceProofCounts==="function"?(window.practiceProofCounts(x.id)?.waiting||0):0;
 const status=practice?dp+" / "+max+" sheets approved"+(review?" · "+review+" awaiting review":"")+(x.physicallyFinished?" · paper cleared":""):type==="review"?"Decision pending":x.physicallyFinished?"Physically handled":"Still needs handling";
 return '<div class="ps-paper-row"><button onclick="openPaperBatch(\''+id+'\')"><b>'+esc(x.title||"Untitled paper")+'</b><small>'+TYPE[type][0]+" "+TYPE[type][1]+(x.child?" · "+esc(x.child):"")+(x.level?" · "+esc(x.level):"")+'</small><small>'+status+'</small></button>'+
  (practice&&x.child?'<button class="ps-small-action" onclick="openPracticeProof(\''+id+'\')">📷 '+(review?"Review":"Photo proof")+'</button>':"")+'</div>';
}
function section(type){
 const list=papers().filter(x=>paperType(x.type)===type);
 return '<details class="ps-group" '+(["review","practice"].includes(type)?"open":"")+'><summary>'+TYPE[type][0]+" "+TYPE[type][1]+' <b>'+list.length+'</b></summary>'+
   (list.map(paperRow).join("")||'<p class="ps-muted">No paper in this group yet.</p>')+'</details>';
}
function rewardsHtml(){
 const s=settings();
 return '<details class="ps-rewards"><summary>⭐ Optional learning rewards</summary>'+
 '<p class="ps-muted">'+s.pointsPerPage+' point'+(s.pointsPerPage===1?"":"s")+' per page · '+s.cost+' points = '+esc(s.prize||"a small reward")+'</p>'+
 '<div class="ps-points">'+KIDS.map(c=>{
 const pts=remaining(c);return '<div class="ps-point-row"><b>'+c+'</b><small>'+pts+' available</small>'+bar(Math.min(pts,s.cost),s.cost)+
 (pts>=s.cost?'<button onclick="paperRedeem(\''+c+'\')">Redeem</button>':"")+'</div>';
 }).join("")+'</div><button onclick="openPaperRewardSettings()">Set point values + reward</button></details>';
}
window.paperStudioSummary=paperCounts;
window.openPaperStudio=function(){
 const n=paperCounts();modal("Papers · sort + declutter",
  '<div class="ps-studio"><div class="ps-top"><div class="ps-big-ring" style="--ps-pct:'+(n.percent??0)+'%"><b>'+(n.percent===null?"—":n.percent+"%")+'</b><small>sorted</small></div>'+
  '<div><b>'+n.decided+' / '+n.total+' batches categorized</b><small>'+n.finished+' physically handled · '+n.pending+' not finished</small><small>Only batches you enter count.</small></div></div>'+
  '<div class="ps-nav"><button onclick="openPaperBatch()">+ Paper</button><button onclick="openArtLibrary()">🎨 Art books</button></div>'+
  '<div class="ps-practice"><strong>✏ Extra learning (optional)</strong><span>'+n.practiceDone+' approved / '+n.practicePages+' sheets · '+n.practiceReview+' awaiting review</span>'+bar(n.practiceDone,n.practicePages)+
  '<small>Photo proof + parent approval required for new rewards. Optional practice has no deadlines.</small></div>'+
  rewardsHtml()+'<div class="ps-groups">'+Object.keys(TYPE).map(section).join("")+'</div>'+
  '<div class="ps-warning"><b>Do not recycle from a photo alone.</b> Check that the information is captured and readable. Keep originals where legally or practically required; photographs inside ChatGPT do not guarantee a permanent backup.</div></div>',
 "Close",closeModal);
};
window.paperStudioDecisionChanged=function(){
 const decision=document.getElementById("psType")?.value;
 const details=document.getElementById("psExtra");
 if(details&&decision==="practice")details.open=true;
};
window.openPaperBatch=function(id=""){
 const old=papers().find(x=>x.id===id),x=old||{title:"",type:"review",child:"",level:"",subject:"",pages:1,notes:"",reference:"",physicallyFinished:false};
 const types=Object.keys(TYPE).map(t=>'<option value="'+t+'" '+(x.type===t?"selected":"")+'>'+TYPE[t][1]+'</option>').join("");
 const kids='<option value="">Unassigned</option>'+KIDS.map(c=>'<option value="'+c+'" '+(x.child===c?"selected":"")+'>'+c+'</option>').join("");
 modal(old?"Paper batch":"Add paper batch",'<div class="ps-editor stack">'+
  '<label>Paper or stack<input id="psTitle" value="'+esc(x.title)+'" placeholder="e.g. first-grade addition worksheets"></label>'+
  '<label>Decision<select id="psType" onchange="paperStudioDecisionChanged()">'+types+'</select></label>'+
  '<label>Pages in this batch<input type="number" id="psPages" min="1" max="10000" value="'+pageCount(x.pages)+'"></label>'+
  '<label>Notes + where the paper is kept<textarea id="psNotes" rows="3">'+esc(x.notes||"")+'</textarea></label>'+
  '<details class="ps-extra" id="psExtra" '+(x.type==="practice"?"open":"")+'><summary>Optional details · child, subject, photos</summary>'+
   '<div class="ps-extra-fields">'+
    '<div class="grid2"><label>Child for extra practice<select id="psChild">'+kids+'</select></label><label>Approximate grade level<input id="psLevel" value="'+esc(x.level||"")+'" placeholder="K–1, grade 3"></label></div>'+
    '<label>Subject<input id="psSubject" value="'+esc(x.subject||"")+'" placeholder="Math / reading"></label>'+
    '<label class="ps-side-check"><input id="psDouble" type="checkbox" '+(x.doubleSided?"checked":"")+' > One physical sheet with work on both sides</label>'+
    '<label>Picture / document reference<input id="psRef" value="'+esc(x.reference||"")+'" placeholder="ChatGPT photo or secure file location"></label>'+
   '</div></details>'+
  '<small class="ps-muted">ChatGPT picture references are not actual uploaded files or verified backups. Keep important originals until safely captured.</small>'+
  (old&&x.type!=="review"?'<button onclick="paperFinishHandling(\''+qid(x.id)+'\')">'+(x.physicallyFinished?"Undo physical completion":"Confirm physically filed / recycled / handled")+'</button>':"")+
  '</div>',"Save",async()=>{
   const get=id=>document.getElementById(id),title=get("psTitle")?.value.trim(),pages=Number(get("psPages")?.value);
   if(!title||!Number.isInteger(pages)||pages<1||pages>10000){alert("Add a title and between 1 and 10,000 pages.");return}
   const type=paperType(get("psType").value);let row=old;
   if(!row){row={id:uid(),createdAt:new Date().toISOString(),completedPages:0,physicallyFinished:false};papers().push(row)}
   Object.assign(row,{title,type,child:type==="practice"?get("psChild").value:"",level:get("psLevel").value.trim(),
    subject:get("psSubject").value.trim(),pages,completedPages:Math.min(pages,Math.max(0,Number(row.completedPages)||0)),
    notes:get("psNotes").value.trim(),reference:get("psRef").value.trim(),doubleSided:!!get("psDouble")?.checked,updatedAt:new Date().toISOString()});
   if(type==="review")row.physicallyFinished=false;
   await save();render();window.openPaperStudio();
  });
};
window.paperFinishHandling=async function(id){
 const x=papers().find(v=>v.id===id);if(!x||x.type==="review")return;
 if(x.type==="practice"&&donePages(x)<pageCount(x.pages)){alert("This batch still has unfinished optional practice. Finish it, or reclassify sheets you no longer want to use.");return}
 if(!x.physicallyFinished){
  const m=x.type==="practice"?"Are these completed practice pages now physically filed or recycled? (Your practice progress and points will remain recorded.)":x.type==="recycle"?"Have you checked this is safe to discard AND physically recycled the original?":
   x.type==="file"?"Have you physically placed this original in its permanent file?":"Has the action actually been completed?";
  if(!confirm(m))return;
 }
 x.physicallyFinished=!x.physicallyFinished;x.updatedAt=new Date().toISOString();await save();render();window.openPaperStudio();
};
window.paperPageComplete=function(id){if(typeof window.openPracticeProof==="function")window.openPracticeProof(id)};
window.paperRedeem=async function(child){
 const s=settings();if(!KIDS.includes(child)||remaining(child)<s.cost)return;
 if(!confirm("Record "+s.cost+" points redeemed for "+child+"? Confirm the reward was actually given."))return;
 rewards().push({id:uid(),date:ymd(),child,points:s.cost,prize:String(s.prize),createdAt:new Date().toISOString()});
 await save();render();window.openPaperStudio();
};
window.openPaperRewardSettings=function(){
 const s=settings();
 modal("Extra-practice reward goals",'<div class="stack"><p class="ps-muted">These rewards are optional, separate from required homework and routine chores. You choose the prize.</p>'+
 '<label>Points per completed page<input id="psPerPage" type="number" min="1" max="20" value="'+s.pointsPerPage+'"></label>'+
 '<label>Points to earn a reward<input id="psCost" type="number" min="1" max="500" value="'+s.cost+'"></label>'+
 '<label>Reward idea<input id="psPrize" value="'+esc(s.prize||"")+'"></label></div>',"Save",async()=>{
  const a=Number(document.getElementById("psPerPage").value),b=Number(document.getElementById("psCost").value);
  if(!Number.isInteger(a)||a<1||a>20||!Number.isInteger(b)||b<1||b>500){alert("Enter valid whole-number goals.");return}
  s.pointsPerPage=a;s.cost=b;s.prize=document.getElementById("psPrize").value.trim()||"Choose a small reward together";
  await save();render();window.openPaperStudio();
 });
};
/* Four little photo books; image bytes are independent IndexedDB records.
   Book metadata may sync with app snapshots but images DO NOT sync to cloud. */
function byChild(c){return arts().filter(x=>x.child===c).sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||"")))}
function imageKey(id){return IMG_PREFIX+String(id)}
let currentBook=null,currentPage=0;
function bookGrid(){
 return '<div class="ps-books">'+KIDS.map((child,i)=>{
 const count=byChild(child).length;return '<button class="ps-book ps-book-'+i+'" onclick="openChildArtBook(\''+child+'\')">'+
 '<span class="ps-book-sparkle">✧</span><b>'+child+"'s<br>Art Book"+'</b><small>'+count+' piece'+(count===1?"":"s")+'</small>'+
 '<span class="ps-book-binding"></span></button>';
 }).join("")+'</div>';
}
window.openArtLibrary=function(){
 const count=arts().length;
 modal("🎨 Children's art library",'<div class="ps-studio"><p class="ps-muted">Little memory books with real artwork photos. Pick a child to flip through their pages.</p>'+bookGrid()+
 '<div class="ps-nav"><button onclick="openArtEntry()">+ Photograph artwork</button><button onclick="paperExportArtBackup()">↓ Export photo backup</button><button onclick="paperImportArtBackup()">↑ Restore backup</button></div>'+
 '<div class="ps-warning"><b>Image storage:</b> '+count+' artwork record'+(count===1?"":"s")+'. Actual photos live in this phone’s Daily Life storage, not in cloud sync. Before recycling drawings, export a backup and verify it was saved somewhere safe. Removing app storage or changing phones may lose local-only pictures.</div>'+
 '</div>',"Close",closeModal);
};
window.openChildArtBook=function(child,index=0){
 if(!KIDS.includes(child))return;
 const rows=byChild(child);
 if(!rows.length){
  modal(child+"'s Art Book",'<div class="ps-empty-book">📖<b>Every picture starts a story.</b><p>No artwork photographed yet for '+esc(child)+'.</p><button onclick="openArtEntry(\''+child+'\')">+ First artwork</button><button onclick="openArtLibrary()">‹ All books</button></div>',"Close",closeModal);return;
 }
 currentBook=child;currentPage=Math.max(0,Math.min(rows.length-1,Number(index)||0));
 const x=rows[currentPage],id=qid(x.id);
 modal(child+"'s Art Book",'<div class="ps-album"><div class="ps-album-heading"><span>✧ '+esc(child)+"’s gallery"+'</span><small>Page '+(currentPage+1)+' of '+rows.length+'</small></div>'+
  '<div class="ps-artpage"><div class="ps-art-photo"><img id="psCurrentArtwork" alt="Artwork by '+esc(child)+'" hidden><span id="psArtLoading">Loading saved artwork…</span></div>'+
  '<div class="ps-art-caption"><b>'+esc(x.title||"Untitled masterpiece")+'</b><small>'+esc(x.artDate||"Date not entered")+(x.age?" · age "+esc(x.age):"")+'</small><p>'+esc(x.notes||"")+'</p></div></div>'+
  '<div class="ps-page-controls"><button '+(!currentPage?"disabled":"")+' onclick="openChildArtBook(\''+child+'\','+(currentPage-1)+')">‹ Previous</button>'+
  '<button onclick="openArtEntry(\''+child+'\',\''+id+'\')">Edit</button>'+
  '<button '+(currentPage>=rows.length-1?"disabled":"")+' onclick="openChildArtBook(\''+child+'\','+(currentPage+1)+')">Next ›</button></div>'+
  '<div class="ps-nav"><button onclick="openArtEntry(\''+child+'\')">+ Another picture</button><button onclick="openArtLibrary()">All books</button></div>'+
  '<p class="ps-muted">Images are currently stored on this device only. Backup before parting with irreplaceable originals.</p></div>',"Close",closeModal);
 Promise.resolve().then(async()=>{
  let img=null;
  try{img=await dbGet(imageKey(id))}catch(e){}
  if(currentBook!==child||byChild(child)[currentPage]?.id!==id)return;
  const el=document.getElementById("psCurrentArtwork"),load=document.getElementById("psArtLoading");
  if(!el||!load)return;
  if(typeof img==="string"&&img.startsWith("data:image/")){el.src=img;el.hidden=false;load.hidden=true}
  else load.textContent="Image unavailable on this device. Restore a backup before discarding the original.";
 });
};
window.openArtEntry=function(child="",id=""){
 const found=arts().find(x=>x.id===id),x=found||{},kid=KIDS.includes(child)?child:x.child||"";
 const choices=KIDS.map(c=>'<option '+(c===kid?"selected":"")+' value="'+c+'">'+c+'</option>').join("");
 modal(found?"Edit artwork":"Add a masterpiece",'<div class="stack ps-art-editor">'+
 '<label>Child<select id="psArtChild">'+choices+'</select></label>'+
 '<label>Artwork name<input id="psArtTitle" value="'+esc(x.title||"")+'" placeholder="Rainbow dragon, October pumpkin…"></label>'+
 '<div class="grid2"><label>Artwork date (optional)<input id="psArtDate" type="date" value="'+esc(x.artDate||"")+'"></label>'+
 '<label>Age at the time (optional)<input id="psArtAge" value="'+esc(x.age||"")+'" placeholder="e.g. 6"></label></div>'+
 '<label>Take photo or choose from gallery<input id="psArtFile" type="file" accept="image/*"></label>'+
 '<label>Story or memory<textarea id="psArtNotes" rows="3">'+esc(x.notes||"")+'</textarea></label>'+
 '<p class="ps-muted">Save will store the actual compressed picture in this phone’s Daily Life IndexedDB. A ChatGPT photo is not imported automatically. Keep the original until you have separately backed up and verified the image.</p>'+
 (found?'<div class="ps-nav"><button onclick="paperExportSingleArt(\''+qid(id)+'\')">↓ Save image copy</button></div>':"")+
 '</div>',"Save",async()=>{
  const e=id=>document.getElementById(id),who=e("psArtChild").value,photo=e("psArtFile")?.files?.[0],title=e("psArtTitle").value.trim();
  if(!KIDS.includes(who)){alert("Choose a child.");return}
  if(!found&&!photo){alert("Choose or photograph the artwork first.");return}
  if(photo&&(!photo.type.startsWith("image/")||photo.size>30*1024*1024)){alert("Select an image smaller than 30 MB.");return}
  const aid=found?.id||uid();
  if(photo){
   let img;
   try{img=await compressImage(photo,1800,.86)}catch(error){alert("That photo could not be prepared.");return}
   try{await dbSet(imageKey(aid),img);
      const saved=await dbGet(imageKey(aid));if(!saved||saved.length<100)throw Error("image did not persist");
   }catch(error){alert("The artwork photo could not be saved. Please keep the paper and try again.");return}
  }
  const meta={id:aid,child:who,title:title||"Untitled masterpiece",artDate:e("psArtDate").value,
   age:e("psArtAge").value.trim(),notes:e("psArtNotes").value.trim(),hasLocalPhoto:true,
   createdAt:found?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(found)Object.assign(found,meta);else arts().push(meta);
  try{await save()}catch(error){alert("The picture was saved locally, but the gallery record could not be saved. Try again without clearing app data.");return}
  render();window.openChildArtBook(who,byChild(who).findIndex(v=>v.id===aid));
 });
};
function downloadBlob(blob,name){
 const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=name;document.body.appendChild(link);link.click();
 link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
window.paperExportSingleArt=async function(id){
 const x=arts().find(v=>v.id===id);if(!x)return;
 const data=await dbGet(imageKey(id));
 if(!data){alert("This image is unavailable on this device.");return}
 const a=document.createElement("a");a.href=data;a.download="DailyLife-"+x.child+"-art-"+id+".jpg";document.body.appendChild(a);a.click();a.remove();
};
window.paperImportArtBackup=function(){
 modal("Restore art photo backup",
  '<div class="stack"><p class="ps-muted">Choose a Daily Life artwork JSON backup you downloaded earlier. This adds any missing images and restores book entries by their original IDs without deleting existing photos.</p><label>Artwork backup<input id="psImportArt" type="file" accept="application/json,.json"></label></div>',
 "Import",async()=>{
  const file=document.getElementById("psImportArt")?.files?.[0];
  if(!file||file.size>150*1024*1024){alert("Choose an artwork backup under 150 MB.");return}
  let backup;try{backup=JSON.parse(await file.text())}catch(e){alert("The file is not readable JSON.");return}
  if(backup?.format!=="daily-life-art-v1"||!Array.isArray(backup.artworks)){alert("This is not a recognized Daily Life artwork backup.");return}
  if(backup.artworks.length>1500){alert("This backup has too many entries. Contact support before importing.");return}
  let restored=0;
  for(const entry of backup.artworks){
   const x=entry?.metadata||{},photo=entry?.photo,id=String(x.id||"");
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||!KIDS.includes(x.child)||typeof photo!=="string"||!/^data:image\/(?:jpeg|png|webp);base64,/.test(photo)||photo.length>12*1024*1024)continue;
   if(!await dbGet(imageKey(id)))await dbSet(imageKey(id),photo);
   if(!arts().some(a=>a.id===id))arts().push({id,child:x.child,title:String(x.title||"Untitled masterpiece").slice(0,160),
    artDate:String(x.artDate||"").slice(0,10),age:String(x.age||"").slice(0,20),notes:String(x.notes||"").slice(0,2000),
    hasLocalPhoto:true,createdAt:x.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
   restored++;
  }
  await save();render();window.openArtLibrary();alert("Checked "+restored+" artwork images from the backup. Open a book to confirm pictures display correctly.");
 });
};
window.paperExportArtBackup=async function(){
 const rows=[];for(const x of arts()){const photo=await dbGet(imageKey(x.id));if(photo)rows.push({metadata:x,photo})}
 if(!rows.length){alert("No locally stored artwork photos are available to export.");return}
 downloadBlob(new Blob([JSON.stringify({format:"daily-life-art-v1",exportedAt:new Date().toISOString(),artworks:rows})],{type:"application/json"}),
 "DailyLife-Children-Art-"+ymd()+".json");
 alert("Backup download requested for "+rows.length+" artwork photo(s). Verify the downloaded file is stored somewhere safe before recycling irreplaceable originals.");
};
})();
