
(function(){
'use strict';
const D=window.DATA, S=D.S, VOICE=window.VOICE||{base:[],map:{}};
const KEY='kpop-english-stars-v1';
const $=(s,r=document)=>r.querySelector(s);
const app=$('#app');
const rnd=n=>Math.floor(Math.random()*n);
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=a=>a[rnd(a.length)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const STICKERS=['💖','🌟','🎀','🦄','🍭','🎧','🎤','🌈','🐰','🍓','🎵','🦋','👑','💎','🍦','🐱','🎹','🌸','✨','🪩'];
const STARS_PER_STICKER=12;
const LEVELS=[
 {id:1,name:S.lv1,en:S.lv1en,size:5,songs:[{types:['case','letpic','lislet'],n:3},{types:['piclet','letpic','case','lislet'],n:4,hard:true}]},
 {id:2,name:S.lv2,en:S.lv2en,size:5,pool:'L2',songs:[{types:['w2p','p2w','listen'],n:3},{types:['w2p','p2w','listen'],n:4,hard:true}]},
 {id:3,name:S.lv3,en:S.lv3en,size:5,pool:'L3',songs:[{types:['w2p','p2w','listen'],n:3},{types:['p2w','listen','w2p'],n:4,hard:true}]},
 {id:4,name:S.lv4,en:S.lv4en,size:5,songs:[{types:['s2p','tf'],n:3},{types:['s2p','tf'],n:4,hard:true}]},
 {id:5,name:S.lv5,en:S.lv5en,size:4,songs:[{types:['story'],group:0},{types:['story'],group:1}]}
];
const NSONG=2;
// Official KPop Demon Hunters videos (YouTube embeds only; verified official channel + embeddable 2026-10-27)
const MV=[
 {id:'yebNIHKAC4A',t:'Golden',a:'HUNTR/X',ch:'Sony Pictures Animation'},
 {id:'QGsevnbItdU',t:"How It's Done",a:'HUNTR/X',ch:'Sony Pictures Animation'},
 {id:'983bBbJx0Mk',t:'Soda Pop',a:'Saja Boys',ch:'Sony Pictures Animation'},
 {id:'l8Dr7vzMSVE',t:'Takedown',a:'TWICE',ch:'Sony Pictures Animation'},
 {id:'cWppAbqm9I8',t:'Your Idol',a:'Saja Boys',ch:'Sony Pictures Animation'},
 {id:'fjOeJssZX_Q',t:'Free',a:'Rumi & Jinu',ch:'Sony Pictures Animation'},
 {id:'TbMEMCvFbZk',t:'What It Sounds Like',a:'HUNTR/X',ch:'Sony Pictures Animation'}
];
// ---------- state ----------
function fresh(){return {v:1,music:true,stars:0,level:1,song:1,cleared:{},cards:[],stickers:[],history:[],stats:{},struggle:{},answered:0,firstTry:0,sound:true,intro:false,name:'',created:Date.now()}}
let st;
try{st=Object.assign(fresh(),JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){st=fresh()}
(function migrate(){
 if(!(st.song>=1))st.song=1;if(st.song>NSONG)st.song=NSONG;
 if(st.level<1||st.level>5||!(st.level|0))st.level=1;
 if(st.done==null)st.done=[1,2,3].every(x=>st.cleared['5-'+x])||(st.cleared['5-1']&&st.cleared['5-2'])||false;
 if(!Array.isArray(st.mv)){const anyPass=st.history.some(h=>h.n&&h.ok/h.n>=0.8)||Object.keys(st.cleared).length>0;let n=(anyPass?1:0)+(st.level-1)+(st.done?1:0);st.mv=Array.from({length:Math.min(MV.length,n)},(_,i)=>i)}
})();
function unlockNextMV(){const i=MV.findIndex((_,k)=>!st.mv.includes(k));if(i<0)return null;st.mv.push(i);return i}
function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}}
// ---------- sound effects (WebAudio) ----------
let ac=null;
function actx(){if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(ac&&ac.state==='suspended')ac.resume();return ac}
function tone(f,d,type,vol,when){const c=actx();if(!c||!st.sound)return;const t=c.currentTime+(when||0);const o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||0.18,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d+0.05)}
const sfx={
 good(){[784,988,1319].forEach((f,i)=>tone(f,.22,'triangle',.14,i*.08))},
 soft(){tone(330,.18,'sine',.12);tone(262,.25,'sine',.1,.12)},
 tap(){tone(660,.06,'sine',.06)},
 sparkle(){[1568,2093,2637,3136].forEach((f,i)=>tone(f,.16,'sine',.08,i*.06))},
 fanfare(){const n=[523,659,784,1047,784,1047,1319];n.forEach((f,i)=>{tone(f,.3,'square',.07,i*.14);tone(f/2,.3,'triangle',.08,i*.14)});[1047,1319,1568].forEach(f=>tone(f,1.1,'triangle',.07,n.length*.14))}
};
// ---------- music ----------
const TRACKS={menu:'audio/menu.mp3',game:'audio/game.mp3',concert:'audio/concert.mp3'};
const TVOL={menu:.45,game:.3,concert:.7};
let mus={el:null,gain:null,key:null,playing:null,unlocked:false,fade:0,duck:false};
function musicOn(){return st.music!==false}
function musEnsure(){
 if(mus.el)return mus.el;
 const el=new Audio();el.loop=true;el.preload='auto';mus.el=el;
 try{const c=actx();if(c&&c.createMediaElementSource){const src=c.createMediaElementSource(el);const g=c.createGain();g.gain.value=0;src.connect(g);g.connect(c.destination);mus.gain=g}}catch(e){mus.gain=null}
 return el;
}
function musVolFor(k){return (TVOL[k]||.4)*(mus.duck?.3:1)}
function musSetVol(v,ms){
 if(mus.gain){const c=actx();const t=c.currentTime;try{mus.gain.gain.cancelScheduledValues(t);mus.gain.gain.setValueAtTime(mus.gain.gain.value,t);mus.gain.gain.linearRampToValueAtTime(v,t+(ms||0)/1000)}catch(e){mus.gain.gain.value=v}}
 else if(mus.el){mus.el.volume=Math.max(0,Math.min(1,v))}
}
function musStart(){
 const k=mus.key;if(!k||!musicOn()||!mus.unlocked||mus.hold)return;
 const el=musEnsure();
 if(mus.playing===k&&!el.paused)return;
 const swap=()=>{el.src=TRACKS[k];mus.playing=k;musSetVol(0,0);const p=el.play();if(p&&p.catch)p.catch(()=>{});musSetVol(musVolFor(k),700)};
 clearTimeout(mus.fade);
 if(mus.playing&&!el.paused){musSetVol(0,350);mus.fade=setTimeout(swap,380)}else swap();
}
function music(k){mus.key=k;musStart()}
function musStop(){clearTimeout(mus.fade);if(mus.el){musSetVol(0,250);const el=mus.el;setTimeout(()=>{el.pause()},280)}mus.playing=null}
function musDuck(on){mus.duck=on;if(mus.playing&&mus.el&&!mus.el.paused)musSetVol(musVolFor(mus.playing),on?150:600)}
function musToggle(){if(mus.hold)return;if(musicOn()&&!mus.playing){mus.unlocked=true;actx();musStart();return}st.music=!musicOn();save();if(musicOn()){mus.unlocked=true;actx();musStart()}else musStop();document.querySelectorAll('#mus').forEach(b=>{b.classList.toggle('off',!musicOn());b.setAttribute('aria-pressed',musicOn())})}
function musBtn(){return `<button class="iconbtn mus ${musicOn()?'':'off'}" id="mus" aria-label="music" aria-pressed="${musicOn()}">🎵</button>`}
function bindMus(){const b=$('#mus');if(b)b.onclick=e=>{e.stopPropagation();musToggle()}}
// ---------- English voice: pre-recorded clips, browser speech as backup ----------
const voiceEl=new Audio();voiceEl.preload='auto';
let vUnlocked=false,vTok=0;const vFail={};
function clipUrl(k){const m=VOICE.map[k];return m?VOICE.base[m[0]]+m[1]+'.mp3':null}
function unlockVoice(){if(vUnlocked)return;vUnlocked=true;const u=clipUrl('p:0');if(!u)return;const tok=vTok;try{voiceEl.muted=true;voiceEl.src=u;const p=voiceEl.play();const done=()=>{if(tok!==vTok)return;try{voiceEl.pause();voiceEl.currentTime=0}catch(e){}voiceEl.muted=false};if(p&&p.then)p.then(done,done);else done()}catch(e){voiceEl.muted=false}}
let enVoice=null;
function pickVoice(){if(!('speechSynthesis' in window))return null;const vs=speechSynthesis.getVoices()||[];const en=vs.filter(v=>/^en[-_]US/i.test(v.lang));const pref=['Samantha','Google US English','Microsoft Aria','Microsoft Jenny','Allison','Ava'];for(const p of pref){const v=en.find(v=>v.name.indexOf(p)>=0);if(v)return v}return en[0]||vs.find(v=>/^en/i.test(v.lang))||null}
if('speechSynthesis' in window){enVoice=pickVoice();try{speechSynthesis.onvoiceschanged=()=>{enVoice=pickVoice()}}catch(e){}}
function synth(text,tok){return new Promise(res=>{if(!('speechSynthesis' in window)||!text){res();return}try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.85;if(enVoice)u.voice=enVoice;u.onend=u.onerror=()=>res();speechSynthesis.speak(u);setTimeout(res,9000)}catch(e){res()}})}
function stopVoice(){vTok++;try{voiceEl.pause()}catch(e){}try{if('speechSynthesis' in window)speechSynthesis.cancel()}catch(e){}musDuck(false);document.querySelectorAll('.speak.playing').forEach(b=>b.classList.remove('playing'))}
// say(key, text): plays the recorded clip for key; if it cannot load, the browser's own en-US voice reads text
function say(k,text,btn){
 stopVoice();const tok=vTok;const u=clipUrl(k);
 if(btn)btn.classList.add('playing');musDuck(true);
 const fin=()=>{if(tok!==vTok)return;musDuck(false);if(btn)btn.classList.remove('playing')};
 return new Promise(res=>{
  const end=()=>{fin();res()};
  if(!u||vFail[k]){synth(text,tok).then(end);return}
  let settled=false;const ok=()=>{if(settled)return;settled=true;cleanup();end()};
  const bad=()=>{if(settled)return;settled=true;cleanup();vFail[k]=1;if(tok===vTok)synth(text,tok).then(end);else res()};
  const cleanup=()=>{voiceEl.removeEventListener('ended',ok);voiceEl.removeEventListener('error',bad);clearTimeout(tt)};
  voiceEl.addEventListener('ended',ok);voiceEl.addEventListener('error',bad);
  const tt=setTimeout(ok,15000);
  try{voiceEl.muted=false;voiceEl.src=u;const p=voiceEl.play();if(p&&p.catch)p.catch(err=>{if(err&&(err.name==='NotAllowedError'||err.name==='AbortError')){if(!settled){settled=true;cleanup();end()}}else bad()})}catch(e){bad()}
 });
}
function prefetch(keys){keys.forEach(k=>{const u=clipUrl(k);if(u&&!prefetch.done[u]){prefetch.done[u]=1;try{fetch(u,{mode:'no-cors'}).catch(()=>{})}catch(e){}}})}
prefetch.done={};
['pointerdown','touchend','click'].forEach(ev=>document.addEventListener(ev,function(e){unlockVoice();if(e.target&&e.target.closest&&e.target.closest('#mus'))return;mus.unlocked=true;actx();musStart()},true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopVoice();if(!mus.el)return;if(document.hidden)mus.el.pause();else if(musicOn()&&mus.playing){const p=mus.el.play();if(p&&p.catch)p.catch(()=>{})}});
// ---------- toast & confetti ----------
let toastT;
function toast(t,soft,en){const el=$('#toast');el.textContent=t;el.setAttribute('dir',en?'ltr':'rtl');el.className='show'+(soft?' soft':'')+(en?' en':'');clearTimeout(toastT);toastT=setTimeout(()=>el.className=soft?'soft':'',soft?1100:1000)}
const cv=$('#confetti'),cx=cv.getContext('2d');let parts=[],raf=0;
function confetti(n){cv.width=innerWidth;cv.height=innerHeight;const cols=['#ff4fa3','#ffd84d','#4fe3ff','#b58cff','#7dffb0','#ffffff'];for(let i=0;i<(n||120);i++)parts.push({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*.5,vx:(Math.random()-.5)*3,vy:2+Math.random()*4,r:Math.random()*6.28,vr:(Math.random()-.5)*.3,w:6+Math.random()*6,h:8+Math.random()*8,c:pick(cols),s:Math.random()<.25});if(!raf)loop()}
function loop(){cx.clearRect(0,0,cv.width,cv.height);parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;cx.save();cx.translate(p.x,p.y);cx.rotate(p.r);cx.fillStyle=p.c;if(p.s){cx.font='18px sans-serif';cx.fillText('⭐',0,0)}else cx.fillRect(-p.w/2,-p.h/2,p.w,p.h);cx.restore()});parts=parts.filter(p=>p.y<cv.height+30);if(parts.length)raf=requestAnimationFrame(loop);else{raf=0;cx.clearRect(0,0,cv.width,cv.height)}}
// ---------- weighting (items missed come back more often) ----------
function weight(id){const s=st.stats[id];if(!s)return 3;let w=1+Math.min(4,(s.w||0)*1.5);if(s.last&&Date.now()-s.last<5*60*1000)w*=.3;return w}
function wpick(arr,idf,taken){const c=arr.filter(x=>!taken.has(idf(x)));if(!c.length)return pick(arr);let tot=0;const ws=c.map(x=>{const w=weight(idf(x));tot+=w;return w});let r=Math.random()*tot;for(let i=0;i<c.length;i++){r-=ws[i];if(r<=0)return c[i]}return c[c.length-1]}
function segs(p){if(window.Intl&&Intl.Segmenter){return Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(p),x=>x.segment)}return Array.from(p)}
// ---------- letters ----------
const LOOK={b:'dpqh',d:'bpqa',p:'qbdg',q:'pgdb',m:'nwu',n:'mhu',u:'nvw',w:'mvu',v:'uwy',i:'ljt',l:'itj',j:'iyg',t:'fil',f:'tk',h:'nbk',k:'hx',a:'odec',o:'aec',e:'cao',c:'eoa',g:'qpy',y:'gvj',r:'nm',s:'zc',z:'sx',x:'kz'};
const SOUNDS=['BDPTVZGCE','MN','AJKH','IY','QUW','FSX','LR','O'];
const LETS=D.LET.map(x=>x.L);
const PICLETS=D.LET.filter(x=>x.L!=='X');
function lookAlike(l,n,hard){const lo=l.toLowerCase();let c=(LOOK[lo]||'').split('').filter(x=>x!==lo);c=hard?c:shuffle(c).slice(0,1);const rest=shuffle(LETS.map(x=>x.toLowerCase()).filter(x=>x!==lo&&!c.includes(x)));return c.concat(rest).slice(0,n-1)}
function soundAlike(L,n){const g=SOUNDS.find(s=>s.includes(L))||'';const c=shuffle(g.split('').filter(x=>x!==L));const rest=shuffle(LETS.filter(x=>x!==L&&!c.includes(x)));return c.concat(rest).slice(0,n-1)}
const pair=L=>L+' '+L.toLowerCase();
// ---------- item builders ----------
const B={
 case(n,taken,pool,hard){const it=wpick(D.LET,x=>'case:'+x.L,taken);const up=Math.random()<.6;const ds=lookAlike(it.L,n,hard);
  const tgt=up?it.L:it.L.toLowerCase();const conv=x=>up?x:x.toUpperCase();
  return {id:'case:'+it.L,kind:'case',instr:up?S.q_case_ul:S.q_case_lu,target:tgt,tcls:'letter',audio:'L:'+it.L,atext:it.L,after:'L:'+it.L,afterText:it.L,opts:shuffle([{t:conv(it.L.toLowerCase()),ok:1},...ds.map(x=>({t:conv(x)}))]),ocls:'let'}},
 letpic(n,taken){const it=wpick(PICLETS,x=>'letpic:'+x.L,taken);const ds=shuffle(PICLETS.filter(x=>x.L!==it.L&&x.e!==it.e)).slice(0,n-1);
  return {id:'letpic:'+it.L,kind:'letpic',instr:S.q_letpic,target:pair(it.L),tcls:'letter',audio:'L:'+it.L,atext:it.L,after:'LW:'+it.L,afterText:it.L+'. '+it.w,opts:shuffle([{t:it.e,ok:1},...ds.map(x=>({t:x.e}))]),ocls:'emoji'}},
 piclet(n,taken){const it=wpick(PICLETS,x=>'piclet:'+x.L,taken);const ds=soundAlike(it.L,n);
  return {id:'piclet:'+it.L,kind:'piclet',instr:S.q_piclet,target:it.e,tcls:'pic',audio:'w:'+it.w,atext:it.w,after:'LW:'+it.L,afterText:it.L+'. '+it.w,opts:shuffle([{t:pair(it.L),ok:1},...ds.map(x=>({t:pair(x)}))]),ocls:'let small'}},
 lislet(n,taken){const it=wpick(D.LET,x=>'lislet:'+x.L,taken);const ds=soundAlike(it.L,n);
  return {id:'lislet:'+it.L,kind:'lislet',instr:S.q_lislet,listen:1,audio:'L:'+it.L,atext:it.L,after:'LW:'+it.L,afterText:it.L+'. '+it.w,opts:shuffle([{t:pair(it.L),ok:1},...ds.map(x=>({t:pair(x)}))]),ocls:'let small'}},
 w2p(n,taken,pool){const it=wpick(pool,x=>'w2p:'+x.w,taken);let cand=pool.filter(x=>x.e!==it.e&&x.w!==it.w);
  const ds=shuffle(cand).slice(0,n-1);
  return {id:'w2p:'+it.w,kind:'w2p',instr:S.q_w2p,target:it.w,tcls:'word',audio:'w:'+it.w,atext:it.w,after:'w:'+it.w,afterText:it.w,opts:shuffle([{t:it.e,ok:1},...ds.map(x=>({t:x.e}))]),ocls:'emoji'}},
 p2w(n,taken,pool,hard){const it=wpick(pool,x=>'p2w:'+x.w,taken);let cand=pool.filter(x=>x.e!==it.e&&x.w!==it.w);
  const a=it.w;const sim=cand.filter(x=>{const b=x.w;return (it.c&&x.c===it.c)||b[0]===a[0]||b.slice(-2)===a.slice(-2)});
  cand=hard?shuffle(sim).concat(shuffle(cand.filter(x=>!sim.includes(x)))):shuffle(sim).slice(0,1).concat(shuffle(cand.filter(x=>!sim.includes(x))));
  const ds=cand.slice(0,n-1);
  return {id:'p2w:'+it.w,kind:'p2w',instr:S.q_p2w,target:it.e,tcls:'pic',audio:null,after:'w:'+it.w,afterText:it.w,opts:shuffle([{t:it.w,ok:1},...ds.map(x=>({t:x.w}))]),ocls:'word'}},
 listen(n,taken,pool,hard){let words=pool.map(x=>x.w);if(pool===D.L3)words=words.concat(D.SIGHT);words=[...new Set(words)];
  const it=wpick(words.map(w=>({w})),x=>'listen:'+x.w,taken).w;let cand=words.filter(x=>x!==it&&x.toLowerCase()!==it.toLowerCase());
  const sim=cand.filter(b=>b[0].toLowerCase()===it[0].toLowerCase()||b.slice(-2)===it.slice(-2)||(b.length===it.length&&b[1]===it[1]));
  cand=(hard?shuffle(sim):shuffle(sim).slice(0,1)).concat(shuffle(cand.filter(x=>!sim.includes(x))));
  return {id:'listen:'+it,kind:'listen',instr:S.q_listen,listen:1,audio:'w:'+it,atext:it,opts:shuffle([{t:it,ok:1},...cand.slice(0,n-1).map(t=>({t}))]),ocls:'word'}},
 s2p(n,taken,pool,hard){const it=wpick(D.SP,x=>'s2p:'+x.s,taken);const tg=segs(it.p);let cand=D.SP.filter(x=>x.p!==it.p);
  const share=cand.filter(x=>segs(x.p).some(g=>tg.includes(g))||x.s.split(' ').slice(0,2).join(' ')===it.s.split(' ').slice(0,2).join(' '));const rest=cand.filter(x=>!share.includes(x));
  cand=hard?shuffle(share).concat(shuffle(rest)):shuffle(share).slice(0,1).concat(shuffle(rest));
  const ds=[];const seen=new Set([it.p]);for(const x of cand){if(ds.length>=n-1)break;if(seen.has(x.p))continue;seen.add(x.p);ds.push(x)}
  return {id:'s2p:'+it.s,kind:'s2p',instr:S.q_s2p,target:it.s,tcls:'sent',audio:'s:'+it.s,atext:it.s,after:'s:'+it.s,afterText:it.s,opts:shuffle([{t:it.p,ok:1},...ds.map(x=>({t:x.p}))]),ocls:'emoji'}},
 tf(n,taken){const it=wpick(D.TF,x=>'tf:'+x.s,taken);
  return {id:'tf:'+it.s,kind:'tf',instr:S.q_tf,target:it.s,tcls:'sent',audio:'s:'+it.s,atext:it.s,opts:[{t:'✅ '+S.true,he:S.true_he,ok:it.t?1:0},{t:'❌ '+S.false,he:S.false_he,ok:it.t?0:1}],ocls:'tf',cols:2}},
 story(n,taken,pool,hard,group){const per=Math.ceil(D.ST.length/2);let idxs=D.ST.map((_,i)=>i).filter(i=>Math.floor(i/per)===group);if(group==null)idxs=D.ST.map((_,i)=>i);
  const choices=[];idxs.forEach(i=>D.ST[i].qs.forEach((q,qi)=>choices.push({i,qi})));const c=wpick(choices,x=>'story:'+x.i+':'+x.qi,taken);const s=D.ST[c.i],q=s.qs[c.qi];
  return {id:'story:'+c.i+':'+c.qi,story:c.i,kind:'story',instr:S.q_story,target:s.text,tcls:'story',pic:s.pic,question:q[0],qaudio:'q:'+c.i+':'+c.qi,audio:'st:'+c.i,atext:s.text,opts:shuffle([{t:q[1],ok:1},{t:q[2]},{t:q[3]}]),ocls:'long',cols:1}}
};
function poolFor(lv){return lv===2?D.L2:lv===3?D.L3:null}
function buildRound(lv,song){
 const L=LEVELS[lv-1],cfg=L.songs[song-1],key=lv+'-'+song,struggle=!!st.struggle[key];
 const items=[],taken=new Set(),usedStory=new Set();
 let size=L.size;let reviewN=0;
 if(lv>1)reviewN=struggle?2:(lv<5?1:0);
  const mk=(lvl,cfg2,i)=>{const t=cfg2.types[i%cfg2.types.length];let n=cfg2.n||3;if(struggle&&t!=='tf'&&t!=='story')n=Math.max(2,n-1);
  for(let tries=0;tries<12;tries++){const it=B[t](n,taken,poolFor(lvl),cfg2.hard&&!struggle,cfg2.group);if(!it)continue;if(taken.has(it.id))continue;if(it.story!=null&&usedStory.has(it.story))continue;taken.add(it.id);if(it.story!=null)usedStory.add(it.story);return it}return null};
 const order=shuffle(Array.from({length:size-reviewN},(_,i)=>i));
 for(const i of order){const it=mk(lv,cfg,i);if(it)items.push(it)}
 if(reviewN){const pl=LEVELS[lv-2];const pcfg=pl.songs[0];for(let i=0;i<reviewN;i++){const it=mk(lv-1,{types:pcfg.types,n:3,group:pcfg.group},i);if(it){it.review=1;items.splice(1+rnd(items.length),0,it)}}}
 const keys=[];items.forEach(it=>{['audio','after','qaudio'].forEach(f=>{if(it[f])keys.push(it[f])})});prefetch(keys.slice(0,40));
 return {lv,song,key,items,idx:0,res:[],tries:0,start:Date.now(),struggle};
}
// ---------- screens ----------
let round=null;
function hello(){return st.name?S.hello_name.replace('{n}',esc(st.name)):S.hello}
function topbar(extra){
 return `<div class="topbar"><button class="iconbtn" id="gear" aria-label="teacher">⚙️<span class="ring"></span></button>
 <span class="pill">⭐ <b id="starc">${st.stars}</b></span>${musBtn()}${extra||`<button class="iconbtn" id="coll" aria-label="collection">🎴</button>`}</div>`;
}
function levelDone(lv){return st.level>lv||(lv===5&&st.done)||[1,2].every(s=>st.cleared[lv+'-'+s])}
function home(){
 round=null;stopVoice();
 const spots=LEVELS.map(L=>`<span class="spot ${levelDone(L.id)?'on':''}"></span>`).join('');
 const allDone=!!st.done;
 const nmv=st.mv.length;
 app.innerHTML=`${topbar()}
 <div class="hello en" dir="ltr" lang="en">${hello()} ⭐</div>
 <div class="title en" dir="ltr" lang="en">${S.app_title} ⭐</div>
 <div class="stage hero-stage"><div class="spots">${spots}</div>${IDOLS.heroHTML()}</div>
 <button class="bigbtn" id="play">🎤 ${S.play}<small>${S.level} ${st.level} · ${S.song} ${st.song} ${S.of} ${NSONG}</small></button>
 <button class="bigbtn mvbtn" id="songs">🎬 השירים מהסרט <span class="cnt">${nmv}/${MV.length}</span></button>
 <div class="levels">${LEVELS.map(L=>{const open=L.id<=st.level||allDone;return `<button class="lvl ${L.id===st.level?'cur':''} ${open?'':'ahead'}" data-lv="${L.id}">
  <div class="n">${open?L.id:'🚀'}</div><div class="nm">${L.name}</div><div class="lven en" dir="ltr" lang="en">${esc(L.en)}</div><div class="dots">${[1,2].map(s=>`<i class="${st.cleared[L.id+'-'+s]||st.level>L.id||(L.id===5&&st.done)?'on':''}"></i>`).join('')}</div></button>`}).join('')}</div>
 ${!allDone&&st.level<5?`<button class="jumpbtn" id="jump">⏩ ${st.level===1?'כבר יודעים אותיות? קפצו קדימה':'קל לכם? קפצו קדימה'}</button>`:''}
 <div class="hold-hint">${S.parent_hint}</div>`;
 $('#play').onclick=()=>{sfx.tap();startRound(st.level,st.song)};
 $('#songs').onclick=()=>{sfx.tap();songsPage()};
 const j=$('#jump');if(j)j.onclick=()=>{sfx.tap();jumpPicker()};
 app.querySelectorAll('.lvl[data-lv]').forEach(b=>b.onclick=()=>{sfx.tap();const lv=+b.dataset.lv;if(lv===st.level){startRound(st.level,st.song);return}
  if(lv>st.level&&!allDone){jumpPicker(lv);return}
  const s=[1,2].find(s=>!st.cleared[lv+'-'+s])||1;startRound(lv,s)});
 bindCommon();
 music('menu');
 if(!st.intro)intro();
}
function jumpPicker(only){
 const ov=document.createElement('div');ov.className='sheet';
 const lvls=LEVELS.filter(L=>L.id>st.level&&(!only||L.id===only));
 ov.innerHTML=`<div class="sheetbox">
  <div class="msg sm">🚀 לאן קופצים?</div>
  <div class="sub">אפשר לקפוץ ישר לשלב קשה יותר. הכוכבים והאוסף נשמרים.</div>
  ${lvls.map(L=>`<button class="jumpto" data-j="${L.id}"><b>${S.level} ${L.id}</b> · ${L.name} <span class="en" dir="ltr" lang="en">${esc(L.en)}</span></button>`).join('')}
  <button class="linkbtn dark" id="jx">לא עכשיו</button></div>`;
 document.body.appendChild(ov);
 const close=()=>ov.remove();
 ov.addEventListener('click',e=>{if(e.target===ov)close()});
 ov.querySelector('#jx').onclick=close;
 ov.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{sfx.sparkle();const lv=+b.dataset.j;st.level=lv;st.song=1;save();close();startRound(lv,1)});
}
// ---------- real songs (official YouTube embeds) ----------
let playerOpen=false;
function ytThumb(m){return 'https://i.ytimg.com/vi/'+m.id+'/mqdefault.jpg'}
function ytWatch(m){return 'https://www.youtube.com/watch?v='+m.id}
function openPlayer(i){
 const m=MV[i];if(!m)return;
 stopVoice();playerOpen=true;mus.hold=true;musStop();
 const ov=document.createElement('div');ov.className='ytov';ov.id='ytov';
 const src='https://www.youtube-nocookie.com/embed/'+m.id+'?autoplay=1&rel=0&playsinline=1&modestbranding=1';
 ov.innerHTML=`<div class="ytbox">
  <div class="ythead"><div><div class="ytt en" dir="ltr" lang="en">${esc(m.t)}</div><div class="yta en" dir="ltr" lang="en">${esc(m.a)} · KPop Demon Hunters</div></div><button class="iconbtn" id="ytx" aria-label="close">✖</button></div>
  <div class="ytframe"><iframe src="${src}" title="${esc(m.t)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
  <div class="ytcred">הסרטון הרשמי מערוץ <bdi>${esc(m.ch)}</bdi> ביוטיוב</div>
  <a class="ytopen" href="${ytWatch(m)}" target="_blank" rel="noopener">לא נפתח? צפו ביוטיוב ↗</a>
 </div>`;
 document.body.appendChild(ov);
 const close=()=>{ov.remove();playerOpen=false;mus.hold=false;musStart()};
 ov.querySelector('#ytx').onclick=close;
 ov.addEventListener('click',e=>{if(e.target===ov)close()});
}
function songsPage(){
 stopVoice();
 const next=MV.findIndex((_,k)=>!st.mv.includes(k));
 const rows=MV.map((m,i)=>st.mv.includes(i)?`<button class="mvrow" data-mv="${i}"><img src="${ytThumb(m)}" alt="" loading="lazy"><div class="mvtx"><div class="mvt en" dir="ltr" lang="en">${esc(m.t)}</div><div class="mva en" dir="ltr" lang="en">${esc(m.a)}</div></div><span class="mvplay">▶</span></button>`
  :`<div class="mvrow lock"><div class="mvlock">🔒</div><div class="mvtx"><div class="mvt en" dir="ltr" lang="en">${esc(m.t)}</div><div class="mva">${i===next?(st.mv.length?'נפתח בהופעה הבאה 🎤':'נפתח אחרי הסבב הראשון 🎤'):'עוד מעט…'}</div></div></div>`).join('');
 app.innerHTML=`${topbar(`<button class="iconbtn" id="homeb">🏠</button>`)}
 <div class="h2">🎬 השירים מהסרט</div>
 <div class="sub" style="text-align:center">כל עלייה בשלב פותחת שיר חדש! (${st.mv.length}/${MV.length})</div>
 <div class="mvlist">${rows}</div>
 <button class="bigbtn" id="play2">🎤 ${S.play}</button>`;
 bindCommon();
 $('#homeb').onclick=()=>{sfx.tap();home()};
 $('#play2').onclick=()=>{sfx.tap();startRound(st.level,st.song)};
 app.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{sfx.tap();openPlayer(+b.dataset.mv)});
 music('menu');
}
function intro(){
 const ov=document.createElement('div');ov.className='concert';ov.style.background='radial-gradient(circle at 50% 30%,#8a2fd0,#1a0533 75%)';
 ov.innerHTML=`<div class="lights"><i style="left:5%"></i><i style="left:38%;animation-delay:-.7s"></i><i style="right:5%;animation-delay:-1.4s"></i></div>
 <div class="msg">${S.welcome_stage}</div>
 <div class="trio">${[0,1,2].map(i=>IDOLS.idolSVG(i)).join('')}</div>
 <div class="msg en introen" dir="ltr" lang="en">Hi! We are Rumi, Mira and Zoey! <button class="speak sm" id="ispk" aria-label="listen">🔊</button></div>
 <div class="namebox"><label for="nm">${S.name_q}</label><input id="nm" maxlength="16" autocomplete="off" placeholder="${S.name_ph}" value="${esc(st.name||'')}"></div>
 <button class="bigbtn" id="go">${S.start} ⭐</button>
 <button class="linkbtn" id="skip">${S.skip}</button>`;
 document.body.appendChild(ov);
 ov.querySelector('#ispk').onclick=e=>{e.stopPropagation();say('intro',"Hi! We are Rumi, Mira and Zoey. Let's learn English!",e.currentTarget)};
 const fin=keep=>{sfx.sparkle();if(keep){const v=(ov.querySelector('#nm').value||'').trim().slice(0,16);st.name=v}st.intro=true;save();ov.remove();home()};
 ov.querySelector('#go').onclick=()=>fin(true);
 ov.querySelector('#skip').onclick=()=>fin(false);
}
function bindCommon(){
 bindMus();
 const c=$('#coll');if(c)c.onclick=()=>{sfx.tap();collection('cards')};
 const g=$('#gear');if(!g)return;let t0=0,timer=0,af=0;
 const ring=g.querySelector('.ring');
 const stop=()=>{clearTimeout(timer);cancelAnimationFrame(af);ring.style.setProperty('--p',0)};
 const tick=()=>{const p=Math.min(100,(Date.now()-t0)/30);ring.style.setProperty('--p',p);if(p<100)af=requestAnimationFrame(tick)};
 g.addEventListener('pointerdown',e=>{e.preventDefault();t0=Date.now();tick();timer=setTimeout(()=>{stop();parent()},3000)});
 ['pointerup','pointerleave','pointercancel'].forEach(ev=>g.addEventListener(ev,stop));
 g.addEventListener('contextmenu',e=>e.preventDefault());
}
function startRound(lv,song){round=buildRound(lv,song);music('game');showItem()}
function spkBtn(id,cls){return `<button class="speak ${cls||''}" id="${id}" aria-label="listen">🔊</button>`}
function showItem(){
 const r=round,it=r.items[r.idx];r.tries=0;r.wrongs=0;r.revealed=false;stopVoice();
 const prog=r.items.map((_,i)=>`<i class="${i<r.res.length?(r.res[i]===1?'ok':'meh'):''} ${i===r.idx?'now':''}"></i>`).join('');
 const n=it.opts.length;const cols=it.cols||(n===3?3:2);
 let tgt='';
 if(it.listen) tgt=`<button class="speak big" id="spk" aria-label="listen">🔊</button><div class="lhint">${S.listen_hint}</div>`;
 else if(it.kind==='story') tgt=`<div class="storypic">${it.pic}</div><div class="tgtrow" dir="ltr"><div class="target story en" lang="en">${esc(it.target)}</div>${spkBtn('spk','sm')}</div><div class="tgtrow q" dir="ltr"><div class="storyq en" lang="en">${esc(it.question)}</div>${spkBtn('qspk','sm')}</div>`;
 else tgt=`<div class="tgtrow" dir="ltr"><div class="target ${it.tcls} ${it.tcls==='pic'?'':'en'}" lang="en">${esc(it.target)}</div>${it.audio?spkBtn('spk',it.tcls==='sent'?'sm':''):''}</div>`;
 app.innerHTML=`<div class="topbar"><button class="iconbtn" id="homeb" aria-label="home">🏠</button><div class="progress">${prog}</div><span class="pill">⭐ <b id="starc">${st.stars}</b></span>${musBtn()}</div>
 <div class="qcard"><div class="instr">${it.instr}</div>${tgt}</div>
 <div class="opts c${cols}" dir="ltr">${it.opts.map((o,i)=>`<button class="opt ${it.ocls||''} ${it.ocls==='emoji'?'':'en'}" lang="en" data-i="${i}">${esc(o.t)}${o.he?`<small dir="rtl">${o.he}</small>`:''}</button>`).join('')}</div>
 <div class="mini">${IDOLS.idolSVG(r.idx%3,{noname:true,cls:'round'})}</div>`;
 $('#homeb').onclick=()=>{sfx.tap();home()};bindMus();
 const spk=$('#spk');if(spk){spk.onclick=e=>{e.stopPropagation();say(it.audio,it.atext,spk)};if(it.listen)setTimeout(()=>{if(round===r&&r.items[r.idx]===it)say(it.audio,it.atext,spk)},450)}
 const q=$('#qspk');if(q)q.onclick=e=>{e.stopPropagation();say(it.qaudio,it.question,q)};
 app.querySelectorAll('.opt').forEach(b=>b.onclick=()=>answer(b,it));
}
function answer(btn,it){
 const r=round;if(r.lock)return;const o=it.opts[+btn.dataset.i];
 if(btn.classList.contains('wrong'))return;
 const stat=st.stats[it.id]||(st.stats[it.id]={n:0,w:0});
 if(o.ok){
  r.lock=true;btn.classList.add('right');sfx.good();
  const first=r.tries===0;const score=first?1:(r.revealed?0:0.5);
  const gi=rnd(S.good.length);
  if(first){st.stars++;st.firstTry++;toast(S.good[gi]+' ⭐',false,true);const m=$('.mini');m&&m.classList.add('jump');}else if(!r.revealed)toast(S.good[gi],false,true);
  st.answered++;
  stat.n++;stat.last=Date.now();if(!first)stat.w++;
  r.res.push(score);save();
  const sc=$('#starc');if(sc)sc.textContent=st.stars;
  const t0=Date.now();
  const next=()=>{if(round!==r)return;r.lock=false;r.idx++;if(r.idx>=r.items.length)endRound();else showItem()};
  let p;
  if(it.after)p=sleep(250).then(()=>round===r?say(it.after,it.afterText):null);
  else if(first&&(it.kind==='tf'||it.kind==='story'))p=sleep(200).then(()=>round===r?say('p:'+gi,S.good[gi]):null);
  else p=Promise.resolve();
  Promise.race([p,sleep(4500)]).then(()=>{const w=Math.max(0,(first?1000:1300)-(Date.now()-t0));setTimeout(next,w+250)});
 }else{
  r.tries++;btn.classList.add('wrong');sfx.soft();
  const left=[...app.querySelectorAll('.opt')].filter(b=>!b.classList.contains('wrong'));
  if(left.length<=1||r.tries>=2){r.revealed=true;left.forEach(b=>{if(it.opts[+b.dataset.i].ok)b.classList.add('hint')});toast(S.reveal+' ✨',true)}
  else toast((r.tries===1?S.try:S.almost)+' 💜',true);
 }
}
function endRound(){
 const r=round;const total=r.items.length;const firsts=r.res.filter(x=>x===1).length;const pct=firsts/total;const pass=pct>=0.8;
 st.history.unshift({t:Date.now(),lv:r.lv,song:r.song,ok:firsts,n:total,sec:Math.round((Date.now()-r.start)/1000),st:r.struggle?1:0});st.history=st.history.slice(0,60);
 st.struggle[r.key]=pct<0.5;
 let newCard=null,levelUp=false,allDone=false,newMV=null,skipped=false;
 if(pass){st.stars+=3;const ci=Array.from({length:15},(_,i)=>i).find(i=>!st.cards.includes(i));if(ci!=null){st.cards.push(ci);newCard=ci}
  st.cleared[r.key]=true;
  const perfect=firsts===total;
  if(r.lv===st.level&&r.song===st.song&&!st.done){
   if(st.song<NSONG&&!perfect)st.song++;
   else{levelUp=true;skipped=st.song<NSONG;if(st.level<5){st.level++;st.song=1}else{allDone=true;st.done=true}}
  }
  if(levelUp||!st.mv.length||st.done)newMV=unlockNextMV();
 }
 let newSticker=null;const shouldHave=Math.min(STICKERS.length,Math.floor(st.stars/STARS_PER_STICKER));
 while(st.stickers.length<shouldHave){const c=STICKERS.find(s=>!st.stickers.includes(s));st.stickers.push(c);newSticker=c}
 save();
 const starsRow='⭐'.repeat(Math.max(1,Math.round(pct*5)));
 const msg=pass?S.round_done:(pct>=0.5?S.great_effort:S.practice_more);
 app.innerHTML=`${topbar()}<div class="panel">
  <div class="msg">${msg} ${pass?'🎉':'💜'}</div>
  <div class="big-stars">${starsRow}</div>
  ${pct>=0.5?`<div class="sub">${firsts} / ${total} ⭐</div>`:''}
  ${newCard!=null?`<div class="sub" style="font-weight:800;margin-top:8px">${S.new_card} 🎴</div><div class="pcard flipin">${IDOLS.cardSVG(newCard)}<div class="nm en">${S.idols[newCard%3]}</div></div>`:''}
  ${newSticker?`<div class="sub" style="font-weight:800">${S.new_sticker}</div><div style="font-size:64px" class="flipin">${newSticker}</div>`:''}
  ${skipped?`<div class="sub" style="font-weight:800;margin-top:8px">5 מתוך 5! מדלגים ישר לשלב הבא 🚀</div>`:''}
  ${newMV!=null&&!levelUp?`<div class="mvnew"><div class="sub" style="font-weight:800">🎬 שיר אמיתי מהסרט נפתח!</div><button class="bigbtn mvbtn" id="mvgo">▶ <span class="en" dir="ltr" lang="en">${esc(MV[newMV].t)}</span></button></div>`:''}
 </div>
 <button class="bigbtn" id="next">${pass&&!levelUp?S.next_song:S.again} 🎤</button>
 <button class="bigbtn alt" id="hm">🏠 ${S.home}</button>`;
 bindCommon();
 if(!levelUp)music('menu');
 if(pass){confetti(140);sfx.sparkle()}
 $('#next').onclick=()=>{sfx.tap();if(pass)startRound(st.level,st.song);else startRound(r.lv,r.song)};
 $('#hm').onclick=()=>{sfx.tap();home()};
 const mg=$('#mvgo');if(mg)mg.onclick=()=>{sfx.tap();openPlayer(newMV)};
 if(levelUp)setTimeout(()=>concert(r.lv,allDone,newMV),900);
}
function concert(lv,allDone,mvi){
 const ov=document.createElement('div');ov.className='concert';
 ov.innerHTML=`<div class="curtain l"></div><div class="curtain r"></div>
 <div class="lights"><i style="left:2%"></i><i style="left:36%;animation-delay:-.6s"></i><i style="right:2%;animation-delay:-1.2s"></i></div>
 <div class="msg">${S.concert} 🎤</div>
 <div class="trio">${[0,1,2].map(i=>IDOLS.idolSVG(i)).join('')}</div>
 <div class="sticks"><span>🪄</span><span>💖</span><span>🪄</span><span>💜</span><span>🪄</span></div>
 <div class="msg en" dir="ltr" lang="en">Level up! 🎉</div>
 <div class="msg sm">${allDone?S.all_done:S.level_up}</div>
 <div class="sub" style="z-index:2;font-size:24px">${S.stage_lights} ✨</div>
 ${mvi!=null?`<button class="bigbtn mvbtn" id="cmv">🎬 השיר האמיתי: <span class="en" dir="ltr" lang="en">${esc(MV[mvi].t)}</span></button>`:''}
 <button class="bigbtn ${mvi!=null?'alt':''}" id="cgo">${S.continue} ⭐</button>`;
 document.body.appendChild(ov);music('concert');sfx.fanfare();setTimeout(()=>confetti(220),1200);setTimeout(()=>confetti(160),2600);
 setTimeout(()=>{if(document.body.contains(ov)&&!playerOpen)say('lvup','Level up! You are a superstar!')},1800);
 ov.querySelector('#cgo').onclick=()=>{ov.remove();home()};
 const cm=ov.querySelector('#cmv');if(cm)cm.onclick=()=>{sfx.tap();openPlayer(mvi)};
}
function collection(tab){
 const cards=Array.from({length:15},(_,i)=>st.cards.includes(i)?`<div class="pcard">${IDOLS.cardSVG(i)}<div class="nm en">${S.idols[i%3]}</div></div>`:`<div class="slot">🔒</div>`).join('');
 const stk=STICKERS.map(s=>st.stickers.includes(s)?`<div>${s}</div>`:`<div class="lock">🔒</div>`).join('');
 const toNext=STARS_PER_STICKER-(st.stars%STARS_PER_STICKER);
 app.innerHTML=`${topbar(`<button class="iconbtn" id="homeb">🏠</button>`)}
 <div class="h2">${S.collection} 🎴</div>
 <div class="tabs"><button class="${tab==='cards'?'on':''}" id="tc">${S.photocards} ${st.cards.length}/15</button><button class="${tab==='stk'?'on':''}" id="ts">${S.stickers} ${st.stickers.length}/${STICKERS.length}</button></div>
 ${tab==='cards'?`<div class="grid-cards">${cards}</div>`:`<div class="stk">${stk}</div><div class="sub" style="text-align:center;margin-top:12px">⭐ ${toNext} ${S.more_stars}</div>`}
 <div class="sub" style="text-align:center;margin-top:12px">${S.collect_all} ✨</div>`;
 bindCommon();
 $('#homeb').onclick=()=>{sfx.tap();home()};$('#tc').onclick=()=>collection('cards');$('#ts').onclick=()=>collection('stk');
}
function itemLabel(k){const p=k.split(':');const t=p[0],v=p[1];if(t==='story'){const s=D.ST[+v];return s?s.text.split('.')[0]+'…':k}if(t==='case'||t==='letpic'||t==='piclet'||t==='lislet')return v+v.toLowerCase();return v}
function parent(){
 stopVoice();
 const h=st.history;const totN=h.reduce((a,x)=>a+x.n,0),totOk=h.reduce((a,x)=>a+x.ok,0);
 const acc=totN?Math.round(totOk/totN*100):0;const mins=Math.round(h.reduce((a,x)=>a+x.sec,0)/60);
 const nm=['אותיות וצלילים <bdi style="white-space:nowrap">(A–Z)</bdi>','מילים קצרות <bdi style="white-space:nowrap">(cat, dog)</bdi>','מילים נפוצות, צבעים, מספרים','משפטים קצרים','סיפורים קצרים'];
 const byLv=LEVELS.map(L=>{const hh=h.filter(x=>x.lv===L.id);const n=hh.reduce((a,x)=>a+x.n,0),ok=hh.reduce((a,x)=>a+x.ok,0);return `<tr><td>${L.id}</td><td>${nm[L.id-1]}</td><td>${levelDone(L.id)?'✅':[1,2].filter(s=>st.cleared[L.id+'-'+s]).length+'/2'}</td><td>${n?Math.round(ok/n*100)+'%':'—'}</td><td>${hh.length}</td></tr>`}).join('');
 const fmt=t=>{const d=new Date(t);return d.toLocaleDateString('he-IL',{day:'numeric',month:'numeric'})+' '+d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})};
 const recent=h.slice(0,12).map(x=>`<tr><td>${fmt(x.t)}</td><td>שלב ${x.lv} · סבב ${x.song}</td><td>${x.ok}/${x.n}${x.ok/x.n>=.8?' ✅':''}${x.st?' (תרגול מוקל)':''}</td><td>${Math.max(1,Math.round(x.sec/60))} דק׳</td></tr>`).join('')||'<tr><td colspan="4">עוד לא שוחקו סבבים</td></tr>';
 const hard=Object.entries(st.stats).filter(([k,v])=>v.w>=2).sort((a,b)=>b[1].w-a[1].w).slice(0,10).map(([k])=>itemLabel(k)).filter(Boolean);
 app.innerHTML=`<div class="parent" dir="rtl">
 <h2>פינת המורה וההורים 🍎</h2>
 <div class="kpi"><div><b>${st.level}</b>שלב נוכחי (סבב ${st.song}/2)</div><div><b>${acc}%</b>דיוק בניסיון ראשון</div><div><b>${h.length}</b>סבבים · ${mins} דק׳</div></div>
 <div>${st.name?`שם: <b>${esc(st.name)}</b> · `:''}⭐ ${st.stars} כוכבים · 🎴 ${st.cards.length}/15 פוטוקארדים · מדבקות ${st.stickers.length}/${STICKERS.length} · 🎬 שירים ${st.mv.length}/${MV.length}</div>
 <h3>לפי שלב</h3><table><tr><th>#</th><th>שלב</th><th>סבבים שעברו</th><th>דיוק</th><th>סבבים</th></tr>${byLv}</table>
 <h3>תרגול אחרון</h3><table><tr><th>מתי</th><th>מה</th><th>תוצאה</th><th>זמן</th></tr>${recent}</table>
 ${hard.length?`<h3>פריטים שדורשים חיזוק</h3><div dir="ltr" class="en" style="text-align:right">${hard.map(esc).join(' · ')}</div>`:''}
 <p style="font-size:14px;color:#666">איך זה עובד: ההוראות בעברית, התוכן באנגלית, ובכל פריט יש 🔊 לשמיעה. כל סבב קצר: 5 שאלות (בסיפורים 4), בערך דקה־שתיים. 4 מתוך 5 בניסיון ראשון = עוברים לסבב הבא; 2 סבבים = עולים שלב ("הופעה"). 5 מתוך 5 = מדלגים ישר לשלב הבא. הילד/ה יכולים גם לקפוץ קדימה בעצמם (כפתור ⏩ או לחיצה על שלב 🚀). כל עלייה בשלב פותחת שיר אמיתי מהסרט (הקליפ הרשמי מיוטיוב, דרוש אינטרנט). אם הסבב קשה (פחות מחצי), הסבב הבא קל יותר. פריטים שהיו בהם טעויות חוזרים יותר. טעות אף פעם לא מורידה כוכבים. ההתקדמות נשמרת במכשיר הזה בלבד.</p>
 <div class="row"><span>להתחיל משלב:</span>${LEVELS.map(L=>`<button data-set="${L.id}">${L.id}</button>`).join('')}</div>
 <div class="row"><button id="snd">צלילים: ${st.sound?'פועלים 🔊':'כבויים 🔇'}</button><button id="nmc">שינוי שם</button><button id="mvall">פתיחת כל השירים 🎬</button><button class="danger" id="rst">איפוס כל ההתקדמות</button><button id="cls">סגירה ✖</button></div>
 </div>`;
 app.querySelectorAll('[data-set]').forEach(b=>b.onclick=()=>{const lv=+b.dataset.set;if(confirm('לעבור לשלב '+lv+'?')){st.level=lv;st.song=1;st.done=false;save();parent()}});
 $('#snd').onclick=()=>{st.sound=!st.sound;save();parent()};
 $('#mvall').onclick=()=>{st.mv=MV.map((_,i)=>i);save();parent()};
 $('#nmc').onclick=()=>{const v=prompt('השם של התלמיד/ה:',st.name||'');if(v!==null){st.name=v.trim().slice(0,16);save();parent()}};
 $('#rst').onclick=()=>{if(confirm('למחוק את כל ההתקדמות, הכוכבים והאוסף?')){st=fresh();save();home()}};
 $('#cls').onclick=()=>home();
}
window.__cur=()=>{const it=round&&round.items[round.idx];return it?it.opts.findIndex(o=>o.ok):-1};
window.__app={mus:()=>({key:mus.key,playing:mus.playing,paused:mus.el?mus.el.paused:null,t:mus.el?mus.el.currentTime:0,unlocked:mus.unlocked,on:musicOn(),gain:mus.gain?mus.gain.gain.value:null}),voice:()=>({src:voiceEl.currentSrc,paused:voiceEl.paused,t:voiceEl.currentTime,err:voiceEl.error&&voiceEl.error.code,fail:Object.keys(vFail)}),st:()=>st,home,startRound,buildRound,LEVELS,concert,songsPage,openPlayer,jumpPicker,MV,collection,parent,say,clipUrl,cur:()=>round&&round.items[round.idx]};
home();
})();
