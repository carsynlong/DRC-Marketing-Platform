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
 {d:2,name:"Elisha",weapon:"The Mom Look",strategy:"Out-plank everyone. Core of steel.",odds:"2 to 1",label:"AKA BYE FELICIA"},
 {d:3,name:"Grandad",weapon:"A toolbox. He can fix anything.",strategy:"Offer to fix everyone's gear. Fix it wrong. On purpose.",odds:"7 to 1"},
 {d:4,name:"Dash",weapon:"Speed. It's in the name.",strategy:"Run first, ask questions later",odds:"3 to 1"},
 {d:5,name:"Jonny",weapon:"Daily motivation, straight from JT Motivation",strategy:"Stay fresh. Stay motivated. Stay undefeated.",odds:"5 to 1"},
 {d:6,name:"Carsyn",weapon:"Spidey senses and total control of the scoreboard",strategy:"Run the Games. Rig nothing. Probably.",odds:"Gamemaker",label:"YOUR GAMEMAKER · AKA CLO (CARSYN)"},
 {d:7,name:"Tinsley",weapon:"A brand-new driver's permit. Stay off the roads when you see her coming.",strategy:"Make everyone laugh till they drop, then floor it",odds:"3 to 1"},
 {d:8,name:"Natalie",weapon:"A rolling pin and a fresh batch of cookies",strategy:"Bribe the arena with cookies, break into song, and yell \"It's not fair!\" until the Gamemaker gives in",odds:"4 to 1"},
 {d:9,name:"Kamdon",weapon:"A Google Sheet with a formula for everything",strategy:"Calculate the odds, then audit everyone's score",odds:"5 to 1 (he double-checked the math)",label:"AKA BIG DADDY KAM"},
 {d:10,name:"Brandon",weapon:"The 5 D's: dodge, duck, dip, dive and dodge",strategy:"Never sit still. Will mow the lawn mid-game.",odds:"6 to 1",label:"AKA BUTCHUS BYRON MARVIN IRON BALLS III"},
 {d:11,name:"QUEEN MOTHER",weapon:"One look. That's all it takes.",strategy:"Royalty doesn't compete. Royalty wins.",odds:"1 to 1, obviously",label:"BOW WHEN YOU SAY HER NAME"},
 {d:12,name:"Kyle",weapon:"An equation so long it needs its own whiteboard",strategy:"Rush the arena like it's pledge week",odds:"12 to 1",label:"AKA KACHOW"},
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

// The announcer says "Game maker", not "Gamemaker"
(function(){const O=window.SpeechSynthesisUtterance;if(!O||O.__gm)return;
  const W=function(t){return new O(typeof t==="string"?t.replace(/\bgame\s?maker(s?)\b/gi,(m,s)=>"game maker"+s).replace(/Iron Balls III/g,"Iron Balls the Third").replace(/\bKachow\b/gi,"Kuh-chow").replace(/\bClo\b/g,"C.Lo"):t)};W.prototype=O.prototype;W.__gm=true;window.SpeechSynthesisUtterance=W})();
// the shared "how this works" briefing screen (/briefing.js) on every page that uses these helpers
if(!window.Briefing&&!document.querySelector('script[src="/briefing.js"]')){const s=document.createElement("script");s.src="/briefing.js";document.head.appendChild(s)}
/* Short nickname for labels ("a.k.a. Kachow"), from each tribute's show label */
XM.AKA={Jessie:"Lucky PomPoms",Tinsley:"Pee Pee Balls",Grandad:"Grandad the Ancient and Wise",Dash:"Chad Thundercock",Jonny:"HumblePie1",Natalie:"Buzz Buzz",Elisha:"Bye Felicia",Kamdon:"Big Daddy Kam",Brandon:"Iron Balls III",Kyle:"Kachow",Carsyn:"Clo"};
// Nicknames ARE their names on screen now. The real names stay underneath (saved victors, phone sign-ins).
XM.dn=n=>XM.AKA[n]||n;
// typed name or nickname back to the real name: "kachow" -> "Kyle", "Iron Balls the Third" -> "Brandon". Unknown text comes back trimmed.
XM.realName=s=>{const t=String(s==null?"":s).trim(),k=x=>String(x).toLowerCase().replace(/\bthe third\b/g,"iii").replace(/\bone\b/g,"1").replace(/[^a-z0-9]/g,"");if(!t)return t;const q=k(t);
  for(const [n,a] of Object.entries(XM.AKA))if(k(n)===q||k(a)===q)return n;return t};
// swap real names for nicknames in a string (for speech and canvas text)
XM.nick=t=>String(t).replace(new RegExp("\\b("+Object.keys(XM.AKA).map(n=>n==="Grandad"?"Grandad(?! the Ancient)":n).join("|")+")\\b","g"),m=>XM.AKA[m]);
XM.aka=n=>"";
// Swap real names for nicknames in any text on the page, including text added later.
XM.useNicknames=function(root){
  const re=new RegExp("\\b("+Object.keys(XM.AKA).map(n=>n==="Grandad"?"Grandad(?! the Ancient)":n).join("|")+")\\b","g");
  const skip=n=>n&&/^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/.test(n.nodeName);
  const fix=node=>{if(node.nodeType===3){if(skip(node.parentNode))return;if(re.test(node.nodeValue)){re.lastIndex=0;node.nodeValue=node.nodeValue.replace(re,m=>XM.AKA[m])}re.lastIndex=0;return}
    if(node.nodeType!==1||/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(node.nodeName))return;
    const w=document.createTreeWalker(node,NodeFilter.SHOW_TEXT,{acceptNode:t=>skip(t.parentNode)?2:1});let t;
    while((t=w.nextNode())){if(re.test(t.nodeValue)){re.lastIndex=0;t.nodeValue=t.nodeValue.replace(re,m=>XM.AKA[m])}re.lastIndex=0}};
  root=root||document.body;fix(root);
  new MutationObserver(ms=>ms.forEach(m=>{if(m.type==="characterData")fix(m.target);else m.addedNodes.forEach(fix)})).observe(root,{childList:true,subtree:true,characterData:true});
};
/* Side quests the Gamemaker sends to one tribute: [icon, quest, suggested seconds] */
XM.QUESTS=[
 ["🍺","Bring the Gamemaker a beer",15],["🥤","Bring the Gamemaker a drink. Any drink.",15],["🍪","Bring the Gamemaker a snack",20],
 ["🧊","Bring the Gamemaker a cup of ice",20],["🧻","Bring the Gamemaker a napkin",10],["🥄","Bring the Gamemaker a spoon",15],
 ["🛋️","Bring the Gamemaker a pillow or blanket",20],["🧦","Bring back one sock that is NOT yours",30],["🎄","Bring the Gamemaker an ornament from the tree (carefully)",20],
 ["🚪","Touch the front door and come back",15],["👑","Bow to QUEEN MOTHER and say \"Long live the Queen\"",10],["🙇","Bow to the Gamemaker and say \"Long live the Capitol\"",10],
 ["🫡","Give every tribute the three-finger salute",15],["🐦","Whistle the Mockingjay call",10],["🎤","Sing the first line of a Christmas song",10],
 ["💃","Do a victory dance",10],["🏋️","Do 10 squats",15],["🦵","Do 10 jumping jacks",15],["😂","Make QUEEN MOTHER laugh",20],
 ["💌","Give a compliment to every tribute in the room",30],["🤳","Take a selfie with QUEEN MOTHER",20],["🎅","Do your best Santa \"Ho ho ho\"",10],
 ["🔄","Switch seats with the person across from you",10],["🍗","Name 5 Thanksgiving foods",10],["🎬","Name 5 Christmas movies",15],
 ["🗣️","Say \"May the odds be ever in your favor\" in an Effie Trinket voice",10],["🤫","Whisper a secret to the Gamemaker",15],["🧤","Find a mitten, glove or hat and put it on",30]];

/* 🗳️ phone votes the Gamemaker can open */
XM.POLLS=["Who's most likely to cheat?","Best dressed tribute?","Who would survive the longest in the arena?","Who would go out first in the arena?",
 "Who's the best cook here?","Who's most likely to fall asleep first tonight?","Who would Effie Trinket adore?","Who's the biggest drama queen?",
 "Who would win a real snowball fight?","Who's most likely to cry at a Christmas movie?","Who's Santa's favorite?","Who's on the naughty list?",
 "Who would make the best Gamemaker?","Who tells the worst jokes?","Who's most likely to re-gift a present?","Who's the most competitive?"];
/* 🎵 walk-up songs (the show's own music) */
// 🎤 real walk-up songs (30-second clips in /xmas/walkups/), then the built-in beats as backups
XM.WALKFILES=[["wu_ride","Ride · twenty one pilots"],["wu_snap","Snap Yo Fingers · Lil Jon"],["wu_walk","Walk · Pantera"],["wu_thunder","Thunderstruck · AC/DC"],
 ["wu_country","Country Grammar · Nelly"],["wu_crazytrain","Crazy Train · Ozzy Osbourne"],["wu_gangsta","Gangsta's Paradise · Coolio"],["wu_goingbad","Going Bad · Meek Mill"],
 ["wu_boom","Here Comes the Boom · Nelly"],["wu_hypnotize","Hypnotize · The Notorious B.I.G."],["wu_jump","Jump · Kris Kross"],["wu_throat","Let Me Clear My Throat · DJ Kool"],["wu_jonny","HumblePie1's Walkout Song"],["wu_queen","QUEEN MOTHER's Royal Entrance"],["wu_elisha","Bye Felicia's Walkout Song"],["wu_jessie","Lucky PomPoms' Walkout Song"],["wu_kyle","Kachow's Walkout Song"],["wu_brandon","Iron Balls III's Walkout Song"],["wu_tinsley","Pee Pee Balls' Walkout Song"],["wu_carsyn","Clo's Walkout Song"]];
XM.WALKUPS=[...XM.WALKFILES,["hh_cookie","Cookie Crunch"],["hh_tribute","Tribute Trap"],["hh_mitten","Mitten Mayhem"],["hh_feud","Feud Beat"],["hh_scoop","Snowball Bounce"],
 ["hh_secrets","Secret Agent"],["hh_lrc","Dice Roll"],["hh_bingo","Bingo Bounce"],["hh_lounge","Lounge Lo-fi"],["battle","Battle March"],["march","Tribute Parade"],["board","Deck the Halls"],["lobby","Jingle Bells"]];
XM.SOUNDBOARD=[["airhorn","📯","Air horn"],["cheer","🙌","Cheer"],["applause","👏","Applause"],["gasp","😮","Ohhh!"],["laugh","😂","Laugh"],["rimshot","🥁","Rimshot"],
 ["trombone","🎺","Sad trombone"],["cannon","💥","Cannon"],["drumroll","🪘","Drumroll"],["siren","🚨","Siren"],["fanfare","🎉","Fanfare"],["boom","🔊","Boom"]];
XM.SNITCH=["fell asleep","is cheating","is on their phone","is talking trash","broke the rule","stole a snack","is hogging the snacks","didn't do their side quest"];

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
XM.setVictor=(g,name)=>{const v=XM.victors();if((v[g]||"")!==(name||"")){const a=store.get("xmas-awards",{});if(g in a){delete a[g];store.set("xmas-awards",a)}}   // a new (or cleared) victor hasn't unboxed anything yet
  if(name)v[g]=name;else delete v[g];store.set("xmas-victors",v)};

/* Second place: each game has two major awards, one for 1st and one for 2nd */
XM.seconds=()=>store.get("xmas-second",{});
XM.setSecond=(g,name)=>{const v=XM.seconds();if((v[g]||"")!==(name||"")){const a=store.get("xmas-awards",{});if((g+"_2") in a){delete a[g+"_2"];store.set("xmas-awards",a)}}
  if(name)v[g]=name;else delete v[g];store.set("xmas-second",v)};

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
    if(AC.state!=="running"&&AC.state!=="closed")AC.resume();
    return true;
  }catch(e){return false}
}
XM.ensureAudio=ensureAudio;
XM.audioReady=()=>!!AC&&AC.state==="running";
XM.setSound=on=>{XM.sound=on;store.set("xmas-muted",!on);if(fileSong)fileSong.volume=on?(ducked?fileVol*.3:fileVol):0;if(master)master.gain.setTargetAtTime(on?.8:0,AC.currentTime,.05);document.querySelectorAll("[data-mute]").forEach(b=>{b.textContent=on?"🔊":"🔇";b.setAttribute("aria-label",on?"Mute sound":"Turn sound on");b.title=on?"Mute (M)":"Sound on (M)"})};
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
  b808:(t,m,d,v)=>{const o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter();o.type="sine";o.frequency.setValueAtTime(hz(m)*1.6,t);o.frequency.exponentialRampToValueAtTime(hz(m),t+.06);
    f.type="lowpass";f.frequency.value=600;o.connect(f);f.connect(g);g.connect(musicBus);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v*.75,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.35,d));o.start(t);o.stop(t+Math.max(.4,d)+.05)},
  hkick:(t,m,d,v)=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(170,t);o.frequency.exponentialRampToValueAtTime(45,t+.09);
    o.connect(g);g.connect(musicBus);env(g,t,.002,v*.9,.28);o.start(t);o.stop(t+.32);noise(t,.02,v*.15,musicBus,"highpass",3000)},
  clap:(t,m,d,v)=>{[0,.012,.026].forEach(x=>noise(t+x,.05,v*.2,musicBus,"bandpass",1400,1.2));noise(t+.03,.18,v*.12,musicBus,"bandpass",1800,.9)},
  that:(t,m,d,v)=>noise(t,.03,v*.11,musicBus,"highpass",9000),
  crackle:(t,m,d,v)=>noise(t,.008,v*.05,musicBus,"highpass",4000),
  rhodes:(t,m,d,v)=>{osc("sine",hz(m),t,Math.max(.5,d),v*.13,musicBus);osc("triangle",hz(m+12),t,.35,v*.03,musicBus);osc("sine",hz(m)*3,t,.15,v*.02,musicBus)},
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
/* Hip-hop Christmas tracks, one per game. Melodies are public-domain carols. */
function mkHip({mel,stretch=1,oct=12,lead="bell",leadVol=.7,chords,bpm=90,style="boom",swing=.08}){
  let b=0;const ev=[];mel.forEach(([m,d])=>{const dd=d*stretch;if(m)ev.push([b,lead,m+oct,dd,leadVol]);b+=dd});
  const bars=Math.max(4,Math.ceil(b/4));
  for(let bar=0;bar<bars;bar++){const B=bar*4,ch=chords[bar%chords.length],r=ch[0]-12;
    ch.forEach((m,k)=>ev.push([B+k*.03,"rhodes",m,3.6,style==="lofi"?.7:.85]));
    if(style==="trap"){ // half-time: clap on 3, 16th hats with rolls, sliding 808s
      ev.push([B,"hkick",0,1,1],[B+1.75,"hkick",0,1,.7],[B+2.5,"hkick",0,1,.6],[B+2,"clap",0,1,1.1]);
      ev.push([B,"b808",r,1.6,1],[B+1.75,"b808",r,.8,.8],[B+2.5,"b808",r+(bar%2?3:7),1.3,.9]);
      for(let k=0;k<16;k++)ev.push([B+k/4,"that",0,.25,k%4===0?1:.55]);
      if(bar%2)for(let k=0;k<8;k++)ev.push([B+3+k/8,"that",0,.1,.8]);
    }else if(style==="lofi"){ // chill: lazy swing, soft drums, vinyl crackle
      ev.push([B,"hkick",0,1,.8],[B+2.5+swing,"hkick",0,1,.6],[B+1,"clap",0,1,.55],[B+3,"clap",0,1,.55],[B,"b808",r,3.5,.7]);
      for(let k=0;k<8;k++)ev.push([B+k/2+(k%2?swing:0),"that",0,.5,k%2?.35:.6]);
      for(let k=0;k<12;k++)ev.push([B+Math.random()*4,"crackle",0,.1,1]);
    }else{ // boom-bap bounce
      ev.push([B,"hkick",0,1,1],[B+.75+swing,"hkick",0,1,.6],[B+2.5,"hkick",0,1,.9],[B+1,"clap",0,1,1],[B+3,"clap",0,1,1]);
      ev.push([B,"b808",r,1.4,1],[B+1.5+swing,"b808",r,.6,.8],[B+2.5,"b808",r+(bar%2?7:0),1.2,.9]);
      for(let k=0;k<8;k++)ev.push([B+k/2+(k%2?swing:0),"that",0,.5,k%2?.6:1]);
      if(bar%2)for(let k=0;k<6;k++)ev.push([B+3.5+k/12,"that",0,.1,.7]);
      for(let k=0;k<4;k++)ev.push([B+k+.5+swing,"sleigh",0,.5,.45]);
    }}
  return {bpm,len:bars*4,ev};
}
const C7=[48,52,55,59],Am7=[45,48,52,55],Fm7=[41,45,48,52],G7=[43,47,50,53],Em7=[40,43,47,50],Cm7=[36,40,43,47],B7=[47,51,54,57],Dm7=[50,53,57,60],Gm=[43,46,50,55],GmF=[41,46,50,55],Eb=[39,43,46,51],D7=[38,42,45,48],G=[43,47,50,55],D=[38,42,45,50],C=[36,40,43,48],F=[41,45,48,53];
const HIP={
  cookie:mkHip({mel:[[64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4],[65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[64,1],[62,1],[62,1],[64,1],[62,2],[67,2]],
    chords:[Am7,Fm7,C7,G7],bpm:94,style:"boom"}),
  tribute:mkHip({mel:[[71,2],[69,1],[67,2],[64,1],[66,1],[67,1],[66,1],[64,3],[71,2],[69,1],[67,2],[64,1],[66,1],[67,1],[66,1],[64,3]],stretch:4/3,oct:0,lead:"rhodes",leadVol:1.4,
    chords:[Em7,Cm7,Am7,B7],bpm:140,style:"trap"}),
  mitten:mkHip({mel:[[67,1.5],[65,.5],[64,1],[62,1],[60,1],[62,1],[64,1],[60,1],[62,.5],[64,.5],[65,.5],[62,.5],[64,1.5],[62,.5],[60,1],[59,1],[60,2],[0,2]],
    chords:[C,G,F,G],bpm:104,style:"boom",swing:.04}),
  feud:mkHip({mel:[[64,1],[64,1],[71,1],[71,1],[69,1],[67,1],[66,1],[64,1],[62,1],[64,1],[66,1],[67,1],[69,1],[71,3]],oct:0,lead:"brass",leadVol:.9,
    chords:[Em7,Cm7,Am7,B7],bpm:150,style:"trap"}),
  scoop:mkHip({mel:[[67,1.5],[69,.5],[67,1],[64,3],[67,1.5],[69,.5],[67,1],[64,3],[74,2],[74,1],[71,3],[72,2],[72,1],[67,3]],stretch:4/3,lead:"soft",leadVol:.8,
    chords:[C7,Am7,Dm7,G7],bpm:76,style:"lofi",swing:.12}),
  secrets:mkHip({mel:Array.from({length:8},()=>[[70,.5],[69,.25],[70,.25],[67,.5],[0,.5]]).flat(),oct:12,lead:"bell",leadVol:.75,
    chords:[Gm,GmF,Eb,D7],bpm:136,style:"trap"}),
  lrc:mkHip({mel:[[62,1],[67,1],[67,1.5],[66,.5],[67,1],[71,1],[71,1],[69,1],[74,1],[74,1],[74,1.5],[72,.5],[71,1],[69,1],[71,2]],oct:12,lead:"bell",
    chords:[G,D,Em7,C],bpm:96,style:"boom"}),
  lounge:mkHip({mel:[[64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4],[65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[67,1],[67,1],[65,1],[62,1],[60,4]],
    oct:0,lead:"soft",leadVol:.8,chords:[C7,Am7,Dm7,G7],bpm:72,style:"lofi",swing:.12}),
  bingo:mkHip({mel:[[72,1],[71,.75],[69,.25],[67,1.5],[65,.5],[64,1],[62,1],[60,1.5],[67,.5],[69,1.5],[69,.5],[71,1.5],[71,.5],[72,3.5]],oct:12,lead:"bell",leadVol:.8,
    chords:[C,Am7,F,G7],bpm:98,style:"boom"}),
};
const SONGS={...Object.fromEntries(Object.entries(HIP).map(([k,v])=>["hh_"+k,v])),lobby:mkJingle(),count:mkCarol(),board:mkDeck(),silent:mkSilent(),dirge:mkDirge(),march:mkMarch(),battle:mkBattle()};
var fileSong=null,fileVol=.9,ducked=false,mixT=0;
const fileLevel=()=>XM.sound?(ducked?fileVol*.3:fileVol):0;
XM.duck=on=>{ducked=on;if(musicBus)musicBus.gain.setTargetAtTime(on?.16:.5,AC.currentTime,.15);if(fileSong)fileSong.volume=fileLevel()};
function playFile(src,vol,onend){const a=new Audio(src);fileVol=vol;a.volume=fileLevel();fileSong=a;a.onended=()=>{if(fileSong===a){fileSong=null;onend&&onend()}};a.play().catch(()=>{});return a}
function playSynth(key){song=SONGS[key];if(!song)return false;
  const evs=song.ev.slice().sort((a,b)=>a[0]-b[0]);let loopStart=AC.currentTime+.08,i=0;
  timerId=setInterval(()=>{
    const spb=60/song.bpm;
    while(true){
      const e=evs[i];const t=loopStart+e[0]*spb;
      if(t>AC.currentTime+.15)break;
      if(t>=AC.currentTime-.02)INST[e[1]](t,e[2],e[3]*spb,e[4]);
      i++;if(i>=evs.length){i=0;loopStart+=song.len*spb}
    }
  },25);return true}
// 🛋️ lobby mix: your recorded lobby song, then the built-in lounge beat for about 2 minutes, then your song again
function lobbyMix(){if(songName!=="lobbymix")return;
  playFile("/xmas/walkups/lobby1.m4a",.6,()=>{if(songName!=="lobbymix")return;playSynth("hh_lounge");
    mixT=setTimeout(()=>{if(songName!=="lobbymix")return;clearInterval(timerId);timerId=0;song=null;lobbyMix()},130000)})}
XM.playSong=function(name,force){
  if(songName===name&&!force)return;
  XM.stopSong();if(!ensureAudio())return;
  if(name==="lobbymix"){songName=name;lobbyMix();return}
  if(/^wu_[a-z0-9]+$/.test(name)){   // a real recorded walk-up song: plays once, about 30 seconds
    songName=name;playFile("/xmas/walkups/"+name.slice(3)+".m4a",.9,()=>{if(songName===name)songName=null});return}
  if(!SONGS[name]){songName=null;return}songName=name;playSynth(name);
};
XM.stopSong=function(){clearInterval(timerId);timerId=0;clearTimeout(mixT);song=null;songName=null;if(fileSong){const a=fileSong;fileSong=null;try{a.pause()}catch(e){}}};
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
  if(kind==="siren"){const o=AC.createOscillator(),g=AC.createGain();o.type="sawtooth";o.frequency.setValueAtTime(600,t);
    for(let k=0;k<6;k++){o.frequency.linearRampToValueAtTime(1100,t+k*.5+.25);o.frequency.linearRampToValueAtTime(600,t+k*.5+.5)}
    const f=AC.createBiquadFilter();f.type="lowpass";f.frequency.value=2200;o.connect(f);f.connect(g);g.connect(sfxBus);env(g,t,.05,.12,3);o.start(t);o.stop(t+3.05)}
  if(kind==="shutter"){noise(t,.05,.5,sfxBus,"highpass",3000);noise(t+.09,.06,.4,sfxBus,"bandpass",2000,1)}
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
XM.SAY={"Clo":"C.Lo","Kachow":"Kuh-chow","HumblePie1":"Humble Pie One","Iron Balls III":"Iron Balls the Third","Elisha":"Alicia","QUEEN MOTHER":"Queen Mother","Kamdon":"Camden"};
XM.spoken=n=>{const d=XM.dn(n);return XM.SAY[d]||(d===n?XM.SAY[n]:null)||d};
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
let celebT=[];
XM.cancelCelebrate=()=>{celebT.forEach(clearTimeout);celebT=[]};
XM.celebrate=(name,{intro="Winner",line=null}={})=>{
  ensureAudio();XM.cancelCelebrate();const setTimeout=(f,ms)=>{const id=window.setTimeout(f,ms);celebT.push(id);return id};XM.sfx("boom");setTimeout(()=>XM.sfx("boom"),380);
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
/* XM.tiebreaker({game:"cookie"|"scoop"|"lrc"|"bingo", tied:[names], onClose, onWinner(name), noSave, lock, winLine, eyebrow})
   noSave: no "Save as victor" button. winLine: the line under the winner's name (default "Go claim your major award!",
   or "Wins the face-off and moves on!" with noSave). eyebrow: the small label on the win screen. */
let T=null,tbTimer=0,tbRun=0;
const clearT=()=>{tbRun++;clearInterval(tbTimer);tbTimer=0;if(T&&T.raf)cancelAnimationFrame(T.raf)};
// run fn later only if nothing has changed in the tiebreaker since (no close, switch, still-tied, stop)
const later=(fn,ms)=>{const r=tbRun;setTimeout(()=>{if(T&&r===tbRun)fn()},ms)};
XM.tiebreakerOpen=()=>!!T;
XM.tiebreaker=function(opts={}){
  ensureAudio();
  if(T)closeTB();   // one at a time: close the open one properly (its music comes back, its briefing goes)
  const g=opts.game&&XM.TB[opts.game]?opts.game:null;
  T={game:g,picked:new Set(opts.tied||[]),round:1,used:[],tb:g||"stare",onClose:opts.onClose,onWinner:opts.onWinner,noSave:!!opts.noSave,lock:!!opts.lock,winLine:opts.winLine||"",eyebrow:opts.eyebrow||"",prevSong:XM.currentSong(),state:{}};
  let el=document.getElementById("xm-tb");if(!el){el=document.createElement("div");el.id="xm-tb";el.className="tb";el.setAttribute("role","dialog");el.setAttribute("aria-label","Tiebreaker");document.body.appendChild(el)}
  XM.stopSong();XM.sfx("gong");
  if(T.picked.size>=2)startTB(T.tb);else view("pick");
};
function closeTB(){clearT();if(window.Briefing&&Briefing.open())Briefing.close();XM.hush();XM.cancelCelebrate();const el=document.getElementById("xm-tb");if(el)el.remove();XM.stopSong();const cb=T&&T.onClose;T=null;if(cb)cb()}
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
    <div class="row"><span class="tiny">Tied: ${tied().map(esc).join(", ")}</span>${T.lock?"":`<button class="btn ghost" id="tb-who">Change who's tied</button>`}</div>`},
  play:()=>{const t=XM.TB[T.tb];
    return `<div class="ic-big">${t.ic}</div><h1 class="big ttl">${esc(t.title)}</h1><p class="rules">${esc(t.rules)}</p>
    <div id="tb-tool" style="display:grid;justify-items:center;gap:14px;width:100%">${TOOLS[t.tool].html(t)}</div>
    <div class="panel" style="display:grid;gap:10px;justify-items:center"><div class="eyebrow">${t.tool==="elim"?"Tap who's out. Last one standing wins":"Tap who won"}</div>
      <div class="faces ${tied().length>6?"many":""}">${tied().map(n=>faceBtn(n,`data-win="${esc(n)}"`,T.state.out&&T.state.out.has(n)?"out":"")).join("")}</div>
      <div class="row"><button class="btn ghost" id="tb-again">😬 Still tied</button><button class="btn ghost" id="tb-switch">Switch tiebreaker</button></div></div>`},
  fate:()=>`<h1 class="big ttl">Let Fate Decide</h1><p class="rules">The odds are about to be in someone's favor.</p>
    <button class="btn red" id="fate-spin" style="font-size:1.4rem;padding:.9em 2.2em">🎡 Spin the wheel of fate</button>
    <div class="fatebox"><div class="pointer"></div><canvas class="fate" id="fate" width="900" height="900"></canvas><div class="hub"></div></div>`,
  win:()=>`<div class="eyebrow" style="font-size:1rem">${esc(T.eyebrow||(T.game?XM.GAMES[T.game].name:"Tiebreaker"))} · the tie is broken</div>
    <div class="champ" style="display:grid;justify-items:center"><div class="crown">👑</div><img src="${XM.photo(T.winner)}" alt=""></div>
    <h1 class="big ttl" style="animation-delay:.6s">${esc(T.winner)}</h1>
    <p class="who" style="font-size:clamp(1.6rem,3.4vw,2.8rem);color:var(--ink)">${esc(T.winLine||(T.noSave?"Wins the face-off and moves on!":"Go claim your major award!"))}</p>
    <div class="row">${T.game&&!T.noSave?`<button class="btn" id="tb-save">🏆 Save as ${esc(XM.GAMES[T.game].name)} victor</button>`:""}<button class="btn ghost" id="tb-done">Done</button></div>`,
};
function suggest(){
  if(T.round===1&&T.game)return T.game;
  return XM.TB_ORDER.find(k=>!T.used.includes(k)&&k!==T.game&&["stare","toss","cane"].includes(k))||XM.TB_ORDER.find(k=>!T.used.includes(k))||"stare";
}
function startTB(k){
  T.tb=k;T.used.push(k);T.state={};
  if(k==="fate"){view("fate");return}
  const go=()=>{if(!T)return;view("play");XM.sfx("stinger");if(XM.TB[k].song)later(()=>XM.playSong(XM.TB[k].song),900)};
  if(!window.Briefing)return go();
  // ⚔️ read the tiebreaker's rules out loud first; the Gamemaker presses Start
  const t=XM.TB[k],tied=[...T.picked].map(XM.dn),sentences=(t.rules.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[]).map(x=>x.trim()).filter(Boolean);
  const HOW={stopwatch:"The Gamemaker starts the stopwatch, then taps whoever finishes first.",timer:`The Gamemaker starts a ${t.secs||10}-second timer. When it ends, tap who won.`,
    dice:"Roll, then the Gamemaker taps the highest roll. Ties roll again.",closest:"Each guess gets typed in on the TV. The closest one wins.",
    elim:"The Gamemaker taps each tribute out as they crack. Last one standing wins.",toss:"The Gamemaker counts each throw. Most in the cup wins."};
  Briefing.show({eyebrow:`⚔️ TIEBREAKER · ${tied.map(XM.esc).join(" vs ")}`,title:`${t.ic} ${XM.esc(t.title)}`,
    intro:`Tiebreaker! ${tied.join(" versus ")}. ${t.title}. Here's how it works.`,
    // three steps keeps the briefing in one column, so it reads top to bottom
    steps:[["⚔️",`Tied: <b>${tied.map(XM.esc).join(", ")}</b>`,`Tied: ${tied.join(", ")}.`],[t.ic,XM.esc(sentences.join(" ")),sentences.join(" ")],["🏆",(HOW[t.tool]?HOW[t.tool]+" ":"")+"The winner breaks the tie.",(HOW[t.tool]?HOW[t.tool]+" ":"")+"The winner breaks the tie."]],
    outro:"When you're ready, the Game maker will start.",start:"▶ Start the tiebreaker",muted:()=>!XM.sound,onStart:go});
}
function winner(n){
  clearT();XM.stopSong();T.winner=n;if(T.onWinner)T.onWinner(n);view("win");XM.celebrate(n);
  try{const L=store.get("xmas-ties",[]);L.push({game:T.game||"",tied:[...T.picked],winner:n,how:(XM.TB[T.tb]||{}).title||"",t:Date.now()});store.set("xmas-ties",L.slice(-40))}catch(e){}
  setTimeout(()=>{if(T&&T.view==="win")XM.playSong("lobby")},4200);
}
const WIRE={
  pick(el){el.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{const n=b.dataset.pick;T.picked.has(n)?T.picked.delete(n):T.picked.add(n);XM.sfx(T.picked.has(n)?"tap":"untap");view("pick")});
    const go=el.querySelector("#tb-go");go.onclick=()=>{if(T.picked.size>=2)startTB(suggest())}},
  choose(el){el.querySelectorAll("[data-tb]").forEach(b=>b.onclick=()=>startTB(b.dataset.tb));const who=el.querySelector("#tb-who");if(who)who.onclick=()=>view("pick")},
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
  win(el){const s=el.querySelector("#tb-save");if(s)s.onclick=()=>{XM.setVictor(T.game,T.winner);if(XM.seconds()[T.game]===T.winner)XM.setSecond(T.game,"");s.textContent="✅ Saved to The Capitol Has Spoken";s.disabled=true;XM.sfx("sparkle");document.dispatchEvent(new Event("xmas-victors"))};
    el.querySelector("#tb-done").onclick=closeTB},
};
/* --- elimination (stare-off, candy cane): tap people out, last one standing wins --- */
function toggleOut(n){
  const s=T.state;s.out=s.out||new Set();
  if(s.out.has(n))s.out.delete(n);else{s.out.add(n);XM.sfx("thud")}
  document.querySelectorAll("#xm-tb [data-win]").forEach(b=>b.classList.toggle("out",s.out.has(b.dataset.win)));
  const left=tied().filter(x=>!s.out.has(x));
  if(left.length===1){XM.sfx("tap");const r=tbRun;setTimeout(()=>{if(!T||r!==tbRun||T.view!=="play")return;
    const now=tied().filter(x=>!(T.state.out&&T.state.out.has(x)));if(now.length===1)winner(now[0])},900)}
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
      later(fn,700)}},1000)}
function stopwatchWire(el,withCount){
  const b=el.querySelector("#tb-start"),st=el.querySelector("#tb-stop"),c=el.querySelector("#tb-clock");
  b.onclick=()=>{clearT();b.disabled=true;countIn(()=>{const t0=performance.now(),r=tbRun;if(!XM.TB[T.tb].song)XM.playSong("battle");
    const tick=()=>{if(!T||r!==tbRun||!c.isConnected)return;c.textContent=fmt(performance.now()-t0);T.raf=requestAnimationFrame(tick)};tick()},el)};
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
  el.querySelectorAll("[data-g]").forEach(i=>{const v=+i.value;if(!(Number.isInteger(v)&&v>=1&&v<=75)){ok=false;i.style.borderColor="#ff6b5e"}else{i.style.borderColor="";g[i.dataset.g]=v}});
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
  else{r.innerHTML=`${top.map(esc).join(" & ")} tied with ${m}. <button class="btn ghost" id="tb-redo">Toss-off: just ${top.map(esc).join(" & ")}</button>`;
    r.querySelector("#tb-redo").onclick=()=>{T.picked=new Set(top);T.state={};view("play")}}
}
/* --- fate spinner --- */
const FCOL=["#b8322a","#e8b04b","#3e8a52","#2f6fb3","#c8412f","#d79a1f","#1f6b4a","#7a3fb0"];
function drawFate(names,rot){
  const c=document.getElementById("fate");if(!c)return;const x=c.getContext("2d"),W=c.width,R=W/2-14,n=names.length,sl=2*Math.PI/n;
  x.clearRect(0,0,W,W);x.save();x.translate(W/2,W/2);x.beginPath();x.arc(0,0,R+10,0,7);x.fillStyle="#e8b04b";x.fill();x.rotate(rot);
  for(let i=0;i<n;i++){x.beginPath();x.moveTo(0,0);x.arc(0,0,R,i*sl,(i+1)*sl);x.closePath();x.fillStyle=FCOL[i%(n%FCOL.length===1?FCOL.length-1:FCOL.length)];x.fill();x.strokeStyle="rgba(251,246,234,.6)";x.lineWidth=3;x.stroke();
    x.save();x.rotate(i*sl+sl/2);x.textAlign="right";x.textBaseline="middle";let fs=Math.min(56,Math.max(24,sl*R*.4));x.font=`800 ${fs}px Outfit, system-ui, sans-serif`;
    while(x.measureText(XM.dn(names[i])).width>R*.6&&fs>16){fs-=2;x.font=`800 ${fs}px Outfit, system-ui, sans-serif`}
    x.fillStyle="#fff";x.shadowColor="rgba(0,0,0,.55)";x.shadowBlur=6;x.fillText(XM.dn(names[i]),R-30,0);x.restore()}
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
    if(t<1)T.raf=requestAnimationFrame(step);else{XM.stopSong();XM.sfx("cannon");later(()=>T.view==="fate"&&winner(names[i]),1400)}};
  T.raf=requestAnimationFrame(step);
}
document.addEventListener("keydown",e=>{if(T&&e.key==="Escape"){e.preventDefault();closeTB()}},true);

/* Twinkle lights helper */
XM.lights=(n=28)=>`<div class="lights" aria-hidden="true">${"<i></i>".repeat(n)}</div>`;

/* ================= 🎙️ CAPITOL HOST VOICE =================
   Lines recorded ahead of time in the ElevenLabs "Capitol Host" voice live in /xmas/voice/ (manifest.json maps a hash of the
   exact spoken text to its mp3). Whenever anything on the page speaks (the announcer, briefings, games), a line that has a
   recording plays the mp3 instead, and fires the same onstart/onend so slides and briefings keep their timing.
   Lines without a recording use the browser voice exactly as before. */
XM.voiceHash=t=>{let h=0x811c9dc5;const s=String(t).replace(/\s+/g," ").trim();for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,"0")};
(function(){const sy=window.speechSynthesis;if(!sy||sy.__vo)return;sy.__vo=true;
  let man={},fr={},frMax=1;
  fetch("/xmas/voice/manifest.json",{cache:"no-cache"}).then(r=>r.ok?r.json():{}).then(j=>{man=j||{}}).catch(()=>{});
  // 🧩 fragments: names and stock phrases recorded on their own, stitched together for lines built from live data
  //    ("Chad Thundercock" + "versus" + "Lucky PomPoms"). A line plays this way only if every word is covered.
  fetch("/xmas/voice/frags.json",{cache:"no-cache"}).then(r=>r.ok?r.json():{}).then(j=>{fr=j||{};frMax=Math.max(1,...Object.keys(fr).map(k=>k.split(" ").length))}).catch(()=>{});
  const toks=t=>String(t).toLowerCase().replace(/[‘’]/g,"'").replace(/[^a-z0-9' ]+/g," ").split(/\s+/).map(w=>w.replace(/^'+|'+$/g,"")).filter(Boolean);
  const cover=t=>{const w=toks(t);if(!w.length)return null;const out=[];let i=0;
    while(i<w.length){let hit=null;for(let j=Math.min(w.length,i+frMax);j>i;j--){const f=fr[w.slice(i,j).join(" ")];if(f){hit=[f,j];break}}
      if(!hit)return null;out.push("/xmas/voice/"+hit[0]);i=hit[1]}return out};
  XM.voiceCover=cover;
  // the list of mp3s for a line: one full recording, or a run of fragments, or null (browser voice)
  const rec=u=>{if(!u||typeof u.text!=="string")return null;const f=man[XM.voiceHash(u.text)];if(f)return ["/xmas/voice/"+f];return cover(u.text)};
  const speak0=sy.speak.bind(sy),cancel0=sy.cancel.bind(sy),sp0=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(sy),"speaking");
  const q=[];let cur=null;   // cur = {u, a?, list?, k} the item playing right now
  const fire=(u,k)=>{try{const f=u["on"+k];if(f)f.call(u,{type:k,utterance:u})}catch(e){}};
  const done=it=>{if(cur!==it)return;cur=null;fire(it.u,"end");pump()};
  function pump(){if(cur||!q.length)return;const u=q.shift(),list=rec(u);
    if(list){const it={u,list,k:0};cur=it;
      list.slice(1).forEach(src=>{try{const p=new Audio();p.preload="auto";p.src=src}catch(e){}});   // warm up the next clips
      const next=()=>{if(cur!==it)return;if(it.k>=list.length)return done(it);const first=it.k===0;
        const a=new Audio(list[it.k++]);it.a=a;a.volume=XM.sound?1:0;
        a.onplaying=()=>{if(cur===it&&!it.started){it.started=true;fire(u,"start")}};a.onended=next;
        const bad=()=>{if(cur!==it)return;if(first){cur=null;pass(u)}else next()};   // first clip missing: browser voice instead
        a.onerror=bad;a.play().catch(bad)};
      next()}
    else pass(u)}
  // a line with no recording: hand it to the browser voice, and continue the queue when it ends
  function pass(u){if(q[0]===u)q.shift();const it={u};cur=it;
    const end=()=>{if(cur!==it)return;cur=null;pump()};u.addEventListener("end",end);u.addEventListener("error",end);speak0(u);
    setTimeout(end,String(u.text||"").length*130+4000)}   // safety net if the browser voice never says it finished
  sy.speak=u=>{if(!cur&&!q.length&&!rec(u))return speak0(u);q.push(u);pump()};
  sy.cancel=()=>{q.length=0;const it=cur;cur=null;if(it&&it.a){try{it.a.pause()}catch(e){}}cancel0()};
  try{Object.defineProperty(sy,"speaking",{configurable:true,get:()=>!!cur||!!(sp0&&sp0.get&&sp0.get.call(sy))})}catch(e){}
  // mute stops a recording that's playing
  const set0=XM.setSound;XM.setSound=on=>{set0(on);if(cur&&cur.a)cur.a.volume=on?1:0};
})();
})();
