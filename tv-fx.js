/* ================= TV ARENA EFFECTS =================
   Extra Hunger Games-style moments on the TV. All original art; nothing here changes the game.
   It watches the game state (S) and adds effects when something happens:
   - the cannon: the screen jolts, flashes and smokes when time runs out
   - a sponsor parachute drifts down before a double-points face
   - our golden bird swoops across the arena when a face appears
   - spotlights sweep the photo at the reveal
   - players on a 3+ streak catch fire on the scoreboard
   - fireworks for the victor
   - a burst of flame when a tribute signs in */
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.head.insertAdjacentHTML("beforeend", `<style>
  .fx-layer{position:fixed;inset:0;pointer-events:none;z-index:6;overflow:hidden}
  .fx-flash{position:fixed;inset:0;background:#fff;z-index:8;pointer-events:none;animation:fxflash .8s both}
  @keyframes fxflash{from{opacity:.9}to{opacity:0}}
  .fx-jolt{animation:fxjolt .6s}
  @keyframes fxjolt{15%{transform:translate(-14px,8px)}30%{transform:translate(12px,-8px)}45%{transform:translate(-8px,5px)}60%{transform:translate(6px,-3px)}80%{transform:translate(-3px,1px)}}
  .fx-smoke{position:absolute;top:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(200,200,200,.55),rgba(120,120,120,0) 70%);animation:fxsmoke 2.4s ease-out both}
  @keyframes fxsmoke{from{transform:scale(.3);opacity:.9}to{transform:scale(2.4) translateY(40px);opacity:0}}
  .fx-chute{position:absolute;left:50%;top:0;width:clamp(140px,16vw,220px);margin-left:calc(clamp(140px,16vw,220px)/-2);animation:fxdrift 3s ease-in-out both,fxsway 1.8s 3s ease-in-out infinite alternate}
  @keyframes fxdrift{from{transform:translateY(-110%) rotate(-14deg)}to{transform:translateY(18vh) rotate(0)}}
  @keyframes fxsway{from{transform:translateY(18vh) rotate(-6deg)}to{transform:translateY(18vh) rotate(6deg)}}
  .fx-bird{position:absolute;top:1vh;left:-20vw;width:clamp(70px,8vw,110px);animation:fxswoop 2.6s cubic-bezier(.45,.05,.4,1) both}
  @keyframes fxswoop{0%{transform:translate(0,4vh) rotate(8deg)}50%{transform:translate(65vw,0) rotate(-6deg)}100%{transform:translate(135vw,-6vh) rotate(-18deg)}}
  .fx-beam{position:absolute;top:-10vh;width:22vw;height:130vh;background:linear-gradient(rgba(255,241,200,.38),rgba(255,241,200,0) 80%);transform-origin:50% 0;filter:blur(6px);animation:fxsweep 2.2s ease-in-out both}
  @keyframes fxsweep{0%{opacity:0;transform:rotate(var(--a))}20%{opacity:1}100%{opacity:0;transform:rotate(calc(var(--a) * -1))}}
  .row.fx-blaze{box-shadow:0 0 0 2px #ff7a1a,0 0 26px rgba(255,90,20,.65)!important;animation:fxflick .22s infinite alternate}
  .row.fx-blaze .av{box-shadow:0 0 0 3px #ff7a1a,0 0 16px #ff4d00}
  @keyframes fxflick{from{filter:brightness(1)}to{filter:brightness(1.15) saturate(1.25)}}
  .roster .p.new img{animation:fxignite 1.2s ease-out}
  @keyframes fxignite{0%{box-shadow:0 0 0 3px #ff7a1a,0 0 0 0 rgba(255,110,20,.9)}60%{box-shadow:0 0 0 3px #ffb300,0 0 0 22px rgba(255,110,20,0)}100%{box-shadow:0 0 0 3px var(--gold),0 0 18px rgba(232,176,75,.7)}}
  .fx-rose{display:inline-block;margin-left:.4em;animation:fxrose 2s ease-in-out infinite alternate}
  @keyframes fxrose{from{transform:rotate(-12deg)}to{transform:rotate(12deg) scale(1.15)}}
  .fx-horn{width:clamp(220px,30vw,380px);animation:fxflyin 1.1s cubic-bezier(.2,1.3,.4,1) both,fxbob 1.8s 1.1s ease-in-out infinite alternate}.fx-horn svg{width:100%;height:auto;filter:drop-shadow(0 10px 24px rgba(0,0,0,.6))}
  @keyframes fxbob{to{transform:translateY(-10px) rotate(-2deg)}}
  /* a fallen tribute: a face nobody guessed */
  .fx-sky{position:fixed;left:0;right:0;top:0;height:46vh;z-index:7;pointer-events:none;display:grid;place-items:center;gap:10px;text-align:center;
    background:radial-gradient(ellipse at 50% 0,#1c2a4a 0,#0b1020 60%,rgba(11,16,32,0) 100%);animation:fxsky 6s ease-in-out both}
  .fx-sky img{width:clamp(110px,14vw,170px);height:clamp(110px,14vw,170px);border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px rgba(255,255,255,.5),0 0 60px 10px rgba(160,190,255,.45);filter:grayscale(.6) brightness(1.1)}
  .fx-sky div{font-family:Rye,Georgia,serif;font-size:clamp(1.1rem,2.4vw,1.7rem);color:#dfe8ff;text-shadow:0 0 18px rgba(160,190,255,.8)}
  .fx-sky small{display:block;font-family:Outfit,sans-serif;font-size:.6em;letter-spacing:.14em;text-transform:uppercase;opacity:.8}
  .fx-sky small.sub{text-transform:none;letter-spacing:.02em;font-size:.55em;margin-top:.4em;opacity:.85}
  @keyframes fxsky{0%{opacity:0;transform:translateY(-30px)}12%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}
  .fx-extra{display:grid;gap:14px;justify-items:center;width:100%;max-width:900px;margin:6px auto}
  .fx-champ{background:var(--night-2);border-radius:16px;padding:12px 22px;box-shadow:0 0 0 3px var(--gold),0 0 24px rgba(232,176,75,.4);font-weight:800;font-size:clamp(1rem,2.2vw,1.4rem);animation:pop .7s .6s both}
  .fx-champ b{color:var(--gold)}
  .fx-fallen{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
  .fx-fallen img{width:64px;height:64px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(255,255,255,.4),0 0 18px rgba(160,190,255,.5);filter:grayscale(.5)}
  .round-card .emblem{animation:fxflyin 1.1s cubic-bezier(.2,1.3,.4,1) both}
  @keyframes fxflyin{from{transform:translate(-60vw,-20vh) rotate(-30deg) scale(.4);opacity:0}to{transform:none;opacity:1}}
  @media (prefers-reduced-motion:reduce){.fx-layer,.fx-flash{display:none}*{animation:none!important}}
  </style>`);

  const layer = document.createElement("div"); layer.className = "fx-layer"; layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  const add = (html, ms) => { const d = document.createElement("div"); d.innerHTML = html; const el = d.firstElementChild; layer.appendChild(el); if (ms) setTimeout(() => el.remove(), ms); return el; };

  const CHUTE = `<svg class="fx-chute" viewBox="0 0 120 150"><path d="M8 52C8 20 32 4 60 4s52 16 52 48c-9-7-17-7-26 0-9-7-17-7-26 0-9-7-17-7-26 0-9-7-17-7-26 0z" fill="#dfe6ee" stroke="#9aa7b4" stroke-width="2"/>
    <path d="M8 52 52 112M34 52 56 112M60 52v60M86 52 64 112M112 52 68 112" stroke="#c9d2dc" stroke-width="1.5"/>
    <rect x="44" y="108" width="32" height="30" rx="3" fill="#b8322a"/><rect x="57" y="108" width="6" height="30" fill="#e8b04b"/><rect x="44" y="119" width="32" height="6" fill="#e8b04b"/></svg>`;

  function cannon() {
    if (calm) return;
    document.body.insertAdjacentHTML("beforeend", '<div class="fx-flash"></div>');
    setTimeout(() => document.querySelector(".fx-flash")?.remove(), 900);
    const app = document.getElementById("app"); app.classList.remove("fx-jolt"); void app.offsetWidth; app.classList.add("fx-jolt");
    [12, 38, 64, 88].forEach((x, i) => setTimeout(() => add(`<div class="fx-smoke" style="left:${x}vw"></div>`, 2500), i * 120));
  }
  function swoop() { if (!calm) add(`<img class="fx-bird" src="bird.svg" alt="">`, 2700); }
  function spotlights() { if (!calm) [[8, 24], [70, -24], [38, 14]].forEach(([x, a], i) => setTimeout(() => add(`<div class="fx-beam" style="left:${x}vw;--a:${a}deg"></div>`, 2300), i * 150)); }
  let chute = null;
  function parachute() { if (!calm && !chute) chute = add(CHUTE); }
  function clearChute() { chute?.remove(); chute = null; }

  // fireworks for the victor
  let fw = null;
  function fireworks(seconds) {
    if (calm || fw) return;
    const c = document.createElement("canvas"); c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:7";
    document.body.appendChild(c); const x = c.getContext("2d"); fw = c;
    const size = () => { c.width = innerWidth; c.height = innerHeight; }; size();
    const cols = ["#ffd36b", "#ff5a4e", "#6fe38e", "#6fb6ff", "#fbf6ea", "#ff9a3c"];
    let P = [], end = performance.now() + seconds * 1000, next = 0;
    (function loop(t) {
      if (t > next && t < end) { next = t + 380 + Math.random() * 380;
        const cx = c.width * (.15 + Math.random() * .7), cy = c.height * (.12 + Math.random() * .35), col = cols[Math.random() * cols.length | 0];
        for (let i = 0; i < 70; i++) { const a = Math.random() * 6.283, s = 2 + Math.random() * 5; P.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 60 + Math.random() * 30, c: col }); } }
      x.globalCompositeOperation = "destination-out"; x.fillStyle = "rgba(0,0,0,.22)"; x.fillRect(0, 0, c.width, c.height);
      x.globalCompositeOperation = "lighter";
      P = P.filter(p => p.l-- > 0);
      for (const p of P) { p.vy += .06; p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy; x.fillStyle = p.c; x.globalAlpha = Math.min(1, p.l / 40); x.fillRect(p.x, p.y, 2.6, 2.6); }
      x.globalAlpha = 1;
      if (t < end || P.length) requestAnimationFrame(loop); else { c.remove(); fw = null; }
    })(performance.now());
  }

  function blaze() {
    // last place gets a rose from the President
    const rows = [...document.querySelectorAll(".board .row")], last = rows[rows.length - 1];
    if (rows.length > 2 && last && !last.querySelector(".fx-rose")) {
      rows.forEach(r => r.querySelector(".fx-rose")?.remove());
      last.querySelector(".nm")?.insertAdjacentHTML("beforeend", ' <span class="fx-rose" title="A rose from the President">🌹</span>');
    }
    rows.forEach(r => {
      const m = r.querySelector(".streak")?.textContent.match(/(\d+) in a row/);
      r.classList.toggle("fx-blaze", !!m && +m[1] >= 3);
    });
  }

  /* The Feast: a cornucopia replaces the bird on the round card, and treats burst out */
  function feastCard() {
    const em = document.querySelector(".round-card .emblem"); if (!em || typeof Ambient === "undefined") return;
    em.outerHTML = `<div class="fx-horn">${Ambient.CORNUCOPIA}</div>`;
    if (!calm) ["coin", "bread", "chute", "coin", "berries", "bread", "coin", "sugar", "chute", "coin"].forEach((k, i) => setTimeout(() => Ambient.spawn(k), 400 + i * 220));
  }
  /* Nobody guessed this face: a cannon sounds and the fallen tribute appears in the night sky */
  function sky() {
    const r = S.rounds[S.qi]; if (!r) return;
    S.fallen = (S.fallen || []).filter(q => q !== r.qi).concat(r.qi);
    // like the films: the music drops out, one cannon booms over the silence, then the music comes back
    try { stopSong(); setTimeout(() => sfx("cannon"), 250); setTimeout(() => { if (S.phase === "board") playSong("arena"); }, 3400); } catch (e) {}
    const d = document.createElement("div"); d.className = "fx-sky";
    if (calm) return;
    const who = Q[r.qi].a, dist = typeof DISTRICT !== "undefined" && DISTRICT[who] ? ` of District ${DISTRICT[who]}` : "";
    d.innerHTML = `<img src="img/${Q[r.qi].r}.jpg" alt=""><div><small>🔔 A cannon sounds in the arena</small>Tribute ${esc(who)}${dist} has fallen<small class="sub">Not one tribute recognized this face.</small></div>`;
    document.body.appendChild(d); setTimeout(() => d.remove(), 6200);
  }
  /* Winner screen: the Capitol coin champion and the faces nobody guessed */
  async function finale() {
    const box = document.createElement("div"); box.className = "fx-extra";
    const fallen = (S.fallen || []).map(qi => `<img src="img/${Q[qi].r}.jpg" alt="${esc(Q[qi].a)}" title="${esc(Q[qi].a)}">`).join("");
    let champ = "";
    try {
      const d = await (await fetch("/api/host?coins=1", { cache: "no-store" })).json();
      const list = Object.entries(d.coins || {}).map(([n, c]) => [n, +c]).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
      if (list.length) champ = `<div class="fx-champ">🪙 Capitol Coin Champion: <b>${esc(list[0][0])}</b> with ${list[0][1]} coin${list[0][1] > 1 ? "s" : ""}${list[1] ? ` · runner-up ${esc(list[1][0])} (${list[1][1]})` : ""}</div>`;
    } catch (e) {}
    box.innerHTML = champ + (fallen ? `<div class="eyebrow">🕯️ Fallen tributes: the faces nobody guessed</div><div class="fx-fallen">${fallen}</div>` : "");
    const pod = document.querySelector(".podium"); if (S.phase === "final" && pod && box.innerHTML) pod.after(box);
  }

  let prev = {};
  setInterval(() => {
    if (typeof S === "undefined" || !S) return;
    const now = { phase: S.phase, qi: S.qi, locked: S.locked };
    if (now.phase !== prev.phase || now.qi !== prev.qi) {
      if (now.phase !== "ready") clearChute();
      if (now.phase === "ready" && DOUBLE.has(S.qi) && S.qi < FEAST) parachute();
      if (now.phase === "question") swoop();
      if (now.phase === "reveal") spotlights();
      if (now.phase === "final") { fireworks(12); setTimeout(finale, 300); }
      if (now.phase === "roundcard" && S.qi >= FEAST) setTimeout(feastCard, 50);
      if ((now.phase === "board" || now.phase === "final") && prev.phase === "reveal" && !S.correct.length) sky();
      if (now.phase === "lobby" || (now.phase === "roundcard" && S.qi === 0)) S.fallen = [];
    }
    if (now.phase === "question" && now.locked && !prev.locked && prev.phase === "question" && prev.qi === now.qi) cannon();
    if (now.phase === "board" || now.phase === "final") blaze();
    // floating things: plenty in the lobby and between faces; only along the edges while a face is up
    const amb = now.phase === "lobby" || now.phase === "roundcard" || now.phase === "final" ? ["full", { max: 8, every: [900, 1800] }]
      : now.phase === "question" && !now.locked ? ["edges", { max: 6, every: [1000, 1900] }]
      : now.phase === "board" ? ["edges", { max: 5, every: [1300, 2300] }] : ["off"];
    if (typeof Ambient !== "undefined") Ambient.set(...amb);
    prev = now;
  }, 100);
})();
