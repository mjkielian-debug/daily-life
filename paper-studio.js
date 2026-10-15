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
  '<div class="ps-nav"><button onclick="openPaperBatch()">+ Paper</button><button onclick="openArtLibrary()">📚 Kids’ books</button><button onclick="openPaperImport()">↑ Import paper sort</button><button onclick="openPaperDigitalArchive()">📁 Digital papers</button></div>'+
  '<div class="ps-practice"><strong>✏ Extra learning (optional)</strong><span>'+n.practiceDone+' approved / '+n.practicePages+' sheets · '+n.practiceReview+' awaiting review</span>'+bar(n.practiceDone,n.practicePages)+
  '<small>Photo proof + parent approval required for new rewards. Optional practice has no deadlines.</small></div>'+
  rewardsHtml()+'<div class="ps-groups">'+Object.keys(TYPE).map(section).join("")+'</div>'+
  '<div class="ps-warning"><b>Do not recycle from a photo alone.</b> Check that the information is captured and readable. Keep originals where legally or practically required; photographs inside ChatGPT do not guarantee a permanent backup.</div></div>',
 "Close",closeModal);
};
window.paperStudioDecisionChanged=function(){
 const decision=document.getElementById("psType")?.value;
 const details=document.getElementById("psExtra");
 const pageRow=document.getElementById("psPageRow");
 const practiceRows=document.getElementById("psPracticeFields");
 if(pageRow)pageRow.hidden=decision!=="practice";
 if(practiceRows)practiceRows.hidden=decision!=="practice";
 if(details&&decision==="practice")details.open=true;
};
window.openPaperBatch=function(id=""){
 const old=papers().find(x=>x.id===id),x=old||{title:"",type:"review",child:"",level:"",subject:"",pages:1,notes:"",reference:"",physicallyFinished:false};
 const types=Object.keys(TYPE).map(t=>'<option value="'+t+'" '+(x.type===t?"selected":"")+'>'+TYPE[t][1]+'</option>').join("");
 const kids='<option value="">Unassigned</option>'+KIDS.map(c=>'<option value="'+c+'" '+(x.child===c?"selected":"")+'>'+c+'</option>').join("");
 modal(old?"Paper batch":"Add paper batch",'<div class="ps-editor stack">'+
  '<label>Paper or stack<input id="psTitle" value="'+esc(x.title)+'" placeholder="e.g. first-grade addition worksheets"></label>'+
  '<label>Decision<select id="psType" onchange="paperStudioDecisionChanged()">'+types+'</select></label>'+
  '<label id="psPageRow" '+(x.type!=="practice"?"hidden":"")+' >Practice pages<input type="number" id="psPages" min="1" max="10000" value="'+pageCount(x.pages)+'"></label>'+
  '<label>Notes + where the paper is kept<textarea id="psNotes" rows="3">'+esc(x.notes||"")+'</textarea></label>'+
  '<details class="ps-extra" id="psExtra" '+(x.type==="practice"?"open":"")+'><summary>Optional details · child, subject, photos</summary>'+
   '<div class="ps-extra-fields">'+
    '<div id="psPracticeFields" '+(x.type!=="practice"?"hidden":"")+'><div class="grid2"><label>Child for extra practice<select id="psChild">'+kids+'</select></label><label>Approximate grade level<input id="psLevel" value="'+esc(x.level||"")+'" placeholder="K–1, grade 3"></label></div>'+
    '<label>Subject<input id="psSubject" value="'+esc(x.subject||"")+'" placeholder="Math / reading"></label></div>'+
    '<label class="ps-side-check"><input id="psDouble" type="checkbox" '+(x.doubleSided?"checked":"")+' > One physical sheet with work on both sides</label>'+
    '<label>Picture / document reference<input id="psRef" value="'+esc(x.reference||"")+'" placeholder="ChatGPT photo or secure file location"></label>'+
   '</div></details>'+
  '<small class="ps-muted">ChatGPT picture references are not actual uploaded files or verified backups. Keep important originals until safely captured.</small>'+
  (old&&x.type!=="review"?'<button onclick="paperFinishHandling(\''+qid(x.id)+'\')">'+(x.physicallyFinished?"Undo physical completion":"Confirm physically filed / recycled / handled")+'</button>':"")+
  '</div>',"Save",async()=>{
   const get=id=>document.getElementById(id),title=get("psTitle")?.value.trim(),pages=Number(get("psPages")?.value);
   const type=paperType(get("psType").value);
   if(!title||(type==="practice"&&(!Number.isInteger(pages)||pages<1||pages>10000))){alert("Add a title"+(type==="practice"?" and between 1 and 10,000 practice pages.":".") );return}let row=old;
   if(!row){row={id:uid(),createdAt:new Date().toISOString(),completedPages:0,physicallyFinished:false};papers().push(row)}
   Object.assign(row,{title,type,child:type==="practice"?get("psChild").value:"",level:get("psLevel").value.trim(),
    subject:get("psSubject").value.trim(),pages:type==="practice"?pages:pageCount(row.pages),completedPages:Math.min(type==="practice"?pages:pageCount(row.pages),Math.max(0,Number(row.completedPages)||0)),
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
/* Each child's memories are separated into three little books.
   Photos live only in IndexedDB; private records are not embedded in public app source. */
const BOOK_KIND={art:{name:"Art Book",icon:"🎨"},achievement:{name:"Achievement Book",icon:"🏅"},school:{name:"School Book",icon:"📚"}};
const SCHOOL_PHOTO="kid-school-photo:";
function schoolPortfolio(){return state.kidSchoolPortfolio||(state.kidSchoolPortfolio=[])}
function kindOf(x){if(x?.kind==="achievement")return"achievement";if(x?.kind==="art")return"art";return /\b(certificate|achievement|award|recognition|medal)\b/i.test(String(x?.title||""))?"achievement":"art"}
/* Move confirmed caterpillar artwork in older on-device data without deleting its photo. */
function fixConfirmedArtworkOwnership(){
 let updated=0;
 for(const x of arts()){
  if(x?.child!=="Dolly"||kindOf(x)!=="art")continue;
  if(x.id==="art-70"||/^caterpillar(?:\s+portrait)?(?:\s+craft)?$/i.test(String(x.title||"").trim())){
   x.child="Ambrose";x.confirmationVersion=Math.max(3,Number(x.confirmationVersion)||0);
   x.updatedAt=new Date().toISOString();updated++;
  }
 }
 if(updated)Promise.resolve().then(()=>save()).catch(()=>alert("The corrected owner was shown but saving failed. Reopen and retry."));
 return updated;
}
window.paperFixArtworkAttributions=fixConfirmedArtworkOwnership;
function byChild(c,k="art"){return arts().filter(x=>x.child===c&&kindOf(x)===k).sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||"")))}
function imageKey(id){return IMG_PREFIX+String(id)}
function schoolPages(child){
 const grades=(state.schoolGrades||[]).filter(x=>x.child===child).map(x=>({
  id:x.id,child,kind:"assessment",title:x.course||"Assessment",value:String(x.grade||"").trim()||(x.percent!==null&&x.percent!==undefined?String(x.percent)+"%":""),
  notes:x.notes||"",asOf:x.asOf||x.date||"",term:x.term||"",source:x.source||"",sourcePdfId:x.sourcePdfId||"",photoId:"",isGrade:true
 }));
 const rest=schoolPortfolio().filter(x=>x.child===child).map(x=>Object.assign({kind:"learning"},x));
 return grades.concat(rest).sort((a,b)=>String(b.asOf||"").localeCompare(String(a.asOf||""))||({learning:0,assessment:1,work:2,feedback:3}[a.kind]??4)-({learning:0,assessment:1,work:2,feedback:3}[b.kind]??4)||String(a.title||"").localeCompare(String(b.title||"")));
}
function bookGrid(){
 return '<div class="ps-book-shelves">'+KIDS.map((child,i)=>{
 const types=["art","achievement","school"];
 return '<section class="ps-child-shelf"><h3>'+esc(child)+'</h3><div class="ps-shelf-books">'+types.map((kind,j)=>{
  const book=BOOK_KIND[kind],num=kind==="school"?schoolPages(child).length:byChild(child,kind).length;
  const go=kind==="school"?"openChildSchoolBook('"+child+"')":"openChildArtBook('"+child+"',0,'"+kind+"')";
  return '<button class="ps-book ps-book-'+i+' ps-book-kind-'+kind+'" onclick="'+go+'"><span class="ps-book-sparkle">'+book.icon+'</span><b>'+book.name+'</b><small>'+num+' '+(num===1?"entry":"entries")+'</small><span class="ps-book-binding"></span></button>';
 }).join("")+'</div></section>';
 }).join("")+'</div>';
}
window.openArtLibrary=function(){
 fixConfirmedArtworkOwnership();
 const count=arts().length;
 modal("📚 Children's memory books",
  '<div class="ps-studio"><p class="ps-muted">Each child has an Art Book, an Achievement Book for certificates and awards, and a School Book for scores, work samples and learning progress.</p>'+
  bookGrid()+
  '<div class="ps-nav"><button onclick="openArtEntry()">+ Add art or certificate</button><button onclick="paperExportArtBackup()">↓ Back up photo books</button><button onclick="paperImportArtBackup()">↑ Import saved books</button></div>'+
  '<div class="ps-warning"><b>Keep a separate backup.</b> Photos are stored on this device, not in cloud sync. '+count+' photo record'+(count===1?"":"s")+' indexed. Import your private Paper Sort file to see pictures and school samples. Do not discard irreplaceable originals until the backup is verified.</div></div>',
  "Close",closeModal);
};
let currentBook=null,currentPage=0;
window.openChildArtBook=function(child,index=0,kind="art"){
 fixConfirmedArtworkOwnership();
 if(!KIDS.includes(child))return;
 if(kind==="school"){window.openChildSchoolBook(child,index);return}
 kind=kind==="achievement"?"achievement":"art";
 const rows=byChild(child,kind),caption=BOOK_KIND[kind].name;
 if(!rows.length){
  modal(child+"'s "+caption,'<div class="ps-empty-book">📖<b>A place for '+(kind==="achievement"?"awards and milestones":"creativity")+'.</b><p>No '+(kind==="achievement"?"certificates or awards":"artwork")+' photos saved here yet. Photos sent in ChatGPT need a one-time private import.</p><button onclick="paperImportArtBackup()">↑ Import saved books</button><button onclick="openArtEntry(\''+child+'\',\'\',\''+kind+'\')">+ Add a page</button><button onclick="openArtLibrary()">‹ All books</button></div>',"Close",closeModal);return;
 }
 currentBook=child+"|"+kind;currentPage=Math.max(0,Math.min(rows.length-1,Number(index)||0));
 const x=rows[currentPage],id=qid(x.id),next=(n)=>"openChildArtBook('"+child+"',"+n+",'"+kind+"')";
 modal(child+"'s "+caption,
 '<div class="ps-album"><div class="ps-album-heading"><span>'+BOOK_KIND[kind].icon+' '+esc(child)+"’s "+caption+'</span><small>Page '+(currentPage+1)+' of '+rows.length+'</small></div>'+
 '<div class="ps-artpage"><div class="ps-art-photo"><img id="psCurrentArtwork" alt="'+(kind==="achievement"?"Achievement certificate":"Artwork")+' by '+esc(child)+'" hidden><span id="psArtLoading">Loading saved picture…</span></div>'+
 '<div class="ps-art-caption"><b>'+esc(x.title||"Untitled")+'</b><small>'+esc(x.artDate||"Date not entered")+(x.age?" · age "+esc(x.age):"")+'</small><p>'+esc(x.notes||"")+'</p></div></div>'+
 '<div class="ps-page-controls"><button '+(!currentPage?"disabled":"")+' onclick="'+next(currentPage-1)+'">‹ Previous</button>'+
 '<button onclick="openArtEntry(\''+child+'\',\''+id+'\',\''+kind+'\')">Edit</button>'+
 '<button '+(currentPage>=rows.length-1?"disabled":"")+' onclick="'+next(currentPage+1)+'">Next ›</button></div>'+
 '<div class="ps-nav"><button onclick="openArtEntry(\''+child+'\',\'\',\''+kind+'\')">+ Another page</button><button onclick="openArtLibrary()">All books</button></div>'+
 '<p class="ps-muted">Save a separate backup before parting with a one-of-a-kind original.</p></div>',"Close",closeModal);
 Promise.resolve().then(async()=>{
  let img=null;try{img=await dbGet(imageKey(id))}catch(e){}
  if(currentBook!==child+"|"+kind||byChild(child,kind)[currentPage]?.id!==id)return;
  const el=document.getElementById("psCurrentArtwork"),load=document.getElementById("psArtLoading");
  if(!el||!load)return;
  if(typeof img==="string"&&img.startsWith("data:image/")){el.src=img;el.hidden=false;load.hidden=true}
  else load.textContent="Image unavailable on this device. Import or restore its photo backup.";
 });
};

/* Meaning, evidence and a manageable next step for dated school snapshots.
   These interpretations are inferred from the saved paper, never a new grade. */
function schoolAnalysis(x){
 const title=String(x.title||""),notes=String(x.notes||"");
 const combined=(title+" "+notes+" "+String(x.value||"")).toLowerCase();
 const result=(meaning,focus,next,caution="This interpretation uses a dated school paper, not current school-system data.")=>({meaning,focus,next,caution});
 if(/\bdibels\b|\bmclass\b/i.test(combined)){
  const score=Number(String(x.value||"").match(/^\s*(\d{3})/)?.[1]||notes.match(/composite(?: score)?[:\s]+(\d{3})/i)?.[1]||0);
  const gradeThree=schoolPortfolio().some(y=>y.child===x.child&&/\b(?:grade\s*3|3rd grade)\b/i.test([y.title,y.term,y.notes].join(" ")));
  const atStart=/beginning.of.year|beginning of year|2026-08|2026-09/i.test([x.term,x.title,x.asOf].join(" "));
  let meaning=score?"The composite score "+score+" is an overall reading screening measure, not a percentage or report-card grade.":"DIBELS is a reading skills screener, not a report-card grade.";
  if(score&&gradeThree&&atStart&&String(x.asOf||"").startsWith("2026")){
   meaning+=" Nebraska's 2026–27 beginning-of-third-grade benchmark is 332, so this result "+(score>=332?"meets":"does not meet")+" that benchmark"+(score>=332?" ("+(score-332)+" points above it).":".");
  }else if(/met goal/i.test(notes+" "+String(x.value||""))){meaning+=" The school report labels the result as meeting its goal.";}
  const flu=notes.match(/(?:oral reading fluency|fluency)[:\s]+(\d{2,3})\s*(?:WCPM|words correct per minute)?/i);
  const acc=notes.match(/(?:oral reading accuracy|accuracy)[:\s]+(\d{2,3})%/i);
  if(flu)meaning+=" The reading sample shows "+flu[1]+" correct words per minute"+(acc?" with "+acc[1]+"% accuracy":"")+".";
  const sounds=notes.match(/decoding letter sounds[:\s]+(\d+)/i),recoded=notes.match(/whole.word recoding[:\s]+(\d+)/i);
  const focus=sounds?"Sounding out unfamiliar words is worth continued practice: the recorded phonics measures are "+sounds[1]+" letter sounds"+(recoded?" and "+recoded[1]+" complete words":"")+". Even a student meeting the overall goal can have individual skills to strengthen.":"Check word decoding and reading accuracy, not just overall speed.";
  return result(meaning,focus,"Try 5 minutes of reading together: sound out two unfamiliar words, reread the sentence smoothly, and talk about its meaning. Compare with the next school screening, rather than treating one test as a growth trend.","DIBELS is a screener, not a diagnosis. Benchmark source: Nebraska Department of Education, 2026–27, third-grade beginning-of-year cutoff 332.");
 }
 if(/pre.sounds|letter.baseline|kindergarten.*dibels/i.test(combined)){
  return result("This kindergarten starting-point sheet reports 0 pre-sounds, 6 uppercase letters and 4 lowercase letters. These are skills demonstrated at that moment, not a fixed limit on future learning.","Connect letter names to their sounds, gradually adding familiar letters.","Play a two-letter sound hunt for 3–5 minutes using books, names and signs.","A follow-up assessment is needed to establish actual growth.");
 }
 if(/school work habits|teacher work habits|teacher feedback|teacher work/i.test(combined)){
  return result("The teacher praised completing work and potential peer leadership. Attention, participation and listening were also positive observations.","Responding respectfully when frustrated and following directions promptly are the specific reported growth goals.","Practice a short role-play: 'I am frustrated. Can you explain what I should do first?' Praise a respectful retry.","This is classroom feedback from one period, not a label or an explanation of what caused a difficult moment.");
 }
 if(/reading.*q1 overview/i.test(combined)){
  return result("Reading has a reported 3 on the teacher's 1–4 scale. The units cover classic tales and animal classification.","A score of 3 cannot be translated into 75% or a particular proficiency label without the school's rubric.","Ask the teacher how the 1–4 rubric works. At home, read a short animal fact and have the child retell it.");
 }
 if(/spelling.*q1/i.test(combined)){
  return result("The sheet lists 24 correct of 32 on a spelling lesson. That is a single score, not an overall reading grade.","Review spelling patterns and check whether mistakes cluster around a particular word ending.","Try five y-to-ies plurals together, including puppy → puppies and bunny → bunnies.");
 }
 if(/math.*q1 assessments/i.test(combined)){
  return result("The school marked 3 in each of three multiplication/division areas: what the operations mean, writing equations for stories and using strategies. The repeated scores suggest a consistent classroom snapshot.","We don't have the grading rubric, so a 3 should not be called 75% or treated as a diagnosis.","Have the child invent a multiplication or sharing story and explain the matching equation.");
 }
 if(/differentiated math|probability|sudoku/i.test(combined)){
  return result("This is evidence of enrichment activities: logic, Sudoku, probability and reasoning. Next-quarter plans mention Roman numerals and historical mathematicians.","Enrichment participation doesn't tell us that every listed topic has already been mastered.","Choose a fun Sudoku or probability game and ask the child to explain one strategy.");
 }
 if(/spelling pattern|change y to ies/i.test(combined)){
  return result("The listed lesson is about changing a word ending in consonant + y into its -ies form, such as study → studies.","Apply the pattern to new words instead of only memorizing the worksheet.","Play a 5-word plural challenge using puppy, penny, baby, bunny and lady.","The photographed list does not show a filled-in test date.");
 }
 if(/classic tales|animal classification/i.test(combined)){
  return result("The units include fiction and nonfiction: retelling classic tales and learning how animals are classified.","Reading accurately and explaining a passage's meaning are different skills worth practicing.","Read an animal-fact paragraph and ask for two details and one new question.");
 }
 if(/my body systems journal|skeletal.*muscular.*digestive/i.test(combined)){
  return result("The saved work demonstrates drawing, labeling and writing simple explanations of five body systems—evidence of engaging with science vocabulary.","Match each system to what it does, not just whether its name is spelled perfectly.","Let the child teach you how bones, muscles and nerves help us move.","A creative science project is not a standardized test score.");
 }
 if(/subtraction|math.*current/i.test(combined)){
  return result("The work samples show subtraction with objects, crossing out pictures and writing equations. A mix of correct and inconsistent answers suggests this process is still being practiced.","Count the starting objects, remove the stated number, count what remains, then write the matching number sentence.","Use eight toys. Remove five, count the three left and write 8 − 5 = 3. Repeat with one playful example.","These practice sheets do not provide a formal math grade.");
 }
 if(/fall kindergarten conference/i.test(combined)){
  return result("The teacher checked following directions, participating, staying on task, taking pride in work and kindness toward others—real classroom strengths.","Keep positive classroom behaviors separate from the new letter-sound skills being developed.","Celebrate one of those strengths and play one brief letter-sound game.");
 }
 if(/kindergarten skills|quarter 2|q2.learning/i.test(combined)){
  return result("The quarter-two plan includes beginning sounds, blending speech sounds, numbers 1–10, sets up to five, shapes, plants and other classroom themes.","These are upcoming learning objectives, not evidence that every item is already mastered.","Try a letter-sound hunt, count five objects or find circles and rectangles around the house.");
 }
 if(x.isGrade)return result("This is a dated score, not an IQ score, diagnosis or prediction of eventual achievement.","Look up the school's benchmark or grading rubric before deciding what this number signifies.","Practice one example problem or reading task related to the skill.");
 if(x.kind==="work")return result("This page documents what was practiced, but not necessarily what has been mastered.","Notice what the student solved independently versus what still requires help.","Ask the child to explain one answer, then try one similar problem.");
 if(x.kind==="learning")return result("This page describes material being taught or planned, not a completed mastery assessment.","Look for a later work sample or teacher note showing what the child can do.","Ask the child to teach you one interesting thing from the lesson.");
 return null;
}
function schoolAnalysisHTML(x){
 const guide=schoolAnalysis(x);if(!guide)return"";
 const meaning=String(x.insight||guide.meaning||""),focus=String(x.focus||guide.focus||""),practice=String(x.tryNext||guide.next||"");
 const block=(label,value,extra)=>value?'<div class="ps-school-analysis-block'+(extra?' '+extra:'')+'"><b>'+label+'</b><p>'+esc(value)+'</p></div>':"";
 return '<section class="ps-school-analysis">'+
  block("What this means",meaning)+block("What to focus on",focus)+block("Try next",practice,"ps-school-practice")+
  '<p class="ps-school-caution">'+esc(String(x.caution||guide.caution||""))+'</p></section>';
}
window.openChildSchoolBook=function(child,index=0){
 if(!KIDS.includes(child))return;
 const pages=schoolPages(child);
 if(!pages.length){
  modal(child+"'s School Book",'<div class="ps-empty-book">📚<b>Learning and growing</b><p>No school snapshots here yet. Import the Paper Sort file or add a learning note.</p><button onclick="paperImportArtBackup()">↑ Import saved books</button><button onclick="openSchoolMemoryEntry(\''+child+'\')">+ Add a school memory</button><button onclick="openArtLibrary()">‹ All books</button></div>',"Close",closeModal);return;
 }
 const n=Math.max(0,Math.min(pages.length-1,Number(index)||0)),x=pages[n],id=qid(x.id),date=String(x.asOf||"");
 const type=x.isGrade?"🧮 Test score / school report":x.kind==="work"?"✏ Schoolwork sample":x.kind==="feedback"?"💬 Teacher feedback":"🌱 Learning right now";
 const hasDoc=x.sourcePdfId&&(state.paperDigitalDocs||[]).some(v=>v.id===x.sourcePdfId);
 const canEdit=!x.isGrade;
 modal(child+"'s School Book",
 '<div class="ps-album"><div class="ps-album-heading"><span>📚 '+esc(child)+' · school memories</span><small>Page '+(n+1)+' of '+pages.length+'</small></div>'+
 '<div class="ps-school-page"><span class="ps-school-type">'+type+'</span><h3>'+esc(x.title||"Learning update")+'</h3>'+
 (x.value?'<div class="ps-school-score">'+esc(x.value)+'</div>':"")+
 '<p class="ps-school-date">'+esc(x.term||"")+(x.term&&date?" · ":"")+esc(date||"Date not entered")+'</p>'+
 (x.photoId?'<div class="ps-school-photo"><img id="psSchoolPhoto" alt="Schoolwork sample" hidden><span id="psSchoolLoading">Loading schoolwork photo…</span></div>':"")+
 '<p class="ps-school-notes">'+esc(x.notes||x.summary||"")+'</p>'+schoolAnalysisHTML(x)+
 (x.source?'<p class="ps-muted">Source: '+esc(x.source)+'</p>':"")+
 (hasDoc?'<button class="ps-school-doc" onclick="paperDownloadDigitalDoc(\''+qid(x.sourcePdfId)+'\')">↓ Save supporting school PDF</button>':"")+
 '</div><div class="ps-page-controls"><button '+(!n?"disabled":"")+' onclick="openChildSchoolBook(\''+child+'\','+(n-1)+')">‹ Previous</button>'+
 (canEdit?'<button onclick="openSchoolMemoryEntry(\''+child+'\',\''+id+'\')">Edit</button>':'<button onclick="openSchoolGrade(\''+id+'\',\''+child+'\')">Edit score</button>')+
 '<button '+(n>=pages.length-1?"disabled":"")+' onclick="openChildSchoolBook(\''+child+'\','+(n+1)+')">Next ›</button></div>'+
 '<div class="ps-nav"><button onclick="openSchoolMemoryEntry(\''+child+'\')">+ School note/work</button><button onclick="openSchoolGrade(\'\',\''+child+'\')">+ Score</button><button onclick="openArtLibrary()">All books</button></div>'+
 '<p class="ps-muted">This book stores dated snapshots and what the school is working on, not live school-system results.</p></div>',"Close",closeModal);
 if(x.photoId)Promise.resolve().then(async()=>{
  let img;try{img=await dbGet(SCHOOL_PHOTO+x.photoId)}catch(e){}
  const el=document.getElementById("psSchoolPhoto"),loading=document.getElementById("psSchoolLoading");
  if(!el||!loading||schoolPages(child)[n]?.id!==id)return;
  if(typeof img==="string"&&img.startsWith("data:image/")){el.src=img;el.hidden=false;loading.hidden=true}
  else loading.textContent="Work sample image is not on this device. Import the saved School Book file.";
 });
};
window.openSchoolMemoryEntry=function(child,id=""){
 if(!KIDS.includes(child))return;
 const old=schoolPortfolio().find(v=>v.id===id),x=old||{child,title:"",kind:"learning",asOf:"",notes:"",term:""};
 modal(old?"Edit school memory":"Add school memory",'<div class="stack ps-art-editor">'+
 '<label>What is this?<select id="psSchoolKind">'+[["learning","Learning right now"],["work","Schoolwork sample"],["feedback","Teacher feedback"]].map(([k,name])=>'<option value="'+k+'" '+(x.kind===k?"selected":"")+'>'+name+'</option>').join("")+'</select></label>'+
 '<label>Subject / title<input id="psSchoolTitle" value="'+esc(x.title||"")+'" placeholder="Subtraction, reading skills, science…"></label>'+
 '<label>As of<input type="date" id="psSchoolDate" value="'+esc(x.asOf||"")+'"></label>'+
 '<label>What they learned, practiced, scored or need to revisit<textarea id="psSchoolNotes" rows="5">'+esc(x.notes||"")+'</textarea></label>'+
 '<label>Work sample photo (optional)<input type="file" id="psSchoolFile" accept="image/*"></label>'+
 '<small class="ps-muted">Only log what actually happened. Photos are saved on this device; keep an additional backup.</small></div>',
 "Save",async()=>{
  const get=id=>document.getElementById(id),title=get("psSchoolTitle").value.trim(),f=get("psSchoolFile")?.files?.[0];
  if(!title){alert("Add the subject or title first.");return}
  if(f&&(!f.type.startsWith("image/")||f.size>30*1024*1024)){alert("Choose an image under 30 MB.");return}
  const rid=old?.id||uid();
  if(f){try{
   const img=await compressImage(f,1800,.86);
   await dbSet(SCHOOL_PHOTO+rid,img);
   const chk=await dbGet(SCHOOL_PHOTO+rid);
   if(typeof chk!=="string"||chk.length<100)throw Error("not stored");
  }catch(e){alert("Could not save the work photo. Keep the original and retry.");return}}
  const record={id:rid,child,kind:get("psSchoolKind").value,title,asOf:get("psSchoolDate").value,notes:get("psSchoolNotes").value.trim(),
   photoId:f?rid:(old?.photoId||""),source:old?.source||"Parent",sourcePdfId:old?.sourcePdfId||"",createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(old)Object.assign(old,record);else schoolPortfolio().push(record);
  await save();render();window.openChildSchoolBook(child,schoolPages(child).findIndex(v=>v.id===rid));
 });
};
window.openArtEntry=function(child="",id="",kind="art"){
 const found=arts().find(x=>x.id===id),x=found||{},kid=KIDS.includes(child)?child:x.child||"",bookKind=found?kindOf(found):kind==="achievement"?"achievement":"art";
 const choices=KIDS.map(c=>'<option '+(c===kid?"selected":"")+' value="'+c+'">'+c+'</option>').join("");
 modal(found?"Edit memory photo":"Add to a memory book",'<div class="stack ps-art-editor">'+
 '<label>Child<select id="psArtChild">'+choices+'</select></label>'+
 '<label>Book<select id="psArtKind"><option value="art" '+(bookKind==="art"?"selected":"")+'>🎨 Art Book</option><option value="achievement" '+(bookKind==="achievement"?"selected":"")+'>🏅 Achievement Book</option></select></label>'+
 '<label>Artwork / award name<input id="psArtTitle" value="'+esc(x.title||"")+'" placeholder="Rainbow dragon, scout certificate…"></label>'+
 '<div class="grid2"><label>Date (optional)<input id="psArtDate" type="date" value="'+esc(x.artDate||"")+'"></label>'+
 '<label>Age (optional)<input id="psArtAge" value="'+esc(x.age||"")+'"></label></div>'+
 '<label>Take photo or choose from gallery<input id="psArtFile" type="file" accept="image/*"></label>'+
 '<label>Story or memory<textarea id="psArtNotes" rows="3">'+esc(x.notes||"")+'</textarea></label>'+
 '<p class="ps-muted">The photo is stored on this device. Pictures sent in ChatGPT need a one-time import; keep a separate backup.</p>'+
 (found?'<div class="ps-nav"><button onclick="paperExportSingleArt(\''+qid(id)+'\')">↓ Save photo</button></div>':"")+
 '</div>',"Save",async()=>{
  const e=id=>document.getElementById(id),who=e("psArtChild").value,photo=e("psArtFile")?.files?.[0],title=e("psArtTitle").value.trim(),selected=e("psArtKind").value;
  if(!KIDS.includes(who)){alert("Choose a child.");return}
  if(!found&&!photo){alert("Choose or photograph the page first.");return}
  if(photo&&(!photo.type.startsWith("image/")||photo.size>30*1024*1024)){alert("Select an image smaller than 30 MB.");return}
  const aid=found?.id||uid();
  if(photo){
   let img;try{img=await compressImage(photo,1800,.86)}catch(error){alert("That photo could not be prepared.");return}
   try{await dbSet(imageKey(aid),img);const saved=await dbGet(imageKey(aid));if(!saved||saved.length<100)throw Error("image did not persist")}
   catch(error){alert("The photo could not be saved. Please keep the paper and try again.");return}
  }
  const meta={id:aid,child:who,kind:selected==="achievement"?"achievement":"art",title:title||"Untitled",
   artDate:e("psArtDate").value,age:e("psArtAge").value.trim(),notes:e("psArtNotes").value.trim(),
   hasLocalPhoto:true,createdAt:found?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(found)Object.assign(found,meta);else arts().push(meta);
  try{await save()}catch(error){alert("Photo saved locally but the book entry could not be saved.");return}
  render();window.openChildArtBook(who,byChild(who,meta.kind).findIndex(v=>v.id===aid),meta.kind);
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
 modal("Import saved children's memory books",
  '<div class="stack"><p class="ps-muted">Choose the <b>Daily Life Children’s Memory Books</b> JSON file. It restores photos, properly assigns certificates to Achievement Books, and adds school scores, work samples and learning notes. You can also use the full Paper Sort JSON or an older Art Book backup.</p>'+
  '<label>Saved books file<input id="psImportArt" type="file" accept="application/json,.json"></label>'+
  '<p class="ps-muted">This is additive and re-importable. Existing records stay; verified corrected ownership and book categories can be repaired. Photos remain stored locally on this device, so keep an external backup too.</p></div>',
 "Import books",async()=>{
  const file=document.getElementById("psImportArt")?.files?.[0];
  if(!file||file.size>150*1024*1024){alert("Choose the JSON memory-books file, up to 150 MB.");return}
  let backup;try{backup=JSON.parse(await file.text())}catch(e){alert("The selected file is not readable JSON.");return}
  const accepted=["daily-life-art-v1","daily-life-paper-batch-v1","daily-life-kids-books-v1"];
  if(!accepted.includes(backup?.format)||!Array.isArray(backup.artworks)||backup.artworks.length>1500){
   alert("This file does not contain a recognized Daily Life memory collection.");return;
  }
  const list=backup.schoolPortfolio||[],grades=backup.schoolGrades||(backup.format==="daily-life-paper-batch-v1"?backup.records?.schoolGrades:[])||[];
  if(!Array.isArray(list)||list.length>400||!Array.isArray(grades)||grades.length>1000){
   alert("Too many school entries, or school records are invalid.");return;
  }
  let checked=0,added=0,failed=0,updated=0,schoolAdded=0,gradeAdded=0,schoolPhotos=0;
  for(const entry of backup.artworks){
   const x=backup.format==="daily-life-art-v1"?entry?.metadata:entry;
   const photo=backup.format==="daily-life-art-v1"?entry?.photo:entry?.photoData;
   const id=String(x?.id||"");
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||!KIDS.includes(x?.child)||typeof photo!=="string"||
      !/^data:image\/(?:jpeg|png|webp);base64,/.test(photo)||photo.length>12*1024*1024){failed++;continue}
   try{
    const key=imageKey(id);let stored=await dbGet(key);
    if(typeof stored!=="string"||stored.length<100){await dbSet(key,photo);stored=await dbGet(key)}
    if(typeof stored!=="string"||stored.length<100){failed++;continue}
    const existing=arts().find(a=>a.id===id);
    const kind=x.kind==="achievement"?"achievement":"art";
    if(!existing){
     arts().push({id,child:x.child,kind,title:String(x.title||"Untitled masterpiece").slice(0,160),
       artDate:String(x.artDate||"").slice(0,10),age:String(x.age||"").slice(0,20),notes:String(x.notes||"").slice(0,2000),
       hasLocalPhoto:true,confirmationVersion:Number(x.confirmationVersion||0),
       createdAt:x.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});added++;
    }else{
     const confirmed=Number(x.confirmationVersion||0)>Number(existing.confirmationVersion||0);
     // Explicitly confirmed corrections supersede old import metadata.
     if(confirmed){
      existing.child=x.child;existing.kind=kind;
      existing.title=String(x.title||existing.title||"").slice(0,160);
      existing.notes=String(x.notes||existing.notes||"").slice(0,2000);
      existing.confirmationVersion=Number(x.confirmationVersion||0);
      updated++;
     }else if(!existing.kind&&x.kind==="achievement"){existing.kind="achievement";updated++}
     if(!existing.hasLocalPhoto)existing.hasLocalPhoto=true;
    }
    checked++;
   }catch(err){failed++}
  }
  if(!Array.isArray(state.schoolGrades))state.schoolGrades=[];
  for(const x of grades){
   if(!x||!KIDS.includes(x.child)||!/^[a-zA-Z0-9_-]{3,120}$/.test(String(x.id||"")))continue;
   if(state.schoolGrades.some(v=>v.id===x.id||(x.sourceKey&&v.sourceKey===x.sourceKey)))continue;
   state.schoolGrades.push(Object.assign({},x));gradeAdded++;
  }
  for(const x of list){
   const id=String(x?.id||"");
   if(!KIDS.includes(x?.child)||!/^[a-zA-Z0-9_-]{3,100}$/.test(id)){failed++;continue}
   const photo=x.photoData;
   if(photo!==undefined){
    if(typeof photo!=="string"||!/^data:image\/(?:jpeg|png|webp);base64,/.test(photo)||photo.length>12*1024*1024){failed++;continue}
    try{
     const key=SCHOOL_PHOTO+id;
     let saved=await dbGet(key);
     if(typeof saved!=="string"||saved.length<100){await dbSet(key,photo);saved=await dbGet(key)}
     if(typeof saved!=="string"||saved.length<100)throw Error("School photo not stored");
     schoolPhotos++;
    }catch(e){failed++;continue}
   }
   const existing=schoolPortfolio().find(v=>v.id===id||(x.sourceKey&&x.sourceKey===v.sourceKey));
   if(!existing){
    const item=Object.assign({},x);delete item.photoData;item.photoId=photo?id:(x.photoId||"");
    schoolPortfolio().push(item);schoolAdded++;
   }else if(photo&&!existing.photoId){existing.photoId=id;updated++}
  }
  fixConfirmedArtworkOwnership();
  try{await save()}catch(e){alert("Photos may be stored, but the book index could not be saved. Keep the import file and retry.");return}
  render();window.openArtLibrary();
  alert("Books updated! "+checked+" art/award photos checked, "+schoolPhotos+" schoolwork photos, "+gradeAdded+" scores and "+schoolAdded+" school notes added."+(updated?" "+updated+" confirmed corrections applied.":"")+(failed?" "+failed+" records could not be imported.":""));
 });
};
window.paperExportArtBackup=async function(){
 const artRows=[];for(const x of arts()){
  const photo=await dbGet(imageKey(x.id));if(typeof photo==="string"&&photo.startsWith("data:image/"))artRows.push({metadata:x,photo});
 }
 const schoolRows=[];for(const x of schoolPortfolio()){
  const row=Object.assign({},x);delete row.photoData;
  if(x.photoId){
   const photo=await dbGet(SCHOOL_PHOTO+x.photoId);
   if(typeof photo==="string"&&photo.startsWith("data:image/"))row.photoData=photo;
  }
  schoolRows.push(row);
 }
 const scores=state.schoolGrades||[];
 if(!artRows.length&&!schoolRows.length&&!scores.length){
  alert("There are no saved art, award or school records to back up yet.");return
 }
 // The standard Art Book backup format is extended additively for School Books.
 // A verified, reusable local file now includes artwork + school photos and scores.
 const file={format:"daily-life-kids-books-v1",version:2,exportedAt:new Date().toISOString(),
  artworks:artRows.map(x=>Object.assign({},x.metadata,{photoData:x.photo})),
  schoolGrades:scores,schoolPortfolio:schoolRows};
 downloadBlob(new Blob([JSON.stringify(file)],{type:"application/json"}),
  "DailyLife-Children-Memory-Books-"+ymd()+".json");
 alert("Backup download requested for "+artRows.length+" art/award photos, "+schoolRows.length+" school notes and "+scores.length+" scores. Check the downloaded file exists before recycling originals.");
};
})();
