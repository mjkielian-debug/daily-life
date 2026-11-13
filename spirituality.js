
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
 {lens:"Buddhist-inspired",title:"Compassion without fixing",body:"Compassion does not always require a solution. Sometimes it is the willingness to stay present without adding judgment.",practice:"Offer one difficult feeling the sentence: You may be here, and I can still choose my next step."},
 {lens:"Hinduism-inspired · karma yoga",title:"Steady action, open hands",body:"One teaching in Bhagavad Gita 2.47 invites attention to the action itself without making its reward the only reason for acting. Treat it as a reflection, not a demand for perfect detachment.",practice:"Choose one ordinary, helpful action. Do it with care for two minutes, then let the result be what it is.",sourceLabel:"Bhagavad Gita 2.47 · IIT Kanpur Heritage",sourceUrl:"https://heritage.iitk.ac.in/SBG/2.47"},
 {lens:"Hinduism-inspired · japa",title:"Return with a word",body:"Japa—repetition or remembrance of a mantra or divine name—is practiced in some Hindu traditions. Traditions differ; no single mantra is right for everyone.",practice:"For two minutes, follow your breath. If you already have a phrase from a tradition you practice, repeat it gently with the breath.",sourceLabel:"Hindu American Foundation · Puja",sourceUrl:"https://www.hinduamerican.org/blog/hindu-puja-instructions/"},
 {lens:"Pagan-inspired · seasonal attention",title:"Notice what is changing",body:"Many Pagan paths honor cycles in the natural world. Change can include growth, fullness, release, and rest; none has to be treated as failure.",practice:"Look outside or through a window and name one thing changing with the season. Ask what kind of care it needs."},
 {lens:"Wiccan-inspired · intention",title:"Give an intention one small action",body:"Wiccan practice is diverse. For some practitioners, ritual helps focus intention; a meaningful act can be simple and personal.",practice:"Name one quality you want to bring to today, then choose one small action that expresses it. No tools or supplies are needed."}

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
 ["Release ritual","Anytime","Write down something you are ready to loosen your grip on. Safely discard the paper, then name the behavior or boundary that makes the release real."],
 ["Mindful action · karma yoga","Hinduism-inspired","Choose one small, helpful task. Bring care to the action without requiring a particular outcome. Inspired by Bhagavad Gita 2.47."]

];
function spiritualHash(text){let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function dailySpiritualReading(date){date=date||ymd();const day=Math.floor(new Date(date+"T12:00:00").getTime()/86400000);return SPIRITUAL_READINGS[((day%SPIRITUAL_READINGS.length)+SPIRITUAL_READINGS.length)%SPIRITUAL_READINGS.length]}
const SPIRITUAL_LESSONS=[
 {tradition:"Pagan paths",title:"Paganism is an umbrella, not one single religion",teaching:"The word Pagan describes a wide range of modern religious paths rather than one church, scripture, or universal set of beliefs. Many Pagan traditions honor nature, sacred places, seasonal cycles, or one or more deities; others understand the sacred differently. Some people are polytheists, some are animist or pantheist, and some use Pagan identity in a more personal way. This variety is part of the subject, not a problem to solve. In this class, we’ll learn about each path on its own terms instead of treating Paganism, Wicca, and witchcraft as interchangeable.",question:"Which description best fits modern Paganism?",answers:[{label:"One religion with one shared doctrine",feedback:"That makes a diverse family sound like a single organization. Pagan paths differ in theology and practice.",correct:false},{label:"A broad family of distinct paths, often with nature-centered practices",feedback:"Yes. That captures the diversity without claiming every Pagan believes or practices the same way.",correct:true},{label:"Another word that always means witchcraft",feedback:"Not quite. Some Pagans practice witchcraft, but Pagan religion and witchcraft are not the same thing.",correct:false}],practice:["Look outside or picture a nearby living place: a tree, garden, bird, weather, or patch of sky.","Notice one detail without naming it good or bad. What does that living thing need in order to thrive?","Choose one small act of reciprocity you can do today: avoid waste, care for a plant, notice a bird without disturbing it, or tend a shared space."],carry:["Care for one living thing","Notice a seasonal change","Learn about a Pagan path"],sourceLabel:"Pagan Federation International · What is Paganism?",sourceUrl:"https://www.paganfederation.org/what-is-paganism/"},
 {tradition:"Unitarian Universalism",title:"A community can share values without requiring one creed",teaching:"Unitarian Universalism is a theologically diverse religious tradition. People in a UU community may understand the sacred in different ways, or may be theist, atheist, agnostic, humanist, Pagan, Buddhist, or something else. Instead of requiring everyone to affirm one creed, congregations use shared commitments and covenant: how people promise to treat one another and act together. Contemporary UU values include interdependence, pluralism, justice, transformation, generosity, and equity, centered around love. Learning here means asking what a value asks of us in daily life—not pretending all members believe the same thing.",question:"What most closely holds a UU community together?",answers:[{label:"A required statement of identical beliefs",feedback:"That would be a creed. UU communities make room for theological difference.",correct:false},{label:"Shared values and promises about how to live together",feedback:"Exactly. Covenant and shared values guide community even when beliefs differ.",correct:true},{label:"A rule that everyone follows the same spiritual practice",feedback:"UU practice varies. A shared commitment does not require identical rituals.",correct:false}],practice:["Pick one UU value to explore: interdependence, pluralism, justice, transformation, generosity, or equity.","Bring to mind one ordinary interaction from this week. Who was affected by what happened?","Choose one small action that expresses your value in a real relationship or community today."],carry:["Practice one shared value","Make room for another perspective","Act with care in community"],sourceLabel:"Unitarian Universalist Church of Columbia · Values and Covenant",sourceUrl:"https://uucomo.org/home/about-uucc/beliefs/"},
 {tradition:"Buddhism",title:"The Four Noble Truths are a path of investigation",teaching:"The Four Noble Truths are a central Buddhist teaching. They are not simply the claim that life is miserable. The first asks us to recognize dukkha: suffering, stress, or the unsatisfying quality that can come with change and instability. The second examines causes, including craving and clinging. The third says that release from this stress is possible. The fourth points to a path of training, often described through the Noble Eightfold Path. Buddhist traditions interpret and practice these teachings in varied ways. For a beginner, the useful move is to investigate one small experience: what is happening, what adds strain, and what response might reduce harm?",question:"What do the Four Noble Truths invite a practitioner to do?",answers:[{label:"Ignore pain and stay positive",feedback:"No. The teaching starts by acknowledging stress and suffering honestly.",correct:false},{label:"Investigate stress, its causes, the possibility of release, and a path of practice",feedback:"Yes. It is a practical framework for understanding and responding to suffering.",correct:true},{label:"Assume every difficult event is a personal failure",feedback:"No. The framework examines causes and practices; it is not a judgment of your worth.",correct:false}],practice:["Choose a small, ordinary moment of friction from today—not your hardest experience.","Notice what happened, then notice whether an expectation or urge made it harder. You are observing, not blaming yourself.","Ask: what response could reduce harm or tension right now? Choose one realistic next action."],carry:["Notice a cause without blame","Choose a response that reduces harm","Learn another Buddhist teaching"],sourceLabel:"Thanissaro Bhikkhu · The Four Noble Truths",sourceUrl:"https://www.dhammatalks.org/books/FourNobleTruths/"},
 {tradition:"Hinduism",title:"Karma yoga: care about the action, not only the reward",teaching:"Hinduism includes many philosophical schools, devotional traditions, deities, and forms of practice; one short lesson cannot represent them all. Today’s idea is karma yoga, often discussed through the Bhagavad Gita. In verse 2.47, Krishna teaches Arjuna to focus on action without making its fruits the sole motive. This is not a command to be indifferent, neglect consequences, or give up. It can mean bringing care to what is yours to do while recognizing that you cannot control every result. The Gita has multiple commentarial traditions, so translations and interpretations differ. Treat this as one doorway into a large tradition, not the whole of Hinduism.",question:"In this lesson, what does karma yoga suggest?",answers:[{label:"Do nothing because outcomes are uncertain",feedback:"No. The teaching explicitly does not recommend inaction; it asks for engaged action.",correct:false},{label:"Act with care without letting reward be your only motive",feedback:"Right. Attention goes to the quality of action while acknowledging that outcomes are not fully ours to control.",correct:true},{label:"Ignore the effects your choices have on other people",feedback:"No. Non-attachment to results is not permission to ignore responsibility or consequences.",correct:false}],practice:["Choose one ordinary helpful action already in front of you.","Name the part you can control: your attention, effort, honesty, or care.","Do the next small part well. Let the result remain uncertain without abandoning responsibility."],carry:["Do one action with care","Let go of one outcome you cannot control","Explore another Hindu path"],sourceLabel:"IIT Kanpur Heritage · Bhagavad Gita 2.47",sourceUrl:"https://heritage.iitk.ac.in/SBG/2.47"},
 {tradition:"Wicca",title:"Ritual gives intention a shape",teaching:"Wicca is a modern Pagan religion, but Wiccans do not all follow one identical rulebook or ritual style. Many Wiccans use ritual, honor nature, and observe seasonal festivals; specific beliefs and forms vary among traditions and practitioners. The Wheel of the Year is common in many Wiccan and Pagan settings, but not everyone celebrates every festival in the same way. Yule is associated with the winter solstice in many northern-hemisphere traditions. A simple personal ritual can give an intention a physical shape: a chosen object, a spoken phrase, or a repeated action. This introductory exercise is a reflection, not a claim that one practice represents all Wicca.",question:"Which statement about Wiccan practice is most accurate?",answers:[{label:"Every Wiccan follows the same ritual calendar and rules",feedback:"No. Wiccan traditions and individual practices vary.",correct:false},{label:"Ritual and seasonal observance are common, but practices differ",feedback:"Correct. Shared themes can exist without one universal script.",correct:true},{label:"Wicca and witchcraft mean exactly the same thing",feedback:"Not exactly. Some Wiccans practice witchcraft, but the terms are not interchangeable for everyone.",correct:false}],practice:["Choose an ordinary object near you—a cup, a leaf, a stone, or something that already matters to you.","Name one quality you want to welcome, such as patience or courage. No special words or tools are required.","Give the intention one small action today. The action is the heart of this simple ritual."],carry:["Give an intention one action","Learn about a seasonal observance","Explore how Wiccan paths differ"],sourceLabel:"University of Copenhagen · Wicca: History, Belief and Community",sourceUrl:"https://researchprofiles.ku.dk/en/publications/wicca-history-belief-and-community-in-modern-religious-witchcraft/"},
 {tradition:"Pagan paths",title:"The Wheel of the Year marks seasonal change",teaching:"Many modern Pagan and Wiccan communities use a ritual calendar often called the Wheel of the Year. It commonly marks solstices, equinoxes, and seasonal festivals such as Imbolc, Beltane, Lughnasadh, and Samhain. The names, meanings, and importance of these observances differ across traditions; the wheel is not a universal Pagan requirement. In the Northern Hemisphere, Yule is often observed around the winter solstice, when daylight is shortest and begins to lengthen again. Seasonal ritual can be a way to notice change in the land and in our lives. It does not require buying supplies or copying another culture’s practice.",question:"Why do many Pagans mark seasonal festivals?",answers:[{label:"To observe cycles in nature and mark meaningful turning points",feedback:"Yes. Seasonal observances often give attention to the changing year, though meanings vary.",correct:true},{label:"Because every Pagan group follows an identical calendar",feedback:"No. The Wheel is common in some paths, not universal.",correct:false},{label:"To predict exactly what will happen next",feedback:"No. Seasonal ritual is not a guarantee or prediction.",correct:false}],practice:["Notice the current season where you live: daylight, temperature, plants, or weather.","Think about what this part of the year invites—rest, tending, growth, gathering, or release.","Choose a seasonal act that fits now. If Yule is near, you might notice returning light; at another time, choose an action suited to that season."],carry:["Notice the local season","Mark a turning point simply","Learn how another tradition observes time"],sourceLabel:"Modern Pagan Festivals · The Folklore Society",sourceUrl:"https://www.tandfonline.com/doi/full/10.1080/00155870802352178"},
 {tradition:"Unitarian Universalism",title:"Pluralism means learning without flattening differences",teaching:"Pluralism is more than saying that people disagree. It asks a community to make room for real differences while treating people with dignity. In Unitarian Universalist life, pluralism can mean listening to how another person describes their beliefs instead of deciding that their path is just a version of yours. It also means you can explore Buddhist, Hindu, Pagan, Wiccan, humanist, or other ideas without pretending they are all the same. Learning across traditions works best with curiosity and context: ask who practices something, what it means within that tradition, and whether a practice is open to newcomers.",question:"What is a respectful way to learn across spiritual traditions?",answers:[{label:"Assume all paths teach exactly the same thing",feedback:"That erases real differences. Respectful learning notices both connections and distinctions.",correct:false},{label:"Learn the context and let practitioners define their own traditions",feedback:"Exactly. Curiosity works best with context and listening.",correct:true},{label:"Take any ritual without learning where it comes from",feedback:"No. Context matters; some practices are tradition-specific or not open for borrowing.",correct:false}],practice:["Choose one of the traditions in this course that you want to understand better.","Think of one question you could ask without assuming the answer.","Choose to learn from a source or practitioner within that tradition before adopting a practice."],carry:["Ask a respectful question","Keep traditions distinct while learning","Listen before interpreting"],sourceLabel:"Unitarian Universalist Church of Columbia · Values and Covenant",sourceUrl:"https://uucomo.org/home/about-uucc/beliefs/"},
 {tradition:"Buddhism",title:"The Eightfold Path is an integrated training",teaching:"The Noble Eightfold Path is often grouped into three areas: wisdom, ethical conduct, and mental development. It includes right view and intention; right speech, action, and livelihood; and right effort, mindfulness, and concentration. 'Right' here is often understood as skillful or conducive to awakening, not as a demand to be perfect. The path is not a checklist where one item is completed before the next; the factors support one another. Traditions explain them differently, and practice is learned over time. Today we’ll focus on right speech as a small, everyday example of Buddhist ethical training.",question:"How is the Eightfold Path best understood?",answers:[{label:"As eight unrelated rules you complete once",feedback:"No. The factors support one another and are practiced over time.",correct:false},{label:"As connected areas of training in wisdom, ethics, and mental development",feedback:"Yes. These three groupings help explain how the path works as a whole.",correct:true},{label:"As a promise that life will never feel difficult",feedback:"No. The path is a way of practice, not a guarantee of a trouble-free life.",correct:false}],practice:["Bring to mind a conversation you expect to have today.","Before speaking, consider whether your words are true, useful, and kind enough for this moment.","Choose one small way to practice careful speech: ask instead of assume, pause before replying, or say what you mean clearly."],carry:["Pause before replying","Ask instead of assuming","Speak clearly and kindly"],sourceLabel:"Thanissaro Bhikkhu · The Buddha’s Teachings",sourceUrl:"https://www.dhammatalks.org/books/BuddhasTeachings/"},
 {tradition:"Hinduism",title:"Bhakti is a path of devotion",teaching:"Bhakti means devotion and is an important path in many Hindu traditions. A devotional relationship may be directed toward a particular deity or understood in other ways depending on the tradition. Practices can include prayer, singing, offerings, remembrance, or service, but there is no single form that every Hindu follows. Hindu traditions are internally diverse, so it is better to ask how a practice is understood within a specific community than to treat it as universal. In this introductory class, we’ll consider devotion broadly as sustained attention and care toward what a person holds sacred, while recognizing that this is only a small doorway into bhakti.",question:"What does bhakti refer to in many Hindu traditions?",answers:[{label:"A path of devotion, expressed in different ways",feedback:"Correct. Bhakti is a devotional path, and its expression varies.",correct:true},{label:"A requirement that every Hindu worship the same deity",feedback:"No. Hindu traditions include diverse understandings and forms of worship.",correct:false},{label:"A seasonal festival observed by all Hindus",feedback:"No. Bhakti is a path of devotion, not one festival.",correct:false}],practice:["Think of something you hold sacred or deeply value. It can be a deity, a relationship, a living being, or a principle.","Choose a small act that expresses care toward it.","Do the act with attention. Notice how devotion can be shown through what you actually do."],carry:["Express care through action","Learn from a Hindu practitioner or source","Notice what you treat as sacred"],sourceLabel:"Hindu American Foundation · Hinduism 101",sourceUrl:"https://www.hinduamerican.org/hinduism-101"},
 {tradition:"Wicca",title:"Yule and the winter solstice",teaching:"Yule is associated with the winter solstice in many Wiccan and Pagan traditions in the Northern Hemisphere. The solstice is the shortest day and longest night of the year; after it, daylight gradually increases. Some people mark Yule with evergreen plants, lights, a shared meal, seasonal ritual, or quiet reflection. Those customs are not universal, and Yule is not the same as Christmas. The date of the astronomical solstice shifts slightly by year; in Lincoln, Nebraska, it falls on December 21 in 2026. The point of this lesson is to connect a ritual to its seasonal meaning: noticing darkness, warmth, endurance, and the return of light.",question:"What does Yule mark in many Northern Hemisphere Wiccan and Pagan traditions?",answers:[{label:"The winter solstice and the turning toward longer daylight",feedback:"Yes. Many celebrate Yule around the solstice and its seasonal turning.",correct:true},{label:"A single ritual that all Wiccans must perform",feedback:"No. Customs differ and no one ritual is universal.",correct:false},{label:"The spring equinox",feedback:"Not quite. Yule is associated with midwinter, not the spring equinox.",correct:false}],practice:["Look for the seasonal light around you: a window, lamp, sunset, or the early darkness outside.","Name one thing that has helped you endure a difficult or dark stretch.","Choose one small light-bearing act for the season: offer warmth, share food, tend a candle safely, or help someone feel less alone."],carry:["Bring warmth to someone","Notice the returning light","Mark the solstice in a way that fits you"],sourceLabel:"U.S. Naval Observatory via National Weather Service · 2026 seasons",sourceUrl:"https://www.weather.gov/dvn/Climate_Astronomical_Seasons"}
];
function spiritualityCourseLesson(date){
 date=date||ymd();const start=Date.parse("2026-11-12T12:00:00"),current=Date.parse(date+"T12:00:00"),days=Math.floor((current-start)/86400000),index=((days%SPIRITUAL_LESSONS.length)+SPIRITUAL_LESSONS.length)%SPIRITUAL_LESSONS.length;
 return Object.assign({courseNumber:index+1,courseSize:SPIRITUAL_LESSONS.length},SPIRITUAL_LESSONS[index]);
}
const SPIRITUAL_WHEEL=[
 {id:"imbolc",name:"Imbolc",date:[2,1],about:"A midwinter turning associated in many modern Pagan paths with first stirrings and returning light.",practice:"Choose one small thing you want to tend as winter begins to loosen."},
 {id:"spring-equinox",name:"Spring equinox",date:[3,20],about:"A point of balance between day and night; seasonal meanings differ by tradition.",practice:"Notice what is beginning to grow and choose one small act of care."},
 {id:"beltane",name:"Beltane",date:[5,1],about:"A seasonal festival associated in many modern Pagan paths with vitality, connection, and growth.",practice:"Make room for something life-giving: creativity, movement, flowers, or time outside."},
 {id:"summer-solstice",name:"Summer solstice",date:[6,21],about:"The longest day of the year in the Northern Hemisphere; many mark fullness and light.",practice:"Name one thing that has grown and let yourself appreciate it before setting another goal."},
 {id:"lughnasadh",name:"Lughnasadh / first harvest",date:[8,1],about:"A first-harvest festival in some Pagan calendars; names and customs vary.",practice:"Notice the labor, people, land, and resources behind something you receive."},
 {id:"autumn-equinox",name:"Autumn equinox",date:[9,22],about:"A seasonal balance point; some mark gathering, gratitude, and preparation.",practice:"Name one thing you are gathering and one thing you are ready to release."},
 {id:"samhain",name:"Samhain",date:[10,31],about:"A festival marked by many Pagans around the turn from October to November; customs and meanings vary.",practice:"Remember someone or something important through a story, gratitude, or a quiet moment."},
 {id:"yule",name:"Yule / winter solstice",date:[12,21],about:"Observed around the winter solstice in many Northern Hemisphere Pagan and Wiccan traditions; exact customs and dates vary.",practice:"Notice the dark and the light. Choose one small source of warmth or care to tend through winter."}
];
function spiritualitySeasonalFocus(date){
 date=date||ymd();const current=new Date(date+"T12:00:00"),year=current.getFullYear(),events=[];
 for(const y of [year-1,year,year+1])for(const item of SPIRITUAL_WHEEL){const eventDate=new Date(y,item.date[0]-1,item.date[1],12),delta=Math.round((eventDate-current)/86400000);events.push({item:item,date:eventDate,delta:delta})}
 const active=events.filter(x=>Math.abs(x.delta)<=6).sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta))[0];
 const next=events.filter(x=>x.delta>6).sort((a,b)=>a.delta-b.delta)[0];
 const event=active||next;if(!event)return null;
 const fmt=event.date.toLocaleDateString("en-US",{month:"long",day:"numeric"});
 return{active:!!active,name:event.item.name,date:fmt,about:event.item.about,practice:event.item.practice,daysAway:event.delta};
}

function tarotForDate(date){
 date=date||ymd();const saved=(state.tarotDraws||[]).find(x=>x.date===date);let index,reversed;
 if(saved){index=Number(saved.cardIndex||0)%TAROT_MAJOR.length;reversed=!!saved.reversed}
 else{const h=spiritualHash(date+"|daily-life-tarot");index=h%TAROT_MAJOR.length;reversed=((h>>>8)%4===0)}
 const row=TAROT_MAJOR[index];return{index:index,reversed:reversed,name:row[0],meaning:reversed?row[2]:row[1],prompt:row[3],saved:saved}
}
function ensureDailyTarotSaved(date){
 date=date||ymd();state.tarotDraws=state.tarotDraws||[];
 if(state.tarotDraws.some(x=>x.date===date))return;
 const t=tarotForDate(date);state.tarotDraws.push({id:uid(),date:date,cardIndex:t.index,reversed:t.reversed,note:"",revealed:false,revealedAt:"",createdAt:new Date().toISOString()})
}
function tarotRevealed(date){
 date=date||ymd();const saved=(state.tarotDraws||[]).find(x=>x.date===date);
 if(!saved)return false;
 if(saved.revealed===undefined)return true;
 return saved.revealed===true;
}
let tarotRevealInFlight=false;
async function revealTarot(date){
 date=date||ymd();
 if(tarotRevealInFlight)return;
 ensureDailyTarotSaved(date);
 const draw=(state.tarotDraws||[]).find(x=>x.date===date);if(!draw)return;
 const before={revealed:draw.revealed,revealedAt:draw.revealedAt};
 state.spiritualityPracticeLogs=state.spiritualityPracticeLogs||[];
 let log=spiritualityLogFor(date),createdLog=false,oldTarot=log?.tarot;
 if(!log){log={id:uid(),date,reading:false,tarot:false,stillness:false,ritual:false};state.spiritualityPracticeLogs.push(log);createdLog=true}
 draw.revealed=true;draw.revealedAt=draw.revealedAt||new Date().toISOString();log.tarot=true;
 tarotRevealInFlight=true;
 // Replace the existing modal body instead of opening a second modal with the same id.
 const modalBody=document.querySelector("#modal .spirituality-hub-modal");
 if(modalBody)modalBody.innerHTML=spiritualityTarotPanel();else render();
 try{
   await save();
 }catch(error){
   draw.revealed=before.revealed;draw.revealedAt=before.revealedAt;
   if(createdLog)state.spiritualityPracticeLogs=state.spiritualityPracticeLogs.filter(x=>x!==log);
   else if(log)log.tarot=oldTarot;
   const body=document.querySelector("#modal .spirituality-hub-modal");
   if(body)body.innerHTML=spiritualityTarotPanel();else render();
   alert("The card could not be saved on this device. Please try again.");
 }finally{
   tarotRevealInFlight=false;
 }
}
function spiritualityLogFor(date){date=date||ymd();return(state.spiritualityPracticeLogs||[]).find(x=>x.date===date)||null}
async function toggleSpiritualPractice(key){
 const allowed=["reading","tarot","stillness","ritual"];if(!allowed.includes(key))return;
 state.spiritualityPracticeLogs=state.spiritualityPracticeLogs||[];
 let x=spiritualityLogFor(),created=false;if(!x){x={id:uid(),date:ymd(),reading:false,tarot:false,stillness:false,ritual:false};state.spiritualityPracticeLogs.push(x);created=true}
 const before=!!x[key];x[key]=!before;
 try{await save();render()}catch(error){if(created)state.spiritualityPracticeLogs=state.spiritualityPracticeLogs.filter(v=>v!==x);else x[key]=before;alert("Daily Life could not save this practice on this device. The change was undone; please try again.");render()}
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
function tarotDeepReading(t){
 const row=TAROT_MAJOR[Number(t?.index||0)]||TAROT_MAJOR[0],
       upright=row[1],reversed=row[2],prompt=row[3],
       core=t?.reversed?reversed:upright,
       tension=t?.reversed?upright:reversed,
       orientation=t?.reversed?"Reversed":"Upright";
 return '<div class="tarot-deep-reading">'+
   '<div class="eyebrow">'+orientation+' reflection</div>'+
   '<div class="tarot-reading-grid">'+
     '<section><span>Core theme</span><p>'+esc(core)+'</p></section>'+
     '<section><span>Watch for</span><p>'+esc(tension)+'</p></section>'+
     '<section><span>In daily life</span><p>Look for one place today where this theme is already showing up in a choice, boundary, feeling, relationship, or unfinished task. You do not need to force the card to fit.</p></section>'+
     '<section><span>Try today</span><p>'+esc(prompt)+' Pick one small action that answers that question in a practical way.</p></section>'+
   '</div>'+
   '<div class="muted small">Use this as a reflection lens, not a prediction or instruction.</div>'+
 '</div>';
}
function openTarotReflection(date){
 date=date||ymd();ensureDailyTarotSaved(date);const x=(state.tarotDraws||[]).find(v=>v.date===date),t=tarotForDate(date);
 modal("Tarot reflection · "+t.name,'<div class="stack">'+tarotArtwork(t)+tarotDeepReading(t)+'<label>My first reaction<textarea id="tarotReaction" rows="2" placeholder="Before interpreting it, what stood out?">'+esc(x.reaction||"")+'</textarea></label><label>One small intention for today<textarea id="tarotIntention" rows="2" placeholder="Something kind, practical, and within reach">'+esc(x.intention||"")+'</textarea></label><label>Your reflection<textarea id="tarotNote" rows="4" placeholder="How does the card connect with your day?">'+esc(x.note||"")+'</textarea></label><label>Looking back this evening<textarea id="tarotEvening" rows="3" placeholder="What happened? What would you like to carry into tomorrow?">'+esc(x.evening||"")+'</textarea></label></div>',"Save",async()=>{const before={...x};x.note=$("#tarotNote").value.trim();x.reaction=$("#tarotReaction").value.trim();x.intention=$("#tarotIntention").value.trim();x.evening=$("#tarotEvening").value.trim();try{await save();closeModal();render()}catch(error){Object.assign(x,before);throw error}})
}
function openSpiritualJournal(type,entryId=""){
 const entry=(state.spiritualityJournal||[]).find(v=>v.id===entryId)||null,selectedType=entry?.type||type||"Reflection",
       date=entry?.date||ymd(),note=entry?.note||entry?.question||entry?.text||"";
 const opts=["Reflection","Gratitude","Intention","Ritual","Dream","Question"].map(v=>'<option '+(v===selectedType?"selected":"")+'>'+v+'</option>').join("");
 modal(entry?"Edit spiritual journal":"Spiritual journal",'<div class="stack"><div class="grid2"><label>Date<input id="sjDate" type="date" value="'+esc(date)+'"></label><label>Type<select id="sjType">'+opts+'</select></label></div><label>Entry<textarea id="sjNote" rows="7" placeholder="Write what you want to remember, question, or explore.">'+esc(note)+'</textarea></label>'+(entry?'<button type="button" class="btn danger" data-spiritual-delete="'+esc(entry.id)+'">Delete this entry</button>':"")+'</div>',"Save",async()=>{const text=$("#sjNote").value.trim();if(!text){alert("Write an entry before saving.");return;}const fields={date:$("#sjDate").value||ymd(),type:$("#sjType").value,note:text},before=entry?{...entry}:null;let created=null;if(entry)Object.assign(entry,fields);else{state.spiritualityJournal=Array.isArray(state.spiritualityJournal)?state.spiritualityJournal:[];created={id:uid(),...fields,createdAt:new Date().toISOString()};state.spiritualityJournal.push(created)}try{await save();closeModal();render()}catch(error){if(entry)Object.assign(entry,before);else state.spiritualityJournal=state.spiritualityJournal.filter(v=>v!==created);alert("Daily Life could not save this journal entry on this device. The draft is still open; please try Save again.")}})
}
async function removeSpiritualJournal(entryId){
 const index=(state.spiritualityJournal||[]).findIndex(v=>v.id===entryId);if(index<0||!confirm("Delete this spiritual journal entry?"))return;const [entry]=state.spiritualityJournal.splice(index,1);try{await save();closeModal();render()}catch(error){state.spiritualityJournal.splice(index,0,entry);alert("Daily Life could not delete this journal entry on this device. The entry was restored; please try again.")}
}
function tarotCardMarkup(date,compact){
 date=date||ymd();ensureDailyTarotSaved(date);const t=tarotForDate(date),revealed=tarotRevealed(date);
 if(!revealed){
   return'<div class="tarot-card-shell '+(compact?"compact":"")+' tarot-unrevealed"><button class="tarot-card-back" type="button" data-tarot-reveal="'+date+'" onclick="event.preventDefault();event.stopPropagation();revealTarot(\''+date+'\');return false;" aria-label="Reveal today\'s tarot card"><div class="tarot-stars">✦ · ☾ · ✧</div><div class="tarot-back-botanical">❧</div><div class="tarot-symbol">☾</div><b>Tap to reveal</b><small>One card for reflection</small></button><div class="tarot-copy"><div class="eyebrow">For reflection, not prediction</div><p>The card stays facedown until you choose to open it.</p><b>Notice your first reaction before reading the meaning.</b></div></div>'
 }
 return'<div class="tarot-card-shell '+(compact?"compact":"")+' tarot-revealed"><button class="tarot-card-face" type="button" onclick="openTarotReflection(\''+date+'\')"><div class="tarot-stars">✦ · ☾ · ✧</div>'+tarotArtwork(t)+'<div class="tarot-name">'+esc(t.name)+'</div><div class="tarot-orientation">'+(t.reversed?"reversed":"upright")+'</div></button><div class="tarot-copy"><div class="eyebrow">For reflection, not prediction</div><p>'+esc(t.meaning)+'</p><b>'+esc(t.prompt)+'</b>'+(t.saved?.intention?'<div class="notice"><b>My intention</b><p>'+esc(t.saved.intention)+'</p></div>':'')+(compact?'<div class="actions" style="margin-top:8px"><button class="btn small" onclick="openTarotReflection(\''+date+'\')">Reflect</button></div>':'<div class="actions" style="margin-top:10px"><button class="btn primary" onclick="openTarotReflection(\''+date+'\')">Reflect / journal</button></div>')+'</div></div>'
}
function dailyPracticeCard(){
 const x=spiritualityLogFor()||{},steps=[["reading","Daily reading"],["tarot","Tarot"],["stillness","Stillness / meditation"],["ritual","Small ritual"]],done=steps.filter(v=>x[v[0]]).length;
 return'<div class="card spiritual-practice-card"><div class="section-title"><div><div class="eyebrow">Daily practice</div><h2>'+done+'/'+steps.length+' touched today</h2><div class="muted small">A menu, not a score. Do one thing or all four.</div></div><span class="tag">~'+Number(state.settings.spirituality?.dailyMinutes||5)+' min</span></div><div class="spiritual-practice-grid">'+steps.map(v=>'<button class="'+(x[v[0]]?"done":"")+'" onclick="toggleSpiritualPractice(\''+v[0]+'\')"><span>'+(x[v[0]]?"✓":"○")+'</span><b>'+esc(v[1])+'</b></button>').join("")+'</div></div>'
}
function spiritualityTodayPanel(m){
 const r=dailySpiritualReading(),s=spiritualitySeason(),ml=moonLens(m);
 return'<div class="card daily-reading-card floral-card"><div class="eyebrow">Daily reading · '+esc(r.lens)+'</div><h2>'+esc(r.title)+'</h2><p class="spiritual-reading-text">'+esc(r.body)+'</p><div class="spiritual-practice-line"><span>Try today</span><b>'+esc(r.practice)+'</b></div>'+spiritualitySourceLink(r)+'<button class="btn" onclick="openSpiritualJournal(\'Reflection\')">Journal about this</button></div>'+dailyPracticeCard()+'<div class="card spiritual-season-card floral-card"><div class="section-title"><div><div class="eyebrow">Seasonal wheel</div><h2>'+esc(s.title)+'</h2><div class="muted small">'+esc(s.theme)+'</div></div><button class="btn" onclick="setSpiritualityTab(\'rituals\')">Ritual ideas</button></div><div class="spiritual-moon"><span class="moon-mark">'+esc(m?.[1]||"☾")+'</span><span><b>'+esc(m?.[0]||"Moon")+'</b><small>'+esc(ml.phaseAction)+'</small></span></div></div><div class="card daily-tarot-card floral-card"><div class="section-title"><div><div class="eyebrow">Daily tarot</div><h2>One card for reflection</h2></div><button class="btn" onclick="setSpiritualityTab(\'tarot\')">Open Tarot</button></div>'+tarotCardMarkup(ymd(),true)+'</div>'
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
 return'<div class="card floral-card"><div class="section-title"><div><div class="eyebrow">Journal</div><h2>Spiritual reflections</h2><div class="muted small">Questions, gratitude, intentions, dreams, rituals, or whatever feels meaningful.</div></div><button class="btn primary" onclick="openSpiritualJournal()">+ Entry</button></div>'+(rows.slice(0,30).map(x=>'<div class="row"><span><b>'+esc(x.type||"Reflection")+'</b><div class="muted small">'+esc(dl(x.date))+' · '+esc(x.note||x.question||x.text||"")+'</div></span><button type="button" class="btn small" data-spiritual-entry="'+esc(x.id||"")+'">Edit</button></div>').join("")||'<div class="notice">No journal entries yet.</div>')+'</div>'
}
function spiritualityReadingCard(){
 const r=dailySpiritualReading();
 return'<div class="card daily-reading-card floral-card"><div class="eyebrow">Daily reading · '+esc(r.lens)+'</div><h2>'+esc(r.title)+'</h2><p class="spiritual-reading-text">'+esc(r.body)+'</p><div class="spiritual-practice-line"><span>Try today</span><b>'+esc(r.practice)+'</b></div>'+spiritualitySourceLink(r)+'<button class="btn" onclick="openSpiritualJournal(\'Reflection\')">Journal about this</button></div>'
}
function spiritualityMoonSeasonCard(m){
 m=m||moon();const s=spiritualitySeason(),ml=moonLens(m),
       placementLabel=ml.sign+(Number.isFinite(ml.degree)?" "+ml.degree.toFixed(1)+"°":""),
       chartRows=(ml.chart||[]).map(x=>'<div class="astro-chart-row"><span><b>'+esc(x.label)+' · '+esc(x.sign)+'</b><small>'+esc([x.theme,x.relationship].filter(Boolean).join(" · ")||"personal lens")+'</small></span><p>'+esc(x.prompt)+'</p></div>').join("");
 return'<div class="card spiritual-season-card floral-card astrology-moon-card">'+
   '<div class="section-title"><div><div class="eyebrow">Moon right now</div><h2>'+esc(placementLabel)+'</h2><div class="muted small">'+esc([ml.element,ml.modality,m?.[0]].filter(Boolean).join(" · "))+'</div></div><button class="btn" onclick="openAstrologySettings()">My placements</button></div>'+
   '<div class="astrology-current-reading"><span class="moon-mark">'+esc(m?.[1]||"☾")+'</span><div><b>'+esc(MOON_SIGN_READINGS?.[ml.sign]||ml.currentReading||"")+'</b><small>'+esc(ml.phaseAction)+'</small></div></div>'+
   '<div class="astro-focus"><span>Reflection question</span><b>'+esc(ml.question||"What deserves your attention today?")+'</b></div>'+
   (chartRows?'<div class="astro-chart-lenses"><div class="mini-heading">Current Moon × your chart</div>'+chartRows+'</div>':'<div class="notice"><b>Want a more personal reading?</b><div class="muted small">Add your Sun, Moon, and Rising signs. The app will compare today’s Moon sign with those placements at the sign level.</div><button class="btn small" onclick="openAstrologySettings()">Add placements</button></div>')+
   '<details class="compact-more"><summary>Seasonal wheel · '+esc(s.title)+'</summary><div class="muted small">'+esc(s.theme)+'</div></details>'+
   '<div class="muted small astrology-disclaimer">Current Moon sign is an approximate tropical astronomical placement. The interpretation is for reflection, not prediction.</div>'+
 '</div>'
}
function spiritualityHistoryCard(){
 const journals=[...(state.spiritualityJournal||[])].sort((a,b)=>(String(b.date||"")+String(b.createdAt||"")).localeCompare(String(a.date||"")+String(a.createdAt||""))).slice(0,16),
       cards=[...(state.tarotDraws||[])].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).slice(0,10);
 return'<div class="card"><div class="eyebrow">History</div><h2>Recent spiritual notes + cards</h2>'+
   (journals.length?journals.map(x=>'<div class="row"><span><b>'+esc(x.type||"Reflection")+'</b><div class="muted small">'+esc(dl(x.date))+(x.question?' · '+esc(x.question):x.note?' · '+esc(x.note):'')+'</div></span><button type="button" class="btn small" data-spiritual-entry="'+esc(x.id||"")+'">Edit</button></div>').join(""):'')+
   (cards.length?'<div class="mini-heading">Daily tarot</div>'+cards.map(x=>{const t=tarotForDate(x.date);return'<button class="row" onclick="openTarotReflection(\''+x.date+'\')"><span><b>'+esc(t.name)+(x.reversed?" · reversed":"")+'</b><div class="muted small">'+esc(dl(x.date))+'</div></span><span>›</span></button>'}).join(""):'')+
   (!journals.length&&!cards.length?'<div class="notice">No spiritual history yet.</div>':'')+'</div>'
}
function openSpiritualityPage(event){
 if(event){event.preventDefault?.();event.stopPropagation?.()}
 if(typeof closeModal==="function"&&document.querySelector("#modal"))closeModal();
 if(typeof setView==="function")setView("spirituality");
 else{view="spirituality";if(typeof render==="function")render()}
 requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"smooth"}));
 return false;
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
  m=m||moon();
  ensureDailyTarotSaved();
  const panels={
    today:spiritualityTodayPanel(m),
    tarot:spiritualityTarotPanel(),
    rituals:spiritualityRitualsPanel(),
    journal:spiritualityJournalPanel()
  };
  const active=["today","tarot","rituals","journal"].includes(spiritualityTab)?spiritualityTab:"today";
  return '<section class="spirituality-page">'+
    '<div class="spirituality-page-heading"><div><div class="eyebrow">Spirituality</div><h2>Reflection at your pace</h2><p class="muted small">Your five-minute daily practice, with optional readings, rituals, tarot, and journaling.</p></div>'+
    '<button class="btn small primary" type="button" onclick="openSpiritualJournal()">＋ Journal</button></div>'+
    spiritualityGuideLandingCard()+
    spiritualityTabs()+
    '<div class="spirituality-page-content" aria-live="polite">'+panels[active]+'</div>'+
  '</section>';
}
function spiritualityLaunchCard(){
 const r=dailySpiritualReading(),t=tarotForDate(),s=spiritualitySeason(),tarotLabel=tarotRevealed()?t.name:"Tarot ready to reveal";
 return'<div class="card spirituality-launch floral-card"><div class="section-title"><div><div class="eyebrow">☾ Spirituality</div><h2>'+esc(r.title)+'</h2><div class="muted small">'+esc(r.lens)+' · '+esc(tarotLabel)+' · '+esc(s.title)+'</div></div><button class="btn primary" type="button" data-open-spirituality="page" onclick="setView(&quot;spirituality&quot;)">Open</button></div></div>'
}
function todaySpiritualityCard(){
 const r=dailySpiritualReading(),t=tarotForDate(),tarotLabel=tarotRevealed()?t.name:"card ready to reveal";
 return'<div class="card today-spirituality floral-card"><div class="section-title"><div><div class="eyebrow">☾ Daily reading</div><h2>'+esc(r.title)+'</h2><div class="muted small">'+esc(r.lens)+' · Tarot: '+esc(tarotLabel)+'</div></div><button class="btn" type="button" data-open-spirituality="page" onclick="setView(&quot;spirituality&quot;)">Open</button></div><div class="spiritual-preview-text">'+esc(r.body)+'</div></div>'
}

// Keep inline controls reliable in the installed Android PWA as well as the browser tab.
window.openSpiritualityPage=openSpiritualityPage;
// visual-hubs.js owns this route and loads first; preserve its full-page navigation.
if(typeof window.openSpiritualHubSection!=="function")window.openSpiritualHubSection=openSpiritualHubSection;
window.revealTarot=revealTarot;
window.openTarotReflection=openTarotReflection;

if(!window.__dailyLifeSpiritualityDelegates){
 window.__dailyLifeSpiritualityDelegates=true;
 document.addEventListener("click",event=>{
    const entry=event.target.closest?.("[data-spiritual-entry]");
    if(entry){event.preventDefault();event.stopPropagation();openSpiritualJournal("",entry.getAttribute("data-spiritual-entry")||"");return}
    const remove=event.target.closest?.("[data-spiritual-delete]");
    if(remove){event.preventDefault();event.stopPropagation();removeSpiritualJournal(remove.getAttribute("data-spiritual-delete")||"");return}
   const reveal=event.target.closest?.("[data-tarot-reveal]");
   if(reveal){
     event.preventDefault();event.stopPropagation();
     revealTarot(reveal.getAttribute("data-tarot-reveal")||ymd());
     return;
   }
   const open=event.target.closest?.("[data-open-spirituality]");
   if(open){
     event.preventDefault();event.stopPropagation();
     openSpiritualityPage(event);
   }
 },true);
}

(function installTarotDeepReadingStyles(){
 if(document.getElementById("tarotDeepReadingStyles"))return;
 const style=document.createElement("style");
 style.id="tarotDeepReadingStyles";
 style.textContent=".tarot-deep-reading{display:grid;gap:9px}.tarot-reading-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.tarot-reading-grid section{padding:10px;border:1px solid var(--border);border-radius:14px;background:color-mix(in srgb,var(--panel) 88%,transparent)}.tarot-reading-grid span{display:block;font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}.tarot-reading-grid p{margin:5px 0 0;line-height:1.45}.daily-reading-card,.today-spirituality,.spirituality-launch{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(255,241,247,.94))!important;color:#3f3140!important;border-color:rgba(198,116,157,.22)!important}.daily-reading-card .muted,.today-spirituality .muted,.spirituality-launch .muted{color:#715f70!important}.daily-reading-card .spiritual-reading-text,.today-spirituality .spiritual-preview-text{color:#3f3140!important;line-height:1.55}.tarot-card-back{touch-action:manipulation;cursor:pointer}.tarot-card-back b{font-size:1rem}@media(max-width:520px){.tarot-reading-grid{grid-template-columns:1fr}}";
 document.head.appendChild(style);
})();

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

(function installSpiritualityPageStyles(){
  if(document.getElementById("spiritualityPageStyles"))return;
  const style=document.createElement("style");
  style.id="spiritualityPageStyles";
  style.textContent=".spirituality-page{display:grid;gap:12px;max-width:900px;margin:0 auto;padding:0 0 calc(96px + env(safe-area-inset-bottom));}.spirituality-page-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--primary) 24%,var(--border));border-radius:20px;background:linear-gradient(130deg,color-mix(in srgb,#f3b6cf 35%,var(--panel)),color-mix(in srgb,#cce8d3 35%,var(--panel)),color-mix(in srgb,#d8c8f0 30%,var(--panel)));color:var(--text)}.spirituality-page-heading h2{margin:3px 0;font-family:var(--font-heading,Georgia,serif)}.spirituality-page-heading p{margin:2px 0}.spirituality-page .spirituality-tabs{position:sticky;top:0;z-index:8;background:var(--panel);box-shadow:0 4px 14px rgba(80,50,80,.08)}.spirituality-page-content{display:grid;gap:12px;min-width:0}.spirituality-page-content>.card{margin:0}.spirituality-tabs button{min-height:44px;touch-action:manipulation}@media(max-width:480px){.spirituality-page-heading{align-items:flex-start}.spirituality-page-heading .btn{flex:0 0 auto}.spirituality-page .spirituality-tabs{gap:3px}.spirituality-page .spirituality-tabs button{padding:6px 3px;font-size:.78rem}}";
  document.head.appendChild(style);
})();

let spiritualityGuideRun=null;
function spiritualitySourceLink(reading){
 if(!reading||!reading.sourceUrl)return"";
 return'<p class="spiritual-source"><a href="'+esc(reading.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Source: '+esc(reading.sourceLabel||"Read more")+'</a></p>';
}
function spiritualityGuideLandingCard(){
 const lesson=spiritualityCourseLesson(),season=spiritualitySeasonalFocus();
 return'<section class="card spirituality-guide-card floral-card"><div class="eyebrow">Daily spiritual education · class '+lesson.courseNumber+' of '+lesson.courseSize+'</div><h2>'+esc(lesson.title)+'</h2><div class="tag">'+esc(lesson.tradition)+'</div><p class="muted">Learn one idea from a tradition, check what you understood, then move through a guided practice. No typing and no countdown holding you in place.</p>'+(season?'<div class="spiritual-guide-season"><b>'+(season.active?'In season now':'Coming up')+' · '+esc(season.name)+'</b><p>'+esc(season.about)+(season.active?' Try this season: '+esc(season.practice):' · Around '+esc(season.date)+' in the Northern Hemisphere.')+'</p></div>':'')+'<button type="button" class="btn primary spirituality-guide-start" onclick="startSpiritualityPractice()">Start today’s class</button><div class="muted small">About five minutes at your pace · lesson, understanding check, guided practice, reflection</div></section>'
}
function spiritualityGuideChoiceGroup(group,options,selected){
 return'<div class="spiritual-guide-choices" role="group">'+options.map(function(option,index){
  const value=group==="quiz"?String(index):option,active=selected===value;
  return'<button type="button" class="spiritual-guide-choice'+(active?' is-selected':'')+'" aria-pressed="'+(active?'true':'false')+'" onclick="chooseSpiritualityGuide(\''+group+'\',\''+esc(value)+'\')">'+esc(option)+'</button>';
 }).join("")+'</div>'
}
function chooseSpiritualityGuide(group,value){
 if(!spiritualityGuideRun)return;
 if(group==="quiz"){
  const index=Number(value);if(!Number.isInteger(index)||!spiritualityGuideRun.lesson.answers[index])return;
  spiritualityGuideRun.quizChoice=index;
 }else if(group==="carry"){
  const allowed=spiritualityGuideRun.lesson.carry;if(!allowed.includes(value))return;
  spiritualityGuideRun.carryForward=value;
 }else return;
 showSpiritualityGuideStep();
}
function spiritualityGuideSteps(){
 const run=spiritualityGuideRun,lesson=run.lesson,season=spiritualitySeasonalFocus(run.date);
 const answerChoices=spiritualityGuideChoiceGroup("quiz",lesson.answers.map(x=>x.label),run.quizChoice===null?null:String(run.quizChoice));
 const carryChoices=spiritualityGuideChoiceGroup("carry",lesson.carry,run.carryForward);
 const chosen=run.quizChoice===null?null:lesson.answers[run.quizChoice];
 const quizFeedback=chosen?'<div class="spiritual-guide-feedback '+(chosen.correct?'is-correct':'is-review')+'"><b>'+(chosen.correct?'That’s right.':'Let’s refine that.')+'</b><p>'+esc(chosen.feedback)+'</p>'+(chosen.correct?'':'<p><b>Key idea:</b> '+esc(lesson.answers.find(x=>x.correct)?.label||"")+'</p>')+'</div>':'';
 const practicePrompt=lesson.practice[run.practiceStep]||lesson.practice[0];
 const practiceLabel=run.practiceStep+1;
 const practiceSeason=season?.active?'<div class="spiritual-guide-season"><b>Seasonal connection · '+esc(season.name)+'</b><p>'+esc(season.about)+' '+esc(season.practice)+'</p></div>':season&&season.daysAway<=45?'<div class="spiritual-guide-season"><b>Coming up · '+esc(season.name)+' around '+esc(season.date)+'</b><p>'+esc(season.about)+'</p></div>':'';
 return[
  {title:"Today’s lesson · "+lesson.tradition,kind:"lesson",text:'<p class="spiritual-guide-teaching">'+esc(lesson.teaching)+'</p>'+spiritualitySourceLink(lesson)+(season?'<div class="spiritual-guide-season"><b>'+(season.active?'Seasonal practice now':'Next seasonal observance · '+esc(season.name))+'</b><p>'+esc(season.about)+(season.active?' '+esc(season.practice):' · Around '+esc(season.date)+' in the Northern Hemisphere.')+'</p></div>':'')},
  {title:"Check what you understood",kind:"quiz",required:"quizChoice",text:'<p class="spiritual-guide-question">'+esc(lesson.question)+'</p>'+answerChoices+quizFeedback},
  {title:"Guided practice · part "+practiceLabel+" of "+lesson.practice.length,kind:"practice",text:'<div class="spiritual-guide-practice-count">Move through each prompt at your own pace. No waiting for a timer.</div><p class="spiritual-guide-practice-prompt">'+esc(practicePrompt)+'</p>'+(run.practiceStep===lesson.practice.length-1?practiceSeason:'')},
  {title:"Carry one idea into today",kind:"reflection",required:"carryForward",text:'<p class="spiritual-guide-question">Which of these feels like a useful next step after today’s lesson?</p>'+carryChoices}
 ];
}
function showSpiritualityGuideStep(){
 if(!spiritualityGuideRun)return;
 const run=spiritualityGuideRun,steps=spiritualityGuideSteps(),step=steps[run.step];
 const style='<style>.spiritual-guide-choices{display:grid;grid-template-columns:1fr;gap:9px;margin:16px 0}.spiritual-guide-choice{min-height:50px;padding:12px 15px;border:1px solid #decfdf;border-radius:15px;background:#fff;color:#49384d;font:inherit;font-size:.92rem;font-weight:700;text-align:left;cursor:pointer}.spiritual-guide-choice.is-selected{border-color:#a45b87;background:linear-gradient(110deg,#f7c8da,#d9edf0);box-shadow:0 0 0 2px #fff inset}.spiritual-guide-question{margin:14px 0 8px;font-size:1.06rem;font-weight:800}.spiritual-guide-feedback,.spiritual-guide-season{margin:15px 0;padding:14px 16px;border-radius:16px;background:#f8eef6;color:#49384d;line-height:1.5}.spiritual-guide-feedback.is-correct{background:#edf8f0}.spiritual-guide-feedback p,.spiritual-guide-season p{margin:6px 0 0}.spiritual-guide-teaching,.spiritual-guide-practice-prompt{font-size:1.04rem;line-height:1.65}.spiritual-guide-practice-count{font-size:.82rem;color:#746778;margin-bottom:12px}.spiritual-guide-practice-prompt{padding:17px;border-radius:16px;background:#fff8fc}.spiritual-guide-progress{font-weight:750;color:#76566f;margin:0 0 12px}.spiritual-guide-lesson-body{max-height:min(65vh,720px);overflow:auto;padding:0 2px 14px}</style>';
 const ready=!step.required||run[step.required]!==undefined&&run[step.required]!==null&&run[step.required]!=="";
 const label=step.kind==="lesson"?"Continue to the question":step.kind==="quiz"?"Continue to the practice":step.kind==="practice"?(run.practiceStep<run.lesson.practice.length-1?"Next practice prompt":"Continue to reflection"):"Finish & save";
 const progress='<div class="spiritual-guide-progress">Part '+(run.step+1)+' of 4'+(step.kind==="practice"?' · '+(run.practiceStep+1)+' of '+run.lesson.practice.length+' practice prompts':'')+'</div>';
 const body='<div class="spiritual-guide-lesson-body"><h3>'+esc(step.title)+'</h3><div class="spiritual-guide-instruction">'+step.text+'</div></div>';
 modal("Class "+run.lesson.courseNumber+" · "+run.lesson.tradition,style+progress+body,ready?label:(step.kind==="quiz"?"Choose an answer":"Choose a next step"),advanceSpiritualityPractice);
 const next=document.getElementById("saveModal");if(next){next.classList.add("spiritual-guide-next");next.disabled=!ready;next.setAttribute("aria-disabled",ready?"false":"true")}
}
function startSpiritualityPractice(){
 const date=ymd();
 spiritualityGuideRun={date:date,lesson:spiritualityCourseLesson(date),season:spiritualitySeasonalFocus(date),step:0,practiceStep:0,quizChoice:null,carryForward:""};
 showSpiritualityGuideStep();
}
function advanceSpiritualityPractice(){
 if(!spiritualityGuideRun)return;
 const run=spiritualityGuideRun,step=spiritualityGuideSteps()[run.step];
 if(step.kind==="quiz"&&run.quizChoice===null)return;
 if(step.kind==="practice"&&run.practiceStep<run.lesson.practice.length-1){run.practiceStep++;showSpiritualityGuideStep();return}
 if(step.kind==="reflection"){completeSpiritualityPractice();return}
 run.step++;
 showSpiritualityGuideStep();
}
async function completeSpiritualityPractice(){
 if(!spiritualityGuideRun)return;
 const run=spiritualityGuideRun,date=run.date;
 state.spiritualityPracticeLogs=Array.isArray(state.spiritualityPracticeLogs)?state.spiritualityPracticeLogs:[];
 let log=spiritualityLogFor(date),created=false,before=null;
 if(!log){log={id:uid(),date:date,reading:false,tarot:false,stillness:false,ritual:false};state.spiritualityPracticeLogs.push(log);created=true}
 else before={...log};
 const answer=run.lesson.answers[run.quizChoice];
 log.reading=true;log.guidedPractice=true;log.guidedPracticeMinutes=5;log.guidedPracticeLessonId=run.lesson.courseNumber;log.guidedPracticeTradition=run.lesson.tradition;log.guidedPracticeTitle=run.lesson.title;log.guidedPracticeQuizCorrect=!!answer?.correct;log.guidedPracticeCarryForward=run.carryForward;log.guidedPracticeSeason=run.season?.active?run.season.name:"";log.guidedPracticeCompletedAt=new Date().toISOString();
 try{await save();spiritualityGuideRun=null;closeModal();render()}
 catch(error){if(created)state.spiritualityPracticeLogs=state.spiritualityPracticeLogs.filter(function(x){return x!==log});else Object.assign(log,before);alert("The class could not be saved yet. Your existing record was kept unchanged.");const retry=document.getElementById("saveModal");if(retry){retry.disabled=false;retry.textContent="Try saving again";retry.onclick=completeSpiritualityPractice}}
}
(function installSpiritualityGuideStyles(){
 if(document.getElementById("spiritualityGuideStyles"))return;
 const style=document.createElement("style");style.id="spiritualityGuideStyles";
 style.textContent=".spirituality-guide-card{border:1px solid color-mix(in srgb,#a96e9a 35%,var(--border));background:linear-gradient(145deg,color-mix(in srgb,#f6dce9 42%,var(--panel)),color-mix(in srgb,#e5f3eb 38%,var(--panel)),color-mix(in srgb,#e9e1f6 35%,var(--panel)))}.spirituality-guide-card h2{font-family:var(--font-heading,Georgia,serif);margin:4px 0}.spiritual-guide-preview{display:grid;gap:7px;padding:12px;border-radius:16px;background:color-mix(in srgb,var(--panel) 88%,transparent);margin:10px 0}.spirituality-guide-start{width:100%;min-height:48px}.spirituality-guide-progress{font-weight:700;color:var(--muted);margin:0 0 12px}.spiritual-guide-clock{font:700 2.3rem var(--font-heading,Georgia,serif);text-align:center;margin:4px 0 12px;color:var(--primary)}.spirituality-guide-step h3,.spiritual-guide-reading h3{margin:4px 0 8px}.spiritual-guide-instruction{line-height:1.6}.spirituality-guide-step{padding:14px;border-radius:18px;background:color-mix(in srgb,#f7e8ef 45%,var(--panel));min-width:0}.spiritual-guide-reading{padding:12px;border-radius:14px;background:color-mix(in srgb,var(--panel) 90%,transparent)}.spiritual-source{font-size:.82rem;margin:8px 0;color:var(--muted)}.spirituality-guide-next:disabled{opacity:.65;cursor:wait}@media(max-width:480px){.spirituality-guide-card{padding:14px}.spirituality-guide-step{padding:12px}}";
 document.head.appendChild(style);
})();
