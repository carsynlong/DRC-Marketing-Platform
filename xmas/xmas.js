/* Shared engine for the 2026 Christmas Games show pages (/show, /wheel, /bingo):
   tribute + game data, music and sound effects (all synthesized, no files), snow, confetti,
   saved victors, and the full-screen Tiebreaker mode. */
(function(){
const XM=window.XM={};
const $=s=>document.querySelector(s);
const esc=XM.esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
XM.store=store;

/* ================= DATA ================= */
XM.TRIBUTES=[
 {d:1,name:"Jessie",weapon:"Shears in one hand, lash tweezers in the other",strategy:"Give everyone a fresh cut, then take them out",odds:"4 to 1"},
 {d:2,name:"Elisha",weapon:"The Mom Look",strategy:"Out-plank everyone. Core of steel.",odds:"2 to 1"},
 {d:3,name:"Grandad",weapon:"A toolbox. He can fix anything.",strategy:"Something's broken? He's already on it.",odds:"7 to 1"},
 {d:4,name:"Dash",weapon:"Speed. It's in the name.",strategy:"Run first, ask questions later",odds:"3 to 1"},
 {d:5,name:"Jonny",weapon:"Daily motivation, straight from JT Motivation",strategy:"Stay fresh. Stay motivated. Stay undefeated.",odds:"5 to 1"},
 {d:6,name:"Carsyn",weapon:"Spidey senses and total control of the scoreboard",strategy:"Run the Games. Rig nothing. Probably.",odds:"Gamemaker",label:"YOUR GAMEMAKER"},
 {d:7,name:"Tinsley",weapon:"A perfectly timed meme reference",strategy:"Make everyone laugh till they drop",odds:"3 to 1"},
 {d:8,name:"Natalie",weapon:"A rolling pin and a fresh batch of cookies",strategy:"Bribe the whole arena with baked goods",odds:"4 to 1"},
 {d:9,name:"Kamdon",weapon:"A Google Sheet with a formula for everything",strategy:"Calculate the odds, then audit everyone's score",odds:"5 to 1 (he double-checked the math)"},
 {d:10,name:"Brandon",weapon:"The 5 D's: dodge, duck, dip, dive and dodge",strategy:"Never sit still. Will mow the lawn mid-game.",odds:"6 to 1"},
 {d:11,name:"QUEEN MOTHER",weapon:"One look. That's all it takes.",strategy:"Royalty doesn't compete. Royalty wins.",odds:"1 to 1, obviously",label:"BOW WHEN YOU SAY HER NAME"},
 {d:12,name:"Kyle",weapon:"A torque wrench and an engineering degree",strategy:"Rush the arena like it's pledge week",odds:"12 to 1"},
];
XM.TRIBUTES.forEach(t=>{const k=String(t.d).padStart(2,"0");t.img=`/xmas/tributes/d${k}.jpg`;t.full=`/xmas/tributes/full/d${k}.jpg`});
XM.NAMES=XM.TRIBUTES.map(t=>t.name);
XM.photo=n=>{const t=XM.TRIBUTES.find(t=>t.name.toLowerCase()===String(n).trim().toLowerCase());return t?t.img:null};

XM.GAMES={
 cookie:{n:1,name:"Smart Cookie Showdown",kind:"PHYSICAL",tag:"PHYSICAL · 1 VS 1",color:"#d98f1f",tb:"cookie"},
 tribute:{n:2,name:"Who's That Tribute?",kind:"THINKING",color:"#2f6fb3",url:"https://whos-that-tribute.vercel.app/"},
 mitten:{n:3,name:"Mitten Mayhem",kind:"LUCK",tag:"LUCK · EVERYONE",color:"#b8322a"},
 feud:{n:4,name:"District Feud",kind:"THINKING",color:"#3e8a52",url:"https://whos-that-tribute.vercel.app/district-feud"},
 scoop:{n:5,name:"Blind Snowball Scoop",kind:"PHYSICAL",tag:"PHYSICAL · 1 VS 1",color:"#2f93cf",tb:"scoop"},
 secrets:{n:6,name:"District Secrets",kind:"THINKING",color:"#7a3fb0",url:"https://whos-that-tribute.vercel.app/district-secrets"},
 lrc:{n:7,name:"Left, Right, Capitol",kind:"LUCK",tag:"LUCK · EVERYONE",color:"#d23f78",tb:"lrc"},
 bingo:{n:8,name:"District Bingo",kind:"LUCK",tag:"LUCK · GRAND FINALE",color:"#17998a",tb:"bingo"},
};

/* Tiebreakers. tool decides what appears on screen. */
XM.TB={
 cookie:{title:"Cookie Sudden Death",ic:"🍪",rules:"Fresh cookies on every forehead. Everyone goes at once, no hands. First to eat their cookie wins.",tool:"stopwatch"},
 scoop:{title:"10-Second Scoop-Off",ic:"🥄",rules:"Blindfolds back on. You get 10 seconds. Most snowballs in the bowl wins.",tool:"timer",secs:10},
 lrc:{title:"Capitol Roll-Off",ic:"🎲",rules:"Each tied tribute rolls one die. Highest roll wins. Tied for highest? Those tributes roll again.",tool:"dice"},
 bingo:{title:"Closest Call",ic:"🔮",rules:"The screen secretly picks a number from 1 to 75. Each tied tribute guesses. Closest guess wins.",tool:"closest"},
 stare:{title:"Silent Night Stare-Off",ic:"👀",rules:"Stare each other down. First to laugh or look away loses. Tap a tribute when they crack.",tool:"elim",song:"silent"},
 toss:{title:"Snowball Toss",ic:"☃️",rules:"Toss a cotton ball into a cup from 6 steps away. 3 tries each. Most in the cup wins.",tool:"toss"},
 cane:{title:"Candy Cane Balance",ic:"🍬",rules:"Balance a candy cane on one finger. Longest balance wins. Tap a tribute when their cane falls.",tool:"elim"},
};
XM.TB_ORDER=["cookie","scoop","lrc","bingo","stare","toss","cane"];

/* Victors board, saved on this laptop */
XM.victors=()=>store.get("xmas-victors",{});
XM.setVictor=(g,name)=>{const v=XM.victors();if(name)v[g]=name;else delete v[g];store.set("xmas-victors",v)};

/* ================= AUDIO ================= */
XM.sound=!store.get("xmas-muted",false);
let AC=null,master,musicBus,sfxBus,noiseBuf,song=null,songName=null,timerId=0;
function ensureAudio(){
  try{
    if(!AC){AC=new (window.AudioContext||window.webkitAudioContext)();
      master=AC.createGain();master.gain.value=XM.sound?.8:0;master.connect(AC.destination);
      musicBus=AC.createGain();musicBus.gain.value=.5;musicBus.connect(master);
      sfxBus=AC.createGain();sfxBus.gain.value=.9;sfxBus.connect(master);
      noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
    if(AC.state==="suspended")AC.resume();
    return true;
  }catch(e){return false}
}
XM.ensureAudio=ensureAudio;
XM.audioReady=()=>!!AC&&AC.state==="running";
XM.setSound=on=>{XM.sound=on;store.set("xmas-muted",!on);if(master)master.gain.setTargetAtTime(on?.8:0,AC.currentTime,.05);document.querySelectorAll("[data-mute]").forEach(b=>{b.textContent=on?"🔊":"🔇";b.setAttribute("aria-label",on?"Mute sound":"Turn sound on");b.title=on?"Mute (M)":"Sound on (M)"})};
XM.toggleSound=()=>{ensureAudio();XM.setSound(!XM.sound)};
const hz=m=>440*Math.pow(2,(m-69)/12);
function env(g,t,a,peak,dec){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+dec);}
function osc(type,f,t,dur,vol,dest,cut){
  const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;
  let n=o;if(cut){const fl=AC.createBiquadFilter();fl.type="lowpass";fl.frequency.value=cut;o.connect(fl);n=fl}
  n.connect(g);g.connect(dest);env(g,t,.006,vol,dur);o.start(t);o.stop(t+dur+.05);return o;
}
function noise(t,dur,vol,dest,type,freq,q){
  const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseBuf;
  f.type=type;f.frequency.value=freq;if(q)f.Q.value=q;s.connect(f);f.connect(g);g.connect(dest);env(g,t,.003,vol,dur);s.start(t,Math.random()*.5);s.stop(t+dur+.05);
}
function pad(t,m,d,v){ // soft string pad: two detuned saws through a slow lowpass swell
  [0,7].forEach(det=>{const o=AC.createOscillator(),f=AC.createBiquadFilter(),g=AC.createGain();o.type="sawtooth";o.frequency.value=hz(m);o.detune.value=det-3;
    f.type="lowpass";f.frequency.value=900;o.connect(f);f.connect(g);g.connect(musicBus);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v*.06,t+d*.35);g.gain.linearRampToValueAtTime(.0001,t+d*1.05);o.start(t);o.stop(t+d*1.1)});
}
const INST={
  lead:(t,m,d,v)=>{osc("square",hz(m),t,d*.9,v*.16,musicBus,2600);osc("triangle",hz(m+12),t,d*.6,v*.05,musicBus)},
  bell:(t,m,d,v)=>{osc("sine",hz(m),t,1.1,v*.28,musicBus);osc("sine",hz(m)*2.76,t,.35,v*.07,musicBus);osc("triangle",hz(m+12),t,.5,v*.08,musicBus)},
  soft:(t,m,d,v)=>{osc("sine",hz(m),t,Math.max(.6,d*1.1),v*.22,musicBus);osc("sine",hz(m+12),t,.4,v*.04,musicBus)},
  bass:(t,m,d,v)=>osc("triangle",hz(m),t,d*.9,v*.45,musicBus,900),
  pad:(t,m,d,v)=>pad(t,m,d,v),
  sleigh:(t,m,d,v)=>{noise(t,.09,v*.14,musicBus,"bandpass",9500,1.2);noise(t+.025,.07,v*.08,musicBus,"bandpass",7000,1.5)},
  hat:(t,m,d,v)=>noise(t,.035,v*.09,musicBus,"highpass",8000),
  kick:(t,m,d,v)=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);
    o.connect(g);g.connect(musicBus);env(g,t,.003,v*.7,.22);o.start(t);o.stop(t+.3)},
  timp:(t,m,d,v)=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(hz(m)*1.5,t);o.frequency.exponentialRampToValueAtTime(hz(m),t+.08);
    o.connect(g);g.connect(musicBus);env(g,t,.004,v*.6,1.2);o.start(t);o.stop(t+1.3);noise(t,.15,v*.12,musicBus,"lowpass",500)},
  snare:(t,m,d,v)=>noise(t,.12,v*.16,musicBus,"bandpass",2200,.8),
  taiko:(t,m,d,v)=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(38,t+.25);
    o.connect(g);g.connect(musicBus);env(g,t,.003,v*.9,.5);o.start(t);o.stop(t+.6);noise(t,.12,v*.22,musicBus,"lowpass",700)},
  brass:(t,m,d,v)=>{[-6,6].forEach(det=>{const o=AC.createOscillator(),f=AC.createBiquadFilter(),g=AC.createGain();o.type="sawtooth";o.frequency.value=hz(m);o.detune.value=det;
    f.type="lowpass";f.frequency.setValueAtTime(600,t);f.frequency.linearRampToValueAtTime(2200,t+.08);f.frequency.linearRampToValueAtTime(900,t+d);
    o.connect(f);f.connect(g);g.connect(musicBus);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v*.07,t+.04);g.gain.setValueAtTime(v*.07,t+d*.8);g.gain.linearRampToValueAtTime(.0001,t+d);o.start(t);o.stop(t+d+.05)})},
};
function seq(mel,inst,vol=1){let b=0;const ev=[];mel.forEach(([m,d])=>{if(m)ev.push([b,inst,m,d,vol]);b+=d});return ev}
function mkJingle(){ // "Jingle Bells" chorus (1857, public domain)
  const L1=[[64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4]];
  const L2=[[65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[64,1],[62,1],[62,1],[64,1],[62,2],[67,2]];
  const L4=[[65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[67,1],[67,1],[65,1],[62,1],[60,4]];
  const ev=seq([...L1,...L2,...L1,...L4],"lead").map(e=>(e[2]+=12,e));
  [36,36,36,36,41,36,38,43,36,36,36,36,41,36,43,36].forEach((r,i)=>{const b=i*4;ev.push([b,"bass",r,1,1],[b+1,"bass",r+7,1,.8],[b+2,"bass",r,1,1],[b+3,"bass",r+7,1,.8],[b,"kick",0,1,1],[b+2,"kick",0,1,.8],[b+1,"snare",0,1,.8],[b+3,"snare",0,1,.8]);
    for(let k=0;k<8;k++)ev.push([b+k/2,"sleigh",0,.5,k%2?.6:1])});
  return {bpm:150,len:64,ev};
}
function mkCarol(){ // "Carol of the Bells" ostinato (Leontovych, 1916): tense countdown loop
  const ev=[];const bass=[43,43,41,41,39,39,38,38];const counter=[0,0,0,0,79,77,74,74];
  for(let bar=0;bar<8;bar++){const b=bar*3;
    ev.push([b,"bell",70,1,1],[b+1,"bell",69,.5,.8],[b+1.5,"bell",70,.5,.8],[b+2,"bell",67,1,.9]);
    ev.push([b,"bass",bass[bar],3,1],[b,"kick",0,1,1],[b+1.5,"kick",0,1,.5],[b+2,"snare",0,1,.6]);
    if(counter[bar])ev.push([b,"lead",counter[bar],3,.7]);
    for(let k=0;k<6;k++)ev.push([b+k/2,"hat",0,.5,k%2?.5:.9]);}
  return {bpm:200,len:24,ev};
}
function mkDeck(){ // "Deck the Halls" (traditional Welsh): scoreboard strut
  const A=[[67,1.5],[65,.5],[64,1],[62,1],[60,1],[62,1],[64,1],[60,1],[62,.5],[64,.5],[65,.5],[62,.5],[64,1.5],[62,.5],[60,1],[59,1],[60,2],[0,2]];
  const ev=seq(A,"lead").map(e=>(e[2]+=12,e));
  [36,43,36,43,36,43,36,36,36].forEach((r,i)=>{const b=i*2;ev.push([b,"bass",r,1,1],[b+1,"bass",r+12,1,.6],[b,"kick",0,1,.9],[b+1,"snare",0,1,.6]);
    for(let k=0;k<4;k++)ev.push([b+k/2,"sleigh",0,.5,k%2?.5:.8])});
  return {bpm:128,len:18,ev};
}
function mkSilent(){ // "Silent Night" (Gruber, 1818): soft music-box for the stare-off
  const G=67,A=69,E=64,D5=74,B=71,C5=72,F5=77,C=60,D=62,F=65,E5=76;
  const mel=[[G,1.5],[A,.5],[G,1],[E,3],[G,1.5],[A,.5],[G,1],[E,3],[D5,2],[D5,1],[B,3],[C5,2],[C5,1],[G,3],
    [A,2],[A,1],[C5,1.5],[B,.5],[A,1],[G,1.5],[A,.5],[G,1],[E,3],[A,2],[A,1],[C5,1.5],[B,.5],[A,1],[G,1.5],[A,.5],[G,1],[E,3],
    [D5,2],[D5,1],[F5,1.5],[D5,.5],[B,1],[C5,3],[E5,3],[C5,1],[G,1],[E,1],[G,1.5],[F,.5],[D,1],[C,6]];
  const ev=seq(mel,"soft").map(e=>(e[2]+=12,e));
  "C C C C G G C C F F C C F F C C G G C C C G C C".split(" ").forEach((c,i)=>{const r={C:48,G:43,F:41}[c];ev.push([i*3,"bass",r,3,.5],[i*3,"pad",r+12,3,.8])});
  return {bpm:96,len:72,ev};
}
function mkDirge(){ // "O Come, O Come, Emmanuel" (15th c. plainchant): slow, dramatic, minor key
  const E=64,G=67,B=71,A=69,C5=72,Fs=66,D=62;
  const mel=[[E,1],[G,1],[B,1],[B,1],[B,1],[A,1],[C5,1],[B,1],[A,2],[0,2],[A,1],[B,1],[G,1],[E,1],[G,1],[A,1],[Fs,1],[E,1],[D,1],[E,3],[0,1],
    [B,2],[B,2],[Fs,2],[0,2],[Fs,1],[G,1],[A,1],[G,1],[Fs,1],[E,3],[0,4]];
  const ev=seq(mel,"bell",.8);
  const roots=[40,40,45,45,40,38,40,40,47,47,42,40,40,40,40,40];
  roots.forEach((r,i)=>{ev.push([i*3,"pad",r+12,3,1],[i*3,"pad",r+19,3,.7],[i*3,"bass",r,3,.6]);if(i%2===0)ev.push([i*3,"timp",r,1,.8])});
  return {bpm:66,len:48,ev};
}
function mkMarch(){ // "God Rest Ye Merry Gentlemen" (traditional English carol): war-drum tribute parade in E minor
  const L1=[[64,1],[64,1],[71,1],[71,1],[69,1],[67,1],[66,1],[64,1],[62,1],[64,1],[66,1],[67,1],[69,1],[71,3]];
  const L2=[[71,1],[72,1],[71,1],[69,1],[67,1],[66,1],[64,1],[66,1],[67,1],[69,1],[71,1],[69,1],[67,1],[66,1],[64,2]];
  const ev=seq([...L1,...L1,...L2],"brass").map(e=>(e[2]+=12,e));
  const roots=[40,40,47,40,40,40,47,40,47,45,43,40]; // one per bar of 4 beats
  roots.forEach((r,i)=>{const b=i*4;
    [0,.75,1.5,2,2.5,3,3.5].forEach((x,k)=>ev.push([b+x,"taiko",0,1,k===0?1.1:k===3?.9:.55]));
    ev.push([b+1,"snare",0,1,.9],[b+3,"snare",0,1,.9],[b,"timp",r,1,1]);
    for(let k=0;k<8;k++)ev.push([b+k/2,"bass",r,.5,k%2?.6:1]);
    ev.push([b,"brass",r+12,1.5,.8],[b,"brass",r+19,1.5,.6]);
    for(let k=0;k<8;k++)ev.push([b+k/2,"hat",0,.5,k%2?.4:.7]);});
  return {bpm:128,len:48,ev};
}
function mkBattle(){ // "We Three Kings" (Hopkins, 1857): fast, pounding battle version for face-offs
  const B=71,A=69,G=67,E=64,Fs=66,D5=74,C5=72;
  const L1=[[B,2],[A,1],[G,2],[E,1],[Fs,1],[G,1],[Fs,1],[E,3]];
  const L3=[[G,2],[G,1],[A,2],[A,1],[B,2],[B,1],[D5,1],[C5,1],[B,1]];
  const L4=[[A,1],[B,1],[A,1],[G,2],[Fs,1],[E,3]];
  const ev=seq([...L1,...L1,...L3,...L4],"brass").map(e=>(e[2]+=12,e));
  const roots=[40,40,47,40,40,40,47,40,43,43,45,47,45,40,47,40]; // one per 3-beat bar
  roots.forEach((r,i)=>{const b=i*3;
    [0,.5,1,1.5,2,2.5].forEach((x,k)=>{ev.push([b+x,"bass",r,.5,k%2?.7:1],[b+x,"hat",0,.5,k%2?.5:.8])});
    ev.push([b,"taiko",0,1,1.2],[b+1,"snare",0,1,.9],[b+1.5,"taiko",0,1,.7],[b+2,"snare",0,1,1],[b+2.5,"taiko",0,1,.6],[b,"timp",r,1,.9]);
    if(i%4===0)ev.push([b,"brass",r+12,3,.7],[b,"brass",r+19,3,.5]);});
  return {bpm:210,len:48,ev};
}
const SONGS={lobby:mkJingle(),count:mkCarol(),board:mkDeck(),silent:mkSilent(),dirge:mkDirge(),march:mkMarch(),battle:mkBattle()};
XM.duck=on=>{if(musicBus)musicBus.gain.setTargetAtTime(on?.16:.5,AC.currentTime,.15)};
XM.playSong=function(name,force){
  if(songName===name&&!force)return;
  XM.stopSong();if(!ensureAudio())return;
  song=SONGS[name];songName=name;
  const evs=song.ev.slice().sort((a,b)=>a[0]-b[0]);let loopStart=AC.currentTime+.08,i=0;
  timerId=setInterval(()=>{
    const spb=60/song.bpm;
    while(true){
      const e=evs[i];const t=loopStart+e[0]*spb;
      if(t>AC.currentTime+.15)break;
      if(t>=AC.currentTime-.02)INST[e[1]](t,e[2],e[3]*spb,e[4]);
      i++;if(i>=evs.length){i=0;loopStart+=song.len*spb}
    }
  },25);
};
XM.stopSong=function(){clearInterval(timerId);timerId=0;song=null;songName=null};
XM.currentSong=()=>songName;
XM.sfx=function(kind){
  if(!ensureAudio())return;const t=AC.currentTime+.01;
  if(kind==="tick")osc("square",1320,t,.06,.08,sfxBus);
  if(kind==="tock")osc("square",880,t,.06,.1,sfxBus);
  if(kind==="tap")osc("triangle",1040,t,.08,.12,sfxBus);
  if(kind==="untap")osc("triangle",520,t,.08,.1,sfxBus);
  if(kind==="pop"){const o=osc("sine",500,t,.12,.25,sfxBus);o.frequency.exponentialRampToValueAtTime(1400,t+.1)}
  if(kind==="whoosh")noise(t,.45,.25,sfxBus,"bandpass",1200,.6);
  if(kind==="thud"){INST.kick(t,0,0,1.4);noise(t,.2,.3,sfxBus,"lowpass",300);osc("sine",hz(31),t,.4,.4,sfxBus)}
  if(kind==="cannon"){
    noise(t,2.4,.9,sfxBus,"lowpass",380);const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(26,t+1.1);
    o.connect(g);g.connect(sfxBus);env(g,t,.004,.9,1.6);o.start(t);o.stop(t+1.8);}
  if(kind==="reveal"){[72,76,79,84].forEach((m,k)=>{osc("square",hz(m),t+k*.08,.25,.09,sfxBus,3500);osc("sine",hz(m+12),t+k*.08,.6,.06,sfxBus)});
    for(let k=0;k<10;k++)noise(t+.3+k*.05,.08,.1,sfxBus,"bandpass",9000,1.3);}
  if(kind==="fanfare"){[[60,0],[64,.15],[67,.3],[72,.45],[67,.75],[72,.9]].forEach(([m,d],k)=>{const dur=k===5?1.6:.3;
    osc("square",hz(m+12),t+d,dur,.1,sfxBus,3000);osc("triangle",hz(m),t+d,dur,.1,sfxBus)});
    [48,55,60].forEach(m=>osc("triangle",hz(m),t+.9,1.6,.12,sfxBus));for(let k=0;k<16;k++)noise(t+.9+k*.06,.08,.1,sfxBus,"bandpass",9000,1.3);}
  if(kind==="stinger"){[[67,0],[72,.12],[76,.24],[79,.36]].forEach(([m,d])=>{osc("square",hz(m),t+d,.5,.08,sfxBus,3000);osc("sine",hz(m+12),t+d,.8,.05,sfxBus)});INST.kick(t+.36,0,0,1.2);
    for(let k=0;k<8;k++)noise(t+.36+k*.05,.08,.1,sfxBus,"bandpass",9000,1.3);}
  if(kind==="drum"){INST.kick(t,0,0,1.2);noise(t,.18,.35,sfxBus,"bandpass",1800,.7);osc("triangle",hz(43),t,.4,.3,sfxBus)}
  if(kind==="drumroll"){for(let k=0;k<40;k++)noise(t+k*.05,.06,.08+k*.006,sfxBus,"bandpass",2000,.8);INST.kick(t+2,0,0,1.4);noise(t+2,.5,.4,sfxBus,"highpass",5000)}
  if(kind==="go"){[79,84,88].forEach((m,k)=>osc("sine",hz(m),t+k*.05,.9,.15,sfxBus));for(let k=0;k<8;k++)noise(t+k*.04,.08,.12,sfxBus,"bandpass",9000,1.3)}
  if(kind==="firework"){const o=osc("sine",600,t,.6,.05,sfxBus);o.frequency.exponentialRampToValueAtTime(2400,t+.55);
    INST.kick(t+.6,0,0,1.2);noise(t+.6,.5,.45,sfxBus,"lowpass",900);for(let k=0;k<14;k++)noise(t+.7+k*.04+Math.random()*.03,.03,.12,sfxBus,"highpass",5000)}
  if(kind==="boom"){ // big dramatic hit: deep drop, sub thump and a crack of noise
    const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(30,t+.5);
    o.connect(g);g.connect(sfxBus);env(g,t,.003,1,1.1);o.start(t);o.stop(t+1.2);
    noise(t,.9,.7,sfxBus,"lowpass",260);noise(t,.12,.45,sfxBus,"bandpass",1500,.7);osc("sawtooth",hz(28),t,.8,.25,sfxBus,200)}
  if(kind==="gong"){osc("sine",hz(45),t,2.5,.4,sfxBus);osc("sine",hz(57),t,2,.15,sfxBus);noise(t,.6,.2,sfxBus,"bandpass",600,2)}
  if(kind==="trombone"){[[58,0,.45],[57,.5,.45],[56,1,.45],[55,1.5,1.4]].forEach(([m,d,len])=>{const o=osc("sawtooth",hz(m-12),t+d,len,.16,sfxBus,1300);
    if(len>1){const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=6;lg.gain.value=8;l.connect(lg);lg.connect(o.frequency);l.start(t+d);l.stop(t+d+len)}})}
  if(kind==="sparkle"){for(let k=0;k<6;k++)osc("sine",hz(84+k*2),t+k*.05,.3,.06,sfxBus)}
  // crowd reactions
  if(kind==="applause"){for(let k=0;k<70;k++){const d=Math.random()*2.2;noise(t+d,.03,.06+Math.random()*.1*(1-d/2.6),sfxBus,"bandpass",1200+Math.random()*2500,1.2)}}
  if(kind==="cheer"){XM.sfx("applause");const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseBuf;s.loop=true;f.type="bandpass";f.frequency.value=900;f.Q.value=.7;
    s.connect(f);f.connect(g);g.connect(sfxBus);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.35,t+.4);g.gain.linearRampToValueAtTime(.0001,t+2.4);s.start(t);s.stop(t+2.5);
    [0,.5].forEach(d=>{const o=osc("sine",1800,t+.3+d,.5,.08,sfxBus);o.frequency.setValueAtTime(1800,t+.3+d);o.frequency.linearRampToValueAtTime(2600,t+.55+d)});}
  if(kind==="gasp"){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseBuf;f.type="bandpass";f.Q.value=2;f.frequency.setValueAtTime(700,t);f.frequency.linearRampToValueAtTime(1600,t+.35);
    s.connect(f);f.connect(g);g.connect(sfxBus);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.5,t+.12);g.gain.linearRampToValueAtTime(.0001,t+.6);s.start(t);s.stop(t+.7)}
  if(kind==="laugh"){for(let k=0;k<7;k++){const tt=t+k*.17+Math.random()*.03,f0=260-k*12;const o=osc("sawtooth",f0,tt,.12,.12,sfxBus,1400);noise(tt,.1,.12,sfxBus,"bandpass",1100,2)}
    for(let k=0;k<6;k++){const tt=t+.08+k*.2;osc("sawtooth",330-k*10,tt,.1,.07,sfxBus,1600)}}
  if(kind==="airhorn"){[0,.32,.64].forEach((d,k)=>{const len=k===2?.9:.25;[466,470,587].forEach(f=>osc("sawtooth",f,t+d,len,.07,sfxBus,3000))})}
  if(kind==="rimshot"){osc("triangle",220,t,.12,.3,sfxBus);noise(t,.1,.3,sfxBus,"bandpass",2500,1);osc("triangle",160,t+.22,.15,.3,sfxBus);noise(t+.22,.1,.25,sfxBus,"bandpass",2000,1);
    noise(t+.5,1.2,.28,sfxBus,"highpass",6000)}
  if(kind==="chirp"){[0,.18,.36].forEach(d=>{const o=osc("sine",2200,t+d,.12,.12,sfxBus);o.frequency.setValueAtTime(2200,t+d);o.frequency.exponentialRampToValueAtTime(3600,t+d+.1)})}
  if(kind==="thwip"){const o=osc("sine",1800,t,.18,.15,sfxBus);o.frequency.exponentialRampToValueAtTime(300,t+.18);noise(t,.15,.15,sfxBus,"highpass",3000);INST.kick(t+.22,0,0,1);noise(t+.22,.08,.3,sfxBus,"bandpass",900,1)}
};

/* ================= ANNOUNCER (laptop's built-in voice, pitched down) ================= */
XM.SAY={"Elisha":"Alicia","QUEEN MOTHER":"Queen Mother","Kamdon":"Camden"};
XM.spoken=n=>XM.SAY[n]||n;
let sayGen=0;
const pickVoice=()=>{const sy=window.speechSynthesis;if(!sy)return null;const v=sy.getVoices().filter(v=>/^en/i.test(v.lang));
  return v.find(v=>/(Daniel|Google UK English Male|Microsoft (Guy|David|Mark|Ryan)|Fred|Alex|Aaron|Arthur|Rocko|Ralph)/i.test(v.name))||v.find(v=>/male/i.test(v.name)&&!/female/i.test(v.name))||v[0]||null};
if(window.speechSynthesis)speechSynthesis.getVoices();
XM.hush=()=>{sayGen++;if(window.speechSynthesis)speechSynthesis.cancel()};
XM.say=(text,done,{pitch=.15,rate=.85,fallback=900,interrupt=false}={})=>{
  const my=sayGen;let fired=false;const fin=()=>{if(fired||my!==sayGen)return;fired=true;done&&done()};
  const sy=window.speechSynthesis;
  if(!sy||!XM.sound){setTimeout(fin,fallback);return}
  if(interrupt)sy.cancel();
  const u=new SpeechSynthesisUtterance(text);const v=pickVoice();if(v)u.voice=v;u.pitch=pitch;u.rate=rate;u.onend=fin;u.onerror=fin;sy.speak(u);
  setTimeout(fin,Math.max(fallback,text.length*110+2000));
};

/* ================= SNOW ================= */
XM.snow=function(canvas){
  const x=canvas.getContext("2d");let W,H,f=[],level=1;
  const make=()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2.4+.6,s:Math.random()*.6+.3,w:Math.random()*6.28});
  const size=()=>{W=canvas.width=innerWidth;H=canvas.height=innerHeight;f=Array.from({length:Math.round(W*H/9000*level)},make)};
  size();addEventListener("resize",size);
  const api={set(l){level=l;const want=Math.round(W*H/9000*l);while(f.length<want)f.push({...make(),y:-Math.random()*H});f.length=Math.min(f.length,want)}};
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return api;
  (function loop(){x.clearRect(0,0,W,H);x.fillStyle="rgba(255,255,255,.8)";
    for(const p of f){p.y+=p.s*(level>1.5?1.5:1);p.w+=.01;p.x+=Math.sin(p.w)*.35;if(p.y>H){p.y=-4;p.x=Math.random()*W}x.beginPath();x.arc(p.x,p.y,p.r,0,6.283);x.fill()}
    requestAnimationFrame(loop)})();
  return api;
};

/* ================= WINNER CELEBRATION ================= */
// XM.celebrate("Kamdon") -> booms, fanfare, crowd cheer, fireworks, confetti, and "Winner... Camden!"
XM.celebrate=(name,{intro="Winner",line=null}={})=>{
  ensureAudio();XM.sfx("boom");setTimeout(()=>XM.sfx("boom"),380);
  setTimeout(()=>XM.sfx("fanfare"),700);setTimeout(()=>XM.sfx("cheer"),900);setTimeout(()=>XM.sfx("applause"),2200);
  [1500,2100,2700,3400].forEach(d=>setTimeout(()=>XM.sfx("firework"),d));
  XM.confetti(240,true);setTimeout(()=>XM.confetti(200,true),2200);
  const say=line||`${intro}... ${XM.spoken(name)}!`;
  setTimeout(()=>XM.say(say,null,{pitch:.05,rate:.75,interrupt:true}),1100);
  document.querySelectorAll(".tb,.overlay,.vsov,.app").forEach(el=>el.animate&&el.animate([{transform:"translate(-14px,6px)"},{transform:"translate(12px,-6px)"},{transform:"none"}],{duration:380}));
};

/* ================= CONFETTI ================= */
let FXc=null;
XM.confetti=function(n=150,big){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  if(!FXc){const c=document.getElementById("fx")||Object.assign(document.body.appendChild(document.createElement("canvas")),{id:"fx"});
    const x=c.getContext("2d");let P=[],on=false;const size=()=>{c.width=innerWidth;c.height=innerHeight};size();addEventListener("resize",size);
    const cols=["#ff5a4e","#e8b04b","#6fe38e","#fbf6ea","#6fb6ff"];
    function loop(){x.clearRect(0,0,c.width,c.height);P=P.filter(p=>p.y<c.height+30&&p.life-->0);
      for(const p of P){p.vy+=.18;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;
        if(p.star){x.font="20px serif";x.fillText("❄",-8,8)}else x.fillRect(-6,-3.5,12,7);x.restore()}
      if(P.length)requestAnimationFrame(loop);else on=false}
    FXc=n=>{for(let i=0;i<n;i++){const side=i%2;
      P.push({x:side?c.width*.08:c.width*.92,y:c.height*.8,vx:(side?1:-1)*(4+Math.random()*11),vy:-(11+Math.random()*13),r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[i%5],star:Math.random()<.2,life:420})}
      if(!on){on=true;requestAnimationFrame(loop)}};}
  FXc(n);if(big){setTimeout(()=>FXc(n),700);setTimeout(()=>FXc(n),1500)}
};

/* ================= TIEBREAKER ================= */
/* XM.tiebreaker({game:"cookie"|"scoop"|"lrc"|"bingo", tied:[names], onClose}) */
let T=null,tbTimer=0;
const clearT=()=>{clearInterval(tbTimer);tbTimer=0;if(T&&T.raf)cancelAnimationFrame(T.raf)};
XM.tiebreakerOpen=()=>!!T;
XM.tiebreaker=function(opts={}){
  ensureAudio();
  const g=opts.game&&XM.TB[opts.game]?opts.game:null;
  T={game:g,picked:new Set(opts.tied||[]),round:1,used:[],tb:g||"stare",onClose:opts.onClose,onWinner:opts.onWinner,noSave:!!opts.noSave,prevSong:XM.currentSong(),state:{}};
  let el=document.getElementById("xm-tb");if(!el){el=document.createElement("div");el.id="xm-tb";el.className="tb";el.setAttribute("role","dialog");el.setAttribute("aria-label","Tiebreaker");document.body.appendChild(el)}
  XM.stopSong();XM.sfx("gong");
  if(T.picked.size>=2)startTB(T.tb);else view("pick");
};
function closeTB(){clearT();XM.hush();const el=document.getElementById("xm-tb");if(el)el.remove();XM.stopSong();const cb=T&&T.onClose;T=null;if(cb)cb()}
XM.closeTiebreaker=closeTB;
const tied=()=>XM.NAMES.filter(n=>T.picked.has(n));
const faceBtn=(n,attrs="",cls="")=>{const t=XM.TRIBUTES.find(t=>t.name===n);return `<button class="face ${cls}" ${attrs}><img src="${t.img}" alt=""><b>${esc(n)}</b><span class="d">DISTRICT ${t.d}</span></button>`};
const gameLabel=()=>T.game?XM.GAMES[T.game].name+" tiebreaker":"Tiebreaker";
function shell(inner){
  return `<div class="tb-top"><span class="eyebrow" style="align-self:center">${esc(gameLabel())}${T.round>1?" · Round "+T.round:""}</span>
    <span class="row"><button class="btn ghost" data-mute aria-label="Mute">${XM.sound?"🔊":"🔇"}</button><button class="btn ghost" id="tb-x">✕ Close</button></span></div><div class="inner">${inner}</div>`;
}
function view(name){
  clearT();const el=document.getElementById("xm-tb");if(!el)return;T.view=name;
  el.innerHTML=shell(VIEWS[name]());el.scrollTop=0;
  el.querySelector("#tb-x").onclick=()=>{XM.sfx("untap");closeTB()};
  el.querySelector("[data-mute]").onclick=()=>XM.toggleSound();
  (WIRE[name]||(()=>{}))(el);
}
const VIEWS={
  pick:()=>`<div class="ic-big">⚔️</div><h1 class="big ttl">Tiebreaker!</h1>
    <p class="rules">Tap the tied tributes (2 or more).</p>
    <div class="faces">${XM.NAMES.map(n=>faceBtn(n,`data-pick="${esc(n)}" aria-pressed="${T.picked.has(n)}"`)).join("")}</div>
    <button class="btn red" id="tb-go" style="font-size:1.4rem;padding:.9em 2em" ${T.picked.size<2?"disabled":""}>${T.picked.size<2?"Pick at least 2":"Face off! ("+T.picked.size+" tied)"}</button>`,
  choose:()=>{const sug=suggest();const fate=T.round>3;
    return `<h1 class="big ttl" style="font-size:clamp(2rem,5vw,4.4rem)">${T.round>1?"Still tied!":"Pick a tiebreaker"}</h1>
    <p class="rules">${fate?"Three rounds and still tied. Try another, or let fate decide.":T.round>1?"Try another tiebreaker.":"Here's the suggested one, or pick any other."}</p>
    ${fate?`<button class="opt fate" data-tb="fate" style="width:min(640px,100%);text-align:center"><span class="ic">🎡</span><b style="font-size:2rem;color:#ffd9d4">Let fate decide</b><span style="color:var(--ink)">A dramatic spinner picks one of the tied tributes at random.</span></button>`:""}
    <div class="opts">${XM.TB_ORDER.map(k=>{const t=XM.TB[k];return `<button class="opt ${k===sug?"sug":""}" data-tb="${k}"><span class="ic">${t.ic}</span><b>${esc(t.title)}</b><span>${k===sug?"⭐ Suggested · ":""}${esc(t.rules)}</span></button>`}).join("")}</div>
    <div class="row"><span class="tiny">Tied: ${tied().map(esc).join(", ")}</span><button class="btn ghost" id="tb-who">Change who's tied</button></div>`},
  play:()=>{const t=XM.TB[T.tb];
    return `<div class="ic-big">${t.ic}</div><h1 class="big ttl">${esc(t.title)}</h1><p class="rules">${esc(t.rules)}</p>
    <div id="tb-tool" style="display:grid;justify-items:center;gap:14px;width:100%">${TOOLS[t.tool].html(t)}</div>
    <div class="panel" style="display:grid;gap:10px;justify-items:center"><div class="eyebrow">${t.tool==="elim"?"Tap who's out. Last one standing wins":"Tap who won"}</div>
      <div class="faces">${tied().map(n=>faceBtn(n,`data-win="${esc(n)}"`,T.state.out&&T.state.out.has(n)?"out":"")).join("")}</div>
      <div class="row"><button class="btn ghost" id="tb-again">😬 Still tied</button><button class="btn ghost" id="tb-switch">Switch tiebreaker</button></div></div>`},
  fate:()=>`<div class="ic-big">🎡</div><h1 class="big ttl">Let Fate Decide</h1><p class="rules">The odds are about to be in someone's favor.</p>
    <div class="fatebox"><div class="pointer"></div><canvas class="fate" id="fate" width="900" height="900"></canvas><div class="hub"></div></div>
    <button class="btn red" id="fate-spin" style="font-size:1.4rem;padding:.9em 2.2em">🎡 Spin the wheel of fate</button>`,
  win:()=>`<div class="eyebrow" style="font-size:1rem">${esc(T.game?XM.GAMES[T.game].name:"Tiebreaker")} · the tie is broken</div>
    <div class="champ" style="display:grid;justify-items:center"><div class="crown">👑</div><img src="${XM.photo(T.winner)}" alt=""></div>
    <h1 class="big ttl" style="animation-delay:.6s">${esc(T.winner)}</h1>
    <p class="who" style="font-size:clamp(1.6rem,3.4vw,2.8rem);color:var(--ink)">${T.noSave?"Wins the face-off and moves on!":"Go claim your major award!"}</p>
    <div class="row"><button class="btn" id="tb-done">Done</button></div>`,
};
function suggest(){
  if(T.round===1&&T.game)return T.game;
  return XM.TB_ORDER.find(k=>!T.used.includes(k)&&k!==T.game&&["stare","toss","cane"].includes(k))||XM.TB_ORDER.find(k=>!T.used.includes(k))||"stare";
}
function startTB(k){
  T.tb=k;T.used.push(k);T.state={};
  if(k==="fate"){view("fate");return}
  view("play");XM.sfx("stinger");
  if(XM.TB[k].song)setTimeout(()=>{if(T&&T.tb===k)XM.playSong(XM.TB[k].song)},900);
}
function winner(n){
  clearT();XM.stopSong();T.winner=n;if(T.onWinner)T.onWinner(n);view("win");XM.celebrate(n);
  setTimeout(()=>{if(T&&T.view==="win")XM.playSong("lobby")},4200);
}
const WIRE={
  pick(el){el.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{const n=b.dataset.pick;T.picked.has(n)?T.picked.delete(n):T.picked.add(n);XM.sfx(T.picked.has(n)?"tap":"untap");view("pick")});
    const go=el.querySelector("#tb-go");go.onclick=()=>{if(T.picked.size>=2)startTB(suggest())}},
  choose(el){el.querySelectorAll("[data-tb]").forEach(b=>b.onclick=()=>startTB(b.dataset.tb));el.querySelector("#tb-who").onclick=()=>view("pick")},
  play(el){
    el.querySelectorAll("[data-win]").forEach(b=>b.onclick=()=>{const t=XM.TB[T.tb];
      if(t.tool==="elim"){toggleOut(b.dataset.win);return}
      winner(b.dataset.win)});
    el.querySelector("#tb-again").onclick=()=>{T.round++;XM.stopSong();XM.sfx("cannon");view("choose")};
    el.querySelector("#tb-switch").onclick=()=>{T.used.pop();XM.stopSong();view("choose")};
    TOOLS[XM.TB[T.tb].tool].wire(el,XM.TB[T.tb]);
  },
  fate(el){
    const names=tied();drawFate(names,0);
    el.querySelector("#fate-spin").onclick=e=>{e.target.disabled=true;e.target.textContent="Fate is deciding…";spinFate(names)};
  },
  win(el){const s=el.querySelector("#tb-save");if(s)s.onclick=()=>{XM.setVictor(T.game,T.winner);s.textContent="✅ Saved to The Capitol Has Spoken";s.disabled=true;XM.sfx("sparkle");document.dispatchEvent(new Event("xmas-victors"))};
    el.querySelector("#tb-done").onclick=closeTB},
};
/* --- elimination (stare-off, candy cane): tap people out, last one standing wins --- */
function toggleOut(n){
  const s=T.state;s.out=s.out||new Set();
  if(s.out.has(n))s.out.delete(n);else{s.out.add(n);XM.sfx("thud")}
  document.querySelectorAll("#xm-tb [data-win]").forEach(b=>b.classList.toggle("out",s.out.has(b.dataset.win)));
  const left=tied().filter(x=>!s.out.has(x));
  if(left.length===1){XM.sfx("tap");setTimeout(()=>{if(T&&T.view==="play")winner(left[0])},700)}
}
/* --- tools --- */
const fmt=ms=>{const s=ms/1000;return s<60?s.toFixed(1):Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0")};
const TOOLS={
  stopwatch:{html:()=>`<div class="clock" id="tb-clock">0.0</div><div class="row"><button class="btn red" id="tb-start" style="font-size:1.3rem">5, 4, 3, 2, 1, GO!</button><button class="btn ghost" id="tb-stop">Stop</button></div>`,
    wire(el){stopwatchWire(el,true)}},
  elim:{html:()=>`<div class="clock" id="tb-clock">0.0</div><div class="row"><button class="btn red" id="tb-start" style="font-size:1.3rem">5, 4, 3, 2, 1, GO!</button><button class="btn ghost" id="tb-stop">Stop</button></div>
    <div class="tiny" style="font-size:1rem">Tap a tribute below when they're out. Last one standing wins.</div>`,
    wire(el){stopwatchWire(el,true)}},
  timer:{html:t=>`<div class="clock" id="tb-clock">${t.secs}</div><button class="btn red" id="tb-start" style="font-size:1.3rem">Blindfolds on? GO!</button>`,
    wire(el,t){const b=el.querySelector("#tb-start");b.onclick=()=>{b.disabled=true;countIn(()=>{let left=t.secs;const c=el.querySelector("#tb-clock");XM.playSong("battle");c.textContent=left;
      tbTimer=setInterval(()=>{left--;c.textContent=left;if(left<=5&&left>0){XM.sfx("tock");c.classList.add("hot");pulse(c);XM.say(WORDS[left],null,{pitch:.1,rate:1,interrupt:true})}
        if(left<=0){clearInterval(tbTimer);XM.stopSong();XM.sfx("cannon");XM.say("Time!",null,{pitch:.05,rate:.8,interrupt:true});c.textContent="TIME!";c.classList.remove("hot");b.disabled=false;b.textContent="Run it again"}},1000)},el)}}},
  dice:{html:()=>`<div class="dice" id="tb-dice"></div><div class="row"><button class="btn red" id="tb-roll" style="font-size:1.3rem">🎲 Roll!</button></div><div class="tiny" style="font-size:1rem">Using real dice? Skip this and just tap who won below.</div>`,
    wire(el){const s=T.state;s.in=tied();s.vals={};drawDice(el);el.querySelector("#tb-roll").onclick=()=>rollDice(el)}},
  closest:{html:()=>`<div class="secret" id="tb-secret">🔒 ?</div><div class="tiny" style="font-size:1.05rem">The Capitol has secretly chosen a number from 1 to 75.</div>
    <div class="row" id="tb-guesses">${tied().map(n=>`<label style="display:grid;justify-items:center;gap:6px"><img src="${XM.photo(n)}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover"><b>${esc(n)}</b><input class="guess" type="number" min="1" max="75" data-g="${esc(n)}" placeholder="?"></label>`).join("")}</div>
    <button class="btn red" id="tb-reveal" style="font-size:1.3rem">🥁 Reveal the number</button><div id="tb-result" class="who"></div>`,
    wire(el){T.state.secret=1+Math.floor(Math.random()*75);el.querySelector("#tb-reveal").onclick=()=>revealClosest(el)}},
  toss:{html:()=>`<div class="row" style="gap:22px">${tied().map(n=>`<div class="die-card" data-toss="${esc(n)}"><img src="${XM.photo(n)}" alt=""><b>${esc(n)}</b>
      <div class="tries">${[0,1,2].map(i=>`<button data-try="${i}" aria-label="Try ${i+1}">${i+1}</button>`).join("")}</div><div class="who" data-score>0</div></div>`).join("")}</div>
    <div class="tiny" style="font-size:1rem">Tap a try once for ✅ in the cup, twice for ❌ miss.</div><div id="tb-result" class="who"></div>`,
    wire(el){const s=T.state;s.toss={};tied().forEach(n=>s.toss[n]=[0,0,0]);
      el.querySelectorAll("[data-toss]").forEach(card=>{const n=card.dataset.toss;card.querySelectorAll("[data-try]").forEach(b=>b.onclick=()=>{const i=+b.dataset.try;s.toss[n][i]=(s.toss[n][i]+1)%3;
        const v=s.toss[n][i];b.className=v===1?"hit":v===2?"miss":"";b.textContent=v===1?"✅":v===2?"❌":String(i+1);XM.sfx(v===1?"pop":"untap");
        card.querySelector("[data-score]").textContent=s.toss[n].filter(x=>x===1).length;tossCheck(el)})})}},
};
const WORDS=["zero","one","two","three","four","five"];
const pulse=c=>c.animate&&c.animate([{transform:"scale(1.6)",opacity:.3},{transform:"scale(1)",opacity:1}],{duration:350,easing:"cubic-bezier(.2,1.4,.4,1)"});
// Spoken 5, 4, 3, 2, 1 ... BOOM ... GO!
function countIn(fn,el){const c=el.querySelector("#tb-clock");let k=5;c.textContent=k;c.classList.add("hot");pulse(c);XM.sfx("drum");XM.say("Five",null,{pitch:.1,rate:1,interrupt:true});
  tbTimer=setInterval(()=>{k--;if(k>0){c.textContent=k;pulse(c);XM.sfx(k===1?"thud":"drum");XM.say(WORDS[k],null,{pitch:.1,rate:1,interrupt:true})}
    else{clearInterval(tbTimer);c.classList.remove("hot");c.textContent="GO!";pulse(c);XM.sfx("boom");XM.sfx("go");XM.say("Go!",null,{pitch:.3,rate:1,interrupt:true});
      const o=document.getElementById("xm-tb");if(o&&o.animate)o.animate([{transform:"translate(-14px,6px)"},{transform:"translate(12px,-6px)"},{transform:"none"}],{duration:350});
      setTimeout(fn,700)}},1000)}
function stopwatchWire(el,withCount){
  const b=el.querySelector("#tb-start"),st=el.querySelector("#tb-stop"),c=el.querySelector("#tb-clock");
  b.onclick=()=>{b.disabled=true;countIn(()=>{const t0=performance.now();if(!XM.TB[T.tb].song)XM.playSong("battle");
    const tick=()=>{c.textContent=fmt(performance.now()-t0);T.raf=requestAnimationFrame(tick)};tick()},el)};
  st.onclick=()=>{clearT();if(!XM.TB[T.tb].song)XM.stopSong();XM.sfx("drum");b.disabled=false;b.textContent="Restart"};
}
const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const dieHTML=v=>`<div class="die">${Array.from({length:9},(_,i)=>`<i style="${v&&PIPS[v].includes(i)?"visibility:visible":""}"></i>`).join("")}</div>`;
function drawDice(el,rolling){
  const s=T.state,best=s.done?Math.max(...s.in.map(n=>s.vals[n]||0)):0;
  el.querySelector("#tb-dice").innerHTML=tied().map(n=>{const inn=s.in.includes(n),v=s.vals[n];
    return `<div class="die-card ${!inn?"dim":s.done&&v===best?"best":""}"><img src="${XM.photo(n)}" alt=""><b>${esc(n)}</b>${dieHTML(v).replace('class="die"',`class="die ${rolling&&inn?"roll":""}"`)}<span class="who">${v||""}</span></div>`}).join("");
}
function rollDice(el){
  const s=T.state,b=el.querySelector("#tb-roll");b.disabled=true;s.done=false;XM.sfx("drumroll");let k=0;
  tbTimer=setInterval(()=>{s.in.forEach(n=>s.vals[n]=1+Math.floor(Math.random()*6));drawDice(el,true);XM.sfx("tick");
    if(++k>=16){clearInterval(tbTimer);s.done=true;drawDice(el);XM.sfx("thud");
      const best=Math.max(...s.in.map(n=>s.vals[n]));const top=s.in.filter(n=>s.vals[n]===best);
      if(top.length===1){b.outerHTML=`<button class="btn" id="tb-crown" style="font-size:1.3rem">👑 Crown ${esc(top[0])}</button>`;el.querySelector("#tb-crown").onclick=()=>winner(top[0])}
      else{s.in=top;b.disabled=false;b.textContent=`🎲 Tie at ${best}! Reroll ${top.join(" & ")}`}}},110);
}
function revealClosest(el){
  const s=T.state,g={};let ok=true;
  el.querySelectorAll("[data-g]").forEach(i=>{const v=+i.value;if(!(v>=1&&v<=75)){ok=false;i.style.borderColor="#ff6b5e"}else{i.style.borderColor="";g[i.dataset.g]=v}});
  const r=el.querySelector("#tb-result");if(!ok){r.textContent="Everyone needs a guess from 1 to 75.";return}
  const b=el.querySelector("#tb-reveal");b.disabled=true;XM.sfx("drumroll");const sec=el.querySelector("#tb-secret");let k=0;
  tbTimer=setInterval(()=>{sec.textContent=1+Math.floor(Math.random()*75);if(++k>=20){clearInterval(tbTimer);sec.textContent=s.secret;sec.style.animation="slam .6s both";XM.sfx("reveal");
    const d=Object.entries(g).map(([n,v])=>[n,Math.abs(v-s.secret)]);const m=Math.min(...d.map(x=>x[1]));const top=d.filter(x=>x[1]===m).map(x=>x[0]);
    el.querySelectorAll("[data-g]").forEach(i=>{const off=Math.abs(+i.value-s.secret);i.insertAdjacentHTML("afterend",`<span class="tiny">${off===0?"Exact!":off+" away"}</span>`);if(off===m)i.style.boxShadow="0 0 0 3px var(--gold)"});
    if(top.length===1){r.innerHTML=`<button class="btn" id="tb-crown" style="font-size:1.3rem">👑 Crown ${esc(top[0])}</button>`;r.querySelector("#tb-crown").onclick=()=>winner(top[0])}
    else{r.innerHTML=`${top.map(esc).join(" & ")} are equally close! <button class="btn ghost" id="tb-redo">New secret number</button>`;
      r.querySelector("#tb-redo").onclick=()=>{T.picked=new Set(top);T.state={};view("play")}}}},100);
}
function tossCheck(el){
  const s=T.state,r=el.querySelector("#tb-result");const all=tied().every(n=>s.toss[n].every(v=>v));
  if(!all){r.innerHTML="";return}
  const sc=tied().map(n=>[n,s.toss[n].filter(x=>x===1).length]);const m=Math.max(...sc.map(x=>x[1]));const top=sc.filter(x=>x[1]===m).map(x=>x[0]);
  if(top.length===1){r.innerHTML=`<button class="btn" id="tb-crown" style="font-size:1.3rem">👑 Crown ${esc(top[0])} (${m} in the cup)</button>`;r.querySelector("#tb-crown").onclick=()=>winner(top[0])}
  else r.textContent=`${top.join(" & ")} tied with ${m}. Tap "Still tied" for another round.`;
}
/* --- fate spinner --- */
const FCOL=["#b8322a","#e8b04b","#3e8a52","#2f6fb3","#c8412f","#d79a1f","#1f6b4a","#7a3fb0"];
function drawFate(names,rot){
  const c=document.getElementById("fate");if(!c)return;const x=c.getContext("2d"),W=c.width,R=W/2-14,n=names.length,sl=2*Math.PI/n;
  x.clearRect(0,0,W,W);x.save();x.translate(W/2,W/2);x.beginPath();x.arc(0,0,R+10,0,7);x.fillStyle="#e8b04b";x.fill();x.rotate(rot);
  for(let i=0;i<n;i++){x.beginPath();x.moveTo(0,0);x.arc(0,0,R,i*sl,(i+1)*sl);x.closePath();x.fillStyle=FCOL[i%FCOL.length];x.fill();x.strokeStyle="rgba(251,246,234,.6)";x.lineWidth=3;x.stroke();
    x.save();x.rotate(i*sl+sl/2);x.textAlign="right";x.textBaseline="middle";let fs=Math.min(56,Math.max(24,sl*R*.4));x.font=`800 ${fs}px Outfit, system-ui, sans-serif`;
    while(x.measureText(names[i]).width>R*.6&&fs>16){fs-=2;x.font=`800 ${fs}px Outfit, system-ui, sans-serif`}
    x.fillStyle="#fff";x.shadowColor="rgba(0,0,0,.55)";x.shadowBlur=6;x.fillText(names[i],R-30,0);x.restore()}
  x.restore();
}
function spinFate(names){
  const n=names.length,sl=2*Math.PI/n,pick=Math.floor(Math.random()*n);
  // land the pointer (top, -90deg) inside the picked slice
  const target=-Math.PI/2-(pick*sl+sl*(.2+Math.random()*.6));
  const start=0,dist=2*Math.PI*9+((target-start)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),dur=7500,t0=performance.now();
  XM.playSong("count");let last=-1;const ease=t=>1-Math.pow(1-t,5);
  const step=now=>{const t=Math.min(1,(now-t0)/dur),rot=start+dist*ease(t);drawFate(names,rot);
    let a=(-Math.PI/2-rot)%(2*Math.PI);if(a<0)a+=2*Math.PI;const i=Math.floor(a/sl)%n;if(i!==last){last=i;XM.sfx("tick")}
    if(t<1)T.raf=requestAnimationFrame(step);else{XM.stopSong();XM.sfx("cannon");setTimeout(()=>T&&winner(names[i]),1400)}};
  T.raf=requestAnimationFrame(step);
}
document.addEventListener("keydown",e=>{if(T&&e.key==="Escape"){e.preventDefault();closeTB()}},true);

/* Twinkle lights helper */
XM.lights=(n=28)=>`<div class="lights" aria-hidden="true">${"<i></i>".repeat(n)}</div>`;
})();
