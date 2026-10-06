
const SPIRITUAL_READINGS=[
 {lens:"Unitarian Universalist-inspired",title:"Interdependence",body:"Nothing you do exists in isolation. Your choices touch a web of people, places, histories, and living things. Let connection be a reason for care rather than pressure.",practice:"Choose one small action that makes the web around you gentler."},
 {lens:"Buddhist-inspired",title:"Begin again",body:"Attention wanders. Plans change. Feelings rise and pass. Practice is noticing and returning without turning the return into a punishment.",practice:"Take three slow breaths and begin the next thing from here."},
 {lens:"Earth-centered",title:"Notice the season",body:"Growth, fullness, release, rest, and return all belong. Let the season outside remind you that changing pace is not failure.",practice:"Step outside or look through a window and name three signs of the season."},
 {lens:"Pagan / Wiccan-inspired",title:"Tend what you mean to grow",body:"Intention becomes practice through ordinary acts. Name what you are tending, then give it one concrete act of care.",practice:"Light a candle, hold a warm drink, or touch the earth while naming one intention."},
 {lens:"Humanist / mystical",title:"Make meaning on purpose",body:"Meaning is not only something you discover; it is also something you build through attention, relationship, curiosity, and choice.",practice:"Choose one ordinary task to do with full attention."},
 {lens:"Unitarian Universalist-inspired",title:"Pluralism",body:"More than one path can hold wisdom. You can learn from a tradition without surrendering your questions.",practice:"Write down one belief you are curious about rather than certain about."},
 {lens:"Buddhist-inspired",title:"Enough for this moment",body:"The mind often tries to solve the next hour, week, and future at once. Return to what is actually here.",practice:"Name five things you can sense right now."},
 {lens:"Earth-centered",title:"Reciprocity",body:"Receiving and giving are part of the same cycle. Gratitude becomes deeper when it changes how you participate.",practice:"Thank one person, place, animal, or living system through an action."},
 {lens:"Unitarian Universalist-inspired",title:"Love as practice",body:"Love can be more than a feeling. It can be a way of choosing dignity, curiosity, fairness, generosity, and repair.",practice:"Ask what the most loving practical action is in one situation today."},
 {lens:"Buddhist-inspired",title:"Compassion without fixing",body:"Compassion does not always require a solution. Sometimes it is the willingness to stay present without adding judgment.",practice:"Offer one difficult feeling the sentence: You may be here, and I can still choose my next step."}
];
const TAROT_MAJOR=[
 ["The Fool","Beginnings, openness, and a step into the not-yet-known.","Pause before leaping; freedom can become avoidance.","What would a curious first step look like?"],
 ["The Magician","Use what is already in your hands; attention and action can work together.","Scattered energy or self-doubt may be hiding useful tools.","What resource do you already have?"],
 ["The High Priestess","Quiet knowing, observation, and patience before action.","Noise or anxiety can make intuition hard to hear.","What becomes clearer if you stop forcing an answer?"],
 ["The Empress","Nurture, creativity, embodiment, pleasure, and growth.","Care may be depleted or disconnected from your own needs.","What needs tending rather than pushing?"],
 ["The Emperor","Structure, boundaries, steadiness, and responsibility.","Control may be too rigid, or structure may be missing.","What boundary would create more safety?"],
 ["The Hierophant","Tradition, teachers, shared practice, and learning from a lineage.","A rule or tradition may deserve questioning.","What wisdom is worth keeping, and what deserves examination?"],
 ["The Lovers","Values, connection, consent, and meaningful choice.","Misalignment may be obscuring what you actually value.","What choice better matches the life you want to live?"],
 ["The Chariot","Direction, determination, and aligned momentum.","Pushing harder may not help if your energy pulls in opposite directions.","What deserves focused momentum?"],
 ["Strength","Gentle courage, patience, self-trust, and power without force.","Harsh control or exhaustion may be replacing steadier strength.","Where would gentleness work better than force?"],
 ["The Hermit","Reflection, solitude, discernment, and finding your own light.","Isolation can become a hiding place.","What do you already know after giving yourself quiet?"],
 ["Wheel of Fortune","Cycles, change, timing, and circumstances larger than personal control.","Resistance can make a turning cycle feel more chaotic.","What can you adapt to instead of freezing in place?"],
 ["Justice","Fairness, accountability, consequences, and clear-eyed choice.","Bias or unequal expectations may need examination.","What would be fair if everyone involved mattered equally?"],
 ["The Hanged One","Pause, surrender of control, and a different point of view.","Waiting may have become stagnation.","What changes when you look from another angle?"],
 ["Death","Ending, release, transition, and making room for what comes next.","Holding on can prolong an ending already underway.","What are you ready to stop carrying forward?"],
 ["Temperance","Integration, moderation, patience, and skillful balance.","Extremes or impatience may be disrupting a process.","What would a sustainable middle path look like?"],
 ["The Devil","Attachment, compulsion, shame, and patterns that gain power when unnamed.","Avoidance or shame may be keeping the pattern strong.","What pattern has more influence when it stays unnamed?"],
 ["The Tower","Disruption, truth breaking through, and structures that cannot stay the same.","Fear can make every change feel catastrophic.","What is being revealed that you can work with?"],
 ["The Star","Hope, renewal, openness, and reconnecting with meaning.","Discouragement may be narrowing your view.","What small sign of possibility deserves attention?"],
 ["The Moon","Uncertainty, imagination, emotion, dreams, and incomplete information.","Fear may be filling gaps that facts have not filled.","What do you know, feel, and only imagine?"],
 ["The Sun","Clarity, vitality, warmth, play, and presence.","Pressure to stay positive can hide needs that still matter.","What is genuinely life-giving right now?"],
 ["Judgement","Reflection, reckoning, forgiveness, and answering a call to change.","Self-condemnation or denial can block renewal.","What would it mean to learn from the past without living inside it?"],
 ["The World","Completion, integration, belonging, and closing a cycle consciously.","A nearly finished chapter may need one final act.","What deserves to be acknowledged as complete?"]
];
const SPIRITUAL_RITUALS=[
 ["Samhain / remembrance","Earth-centered · Pagan-inspired","Create a small remembrance space with a photo, name, object, or candle. Share one story, gratitude, or lesson connected to someone who came before you."],
 ["Yule / returning light","Earth-centered · Pagan-inspired","Dim the room, light one candle, and name what you want to keep alive through the darker season."],
 ["Imbolc / first stirrings","Earth-centered · Pagan-inspired","Clean one small space, light a candle, and choose one thing you want to begin tending."],
 ["Spring equinox / balance","Earth-centered","Notice what is taking too much space and what is receiving too little. Plant a seed or choose one act that restores balance."],
 ["Beltane / vitality","Pagan-inspired","Celebrate connection, creativity, beauty, and aliveness with flowers, food, art, movement, or time outdoors."],
 ["Summer solstice / fullness","Earth-centered","Notice what has grown since winter and celebrate one thing without immediately turning it into another goal."],
 ["First harvest / gratitude","Earth-centered · Pagan-inspired","Share food and name the labor, people, soil, weather, and resources that made it possible."],
 ["Autumn equinox / balance","Earth-centered","Make two lists: what you are gathering and what you are releasing."],
 ["Loving-kindness","Buddhist-inspired","Offer quiet goodwill to yourself, someone you love, someone neutral, and then outward toward more living beings."],
 ["Values circle","Unitarian Universalist-inspired","Choose love, justice, pluralism, generosity, interdependence, transformation, or equity and ask what practicing it looks like today."],
 ["Home blessing","Earth-centered · mystical","Walk through the home slowly and name what you want it to hold: safety, honesty, laughter, rest, welcome, or something else."],
 ["Release ritual","Anytime","Write down something you are ready to loosen your grip on. Safely discard the paper, then name the behavior or boundary that makes the release real."]
];
function spiritualHash(text){let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function dailySpiritualReading(date){date=date||ymd();return SPIRITUAL_READINGS[spiritualHash(date+"|reading")%SPIRITUAL_READINGS.length]}
function tarotForDate(date){
 date=date||ymd();const saved=(state.tarotDraws||[]).find(x=>x.date===date);let index,reversed;
 if(saved){index=Number(saved.cardIndex||0)%TAROT_MAJOR.length;reversed=!!saved.reversed}
 else{const h=spiritualHash(date+"|daily-life-tarot");index=h%TAROT_MAJOR.length;reversed=((h>>>8)%4===0)}
 const row=TAROT_MAJOR[index];return{index:index,reversed:reversed,name:row[0],meaning:reversed?row[2]:row[1],prompt:row[3],saved:saved}
}
function ensureDailyTarotSaved(date){
 date=date||ymd();if((state.tarotDraws||[]).some(x=>x.date===date))return;
 const t=tarotForDate(date);state.tarotDraws.push({id:uid(),date:date,cardIndex:t.index,reversed:t.reversed,note:"",revealed:false,revealedAt:"",createdAt:new Date().toISOString()})
}
function tarotRevealed(date){
 date=date||ymd();const saved=(state.tarotDraws||[]).find(x=>x.date===date);
 if(!saved)return false;
 if(saved.revealed===undefined)return true;
 return saved.revealed===true;
}
async function revealTarot(date){
 date=date||ymd();ensureDailyTarotSaved(date);const draw=(state.tarotDraws||[]).find(x=>x.date===date);if(!draw)return;
 draw.revealed=true;draw.revealedAt=draw.revealedAt||new Date().toISOString();
 let log=spiritualityLogFor(date);if(!log){log={id:uid(),date,reading:false,tarot:false,stillness:false,ritual:false};state.spiritualityPracticeLogs.push(log)}
 log.tarot=true;
 // Update the visible card first so the tap never feels ignored.
 if(document.querySelector("#modal"))openSpiritualHubSection("tarot");else render();
 try{await save()}catch(error){
   draw.revealed=false;draw.revealedAt="";
   log.tarot=false;
   if(document.querySelector("#modal"))openSpiritualHubSection("tarot");else render();
   alert("The card could not be saved on this device. Please try again.");
 }
}
function spiritualityLogFor(date){date=date||ymd();return(state.spiritualityPracticeLogs||[]).find(x=>x.date===date)||null}
async function toggleSpiritualPractice(key){
 let x=spiritualityLogFor();if(!x){x={id:uid(),date:ymd(),reading:false,tarot:false,stillness:false,ritual:false};state.spiritualityPracticeLogs.push(x)}
 x[key]=!x[key];await save();render()
}
function setSpiritualityTab(tab){
 if(!["today","tarot","rituals","journal"].includes(tab))tab="today";
 spiritualityTab=tab;localStorage.setItem("dailyLifeSpiritualityTab",tab);render()
}
function spiritualityTabs(){
 const rows=[["today","Today"],["tarot","Tarot"],["rituals","Rituals"],["journal","Journal"]];
 return'<div class="spirituality-tabs">'+rows.map(x=>'<button class="'+(spiritualityTab===x[0]?"active":"")+'" onclick="setSpiritualityTab(\''+x[0]+'\')">'+x[1]+'</button>').join("")+'</div>'
}
function spiritualitySeason(){
 const m=new Date().getMonth()+1,rows={1:["Deep winter","rest, tending light, quiet renewal"],2:["Imbolc season","first light, clearing, beginnings"],3:["Spring equinox season","balance, awakening, new growth"],4:["Spring growth","movement, tending, experimentation"],5:["Beltane season","vitality, connection, creativity"],6:["Summer solstice season","fullness, light, celebration"],7:["High summer","tending, patience, embodiment"],8:["First harvest season","gratitude, work, receiving"],9:["Autumn equinox season","balance, harvest, preparation"],10:["Samhain season","harvest, endings, remembrance"],11:["Darkening season","rest, ancestors, home, reflection"],12:["Yule season","light in darkness, warmth, return"]};
 return{title:rows[m][0],theme:rows[m][1]}
}
function openTarotReflection(date){
 date=date||ymd();ensureDailyTarotSaved(date);const x=(state.tarotDraws||[]).find(v=>v.date===date),t=tarotForDate(date);
 modal("Tarot reflection · "+t.name,'<div class="stack">'+tarotArtwork(t)+'<details><summary>Explore the meaning</summary><p>'+esc(t.meaning)+'</p><b>'+esc(t.prompt)+'</b></details><label>My first reaction<textarea id="tarotReaction" rows="2" placeholder="Before interpreting it, what stood out?">'+esc(x.reaction||"")+'</textarea></label><label>One small intention for today<textarea id="tarotIntention" rows="2" placeholder="Something kind, practical, and within reach">'+esc(x.intention||"")+'</textarea></label><label>Your reflection<textarea id="tarotNote" rows="4" placeholder="How does the card connect with your day?">'+esc(x.note||"")+'</textarea></label><label>Looking back this evening<textarea id="tarotEvening" rows="3" placeholder="What happened? What would you like to carry into tomorrow?">'+esc(x.evening||"")+'</textarea></label></div>',"Save",async()=>{const before={...x};x.note=$("#tarotNote").value.trim();x.reaction=$("#tarotReaction").value.trim();x.intention=$("#tarotIntention").value.trim();x.evening=$("#tarotEvening").value.trim();try{await save();closeModal();render()}catch(error){Object.assign(x,before);throw error}})
}
function openSpiritualJournal(type){
 type=type||"Reflection";
 const opts=["Reflection","Gratitude","Intention","Ritual","Dream","Question"].map(v=>'<option '+(v===type?"selected":"")+'>'+v+'</option>').join("");
 modal("Spiritual journal",'<div class="stack"><div class="grid2"><label>Date<input id="sjDate" type="date" value="'+ymd()+'"></label><label>Type<select id="sjType">'+opts+'</select></label></div><label>Entry<textarea id="sjNote" rows="7" placeholder="Write what you want to remember, question, or explore."></textarea></label></div>',"Save",async()=>{const note=$("#sjNote").value.trim();if(!note)return;state.spiritualityJournal.push({id:uid(),date:$("#sjDate").value||ymd(),type:$("#sjType").value,note:note,createdAt:new Date().toISOString()});await save();closeModal();render()})
}
function tarotCardMarkup(date,compact){
 date=date||ymd();ensureDailyTarotSaved(date);const t=tarotForDate(date),revealed=tarotRevealed(date);
 if(!revealed){
   return'<div class="tarot-card-shell '+(compact?"compact":"")+' tarot-unrevealed"><button class="tarot-card-back" type="button" onclick="revealTarot(\''+date+'\')" aria-label="Reveal today\'s tarot card"><div class="tarot-stars">✦ · ☾ · ✧</div><div class="tarot-back-botanical">❧</div><div class="tarot-symbol">☾</div><b>Tap to reveal</b><small>One card for reflection</small></button><div class="tarot-copy"><div class="eyebrow">For reflection, not prediction</div><p>The card stays facedown until you choose to open it.</p><b>Notice your first reaction before reading the meaning.</b></div></div>'
 }
 return'<div class="tarot-card-shell '+(compact?"compact":"")+' tarot-revealed"><button class="tarot-card-face" type="button" onclick="openTarotReflection(\''+date+'\')"><div class="tarot-stars">✦ · ☾ · ✧</div>'+tarotArtwork(t)+'<div class="tarot-name">'+esc(t.name)+'</div><div class="tarot-orientation">'+(t.reversed?"reversed":"upright")+'</div></button><div class="tarot-copy"><div class="eyebrow">For reflection, not prediction</div><p>'+esc(t.meaning)+'</p><b>'+esc(t.prompt)+'</b>'+(t.saved?.intention?'<div class="notice"><b>My intention</b><p>'+esc(t.saved.intention)+'</p></div>':'')+(compact?'<div class="actions" style="margin-top:8px"><button class="btn small" onclick="openTarotReflection(\''+date+'\')">Reflect</button></div>':'<div class="actions" style="margin-top:10px"><button class="btn primary" onclick="openTarotReflection(\''+date+'\')">Reflect / journal</button></div>')+'</div></div>'
}
function dailyPracticeCard(){
 const x=spiritualityLogFor()||{},steps=[["reading","Daily reading"],["tarot","Tarot"],["stillness","Stillness / meditation"],["ritual","Small ritual"]],done=steps.filter(v=>x[v[0]]).length;
 return'<div class="card spiritual-practice-card"><div class="section-title"><div><div class="eyebrow">Daily practice</div><h2>'+done+'/'+steps.length+' touched today</h2><div class="muted small">A menu, not a score. Do one thing or all four.</div></div><span class="tag">~'+Number(state.settings.spirituality?.dailyMinutes||10)+' min</span></div><div class="spiritual-practice-grid">'+steps.map(v=>'<button class="'+(x[v[0]]?"done":"")+'" onclick="toggleSpiritualPractice(\''+v[0]+'\')"><span>'+(x[v[0]]?"✓":"○")+'</span><b>'+esc(v[1])+'</b></button>').join("")+'</div></div>'
}
function spiritualityTodayPanel(m){
 const r=dailySpiritualReading(),s=spiritualitySeason(),ml=moonLens(m);
 return'<div class="card daily-reading-card floral-card"><div class="eyebrow">Daily reading · '+esc(r.lens)+'</div><h2>'+esc(r.title)+'</h2><p class="spiritual-reading-text">'+esc(r.body)+'</p><div class="spiritual-practice-line"><span>Try today</span><b>'+esc(r.practice)+'</b></div><button class="btn" onclick="openSpiritualJournal(\'Reflection\')">Journal about this</button></div>'+dailyPracticeCard()+'<div class="card spiritual-season-card floral-card"><div class="section-title"><div><div class="eyebrow">Seasonal wheel</div><h2>'+esc(s.title)+'</h2><div class="muted small">'+esc(s.theme)+'</div></div><button class="btn" onclick="setSpiritualityTab(\'rituals\')">Ritual ideas</button></div><div class="spiritual-moon"><span class="moon-mark">'+esc(m?.[1]||"☾")+'</span><span><b>'+esc(m?.[0]||"Moon")+'</b><small>'+esc(ml.phaseAction)+'</small></span></div></div><div class="card daily-tarot-card floral-card"><div class="section-title"><div><div class="eyebrow">Daily tarot</div><h2>One card for reflection</h2></div><button class="btn" onclick="setSpiritualityTab(\'tarot\')">Open Tarot</button></div>'+tarotCardMarkup(ymd(),true)+'</div>'
}
function spiritualityTarotPanel(){
 ensureDailyTarotSaved();const rows=[...(state.tarotDraws||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,20);
 return'<div class="card tarot-reading-card floral-card"><div class="eyebrow">Today\'s tarot</div><h2>Major Arcana one-card draw</h2>'+tarotCardMarkup()+'</div><div class="card"><div class="eyebrow">Tarot history</div><h2>Past daily cards</h2>'+(rows.map(x=>{const t=tarotForDate(x.date);return'<button type="button" class="row spiritual-history-row" onclick="openTarotReflection(\''+x.date+'\')"><span><b>'+esc(t.name)+(x.reversed?" · reversed":"")+'</b><div class="muted small">'+esc(dl(x.date))+(x.note?" · reflection saved":"")+'</div></span><span>›</span></button>'}).join("")||'<div class="notice">Today\'s card will start your history.</div>')+'</div>'
}
function spiritualityRitualsPanel(){
 const s=spiritualitySeason();
 return'<div class="card spiritual-season-card floral-card"><div class="eyebrow">Season right now</div><h2>'+esc(s.title)+'</h2><div class="muted">'+esc(s.theme)+'</div></div><div class="ritual-grid">'+SPIRITUAL_RITUALS.map(x=>'<div class="card ritual-card"><div class="eyebrow">'+esc(x[1])+'</div><h2>'+esc(x[0])+'</h2><p class="muted small">'+esc(x[2])+'</p><button class="btn small" onclick="openSpiritualJournal(\'Ritual\')">Use / journal</button></div>').join("")+'</div>'
}
function spiritualityJournalPanel(){
 const rows=[...(state.spiritualityJournal||[])].sort((a,b)=>(String(b.date||"")+String(b.createdAt||"")).localeCompare(String(a.date||"")+String(a.createdAt||"")));
 return'<div class="card floral-card"><div class="section-title"><div><div class="eyebrow">Journal</div><h2>Spiritual reflections</h2><div class="muted small">Questions, gratitude, intentions, dreams, rituals, or whatever feels meaningful.</div></div><button class="btn primary" onclick="openSpiritualJournal()">+ Entry</button></div>'+(rows.slice(0,30).map(x=>'<div class="row"><span><b>'+esc(x.type||"Reflection")+'</b><div class="muted small">'+esc(dl(x.date))+' · '+esc(x.note)+'</div></span></div>').join("")||'<div class="notice">No journal entries yet.</div>')+'</div>'
}
function spiritualityReadingCard(){
 const r=dailySpiritualReading();
 return'<div class="card daily-reading-card floral-card"><div class="eyebrow">Daily reading · '+esc(r.lens)+'</div><h2>'+esc(r.title)+'</h2><p class="spiritual-reading-text">'+esc(r.body)+'</p><div class="spiritual-practice-line"><span>Try today</span><b>'+esc(r.practice)+'</b></div><button class="btn" onclick="openSpiritualJournal(\'Reflection\')">Journal about this</button></div>'
}
function spiritualityMoonSeasonCard(m){
 m=m||moon();const s=spiritualitySeason(),ml=moonLens(m);
 return'<div class="card spiritual-season-card floral-card"><div class="section-title"><div><div class="eyebrow">Seasonal wheel</div><h2>'+esc(s.title)+'</h2><div class="muted small">'+esc(s.theme)+'</div></div><button class="btn" onclick="openAstrologySettings()">Moon / astrology</button></div><div class="spiritual-moon"><span class="moon-mark">'+esc(m?.[1]||"☾")+'</span><span><b>'+esc(m?.[0]||"Moon")+'</b><small>'+esc(ml.phaseAction)+'</small></span></div></div>'
}
function spiritualityHistoryCard(){
 const journals=[...(state.spiritualityJournal||[])].sort((a,b)=>(String(b.date||"")+String(b.createdAt||"")).localeCompare(String(a.date||"")+String(a.createdAt||""))).slice(0,16),
       cards=[...(state.tarotDraws||[])].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).slice(0,10);
 return'<div class="card"><div class="eyebrow">History</div><h2>Recent spiritual notes + cards</h2>'+
   (journals.length?journals.map(x=>'<div class="row"><span><b>'+esc(x.type||"Reflection")+'</b><div class="muted small">'+esc(dl(x.date))+(x.question?' · '+esc(x.question):x.note?' · '+esc(x.note):'')+'</div></span></div>').join(""):'')+
   (cards.length?'<div class="mini-heading">Daily tarot</div>'+cards.map(x=>{const t=tarotForDate(x.date);return'<button class="row" onclick="openTarotReflection(\''+x.date+'\')"><span><b>'+esc(t.name)+(x.reversed?" · reversed":"")+'</b><div class="muted small">'+esc(dl(x.date))+'</div></span><span>›</span></button>'}).join(""):'')+
   (!journals.length&&!cards.length?'<div class="notice">No spiritual history yet.</div>':'')+'</div>'
}
function openSpiritualityPage(){
 if(document.querySelector("#modal"))closeModal();
 setView("spirituality");
}
function openSpiritualHubSection(section){
 let title="Spirituality",body="";
 if(section==="reading"){title="Daily Reading";body=spiritualityReadingCard()}
 else if(section==="tarot"){title="Tarot";body=spiritualityTarotPanel()}
 else if(section==="spread"){title="Tarot Spread";body=tarotSpreadChooser()}
 else if(section==="rituals"){title="Rituals";body=spiritualityRitualsPanel()}
 else if(section==="journal"){title="Journal";body=spiritualityJournalPanel()}
 else if(section==="moon"){title="Moon + Season";body=spiritualityMoonSeasonCard(moon())}
 else if(section==="practice"){title="Daily Practice";body=dailyPracticeCard()}
 else if(section==="history"){title="History";body=spiritualityHistoryCard()}
 modal(title,'<div class="spirituality-hub-modal">'+body+'</div>',"Close",closeModal)
}
function spiritualityView(m){
 m=m||moon();ensureDailyTarotSaved();const r=dailySpiritualReading(),t=tarotForDate(),s=spiritualitySeason(),log=spiritualityLogFor()||{},
   touched=["reading","tarot","stillness","ritual"].filter(k=>log[k]).length,
   journalCount=(state.spiritualityJournal||[]).length,
   segments=[
    {icon:"✦",title:"Reading",detail:r.lens,section:"reading"},
    {icon:"☾",title:"Tarot",detail:tarotRevealed()?t.name:"Reveal card",section:"tarot"},
    {icon:"◇",title:"Spread",detail:"1 · 3 · 5 cards",section:"spread"},
    {icon:"❧",title:"Rituals",detail:s.title,section:"rituals"},
    {icon:"▤",title:"Journal",detail:journalCount?journalCount+" entries":"Write",section:"journal"},
    {icon:m?.[1]||"☾",title:"Moon",detail:m?.[0]||"Moon",section:"moon"},
    {icon:"○",title:"Practice",detail:touched+"/4 touched",section:"practice"},
    {icon:"↕",title:"History",detail:"Cards + notes",section:"history"}
   ],
   centerTitle=tarotRevealed()?t.name:"Tarot ready",
   centerDetail=tarotRevealed()?(t.reversed?"Reversed · reflect":"Upright · reflect"):"Tap to reveal + explore";
 return'<section class="spirituality-one-screen"><div class="spirituality-one-topline"><div><div class="eyebrow">Spirituality at a glance</div><b>Reflection + tarot + season</b></div><button class="btn small primary" onclick="openSpiritualJournal()">＋ Journal</button></div>'+
   '<div class="life-wheel spirituality-wheel" role="group" aria-label="Spirituality dashboard">'+
   segments.map((x,i)=>'<button type="button" class="life-wheel-segment" style="--i:'+i+';--seg:'+i+'" onclick="openSpiritualHubSection(\''+x.section+'\')" aria-label="'+esc(x.title)+': '+esc(x.detail)+'"><span><i>'+x.icon+'</i><b>'+esc(x.title)+'</b><small>'+esc(x.detail)+'</small></span></button>').join("")+
   '<button type="button" class="life-wheel-center spirituality-wheel-center" onclick="event.stopPropagation();openSpiritualHubSection(\'tarot\');return false;"><span class="eyebrow">TODAY\'S CARD</span><b>'+esc(centerTitle)+'</b><strong>'+esc(centerDetail)+'</strong><small>For reflection, not prediction</small></button>'+
   '</div></section>'
}
function spiritualityLaunchCard(){
 const r=dailySpiritualReading(),t=tarotForDate(),s=spiritualitySeason(),tarotLabel=tarotRevealed()?t.name:"Tarot ready to reveal";
 return'<div class="card spirituality-launch floral-card"><div class="section-title"><div><div class="eyebrow">☾ Spirituality</div><h2>'+esc(r.title)+'</h2><div class="muted small">'+esc(r.lens)+' · '+esc(tarotLabel)+' · '+esc(s.title)+'</div></div><button class="btn primary" onclick="openSpiritualityPage()">Open</button></div></div>'
}
function todaySpiritualityCard(){
 const r=dailySpiritualReading(),t=tarotForDate(),tarotLabel=tarotRevealed()?t.name:"card ready to reveal";
 return'<div class="card today-spirituality floral-card"><div class="section-title"><div><div class="eyebrow">☾ Daily reading</div><h2>'+esc(r.title)+'</h2><div class="muted small">'+esc(r.lens)+' · Tarot: '+esc(tarotLabel)+'</div></div><button class="btn" onclick="openSpiritualityPage()">Open</button></div><div class="spiritual-preview-text">'+esc(r.body)+'</div></div>'
}

function tarotArtwork(t){
 const motifs=[
 '<path d="M35 120L75 90L100 115L120 75L160 120M70 88L70 50M62 55L78 55"/>',
 '<path d="M55 115L145 115M70 115L70 80L130 80L130 115M100 72L100 32M85 48L115 48"/>',
 '<path d="M55 125L55 40M145 125L145 40M75 120Q100 80 125 120"/><path d="M108 35A18 18 0 1 0 108 67A14 14 0 0 1 108 35"/>',
 '<path d="M100 125L100 75M100 95Q55 100 65 70Q95 65 100 95M100 85Q145 90 135 60Q105 55 100 85"/><circle cx="100" cy="50" r="15"/>',
 '<path d="M60 120L60 65L140 65L140 120M70 65L70 45L90 55L100 35L110 55L130 45L130 65"/>',
 '<path d="M65 120L65 45L135 45L135 120M100 45L100 115M80 65L90 65M110 65L120 65"/>',
 '<path d="M100 110Q35 70 65 50Q85 35 100 60Q115 35 135 50Q165 70 100 110"/>',
 '<path d="M55 100L65 60L135 60L145 100ZM100 60L100 35M90 40L110 40"/><circle cx="70" cy="115" r="12"/><circle cx="130" cy="115" r="12"/>',
 '<path d="M60 80C60 30 95 30 100 60C105 90 140 90 140 60C140 30 105 30 100 60C95 90 60 90 60 80"/><path d="M70 120Q100 85 130 120"/>',
 '<path d="M80 120L80 55L120 55L120 120M80 70L120 70M100 55L100 35"/><circle cx="100" cy="90" r="10"/>',
 '<circle cx="100" cy="80" r="42"/><circle cx="100" cy="80" r="12"/><path d="M100 38L100 122M58 80L142 80M70 50L130 110M70 110L130 50"/>',
 '<path d="M100 120L100 40M65 55L135 55M65 55L45 90L85 90ZM135 55L115 90L155 90ZM75 120L125 120"/>',
 '<path d="M55 40L145 40M100 40L100 85L75 100L100 115L125 100M100 85L100 130"/>',
 '<path d="M65 120Q100 60 135 120M100 120L100 75M100 75Q65 70 75 45Q100 40 100 75M100 75Q135 70 125 45Q100 40 100 75"/>',
 '<path d="M60 55L85 55L80 95Q72 110 60 95ZM115 80L140 80L135 120Q127 130 115 120ZM85 60Q110 65 118 90"/>',
 '<path d="M75 60Q60 30 55 45M125 60Q140 30 145 45M75 60L125 60L135 105L100 120L65 105ZM85 80L90 80M110 80L115 80"/>',
 '<path d="M75 125L75 60L125 60L125 125M65 60L135 60M80 60L80 40L100 50L120 40L120 60M130 25L110 70L135 65L115 105"/>',
 '<path d="M100 30L110 65L145 65L117 87L127 120L100 100L73 120L83 87L55 65L90 65Z"/>',
 '<path d="M110 35A38 38 0 1 0 110 110A30 30 0 0 1 110 35"/><path d="M55 125Q75 115 95 125T135 125"/>',
 '<circle cx="100" cy="80" r="25"/><path d="M100 30L100 45M100 115L100 130M50 80L65 80M135 80L150 80M65 45L76 56M124 104L135 115M65 115L76 104M124 56L135 45"/>',
 '<path d="M60 50L110 65L110 90L60 105ZM110 75L145 75M110 85L145 85M65 110L65 125M80 110L80 125M95 110L95 125"/>',
 '<ellipse cx="100" cy="80" rx="38" ry="48"/><path d="M80 100Q100 60 120 100M100 60L100 40M65 35L55 25M135 35L145 25M65 125L55 135M135 125L145 135"/>'
 ];
 return '<svg viewBox="0 0 200 160" role="img" aria-label="'+esc(t.name)+' symbolic illustration" style="display:block;width:100%;max-width:220px;margin:auto;color:inherit"><rect x="8" y="8" width="184" height="144" rx="24" fill="currentColor" opacity=".06"/><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'+(t.reversed?' transform="rotate(180 100 80)"':'')+'>'+motifs[t.index]+'</g><g fill="currentColor" opacity=".45"><circle cx="30" cy="35" r="2"/><circle cx="170" cy="125" r="2"/><path d="M166 30L169 37L176 40L169 43L166 50L163 43L156 40L163 37Z"/></g></svg>';
}

const TAROT_SPREADS={one:{name:"One card · focus",positions:["Your focus"]},three:{name:"Three cards · situation, challenge, guidance",positions:["The situation","The challenge","Your guidance"]},five:{name:"Five cards · a deeper reading",positions:["Where you are","What is challenging you","What supports you","What to release","Your next step"]}};
const TAROT_SUITS=[
 {name:"Wands",theme:"energy, creativity, and action",prompt:"Where can you direct your energy?",symbol:'<path d="M80 115L120 40M100 75Q65 65 75 45M105 65Q140 75 135 95"/>'},
 {name:"Cups",theme:"feelings, relationships, and care",prompt:"What feeling or connection needs attention?",symbol:'<path d="M65 45L135 45L125 90Q100 115 75 90ZM100 103L100 125M80 125L120 125M135 55Q160 55 140 85"/>'},
 {name:"Swords",theme:"thoughts, communication, and clarity",prompt:"What needs to be named clearly?",symbol:'<path d="M100 30L112 48L105 100L95 100L88 48ZM75 100L125 100M100 100L100 125"/>'},
 {name:"Pentacles",theme:"resources, home, work, and practical care",prompt:"What practical act will support your life?",symbol:'<circle cx="100" cy="80" r="42"/><path d="M100 40L110 68L140 68L116 88L125 116L100 99L75 116L84 88L60 68L90 68Z"/>'}
];
const TAROT_RANKS=[
 ["Ace","A beginning or opening is available","Notice a delayed beginning or a resource you have not used"],
 ["Two","Balance two needs and choose deliberately","Revisit an imbalance or a decision you are avoiding"],
 ["Three","Build with others and let early progress take shape","Check where collaboration or follow-through is missing"],
 ["Four","Pause, stabilize, and examine what you are holding","Notice whether comfort has become stagnation or control"],
 ["Five","Meet friction honestly and look for a workable response","Consider what repair or recovery is asking of you"],
 ["Six","Receive support, share generously, and notice progress","Check whether giving and receiving are out of balance"],
 ["Seven","Reflect on your choices and protect what matters","Ask whether scattered effort or doubt is obscuring your priorities"],
 ["Eight","Practice steadily and let movement teach you","Notice a repeated pattern that needs a different approach"],
 ["Nine","Recognize what you have learned while respecting your limits","Reconsider overextension or the pressure to manage everything alone"],
 ["Ten","A cycle is reaching fullness; decide what to carry forward","Release a burden or revisit an unfinished ending"],
 ["Page","Approach this as a learner with curiosity","Notice hesitation, inexperience, or a lesson still unfolding"],
 ["Knight","Bring purposeful movement and commitment","Slow impulsive action or question a stalled commitment"],
 ["Queen","Offer grounded attention and mature care","Include your own needs in the care you give"],
 ["King","Take responsibility with steadiness and perspective","Question rigid control or responsibility that lacks follow-through"]
];
function spreadTarotCard(index,reversed){
 index=Number(index);if(!Number.isInteger(index)||index<0||index>=78)throw Error("Invalid tarot card");
 if(index<22){const row=TAROT_MAJOR[index];return{index,name:row[0],reversed:!!reversed,meaning:reversed?row[2]:row[1],prompt:row[3],theme:"life patterns and personal growth"}}
 const suit=TAROT_SUITS[Math.floor((index-22)/14)],rank=TAROT_RANKS[(index-22)%14];
 return{index,name:rank[0]+" of "+suit.name,reversed:!!reversed,meaning:(reversed?rank[2]:rank[1])+" in "+suit.theme+".",prompt:suit.prompt,theme:suit.theme,suit};
}
function tarotMinorPips(count,symbol){
 const spots=[[100,80],[68,52],[132,108],[132,52],[68,108],[68,80],[132,80],[100,48],[100,112],[100,80]];
 return spots.slice(0,Math.max(1,Math.min(10,count))).map(([x,y],i)=>'<g transform="translate('+x+' '+y+') scale('+(count===1?.55:.22)+') translate(-100 -80)" opacity="'+(i===0?1:.9)+'">'+symbol+'</g>').join('');
}
function tarotCourtMotif(rank,symbol){
 const crown='<path d="M72 49L82 30L100 47L118 30L128 49L121 58H79Z"/>';
 const body='<circle cx="100" cy="70" r="16"/><path d="M67 127Q72 91 100 91Q128 91 133 127"/>';
 const extras={
  Page:'<path d="M63 105Q48 82 61 62Q78 70 78 91M137 105Q152 82 139 62Q122 70 122 91"/>',
  Knight:'<path d="M47 118Q64 90 88 103Q112 81 141 108M58 119H145M119 48Q146 56 142 84"/>',
  Queen:'<path d="M58 123Q72 96 100 96Q128 96 142 123M57 69Q46 52 59 39M143 69Q154 52 141 39"/>',
  King:'<path d="M58 126V102H142V126M69 102V83M131 102V83M52 126H148"/>'
 };
 return '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+(rank==="Queen"||rank==="King"?crown:"")+body+(extras[rank]||"")+'</g><g transform="translate(100 116) scale(.24) translate(-100 -80)" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+symbol+'</g>';
}
function spreadCardArtwork(t){
 if(t.index<22)return tarotArtwork(t);
 const rankIndex=(t.index-22)%14,rank=TAROT_RANKS[rankIndex][0],isCourt=rankIndex>=10;
 const art=isCourt?tarotCourtMotif(rank,t.suit.symbol):tarotMinorPips(rankIndex+1,t.suit.symbol);
 const stars='<g fill="currentColor" opacity=".3"><circle cx="30" cy="31" r="2"/><circle cx="169" cy="126" r="2"/><path d="M164 27L167 34L174 37L167 40L164 47L161 40L154 37L161 34Z"/><path d="M37 121L39 126L44 128L39 130L37 135L35 130L30 128L35 126Z"/></g>';
 return '<svg viewBox="0 0 200 160" role="img" aria-label="'+esc(t.name)+' symbolic illustration" style="display:block;width:100%;max-width:190px;margin:auto;color:var(--secondary)"><rect x="8" y="8" width="184" height="144" rx="24" fill="currentColor" opacity=".07"/><path d="M27 133Q60 117 100 128T173 126" fill="none" stroke="currentColor" opacity=".18"/>'+stars+'<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'+(t.reversed?' transform="rotate(180 100 80)"':'')+'>'+art+'</g><text x="100" y="146" text-anchor="middle" fill="currentColor" opacity=".72" font-size="10" font-weight="700">'+esc(rank)+' · '+esc(t.suit.name)+'</text></svg>';
}
function tarotRandomIndex(max){
 const values=new Uint32Array(1),limit=Math.floor(4294967296/max)*max;
 do{crypto.getRandomValues(values)}while(values[0]>=limit);
 return values[0]%max;
}
function drawTarotSpread(kind,deck,question){
 const spec=TAROT_SPREADS[kind];if(!spec)throw Error("Choose a valid spread");
 const pool=Array.from({length:deck==="major"?22:78},(_,i)=>i),cards=[];
 for(const position of spec.positions){const chosen=pool.splice(tarotRandomIndex(pool.length),1)[0];cards.push({cardIndex:chosen,reversed:tarotRandomIndex(4)===0,position})}
 return{id:uid(),date:ymd(),type:"Tarot spread",spreadKind:kind,deck:deck==="major"?"major":"full",question:String(question||"").trim().slice(0,1000),cards,createdAt:new Date().toISOString()};
}
function tarotSpreadReading(reading){
 const cards=reading.cards.map(c=>({...spreadTarotCard(c.cardIndex,c.reversed),position:c.position}));
 const paragraphs=cards.map(c=>c.position+" — "+c.name+(c.reversed?" (reversed)":" (upright)")+": "+c.meaning+" "+c.prompt);
 const first=cards[0],last=cards[cards.length-1];
 let together=cards.length===1?"Stay with "+first.name+" as today's lens. "+first.prompt:
 "Read these cards as a conversation: "+first.name+" frames what needs your attention, while "+last.name+" offers a direction to explore. The movement from "+first.theme+" toward "+last.theme+" invites you to connect understanding with a small, deliberate action.";
 if(cards.length>=3)together+=" The challenge in "+cards[1].name+" is something to work with, rather than a verdict about you. Compare it with the guidance card: what changes when you use the support already available?";
 if(cards.length===5)together+=" Let "+cards[2].name+" name a resource you can lean on. Use "+cards[3].name+" to ask what can be loosened or left behind before taking the next step.";
 return{cards,paragraphs,together,next:"Choose one action you can take today, one boundary or burden you can soften, and one thing to observe before deciding more. Return tonight and note what actually happened."};
}
function tarotSpreadMarkup(reading){
 const r=tarotSpreadReading(reading);
 return '<div class="stack">'+(reading.question?'<div class="notice"><b>Your question</b><p>'+esc(reading.question)+'</p></div>':'')+'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">'+r.cards.map(c=>'<div class="metric" style="text-align:center"><div class="eyebrow">'+esc(c.position)+'</div>'+spreadCardArtwork(c)+'<b>'+esc(c.name)+'</b><div class="muted small">'+(c.reversed?'Reversed':'Upright')+'</div></div>').join('')+'</div><h3>Your full reading</h3>'+r.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+'<div class="notice"><h3>How the cards connect</h3><p>'+esc(r.together)+'</p></div><p>'+esc(r.next)+'</p><div class="muted small">A locally generated symbolic reading for reflection, not a prediction. Keep what feels useful and question what does not.</div></div>';
}
async function startTarotSpread(){
 const reading=drawTarotSpread($("#tarotSpreadKind").value,$("#tarotSpreadDeck").value,$("#tarotSpreadQuestion").value);
 const r=tarotSpreadReading(reading);reading.note=[reading.question?"Question: "+reading.question:"",...r.paragraphs,"How the cards connect: "+r.together,r.next].filter(Boolean).join("\n\n");
 state.spiritualityJournal=state.spiritualityJournal||[];state.spiritualityJournal.push(reading);
 try{await save()}catch(error){state.spiritualityJournal=state.spiritualityJournal.filter(x=>x.id!==reading.id);throw error}
 render();openSavedTarotSpread(reading.id);
}
function openSavedTarotSpread(id){
 const reading=(state.spiritualityJournal||[]).find(x=>x.id===id&&x.type==="Tarot spread"&&Array.isArray(x.cards));if(!reading)return;
 modal(TAROT_SPREADS[reading.spreadKind]?.name||"Tarot reading",tarotSpreadMarkup(reading)+'<label>My reflection<textarea id="spreadReflection" rows="4" placeholder="What resonates? What will you try?">'+esc(reading.reflection||"")+'</textarea></label>',"Save reflection",async()=>{const old=reading.reflection;reading.reflection=$("#spreadReflection").value.trim();try{await save();closeModal();render()}catch(error){reading.reflection=old;throw error}});
}
function tarotSpreadChooser(){
 const history=(state.spiritualityJournal||[]).filter(x=>x.type==="Tarot spread"&&Array.isArray(x.cards)).slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,15);
 return '<div class="card floral-card"><div class="eyebrow">Explore a fuller reading</div><h2>Choose your tarot spread</h2><div class="stack"><label>Spread<select id="tarotSpreadKind">'+Object.entries(TAROT_SPREADS).map(([k,v])=>'<option value="'+k+'"'+(k==="three"?' selected':'')+'>'+esc(v.name)+'</option>').join('')+'</select></label><label>Deck<select id="tarotSpreadDeck"><option value="full">Full 78-card deck</option><option value="major">22 Major Arcana cards</option></select></label><label>Your question or focus (optional)<textarea id="tarotSpreadQuestion" rows="2" maxlength="1000" placeholder="What would I like to understand or explore?"></textarea></label><button class="btn primary" onclick="startTarotSpread()">Draw cards & read</button><div class="muted small">Each spread draws distinct cards and saves the reading in your journal. Your daily card stays the same.</div></div></div>'+(history.length?'<div class="card"><h2>Saved readings</h2>'+history.map(x=>'<button class="btn" style="display:block;width:100%;text-align:left;margin:8px 0" onclick="openSavedTarotSpread(\''+x.id+'\')"><b>'+esc(TAROT_SPREADS[x.spreadKind]?.name||"Reading")+'</b><div class="muted small">'+esc(dl(x.date))+(x.question?' · '+esc(x.question):'')+'</div></button>').join('')+'</div>':'');
}
const tarotOriginalPanel=spiritualityTarotPanel;
spiritualityTarotPanel=function(){return tarotSpreadChooser()+tarotOriginalPanel()};
/* Hands-on selection uses a shuffled deck; it only saves a completed reading. */
let tarotSelectionDraft=null,tarotSelectionSaving=false;
function shuffledTarotDeck(deck){const cards=Array.from({length:deck==="major"?22:78},(_,i)=>i);for(let i=cards.length-1;i>0;i--){const j=tarotRandomIndex(i+1);[cards[i],cards[j]]=[cards[j],cards[i]]}return cards}
function beginTarotSelection(){
 const kind=$("#tarotSpreadKind").value,deck=$("#tarotSpreadDeck").value;if(!TAROT_SPREADS[kind])return;
 tarotSelectionDraft={id:uid(),date:ymd(),type:"Tarot spread",spreadKind:kind,deck:deck==="major"?"major":"full",question:String($("#tarotSpreadQuestion").value||"").trim().slice(0,1000),cards:[],createdAt:new Date().toISOString(),selectionMethod:"hand-picked",pool:shuffledTarotDeck(deck),chosenSlots:[],page:0};showTarotSelection();
}
function tarotCardBack(){return '<svg viewBox="0 0 100 140" aria-hidden="true" style="width:100%;max-width:82px"><rect x="3" y="3" width="94" height="134" rx="12" fill="var(--panel)" stroke="var(--secondary)" stroke-width="2"/><rect x="10" y="10" width="80" height="120" rx="9" fill="none" stroke="var(--accent)" opacity=".6"/><path d="M50 27L72 70L50 113L28 70Z" fill="none" stroke="var(--secondary)"/><circle cx="50" cy="70" r="16" fill="none" stroke="var(--accent)"/><path d="M50 47V93M38 70H62M27 22Q40 30 27 40M73 100Q60 110 73 118" fill="none" stroke="var(--secondary)"/></svg>'}
function chooseTarotSlot(slot){
 const d=tarotSelectionDraft;if(!d||tarotSelectionSaving||!Number.isInteger(slot)||slot<0||slot>=d.pool.length||d.chosenSlots.includes(slot)||d.cards.length>=TAROT_SPREADS[d.spreadKind].positions.length)return;
 d.chosenSlots.push(slot);d.cards.push({cardIndex:d.pool[slot],reversed:tarotRandomIndex(4)===0,position:TAROT_SPREADS[d.spreadKind].positions[d.cards.length]});showTarotSelection();
}
function changeTarotSelectionPage(step){const d=tarotSelectionDraft;if(!d)return;d.page=Math.max(0,Math.min(Math.ceil(d.pool.length/12)-1,d.page+Number(step||0)));showTarotSelection()}
function showTarotSelection(){
 const d=tarotSelectionDraft;if(!d)return;const spec=TAROT_SPREADS[d.spreadKind],complete=d.cards.length===spec.positions.length,start=d.page*12;
 const selected=d.cards.map((x,i)=>{const c=spreadTarotCard(x.cardIndex,x.reversed);return '<div class="metric" style="text-align:center;min-width:0"><div class="eyebrow">'+esc(x.position)+'</div>'+spreadCardArtwork(c)+'<b>'+esc(c.name)+'</b><div class="muted small">'+(c.reversed?'Reversed':'Upright')+'</div></div>'}).join('');
 const choices=Array.from({length:Math.min(12,d.pool.length-start)},(_,i)=>start+i).map(slot=>'<button class="btn" '+(d.chosenSlots.includes(slot)?'disabled aria-label="Card '+(slot+1)+' already selected"':'aria-label="Choose face-down card '+(slot+1)+'" onclick="chooseTarotSlot('+slot+')"')+' style="padding:5px;min-width:0">'+tarotCardBack()+'<span class="small">'+(d.chosenSlots.includes(slot)?'Chosen':slot+1)+'</span></button>').join('');
 const body='<div class="stack"><p role="status" aria-live="polite">'+d.cards.length+' of '+spec.positions.length+' cards chosen'+(complete?' · Your spread is ready.':' · Choose a card for '+esc(spec.positions[d.cards.length])+'.')+'</p>'+(d.question?'<div class="notice">'+esc(d.question)+'</div>':'')+(selected?'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">'+selected+'</div>':'')+(complete?'':'<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px">'+choices+'</div><div class="actions"><button class="btn small" '+(d.page===0?'disabled':'')+' onclick="changeTarotSelectionPage(-1)">Previous cards</button><span class="muted small">'+(start+1)+'–'+Math.min(start+12,d.pool.length)+' of '+d.pool.length+'</span><button class="btn small" '+(start+12>=d.pool.length?'disabled':'')+' onclick="changeTarotSelectionPage(1)">More cards</button></div>')+'<p class="muted small">Your daily card stays the same. This selection is saved when you tap Save & read; unsaved choices last until you reload the app.</p></div>';
 closeModal();modal("Choose your cards",body,complete?"Save & read":"Pause selection",async()=>{if(complete)await saveSelectedTarotSpread();else{closeModal();render()}});
}
async function saveSelectedTarotSpread(){
 const d=tarotSelectionDraft;if(!d||tarotSelectionSaving||d.cards.length!==TAROT_SPREADS[d.spreadKind].positions.length)return;
 tarotSelectionSaving=true;const {pool,chosenSlots,page,...reading}=d;const r=tarotSpreadReading(reading);reading.note=[reading.question?'Question: '+reading.question:'',...r.paragraphs,'How the cards connect: '+r.together,r.next].filter(Boolean).join('\n\n');
 state.spiritualityJournal=state.spiritualityJournal||[];if(state.spiritualityJournal.some(x=>x.id===reading.id)){tarotSelectionSaving=false;return}state.spiritualityJournal.push(reading);
 try{await save();tarotSelectionDraft=null;closeModal();render();openSavedTarotSpread(reading.id)}catch(error){state.spiritualityJournal=state.spiritualityJournal.filter(x=>x.id!==reading.id);throw error}finally{tarotSelectionSaving=false}
}
const tarotChooserBeforeSelection=tarotSpreadChooser;
tarotSpreadChooser=function(){let html=tarotChooserBeforeSelection().replace('<button class="btn primary" onclick="startTarotSpread()">Draw cards & read</button>','<div class="actions"><button class="btn primary" onclick="beginTarotSelection()">Choose my cards</button><button class="btn" onclick="startTarotSpread()">Quick draw & read</button></div>');if(tarotSelectionDraft)html='<div class="notice"><button class="btn" onclick="showTarotSelection()">Continue my card selection</button></div>'+html;return html};
