/* Show extras shared by Who's That Tribute and District Secrets:
   1. Walkout: player introductions at the start of the show.
   2. Ticker:  a live leaderboard bar along the bottom of the TV.

   Walk-out introductions:
   Each player gets a spotlight: their photo zooms in, "From District N…", their name, a hype line and a cheer.
   The announcer voice (the browser's built-in speech) reads each name when sound is on.

   Walkout.run({
     names:    ["Jonny", ...]            who walks out, in order
     district: name => number            their district
     photo:    name => image url
     theme:    "tribute" | "secrets"     colors, font and lines that match the game
     sound:    () => true/false          the game's music/sound switch
     onDone:   () => {}                  called once, after the last walk-out or when skipped
   })
   Space, Enter or the Skip button ends it early. While it runs, it sits on top of the game's lobby. */
window.Walkout = (() => {
  const THEMES = {
    tribute: {
      tag: "🏹 Presenting the tributes", font: '"Rye", Georgia, serif', ink: "#fbf6ea",
      accent: "#e8b04b", accent2: "#b8322a", bg1: "#16302a", bg2: "#0d1f18",
      hype: ["Volunteered without blinking!", "Sponsors are already watching!", "Trained for this moment!", "Fierce, festive and ready!",
        "Victor material!", "Bringing the fire!", "The Capitol's new favorite!", "Here for the glory (and the cookies)!",
        "Never misses a target!", "Cool as District 12 snow!", "A threat in a Santa hat!", "Ready for the arena!"],
    },
    secrets: {
      tag: "🔏 Presenting the suspects", font: '"Cinzel Decorative", "Cinzel", Georgia, serif', ink: "#f4ecdb",
      accent: "#d9b25f", accent2: "#a3182b", bg1: "#251a36", bg2: "#0b0a14",
      hype: ["Has a secret to hide…", "Keeps a perfect poker face!", "Trust no one. Especially them.", "Knows something you don't!",
        "The vault's most wanted!", "Never cracks under pressure!", "Smooth as candlelight!", "Leaves no fingerprints!",
        "Hiding something under the tree…", "The master of misdirection!", "Sealed lips, sharp mind!", "Suspiciously innocent!"],
    },
  };

  let root = null, timers = [], finish = null, ac = null, soundOn = () => true;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CSS = `
#walkout{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;color:var(--wo-ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  background:radial-gradient(ellipse at 50% 40%,var(--wo-bg1),var(--wo-bg2) 75%);text-align:center;padding:16px;box-sizing:border-box}
#walkout .wo-rays{position:absolute;left:50%;top:42%;width:220vmax;height:220vmax;margin:-110vmax 0 0 -110vmax;pointer-events:none;
  background:repeating-conic-gradient(color-mix(in srgb,var(--wo-accent) 22%,transparent) 0 9deg,transparent 9deg 18deg);
  -webkit-mask:radial-gradient(circle,#000 0,transparent 40%);mask:radial-gradient(circle,#000 0,transparent 40%);animation:wo-spin 24s linear infinite}
#walkout .wo-beam{position:absolute;top:-10vh;left:50%;width:60vmin;height:120vh;margin-left:-30vmin;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,246,210,.28),rgba(255,246,210,0) 80%);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%)}
#walkout .wo-in{position:relative;display:grid;justify-items:center;gap:clamp(6px,1.4vh,14px);max-width:900px}
#walkout .wo-tag{font-family:var(--wo-font);font-size:clamp(.95rem,2.2vw,1.4rem);color:var(--wo-ink);background:var(--wo-accent2);padding:.3em 1em;border-radius:999px;box-shadow:0 0 0 3px var(--wo-accent)}
#walkout .wo-av{width:clamp(170px,30vh,300px);aspect-ratio:1;border-radius:50%;object-fit:cover;
  box-shadow:0 0 0 8px var(--wo-accent),0 0 0 16px var(--wo-accent2),0 0 120px rgba(255,236,170,.6);animation:wo-zoom .7s cubic-bezier(.2,1.4,.4,1) both}
#walkout .wo-from{font-family:var(--wo-font);color:var(--wo-accent);font-size:clamp(1.1rem,2.8vw,1.9rem);animation:wo-pop .45s .25s both}
#walkout .wo-name{font-family:var(--wo-font);font-size:clamp(2.8rem,9vw,6.2rem);line-height:1;color:var(--wo-ink);text-transform:uppercase;overflow-wrap:anywhere;
  text-shadow:0 5px 0 var(--wo-accent2),0 0 40px color-mix(in srgb,var(--wo-accent) 60%,transparent);animation:wo-drop .65s .5s cubic-bezier(.2,1.5,.4,1) both}
#walkout .wo-hype{font-size:clamp(1.15rem,2.6vw,1.8rem);font-weight:800;color:var(--wo-accent);animation:wo-pop .45s .95s both}
#walkout .wo-dots{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
#walkout .wo-dots i{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.25)}
#walkout .wo-dots i.on{background:var(--wo-accent)}
#walkout .wo-skip{font:inherit;font-weight:800;font-size:1rem;color:var(--wo-ink);background:rgba(255,255,255,.08);border:0;border-radius:999px;padding:.6em 1.3em;
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.3);cursor:pointer;margin-top:6px}
#walkout .wo-skip:focus-visible{outline:3px solid var(--wo-accent);outline-offset:3px}
#walkout .wo-hint{font-size:.85rem;opacity:.7}
#walkout .wo-flash{position:absolute;inset:0;background:#fff;pointer-events:none;animation:wo-flash .5s ease-out forwards}
@keyframes wo-spin{to{rotate:360deg}}
@keyframes wo-zoom{from{transform:scale(.15) rotate(-25deg);opacity:0}}
@keyframes wo-pop{from{transform:scale(.6);opacity:0}}
@keyframes wo-drop{from{transform:translateY(-140%) rotate(-12deg);opacity:0}}
@keyframes wo-flash{from{opacity:.6}to{opacity:0}}
@media (prefers-reduced-motion:reduce){#walkout *{animation:none!important}}`;

  function sfx(kind) {
    if (!soundOn()) return;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
    } catch (e) { return; }
    const t = ac.currentTime + .01, buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const burst = (at, dur, vol, freq, q) => {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
      s.connect(f); f.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + .005); g.gain.exponentialRampToValueAtTime(.0001, at + dur);
      s.start(at, Math.random() * .5); s.stop(at + dur + .05);
    };
    if (kind === "whoosh") burst(t, .5, .22, 900, .5);
    if (kind === "cheer") for (let k = 0; k < 70; k++) burst(t + Math.random() * 1.3, .03 + Math.random() * .05, .04 + Math.random() * .06, 1500 + Math.random() * 2800, 1.4);
  }
  function say(text) {
    try {
      if (!soundOn() || !window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; u.pitch = .9;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function onKey(e) {
    if (!root) return;
    if (e.code === "Space" || e.key === "Enter" || e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); end(); }
  }
  function end() {
    if (!root) return;
    timers.forEach(clearTimeout); timers = [];
    try { speechSynthesis.cancel(); } catch (e) {}
    window.removeEventListener("keydown", onKey, true);
    root.remove(); root = null;
    const f = finish; finish = null; if (f) f();
  }

  function run(o) {
    const names = (o.names || []).filter(Boolean);
    if (root || !names.length) { if (!root) o.onDone && o.onDone(); return; }
    const T = THEMES[o.theme] || THEMES.tribute;
    soundOn = o.sound || (() => true); finish = o.onDone;
    if (!document.getElementById("walkout-css")) { const st = document.createElement("style"); st.id = "walkout-css"; st.textContent = CSS; document.head.appendChild(st); }
    root = document.createElement("div"); root.id = "walkout"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Player introductions");
    root.style.cssText = `--wo-font:${T.font};--wo-ink:${T.ink};--wo-accent:${T.accent};--wo-accent2:${T.accent2};--wo-bg1:${T.bg1};--wo-bg2:${T.bg2}`;
    document.body.appendChild(root);
    window.addEventListener("keydown", onKey, true);
    const hype = (o.hype || T.hype).slice().sort(() => Math.random() - .5);
    let i = -1;
    const step = () => {
      if (!root) return;
      i++;
      if (i >= names.length) { later(end, 500); return; }
      const n = names[i], dn = o.district ? o.district(n) : i + 1;
      root.innerHTML = `${calm ? "" : '<div class="wo-rays"></div>'}<div class="wo-beam"></div>
        <div class="wo-in"><div class="wo-tag">${T.tag}</div>
        <img class="wo-av" src="${esc(o.photo ? o.photo(n) : "")}" alt="">
        <div class="wo-from">From District ${dn}…</div><div class="wo-name">${esc(n)}</div><div class="wo-hype">${esc(hype[i % hype.length])}</div>
        <div class="wo-dots">${names.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>
        <button class="wo-skip" type="button">Skip intros</button><div class="wo-hint">Space: skip</div></div>`;
      root.querySelector(".wo-skip").onclick = end;
      sfx("whoosh");
      later(() => { sfx("cheer"); if (!calm && root) { const f = document.createElement("div"); f.className = "wo-flash"; root.appendChild(f); setTimeout(() => f.remove(), 600); } }, 500);
      say(`From District ${dn}… ${n}!`);
      later(step, 2300);
    };
    step();
  }
  return { run, active: () => !!root, end };
})();

/* Live leaderboard along the bottom of the TV.
   Ticker.start({
     theme:  "tribute" | "secrets"
     label:  "🏆 Leaderboard"
     photo:  name => image url
     rows:   () => [{name, score}] or null to hide it (e.g. in the lobby)
     format: score => text (optional)
   })
   It checks rows() a few times a second and only redraws when something changed.
   When a score goes up, that name pops and shows "+points". */
window.Ticker = (() => {
  const THEMES = {
    tribute: { font: '"Rye", Georgia, serif', ink: "#fbf6ea", accent: "#e8b04b", bg1: "#16302a", bg2: "#0d1f18" },
    secrets: { font: '"Cinzel Decorative", "Cinzel", Georgia, serif', ink: "#f4ecdb", accent: "#d9b25f", bg1: "#251a36", bg2: "#0b0a14" },
  };
  const CSS = `
#ticker{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;align-items:center;gap:14px;overflow:hidden;white-space:nowrap;
  padding:8px max(16px,env(safe-area-inset-left,0px)) calc(8px + env(safe-area-inset-bottom,0px));
  background:linear-gradient(180deg,var(--tk-bg1),var(--tk-bg2));border-top:3px solid var(--tk-accent);color:var(--tk-ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  box-shadow:0 -8px 24px rgba(0,0,0,.35);transform:translateY(110%);transition:transform .45s cubic-bezier(.2,1.2,.4,1)}
#ticker.on{transform:none}
#ticker>b{font-family:var(--tk-font);font-weight:400;color:var(--tk-accent);flex:none;font-size:1rem}
#ticker .tk-l{display:flex;gap:18px;overflow:hidden;min-width:0;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}
#ticker .tk-c{flex:none;display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:1rem;text-transform:uppercase;letter-spacing:.02em}
#ticker .tk-c img{width:28px;height:28px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px var(--tk-accent)}
#ticker .tk-c i{font-style:normal;font-weight:800;color:var(--tk-accent);font-variant-numeric:tabular-nums}
#ticker .tk-c .tk-r{opacity:.7;font-size:.85rem}
#ticker .tk-c.bump{animation:tk-bump .9s cubic-bezier(.2,1.6,.4,1)}
#ticker .tk-c em{font-style:normal;font-weight:800;color:#7dff9e;font-size:.85rem;animation:tk-plus 1.8s ease-out both}
@keyframes tk-bump{30%{transform:scale(1.25);color:var(--tk-accent)}}
@keyframes tk-plus{0%{opacity:0;transform:translateY(10px)}20%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-12px)}}
body.has-ticker{padding-bottom:52px}
@media (prefers-reduced-motion:reduce){#ticker,#ticker *{animation:none!important;transition:none!important}}`;
  let el = null, last = "", prev = {}, timer = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function start(o) {
    const T = THEMES[o.theme] || THEMES.tribute, fmt = o.format || (n => Number(n || 0).toLocaleString());
    if (!document.getElementById("ticker-css")) { const st = document.createElement("style"); st.id = "ticker-css"; st.textContent = CSS; document.head.appendChild(st); }
    if (!el) {
      el = document.createElement("div"); el.id = "ticker"; el.setAttribute("aria-label", o.label || "Leaderboard");
      el.style.cssText = `--tk-font:${T.font};--tk-ink:${T.ink};--tk-accent:${T.accent};--tk-bg1:${T.bg1};--tk-bg2:${T.bg2}`;
      document.body.appendChild(el);
    }
    clearInterval(timer);
    timer = setInterval(() => {
      let rows = null;
      try { rows = o.rows(); } catch (e) { rows = null; }
      const show = !!(rows && rows.length);
      el.classList.toggle("on", show); document.body.classList.toggle("has-ticker", show);
      if (!show) { prev = {}; last = ""; return; }
      rows = rows.slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
      const key = rows.map(r => r.name + ":" + r.score).join("|");
      if (key === last) return;
      last = key;
      let rank = 0, before = null;
      el.innerHTML = `<b>${esc(o.label || "🏆 Leaderboard")}</b><div class="tk-l">${rows.map((r, i) => {
        if (r.score !== before) { rank = i + 1; before = r.score; }
        const gain = prev[r.name] != null && r.score > prev[r.name] ? r.score - prev[r.name] : 0;
        return `<span class="tk-c ${gain ? "bump" : ""}"><span class="tk-r">${rank === 1 && r.score > 0 ? "👑" : "#" + rank}</span>${o.photo ? `<img src="${esc(o.photo(r.name))}" alt="">` : ""}${esc(r.name)} <i>${fmt(r.score)}</i>${gain ? `<em>+${fmt(gain)}</em>` : ""}</span>`;
      }).join("")}</div>`;
      prev = Object.fromEntries(rows.map(r => [r.name, r.score]));
    }, 300);
  }
  return { start };
})();
