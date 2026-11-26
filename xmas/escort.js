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
  const ss=window.speechSynthesis,realSpeak=ss.speak.bind(ss),realCancel=ss.cancel.bind(ss);
  const queue=[];let cur=null; // {u,a}
  const fire=(u,type)=>{try{const ev=new Event(type);if(typeof u["on"+type]==="function")u["on"+type](ev);u.dispatchEvent&&u.dispatchEvent(ev)}catch(e){}};
  function next(){if(cur||!queue.length)return;const u=queue.shift(),f=man[hash(u.text)];
    if(!f){realSpeak(u);return next()}
    const a=new Audio(BASE+f);a.volume=Math.max(0,Math.min(1,u.volume==null?1:u.volume));cur={u,a};
    const done=()=>{if(!cur||cur.a!==a)return;cur=null;fire(u,"end");next()};
    a.onended=done;a.onerror=()=>{if(!cur||cur.a!==a)return;cur=null;realSpeak(u);next()};
    a.play().then(()=>fire(u,"start")).catch(()=>{if(!cur||cur.a!==a)return;cur=null;realSpeak(u);next()})}
  ss.speak=function(u){if(!u||!man[hash(u.text)]){if(cur||queue.length){queue.push(u);return}return realSpeak(u)}queue.push(u);next()};
  ss.cancel=function(){queue.length=0;if(cur){const a=cur.a;cur=null;try{a.pause()}catch(e){}}realCancel()};
  try{Object.defineProperty(ss,"speaking",{configurable:true,get(){return !!cur||queue.length>0||Object.getPrototypeOf(ss).__lookupGetter__("speaking").call(ss)}})}catch(e){}
  window.EscortVoice={hash,has:t=>!!man[hash(t)]};
})();
