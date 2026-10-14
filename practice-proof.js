/* Verified optional worksheets — pictures stay in IndexedDB; metadata in state.
   One approval = one physical sheet = one fixed point award. */
(function(){
"use strict";
const PREFIX="practice-proof:";
const CHILDREN=["Leo","Demitri","Dolly","Ambrose"];
function papers(){return state.paperItems||(state.paperItems=[])}
function sessions(){return state.optionalPracticeSessions||(state.optionalPracticeSessions=[])}
function proofs(){return state.optionalPracticeProofs||(state.optionalPracticeProofs=[])}
function key(id,side){return PREFIX+String(id)+":"+side}
function find(id){return papers().find(p=>String(p.id)===String(id))}
function valid(p){return !!p&&p.type==="practice"&&CHILDREN.includes(p.child)}
function max(p){return Math.max(1,Math.floor(Number(p.pages)||1))}
function previous(p){return Math.max(0,Math.min(max(p),Number(p.completedPages)||0))}
function sheet(p,index){return proofs().find(v=>v.paperId===p.id&&v.sheet===index)}
function verified(p){return proofs().filter(v=>v.paperId===p.id&&v.status==="approved").length}
function counts(p){
 const credited=Math.max(previous(p),Math.min(max(p),previous(p)+verified(p)));
 const waiting=proofs().filter(v=>v.paperId===p.id&&v.status==="submitted").length;
 return {total:max(p),approved:credited,waiting,notDone:Math.max(0,max(p)-credited-waiting)};
}
function summary(){
 const arr=papers().filter(valid);
 return arr.reduce((s,p)=>{const c=counts(p);return {total:s.total+c.total,approved:s.approved+c.approved,waiting:s.waiting+c.waiting,notDone:s.notDone+c.notDone}},{total:0,approved:0,waiting:0,notDone:0});
}
window.practiceProofSummary=summary;
window.practiceProofCounts=id=>{const p=find(id);return valid(p)?counts(p):null};
function create(p,index){
 let r=sheet(p,index);
 if(!r){r={id:uid(),paperId:p.id,child:p.child,sheet:index,status:"not_submitted",createdAt:new Date().toISOString()};proofs().push(r)}
 return r;
}
function isImage(data){return typeof data==="string"&&/^data:image\/(?:jpeg|png|webp);base64,/.test(data)}
async function savedPhoto(r,side){try{const data=await dbGet(key(r.id,side));return isImage(data)?data:null}catch(e){return null}}
function photoStage(r,side,label){
 return '<div class="pr-photo"><b>'+label+'</b><div class="pr-image"><img id="prImg'+side+'" alt="'+label+'" hidden><small id="prMsg'+side+'">Checking saved image…</small></div></div>';
}
async function fillPhotos(r){
 for(const [side] of [["before","Original"],["after","Completed"],["beforeBack","Original back"],["afterBack","Completed back"]]){
  const img=document.getElementById("prImg"+side),label=document.getElementById("prMsg"+side);
  if(!img||!label)continue;
  const data=await savedPhoto(r,side);
  if(!document.getElementById("prImg"+side))return;
  if(data){img.src=data;img.hidden=false;label.hidden=true}
  else{img.hidden=true;label.hidden=false;label.textContent=r[side+"Stored"]?"Photo missing on this device: restore a backup":"No photo yet"}
 }
}
function idArg(id){return String(id).replace(/[^A-Za-z0-9_-]/g,"")}
window.openPracticeProof=function(id,sheetIndex){
 const p=find(id);if(!valid(p))return;
 const c=counts(p),chosen=Number(sheetIndex);
 let index=Number.isInteger(chosen)&&chosen>=0?Math.min(max(p)-1,chosen):0;
 if(sheetIndex===undefined){
  const pending=proofs().find(x=>x.paperId===p.id&&x.status==="submitted");
  index=pending?pending.sheet:Math.min(max(p)-1,c.approved);
 }
 const legacy=index<previous(p);
 const r=legacy?null:create(p,index),approved=legacy||r?.status==="approved";
 const slots=[["before","Original photo"],["after","Completed photo"]];
 if(p.doubleSided)slots.push(["beforeBack","Original back"],["afterBack","Completed back"]);
 const choose=!approved?slots.map(([side,name])=>'<label>'+name+'<input id="prInput'+side+'" type="file" accept="image/*"></label>').join(""):"";
 const submit=!approved?'<div class="pr-actions"><button onclick="practiceSavePhotos(\''+idArg(p.id)+'\','+index+')">Save selected photos</button>'+
   '<button onclick="practiceSubmit(\''+idArg(p.id)+'\','+index+')">Submit for parent review</button></div>':"";
 const review=r?.status==="submitted"?'<div class="pr-review"><b>Parent review · no points yet</b><p>Check the completed photo and decide whether the work counts. The app does not grade answers.</p>'+
 '<div class="pr-actions"><button onclick="practiceApprove(\''+idArg(p.id)+'\','+index+')">✓ Approve + award 1 sheet</button>'+
 '<button onclick="practiceRedo(\''+idArg(p.id)+'\','+index+')">Request redo</button></div></div>':"";
 const stateLabel=legacy?"Previously credited (no photograph required)":r?.status==="approved"?"Approved ✓":r?.status==="submitted"?"Waiting for parent review":r?.status==="needs_redo"?"Needs another completed photo":"Not submitted";
 modal(p.child+" · optional practice",'<div class="pr-studio"><b>'+esc(p.title)+'</b>'+
 '<div class="pr-stats"><span>✓ '+c.approved+' approved</span><span>◷ '+c.waiting+' to review</span><span>○ '+c.notDone+' left</span></div>'+
 '<div class="pr-pages">'+Array.from({length:max(p)},(_,i)=>'<button '+(i===index?'class="active"':'')+' onclick="openPracticeProof(\''+idArg(p.id)+'\','+i+')">Sheet '+(i+1)+'</button>').join("")+'</div>'+
 '<p class="pr-note">Sheet '+(index+1)+' · '+stateLabel+'.</p>'+
 (r?'<div class="pr-photos">'+slots.map(([side,name])=>photoStage(r,side,name)).join("")+'</div>':"")+
 (approved?'<p class="pr-note">This sheet is already credited. No duplicate points will be issued.</p>':
 '<div class="pr-uploads">'+choose+'</div>'+submit)+review+
 '<div class="pr-actions"><button onclick="practiceExportProofs()">↓ Export picture backup</button><button onclick="practiceImportProofs()">↑ Restore backup</button><button onclick="openPaperStudio()">‹ Paper sorting</button></div>'+
 '<p class="pr-note">Images are local-only. Do not throw away original worksheets until you have exported AND verified a separate backup. ChatGPT photos do not automatically save here.</p></div>',
 "Close",closeModal);
 if(r)Promise.resolve().then(()=>fillPhotos(r));
};
window.practiceSavePhotos=async function(id,index){
 const p=find(id);if(!valid(p)||index<previous(p)||index>=max(p))return;
 const r=create(p,index);if(r.status==="approved")return;
 let staged=[];
 for(const side of ["before","after",...(p.doubleSided?["beforeBack","afterBack"]:[])]){
  const file=document.getElementById("prInput"+side)?.files?.[0];if(!file)continue;
  if(!file.type.startsWith("image/")||file.size>30*1024*1024){alert("Use images smaller than 30 MB.");return}
  let data;try{data=await compressImage(file,1800,.84)}catch(e){alert("Couldn't prepare this image. Try again.");return}
  if(!isImage(data)){alert("Image format not supported.");return}
  staged.push({side,data});
 }
 if(!staged.length){alert("Choose an image to save first.");return}
 try{for(const {side,data} of staged){await dbSet(key(r.id,side),data);if(!await savedPhoto(r,side))throw Error("Photo did not persist");r[side+"Stored"]=true}}
 catch(e){alert("Photo could not be saved. Keep the original and try again.");return}
 if(r.status==="needs_redo"||r.status==="submitted")r.status="not_submitted";
 r.updatedAt=new Date().toISOString();
 await save();window.openPracticeProof(id,index);
};
window.practiceSubmit=async function(id,index){
 const p=find(id);if(!valid(p)||index<previous(p)||index>=max(p))return;
 const r=create(p,index);if(r.status==="approved")return;
 const after=await savedPhoto(r,"after");
 const back=p.doubleSided?await savedPhoto(r,"afterBack"):true;
 if(!after||!back){alert("Photograph and SAVE the completed "+(p.doubleSided?"front and back":"sheet")+" before submitting.");return}
 r.status="submitted";r.submittedAt=new Date().toISOString();
 await save();window.openPracticeProof(id,index);
};
window.practiceApprove=async function(id,index){
 const p=find(id),r=p&&sheet(p,index);
 if(!valid(p)||!r||r.status!=="submitted")return;
 if(!await savedPhoto(r,"after")||(p.doubleSided&&!await savedPhoto(r,"afterBack"))){alert("The saved completed photo is missing. Restore it before approving.");return}
 if(!confirm("Approve "+p.child+"'s completed sheet and award points?"))return;
 const points=Math.max(1,Number(state.settings?.optionalPracticeRewards?.pointsPerPage)||1);
 r.status="approved";r.reviewedAt=new Date().toISOString();r.pointsAwarded=points;
 sessions().push({id:uid(),date:ymd(),child:p.child,paperId:p.id,pages:1,points,proofId:r.id,createdAt:new Date().toISOString()});
 // Legacy completedPages are preserved, but do not add approved sheets here.
 r.updatedAt=new Date().toISOString();
 await save();render();window.openPracticeProof(id,index);
};
window.practiceRedo=async function(id,index){
 const p=find(id),r=p&&sheet(p,index);
 if(!valid(p)||!r||r.status!=="submitted")return;
 r.status="needs_redo";r.reviewedAt=new Date().toISOString();
 await save();window.openPracticeProof(id,index);
};
function download(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
window.practiceExportProofs=async function(){
 const rows=[];
 for(const r of proofs()){
  const photos={};for(const side of ["before","after","beforeBack","afterBack"]){const data=await savedPhoto(r,side);if(data)photos[side]=data}
  if(Object.keys(photos).length)rows.push({proof:r,photos});
 }
 if(!rows.length){alert("There are no saved practice images to export yet.");return}
 download(new Blob([JSON.stringify({format:"daily-life-practice-proof-v1",exportedAt:new Date().toISOString(),rows})],{type:"application/json"}),
   "DailyLife-Practice-Photos-"+ymd()+".json");
 alert("Backup download requested for "+rows.length+" practice records. Check the actual downloaded file before discarding originals.");
};
window.practiceImportProofs=function(){
 modal("Restore optional-practice photo backup",'<div class="stack"><label>Choose downloaded Daily Life practice-photo backup<input type="file" id="prBackup" accept="application/json,.json"></label><p class="pr-note">Restoring photos does NOT approve work or award any points.</p></div>',
 "Restore",async()=>{
  const file=document.getElementById("prBackup")?.files?.[0];if(!file||file.size>150*1024*1024){alert("Choose a backup smaller than 150 MB.");return}
  let data;try{data=JSON.parse(await file.text())}catch(e){alert("Backup JSON cannot be read.");return}
  if(data?.format!=="daily-life-practice-proof-v1"||!Array.isArray(data.rows)||data.rows.length>1000){alert("Not a compatible backup.");return}
  let restored=0;
  for(const entry of data.rows){
   const r=entry?.proof||{},p=find(r.paperId);
   if(!/^[\w-]{1,120}$/.test(String(r.id||""))||!valid(p)||!Number.isInteger(r.sheet)||r.sheet<0||r.sheet>=max(p))continue;
   const existing=sheet(p,r.sheet);let target=existing||{id:r.id,paperId:p.id,child:p.child,sheet:r.sheet,status:"not_submitted"};
   if(!existing)proofs().push(target);
   for(const side of ["before","after","beforeBack","afterBack"]){
    const v=entry.photos?.[side];if(!isImage(v)||v.length>12*1024*1024)continue;
    if(!await savedPhoto(target,side))await dbSet(key(target.id,side),v);
    target[side+"Stored"]=true;restored++;
   }
  }
  await save();window.openPaperStudio();alert("Restored "+restored+" practice picture(s). Check them in the paper tracker. No points were changed.");
 });
};
})();