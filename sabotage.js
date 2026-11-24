/* ================= GAMEMAKER SABOTAGE (add-on for the online games) =================
   Loaded by memes.js (the three games' phone pages) and showtime.js (their TV pages).
   It never touches the games themselves. It only puts things ON TOP of the page:
   - Phones: checks every ~2.5s whether the Gamemaker sabotaged this player, then
       ❄️ freeze   : screen iced over, no taps for 8 seconds
       🐕 bite     : a mutt bit you. For 25 seconds every tap makes you limp (1.5s where taps don't work)
       🌫️ fog      : screen fogged over for 10 seconds (you can tap, if you can see)
       🙃 flip     : screen upside down for 12 seconds
       🐝 jackers  : tracker jackers swarm your screen for 12 seconds
   - TVs: a banner when someone gets sabotaged.
   Sent from the Gamemaker remote (/showphone as Carsyn) or the host menu (/host). Server: /api/show. */
(() => {
  if (window.__sabotage) return; window.__sabotage = true;
  // The announcer says "Game maker", not "Gamemaker"
  (function(){const O=window.SpeechSynthesisUtterance;if(!O||O.__gm)return;
    const W=function(t){return new O(typeof t==="string"?t.replace(/\bgame\s?maker(s?)\b/gi,(m,s)=>"game maker"+s).replace(/Iron Balls III/g,"Iron Balls the Third"):t)};W.prototype=O.prototype;W.__gm=true;window.SpeechSynthesisUtterance=W})();
  const isPhone = /play(\.html)?$/.test(location.pathname);
  const LABEL = { freeze: ["❄️", "FROZEN!"], bite: ["🐕", "A MUTT BIT YOU!"], fog: ["🌫️", "FOG!"], flip: ["🙃", "FLIPPED!"], jackers: ["🐝", "TRACKER JACKERS!"] };
  const TVLINE = { freeze: "was FROZEN", bite: "got bitten by a mutt", fog: "is lost in the fog", flip: "got flipped upside down", jackers: "got swarmed by tracker jackers" };
  const css = document.createElement("style");
  css.textContent = `
  .sab{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;text-align:center;font-family:system-ui,sans-serif;color:#fff}
  .sab .b{display:grid;gap:8px;justify-items:center;padding:20px}
  .sab .i{font-size:84px;line-height:1}
  .sab .t{font-size:34px;font-weight:900;letter-spacing:.04em;text-shadow:0 3px 0 rgba(0,0,0,.4)}
  .sab .s{font-size:18px;font-weight:700;opacity:.9}
  .sab .c{font-size:64px;font-weight:900}
  .sab.ice{background:radial-gradient(ellipse at center,rgba(150,210,255,.82),rgba(40,110,170,.95));backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
  .sab.ice::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.18) 0 2px,transparent 2px 38px),repeating-linear-gradient(35deg,rgba(255,255,255,.12) 0 1px,transparent 1px 52px);pointer-events:none}
  .sab.fog{pointer-events:none;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);background:rgba(220,225,230,.45);color:#334}
  .sab.limp{background:rgba(120,0,0,.55)}
  .sab.pop{background:rgba(120,0,0,.8)}
  .sabbite{position:fixed;z-index:2147482999;pointer-events:none;font-size:44px;opacity:.85}
  .sabbee{position:fixed;z-index:2147483001;pointer-events:none;font-size:46px;transition:left 1.1s linear,top 1.1s linear}
  .sabban{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483000;background:#7a1010;color:#fff;font:900 clamp(18px,2.2vw,34px) system-ui,sans-serif;padding:12px 28px;border-radius:999px;box-shadow:0 0 0 4px #e8b04b,0 12px 30px rgba(0,0,0,.5);animation:sabin .4s both}
  @keyframes sabin{from{opacity:0;transform:translate(-50%,-30px)}}`;
  document.head.appendChild(css);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Android vibrates; iPhones can't (Apple blocks it), so they get a white flash instead
  const buzz = p => { try { if (navigator.vibrate && navigator.vibrate(p)) return; } catch (e) {}
    if (!(Array.isArray(p) || p >= 150)) return; const f = document.createElement("div"); f.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:#fff;pointer-events:none;transition:opacity .5s";
    document.body.appendChild(f); requestAnimationFrame(() => { f.style.opacity = "0"; }); setTimeout(() => f.remove(), 600); };

  if (!isPhone) {
    // TV: banner for each new sabotage
    let since = null;
    const tick = async () => {
      if (!document.hidden) try {
        const r = await fetch("/api/show?a=sablog&since=" + (since || 0), { cache: "no-store" });
        if (r.ok) { const j = await r.json(); const list = j.sabs || [];
          if (since === null) since = Math.max(0, ...list.map(x => x.id));
          else for (const x of list) { if (x.id <= since) continue; since = x.id;
            const d = document.createElement("div"); d.className = "sabban"; d.textContent = x.allBut ? `❄️ The Gamemaker FROZE everyone except ${x.to}!` : `${(LABEL[x.kind] || ["⚠️"])[0]} ${x.to} ${TVLINE[x.kind] || "was sabotaged"} by the Gamemaker!`;
            document.body.appendChild(d); setTimeout(() => d.remove(), 5000); } }
      } catch (e) {}
      setTimeout(tick, 2500);
    };
    tick(); return;
  }

  // Phones show everyone's nickname instead of their real name (text only; the game itself still uses real names underneath)
  (() => {
    const AKA = { Jessie: "Lucky PomPoms", Tinsley: "Jolly Balls", Grandad: "Grandad the Ancient and Wise", Dash: "Chad Thundercock", Jonny: "HumblePie1", Natalie: "Buzz Buzz", Elisha: "Bye Felicia", Kamdon: "Big Daddy Kam", Brandon: "Iron Balls III", Kyle: "Kachow", Carsyn: "Clo" };
    const re = /\b(Jessie|Tinsley|Grandad(?! the Ancient)|Dash|Jonny|Natalie|Elisha|Kamdon|Brandon|Kyle|Carsyn)\b/g, skip = n => n && /^(SCRIPT|STYLE|TEXTAREA|INPUT|NOSCRIPT)$/.test(n.nodeName);
    const swap = t => { if (skip(t.parentNode)) return; const v = t.nodeValue; if (v && re.test(v)) { re.lastIndex = 0; t.nodeValue = v.replace(re, m => AKA[m]); } re.lastIndex = 0; };
    const fix = node => { if (node.nodeType === 3) return swap(node); if (node.nodeType !== 1 || skip(node)) return;
      const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) swap(t); };
    fix(document.body);
    new MutationObserver(ms => ms.forEach(m => m.type === "characterData" ? fix(m.target) : m.addedNodes.forEach(fix))).observe(document.body, { childList: true, subtree: true, characterData: true });
  })();

  // Phone: who am I in this game?
  const me = () => { const path = location.pathname, first = /district-feud/.test(path) ? "df-name" : /district-secrets/.test(path) ? "ds-name" : "tribute-name";
    for (const k of [first]) { try { let v = localStorage.getItem(k); if (!v || v === "null") continue;
    if (v.startsWith("\"")) v = JSON.parse(v); if (v) return v; } catch (e) {} } return null; };
  let seen = null, biteUntil = 0, limpUntil = 0, flipT = 0;
  const overlay = (cls, html, ms) => { const o = document.createElement("div"); o.className = "sab " + cls; o.innerHTML = `<div class="b">${html}</div>`; document.body.appendChild(o); if (ms) setTimeout(() => o.remove(), ms); return o; };
  // while bitten: every tap costs you a limp
  const block = e => {
    const now = Date.now();
    if (now < limpUntil) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    if (now < biteUntil && e.type === "click") {
      limpUntil = now + 1500; buzz(80);
      const o = overlay("limp", `<div class="i">🩸</div><div class="t">Limping...</div>`, 1500);
      const b = document.createElement("div"); b.className = "sabbite"; b.textContent = "🦷"; b.style.left = (e.clientX - 20) + "px"; b.style.top = (e.clientY - 20) + "px"; document.body.appendChild(b); setTimeout(() => b.remove(), 1500);
    }
  };
  ["click", "pointerdown", "touchstart", "mousedown"].forEach(t => window.addEventListener(t, block, true));

  function run(x) {
    const [ic, title] = LABEL[x.kind] || ["⚠️", "SABOTAGE!"];
    if (x.kind === "freeze") {
      buzz([400, 100, 400]); let left = 8;
      const o = overlay("ice", `<div class="i">${ic}</div><div class="t">${title}</div><div class="s">The Gamemaker froze you. No taps until you thaw.</div><div class="c">${left}</div>`);
      const iv = setInterval(() => { left--; const c = o.querySelector(".c"); if (c) c.textContent = left; if (left <= 0) { clearInterval(iv); o.remove(); buzz(60); } }, 1000);
    } else if (x.kind === "bite") {
      buzz([200, 80, 200, 80, 500]); biteUntil = Date.now() + 25000;
      overlay("pop", `<div class="i">${ic}</div><div class="t">${title}</div><div class="s">For 25 seconds, every tap makes you limp.</div>`, 2200);
      limpUntil = Date.now() + 2200;
    } else if (x.kind === "fog") {
      buzz(200); overlay("fog", `<div class="i">${ic}</div><div class="t" style="text-shadow:none">${title}</div>`, 10000);
    } else if (x.kind === "flip") {
      buzz(200); const h = document.documentElement; clearTimeout(flipT);
      h.style.transition = "transform .6s"; h.style.transform = "rotate(180deg)"; flipT = setTimeout(() => { h.style.transform = ""; }, 12000);
    } else if (x.kind === "jackers") {
      buzz([100, 50, 100, 50, 100]); const bees = [];
      for (let i = 0; i < 9; i++) { const b = document.createElement("div"); b.className = "sabbee"; b.textContent = "🐝"; b.style.left = Math.random() * innerWidth + "px"; b.style.top = Math.random() * innerHeight + "px"; document.body.appendChild(b); bees.push(b); }
      const iv = setInterval(() => bees.forEach(b => { b.style.left = Math.random() * (innerWidth - 40) + "px"; b.style.top = Math.random() * (innerHeight - 40) + "px"; }), 1100);
      setTimeout(() => { clearInterval(iv); bees.forEach(b => b.remove()); }, 12000);
    }
  }
  const tick = async () => {
    const n = me();
    if (n && !document.hidden) try {
      const r = await fetch("/api/show?a=sab&me=" + encodeURIComponent(n), { cache: "no-store" });
      if (r.ok) { const j = await r.json(); const x = j.sab;
        if (seen === null) seen = x ? x.id : 0;          // ignore anything sent before this page opened
        else if (x && x.id !== seen) { seen = x.id; if ((j.now || Date.now()) - x.t < 20000) run(x); } }
    } catch (e) {}
    setTimeout(tick, 2500);
  };
  tick();
})();
