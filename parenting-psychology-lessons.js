/* Daily Life: guided parenting and psychology lessons */
(function(){
"use strict";
const lessons=[
 {id:"connect",title:"Connect before you correct",tag:"Emotional coaching",idea:"When a child is overwhelmed, name the feeling first. You can still hold a firm boundary.",example:"“You really want more screen time. It is hard to stop. Screens are done for tonight.”",question:"Which reply acknowledges feelings AND keeps the limit?",answers:["Stop being dramatic.","You are disappointed. I hear you. Screens are done.","Fine, you win. Keep playing."],correct:1,why:"Validating a feeling is not the same as changing the rule.",practice:["You can be upset, and the answer is still no.","I hear you. I will help you through this."]},
 {id:"choices",title:"Offer two real choices",tag:"Cooperation",idea:"Give children a little control within a boundary that you have already decided.",example:"“It is teeth-brushing time. Do you want to start yourself or have me help?”",question:"Which is a genuine choice?",answers:["Do you want to go to school?","Would you like the blue shirt or the striped shirt?","Do you promise to stop being difficult?"],correct:1,why:"Both options are acceptable to the adult; the child gets some agency.",practice:["You can walk to the bathroom or hop there.","You can put on your shoes or ask me to help."]},
 {id:"repair",title:"Repair after a rough moment",tag:"Emotional safety",idea:"An adult can apologize for snapping without blaming a child for the adult’s behavior.",example:"“I yelled earlier. That was not okay. I am sorry. I will work on using a calmer voice.”",question:"What makes an apology meaningful?",answers:["Explain that your child made you yell.","Own the action, acknowledge its impact and try differently.","Pretend nothing happened."],correct:1,why:"Taking responsibility builds trust; it does not require perfection.",practice:["I raised my voice. That was not okay. I am sorry.","I will try again in a calmer voice."]},
 {id:"curiosity",title:"Look beneath the behavior",tag:"Behavior and needs",idea:"Repeated behavior may signal a lagging skill, stress, hunger, or trouble with transitions. Stay curious while keeping limits.",example:"A child interrupts at dinner time. See whether they need a simple job, a snack, or help practicing waiting.",question:"Which question is most useful?",answers:["What might be hard for my child right now?","What punishment would make this stop forever?","Why are they trying to upset me?"],correct:0,why:"Understanding the missing skill or unmet need can reveal an effective next step.",practice:["Is there a skill they need help practicing?","Could tiredness or a transition be making this harder?"]}
];
const e=v=>typeof window.esc==="function"?window.esc(v):String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const taskMatch=t=>!!t&&/learn\b.{0,50}(parenting|psychology)|(parenting|psychology).{0,50}\bskill/i.test(String(t.title||""));
window.isParentingSkillTask=taskMatch;
const logs=()=>{state.settings=state.settings||{};return state.settings.parentingSkillLessons=Array.isArray(state.settings.parentingSkillLessons)?state.settings.parentingSkillLessons:[]};
const today=()=>typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10);
const nextLesson=()=>lessons[logs().filter(x=>x.completed).length%lessons.length];
const originalToggle=window.toggleTask;
let session=null;
window.openParentingSkillLesson=function(taskId){
 const task=(state.tasks||[]).find(x=>String(x.id)===String(taskId)&&taskMatch(x))||(state.tasks||[]).find(taskMatch);
 session={taskId:task?String(task.id):"",lesson:nextLesson(),step:0,answer:-1,practice:-1};
 show();
};
function show(){
 if(!session)return;
 const l=session.lesson,step=session.step;
 const latest=logs().filter(x=>x.completed&&x.date===today()).slice(-1)[0];
 const dots='<div class="skill-dots">'+[0,1,2,3].map(i=>'<span class="'+(i<=step?"on":"")+'"></span>').join("")+'</div>';
 let body="";
 if(step===0)body='<div class="skill-pane"><b>THE IDEA</b><p>'+e(l.idea)+'</p></div><div class="skill-pane"><b>REAL-LIFE EXAMPLE</b><p>'+e(l.example)+'</p></div><div class="skill-actions"><button class="btn" onclick="skillReadAloud()">♫ Listen</button><button class="btn primary" onclick="skillNext()">Try a situation ›</button></div>';
 if(step===1)body='<div class="skill-pane"><b>THINK IT THROUGH</b><p>'+e(l.question)+'</p></div><div class="skill-choices">'+l.answers.map((v,i)=>'<button class="skill-choice '+(session.answer===i?"chosen":"")+'" onclick="skillChoose('+i+')">'+e(v)+'</button>').join("")+'</div>'+(session.answer>=0?'<div class="skill-pane"><b>'+(session.answer===l.correct?"That is the idea.":"Consider this:")+'</b><p>'+e(l.why)+'</p></div><button class="btn primary" onclick="skillNext()">Practice a response ›</button>':"");
 if(step===2)body='<div class="skill-pane"><b>PRACTICE OUT LOUD OR IN YOUR HEAD</b><p>Choose a line you could say to your children. Try it in your own voice.</p></div><div class="skill-choices">'+l.practice.map((v,i)=>'<button class="skill-choice '+(session.practice===i?"chosen":"")+'" onclick="skillPractice('+i+')">'+e(v)+'</button>').join("")+'</div>'+(session.practice>=0?'<button class="btn primary" onclick="skillNext()">I practiced it ›</button>':"");
 if(step===3)body='<div class="skill-pane"><b>TAKEAWAY</b><p>'+e(l.idea)+'</p></div><p class="muted small">Opening a lesson does not mark the task done. Only completing this lesson records progress.</p><button class="btn primary skill-finish" onclick="skillFinish()">✓ Mark lesson complete</button>';
 const previous=latest?'<div class="skill-undo"><span>Completed today: '+e(latest.title||"Parenting skill")+'</span><button onclick="skillUndo()">Undo last completion</button></div>':"";
 const html='<div class="skill-class"><div class="skill-heading"><small>'+e(l.tag)+' · GUIDED LESSON</small><h2>'+e(l.title)+'</h2><p>Learn · think · practice</p>'+dots+'</div>'+body+previous+'</div>';
 modal("Parenting & psychology",html,"Close",closeModal);
}
window.skillNext=function(){if(!session||session.step===1&&session.answer<0||session.step===2&&session.practice<0)return;session.step=Math.min(3,session.step+1);show();};
window.skillChoose=i=>{if(session&&session.step===1){session.answer=Number(i);show();}};
window.skillPractice=i=>{if(session&&session.step===2){session.practice=Number(i);show();}};
window.skillReadAloud=function(){
 if(!("speechSynthesis" in window)){alert("Speech is not supported on this device.");return;}
 speechSynthesis.cancel();
 const l=session.lesson,u=new SpeechSynthesisUtterance(l.title+". "+l.idea+". For example: "+l.example);
 u.rate=.95;speechSynthesis.speak(u);
};
window.skillFinish=async function(){
 if(!session||session.step!==3)return;
 const t=(state.tasks||[]).find(x=>String(x.id)===session.taskId),wasUndone=!!(t&&!t.done);
 const entry={id:"skill-"+Date.now(),date:today(),topic:session.lesson.id,title:session.lesson.title,taskId:session.taskId,markedTask:wasUndone,completed:true};
 logs().push(entry);
 try{if(wasUndone&&originalToggle)await originalToggle(t.id,true);else await save();}
 catch(error){const j=logs().findIndex(x=>x.id===entry.id);if(j>=0)logs().splice(j,1);alert("Could not save your lesson.");return;}
 render();session={taskId:session.taskId,lesson:nextLesson(),step:0,answer:-1,practice:-1};show();
};
window.skillUndo=async function(){
 const arr=logs();let idx=-1;for(let i=arr.length-1;i>=0;i--)if(arr[i].completed&&arr[i].date===today()){idx=i;break;}
 if(idx<0)return;const old=arr.splice(idx,1)[0],t=(state.tasks||[]).find(x=>String(x.id)===String(old.taskId));
 try{if(old.markedTask&&t&&t.done&&originalToggle)await originalToggle(t.id,false);else await save();}
 catch(error){arr.splice(idx,0,old);alert("Could not undo this lesson.");return;}
 render();session={taskId:old.taskId,lesson:lessons.find(x=>x.id===old.topic)||nextLesson(),step:0,answer:-1,practice:-1};show();
};
if(typeof originalToggle==="function")window.toggleTask=async function(id,done){
 const t=(state.tasks||[]).find(x=>String(x.id)===String(id));
 if(done&&taskMatch(t)){window.openParentingSkillLesson(id);render();return;}
 return originalToggle.apply(this,arguments);
};
const style=document.createElement("style");
style.id="parentingPsychologyLessonsStyle";
style.textContent=".skill-class{display:grid;gap:14px;max-width:640px}.skill-heading{border-radius:18px;padding:18px;background:linear-gradient(135deg,#ffdbeb,#e2d7ff,#ccf0ff);color:#3c2144}.skill-heading small,.skill-pane b{font-size:.75rem;font-weight:800;letter-spacing:.07em;color:#812e83}.skill-heading h2{font-size:1.4rem;margin:7px 0}.skill-heading p{margin:0}.skill-dots{display:flex;gap:7px;margin-top:14px}.skill-dots span{height:7px;border-radius:12px;flex:1;background:#ffffffa0}.skill-dots .on{background:#d0398f}.skill-pane{border:1px solid #e5c3e3;background:#fff8fd;border-radius:14px;padding:14px;color:#3c2144}.skill-pane p{margin:8px 0 0;line-height:1.5}.skill-choices{display:grid;gap:9px}.skill-choice{text-align:left;border:2px solid #e4c3e4;border-radius:13px;padding:13px;background:#fff;color:#3c2144;font-weight:600;line-height:1.4;cursor:pointer}.skill-choice.chosen{border-color:#bc338e;background:#fbe0f4}.skill-actions{display:flex;gap:10px;flex-wrap:wrap}.skill-finish{width:100%;padding:15px!important}.skill-undo{border-top:1px solid #ddd;padding-top:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:.83rem}.skill-undo button{border:0;background:transparent;color:#af267f;text-decoration:underline;font-weight:700;padding:6px}.lm-lesson-launch{background:transparent;text-align:left;border:0;flex:1;min-width:0;color:inherit;padding:11px;cursor:pointer}.lm-lesson-launch b,.lm-lesson-launch small{display:block}.lm-lesson-row{display:flex;gap:8px;align-items:center}.lm-lesson-row .lm-task-edit{flex-shrink:0}.task-ui-lesson .task-ui-main:after{content:'Open lesson ›';display:block;color:#bd328b;font-size:.82rem;font-weight:800;margin-top:5px}";
document.head.appendChild(style);
})();