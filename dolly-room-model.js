/* Dolly's bedroom: a local-first, tappable furniture model.
   The only confirmed spatial relationship is vanity beneath a window.
   Other positions on this illustrative sketch are NOT verified. */
(function(){
 "use strict";
 const ROOM="Dolly’s bedroom",FLOOR="Second floor",ZONE="dolly";
 const ITEMS={
  bed:{label:"Bed",symbol:"🛏",description:"White sleigh bed beneath Dolly’s Mario poster, beside one window; pale-purple bedding and patterned blankets seen in earlier photos.",location:"Beneath Mario poster · beside window (confirmed)",sections:["Bedding","Pillows","Blankets"]},
  dresser:{label:"Dresser",symbol:"▤",description:"Long, low brown dresser with ten small upper drawers and four larger lower drawers, with brass-colored handles. Positioned along the former Barbie-house wall opposite the foot of the bed.",location:"Former Barbie-house wall, opposite bed footboard",sections:[]},
  vanity:{label:"Vanity",symbol:"✧",description:"White vanity stays beneath the other bedroom window.",location:"Under second window (confirmed)",sections:["Vanity top","Other storage"]},
  dollhouse:{label:"Barbie house",symbol:"⌂",description:"Large pink Barbie house beside the closet, with its playable side facing into the bedroom.",location:"Beside closet · playable side faces into room (confirmed)",sections:["Dolls","Doll clothes","Accessories","Mini furniture"]},
  closet:{label:"Closet",symbol:"▥",description:"Closet for less frequently used toys. Shift the Barbie house slightly when access is needed.",location:"Adjacent to Barbie house · access by shifting house slightly (confirmed)",sections:["Less-used toys","Toy rotation","Other stored items"]}
 };
 function html(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
 function encoded(v){return encodeURIComponent(String(v)).replace(/'/g,"%27")}
 function store(){return state.homeFurnitureRecords&&typeof state.homeFurnitureRecords==="object"?state.homeFurnitureRecords:{}}
 function record(key){return store()["dolly."+key]||{}}
 function sections(key){return key==="dresser"?(Array.isArray(record(key).drawers)?record(key).drawers:[]):ITEMS[key].sections}
 function values(key,section){const list=record(key).contents?.[section];return Array.isArray(list)?list:[]}
 function taskList(key){return (state.tasks||[]).filter(x=>x.homeMapFloor===FLOOR&&x.homeMapZoneId===ZONE&&x.homeObjectKey===key&&!x.duplicateHidden&&!x.paused)}
 async function update(key,fn,returnSection){
  const old=state.homeFurnitureRecords;
  const all={...store()};
  const prev=record(key);
  const next={...prev,contents:{...(prev.contents||{})},drawers:[...(prev.drawers||[])]};
  fn(next);all["dolly."+key]=next;state.homeFurnitureRecords=all;
  try{await save()}catch(e){
   if(old===undefined)delete state.homeFurnitureRecords;else state.homeFurnitureRecords=old;
   alert("The change could not be saved on this device. Nothing was recorded.");
   return;
  }
  if(typeof render==="function")render();
  if(returnSection)window.dollyOpenSection(key,returnSection);else window.dollyOpenObject(key);
 }

 function furnitureSide(key){
  // Local coordinates match the original art's bounding box, with a narrower but genuinely redrawn side.
  if(key==="dresser")return '<g>'+
   '<ellipse cx="118" cy="168" rx="111" ry="13" fill="#60422e" opacity=".17"/>'+
   '<path d="M5 49L192 9L240 35L51 80Z" fill="#b77b50" stroke="#65402c" stroke-width="3"/>'+
   '<path d="M51 80L240 35L240 125L51 170Z" fill="#8c5535" stroke="#593721" stroke-width="3"/>'+
   '<path d="M5 49L51 80L51 170L5 139Z" fill="#6f422b" stroke="#543221" stroke-width="3"/>'+
   '<path d="M61 91L228 52M61 115L228 76M61 139L228 100" stroke="#a16b48" stroke-width="2" opacity=".5"/>'+
   '<path d="M60 169L239 124" stroke="#5e3b29" stroke-width="5"/>'+
   '</g>';
  if(key==="vanity")return '<g>'+
   '<ellipse cx="95" cy="206" rx="94" ry="12" fill="#75606e" opacity=".12"/>'+
   '<path d="M47 16Q47 4 63 4L128 4Q144 4 144 17L144 90L47 90Z" fill="#c7ac69" stroke="#a58a4b" stroke-width="4"/>'+
   '<path d="M53 19Q53 11 65 11L125 11Q138 11 138 20L138 84L53 84Z" fill="#dcecf2" stroke="#f9e9bc" stroke-width="3"/>'+
   '<path d="M7 104L146 104L186 121L45 123Z" fill="#fff" stroke="#c5babb" stroke-width="3"/>'+
   '<path d="M7 104L45 123L45 200L7 180Z" fill="#f4f0ee" stroke="#c5babb" stroke-width="3"/>'+
   '<path d="M45 123L186 121L186 188L45 200Z" fill="#fffdfb" stroke="#c5babb" stroke-width="3"/>'+
   '<path d="M58 135L173 133L173 154L58 157ZM58 161L173 157L173 177L58 182Z" fill="#f9f8f6" stroke="#c7bbbb" stroke-width="2"/>'+
   '<circle cx="115" cy="145" r="3" fill="#b6a8a6"/><circle cx="115" cy="170" r="3" fill="#b6a8a6"/>'+
   '</g>';
  if(key==="barbie")return '<g>'+
   '<ellipse cx="106" cy="278" rx="98" ry="12" fill="#725066" opacity=".14"/>'+
   '<path d="M24 62L113 22L204 61L116 103Z" fill="#f6a5d1" stroke="#bd709d" stroke-width="4"/>'+
   '<path d="M24 62L116 103L116 264L24 226Z" fill="#e4a1c5" stroke="#bb7e9f" stroke-width="4"/>'+
   '<path d="M116 103L204 61L204 226L116 264Z" fill="#f8c8e0" stroke="#bb7e9f" stroke-width="4"/>'+
   '<path d="M122 150L198 116M122 206L198 172" stroke="#bc946a" stroke-width="7"/>'+
   '<path d="M129 100L129 257M193 69L193 231" stroke="#d3ad80" stroke-width="6"/>'+
   '<path d="M39 91L94 116L94 158L39 135Z" fill="#cde7ef" stroke="#fff3f6" stroke-width="4"/>'+
   '<path d="M24 226L116 264L204 226" fill="none" stroke="#b98b5c" stroke-width="6"/>'+
   '</g>';
  return "";
 }
 function modelObject(key,body){
  const name=ITEMS[key].label;
  const extraHitArea=key==="closet"?'<rect x="514" y="181" width="80" height="140" fill="transparent" pointer-events="all" aria-hidden="true"/>':"";
  return '<g class="dolly-scene-object dolly-svg-'+key+'" data-room-piece="'+key+'" role="button" tabindex="0" aria-label="Open Dolly’s '+html(name)+' details"'+
    ' onclick="if(!window.dollyIsArranging())dollyOpenObject(&#39;'+key+'&#39;)"'+
    ' onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();dollyOpenObject(&#39;'+key+'&#39;)}">'+(furnitureSide(key)?'<g class="dolly-view-front">'+body+'</g><g class="dolly-view-side" style="display:none" transform="'+({dresser:'translate(48 237) scale(1.35 .88)',vanity:'translate(240 145) scale(.78)',dollhouse:'translate(493 165) scale(.48)'}[key]||'')+'">'+furnitureSide(key)+'</g>':body)+extraHitArea+'</g>';
 }
 // Layered vector furniture with visible tops, fronts, shadows and depth.
 // These are visual approximations, not photographs or measured dimensions.
 function bedDrawing(){
  return '<g class="dolly-drawn-bed">'+
   '<ellipse cx="263" cy="368" rx="131" ry="40" fill="#665671" opacity=".17"/>'+
   // Four short white feet and the near-side frame under the mattress.
   '<path d="M133 302L133 336L143 340L143 300Z" fill="#fafafa" stroke="#a49aab" stroke-width="2"/>'+
   '<path d="M276 360L276 399L287 394L287 358Z" fill="#fcfcff" stroke="#9e96a7" stroke-width="2"/>'+
   '<path d="M360 313L360 350L371 344L371 309Z" fill="#f9f9fe" stroke="#aba4b1" stroke-width="2"/>'+
   '<path d="M119 277L215 230L380 317L283 367Z" fill="#f7f5fb" stroke="#afa7b8" stroke-width="3"/>'+
   '<path d="M283 367L380 317L380 337L283 386Z" fill="#e3dfe9" stroke="#aca4b2" stroke-width="2"/>'+
   '<path d="M119 277L283 367L283 386L119 295Z" fill="#fcfbff" stroke="#aaa4b1" stroke-width="2"/>'+
   // Upright white wooden headboard, raised above the mattress.
   '<path d="M115 273L115 212Q122 203 133 205Q158 187 187 171Q207 155 218 177Q226 180 225 195L221 238Z" fill="url(#dollyWhiteFrame)" stroke="#aca4b0" stroke-width="3"/>'+
   '<path d="M127 225Q151 211 172 194Q189 174 206 176Q216 185 210 197L210 230L127 264Z" fill="#fffefa" stroke="#ded7e3" stroke-width="2"/>'+
   '<path d="M170 194Q180 179 191 184Q200 189 189 193M178 198Q189 190 196 202M186 190Q192 178 200 181" fill="none" stroke="#dbd4cb" stroke-width="2.6" stroke-linecap="round"/>'+
   '<path d="M113 207L113 288M222 178L222 244" stroke="#fff" stroke-width="11" stroke-linecap="round"/>'+
   '<path d="M113 207L113 288M222 178L222 244" stroke="#aaa0b0" stroke-width="2.2" fill="none"/>'+
   // Lavender fitted mattress and a folded, patterned comforter.
   '<path d="M123 275L219 231L370 313L277 358Z" fill="url(#dollyLavenderSheet)" stroke="#e8dff1" stroke-width="2"/>'+
   '<path d="M226 242L305 284L211 331L131 287Z" fill="#3379c6" stroke="#245991" stroke-width="2"/>'+
   '<path d="M158 293L177 302L170 309L150 299M202 313L222 320L216 328L193 320" fill="#dc5f54" opacity=".9"/>'+
   '<path d="M195 267L207 274L200 282L188 276Z" fill="#f2c54a"/>'+
   '<path d="M216 254L253 274" fill="none" stroke="#84b9e7" stroke-width="4" opacity=".8"/>'+
   '<path d="M148 286Q168 277 184 279T219 272M201 310Q224 294 248 301M223 267Q244 272 258 282" fill="none" stroke="#9d7f9e" stroke-width="4" opacity=".56"/>'+
   '<path d="M183 269L206 258L225 268L203 280Z" fill="#c0b5ce" opacity=".63"/>'+
   '<path d="M242 290L260 286L275 301L258 307Z" fill="#8e9ab9" opacity=".68"/>'+
   '<path d="M194 301L211 292L226 300L207 311Z" fill="#d7a7a8" opacity=".76"/>'+
   // A white pillow, rather than inventing an exact pillow count.
   '<path d="M157 272Q153 261 163 258L199 242Q209 238 215 245L234 256Q238 263 229 267L183 288Q171 292 166 283Z" fill="url(#dollyPillow)" stroke="#d5d0d7" stroke-width="2"/>'+
   '<path d="M164 272L223 251" stroke="#ede9ed" stroke-width="2" opacity=".8"/>'+
   '<path d="M269 351Q301 358 339 334Q364 318 378 307L380 367Q348 396 282 397Q272 383 269 368Z" fill="url(#dollyWhiteFrame)" stroke="#a9a1b3" stroke-width="3"/>'+
   '<path d="M286 367Q314 381 353 353M316 358Q327 345 335 348Q343 357 329 363M333 354Q340 345 349 348" fill="none" stroke="#ded9d2" stroke-width="2.5"/>'+
   '<path d="M276 354Q321 362 370 316" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>'+
   '</g>';
 }
 function vanityDrawing(){
  // Wide white double-pedestal vanity with drawers, bowed tabletop and the
  // real gold-toned, rectangular arched-top mirror.
  let drawer='';
  for(let row=0;row<3;row++){
   const yL=126+row*20,yR=121+row*20;
   drawer+='<path d="M11 '+yL+'L55 '+(yL+8)+'L55 '+(yL+24)+'L11 '+(yL+16)+'Z" fill="#fbfaf8" stroke="#c3b6b3" stroke-width="1.8"/>'+
      '<circle cx="32" cy="'+(yL+12)+'" r="3.6" fill="#f1eeeb" stroke="#aa9997" stroke-width="1.3"/>'+
      '<path d="M135 '+yR+'L178 '+(yR-10)+'L178 '+(yR+7)+'L135 '+(yR+17)+'Z" fill="#fbfaf8" stroke="#c3b6b3" stroke-width="1.8"/>'+
      '<circle cx="158" cy="'+(yR+3)+'" r="3.5" fill="#f1eeeb" stroke="#aa9997" stroke-width="1.3"/>';
  }
  return '<g class="dolly-drawn-vanity">'+
   '<ellipse cx="101" cy="194" rx="95" ry="17" fill="#65576a" opacity=".16"/>'+
   // Gold-toned arched tabletop mirror behind the wide desk.
   '<path d="M43 92L43 42Q43 12 76 9L138 10Q153 11 154 33L154 86L141 92Z" fill="#bda56f" stroke="#9b824f" stroke-width="3"/>'+
   '<path d="M49 85L49 41Q49 19 78 17L136 17Q147 18 148 35L148 80L138 87Z" fill="url(#dollyMirror)" stroke="#f8e8b9" stroke-width="2.6"/>'+
   '<path d="M59 40L91 24" stroke="#fff" stroke-width="3" opacity=".7"/>'+
   '<path d="M95 88L95 103M109 88L109 102" stroke="#b49b69" stroke-width="4"/>'+
   // Slightly bowed, overhanging wooden tabletop and carved drawer lip.
   '<path d="M1 107L120 88L186 111Q149 126 94 136Q42 139 1 122Z" fill="#fffdfb" stroke="#b8a8a6" stroke-width="2.6"/>'+
   '<path d="M2 122Q46 141 94 136Q148 126 185 112L185 125Q132 146 94 149Q36 148 2 135Z" fill="#eee8e7" stroke="#baaca9" stroke-width="2"/>'+
   '<path d="M10 132L55 141L55 202L10 183Z" fill="#f8f6f3" stroke="#b7aaa9" stroke-width="2.5"/>'+
   '<path d="M134 138L178 125L178 183L134 196Z" fill="#f8f6f3" stroke="#b7aaa9" stroke-width="2.5"/>'+
   '<path d="M58 140Q96 149 132 138L132 154Q99 165 58 157Z" fill="#f8f6f7" stroke="#baabae" stroke-width="1.8"/>'+
   '<circle cx="97" cy="154" r="3" fill="#c6baba" stroke="#a79b9b"/>'+
   drawer+
   '<path d="M10 185L55 204L55 211L9 191M133 197L179 183L179 192L133 205" fill="#e7e0de" stroke="#b8aeab" stroke-width="2"/>'+
   '</g>';
 }
 function dresserDrawing(){
  // Wide brown dresser with two banks of smaller drawers above larger lower
  // drawers, per the actual photo. This is a drawing, NOT an inventory count.
  function pt(u,v){return [77+183*u,95-51*u+72*v]}
  function face(u0,u1,v0,v1){
   const p=[pt(u0,v0),pt(u1,v0),pt(u1,v1),pt(u0,v1)];
   return 'M'+p.map(x=>x.map(n=>n.toFixed(1)).join(' ')).join('L')+'Z';
  }
  let drawers='';
  for(let row=0;row<2;row++){
   for(let col=0;col<5;col++){
    let u0=col/5+.01,u1=(col+1)/5-.01,v0=.025+row*.235,v1=v0+.205;
    const center=pt((u0+u1)/2,(v0+v1)/2);
    drawers+='<path d="'+face(u0,u1,v0,v1)+'" fill="#945b37" stroke="#5d341e" stroke-width="1.7"/>'+
      '<circle cx="'+center[0].toFixed(1)+'" cy="'+center[1].toFixed(1)+'" r="2.7" fill="#d7b270" stroke="#5d3c24" stroke-width=".6"/>';
   }
  }
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
   const u0=col*.5+.014,u1=(col+1)*.5-.014,v0=.52+row*.235,v1=v0+.209;
   drawers+='<path d="'+face(u0,u1,v0,v1)+'" fill="'+(row?'#96603e':'#a56d47')+'" stroke="#643c27" stroke-width="2"/>';
   for(const u of [u0+(u1-u0)*.22,u0+(u1-u0)*.78]){
    const c=pt(u,(v0+v1)/2);
    drawers+='<path d="M'+(c[0]-6).toFixed(1)+' '+(c[1]-1).toFixed(1)+'q6 8 12 -3" fill="none" stroke="#d0a55b" stroke-width="3" stroke-linecap="round"/>'+
      '<circle cx="'+(c[0]-7).toFixed(1)+'" cy="'+(c[1]-2).toFixed(1)+'" r="2" fill="#b1864c"/>'+
      '<circle cx="'+(c[0]+7).toFixed(1)+'" cy="'+(c[1]-2).toFixed(1)+'" r="2" fill="#b1864c"/>';
   }
  }
  return '<g class="dolly-drawn-dresser">'+
   '<ellipse cx="147" cy="163" rx="126" ry="27" fill="#513020" opacity=".18"/>'+
   '<path d="M12 52L193 1L271 42L77 94Z" fill="#98613c" stroke="#643c25" stroke-width="3"/>'+
   '<path d="M12 52L77 94L77 168L12 124Z" fill="#754326" stroke="#56301d" stroke-width="3"/>'+
   '<path d="M77 94L260 43L260 115L77 167Z" fill="#ad7044" stroke="#59351e" stroke-width="3"/>'+
   '<path d="M16 51L193 2L264 41" fill="none" stroke="#c48b60" stroke-width="5" stroke-linecap="round"/>'+
   drawers+
   '<path d="M79 166L260 115L257 124L78 175Z" fill="#59341e" stroke="#4d2e20" stroke-width="2"/>'+
   '<path d="M15 124L75 168L75 177L15 134Z" fill="#664029"/>'+
   '</g>';
 }
 function dollhouseDrawing(){
  // The photographed Barbie/KidKraft house: broad three-level exposed
  // rooms, pink curved roof pieces and visible pale wooden supports.
  // Tiny in-room shapes illustrate its furnishings, not counted inventory.
  const floors=[104,174,245];
  const frame=floors.map(y=>'<path d="M9 '+y+'L188 '+(y-8)+'L201 '+(y+1)+'L17 '+(y+13)+'Z" fill="#c99b6c" stroke="#9e704c" stroke-width="2"/>').join('');
  const posts=[12,67,124,190].map(x=>'<path d="M'+x+' 68L'+(x+5)+' 67L'+(x+7)+' 275L'+x+' 276Z" fill="#d8b785" stroke="#ac8357" stroke-width="1.6"/>').join('');
  return '<g class="dolly-drawn-dollhouse">'+
   '<ellipse cx="112" cy="277" rx="111" ry="20" fill="#6f5164" opacity=".16"/>'+
   '<path d="M10 70L76 57L197 65L198 268L12 280Z" fill="#f9c8df" stroke="#d48eab" stroke-width="3"/>'+
   // Real room-print motifs and interior windows on the back panels.
   '<rect x="17" y="81" width="45" height="19" rx="2" fill="#c0e6f6" stroke="#efeffd" stroke-width="3"/>'+
   '<rect x="92" y="81" width="48" height="19" rx="2" fill="#b1dcee" stroke="#f7dded" stroke-width="3"/>'+
   '<rect x="145" y="86" width="42" height="28" rx="2" fill="#f9e1ed" stroke="#d88ead" stroke-width="2"/>'+
   '<path d="M13 165L197 155M13 235L197 226" stroke="#d883af" stroke-width="3" stroke-dasharray="5 4" opacity=".5"/>'+
   '<rect x="23" y="185" width="43" height="26" fill="#ecc7e4" stroke="#f4f0f1" stroke-width="2"/>'+
   '<path d="M74 184L102 166L133 184Z" fill="#f6b7d7"/>'+
   // Broad, asymmetrical CURVED pink roof, with distinct small left wing.
   '<path d="M8 64Q32 27 91 21Q151 14 197 42L199 65Q132 38 81 48Q40 52 12 76Z" fill="#d77faa" stroke="#894e78" stroke-width="4"/>'+
   '<path d="M8 67Q22 44 53 38L69 55L21 79Z" fill="#ef9fc3" stroke="#b76d94" stroke-width="3"/>'+
   '<path d="M72 33Q140 18 191 45" fill="none" stroke="#f5bdd7" stroke-width="4" stroke-linecap="round"/>'+
   // Three open stories: no wall blocking the playable interior.
   frame+posts+
   '<path d="M197 67L208 71L208 276L197 268Z" fill="#cd8fac" stroke="#97647e" stroke-width="2"/>'+
   // Open central stairs similar to the photographed playset.
   '<path d="M156 154L187 123L190 131L162 162Z" fill="#d775aa"/>'+
   '<path d="M163 153L193 164M169 146L195 156M175 139L196 148" stroke="#aa477c" stroke-width="3"/>'+
   // Hint of upper purple seating, middle pink seating and lower toy furniture.
   '<path d="M36 85L57 85L59 102L34 104Z" fill="#9d77c9" stroke="#71599e" stroke-width="2"/>'+
   '<path d="M82 158L126 156L132 168L78 172Z" fill="#f1a1cb" stroke="#c071a0" stroke-width="2"/>'+
   '<path d="M28 224L52 224L52 245L28 245Z" fill="#a9cae7" stroke="#7fa4c8" stroke-width="2"/>'+
   '<path d="M98 229L128 229L128 241L98 241Z" fill="#dfaddb" stroke="#aa78ab" stroke-width="2"/>'+
   '<path d="M15 276L204 270" stroke="#b98b5c" stroke-width="6"/>'+
   '</g>';
 }
 function windowDrawing(){
  return '<g aria-label="Window above vanity">'+
   '<path d="M407 96L532 152L532 222L407 168Z" fill="#fff" stroke="#b8a1bd" stroke-width="5"/>'+
   '<path d="M417 107L521 157L521 210L417 161Z" fill="url(#dollyWindowGlass)" stroke="#fefeff" stroke-width="2"/>'+
   '<path d="M468 132L468 186M417 135L521 180" stroke="#fff" stroke-width="5"/>'+
   '<path d="M408 169L532 225" stroke="#e5d3e7" stroke-width="7"/>'+
   '</g>';
 }

 function bedWindowDrawing(){
  // Bed is beside this window; angle and wall widths are schematic.
  return '<g aria-label="Window beside bed">'+
   '<path d="M51 175L123 140L123 204L51 240Z" fill="#fff" stroke="#b49cbf" stroke-width="5"/>'+
   '<path d="M59 180L115 153L115 201L59 228Z" fill="url(#dollyWindowGlass)" stroke="#fff" stroke-width="2"/>'+
   '<path d="M87 167L87 215M60 206L115 180" stroke="#fff" stroke-width="4"/>'+
   '<path d="M48 240L127 203" stroke="#eee1f1" stroke-width="6"/>'+
   '</g>';
 }
 function marioPosterDrawing(){
  // Poster placement and Mario motif are confirmed; illustration is simplified.
  return '<g aria-label="Mario poster above sleigh bed">'+
   '<path d="M160 129L241 90L241 171L160 208Z" fill="#fff" stroke="#957e9c" stroke-width="3"/>'+
   '<path d="M166 133L235 99L235 164L166 198Z" fill="#85c8ee"/>'+
   '<path d="M176 145L225 121L225 136L176 161Z" fill="#e94f48"/>'+
   '<path d="M180 165L197 155L210 167L222 163L222 176L200 188L177 183Z" fill="#e94f48"/>'+
   '<path d="M187 160L203 153L205 165L192 173Z" fill="#f3bd8b"/>'+
   '<path d="M201 155L215 150L219 157L208 163Z" fill="#4d3a37"/>'+
   '<text x="201" y="116" text-anchor="middle" font-weight="900" font-size="11" fill="#fff">MARIO</text>'+
   '</g>';
 }
 function closetDrawing(){
  // White interior closet door stays BEHIND the large Barbie house.
  // The narrow access route is deliberately visible, not dimensionally measured.
  return '<g aria-label="White closet door behind Barbie house">'+
   '<path d="M553 153L594 172L594 313L553 294Z" fill="#fffefc" stroke="#aa9da9" stroke-width="3"/>'+
   '<path d="M559 162L585 175L585 296L559 283Z" fill="#f5f3f4" stroke="#d4cbd3" stroke-width="2"/>'+
   '<path d="M565 174L580 181L580 226L565 220ZM565 231L580 239L580 280L565 273Z" fill="#fff" stroke="#ddd6db" stroke-width="1.5"/>'+
   '<circle cx="583" cy="244" r="3.2" fill="#aa9e9f"/>'+
   '<path d="M592 311L606 319L606 359" fill="none" stroke="#bb85bc" stroke-width="3" stroke-dasharray="5 5"/>'+
   '</g>';
 }
 function entryDoorDrawing(){
  // The door exists; its precise position and swing were not surveyed.
  return '<g aria-label="Bedroom entry; exact position on the wall is unverified">'+
   '<path d="M280 438L336 457" stroke="#faf8ff" stroke-width="8" stroke-linecap="round"/>'+
   '<path d="M287 431L287 451Q309 464 338 450" stroke="#9e84a9" stroke-width="2" stroke-dasharray="5 4" fill="none"/>'+
   '<text x="310" y="436" text-anchor="middle" class="dolly-scene-small">Entry*</text></g>';
 }
 const LAYOUT_KEY="dailyLifeDollyRoomLayout_v1";
 let arranging=false;
 let selectedPiece=null;
 function pieceTransform(el,p){
  // Rotate the artwork in place: anchor every view to the same original dresser footprint.
  const direction=((Math.round((Number(p.angle)||0)/90)%4)+4)%4;
  const front=el.querySelector(".dolly-view-front"),side=el.querySelector(".dolly-view-side");
  if(front&&side){
    front.style.display=direction%2===0?"":"none";
    side.style.display=direction%2===1?"":"none";
  }
  const x=Number(p.x),y=Number(p.y);
  return "translate("+(Number.isFinite(x)?x:0)+" "+(Number.isFinite(y)?y:0)+")";
 }
  function layoutRead(){try{return JSON.parse(localStorage.getItem(LAYOUT_KEY)||"{}")||{}}catch(_){return {}}}
 function layoutApply(root){
  if(!root)return;
  const saved=layoutRead();
  root.querySelectorAll(".dolly-scene-object[data-room-piece]").forEach(el=>{
   const p=saved[el.dataset.roomPiece]||{};
   el.setAttribute("transform",pieceTransform(el,p));
   el.style.filter=arranging&&selectedPiece===el.dataset.roomPiece?"drop-shadow(0 0 5px #e05bb0)":"";
   el.style.touchAction=arranging?"none":"";
   el.style.cursor=arranging?"grab":"pointer";
  });
  const button=document.getElementById("dollyArrangeToggle");
  if(button)button.textContent=arranging?"Done arranging":"Arrange room";
  const reset=document.getElementById("dollyArrangeReset");
  if(reset)reset.hidden=!arranging;
  const rotate=document.getElementById("dollyRotateTools");if(rotate){rotate.hidden=!arranging;rotate.style.display=arranging?"flex":"none";}
  const name=document.getElementById("dollySelectedPiece");if(name)name.textContent=selectedPiece?"Selected: "+(ITEMS[selectedPiece]?.label||selectedPiece):"Tap a piece to select, then rotate";
 }
 window.dollyIsArranging=function(){return arranging};
 window.dollyToggleArrange=function(){arranging=!arranging;if(!arranging)selectedPiece=null;layoutApply(document.querySelector(".dolly-mini-svg"))};
 window.dollyRotateSelected=function(direction){
  if(!arranging||!selectedPiece)return;
  const all=layoutRead(),p=all[selectedPiece]||{};
  all[selectedPiece]={...p,angle:((Math.round((Number(p.angle)||0)/90)*90)+direction*90+360)%360};
  try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(all))}catch(_){}
  layoutApply(document.querySelector(".dolly-mini-svg"));
 };
 window.dollyRecoverPiece=function(){
  const all=layoutRead();const key=selectedPiece||"dresser";all[key]={x:0,y:0,angle:0};
  try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(all))}catch(_){}
  layoutApply(document.querySelector(".dolly-mini-svg"));
 };
 window.dollyRestoreVanity=function(){
  const all=layoutRead();
  // Recover only the missing vanity; other saved placements are untouched.
  all.vanity={...(all.vanity||{}),x:0,y:0,angle:0};
  try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(all))}catch(_){}
  layoutApply(document.querySelector(".dolly-mini-svg"));
 };
 window.dollyResetArrange=function(){if(!confirm("Reset furniture positions in Dolly’s miniature? Inventory and tasks will stay saved."))return;localStorage.removeItem(LAYOUT_KEY);layoutApply(document.querySelector(".dolly-mini-svg"))};
 window.dollyScenePointerDown=function(event){
  if(!arranging)return;
  const obj=event.target.closest(".dolly-scene-object[data-room-piece]");
  const svg=event.currentTarget;
  if(!obj||!svg.contains(obj))return;
  event.preventDefault();
  const key=obj.dataset.roomPiece,base=layoutRead()[key]||{x:0,y:0};
  selectedPiece=key;layoutApply(svg);
  const point=svg.createSVGPoint();
  function coord(e){point.x=e.clientX;point.y=e.clientY;return point.matrixTransform(svg.getScreenCTM().inverse())}
  const start=coord(event);let latest={x:Number(base.x)||0,y:Number(base.y)||0};
  svg.setPointerCapture(event.pointerId);
  const move=e=>{
   if(e.pointerId!==event.pointerId)return;
   const now=coord(e);
   latest={x:Math.max(-165,Math.min(165,(Number(base.x)||0)+now.x-start.x)),y:Math.max(-125,Math.min(125,(Number(base.y)||0)+now.y-start.y))};
   obj.setAttribute("transform",pieceTransform(obj,{...base,...latest}));
  };
  const stop=e=>{
   if(e.pointerId!==event.pointerId)return;
   svg.removeEventListener("pointermove",move);
   svg.removeEventListener("pointerup",stop);
   svg.removeEventListener("pointercancel",stop);
   const all=layoutRead();all[key]={...base,...latest};
   try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(all))}catch(_){}
   layoutApply(svg);
  };
  svg.addEventListener("pointermove",move);
  svg.addEventListener("pointerup",stop);
  svg.addEventListener("pointercancel",stop);
 };


// The approved floor plan is the single source for both views.
// Project floor coordinates onto the miniature's floor quadrilateral.
// This intentionally leaves the user's old miniature localStorage untouched.
function dollyPerspectiveSync(){
 const svg=document.querySelector(".dolly-mini-svg");if(!svg)return;
 // The miniature is an illustrative camera angle, not a geometrically accurate
 // isometric projection of the floor plan. Each furniture type has a calibrated
 // visual anchor so the real wall relationships remain legible.
 const anchors={
  bed:{x:218,y:341,scale:.78,refX:12,refY:9},
  vanity:{x:260,y:225,scale:.72,refX:126,refY:4},
  dresser:{x:349,y:418,scale:.85,refX:12,refY:210},
  dollhouse:{x:519,y:343,scale:.79,refX:249,refY:51}
 };
 for(const key of Object.keys(anchors)){
  const el=svg.querySelector('[data-room-piece="'+key+'"]');if(!el)continue;
  const p=floorData(key),cfg=anchors[key];
  const art=el.querySelector(".dolly-view-front")||el;
  let box;try{box=art.getBBox()}catch(_){continue}
  if(!box.width||!box.height)continue;
  // Small adjustments reflect floor-plan dragging without placing objects on
  // the wrong wall in this stylized camera view.
  const dx=((Number(p.x)||0)-cfg.refX)*.36;
  const dy=((Number(p.y)||0)-cfg.refY)*.36;
  el.setAttribute("transform","translate("+(cfg.x+dx).toFixed(2)+" "+(cfg.y+dy).toFixed(2)+") scale("+cfg.scale+") translate("+(-box.x-box.width/2).toFixed(2)+" "+(-box.y-box.height).toFixed(2)+")");
 }
}

 // A separate, true floor-plan arranger. The old miniature and its saved positions are untouched.
 const FLOOR_KEY="dailyLifeDollyFloorPlan_photoReference_v5"; // independent of user-edited v2 layout
 const FLOOR_ITEMS={
  // Plan orientation: top = Mario/headboard + vanity window wall;
  // left = footboard window; right = closet and entry wall;
  // bottom = black tapestry / long dresser wall.
  // Units are visual estimates from photographs, not inches.
  bed:{label:"Bed",w:109,h:200,color:"#eee9ff",x:12,y:9,angle:0},
  dresser:{label:"Dresser",w:198,h:48,color:"#a66a42",x:12,y:210,angle:0},
  vanity:{label:"Vanity",w:118,h:46,color:"#f8f7f3",x:126,y:4,angle:0},
  dollhouse:{label:"Barbie house",w:138,h:51,color:"#f3a3ce",x:249,y:51,angle:90}
 };
 let floorSelected="dresser";
 function floorRead(){try{return JSON.parse(localStorage.getItem(FLOOR_KEY)||"{}")||{}}catch(_){return {}}}
 function floorSave(data){try{localStorage.setItem(FLOOR_KEY,JSON.stringify(data))}catch(_){}}
 function floorData(key){return {...FLOOR_ITEMS[key],...(floorRead()[key]||{})}}
 function floorClamp(v,min,max){return Math.max(min,Math.min(max,v))}
 function floorDraw(){
  const root=document.getElementById("dollyFloorPlan");if(!root)return;
  const svg=root.querySelector("svg");if(!svg)return;
  const pieces=Object.keys(FLOOR_ITEMS).map(key=>{
   const p=floorData(key),turned=((p.angle/90)%2+2)%2===1;
   const w=turned?p.h:p.w,h=turned?p.w:p.h;
   const x=floorClamp(Number(p.x)||0,0,300-w),y=floorClamp(Number(p.y)||0,0,260-h);
   const selected=floorSelected===key;
   // Draw in the object's unrotated local coordinates. Rotation changes its
   // footprint, never stretches or substitutes a different piece of furniture.
   const tx=turned?(p.angle===90?p.h:0):0;
   const ty=turned?(p.angle===90?0:p.w):0;
   const angle=((p.angle%360)+360)%360;
   const artwork=key==="bed"?
    '<rect x="4" y="4" width="'+(p.w-8)+'" height="'+(p.h-8)+'" rx="6" fill="#d8c8eb"/>'+
    '<path d="M4 24Q'+(p.w/2)+' -2 '+(p.w-4)+' 24" fill="none" stroke="#fff" stroke-width="10"/>'+
    '<rect x="13" y="34" width="'+(p.w-26)+'" height="45" rx="9" fill="#fff"/>'+
    '<path d="M12 82h'+(p.w-24)+'v64H12Z" fill="#6f9bce" opacity=".85"/>'+
    '<path d="M4 '+(p.h-18)+'Q'+(p.w/2)+' '+(p.h+1)+' '+(p.w-4)+' '+(p.h-18)+'" fill="none" stroke="#fff" stroke-width="9"/>' :
    key==="dresser"?
    '<rect x="2" y="2" width="'+(p.w-4)+'" height="'+(p.h-4)+'" rx="3" fill="#ad744b" stroke="#653d27" stroke-width="3"/>'+
    Array.from({length:5},(_,i)=>'<rect x="'+(7+i*(p.w-14)/5)+'" y="6" width="'+((p.w-18)/5)+'" height="13" rx="1" fill="#b98659" stroke="#78492f"/><circle cx="'+(13+i*(p.w-14)/5+(p.w-18)/10)+'" cy="12" r="2" fill="#e8c78e"/>').join("")+
    '<path d="M6 23H'+(p.w-6)+'M'+(p.w/2)+' 23V'+(p.h-5)+'" stroke="#71472e" stroke-width="2"/>'+
    '<circle cx="'+(p.w/4)+'" cy="34" r="2" fill="#e8c78e"/><circle cx="'+(p.w*3/4)+'" cy="34" r="2" fill="#e8c78e"/>' :
    key==="vanity"?
    '<rect x="2" y="2" width="'+(p.w-4)+'" height="'+(p.h-4)+'" rx="4" fill="#fffdf9" stroke="#b7a7aa" stroke-width="3"/>'+
    '<rect x="6" y="7" width="25" height="'+(p.h-14)+'" fill="#ece8e8" stroke="#b7a7aa"/>'+
    '<rect x="'+(p.w-31)+'" y="7" width="25" height="'+(p.h-14)+'" fill="#ece8e8" stroke="#b7a7aa"/>'+
    '<rect x="35" y="7" width="'+(p.w-70)+'" height="'+(p.h-14)+'" rx="4" fill="#dce8ed" stroke="#c8ac70" stroke-width="3"/>' :
    '<rect x="2" y="2" width="'+(p.w-4)+'" height="'+(p.h-4)+'" rx="4" fill="#e69fca" stroke="#ae6a96" stroke-width="3"/>'+
    '<rect x="7" y="7" width="'+(p.w-14)+'" height="'+(p.h-14)+'" fill="#f9d3e7" stroke="#bc779c"/>'+
    '<path d="M'+(p.w/3)+' 7V'+(p.h-7)+'M'+(2*p.w/3)+' 7V'+(p.h-7)+'" stroke="#bb8b64" stroke-width="4"/>'+
    '<path d="M7 '+(p.h-11)+'H'+(p.w-7)+'" stroke="#b46c99" stroke-width="4"/>';
   return '<g data-floor-key="'+key+'" tabindex="0" role="button" aria-label="Move '+p.label+'" style="cursor:grab;touch-action:none" transform="translate('+x+' '+y+')">'+
    '<g transform="translate('+tx+' '+ty+') rotate('+angle+')">'+artwork+'</g>'+
    '<rect width="'+w+'" height="'+h+'" fill="transparent" stroke="'+(selected?'#be428e':'transparent')+'" stroke-width="3" rx="4"/>'+
    '<text x="'+(w/2)+'" y="'+(h/2)+'" font-size="'+(key==='dollhouse'?9:12)+'" font-weight="700" text-anchor="middle" fill="#302b33" stroke="#fff" stroke-width="3" paint-order="stroke" pointer-events="none">'+p.label+'</text></g>';
  }).join("");
  svg.innerHTML='<rect x="0" y="0" width="300" height="260" fill="#f8f0e8" stroke="#ad8ba9" stroke-width="5"/>'+
   '<path d="M0 0H300V260H0Z" fill="none" stroke="#7f667d" stroke-width="7"/>'+
   '<path d="M123 0h120" stroke="#a7dcef" stroke-width="11"/><path d="M0 74v104" stroke="#a7dcef" stroke-width="11"/>'+
   '<path d="M300 44v112" stroke="#fff" stroke-width="12"/><path d="M300 198v55" stroke="#fff" stroke-width="12"/>'+
   '<text x="180" y="18" font-size="11" text-anchor="middle" fill="#594b58">Vanity window</text>'+
   '<text x="10" y="70" font-size="11" fill="#594b58">Footboard window</text>'+
   '<text x="291" y="37" text-anchor="end" font-size="12" fill="#594b58">Closet</text>'+
   '<text x="291" y="189" text-anchor="end" font-size="11" fill="#594b58">Entry</text>'+
   '<path d="M300 253L255 253A45 45 0 0 0 300 208" fill="none" stroke="#b2a0a4" stroke-width="2" stroke-dasharray="4 3"/><path d="M300 253L255 253" stroke="#927b85" stroke-width="3"/>'+
   '<text x="60" y="18" font-size="12" fill="#594b58">Mario poster</text>'+pieces;
  dollyPerspectiveSync();
  const label=root.querySelector("#dollyFloorSelected");if(label)label.textContent="Selected: "+FLOOR_ITEMS[floorSelected].label;
 }
 window.dollyFloorSelect=function(key){if(!FLOOR_ITEMS[key])return;floorSelected=key;floorDraw()};
 window.dollyFloorTurn=function(dir){
  const data=floorRead(),p=floorData(floorSelected);
  const oldW=p.angle%180?p.h:p.w,oldH=p.angle%180?p.w:p.h;
  const next=(p.angle+dir*90+360)%360;
  const newW=next%180?p.h:p.w,newH=next%180?p.w:p.h;
  data[floorSelected]={...p,angle:next,x:floorClamp(p.x+(oldW-newW)/2,0,300-newW),y:floorClamp(p.y+(oldH-newH)/2,0,260-newH)};
  floorSave(data);floorDraw();
 };
 window.dollyFloorSnap=function(){
  const data=floorRead(),p=floorData(floorSelected),w=p.angle%180?p.h:p.w,h=p.angle%180?p.w:p.h;
  const edges=[{d:p.x,x:0,y:p.y},{d:p.y,x:p.x,y:0},{d:300-(p.x+w),x:300-w,y:p.y},{d:260-(p.y+h),x:p.x,y:260-h}].sort((a,b)=>a.d-b.d);
  data[floorSelected]={...p,x:edges[0].x,y:edges[0].y};floorSave(data);floorDraw();
 };
 window.dollyFloorOpen=function(){
  const root=document.getElementById("dollyFloorPlan");if(!root)return;
  root.hidden=false;root.style.display="block";floorDraw();root.scrollIntoView({block:"nearest",behavior:"smooth"});
 };
 window.dollyFloorClose=function(){const root=document.getElementById("dollyFloorPlan");if(root){root.hidden=true;root.style.display="none"}};
 window.dollyFloorPointerDown=function(event){
  const obj=event.target.closest("[data-floor-key]");if(!obj)return;
  const key=obj.dataset.floorKey;floorSelected=key;
  const svg=event.currentTarget,base=floorData(key),point=svg.createSVGPoint();
  const coord=e=>{point.x=e.clientX;point.y=e.clientY;return point.matrixTransform(svg.getScreenCTM().inverse())};
  const start=coord(event),w=base.angle%180?base.h:base.w,h=base.angle%180?base.w:base.h;
  svg.setPointerCapture(event.pointerId);event.preventDefault();floorDraw();
  const move=e=>{
   if(e.pointerId!==event.pointerId)return;
   const now=coord(e),data=floorRead();
   data[key]={...base,x:floorClamp(base.x+now.x-start.x,0,300-w),y:floorClamp(base.y+now.y-start.y,0,260-h)};
   floorSave(data);floorDraw();
  };
  const stop=e=>{if(e.pointerId!==event.pointerId)return;svg.removeEventListener("pointermove",move);svg.removeEventListener("pointerup",stop);svg.removeEventListener("pointercancel",stop)};
  svg.addEventListener("pointermove",move);svg.addEventListener("pointerup",stop);svg.addEventListener("pointercancel",stop);
 };
 window.dollyRoomSceneHtml=function(){
  setTimeout(()=>{layoutApply(document.querySelector(".dolly-mini-svg"));dollyPerspectiveSync()},0);
  const assets='<defs>'+
   '<linearGradient id="dollyWallLeft" x2="1" y2="1"><stop stop-color="#fbf5fc"/><stop offset="1" stop-color="#ead9ef"/></linearGradient>'+
   '<linearGradient id="dollyWallRight" x2="1" y2=".7"><stop stop-color="#fff7f6"/><stop offset="1" stop-color="#e3cfe0"/></linearGradient>'+
   '<linearGradient id="dollyWoodFloor" x2=".8" y2="1"><stop stop-color="#bc8155"/><stop offset=".55" stop-color="#a76c41"/><stop offset="1" stop-color="#85522f"/></linearGradient>'+
   '<linearGradient id="dollyWhiteFrame" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".55" stop-color="#f6f3fb"/><stop offset="1" stop-color="#d8d3e0"/></linearGradient>'+
   '<linearGradient id="dollyLavenderSheet" x2=".9" y2="1"><stop stop-color="#f1e6fc"/><stop offset=".48" stop-color="#cfc2ee"/><stop offset="1" stop-color="#b8acd8"/></linearGradient>'+
   '<linearGradient id="dollyBlanket" x2="1" y2=".75"><stop stop-color="#b5c1d7"/><stop offset=".4" stop-color="#d2a7b4"/><stop offset=".75" stop-color="#aaa0c1"/><stop offset="1" stop-color="#e0c4b6"/></linearGradient>'+
   '<linearGradient id="dollyPillow" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#e7e4ed"/></linearGradient>'+
   '<linearGradient id="dollyMirror" x2="1" y2=".5"><stop stop-color="#d5e7f2"/><stop offset="1" stop-color="#fdf7ff"/></linearGradient>'+
   '<linearGradient id="dollyDresserWood" x2="1" y2=".8"><stop stop-color="#b88756"/><stop offset="1" stop-color="#5d3624"/></linearGradient>'+
   '<linearGradient id="dollyWindowGlass" x2="1" y2="1"><stop stop-color="#c0e4fa"/><stop offset="1" stop-color="#eaf2ff"/></linearGradient>'+
   '</defs>';
  const room='<rect width="620" height="470" rx="18" fill="#e8dbea"/>'+
   '<path d="M26 183L305 50L305 192L26 320Z" fill="url(#dollyWallLeft)" stroke="#c5b4cb" stroke-width="3"/>'+
   '<path d="M305 50L592 180L592 321L305 192Z" fill="url(#dollyWallRight)" stroke="#c5b4cb" stroke-width="3"/>'+
   '<path d="M26 320L305 192L592 321L314 451Z" fill="url(#dollyWoodFloor)" stroke="#af99a9" stroke-width="3"/>'+
   '<path d="M26 332L314 461L592 332L592 321L314 451L26 320Z" fill="#c8a7ae" opacity=".8"/>'+
   '<path d="M64 324L341 205M111 347L387 232M157 370L436 251M203 395L479 271M249 415L525 292M300 442L574 314" stroke="#6c3f26" stroke-width="2" opacity=".32"/><path d="M105 353L133 341M215 386L239 377M367 315L404 297M460 353L491 339" stroke="#d3a479" stroke-width="2" opacity=".25"/>'+
   '<path d="M26 183L305 50L592 180" fill="none" stroke="#fffafa" stroke-width="9" stroke-linejoin="round"/>'+
   // The Mario poster and vanity-side window occupy the LEFT wall, not the entry/closet wall.
   '<g transform="translate(-82 37) scale(.88)">'+marioPosterDrawing()+'</g>'+
   // Smaller frame toward the back corner, with a clear gap from the Mario poster.
   '<g transform="translate(220 -15) scale(.72)">'+bedWindowDrawing()+'</g>'+
   // The bed-side window is on the perpendicular RIGHT wall. Its frame follows that wall perspective.
   '<g transform="translate(-55 -5)" aria-label="Window beside the long side of Dolly’s bed">'+
   '<path d="M363 90L451 129L451 191L363 151Z" fill="#fff" stroke="#b8a1bd" stroke-width="5"/>'+
   '<path d="M373 103L440 133L440 177L373 146Z" fill="url(#dollyWindowGlass)" stroke="#fff" stroke-width="2"/>'+
   '<path d="M407 119L407 161M374 124L440 155" stroke="#fff" stroke-width="4"/>'+
   '<path d="M361 153L453 195" stroke="#e5d3e7" stroke-width="6"/>'+
   '</g>';
  const bed='<g transform="translate(83 77) scale(.82)">'+bedDrawing()+'</g>';
  const dresser='<g transform="translate(158 315) scale(.82 .52)">'+dresserDrawing()+'</g>';
  const vanity='<g transform="translate(207 117) scale(.68)">'+vanityDrawing()+'</g>';
  const barbie='<g transform="translate(442 205) scale(.69)">'+dollhouseDrawing()+'</g>';
  return '<section class="dolly-room-card dolly-room-3d" aria-label="Dolly’s current bedroom arrangement">'+
   '<div class="dolly-room-heading"><div><small>DOLLY’S BEDROOM</small><h3>Her rearranged room</h3></div><span>Tap furniture</span></div>'+
   '<div class="dolly-room-arrange-tools" style="position:relative;z-index:2;padding:12px 6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-height:56px"><button type="button" onclick="dollyFloorOpen()">Floor-plan arranger</button><button type="button" id="dollyArrangeToggle" onclick="dollyFloorOpen()">Arrange room</button><button type="button" id="dollyArrangeReset" onclick="dollyResetArrange()" hidden>Reset positions</button><button type="button" onclick="dollyRestoreVanity()" id="dollyRestoreVanity" title="Bring missing vanity back into view">Find vanity</button><span id="dollyRotateTools" style="display:none;flex-wrap:wrap;gap:6px;align-items:center;width:100%" hidden><span id="dollySelectedPiece">Tap a piece to select, then rotate</span> <button type="button" onclick="dollyRotateSelected(-1)" aria-label="Turn selected furniture left 90 degrees">↶ Turn left</button> <button type="button" onclick="dollyRotateSelected(1)" aria-label="Turn selected furniture right 90 degrees">↷ Turn right</button> <button type="button" onclick="dollyRecoverPiece()">Bring selected back</button></span></div><div id="dollyFloorPlan" hidden style="display:none;padding:12px;border:1px solid #d6bcd5;border-radius:18px;margin:12px 0;background:#fff8ff"><strong>Dolly’s photographed room · top view</strong><p>Closer photo-based spacing: bed beside vanity, dresser near footboard, Barbie house close to vanity and closet. Drag and rotate without changing furniture size. This new reference plan preserves your earlier saved layout.</p><div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0"><button type="button" onclick="dollyFloorTurn(-1)">↶ Turn left</button><button type="button" onclick="dollyFloorTurn(1)">↷ Turn right</button><button type="button" onclick="dollyFloorSnap()">Snap to wall</button><button type="button" onclick="dollyFloorClose()">Close floor plan</button></div><p id="dollyFloorSelected">Selected: Dresser</p><svg viewBox="0 0 300 260" style="display:block;width:100%;max-width:560px;touch-action:none" onpointerdown="dollyFloorPointerDown(event)" aria-label="Top down bedroom furniture arranger"></svg></div><div class="dolly-room-scene dollhouse-view"><svg onpointerdown="dollyScenePointerDown(event)" class="dolly-mini-svg" viewBox="0 0 620 470" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Illustrated miniature: white sleigh bed under Mario poster beside a window; vanity under the second window; brown dresser on former Barbie wall; large pink Barbie house by closet with front facing into room; entry door placement illustrative.">'+
   assets+room+
   modelObject("closet",closetDrawing().replace(/553/g,"493").replace(/594/g,"534").replace(/559/g,"499").replace(/585/g,"525").replace(/565/g,"505").replace(/580/g,"520").replace(/583/g,"523").replace(/592/g,"532").replace(/606/g,"546"))+
   modelObject("vanity",vanity)+
   modelObject("dresser",dresser)+
   modelObject("bed",bed)+
   modelObject("dollhouse",barbie)+
   '<g aria-label="Closet label" pointer-events="none"><rect x="482" y="188" width="65" height="29" rx="12" fill="#fffafc" stroke="#c1a9c8" stroke-width="2"/><text x="514" y="207" text-anchor="middle" class="dolly-scene-small">Closet ↗</text></g>'+
   '<g aria-label="Bedroom entry"><path d="M550 153L591 172L591 313L550 294Z" fill="#fffdfb" stroke="#ad9da8" stroke-width="3"/><path d="M556 162L582 175L582 296L556 283Z" fill="#f5f2f5" stroke="#d1c7d2" stroke-width="2"/><path d="M562 175L577 182L577 228L562 221ZM562 234L577 241L577 282L562 275Z" fill="#fff" stroke="#ddd6db" stroke-width="1.5"/><circle cx="558" cy="245" r="3" fill="#ae9a86"/><text x="568" y="146" text-anchor="middle" class="dolly-scene-small">Entry</text></g>'+ 
   '<g aria-label="Light switch between entry and closet"><rect x="541" y="233" width="8" height="13" rx="1" fill="#fff" stroke="#9c8c96"/><path d="M545 236v6" stroke="#857883"/></g>'+
   '</svg></div>'+
   '<p class="dolly-room-caveat"><b>Confirmed arrangement:</b> white sleigh bed under Mario poster beside one window; white vanity under the other; long brown dresser on the former Barbie wall; large open-front pink Barbie house near the closet. Shift the house slightly to access the closet.</p>'+
   '<p class="dolly-room-caveat">The top-down plan above is the placement reference. The perspective below is an illustration, not a second floor plan.</p>'+ 
   '<p class="dolly-room-caveat">Miniature, not measured geometry. Relative relationships are confirmed; wall lengths, precise doorway position (*) and clearances are not.</p>'+
   '<details class="dolly-hallway-details"><summary>Hallway staging (October 16) · 3 playsets</summary>'+
   '<p>Wooden dollhouse · pink-roof dollhouse · cat-ear pretend kitchen. These are not counted as contents of Dolly’s room.</p></details>'+
   '<div class="dolly-room-helper">Tap furniture or closet to open upkeep, drawers, supplies or stored-toy lists. Dolly’s photographed October 15 clean-room baseline remains valid as a reference; visible belongings do not become unfinished tasks.</div>'+
   '</section>';
 };

 window.dollyOpenObject=function(key){
  const item=ITEMS[key];if(!item)return;
  const d=record(key),opts=sections(key),tasks=taskList(key),done=tasks.filter(t=>t.done).length;
  let controls="";
  if(key==="bed"){
   const history=Array.isArray(d.beddingHistory)?d.beddingHistory.filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))):[];
   const recorded=[...new Set([d.lastBeddingChanged,...history].filter(Boolean))].sort().reverse();
   controls='<div class="dolly-detail-stat"><b>Last bedding change</b><span>'+
    html(recorded[0]||"Not recorded")+'</span></div>'+
    '<button class="btn primary" type="button" onclick="dollyEditBeddingDate()">Record bedding change</button>'+
    '<details class="dolly-bedding-history"><summary>Previous bedding changes ('+recorded.length+')</summary>'+
    (recorded.length?recorded.map(date=>'<p>'+html(date)+'</p>').join(""):'<p>No changes recorded yet.</p>')+'</details>';
  }
  const compartments=opts.map(section=>{
   const count=values(key,section).length;
   return '<button class="dolly-compartment" type="button" onclick="dollyOpenSection(&#39;'+key+'&#39;,&#39;'+encoded(section)+'&#39;)">'+
    '<span><b>'+html(section)+'</b><small>'+(count?count+" recorded entries":"Contents not inventoried")+'</small></span><span aria-hidden="true">›</span></button>';
  }).join("");
  const content='<div class="dolly-detail">'+
   '<div class="dolly-detail-known"><strong>'+html(item.description)+'</strong><small>'+html(item.location)+'</small></div>'+
   controls+
   '<div class="dolly-detail-head"><b>'+ (key==="dresser"?"Clickable dresser drawers":"Inventory compartments")+'</b>'+
   '<span>'+opts.length+' listed</span></div>'+
   (compartments||'<p class="dolly-room-caveat">No drawers identified yet. Add them as you check them; the number and contents are not assumed.</p>')+
   (key==="dresser"?'<button class="btn primary" onclick="dollyAddDrawer()">+ Add a drawer</button>':"")+
   (key==="closet"?'<p class="dolly-closet-access">Access note: the Barbie house can slide slightly when Dolly needs to open the closet. Less-used toys and toy-rotation storage can be recorded here as you check them.</p>':"")+
   '<div class="dolly-detail-head"><b>Related tasks</b><span>'+done+' / '+tasks.length+' done</span></div>'+
   (tasks.length?tasks.slice(0,12).map(t=>'<div class="dolly-task-line"><span>'+html(t.title||"Task")+'</span><small>'+(t.done?"✓ Complete":"Not done")+'</small></div>').join(""):'<p class="dolly-room-caveat">No tasks linked to this furniture yet.</p>')+
   '<button class="btn" type="button" onclick="dollyObjectAddTask(&#39;'+key+'&#39;)">+ Add a task</button>'+
   (key==="bed"?'<button class="btn" type="button" onclick="dollySuggestBedTask(&#39;bedding&#39;)">+ Change bedding task</button>'+
   '<button class="btn" type="button" onclick="dollySuggestBedTask(&#39;frame&#39;)">+ Clean bed frame task</button>':"")+
   '<button class="btn" type="button" onclick="houseVisualOpenZone(&#39;Second floor&#39;,&#39;dolly&#39;)">← Dolly’s room</button>'+
   '</div>';
  modal("Dolly’s "+item.label,content,"Close",closeModal);
 };
 window.dollyEditBeddingDate=function(){
  const old=record("bed").lastBeddingChanged||"";
  modal("Dolly’s bedding",'<div class="dolly-detail"><p>Record the date you actually changed her bedding. Leave blank if unknown.</p>'+
    '<label>Last changed<input id="dollyBeddingDate" type="date" value="'+html(old)+'"></label>'+
    '<button class="btn" onclick="dollyOpenObject(&#39;bed&#39;)">← Bed details</button></div>',
    "Save date",async()=>{
      const date=String(document.getElementById("dollyBeddingDate")?.value||"");
      if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)){alert("Choose a valid date.");return}
      if(date&&typeof ymd==="function"&&date>ymd()){alert("A bedding change date cannot be in the future.");return}
      await update("bed",d=>{
       if(date){
        const previous=Array.isArray(d.beddingHistory)?d.beddingHistory.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x))):[];
        d.beddingHistory=[...new Set([d.lastBeddingChanged,...previous,date].filter(Boolean))].sort();
        d.lastBeddingChanged=d.beddingHistory[d.beddingHistory.length-1];
       }else{
        d.lastBeddingChanged="";
       }
      });
    });
 };
 window.dollyOpenSection=function(key,sectionEncoded){
  if(!ITEMS[key])return;
  const section=decodeURIComponent(sectionEncoded);
  if(!sections(key).includes(section))return;
  const lines=values(key,section);
  modal(ITEMS[key].label+" · "+section,
   '<div class="dolly-detail"><p>Enter only items you have checked. One description per line; leave empty if not inventoried.</p>'+
   '<label>Contents<textarea id="dollySectionContents" rows="7" placeholder="Nothing recorded yet">'+html(lines.join("\n"))+'</textarea></label>'+
   '<small>Entries here describe storage contents; they do not automatically create a new confirmed stock count.</small>'+
   '<button class="btn" onclick="dollyOpenObject(&#39;'+key+'&#39;)">← '+html(ITEMS[key].label)+'</button></div>',
   "Save contents",async()=>{
     const raw=String(document.getElementById("dollySectionContents")?.value||"");
     const list=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
     if(list.length>60||list.some(x=>x.length>150)){alert("Keep each description under 150 characters, up to 60 entries.");return}
     await update(key,d=>{d.contents[section]=list;});
   });
 };
 window.dollyAddDrawer=function(){
  modal("Add dresser drawer",'<div class="dolly-detail"><p>Name a real drawer by its position, such as “top left”. The app will not assume how many drawers the dresser has.</p>'+
    '<label>Drawer label<input id="dollyDrawerLabel" maxlength="80" placeholder="e.g. Top left drawer"></label>'+
    '<button class="btn" onclick="dollyOpenObject(&#39;dresser&#39;)">← Dresser</button></div>',
    "Add drawer",async()=>{
     const label=String(document.getElementById("dollyDrawerLabel")?.value||"").trim();
     if(!label||label.length>80){alert("Give the drawer a short label.");return}
     const d=record("dresser");
     if((d.drawers||[]).some(x=>x.toLowerCase()===label.toLowerCase())){alert("That drawer is already listed.");return}
     if((d.drawers||[]).length>=24){alert("This dresser already has 24 recorded drawer slots.");return}
     await update("dresser",next=>{next.drawers.push(label);});
    });
 };
 window.dollyObjectAddTask=function(key){
  if(!ITEMS[key]||typeof openTask!=="function")return;
  openTask("","",false,{floor:FLOOR,zoneId:ZONE,roomName:ROOM,objectKey:key});
 };
 window.dollySuggestBedTask=function(type){
  if(typeof openTask!=="function")return;
  window.dollyObjectAddTask("bed");
  const title=type==="frame"?"Clean Dolly’s bed frame":"Change Dolly’s bedding";
  // This only PREFILLS an editor. It never creates or marks a task complete.
  setTimeout(()=>{
   const input=document.getElementById("task");
   if(input)input.value=title;
  },0);
 };

})();
