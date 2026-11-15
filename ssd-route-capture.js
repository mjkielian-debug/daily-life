/* SSD quick route log. Separate from preload punches and official payroll. */
(function(){
  "use strict";
  const escapeText=value=>typeof esc==="function"?esc(String(value??"")):String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function timeMinutes(value){
    const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value||""));
    return m?Number(m[1])*60+Number(m[2]):null;
  }
  function timeValue(value){
    const m=/\b(\d{1,2}):([0-5]\d)\b/.exec(String(value||""));
    if(!m)return "";
    const hour=Number(m[1]),minute=Number(m[2]);
    return hour>=0&&hour<=23?String(hour).padStart(2,"0")+":"+String(minute).padStart(2,"0"):"";
  }
  function parseText(value){
    const s=String(value||"");
    const pairs=[...s.matchAll(/\b(\d{1,2}:[0-5]\d)\s*(?:to|through|until|[-–—])\s*(\d{1,2}:[0-5]\d)\b/ig)];
    // A message may contain preload AND SSD shifts. Never silently use the
    // first time pair when the SSD route can be distinguished.
    const tagged=pairs.find(pair=>{
      const prefix=s.slice(Math.max(0,pair.index-48),pair.index);
      return /\b(?:ssd|delivery|route)\b(?:[\s:=-]*\w+){0,3}[\s:=-]*$/i.test(prefix);
    });
    const ambiguous=pairs.length>1&&!tagged;
    const times=tagged||(pairs.length===1?pairs[0]:null);
    const readings=s.match(/\b(\d{4,8})\s*(?:to|through|until|[-–—])\s*(\d{4,8})\b/i);
    return {
      start:times?timeValue(times[1]):"",
      end:times?timeValue(times[2]):"",
      odoStart:readings?readings[1]:"",
      odoEnd:readings?readings[2]:"",
      ambiguousTimes:ambiguous
    };
  }
  function optionalNumber(raw,max,whole=false){
    if(raw==null||String(raw).trim()==="")return {value:null};
    const n=Number(raw);
    if(!Number.isFinite(n)||n<0||n>max||(whole&&!Number.isInteger(n)))return {error:"Enter a valid "+(whole?"whole number":"nonnegative number")};
    return {value:n};
  }
  function calculate(info){
    const start=String(info.start||""),end=String(info.end||"");
    if(!!start!==!!end)return {error:"Enter both SSD delivery times, or leave both blank."};
    const startMinutes=start?timeMinutes(start):null,endMinutes=end?timeMinutes(end):null;
    if(start&&startMinutes===null||end&&endMinutes===null)return {error:"Enter valid delivery times."};
    if(start&&endMinutes<=startMinutes)return {error:"The SSD delivery end must be later than its start on the same day."};
    const elapsed=start?Math.round((endMinutes-startMinutes)/60*100)/100:null;
    const odoStart=optionalNumber(info.odoStart,99999999,true),
      odoEnd=optionalNumber(info.odoEnd,99999999,true),
      hours=optionalNumber(info.hours,24),
      miles=optionalNumber(info.miles,2000);
    for(const r of [odoStart,odoEnd,hours,miles])if(r.error)return {error:r.error};
    if((odoStart.value===null)!==(odoEnd.value===null))return {error:"Enter both odometer readings, or leave both blank."};
    if(odoStart.value!==null&&odoEnd.value<odoStart.value)return {error:"The ending odometer cannot be smaller than the starting reading."};
    const odometerMiles=odoStart.value===null?null:odoEnd.value-odoStart.value;
    if(odometerMiles!==null&&odometerMiles>2000)return {error:"The odometer change is unusually large. Check the readings."};
    if(odometerMiles!==null&&miles.value!==null&&Math.abs(odometerMiles-miles.value)>0.05)return {error:"Entered miles differ from the odometer change. Clear the manual miles field or correct the readings."};
    if(elapsed===null&&odometerMiles===null&&hours.value===null&&miles.value===null)return {error:"Enter route times, odometer readings, hours, or miles."};
    return {
      start,end,elapsed,odoStart:odoStart.value,odoEnd:odoEnd.value,
      miles:odometerMiles===null?miles.value:odometerMiles,
      hours:hours.value,odometerMiles
    };
  }
  function summaryFor(date,route){
    const rows=["SSD route · "+String(date)];
    if(route.start&&route.end)rows.push("Delivery: "+route.start+"–"+route.end);
    if(route.odoStart!==null&&route.odoEnd!==null)rows.push("Odometer: "+route.odoStart+" → "+route.odoEnd);
    if(route.miles!==null)rows.push("Route miles: "+route.miles);
    if(route.hours!==null)rows.push("Confirmed paid SSD hours: "+route.hours);
    return rows.join("\n");
  }
  window.dailyLifeSSDRouteParsing=Object.freeze({timeMinutes,parseText,calculate,summaryFor});
  window.openSSDRouteQuickLog=function(date){
    date=String(date||(typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10)));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const previous=(state.workShifts||[]).find(x=>x.date===date)||{};
    const body='<div class="stack">'+
      '<div class="notice small"><b>SSD only.</b> This does not change your preload or official UPS punch times. You can paste the start/end times and odometer readings from a message, then review them before saving.</div>'+
      '<label>Route date<input id="ssdRouteDate" type="date" value="'+escapeText(date)+'"></label>'+
      '<label>Paste your SSD message (optional)<textarea id="ssdRouteText" rows="2" placeholder="9:42 to 13:59, odometer 91372 to 91395"></textarea></label>'+
      '<button type="button" id="ssdRouteParse" class="btn small">Fill fields from message</button>'+
      '<div class="grid2"><label>SSD route start<input type="time" id="ssdRouteStart" value="'+escapeText(previous.deliveryStart||"")+'"></label>'+
      '<label>SSD route end<input type="time" id="ssdRouteEnd" value="'+escapeText(previous.deliveryEnd||"")+'"></label></div>'+
      '<div class="grid2"><label>Odometer at start<input type="number" min="0" max="99999999" step="1" id="ssdRouteOdoStart" value="'+escapeText(previous.ssdOdometerStart??"")+'"></label>'+
      '<label>Odometer at end<input type="number" min="0" max="99999999" step="1" id="ssdRouteOdoEnd" value="'+escapeText(previous.ssdOdometerEnd??"")+'"></label></div>'+
      '<div class="grid2"><label>Paid SSD hours (optional)<input type="number" min="0" max="24" step=".01" id="ssdRouteHours" value="'+escapeText(previous.ssdHours??"")+'" placeholder="Confirm from UPS"></label>'+
      '<label>SSD miles if no odometer pair<input type="number" min="0" max="2000" step=".1" id="ssdRouteMiles" value="'+escapeText(previous.ssdMiles??"")+'" placeholder="Automatically calculated"></label></div>'+
      '<div class="notice small" id="ssdRoutePreview" aria-live="polite">Enter known route details to preview mileage.</div>'+
      '<button type="button" id="ssdRouteCopy" class="btn">Copy SSD details for supervisor</button>'+
      '<div class="muted small">Copying does not save or send a text. Check the details, save the route separately, then paste into your supervisor message.</div>'+
      '<div class="muted small">Time difference is elapsed time, not necessarily payable hours. Leave paid hours blank if unconfirmed. If both odometer readings are entered, their difference is used for mileage.</div>'+
    '</div>';
    modal("UPS · Record SSD route",body,"Save SSD route",async()=>{
      const info=read();
      const route=calculate(info);
      if(route.error){alert(route.error);return}
      const chosenDate=String(document.getElementById("ssdRouteDate")?.value||"");
      if(!/^\d{4}-\d{2}-\d{2}$/.test(chosenDate)){alert("Choose a valid route date.");return}
      const oldShifts=state.workShifts;
      const next=(oldShifts||[]).map(w=>({...w}));
      let row=next.find(w=>w.date===chosenDate);
      if(!row){row={id:typeof uid==="function"?uid():"ssd-"+chosenDate,date:chosenDate};next.push(row)}
      row.deliveryStart=route.start;row.deliveryEnd=route.end;
      row.ssdOdometerStart=route.odoStart===null?"":route.odoStart;
      row.ssdOdometerEnd=route.odoEnd===null?"":route.odoEnd;
      row.ssdMiles=route.miles===null?"":route.miles;
      row.ssdHours=route.hours===null?"":route.hours;
      row.ssdRouteUpdatedAt=new Date().toISOString();
      row.ssdRouteSource="user-confirmed";
      state.workShifts=next;
      try{await save();closeModal();render()}
      catch(error){state.workShifts=oldShifts;alert("SSD route did not save. Your previous shift records are unchanged. Please try again.")}
    });
    function read(){
      const value=id=>document.getElementById(id)?.value??"";
      return {start:value("ssdRouteStart"),end:value("ssdRouteEnd"),
        odoStart:value("ssdRouteOdoStart"),odoEnd:value("ssdRouteOdoEnd"),
        hours:value("ssdRouteHours"),miles:value("ssdRouteMiles")};
    }
    function refresh(){
      const node=document.getElementById("ssdRoutePreview");if(!node)return;
      const result=calculate(read());
      if(result.error){node.textContent=result.error;return}
      const parts=[];
      if(result.odometerMiles!==null)parts.push(result.odometerMiles+" route miles from odometer");
      else if(result.miles!==null)parts.push(result.miles+" miles entered");
      if(result.elapsed!==null)parts.push(result.elapsed+" elapsed route hours");
      if(result.hours!==null)parts.push(result.hours+" paid SSD hours entered");
      else if(result.elapsed!==null)parts.push("paid hours not confirmed");
      node.textContent=parts.join(" · ");
    }
    for(const id of ["ssdRouteStart","ssdRouteEnd","ssdRouteOdoStart","ssdRouteOdoEnd","ssdRouteHours","ssdRouteMiles"]){
      document.getElementById(id)?.addEventListener("input",refresh);
    }
    // When selecting another date, restore THAT day's data, not the previously
    // displayed day's route. Otherwise a single tap could copy miles to the wrong day.
    document.getElementById("ssdRouteDate")?.addEventListener("change",()=>{
      const selected=String(document.getElementById("ssdRouteDate")?.value||"");
      const chosen=(state.workShifts||[]).find(row=>row.date===selected)||{};
      for(const [id,entry] of [
        ["ssdRouteStart",chosen.deliveryStart||""],
        ["ssdRouteEnd",chosen.deliveryEnd||""],
        ["ssdRouteOdoStart",chosen.ssdOdometerStart??""],
        ["ssdRouteOdoEnd",chosen.ssdOdometerEnd??""],
        ["ssdRouteHours",chosen.ssdHours??""],
        ["ssdRouteMiles",chosen.ssdMiles??""],
        ["ssdRouteText",""]
      ]){
        const input=document.getElementById(id);
        if(input)input.value=String(entry);
      }
      refresh();
    });
    document.getElementById("ssdRouteCopy")?.addEventListener("click",async()=>{
      const route=calculate(read());
      if(route.error){alert(route.error);return}
      const chosenDate=String(document.getElementById("ssdRouteDate")?.value||"");
      if(!/^\d{4}-\d{2}-\d{2}$/.test(chosenDate)){alert("Choose a valid route date.");return}
      const report=summaryFor(chosenDate,route);
      try{
        if(!navigator.clipboard?.writeText)throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(report);
        alert("SSD details copied. Paste into your text to your supervisor. This did not send a message or save the route.");
      }catch(error){
        if(typeof window.prompt==="function")window.prompt("Copy this SSD report:",report);
        else alert("Copy unavailable on this device. The report is still visible in your fields.");
      }
    });
    document.getElementById("ssdRouteParse")?.addEventListener("click",()=>{
      const parsed=parseText(document.getElementById("ssdRouteText")?.value);
      if(parsed.ambiguousTimes){alert("I found multiple time ranges. Please specify which one is SSD/delivery, or enter the times manually.");return}
      if(!parsed.start&&!parsed.odoStart){alert("No recognizable route time or odometer pair. Try 9:42 to 13:59, 91372 to 91395.");return}
      for(const [id,value] of [["ssdRouteStart",parsed.start],["ssdRouteEnd",parsed.end],["ssdRouteOdoStart",parsed.odoStart],["ssdRouteOdoEnd",parsed.odoEnd]]){
        if(!value)continue;
        const input=document.getElementById(id);if(input)input.value=value;
      }
      refresh();
    });
    refresh();
  };
})();
