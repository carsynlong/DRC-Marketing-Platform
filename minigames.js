/* ================= PARTY EXTRAS (TV side of Who's That Tribute) =================
   - Mini-games between rounds: "Run to the Cornucopia" (tap race) before Round 2,
     "Climb the Tree" (shake your phone) before The Feast. Top 3 get bonus points.
   - End-of-game awards (sharpshooter, fastest finger, ...).
   - Tie-breaker showdown if the top spot is tied: one more face, fastest right answer wins.
   index.html calls: Party.before(qi) in next(), Party.view()/after() in render(), Party.primary(),
   Party.scored() and Party.tie() in score(). It reads the game's globals (S, Q, render, sfx...) when called. */
const Party = (() => {
  const MINIS = { 12: "race", 24: "climb" };            // the face a mini-game comes before
  const SECS = 10, BONUS = [500, 300, 200];
  const INFO = {
    race: { icon: "🏃", title: "Run to the Cornucopia!", how: "When the TV says GO, tap the big button on your phone as fast as you can.", verb: "taps" },
    climb: { icon: "🌲", title: "Climb the Tree!", how: "When the TV says GO, shake your phone as hard as you can. (Can't shake? Tap instead.)", verb: "shakes" },
  };
  let pollT = 0, cdT = 0, counts = {};
  const post = body => fetch("/api/host", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const players = () => active();
  const avatar = n => `<img class="av" src="${AV(n)}" alt="">`;

  document.head.insertAdjacentHTML("beforeend", `<style>
  .mg{display:grid;gap:14px;justify-items:center;text-align:center;padding-block:2vh}
  .mg .icon{font-size:clamp(4rem,10vw,7rem);line-height:1;animation:bob 1.2s ease-in-out infinite alternate}
  .mg h1{font-size:clamp(2.2rem,6vw,4.4rem);color:var(--gold);text-shadow:0 3px 0 var(--red-d)}
  .mg p{max-width:60ch;color:var(--muted);margin:0;font-size:clamp(1rem,1.8vw,1.3rem)}
  .mg .big{font-family:var(--display);font-size:clamp(7rem,22vw,14rem);color:var(--gold);line-height:1;text-shadow:0 6px 0 var(--red-d);animation:pop .5s cubic-bezier(.2,1.6,.4,1)}
  .mg .clock{font-family:var(--display);font-size:clamp(2rem,5vw,3.4rem);color:var(--ink)}
  .track{width:min(100%,1100px);display:grid;gap:6px;position:relative;padding-right:90px}
  .lane{position:relative;height:clamp(34px,4.6vh,50px);background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.09));border-radius:999px;box-shadow:inset 0 0 0 1px var(--line)}
  .lane .runner{position:absolute;top:50%;left:0;transform:translate(0,-50%);display:flex;align-items:center;gap:8px;transition:left .55s cubic-bezier(.3,.9,.3,1);white-space:nowrap;font-weight:800}
  .lane .runner .av{width:clamp(30px,4vh,44px);height:clamp(30px,4vh,44px)}
  .lane .runner b{font-size:clamp(.8rem,1.4vw,1rem);background:rgba(0,0,0,.45);padding:.1em .5em;border-radius:999px}
  .track .goal{position:absolute;right:0;top:50%;transform:translateY(-50%);width:90px}
  .tree{width:min(100%,1100px);height:46vh;position:relative;display:flex;justify-content:space-around;align-items:flex-end;
    background:linear-gradient(transparent 0 94%,#2c6a3c 94%),radial-gradient(ellipse at 50% 100%,rgba(62,138,82,.35),transparent 70%);border-radius:16px}
  .tree::before{content:"";position:absolute;left:50%;bottom:6%;width:44px;margin-left:-22px;height:88%;background:linear-gradient(90deg,#5a3a1a,#7a5230,#5a3a1a);border-radius:12px}
  .tree::after{content:"🎄";position:absolute;left:50%;top:-4%;transform:translateX(-50%);font-size:clamp(3rem,7vw,5rem)}
  .climber{position:relative;z-index:1;display:grid;justify-items:center;gap:2px;transition:transform .55s cubic-bezier(.3,.9,.3,1);font-weight:800;font-size:clamp(.7rem,1.2vw,.95rem)}
  .climber .av{width:clamp(30px,4vh,44px);height:clamp(30px,4vh,44px)}
  .mres{display:grid;gap:8px;width:min(100%,720px)}
  .mres .r{display:grid;grid-template-columns:2.2em 44px 1fr auto;gap:12px;align-items:center;background:var(--night-2);border-radius:12px;padding:8px 14px;box-shadow:0 0 0 1px var(--line);font-weight:800;text-align:left}
  .mres .r.top{box-shadow:0 0 0 2px var(--gold),0 0 20px rgba(232,176,75,.35)}
  .mres .r .av{width:40px;height:40px}
  .mres .r .b{color:var(--good)}
  .awards{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;width:min(100%,1000px)}
  .award{background:var(--night-2);border-radius:14px;padding:12px;display:grid;gap:4px;justify-items:center;text-align:center;box-shadow:0 0 0 2px var(--gold);animation:pop .6s both}
  .award .e{font-size:2rem}.award .t{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:800}
  .award .n{font-family:var(--display);font-size:1.3rem}.award .d{font-size:.8rem;color:var(--muted)}
  .vs{display:flex;gap:clamp(14px,4vw,48px);align-items:center;justify-content:center;flex-wrap:wrap}
  .vs .who{display:grid;justify-items:center;gap:6px;font-family:var(--display);font-size:clamp(1.3rem,3vw,2.2rem)}
  .vs .who .av{width:clamp(90px,12vw,150px);height:clamp(90px,12vw,150px);box-shadow:0 0 0 4px var(--gold),0 0 40px rgba(232,176,75,.5)}
  .vs .x{font-family:var(--display);font-size:clamp(2rem,5vw,3.6rem);color:var(--red)}
  </style>`);

  /* ---------------- mini-games ---------------- */
  function before(qi) {
    const k = MINIS[qi]; S.minisDone = S.minisDone || [];
    if (!k || S.minisDone.includes(qi) || S.tb) return false;
    S.mini = { kind: k, stage: "intro", qi, id: Date.now(), results: null };
    S.phase = "mini"; counts = {};
    post({ action: "miniReset" }).catch(() => {});
    stopSong(); sfx("gong"); render();
    brief();
    return true;
  }
  // 📋 spoken "how this works" before the mini-game (briefing.js). Start runs the countdown, so the 10-second clock never starts early.
  const STEPS = {
    race: [
      ["📱", "Keep the game open on your phone. A big <b>TAP!</b> button appears.", "Keep the game open on your phone. A big tap button appears."],
      ["3️⃣", "The TV counts down <b>3, 2, 1</b>, then GO!", "The TV counts down three, two, one, then go!"],
      ["🏃", `Tap as fast as you can for <b>${SECS} seconds</b>. Every tap moves you along the track to the Cornucopia.`, `Tap as fast as you can for ${SECS} seconds. Every tap moves you along the track to the Cornucopia.`],
      ["🏆", `Most taps wins. The top 3 get <b>+${BONUS[0]}</b>, <b>+${BONUS[1]}</b> and <b>+${BONUS[2]}</b> points.`, `Most taps wins. The top 3 get plus ${BONUS[0]}, plus ${BONUS[1]} and plus ${BONUS[2]} points.`],
      ["🤝", "Same number of taps? You share the place and the bonus.", "Same number of taps? You share the place and the bonus."],
    ],
    climb: [
      ["📳", "On your phone, tap <b>Allow shaking</b> now, before we start.", "On your phone, tap Allow shaking now, before we start."],
      ["3️⃣", "The TV counts down <b>3, 2, 1</b>, then GO!", "The TV counts down three, two, one, then go!"],
      ["🌲", `Shake your phone as hard as you can for <b>${SECS} seconds</b>. Every shake climbs you up the tree.`, `Shake your phone as hard as you can for ${SECS} seconds. Every shake climbs you up the tree.`],
      ["👆", "Can't shake? Tap the button on your phone instead. Taps count too.", "Can't shake? Tap the button on your phone instead. Taps count too."],
      ["🏆", `Highest count wins. The top 3 get <b>+${BONUS[0]}</b>, <b>+${BONUS[1]}</b> and <b>+${BONUS[2]}</b> points.`, `Highest count wins. The top 3 get plus ${BONUS[0]}, plus ${BONUS[1]} and plus ${BONUS[2]} points.`],
    ],
  };
  function brief() {
    const m = S.mini; if (!window.Briefing || !m || !STEPS[m.kind]) return false;
    const info = INFO[m.kind], id = m.id;
    Briefing.show({ eyebrow: `${info.icon} MINI-GAME · BONUS POINTS`, title: info.title, steps: STEPS[m.kind],
      intro: `Mini-game time! ${info.title} Here's how it works.`, start: "▶ Start the mini-game", muted: () => !S.sound,
      onStart: () => { if (S.phase === "mini" && S.mini && S.mini.id === id && S.mini.stage === "intro") { ensureAudio(); countdown(); } } });
    return true;
  }
  function countdown() {
    const m = S.mini; m.stage = "count"; m.count = 3; counts = {};
    post({ action: "miniReset" }).catch(() => {});
    clearInterval(cdT);   // timer set before render(): miniView treats "count" with no timer as a reload and would fall back to the intro
    cdT = setInterval(() => { m.count--; if (m.count <= 0) { clearInterval(cdT); go(); return; } sfx("drum"); render(); }, 900);
    render(); sfx("drum");
  }
  function go() {
    const m = S.mini; m.stage = "live"; m.endsAt = Date.now() + SECS * 1000;
    sfx("go"); playSong("lobby"); render();
    clearInterval(pollT);
    pollT = setInterval(async () => { await pollCounts(); draw(); if (Date.now() >= m.endsAt) end(); }, 600);
    (function clock() { if (S.phase !== "mini" || m.stage !== "live") return;
      const el = document.getElementById("mclock"); if (el) el.textContent = Math.max(0, Math.ceil((m.endsAt - Date.now()) / 1000));
      requestAnimationFrame(clock); })();
  }
  async function pollCounts() {
    try { const d = await (await fetch("/api/host?mini=1", { cache: "no-store" })).json();
      counts = Object.fromEntries(Object.entries(d.mini || {}).map(([k, v]) => [k, +v || 0])); } catch (e) {}
  }
  async function end() {
    const m = S.mini; if (m.stage !== "live") return;
    clearInterval(pollT); m.stage = "tally"; stopSong(); sfx("cannon"); render();
    await new Promise(r => setTimeout(r, 1200)); await pollCounts();       // let the last taps arrive
    const all = players().map(p => [p.name, counts[p.name] || 0]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    // ties share a place: same count = same prize (1, 1, 3 …)
    const place = n => 1 + all.filter(([, k]) => k > n).length;
    m.results = all.filter(([, n]) => place(n) <= 3).map(([name, n]) => ({ name, n, bonus: BONUS[place(n) - 1] }));
    m.all = all;
    m.results.forEach(r => { const p = S.players.find(x => x.name === r.name); if (p) { p.score += r.bonus; } });
    if (m.results[0]) stat(m.results[0].name)[m.kind] = m.results[0].n;
    m.stage = "done"; sfx("fanfare"); confetti(220, true); render();
  }
  function finish() { S.minisDone.push(S.mini.qi); S.mini = null; roundCardOrQuestion(); }

  // live: move everyone along the track / up the tree
  function draw() {
    if (S.phase !== "mini" || S.mini?.stage !== "live") return;
    const max = Math.max(30, ...Object.values(counts)) * 1.05;
    document.querySelectorAll("[data-mg]").forEach(el => {
      const n = counts[el.dataset.mg] || 0, f = Math.min(1, n / max);
      if (S.mini.kind === "race") el.style.left = `calc(${f * 100}% - ${f * 60}px)`;
      else el.style.transform = `translateY(-${f * 34}vh)`;
      const b = el.querySelector("b"); if (b) b.textContent = `${el.dataset.mg} · ${n}`;
    });
  }

  function miniView() {
    const m = S.mini, info = INFO[m.kind];
    if (["count", "live", "tally"].includes(m.stage) && !pollT && !cdT) m.stage = "intro"; // reloaded mid-game: start it again
    if (m.stage === "intro") return `<section class="mg"><div class="icon">${info.icon}</div><div class="eyebrow">Mini-game · Bonus points</div><h1>${info.title}</h1>
      <p>${info.how}</p><p>Top 3 win <b style="color:var(--gold)">+500</b>, <b style="color:var(--gold)">+300</b> and <b style="color:var(--gold)">+200</b> points. You have ${SECS} seconds.</p>
      <div class="ctl" style="justify-content:center"><button class="btn" id="mgo">Ready… start! ▶</button></div><div class="tiny">Space: start</div></section>`;
    if (m.stage === "count") return `<section class="mg"><div class="eyebrow">${info.title}</div><div class="big">${m.count}</div><p>Phones ready!</p></section>`;
    if (m.stage === "live" || m.stage === "tally") {
      const ps = players();
      const field = m.kind === "race"
        ? `<div class="track">${ps.map(p => `<div class="lane"><div class="runner" data-mg="${esc(p.name)}">${avatar(p.name)}<b>${esc(p.name)} · 0</b></div></div>`).join("")}
            <div class="goal">${typeof Ambient !== "undefined" ? Ambient.CORNUCOPIA : "🏆"}</div></div>`
        : `<div class="tree">${ps.map(p => `<div class="climber" data-mg="${esc(p.name)}">${avatar(p.name)}<b>${esc(p.name)} · 0</b></div>`).join("")}</div>`;
      return `<section class="mg" style="gap:8px"><div class="eyebrow">${info.title}</div>
        <div class="clock">${m.stage === "tally" ? "💥 Time!" : `⏱ <span id="mclock">${SECS}</span>`}</div>${field}</section>`;
    }
    const place = n => 1 + (m.all || []).filter(([, k]) => k > n).length;
    const rows = (m.all || []).map(([name, n]) => { const pl = n > 0 ? place(n) : 99; return `<div class="r${pl <= 3 ? " top" : ""}"><span class="rk" style="font-family:var(--display);color:var(--gold)">${n > 0 ? pl : "–"}</span>${avatar(name)}
      <span>${esc(name)} <span class="tiny">${n} ${info.verb}</span></span><span class="b">${pl <= 3 ? "+" + BONUS[pl - 1] : ""}</span></div>`; }).join("");
    return `<section class="mg"><div class="icon">🏆</div><h1>${m.results?.[0] ? (() => { const top = m.results.filter(r => r.n === m.results[0].n).map(r => esc(r.name)); return top.length > 1 ? top.join(" & ") + " tie!" : top[0] + " wins!"; })() : "Nobody moved!"}</h1>
      <div class="mres">${rows || "<p>No taps came in. Was everyone asleep?</p>"}</div>
      <div class="ctl" style="justify-content:center"><button class="btn" id="mnext">On to ${esc(roundOf(m.qi).name)} ▶</button></div><div class="tiny">Space: continue</div></section>`;
  }

  /* ---------------- awards ---------------- */
  function stat(name) { S.stats = S.stats || {}; return (S.stats[name] = S.stats[name] || { right: 0, best: 0, times: [], emoji: 0 }); }
  function scored() {   // after each face: who got it, longest streak, how fast
    S.players.forEach(p => {
      if (!p.on || !S.correct.includes(p.name)) return;
      const s = stat(p.name); s.right++; s.best = Math.max(s.best, p.streak);
      const t = S.ansAt?.[p.name]; if (t != null) s.times.push(t);
    });
  }
  function emoji(name) { stat(name).emoji++; }
  function awardsHTML() {
    const st = S.stats || {}, names = Object.keys(st).filter(n => S.players.find(p => p.name === n)?.on);
    const pick = (score, min = 1) => { let best = null, v = -Infinity; names.forEach(n => { const x = score(st[n]); if (x != null && x >= min && x > v) { v = x; best = n; } }); return best ? [best, v] : null; };
    const list = [];
    const sharp = pick(s => s.best, 2); if (sharp) list.push(["🎯", "Sharpshooter", sharp[0], `${sharp[1]} right in a row`]);
    const brain = pick(s => s.right); if (brain) list.push(["🧠", "Knows the Family Best", brain[0], `${brain[1]} faces guessed`]);
    const fast = pick(s => s.times.length >= 3 ? -(s.times.reduce((a, b) => a + b, 0) / s.times.length) : null, -Infinity);
    if (fast) list.push(["⚡", "Fastest Finger", fast[0], `${(-fast[1] / 1000).toFixed(1)}s average`]);
    const run = pick(s => s.race || null); if (run) list.push(["🏃", "Cornucopia Sprinter", run[0], `${run[1]} taps in 10 seconds`]);
    const climb = pick(s => s.climb || null); if (climb) list.push(["🌲", "Tree Climber", climb[0], `${climb[1]} shakes in 10 seconds`]);
    const loud = pick(s => s.emoji, 3); if (loud) list.push(["📣", "Loudest in the Crowd", loud[0], `${loud[1]} emojis sent`]);
    const r = ranked(); if (r.length > 2) list.push(["🌹", "The President's Favorite", r[r.length - 1].name, "last place, but still standing"]);
    if (!list.length) return "";
    return `<div class="eyebrow">🏅 Awards</div><div class="awards">${list.map(([e, t, n, d], i) => `<div class="award" style="animation-delay:${.2 + i * .15}s"><span class="e">${e}</span><span class="t">${t}</span><span class="n">${esc(n)}</span><span class="d">${d}</span></div>`).join("")}</div>`;
  }

  /* ---------------- tie-breaker showdown ---------------- */
  function tie() {  // called when the last face is scored; true if a showdown takes over
    const r = ranked(), top = r[0]?.score ?? 0, tied = r.filter(p => p.score === top && top > 0 && p.name !== HOST).map(p => p.name); // the host knows every face, so she shares a tie instead
    if (tied.length < 2) return false;
    startShowdown(tied, false); return true;
  }
  function startShowdown(names, again) {
    S.tb = names;
    const qi = Math.random() * Q.length | 0;            // one more face, picked at random
    S.rounds.push({ qi, choices: [], tb: true }); S.qi = S.rounds.length - 1;
    S.tbAgain = again; S.phase = "tbcard"; stopSong(); sfx("gong"); render();
    // 📋 spoken "how the showdown works" (briefing.js), the first time only; Start begins the showdown face
    if (window.Briefing && !again) Briefing.show({ eyebrow: "⚔️ TIE AT THE TOP", title: "Showdown!",
      steps: [
        ["⚔️", `It's a tie between <b>${names.map(esc).join(" and ")}</b>.`, `It's a tie between ${names.join(" and ")}.`],
        ["📱", "One more face. Only the tied tributes answer, on their phones.", "One more face. Only the tied tributes answer, on their phones."],
        ["⚡", "The <b>fastest right answer</b> wins <b>+1,000</b> and the Games.", "The fastest right answer wins plus 1,000 and the Games."],
        ["🔁", "Nobody gets it right? Another face, until someone does.", "Nobody gets it right? Another face, until someone does."],
        ["📣", "Everyone else: eyes on the TV and cheer for your favorite!", "Everyone else, eyes on the TV and cheer for your favorite!"],
      ],
      intro: "It's a tie at the top. Time for a showdown! Here's how it works.", start: "▶ Begin the showdown", muted: () => !S.sound,
      onStart: () => { if (S.phase === "tbcard") { ensureAudio(); beginQuestion(); } } });
  }
  function tbView() {
    return `<section class="mg"><div class="eyebrow">${S.tbAgain ? "Nobody got it. Again!" : "It's a tie at the top"}</div><h1>⚔️ Showdown!</h1>
      <div class="vs">${S.tb.map((n, i) => `${i ? '<span class="x">vs</span>' : ""}<div class="who">${avatar(n)}${esc(n)}</div>`).join("")}</div>
      <p>One more face. Only these tributes answer, on their phones. The <b style="color:var(--gold)">fastest right answer</b> wins the Games.</p>
      <div class="ctl" style="justify-content:center"><button class="btn" id="tbgo">Begin the showdown ▶</button></div><div class="tiny">Space: begin</div></section>`;
  }
  function scoreTiebreak() {
    const right = S.correct.filter(n => S.tb.includes(n)).sort((a, b) => (S.ansAt?.[a] ?? 9e9) - (S.ansAt?.[b] ?? 9e9));
    S.players.forEach(p => { p.delta = 0; p.move = 0; });
    if (!right.length) return startShowdown(S.tb, true);
    const w = S.players.find(p => p.name === right[0]); w.delta = 1000; w.score += 1000;
    S.tbWinner = w.name; S.tb = null;
    S.phase = "final"; stopSong(); sfx("fanfare"); confetti(260, true); playWinner(); render();
  }

  /* ---------------- hooks ---------------- */
  function view() { return S.phase === "mini" ? miniView() : tbView(); }
  function primary() {
    if (S.phase === "tbcard") return beginQuestion();
    const m = S.mini; if (!m) return;
    if (m.stage === "intro") return brief() || countdown();   // the briefing's Start runs the countdown
    if (m.stage === "done") return finish();
  }
  function after() {
    const b = id => document.getElementById(id);
    if (b("mgo")) b("mgo").onclick = () => { ensureAudio(); primary(); };
    if (b("mnext")) b("mnext").onclick = () => { ensureAudio(); primary(); };
    if (b("tbgo")) b("tbgo").onclick = () => { ensureAudio(); primary(); };
    if (S.phase === "mini" && S.mini?.stage === "live") draw();
  }
  function reset() { clearInterval(pollT); clearInterval(cdT); pollT = cdT = 0; S.mini = null; S.minisDone = []; S.stats = {}; S.tb = null; S.tbWinner = null; S.ansAt = {}; }
  return { before, view, after, primary, scored, tie, scoreTiebreak, emoji, awardsHTML, reset };
})();
