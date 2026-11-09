/* Monster High collection tracker for Daily Life. Photos show dolls/products, not character art. */
const MONSTER_HIGH_STARTER = [
  {id:"g1-basic-clawdeen",name:"Clawdeen Wolf",line:"Basic",generation:"G1",year:"2010",image:"https://i.etsystatic.com/7843813/r/il/b65216/7402213287/il_1080xN.7402213287_r6pp.jpg",source:"Public doll listing"},
  {id:"g1-basic-draculaura",name:"Draculaura",line:"Basic",generation:"G1",year:"2010",image:"https://i.ebayimg.com/images/g/tH8AAeSw865ounm4/s-l500.png",source:"Public doll listing"},
  {id:"g1-basic-frankie",name:"Frankie Stein",line:"Basic",generation:"G1",year:"2010",image:"https://i.ebayimg.com/images/g/HMsAAOSwFdFjj~h6/s-l1200.jpg",source:"Public doll listing"},
  {id:"g1-basic-lagoona",name:"Lagoona Blue",line:"Basic",generation:"G1",year:"2010",image:"https://media-photos.depop.com/b1/17256346/1942356383_213a87100de54668952fe3b5197f474f/P0.jpg",source:"Public doll listing"},
  {id:"g1-basic-cleo",name:"Cleo de Nile",line:"Basic",generation:"G1",year:"2010",image:"https://u-mercari-images.mercdn.net/photos/m68511841687_3.jpg?_=1760919083&quality=75&width=2560",source:"Public doll listing"},
  {id:"g1-basic-ghoulia",name:"Ghoulia Yelps",line:"Basic",generation:"G1",year:"2010",image:"https://i.ebayimg.com/images/g/2HkAAeSw2OplaHQS/s-l1200.jpg",source:"Public doll listing"},
  {id:"g3-core-draculaura",name:"Draculaura",line:"Core Dolls: Wave 1",generation:"G3",year:"2022",image:"https://media.karousell.com/media/photos/products/2022/12/22/monster_high_draculaura_g3_dol_1671688497_6a439471_progressive.jpg",source:"Public doll listing"},
  {id:"g3-core-frankie",name:"Frankie Stein",line:"Core Dolls: Wave 1",generation:"G3",year:"2022",image:"https://static.insales-cdn.com/images/products/1/7146/625114090/large_monster-high-frankie-stein-watzie-pet-01.jpg",source:"Public doll listing"},
  {id:"g3-core-clawdeen",name:"Clawdeen Wolf",line:"Core Dolls: Wave 1",generation:"G3",year:"2022",image:"https://i.ebayimg.com/images/g/LAIAAOSwEIBjYb7X/s-l1200.jpg",source:"Public doll listing"},
  {id:"g3-core-lagoona",name:"Lagoona Blue",line:"Core Dolls: Wave 1",generation:"G3",year:"2022",image:"https://cdn11.bigcommerce.com/s-ptvounu/images/stencil/1280x1280/products/953/23918/HHK55__43557.1670161104.jpg?c=2",source:"Public doll listing"},
  {id:"g3-core-cleo",name:"Cleo de Nile",line:"Core Dolls: Wave 1",generation:"G3",year:"2022",image:"https://www.iperbimbo.it/cdn/shop/files/Mattel-HXH74-Copia1-Iperbimbo.jpg?v=1753860970&width=3840",source:"Public doll listing"},
  {id:"g3-core-ghoulia",name:"Ghoulia Yelps",line:"Core Dolls: Wave 1",generation:"G3",year:"2022",image:"https://i5.walmartimages.com/seo/Monster-High-Ghoulia-Yelps-Doll-Monster-High-G3-2022_be2bb1b3-0a22-426f-b0fa-530d688e3327.b2746ea76cc4f8cda7feb1b1a60ce399.jpeg",source:"Public doll listing"}
];

let monsterHighSearch="",monsterHighGeneration="All",monsterHighOwnedFilter="All";
function monsterHighData(){
  if(!state.monsterHighCollection||typeof state.monsterHighCollection!=="object")state.monsterHighCollection={ownership:{},custom:[]};
  state.monsterHighCollection.ownership=state.monsterHighCollection.ownership||{};
  state.monsterHighCollection.custom=Array.isArray(state.monsterHighCollection.custom)?state.monsterHighCollection.custom:[];
  return state.monsterHighCollection;
}
function monsterHighOwnedCount(rows,owner){
  const data=monsterHighData();
  return rows.filter(x=>data.ownership[x.id]?.[owner]).length;
}
function monsterHighCard(x,data){
  const owned=data.ownership[x.id]||{};
  const source=x.source||"Added by you";
  return `<article class="mh-doll-card">
    <div class="mh-photo-wrap">${x.image?'<img loading="lazy" src="'+esc(x.image)+'" alt="'+esc(x.name)+' doll" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="mh-photo-fallback" hidden>🦇<small>Photo unavailable</small></div>':'<div class="mh-photo-fallback">🦇<small>Add a product photo URL</small></div>'}</div>
    <div class="mh-doll-info"><div class="mh-badges"><span>${esc(x.generation||"")}</span><span>${esc(x.year||"")}</span></div><h3>${esc(x.name)}</h3><p>${esc(x.line||"Release")}</p>
      <label class="mh-owned"><input type="checkbox" ${owned.Michelle?"checked":""} onchange="toggleMonsterHighOwned('${esc(x.id)}','Michelle',this.checked)"><span>Michelle has it</span></label>
      <label class="mh-owned"><input type="checkbox" ${owned.Dolly?"checked":""} onchange="toggleMonsterHighOwned('${esc(x.id)}','Dolly',this.checked)"><span>Dolly has it</span></label>
      <small class="mh-photo-source">Doll photo · ${esc(source)}</small>
    </div>
  </article>`;
}
function monsterHighCollectionView(){
  const data=monsterHighData(),rows=[...MONSTER_HIGH_STARTER,...data.custom];
  const q=monsterHighSearch.trim().toLowerCase();
  const filtered=rows.filter(x=>{
    const matchesText=!q||[x.name,x.line,x.generation,x.year].some(v=>String(v||"").toLowerCase().includes(q));
    const matchesGen=monsterHighGeneration==="All"||x.generation===monsterHighGeneration;
    const owns=data.ownership[x.id]||{};
    const matchesOwner=monsterHighOwnedFilter==="All"|| (monsterHighOwnedFilter==="Michelle"?!!owns.Michelle:monsterHighOwnedFilter==="Dolly"?!!owns.Dolly:!owns.Michelle&&!owns.Dolly);
    return matchesText&&matchesGen&&matchesOwner;
  });
  const title="Monster High collection";
  return `<section class="mh-collection-page">
    <div class="card mh-hero"><div class="mh-topline"><button class="btn small" onclick="setView('hobbies')">‹ Hobbies</button><span class="eyebrow">GROWTH & HOBBIES · DOLL COLLECTION</span></div>
      <h1>${title}</h1><p>Keep track of your dolls together. These are actual doll/product photos, not character portraits.</p>
      <div class="mh-stats"><div><b>${rows.length}</b><span>in this starter catalog</span></div><div><b>${monsterHighOwnedCount(rows,"Michelle")}</b><span>Michelle has</span></div><div><b>${monsterHighOwnedCount(rows,"Dolly")}</b><span>Dolly has</span></div></div>
      <div class="mh-actions"><button class="btn primary" onclick="openMonsterHighAdd()">＋ Add a doll</button><a class="btn" href="https://www.mh-merch.com/dolls/all/" target="_blank" rel="noopener">Browse full visual archive ↗</a></div>
      <p class="mh-note">The linked archive covers 1,000+ releases with release and series photos. The in-app starter catalog is smaller; add any other release you find at Goodwill.</p>
    </div>
    <div class="card mh-controls"><label>Search dolls<input type="search" value="${esc(monsterHighSearch)}" placeholder="Name or series" oninput="monsterHighSearch=this.value;render()"></label>
      <label>Generation<select onchange="monsterHighGeneration=this.value;render()"><option ${monsterHighGeneration==="All"?"selected":""}>All</option><option ${monsterHighGeneration==="G1"?"selected":""}>G1</option><option ${monsterHighGeneration==="G2"?"selected":""}>G2</option><option ${monsterHighGeneration==="G3"?"selected":""}>G3</option></select></label>
      <label>Show<select onchange="monsterHighOwnedFilter=this.value;render()"><option value="All" ${monsterHighOwnedFilter==="All"?"selected":""}>All dolls</option><option value="Michelle" ${monsterHighOwnedFilter==="Michelle"?"selected":""}>Michelle has</option><option value="Dolly" ${monsterHighOwnedFilter==="Dolly"?"selected":""}>Dolly has</option><option value="Needed" ${monsterHighOwnedFilter==="Needed"?"selected":""}>Neither has</option></select></label>
    </div>
    <div class="mh-doll-grid">${filtered.map(x=>monsterHighCard(x,data)).join("")||'<div class="notice">No dolls match these filters. Try “All” or add a release.</div>'}</div>
    <p class="mh-credit">The product photos are hotlinked from public doll listings for identification. Photo availability can change; use the full archive for more releases and variants.</p>
  </section>`;
}
async function toggleMonsterHighOwned(id,owner,checked){
  const data=monsterHighData();
  data.ownership[id]=data.ownership[id]||{};
  data.ownership[id][owner]=!!checked;
  try{await save();render()}catch(error){data.ownership[id][owner]=!checked;alert("Could not save that collection update. Please try again.");render()}
}
function openMonsterHighCollection(){monsterHighSearch="";monsterHighGeneration="All";monsterHighOwnedFilter="All";setView("monsterhigh")}
function openMonsterHighAdd(){
  modal("Add a Monster High doll",`<div class="stack">
    <label>Doll name<input id="mh-name" placeholder="For example, Twyla Boogeyman"></label>
    <div class="grid2"><label>Generation<select id="mh-generation"><option>G1</option><option>G2</option><option>G3</option><option>Unknown</option></select></label><label>Release year<input id="mh-year" inputmode="numeric" placeholder="Optional"></label></div>
    <label>Series or look<input id="mh-line" placeholder="For example, Creepover Party"></label>
    <label>Real doll/product photo URL<input id="mh-image" type="url" placeholder="Paste a product photo link (optional)"></label>
    <div class="muted small">Use a photo of the physical doll or its product listing, not character art. You can add ownership after saving.</div>
  </div>`,"Add doll",async()=>{
    const name=$("#mh-name")?.value.trim();if(!name)return;
    const data=monsterHighData(),id="custom-"+uid();
    data.custom.push({id,name,generation:$("#mh-generation").value,year:$("#mh-year").value.trim(),line:$("#mh-line").value.trim()||"Release",image:$("#mh-image").value.trim(),source:"Added by Michelle"});
    try{await save();closeModal();render()}catch(error){data.custom=data.custom.filter(x=>x.id!==id);alert("Could not save that doll. Please try again.")}
  });
}
