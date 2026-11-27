/* 🎀 Capitol Escort voice for District Feud and District Secrets.
   Lines recorded ahead of time live in /xmas/voice-escort/ (manifest.json maps a hash of the exact spoken text
   to a file). Any line the browser is asked to speak that has a recording plays the recording instead,
   with the same start / end events, so the game code doesn't change. Lines with no recording
   (things typed in on the night) still use the browser voice. */
(function(){
  if(!window.speechSynthesis||window.__escortVoice)return;window.__escortVoice=true;
  const BASE="/xmas/voice-escort/";let man={};
  const hash=t=>{let h=0x811c9dc5;const s=String(t).replace(/\s+/g," ").trim();for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,"0")};
  fetch(BASE+"manifest.json",{cache:"no-cache"}).then(r=>r.ok?r.json():{}).then(j=>{man=j||{}}).catch(()=>{});
  // 🧩 fragments: each nickname and the fixed pieces of lines that name someone ("Cable" + "already won so they sit this one out"),
  //    stitched together. A line (or a piece between "…" pauses) plays this way only if every word is covered.
  let fr={},frMax=1;
  fetch(BASE+"frags.json",{cache:"no-cache"}).then(r=>r.ok?r.json():{}).then(j=>{fr=j||{};frMax=Math.max(1,...Object.keys(fr).map(k=>k.split(" ").length))}).catch(()=>{});
  const toks=t=>String(t).toLowerCase().replace(/[‘’]/g,"'").replace(/[^a-z0-9' ]+/g," ").split(/\s+/).map(w=>w.replace(/^'+|'+$/g,"")).filter(Boolean);
  const cover=t=>{const w=toks(t);if(!w.length)return null;const out=[];let i=0;
    while(i<w.length){let hit=null;for(let j=Math.min(w.length,i+frMax);j>i;j--){const f=fr[w.slice(i,j).join(" ")];if(f){hit=[f,j];break}}
      if(!hit)return null;out.push(hit[0]);i=hit[1]}return out};
  const ss=window.speechSynthesis,realSpeak=ss.speak.bind(ss),realCancel=ss.cancel.bind(ss);
  // the whole line, or (for walk-outs like "From District 3… Kyle!") its pieces between the "…" pauses, each recorded
  const files=t=>{t=String(t||"").replace(/\s+/g," ").trim();if(!t)return null;const f=man[hash(t)];if(f)return [f];
    const parts=t.split("…").map(x=>x.trim());
    if(parts.length<2)return cover(t);
    const out=[];
    for(let i=0;i<parts.length;i++){const seg=parts[i]+(i<parts.length-1?"…":"");if(seg==="…"||!seg)continue;const g=man[hash(seg)];if(g){out.push(g);continue}
      const c=cover(parts[i]);if(!c)return null;out.push(...c)}
    return out.length?out:null};
  const queue=[];let cur=null; // {u,a} for a recording, {u,real:true} for a browser-voice line
  const fire=(u,type)=>{try{const ev=new Event(type);if(u.dispatchEvent)u.dispatchEvent(ev);else if(typeof u["on"+type]==="function")u["on"+type](ev)}catch(e){}}; // dispatchEvent also runs u.onstart / u.onend
  const pre={};const load=f=>{if(pre[f])return pre[f];const a=new Audio();a.preload="auto";a.src=BASE+f;try{a.load()}catch(e){}pre[f]=a;return a};
  const take=f=>{const a=pre[f];delete pre[f];return a||load(f)};
  // warm up the clips this line and the next queued lines will need, so stitched pieces play back to back
  const warm=list=>{(list||[]).forEach(load);queue.slice(0,2).forEach(q=>(files(q.text)||[]).forEach(load))};
  // an unrecorded line: the browser voice says it, and the queue waits for it to finish (or a timeout) before going on
  function speakReal(u){const c={u,real:true};cur=c;let t=0;
    const done=()=>{if(cur!==c)return;clearTimeout(t);cur=null;next()};
    u.addEventListener("end",done);u.addEventListener("error",done);
    t=setTimeout(done,2500+String(u.text||"").length*110/Math.max(.5,u.rate||1));
    try{realSpeak(u)}catch(e){done()}}
  function next(){if(cur||!queue.length)return;const u=queue.shift(),list=files(u.text);
    if(!list)return speakReal(u);
    warm(list);
    const vol=Math.max(0,Math.min(1,u.volume==null?1:u.volume));let k=0,started=false;
    const fail=a=>{if(!cur||cur.a!==a)return;cur=null;if(!started)return speakReal(u);fire(u,"end");next()};
    const play=()=>{const a=take(list[k]);a.volume=vol;cur={u,a};if(list[k+1])load(list[k+1]);
      a.onended=()=>{if(!cur||cur.a!==a)return;if(++k<list.length)return play();cur=null;fire(u,"end");next()};
      a.onerror=()=>fail(a);
      try{a.currentTime=0}catch(e){}
      a.play().then(()=>{if(!started){started=true;fire(u,"start")}}).catch(()=>fail(a))};
    play()}
  ss.speak=function(u){if(!u)return;queue.push(u);next()};
  ss.cancel=function(){queue.length=0;const c=cur;cur=null;if(c&&c.a){try{c.a.pause()}catch(e){}}realCancel()};
  try{Object.defineProperty(ss,"speaking",{configurable:true,get(){return !!cur||queue.length>0||Object.getPrototypeOf(ss).__lookupGetter__("speaking").call(ss)}})}catch(e){}
  window.EscortVoice={hash,has:t=>!!files(t)};
})();
