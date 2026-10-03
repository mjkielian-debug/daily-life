
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
 log.tarot=true;await save();render();
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
 modal("Tarot reflection · "+t.name,'<div class="stack"><div class="notice">'+esc(t.meaning)+'</div><div class="muted small">'+esc(t.prompt)+'</div><label>Your reflection<textarea id="tarotNote" rows="5" placeholder="What does this bring up for you?">'+esc(x.note||"")+'</textarea></label></div>',"Save",async()=>{x.note=$("#tarotNote").value.trim();await save();closeModal();render()})
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
 return'<div class="tarot-card-shell '+(compact?"compact":"")+' tarot-revealed"><button class="tarot-card-face" type="button" onclick="openTarotReflection(\''+date+'\')"><div class="tarot-stars">✦ · ☾ · ✧</div><div class="tarot-symbol">☾</div><div class="tarot-name">'+esc(t.name)+'</div><div class="tarot-orientation">'+(t.reversed?"reversed":"upright")+'</div></button><div class="tarot-copy"><div class="eyebrow">For reflection, not prediction</div><p>'+esc(t.meaning)+'</p><b>'+esc(t.prompt)+'</b>'+(compact?'<div class="actions" style="margin-top:8px"><button class="btn small" onclick="openTarotReflection(\''+date+'\')">Reflect</button></div>':'<div class="actions" style="margin-top:10px"><button class="btn primary" onclick="openTarotReflection(\''+date+'\')">Reflect / journal</button></div>')+'</div></div>'
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
 return'<div class="card tarot-reading-card floral-card"><div class="eyebrow">Today\'s tarot</div><h2>Major Arcana one-card draw</h2>'+tarotCardMarkup()+'</div><div class="card"><div class="eyebrow">Tarot history</div><h2>Past daily cards</h2>'+(rows.map(x=>{const t=tarotForDate(x.date);return'<div class="row" onclick="openTarotReflection(\''+x.date+'\')"><span><b>'+esc(t.name)+(x.reversed?" · reversed":"")+'</b><div class="muted small">'+esc(dl(x.date))+(x.note?" · reflection saved":"")+'</div></span><span>›</span></div>'}).join("")||'<div class="notice">Today\'s card will start your history.</div>')+'</div>'
}
function spiritualityRitualsPanel(){
 const s=spiritualitySeason();
 return'<div class="card spiritual-season-card floral-card"><div class="eyebrow">Season right now</div><h2>'+esc(s.title)+'</h2><div class="muted">'+esc(s.theme)+'</div></div><div class="ritual-grid">'+SPIRITUAL_RITUALS.map(x=>'<div class="card ritual-card"><div class="eyebrow">'+esc(x[1])+'</div><h2>'+esc(x[0])+'</h2><p class="muted small">'+esc(x[2])+'</p><button class="btn small" onclick="openSpiritualJournal(\'Ritual\')">Use / journal</button></div>').join("")+'</div>'
}
function spiritualityJournalPanel(){
 const rows=[...(state.spiritualityJournal||[])].sort((a,b)=>(String(b.date||"")+String(b.createdAt||"")).localeCompare(String(a.date||"")+String(a.createdAt||"")));
 return'<div class="card floral-card"><div class="section-title"><div><div class="eyebrow">Journal</div><h2>Spiritual reflections</h2><div class="muted small">Questions, gratitude, intentions, dreams, rituals, or whatever feels meaningful.</div></div><button class="btn primary" onclick="openSpiritualJournal()">+ Entry</button></div>'+(rows.slice(0,30).map(x=>'<div class="row"><span><b>'+esc(x.type||"Reflection")+'</b><div class="muted small">'+esc(dl(x.date))+' · '+esc(x.note)+'</div></span></div>').join("")||'<div class="notice">No journal entries yet.</div>')+'</div>'
}
function spiritualityView(m){
 m=m||moon();const body=spiritualityTab==="tarot"?spiritualityTarotPanel():spiritualityTab==="rituals"?spiritualityRitualsPanel():spiritualityTab==="journal"?spiritualityJournalPanel():spiritualityTodayPanel(m);
 return'<div class="card glow spirituality-hero floral-card"><div class="eyebrow">Spirituality</div><div class="spirituality-title">A practice that can stay open</div><div class="muted">Daily reflection, tarot, stillness, seasonal rituals, nature, questions, and meaning—without requiring one fixed doctrine.</div>'+spiritualityTabs()+'</div>'+body
}
function spiritualityLaunchCard(){
 const r=dailySpiritualReading(),t=tarotForDate(),s=spiritualitySeason(),tarotLabel=tarotRevealed()?t.name:"Tarot ready to reveal";
 return'<div class="card spirituality-launch floral-card"><div class="section-title"><div><div class="eyebrow">☾ Spirituality</div><h2>'+esc(r.title)+'</h2><div class="muted small">'+esc(r.lens)+' · '+esc(tarotLabel)+' · '+esc(s.title)+'</div></div><button class="btn primary" onclick="setView(\'spirituality\')">Open</button></div></div>'
}
function todaySpiritualityCard(){
 const r=dailySpiritualReading(),t=tarotForDate(),tarotLabel=tarotRevealed()?t.name:"card ready to reveal";
 return'<div class="card today-spirituality floral-card"><div class="section-title"><div><div class="eyebrow">☾ Daily reading</div><h2>'+esc(r.title)+'</h2><div class="muted small">'+esc(r.lens)+' · Tarot: '+esc(tarotLabel)+'</div></div><button class="btn" onclick="setView(\'spirituality\')">Open</button></div><div class="muted small">'+esc(r.body)+'</div></div>'
}
