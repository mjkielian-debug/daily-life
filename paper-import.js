/* Paper Sort private JSON importer. No family records are shipped in app source.
   PDF/photo bytes live in this device's IndexedDB, not public GitHub or cloud snapshots.
   The metadata is merged additively into the existing Daily Life state. */
(function(){
"use strict";
const FORMAT="daily-life-paper-batch-v1",DOC_KEY="paper-sort-pdf:",PHOTO_KEY="kid-art-photo:";
const ALLOWED=["paperItems","events","tasks","schoolGrades","foodLogs","waterLogs","homeLogs","wellnessLogs"];
function rows(key){if(!Array.isArray(state[key]))state[key]=[];return state[key]}
function clean(x){return String(x||"").toLowerCase().replace(/\s+/g," ").trim()}
function fmt(x){return String(x||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function pdfBytes(base64){const binary=atob(base64),array=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)array[i]=binary.charCodeAt(i);return array}
function sameRecord(key,old,x){
 if(old.id===x.id||(x.sourceKey&&old.sourceKey===x.sourceKey))return true;
 if(key==="events")return old.date===x.date&&clean(old.title)===clean(x.title);
 if(key==="schoolGrades")return clean(old.child)===clean(x.child)&&clean(old.course)===clean(x.course)&&old.asOf===x.asOf;
 if(key==="foodLogs"&&old.date===x.date){
   const name=clean(x.name),prev=clean(old.name);
   if(name.includes("monster"))return prev.includes("monster");
   if(name==="coffee")return prev.includes("coffee");
   if(name.includes("papa john"))return prev.includes("papa john");
 }
 return false;
}
function addData(key,items){
 if(!Array.isArray(items))return 0;
 let added=0;
 for(const item of items){
  if(!item||typeof item!=="object"||!String(item.id||"").match(/^[A-Za-z0-9_-]{3,120}$/))continue;
  if(key==="waterLogs"&&rows(key).some(x=>x.date===item.date))continue; // Do not double-count a logged bottle.
  if(key==="wellnessLogs"){
   const existing=rows(key).find(x=>x.date===item.date);
   if(existing){
    for(const field of ["note","good"]){
     const incoming=String(item[field]||""),current=String(existing[field]||"");
     if(incoming&&!current.includes(incoming))existing[field]=current?current+" · "+incoming:incoming;
    }
    continue;
   }
  }
  if(rows(key).some(x=>sameRecord(key,x,item)))continue;
  rows(key).push(Object.assign({},item));
  added++;
 }
 return added;
}
window.openPaperImport=function(){
 if(typeof modal!=="function"||typeof dbSet!=="function"||typeof save!=="function")return;
 modal("Import privately into Daily Life",
  '<div class="stack"><p>Choose your <b>DailyLife Paper Sort Import</b> JSON file. It includes school records, events, today’s logs, artwork photos and the PDF archive. The private contents are NOT published to GitHub.</p>'+
  '<label>Import file<input id="paperImportFile" type="file" accept=".json,application/json"></label>'+
  '<div id="paperImportStatus" class="ps-muted">Existing records will be kept. This is an additive import: repeat imports do not add duplicate paper records, events, food or photos.</div>'+
  '<p class="ps-muted">Photos and PDFs are stored on this device only, even if metadata syncs. Back up important originals and use the PDFs elsewhere before recycling.</p></div>',
 "Import",async()=>{
  const input=document.getElementById("paperImportFile"),status=document.getElementById("paperImportStatus"),file=input?.files?.[0];
  if(!file){alert("Select the downloaded Paper Sort JSON file first.");return}
  if(file.size>60*1024*1024){alert("Import is too large (60 MB limit).");return}
  let data;
  try{status.textContent="Reading the private import file…";data=JSON.parse(await file.text())}catch(e){alert("Could not read this JSON file.");return}
  if(data?.format!==FORMAT||!/^[A-Za-z0-9_-]{3,120}$/.test(String(data.batchId||""))||!data.records||typeof data.records!=="object"||!Array.isArray(data.documents)||!Array.isArray(data.artworks)){
   alert("This isn't a recognized Daily Life paper-sort import.");return
  }
  if(data.documents.length>20||data.artworks.length>200||ALLOWED.some(k=>data.records[k]&&!Array.isArray(data.records[k])||Array.isArray(data.records[k])&&data.records[k].length>300)){
   alert("Import file contains too many records.");return
  }
  // Validate before changing records. Save actual PDF/photo bytes in IndexedDB.
  let storedDocs=0,storedArt=0;
  try{
   for(const doc of data.documents){
    if(!/^[a-zA-Z0-9_-]{3,100}$/.test(String(doc?.id||""))||doc.mimeType!=="application/pdf"||!String(doc.data||"").match(/^[A-Za-z0-9+/=\r\n]+$/))throw Error("Invalid PDF");
    const key=DOC_KEY+doc.id,existing=await dbGet(key);
    if(!(existing instanceof Blob)||existing.size<200){
     status.textContent="Saving PDF "+(storedDocs+1)+" of "+data.documents.length+" on this device…";
     const blob=new Blob([pdfBytes(doc.data.replace(/\s/g,""))],{type:"application/pdf"});await dbSet(key,blob);
     const verify=await dbGet(key);if(!(verify instanceof Blob)||verify.size!==blob.size)throw Error("PDF verification failed");
    }
    storedDocs++;
   }
   for(const art of data.artworks){
    if(!/^[a-zA-Z0-9_-]{3,100}$/.test(String(art?.id||""))||!["Leo","Demitri","Dolly","Ambrose"].includes(art.child)||!String(art.photoData||"").startsWith("data:image/jpeg;base64,"))throw Error("Invalid artwork");
    const key=PHOTO_KEY+art.id,existing=await dbGet(key);
    if(typeof existing!=="string"||existing.length<100){
     status.textContent="Saving artwork "+(storedArt+1)+" of "+data.artworks.length+" on this device…";
     await dbSet(key,art.photoData);const verify=await dbGet(key);if(typeof verify!=="string"||verify.length<100)throw Error("Artwork verification failed");
    }
    storedArt++;
   }
  }catch(error){
   status.textContent="Could not finish saving PDFs or photos. Your existing app records were not replaced.";
   alert("Import stopped while verifying local file storage. Keep originals and try again when storage is available.");return;
  }
  const count={};
  for(const key of ALLOWED)count[key]=addData(key,data.records[key]);
  if(!Array.isArray(state.paperDigitalDocs))state.paperDigitalDocs=[];
  for(const doc of data.documents){
   if(!state.paperDigitalDocs.some(x=>x.id===doc.id)){
    state.paperDigitalDocs.push({id:doc.id,title:String(doc.title||doc.filename||"PDF").slice(0,180),filename:String(doc.filename||"paper.pdf").slice(0,180),mimeType:"application/pdf",batchId:data.batchId,addedAt:new Date().toISOString()});
   }
  }
  const book=rows("kidArtworks");
  for(const art of data.artworks){
   if(!book.some(x=>x.id===art.id||x.child===art.child&&clean(x.title)===clean(art.title))){
    book.push({id:art.id,child:art.child,title:String(art.title||"Artwork").slice(0,160),artDate:String(art.artDate||"").slice(0,10),age:String(art.age||"").slice(0,20),notes:String(art.notes||"").slice(0,2000),hasLocalPhoto:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
   }
  }
  state.settings=state.settings||{};
  const done=state.settings.importedPaperBatches||(state.settings.importedPaperBatches=[]);
  if(!done.some(x=>x.id===data.batchId))done.push({id:data.batchId,date:String(data.date||""),importedAt:new Date().toISOString()});
  try{await save()}catch(error){alert("Photos/PDFs saved, but app record saving failed. Keep the import file and try again.");return}
  render();
  if(typeof window.openPaperStudio==="function")window.openPaperStudio();
  alert("Paper Sort imported: "+Object.values(count).reduce((a,b)=>a+b,0)+" new entries; "+storedDocs+" PDF archives and "+storedArt+" artwork photos verified on this device. Your existing data was preserved.");
 });
};
window.openPaperDigitalArchive=function(){
 const list=Array.isArray(state.paperDigitalDocs)?state.paperDigitalDocs:[];
 modal("Your saved paper PDFs",
  '<div class="stack"><p class="ps-muted">Original photographed pages saved privately on this device. Use Save PDF to keep an additional backup before recycling physical papers.</p>'+
  (list.length?list.map(x=>'<div class="ps-paper-row"><span><b>'+fmt(x.title)+'</b><small>'+fmt(x.filename)+'</small></span><button onclick="paperDownloadDigitalDoc(\''+fmt(x.id)+'\')">↓ Save PDF</button></div>').join(""):'<p>No PDF files imported yet. Use Import Paper Sort in the Papers section.</p>')+'</div>',
  "Close",closeModal);
};
window.paperDownloadDigitalDoc=async function(id){
 const row=(state.paperDigitalDocs||[]).find(x=>x.id===id);if(!row)return;
 try{
  const blob=await dbGet(DOC_KEY+id);
  if(!(blob instanceof Blob)||!blob.size){alert("PDF missing from this phone. Reimport its private backup before discarding anything.");return}
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=row.filename||"paper.pdf";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }catch(e){alert("This PDF could not be opened. Keep the original until you have an independent backup.");}
};
})();