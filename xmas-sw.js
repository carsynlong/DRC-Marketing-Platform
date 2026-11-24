// Offline backup for the Christmas Games show pages only (/show, /host, /showphone, /wheel, /bingo, /cheatsheet, /xmas/*).
// Everything else on the site (the existing games) is left completely alone.
const CACHE="xmas-show-v19";
const PRECACHE=["/show", "/host", "/check", "/showphone", "/briefing.js", "/qrcode.js", "/wheel", "/bingo", "/cheatsheet", "/xmas/bingo-cards.json", "/xmas/walkups/ride.m4a", "/xmas/walkups/snap.m4a", "/xmas/walkups/walk.m4a", "/xmas/walkups/thunder.m4a", "/xmas/walkups/country.m4a", "/xmas/walkups/crazytrain.m4a", "/xmas/walkups/gangsta.m4a", "/xmas/walkups/goingbad.m4a", "/xmas/walkups/boom.m4a", "/xmas/walkups/hypnotize.m4a", "/xmas/walkups/jump.m4a", "/xmas/walkups/throat.m4a", "/xmas/walkups/lobby1.m4a", "/xmas/emblem.png", "/xmas/xmas.css", "/xmas/xmas.js", "/xmas/past/elisha-idk.jpg", "/xmas/past/granny-idk.jpg", "/xmas/past/past1.jpg", "/xmas/past/past2.jpg", "/xmas/past/past3.jpg", "/xmas/past/past4.jpg", "/xmas/past/past5.jpg", "/xmas/past/past6.jpg", "/xmas/icons/bingo-w.png", "/xmas/icons/bingo.png", "/xmas/icons/canes.png", "/xmas/icons/cannon.png", "/xmas/icons/coins.png", "/xmas/icons/cookie-w.png", "/xmas/icons/cookie.png", "/xmas/icons/feud-w.png", "/xmas/icons/feud.png", "/xmas/icons/gift.png", "/xmas/icons/lock.png", "/xmas/icons/lrc-w.png", "/xmas/icons/lrc.png", "/xmas/icons/mitten-w.png", "/xmas/icons/mitten.png", "/xmas/icons/play.png", "/xmas/icons/scoop-w.png", "/xmas/icons/scoop.png", "/xmas/icons/secrets-w.png", "/xmas/icons/secrets.png", "/xmas/icons/snowflake.png", "/xmas/icons/tribute-w.png", "/xmas/icons/tribute.png", "/xmas/icons/trophy.png", "/xmas/icons/wheel.png", "/xmas/sfx/lets-begin.m4a?v=2", "/xmas/tributes/d01.jpg", "/xmas/tributes/d02.jpg", "/xmas/tributes/d03.jpg", "/xmas/tributes/d04.jpg", "/xmas/tributes/d05.jpg", "/xmas/tributes/d06.jpg", "/xmas/tributes/d07.jpg", "/xmas/tributes/d08.jpg", "/xmas/tributes/d09.jpg", "/xmas/tributes/d10.jpg", "/xmas/tributes/d11.jpg", "/xmas/tributes/d12.jpg", "/xmas/tributes/full/d01.jpg", "/xmas/tributes/full/d02.jpg", "/xmas/tributes/full/d03.jpg", "/xmas/tributes/full/d04.jpg", "/xmas/tributes/full/d05.jpg", "/xmas/tributes/full/d06.jpg", "/xmas/tributes/full/d07.jpg", "/xmas/tributes/full/d08.jpg", "/xmas/tributes/full/d09.jpg", "/xmas/tributes/full/d10.jpg", "/xmas/tributes/full/d11.jpg", "/xmas/tributes/full/d12.jpg"];
const OURS=p=>p.startsWith("/xmas/")||["/show","/host","/check","/check.html","/showphone","/showphone.html","/briefing.js","/qrcode.js","/host.html","/wheel","/bingo","/cheatsheet","/show.html","/wheel.html","/bingo.html","/cheatsheet.html"].includes(p);
const FONTS=h=>h==="fonts.googleapis.com"||h==="fonts.gstatic.com";
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(PRECACHE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("xmas-show-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
  if(FONTS(u.hostname)){e.respondWith(caches.open(CACHE).then(c=>c.match(r).then(hit=>hit||fetch(r).then(res=>{c.put(r,res.clone());return res}))));return}
  if(u.origin!==location.origin||!OURS(u.pathname))return; // not ours: normal network, untouched
  // network first (so updates still arrive), fall back to the saved copy after 4 seconds or when offline
  e.respondWith(caches.open(CACHE).then(c=>new Promise(resolve=>{
    let done=false;const key=u.pathname;
    const fallback=()=>c.match(key).then(hit=>{if(!done&&hit){done=true;resolve(hit)}});
    const t=setTimeout(fallback,4000);
    fetch(r).then(res=>{clearTimeout(t);if(res.ok&&!res.redirected)c.put(key,res.clone());if(!done){done=true;resolve(res)}})
      .catch(()=>{clearTimeout(t);c.match(key).then(hit=>{if(!done){done=true;resolve(hit||Response.error())}})});
  })));
});
