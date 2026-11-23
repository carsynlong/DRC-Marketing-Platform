/* ================= EXTRAS (Who's That Tribute TV) =================
   🎲 Gamemaker twists   5 random faces get a surprise rule, shown during the 3-2-1 (TV + phones)
   ⚡ Speed bonus        up to +500 for a fast right answer
   💡 Hint               halfway through the timer: first letter, or a district range
   🛒 Sponsor shop       phones spend Capitol coins on power-ups for the next face (api/shop.js)
   🎤 Victor's interview phones send questions; the TV shows them one by one and reads them out (api/ask.js)
   index.html calls the hooks named below; everything else lives here. */
const Extras = (() => {
  const TWISTS = {
    rush: { icon: "🐺", title: "Mutts released!", text: "Only 10 seconds on this face!" },
    bw: { icon: "🌫️", title: "Fog in the arena", text: "The photo is black and white." },
    flip: { icon: "🙃", title: "The arena flipped!", text: "The photo is upside down." },
    underdog: { icon: "🌹", title: "Underdog's chance", text: "The bottom 3 score double on this face!" },
  };
  const SPEED_MAX = 500, ROSE = 200, DD_LOSS = 500;
  const tw = () => S.rounds[S.qi]?.twist;
  const post = body => fetch("/api/host", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  document.head.insertAdjacentHTML("beforeend", `<style>
  .twcard{display:grid;gap:6px;justify-items:center;background:linear-gradient(160deg,#2a1c05,#5a3d10);color:#ffe9a8;border-radius:18px;padding:14px 28px;
    box-shadow:0 0 0 4px var(--gold),0 0 40px rgba(232,176,75,.55);animation:twflip .8s cubic-bezier(.2,1.3,.4,1) both;max-width:640px}
  .twcard .e{font-size:clamp(3rem,7vw,5rem);line-height:1}.twcard small{letter-spacing:.2em;text-transform:uppercase;font-weight:800;font-size:.8rem;opacity:.8}
  .twcard b{font-family:var(--display);font-size:clamp(1.6rem,4vw,2.6rem);font-weight:400}.twcard span{font-weight:700;font-size:clamp(1rem,2vw,1.3rem)}
  @keyframes twflip{from{transform:perspective(800px) rotateY(180deg) scale(.6);opacity:0}to{transform:none;opacity:1}}
  .twtag{position:absolute;left:14px;bottom:14px;z-index:4;background:rgba(42,28,5,.9);color:#ffe9a8;font-weight:800;padding:.4em 1em;border-radius:999px;box-shadow:0 0 0 2px var(--gold)}
  .hint{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:4;background:rgba(13,31,24,.92);color:var(--ink);font-weight:800;font-size:clamp(1.1rem,2.4vw,1.7rem);
    padding:.45em 1.2em;border-radius:999px;box-shadow:0 0 0 3px var(--gold),0 0 30px rgba(232,176,75,.5);animation:pop .6s cubic-bezier(.2,1.5,.4,1) both;white-space:nowrap}
  .hint b{color:var(--gold);font-family:var(--display);font-weight:400}
  .shoptoast{position:fixed;left:50%;top:14vh;transform:translateX(-50%);z-index:9;background:#2a0f12;color:#fff;font-weight:800;font-size:clamp(1rem,2.2vw,1.5rem);
    padding:.6em 1.4em;border-radius:16px;box-shadow:0 0 0 3px #e0233a,0 10px 30px rgba(0,0,0,.5);animation:pop .6s cubic-bezier(.2,1.5,.4,1) both}
  .iv{display:grid;gap:16px;justify-items:center;text-align:center;padding-block:2vh}
  .iv .av{width:clamp(120px,16vw,200px);height:clamp(120px,16vw,200px);box-shadow:0 0 0 5px var(--gold),0 0 60px rgba(232,176,75,.6)}
  .iv h1{font-size:clamp(2rem,5vw,3.6rem);color:var(--gold);text-shadow:0 3px 0 var(--red-d)}
  .iv .q{background:var(--night-2);border-radius:20px;padding:20px 30px;max-width:900px;font-size:clamp(1.4rem,3.4vw,2.6rem);font-weight:800;line-height:1.25;
    box-shadow:0 0 0 3px var(--gold);animation:pop .6s cubic-bezier(.2,1.4,.4,1) both}
  .iv .q small{display:block;font-size:.5em;color:var(--gold);letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
  </style>`);

  /* ---------- 🎲 twists ---------- */
  function deal() {
    const keys = Object.keys(TWISTS), pool = shuffle(S.rounds.map((_, i) => i).filter(i => i >= 2 && i < FEAST && !DOUBLE.has(i)));
    pool.slice(0, 5).forEach((qi, k) => { S.rounds[qi].twist = keys[k % keys.length]; });
  }
  function card() {
    const t = TWISTS[tw()]; if (!t) return "";
    return `<div class="twcard"><small>🎲 Gamemaker twist</small><span class="e">${t.icon}</span><b>${t.title}</b><span>${t.text}</span></div>`;
  }
  function restore() { if (S.secsSaved) { S.secs = S.secsSaved; S.secsSaved = 0; } }
  /* start of a face: apply the twist, reset the hint, pull shop purchases */
  function start() {
    restore();
    if (tw() === "rush") { S.secsSaved = S.secs; S.secs = 10; }
    S.qSecs = S.secs; S.hintShown = false; loadBuys(true);
  }
  function zoomStyle(im) {
    const t = tw();
    if (t === "flip") im.style.transform += " rotate(180deg)";
    im.style.filter = t === "bw" ? "grayscale(1) contrast(1.15)" : "";
  }

  /* ---------- 💡 hint at half time ---------- */
  function hintText() {
    const a = cur().a, d = DISTRICT[a];
    return S.qi % 2 ? `Starts with <b>${esc(a[0])}</b>` : `From <b>District ${d <= 6 ? "1–6" : "7–12"}</b>`;
  }
  function tick() {
    if (S.hintShown || S.phase !== "question" || S.locked || S.elapsed < S.secs / 2) return;
    S.hintShown = true; showHint();
    try { sfx("tap"); } catch (e) {}
  }
  function showHint() {
    const st = document.querySelector(".stage"); if (!st || st.querySelector(".hint")) return;
    st.insertAdjacentHTML("beforeend", `<div class="hint">💡 Hint: ${hintText()}</div>`);
  }
  function after() {   // after every render
    if (S.phase === "question" && S.hintShown) showHint();
    if (S.phase === "question" && TWISTS[tw()]) {
      const st = document.querySelector(".stage");
      if (st && !st.querySelector(".twtag")) st.insertAdjacentHTML("beforeend", `<div class="twtag">${TWISTS[tw()].icon} ${TWISTS[tw()].title}</div>`);
    }
    if (S.phase === "interview") wireInterview();
    const iv = document.getElementById("interview"); if (iv) iv.onclick = () => { try { ensureAudio(); } catch (e) {} startInterview(); };
  }

  /* ---------- 🛒 shop purchases for this face ---------- */
  async function loadBuys(announce) {
    const qi = S.qi;
    try {
      const d = await (await fetch(`/api/host?buys=${qi}`, { cache: "no-store" })).json();
      if (S.qi !== qi) return;
      const b = {};
      for (const k in d.buys || {}) { const [n, item] = k.split("|"); (b[n] = b[n] || {})[item] = d.buys[k]; }
      const roses = Object.entries(b).filter(([, x]) => x.rose).map(([n, x]) => [n, x.rose]);
      if (announce && roses.length && JSON.stringify(roses) !== JSON.stringify(S.rosesShown || [])) {
        S.rosesShown = roses;
        const t = document.createElement("div"); t.className = "shoptoast";
        t.innerHTML = roses.map(([n, to]) => `🌹 ${esc(n)} sent ${esc(to)} a rose from the President: −${ROSE}`).join("<br>");
        document.body.appendChild(t); setTimeout(() => t.remove(), 5000);
      }
      S.buys = b;
    } catch (e) {}
  }
  const has = (n, item) => !!(S.buys && S.buys[n] && S.buys[n][item]);
  // spyglass buyers get the first letter on their phone (sent in the game snapshot)
  function spy() {
    if (!(S.phase === "question" && !S.locked && S.buys)) return undefined;
    const out = {}; for (const n in S.buys) if (S.buys[n].spy) out[n] = cur().a[0]; return Object.keys(out).length ? out : undefined;
  }

  /* ---------- scoring: speed bonus, underdog, shop power-ups ---------- */
  let pre = {};
  function before() { pre = {}; S.players.forEach(p => { pre[p.name] = { score: p.score, streak: p.streak }; }); }
  function score(mult) {
    const ranks = Object.entries(pre).filter(([n]) => n !== HOST && S.players.find(p => p.name === n)?.on).sort((a, b) => a[1].score - b[1].score).slice(0, 3).map(([n]) => n);
    S.players.forEach(p => {
      p.speed = 0; p.notes = [];
      if (!p.on || p.name === HOST) return;
      const right = S.correct.includes(p.name), missed = (S.slow || []).includes(p.name);
      if (right) {
        const t = S.ansAt?.[p.name];
        if (t != null) { p.speed = Math.max(0, Math.round(SPEED_MAX * (1 - t / ((S.qSecs || S.secs) * 1000)) / 10) * 10) * mult; p.delta += p.speed; p.score += p.speed; if (p.speed) p.notes.push(`⚡ +${p.speed}`); }
        if (tw() === "underdog" && ranks.includes(p.name)) { p.score += p.delta; p.delta *= 2; p.notes.push("🌹 underdog ×2"); }
        if (has(p.name, "dd")) { p.score += p.delta; p.delta *= 2; p.notes.push("🎯 double down ×2"); }
      } else {
        if (has(p.name, "shield")) {
          p.streak = pre[p.name]?.streak || 0;
          if (missed && p.delta < 0) { p.score -= p.delta; p.delta = 0; }
          p.notes.push("🛡️ shield saved you");
        }
        if (has(p.name, "dd")) { const l = Math.min(DD_LOSS, p.score); p.score -= l; p.delta -= l; p.notes.push(`🎯 double down −${l}`); }
      }
    });
    for (const n in S.buys || {}) {
      const to = S.buys[n].rose, v = to && S.players.find(p => p.name === to);
      if (v && v.on) { const l = Math.min(ROSE, v.score); v.score -= l; v.delta = (v.delta || 0) - l; (v.notes = v.notes || []).push(`🌹 rose from ${n}`); }
    }
  }

  /* ---------- 🎤 victor's interview ---------- */
  let ivT = 0;
  function startInterview() { S.phase = "interview"; S.iv = S.iv || { i: 0, list: [] }; stopSong(); render(); pullAsks(); clearInterval(ivT); ivT = setInterval(pullAsks, 2000); }
  async function pullAsks() {
    if (S.phase !== "interview") return clearInterval(ivT);
    try {
      const d = await (await fetch("/api/host?asks=1", { cache: "no-store" })).json();
      const list = (d.asks || []).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
      const had = S.iv.list.length; S.iv.list = list;
      if (list.length !== had) { const was = S.iv.i; render(); if (had === 0 && list.length) readQ(); else if (was !== S.iv.i) readQ(); }
    } catch (e) {}
  }
  function readQ() {
    try { const q = S.iv.list[S.iv.i]; if (!q || !S.sound || !window.speechSynthesis) return; speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(`${q.name} asks: ${q.q}`); u.rate = 1; u.pitch = .95; speechSynthesis.speak(u); } catch (e) {}
  }
  function interviewView() {
    const w = ranked()[0], list = S.iv.list, q = list[S.iv.i];
    return `<section class="iv"><div class="eyebrow">🎤 Victor's interview</div><img class="av" src="${AV(w.name)}" alt=""><h1>${esc(w.name)}, our victor</h1>
      ${q ? `<div class="q"><small>Question ${S.iv.i + 1} of ${list.length} · from ${esc(q.name)}</small>${esc(q.q)}</div>`
          : `<p>📱 Everyone: type a question for ${esc(w.name)} on your phone!</p>`}
      <div class="ctl" style="justify-content:center"><button class="btn ghost" id="ivdone">Back to the winners</button>
        ${q ? `<button class="btn ghost" id="ivagain">🔊 Read it again</button><button class="btn" id="ivnext">${S.iv.i < list.length - 1 ? "Next question ▶" : "Waiting for more…"}</button>` : ""}</div>
      <div class="tiny">Space: next question</div></section>`;
  }
  function nextQ() { if (S.iv.i < S.iv.list.length - 1) { S.iv.i++; render(); readQ(); } }
  function wireInterview() {
    const b = id => document.getElementById(id);
    if (b("ivnext")) b("ivnext").onclick = nextQ;
    if (b("ivagain")) b("ivagain").onclick = readQ;
    if (b("ivdone")) b("ivdone").onclick = () => { clearInterval(ivT); try { speechSynthesis.cancel(); } catch (e) {} S.phase = "final"; render(); };
  }
  function reset() { restore(); S.buys = {}; S.rosesShown = []; S.iv = null; S.hintShown = false; clearInterval(ivT); }

  return { deal, card, start, restore, zoomStyle, tick, after, before, score, spy, loadBuys, startInterview, interviewView, nextQ, reset,
    twist: () => TWISTS[tw()] || null, hint: () => S.hintShown ? hintText().replace(/<\/?b>/g, "") : null };
})();
