/* Daily Life push notifications. Permission is requested only from the user's explicit button press. */
const DAILY_LIFE_VAPID_PUBLIC_KEY = "BCN3n2qB9TjYlHworPgn9uKZoxgocTWAqm0J_aJq6yqS-DrsIzIL_kdAYZV35ucR2g0tlNZMWHBBOns_aYxbMas";

function dailyLifePushSettingsPanel(){
  const supported = "Notification" in window && "serviceWorker" in navigator && !!window.PushManager;
  const allowed = supported && Notification.permission === "granted";
  const connected = localStorage.getItem("dailyLifePushEnabled") === "1";
  const status = !supported ? "This browser does not support phone notifications."
    : Notification.permission === "denied" ? "Notifications are blocked in browser settings."
    : connected ? "Phone notifications are enabled on this device."
    : allowed ? "Permission is allowed; finish enabling this device."
    : "Choose which Daily Life reminders can notify you.";
  return `<section class="settings-flat-section daily-life-push-settings">
    <div class="section-title"><div><div class="eyebrow">Phone alerts</div><h2>Daily Life notifications</h2></div><span class="tag">${connected?"on":"optional"}</span></div>
    <div class="muted small">${status} Reminders use the schedule you set in Daily Life. Android controls sound and vibration.</div>
    <p class="muted small">If alerts appear but are silent on Samsung: Settings → Notifications → Advanced settings → turn on Manage notification categories for each app. Then Settings → Apps → Daily Life (or Chrome if Daily Life is listed under Chrome) → Notifications → Notification categories → tap the category name → choose Alert and a Sound. Also check notification volume and Do Not Disturb. The small Android badge is monochrome; the full icon is colorful.</p><div class="actions" style="margin-top:10px"><button class="btn" type="button" onclick="testDailyLifeNotification()">Test notification</button><button class="btn" type="button" onclick="testDailyLifeChime()">Hear a test sound</button><button class="btn" type="button" onclick="openDailyLifeSoundHelp()">Fix silent alerts</button>
      <button class="btn primary" type="button" onclick="enableDailyLifePush()" ${!supported||Notification.permission==="denied"?"disabled":""}>${connected?"Refresh this device":"Enable notifications"}</button>
      ${connected?'<button class="btn" type="button" onclick="disableDailyLifePush()">Turn off this device</button>':""}
    </div>
  </section>`;
}

async function enableDailyLifePush(){
  try{
    if(!("Notification" in window)||!("serviceWorker" in navigator)||!window.PushManager)throw new Error("This browser does not support push notifications.");
    if(!cloudClient)throw new Error("Sign in to Daily Life Cloud before enabling notifications.");
    const user=typeof cloudUser==="function"?cloudUser():null;
    if(!user)throw new Error("Sign in to Daily Life Cloud before enabling notifications.");
    let permission=Notification.permission;
    if(permission==="default")permission=await Notification.requestPermission();
    if(permission!=="granted")throw new Error("Allow notifications for Daily Life in your browser or Android app settings.");
    const registration=await navigator.serviceWorker.ready;
    let subscription=await registration.pushManager.getSubscription();
    if(!subscription)subscription=await registration.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:dailyLifeBase64ToBytes(DAILY_LIFE_VAPID_PUBLIC_KEY)
    });
    const result=await cloudClient.functions.invoke("daily-life-push",{
      body:{action:"subscribe",subscription:subscription.toJSON()}
    });
    if(result.error)throw result.error;
    localStorage.setItem("dailyLifePushEnabled","1");
    if(typeof render==="function")render();
    if(typeof modal==="function")modal("Notifications enabled",'<div class="stack"><p>Daily Life can now send reminders on this device. Reminder sound and vibration follow your Android notification settings.</p></div>',"Done",()=>{});
  }catch(error){
    if(typeof modal==="function")modal("Could not enable notifications",`<div class="stack"><p>${esc(String(error&&error.message||error))}</p></div>`,"OK",()=>{});
    else alert(String(error&&error.message||error));
  }
}
async function disableDailyLifePush(){
  try{
    const registration=await navigator.serviceWorker.ready;
    const subscription=await registration.pushManager.getSubscription();
    if(subscription&&cloudClient){
      const result=await cloudClient.functions.invoke("daily-life-push",{
        body:{action:"unsubscribe",endpoint:subscription.endpoint}
      });
      if(result.error)throw result.error;
      await subscription.unsubscribe();
    }
    localStorage.removeItem("dailyLifePushEnabled");
    if(typeof render==="function")render();
  }catch(error){
    if(typeof modal==="function")modal("Could not turn off notifications",`<div class="stack"><p>${esc(String(error&&error.message||error))}</p></div>`,"OK",()=>{});
  }
}
function dailyLifeBase64ToBytes(value){
  const padded=(value+"=".repeat((4-value.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(padded),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return bytes;
}

function openDailyLifePushSettings(){
  const supported="Notification" in window&&"serviceWorker" in navigator&&!!window.PushManager;
  const status=!supported?"This browser does not support phone notifications.":Notification.permission==="denied"?"Notifications are blocked in browser settings.":localStorage.getItem("dailyLifePushEnabled")==="1"?"Notifications are enabled on this device.":"Notifications are off on this device.";
  const body=`<div class="stack"><p>${esc(status)}</p><p>Daily Life checks opted-in reminders every five minutes and sends them at the time saved on each reminder. Android controls sound and vibration.</p><p>If alerts appear but are silent on Samsung: Settings → Notifications → Advanced settings → turn on Manage notification categories for each app. Then Settings → Apps → Daily Life (or Chrome if Daily Life is listed under Chrome) → Notifications → Notification categories → tap the category name → choose Alert and a Sound. Also check notification volume and Do Not Disturb.</p><div class="actions"><button class="btn" type="button" onclick="testDailyLifeNotification()">Test notification</button><button class="btn" type="button" onclick="testDailyLifeChime()">Hear a test sound</button><button class="btn" type="button" onclick="openDailyLifeSoundHelp()">Fix silent alerts</button><button class="btn primary" type="button" onclick="enableDailyLifePush()">Enable notifications</button>${localStorage.getItem("dailyLifePushEnabled")==="1"?'<button class="btn" type="button" onclick="disableDailyLifePush()">Turn off this device</button>':""}</div></div>`;
  modal("Daily Life notifications",body,"Done",()=>{});
}
function attachDailyLifeNotificationButton(){
  const header=document.querySelector("#app header");
  if(!header||header.querySelector("#dailyLifeNotificationButton"))return;
  const settings=[...header.querySelectorAll("button")].find(button=>/settings/i.test(button.getAttribute("aria-label")||"")||/settings/i.test(button.textContent||""));
  if(!settings)return;
  const button=document.createElement("button");
  button.id="dailyLifeNotificationButton";button.type="button";button.className=settings.className||"btn";
  button.setAttribute("aria-label","Daily Life notifications");button.title="Daily Life notifications";
  button.textContent="♧";
  button.addEventListener("click",openDailyLifePushSettings);
  settings.insertAdjacentElement("afterend",button);
}
if(typeof render==="function"){
  const dailyLifeRenderBeforeNotifications=render;
  render=function(...args){
    const result=dailyLifeRenderBeforeNotifications.apply(this,args);
    setTimeout(attachDailyLifeNotificationButton,0);
    return result;
  };
}
window.addEventListener("load",attachDailyLifeNotificationButton,{once:true});
if(typeof cloudPanel==="function"){
  const dailyLifeOriginalCloudPanel=cloudPanel;
  cloudPanel=function(){return dailyLifeOriginalCloudPanel()+dailyLifePushSettingsPanel()};
}

async function testDailyLifeNotification(){
 try{
 if(!("Notification" in window)||Notification.permission!=="granted")throw new Error("Enable Daily Life notifications first.");
 const reg=await navigator.serviceWorker.ready;
 await reg.showNotification("Daily Life · Test alert",{body:"If this is silent, press and hold this notification and choose Alert and a sound in your phone settings.",icon:"./daily-life-garden-app-192.png",badge:"./daily-life-notification-badge.png",tag:"daily-life-test-"+Date.now(),silent:false,renotify:true,vibrate:[200,100,200],data:{url:reg.scope}});
 }catch(error){alert(String(error.message||error));}
}

/* A user-triggered sound test. Push chimes themselves are controlled by Samsung's Android channel. */
async function testDailyLifeChime(){
 try{
  const A=window.AudioContext||window.webkitAudioContext;
  if(!A)throw new Error("Audio tests are unavailable in this browser.");
  const ctx=new A();await ctx.resume();
  [0,0.17].forEach((offset,i)=>{
   const o=ctx.createOscillator(),g=ctx.createGain();
   o.type="sine";o.frequency.value=i?880:660;o.connect(g);g.connect(ctx.destination);
   const now=ctx.currentTime+offset;
   g.gain.setValueAtTime(.0001,now);
   g.gain.exponentialRampToValueAtTime(.13,now+.02);
   g.gain.exponentialRampToValueAtTime(.0001,now+.21);
   o.start(now);o.stop(now+.24);
  });
  setTimeout(()=>ctx.close().catch(()=>{}),1100);
  if(typeof modal==="function")modal("Test sound played","<p>Did you hear the little two-note chime? This confirms whether app audio is audible. Background reminders use a separate Android notification channel; even when this sound works, you must enable an audible alert sound in the phone's notification settings.</p>","Done",closeModal);
 }catch(error){alert(String(error?.message||error))}
}
function openDailyLifeSoundHelp(){
 if(typeof modal!=="function")return;
 modal("Make Daily Life reminders audible",'<div class="stack"><p><b>Your screenshot confirms reminders are arriving.</b> The silent alert is an Android setting, not a missing reminder.</p><p><b>1.</b> Press and hold a Daily Life notification, choose Settings, and open its notification category.</p><p><b>2.</b> Choose <b>Alert</b> (not Silent) and select a notification <b>Sound</b>. If categories are hidden, enable <b>Manage notification categories for each app</b> in Samsung Settings → Notifications → Advanced settings.</p><p><b>3.</b> Check notification volume and Do Not Disturb. Return here and tap <b>Test notification</b> to verify the channel.</p><p>The colorful picture in your notification is the large icon; Android requires a separate monochrome small badge. We now supply a white house badge, although Samsung/Chrome can still show an app-controlled small icon.</p><p>The moon home-screen icon is cached by Android from the original installation. Changing app code alone does not reliably replace it. Keep your app data and cloud backup safe before removing or reinstalling anything.</p></div>',"Done",closeModal);
}
