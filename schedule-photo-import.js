/* Local OCR import for the weekly UPS schedule. Photos remain on the device. */
(function(){
  "use strict";
  const OCR_SCRIPT="https://cdn.jsdelivr.net/npm/tesseract.js@5.0.0/dist/tesseract.min.js";
  const OCR_OPTIONS={
    workerPath:"https://cdn.jsdelivr.net/npm/tesseract.js@5.0.0/dist/worker.min.js",
    langPath:"https://tessdata.projectnaptha.com/4.0.0",
    corePath:"https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0"
  };
  let cancelled=false, busy=false;
  const weekdays=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  function esc(s){return typeof window.esc==="function"?window.esc(String(s)):String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function today(){return typeof window.ymd==="function"?window.ymd():new Date().toISOString().slice(0,10)}
  function dateShift(date,amount){return window.shiftDateString?window.shiftDateString(date,amount):date}
  function currentWeek(){
    const now=today(),dow=new Date(now+"T12:00:00").getDay(),start=dateShift(now,-dow);
    return {start,dates:Array.from({length:7},(_,i)=>dateShift(start,i))};
  }
  function loadOCR(){
    if(window.Tesseract?.createWorker)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-schedule-ocr="1"]');
      if(existing){existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",()=>reject(Error("OCR library could not load.")),{once:true});return}
      const script=document.createElement("script");script.src=OCR_SCRIPT;script.async=true;script.dataset.scheduleOcr="1";
      script.onload=resolve;script.onerror=()=>reject(Error("OCR library could not load. Check your connection and try again."));
      document.head.appendChild(script);
    });
  }
  function timeCandidates(line){
    const found=[],re=/\b(\d{1,2})(?::(\d{2}))?\s*([ap])(?:\.?\s*m)?\.?\b|\b(\d{1,2})[:.](\d{2})\b/ig;
    let m;
    while((m=re.exec(line))){
      const before=line.slice(Math.max(0,m.index-3),m.index);
      if(/[\d/]/.test(before))continue;
      const hour=Number(m[1]||m[4]),minute=Number(m[2]||m[5]||0),ampm=(m[3]||"").toLowerCase();
      if(hour<1||hour>12||minute>59)continue;
      let h=hour;
      if(ampm)h=(hour%12)+(ampm==="p"?12:0);
      else if(hour===12)h=12;
      found.push(String(h).padStart(2,"0")+":"+String(minute).padStart(2,"0"));
    }
    return found;
  }
  function dateForLine(line,week){
    const md=line.match(/\b(0?[1-9]|1[0-2])\s*[\/-]\s*(0?[1-9]|[12]\d|3[01])(?:\s*[\/-]\s*(20\d{2}))?\b/);
    if(md){
      const year=Number(md[3]||week.dates[0].slice(0,4)),iso=year+"-"+String(md[1]).padStart(2,"0")+"-"+String(md[2]).padStart(2,"0");
      if(week.dates.includes(iso))return iso;
    }
    const names=[...line.matchAll(/\b(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?)\b/ig)];
    if(names.length){
      const token=names[0][1].slice(0,3).toLowerCase(),ix=["sun","mon","tue","wed","thu","fri","sat"].indexOf(token);
      if(ix>=0)return week.dates[ix];
    }
    const month=/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(20\d{2}))?/i.exec(line);
    if(month){
      const months=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"],mi=months.indexOf(month[1].slice(0,3).toLowerCase());
      const iso=week.dates[0].slice(0,4)+"-"+String(mi+1).padStart(2,"0")+"-"+String(Number(month[2])).padStart(2,"0");
      if(week.dates.includes(iso))return iso;
    }
    return null;
  }
  function parseOCR(text,week){
    const raw=String(text||"").split(/\r?\n/).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean),lines=[];
    raw.forEach((line,i)=>{
      const hasDate=dateForLine(line,week),hasTime=timeCandidates(line).length>0;
      if(hasDate&&!hasTime&&raw[i+1]&&!dateForLine(raw[i+1],week))lines.push(line+" "+raw[i+1]);
      else lines.push(line);
    });
    const result={};
    lines.forEach(line=>{
      const date=dateForLine(line,week);if(!date)return;
      const dayText=line.toLowerCase(),off=/\b(off|no shift|not scheduled|day off)\b/.test(dayText);
      const times=timeCandidates(line);
      result[date]={working:!off,scheduled:off?"":(times[0]||""),hasAmPm:/\b\d{1,2}(?::\d{2})?\s*[ap](?:\.?\s*m)?\.?\b/i.test(line),line};
    });
    return result;
  }
  function showError(message){
    if(window.openWeeklyWorkSchedule)window.openWeeklyWorkSchedule();
    setTimeout(()=>addBanner('<b>Photo import didn’t finish.</b> '+esc(message)),0);
  }
  function addBanner(html){
    const wrap=document.querySelector("#modal .weekly-work-schedule");
    if(!wrap)return;
    const note=document.createElement("div");note.className="notice schedule-photo-result";note.innerHTML=html;
    wrap.insertBefore(note,wrap.firstChild);
  }
  function addImportControl(){
    const root=document.querySelector("#modal .weekly-work-schedule");if(!root||root.querySelector(".schedule-photo-import-control"))return;
    const box=document.createElement("div");box.className="notice schedule-photo-import-control";
    box.innerHTML='<b>Start from a schedule photo</b><div class="muted small">The photo stays on this device. OCR runs here; review the shifts before saving. An internet connection is needed the first time OCR loads.</div><button type="button" class="btn" style="margin-top:8px">📷 Choose schedule photo</button>';
    const input=document.createElement("input");input.type="file";input.accept="image/*";input.setAttribute("capture","environment");input.hidden=true;input.setAttribute("aria-label","Choose UPS schedule photo");
    box.appendChild(input);box.querySelector("button").addEventListener("click",()=>input.click());
    input.addEventListener("change",()=>{const file=input.files&&input.files[0];if(file)readPhoto(file)});
    root.insertBefore(box,root.firstChild);
  }
  async function readPhoto(file){
    if(busy)return;busy=true;cancelled=false;const week=currentWeek();
    const body='<div class="stack"><p id="schedulePhotoStatus">Loading on-device photo reader…</p><p class="muted small">Your photo is processed on this device and is not uploaded.</p></div>';
    window.modal("Reading schedule photo",body,"Cancel",function(){cancelled=true;window.closeModal()});
    let worker=null;
    try{
      await loadOCR();if(cancelled)return;
      worker=await window.Tesseract.createWorker("eng",1,Object.assign({},OCR_OPTIONS,{
        logger:function(m){
          const node=document.getElementById("schedulePhotoStatus");if(!node)return;
          if(m.status==="recognizing text")node.textContent="Reading the photo… "+Math.round((m.progress||0)*100)+"%";
          else if(m.status)node.textContent="Preparing photo reader…";
        }
      }));
      if(cancelled)return;
      const result=await worker.recognize(file);if(cancelled)return;
      const found=parseOCR(result?.data?.text||"",week),entries=Object.entries(found).sort((a,b)=>a[0].localeCompare(b[0]));
      window.closeModal();
      if(!entries.length){showError("I couldn’t identify any days in this photo. Try a clear, straight-on picture with the date and time visible.");return}
      if(window.openWeeklyWorkSchedule)window.openWeeklyWorkSchedule();
      setTimeout(()=>{
        const names=[];
        entries.forEach(([date,entry])=>{
          const i=week.dates.indexOf(date);if(i<0)return;
          const check=document.getElementById("weeklyWorkday"+i),time=document.getElementById("weeklyWorkStart"+i);
          if(check)check.checked=!!entry.working;
          if(time&&(!entry.working||entry.scheduled))time.value=entry.scheduled||"";
          names.push(weekdays[i]+(entry.working?(entry.scheduled?" "+formatTime(entry.scheduled):" · time unclear"):" · off"));
        });
        const inferred=entries.some(([,entry])=>entry.working&&entry.scheduled&&!entry.hasAmPm);
        addBanner('<b>Review what I read from the photo:</b> '+esc(names.join(" · "))+'<div class="small">Check every day and time below. Nothing changes until you tap Save shifts.'+(inferred?" Times without AM/PM were read as morning; please check them.":"")+"</div>");
      },0);
    }catch(error){
      if(!cancelled){window.closeModal();showError(error?.message||"Try a clearer photo or try again when you have a connection.")}
    }finally{
      if(worker)try{await worker.terminate()}catch(_){}
      busy=false;
    }
  }
  function formatTime(time){
    const [hh,mm]=time.split(":").map(Number),suffix=hh>=12?"PM":"AM",hour=hh%12||12;
    return hour+":"+String(mm).padStart(2,"0")+" "+suffix;
  }
  const base=window.openWeeklyWorkSchedule;
  if(typeof base==="function"){
    window.openWeeklyWorkSchedule=function(){base.apply(this,arguments);addImportControl()};
  }
})();