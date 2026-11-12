/* Daily Life · visual navigation feedback and avatar closet entry. */
(function(){
 "use strict";
 function addClosetEntry(){
  const page=document.querySelector("#app .life-map-page");
  const wrap=page?.querySelector(".lm-avatar-wrap");
  if(!wrap||wrap.querySelector(".lm-home-closet"))return;
  const button=document.createElement("button");
  button.type="button";
  button.className="lm-home-closet";
  button.textContent="👗 Closet & outfits";
  button.setAttribute("aria-label","Open Michelle’s closet and avatar outfits");
  button.addEventListener("click",function(){
   if(typeof window.avatarWardrobeOpen==="function")window.avatarWardrobeOpen();
   else if(typeof window.openAvatarWardrobeInbox==="function")window.openAvatarWardrobeInbox();
  });
  const caption=wrap.querySelector(".lm-avatar-caption");
  if(caption)caption.insertAdjacentElement("afterend",button);
  else wrap.appendChild(button);
 }
 window.avatarWardrobeOpen=function(){
  if(typeof window.modal!=="function")return;
  const panel=typeof window.avatarWardrobePanelHtml==="function"?window.avatarWardrobePanelHtml():"";
  window.modal("Closet & outfits",'<div class="lm-wardrobe-popup">'+panel+'</div>',"Close",window.closeModal);
 };
 function sparkle(event){
  const target=event.target?.closest?.('button,a,[role="button"],summary,input[type="checkbox"],input[type="radio"],.lm-avatar-hotspot,.lm-avatar-mark,.hvm-zone,.hvm-room-tile');
  if(!target||target.disabled||target.getAttribute("aria-disabled")==="true")return;
  const rect=target.getBoundingClientRect();
  const x=event.clientX||rect.left+rect.width/2,y=event.clientY||rect.top+rect.height/2;
  const glyphs=["✦","✧","✧","✦","✳"];
  glyphs.forEach(function(glyph,index){
   const bit=document.createElement("span");
   bit.className="dl-tap-sparkle";
   bit.setAttribute("aria-hidden","true");
   bit.textContent=glyph;
   bit.style.left=x+"px";bit.style.top=y+"px";
   bit.style.setProperty("--spark-angle",(index*72)+"deg");
   bit.style.setProperty("--spark-delay",(index*18)+"ms");
   bit.style.setProperty("--spark-size",index%2?".72rem":".95rem");
   document.body.appendChild(bit);
   setTimeout(function(){bit.remove()},740);
  });
 }
 const root=document.getElementById("app")||document.body;
 new MutationObserver(addClosetEntry).observe(root,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",addClosetEntry,{once:true});
 addClosetEntry();
 document.addEventListener("click",sparkle,true);
})();
