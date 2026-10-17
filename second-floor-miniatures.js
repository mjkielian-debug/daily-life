/* Second-floor miniature scenes. Illustrative geometry, not measured. No personal photos or IDs in public code. */
(function(){
"use strict";
const esc=s=>String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
function scene(kind){
const bath=kind==="bathroom";
const objects=bath?[
["tub","Bathtub","<rect x='45' y='86' width='155' height='84' rx='14' fill='#fafcff' stroke='#a9b9c8' stroke-width='5'/><rect x='60' y='99' width='126' height='56' rx='12' fill='#b7e5ee'/><path d='M43 90 Q80 108 115 90 T198 90' stroke='#efc0cb' stroke-width='9' fill='none' stroke-dasharray='16 6'/>"],
["window","Window","<rect x='118' y='17' width='74' height='45' fill='#bfe8f4' stroke='white' stroke-width='7'/><path d='M155 18v42 M120 39h70' stroke='white' stroke-width='4'/>"],
["organizer","Shower organizer","<rect x='192' y='69' width='23' height='78' rx='4' fill='#d6b4cf'/><path d='M194 94h20M194 118h20' stroke='#fff' stroke-width='3'/>"],
["mat","Bath mat","<rect x='90' y='190' width='90' height='43' rx='13' fill='#d4a8bd' opacity='.95'/>"],
["storage","Storage baskets","<rect x='232' y='156' width='54' height='41' rx='7' fill='#c9a47c'/><path d='M240 165h38m-38 10h38m-38 10h38' stroke='#9b7858' stroke-width='3'/>"],
["vent","Floor vent","<rect x='219' y='220' width='45' height='12' rx='2' fill='#8f9298'/><path d='M227 221v10m8-10v10m8-10v10m8-10v10' stroke='#e2e2e2' stroke-width='2'/>"]
]:[
["stairs","Stairs","<path d='M236 72h92v142h-92z' fill='#bd9770'/><path d='M238 90h88m-88 19h88m-88 19h88m-88 19h88m-88 19h88m-88 19h88' stroke='#815c45' stroke-width='5'/>"],
["railing","Railing","<path d='M222 75v145M222 75h-14v145h14' fill='none' stroke='#f8f8f8' stroke-width='9'/><path d='M210 101h12m-12 25h12m-12 25h12m-12 25h12' stroke='#b4b4b4' stroke-width='3'/>"],
["bathroom","Bathroom door","<rect x='40' y='36' width='65' height='75' fill='#faf8f2' stroke='#b9a898' stroke-width='6'/><circle cx='95' cy='75' r='4' fill='#bd9b5c'/>"],
["bedrooms","Bedroom doors","<rect x='124' y='17' width='70' height='66' fill='#fff8f0' stroke='#ad9c88' stroke-width='6'/><circle cx='182' cy='51' r='4' fill='#bd9b5c'/>"],
["window","Hall window","<rect x='247' y='17' width='63' height='46' fill='#bfe7f4' stroke='white' stroke-width='6'/><path d='M278 20v42M250 40h57' stroke='white' stroke-width='3'/>"],
["organizer","Hall organizer","<rect x='57' y='169' width='53' height='56' rx='7' fill='#e2a16b'/><path d='M60 187h47M60 204h47' stroke='#fff1dc' stroke-width='4'/>"],
["plants","Plants and shoes","<circle cx='150' cy='198' r='18' fill='#8ba978'/><rect x='138' y='208' width='25' height='18' fill='#c4a280'/><path d='M180 226q10-24 22 0z' fill='#9f8eb9'/>"]
];
const parts=objects.map(([id,label,shape])=>'<g class="dl-mini-item" tabindex="0" role="button" aria-label="'+esc(label)+'" data-item="'+id+'">'+shape+'</g>').join("");
return '<section class="dl-mini"><h3>'+ (bath?"Upstairs bathroom":"Second-floor hallway")+' · miniature</h3><p class="small">Illustrative Sims-style view · positions are approximate. Tap an object to view its details.</p><svg viewBox="0 0 360 285" role="img" aria-label="'+(bath?"Miniature upstairs bathroom":"Miniature upstairs hallway")+'"><path d="M24 63 L181 15 L337 63 L337 241 L181 275 L24 241 Z" fill="#d1ab82" stroke="#97765d" stroke-width="5"/><path d="M24 63 L181 15 L337 63 L181 112 Z" fill="#f7f0e6" opacity=".9"/><path d="M24 63 L24 241 L181 275 L181 112 Z" fill="#e8ded0" opacity=".5"/>'+parts+'</svg><div class="dl-mini-info" aria-live="polite">Select an object to see what is mapped.</div></section>';
}
const info={bathroom:{tub:"Bathtub and floral shower curtain",window:"Bathroom window",organizer:"Hanging shower organizer",mat:"Bath mat",storage:"Bathroom storage baskets",vent:"Floor vent"},hallway:{stairs:"Stairs and landing",railing:"White railing",bathroom:"Bathroom entrance",bedrooms:"Bedroom doorways; exact door spacing not measured",window:"Hallway window",organizer:"Orange organizer",plants:"Plants and shoes"}};
window.dailyLifeMiniatureSvg=function(kind){
 const markup=scene(kind),match=markup.match(/<svg\s+viewBox=["']([^"']+)["'][^>]*>([\s\S]*?)<\/svg>/i);
 return match?{viewBox:match[1],markup:match[2]}:null;
};
window.dailyLifeMiniScene=function(kind){return scene(kind)};
document.addEventListener("click",e=>{const g=e.target.closest?.(".dl-mini-item");if(!g)return;const panel=g.closest(".dl-mini");const kind=panel?.querySelector("h3")?.textContent.includes("bathroom")?"bathroom":"hallway";const out=panel?.querySelector(".dl-mini-info");if(out)out.textContent=info[kind][g.dataset.item]||"Mapped object";});
document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches?.(".dl-mini-item")){e.preventDefault();e.target.dispatchEvent(new MouseEvent("click",{bubbles:true}))}});
})();