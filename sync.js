/* ================= PHONE SYNC (TV side) =================
   index.html runs the game exactly as before. This file:
   - publishes what phones need to see (phase, face, the 4 choices, scores) whenever it changes
   - asks the server for phone answers every second while a face is open
   - fills those answers in at the reveal (the host can still tap chips to fix a call)
   - keeps a copy of the game in this browser so reloading the TV doesn't lose the scores
   It only reads the game's globals (S, Q, NAMES, cur, active, ranked, render...) when called. */
const Sync = (() => {
  const SAVE = "tribute-host-game";
  let phones = [];        // names claimed by a phone
  let answers = {};       // phone answers for the current face: name -> answer
  let answersQi = -1;     // which face `answers` belongs to
  let counted = null;     // names whose phone answer was already applied at the reveal
  let skew = null, lastPushed = "", pushing = false, polling = false, lastPoll = 0, lastSave = 0, pollKey = "", firstPoll = true;

  const post = body => fetch("/api/host", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const hasPhone = n => phones.includes(n);

  /* ---- what phones see. Never the photos, and never the right answer before the reveal. ---- */
  function snapshot() {
    const r = S.rounds[S.qi], inGame = S.phase !== "lobby" && !!r;
    const g = { gid: S.gid || 0, phase: S.phase, qi: S.qi, total: Q.length, mode: S.mode, names: NAMES, host: HOST, hostPlays: true,
      twist: (S.phase === "ready" || S.phase === "question") && typeof Extras !== "undefined" ? Extras.twist() || undefined : undefined,
      hint: S.phase === "question" && !S.locked && typeof Extras !== "undefined" ? Extras.hint() || undefined : undefined,
      spy: typeof Extras !== "undefined" ? Extras.spy() : undefined, hostPick: S.phase === "reveal" || S.phase === "board" ? S.hostPick || null : undefined,
      playing: (/^(question|reveal|tbcard)$/.test(S.phase) ? answering() : active()).map(p => p.name), locked: !(S.phase === "question" && !S.locked), double: DOUBLE.has(S.qi),
      tb: !!S.tb, mini: S.phase === "mini" && S.mini ? { kind: S.mini.kind, stage: S.mini.stage, id: S.mini.id, count: S.mini.count,
        results: S.mini.results, all: S.mini.all } : undefined,
      left: S.phase === "question" && !S.locked ? Math.max(0, Math.ceil(S.secs - S.elapsed)) : undefined,   // phones show the countdown
      feast: S.qi >= FEAST && !S.tb, secs: S.secs, round: (({ num, name }) => ({ num, name }))(roundOf(S.qi)),
      howto: window.Rules && Rules.active() ? "tribute" : undefined,
      hurry: S.phase === "question" && !S.locked && S.hurryEnds ? S.hurryEnds : undefined,        // ⏰ last 10 seconds: phones hurry (howto.js)
      slow: ["reveal", "board", "final"].includes(S.phase) && S.slow && S.slow.length ? S.slow : undefined, slowPen: SLOW_PEN };   // How to play is on the TV: phones show it too (howto.js)
    if (inGame && (S.phase === "question" || S.phase === "reveal")) g.choices = r.choices;
    if (inGame && ["reveal", "board", "final"].includes(S.phase)) { g.answer = Q[r.qi].a; g.correct = S.correct; }
    if (inGame) {
      let rank = 0, prev = null;
      g.scores = ranked().map((p, i) => { const v = typeof rs === "function" ? rs(p) : p.score; if (v !== prev) { rank = i + 1; prev = v }
        return { name: p.name, score: p.score, delta: p.delta, streak: p.streak, rank, speed: p.speed || 0, notes: p.notes && p.notes.length ? p.notes : undefined }; });
    }
    return JSON.stringify(g);
  }
  async function push() {
    const snap = snapshot();
    if (snap === lastPushed || pushing) return;
    pushing = true;
    try { const r = await post({ action: "publish", game: JSON.parse(snap) }); if (r.ok) lastPushed = snap; }
    catch (e) { /* offline for a moment: try again on the next beat */ }
    pushing = false;
  }

  /* ---- reading phones and answers ---- */
  function pollEvery() {
    if (S.phase === "question" && !S.locked) return 1000;   // answers coming in
    if (S.phase === "lobby") return 2000;                   // people picking names
    return 1500;                                            // otherwise: just checking for emoji reactions
  }
  async function poll() {
    if (polling) return;
    polling = true; lastPoll = Date.now();
    const qi = S.phase === "lobby" ? null : S.qi;
    try {
      const sent = Date.now();
      const d = await (await fetch(`/api/host?react=1${qi == null ? "" : `&qi=${qi}`}`, { cache: "no-store" })).json();
      // server clock minus this TV's clock (measured at the middle of the request)
      if (d.now) skew = d.now - (sent + Date.now()) / 2;
      if (d.react) floatReacts(d.react);
      const before = phones.join("|"), had = phones;
      phones = d.players.sort();
      // Someone who just picked their name on a phone wants to play: switch them on.
      // (The host can still tap them to sit out. Skipped on the TV's first look after loading.)
      if (S.phase === "lobby" && !firstPoll) S.players.forEach(p => { if (phones.includes(p.name) && !had.includes(p.name)) p.on = true; });
      firstPoll = false;
      if (d.qi != null && d.qi === S.qi) {
        if (S.phase === "question" || S.phase === "reveal") { S.ansAt = S.ansAt || {};
          for (const n in d.answers) { const t = d.times && Number(d.times[n]);
            if (t && S.qStart && skew != null) S.ansAt[n] = Math.max(0, t - skew - S.qStart);        // exact arrival time (server)
            else if (S.ansAt[n] == null && S.qStart && S.phase === "question") S.ansAt[n] = Date.now() - S.qStart; } }
        answers = d.answers; answersQi = d.qi;
      }
      if (S.phase === "lobby" && before !== phones.join("|")) render();
      if (S.phase === "question") showCount();
      if (S.phase === "reveal") lateAnswers();
    } catch (e) { /* try again next time */ }
    polling = false;
  }
  // one brand-new look at the answers (waits out a look that's already running), so buzzer answers count before scoring
  async function fresh() {
    const until = Date.now() + 2500;
    while (polling && Date.now() < until) await new Promise(r => setTimeout(r, 50));
    await Promise.race([poll(), new Promise(r => setTimeout(r, Math.max(0, until - Date.now())))]);
  }
  // Poll right away whenever the face or its lock changes (e.g. the cannon fires, or the reveal).
  function maybePoll() {
    if (document.hidden) return;
    const key = `${S.phase}:${S.qi}:${S.locked}`;
    const every = pollEvery();
    if (key !== pollKey) { pollKey = key; if (every || S.phase === "question" || S.phase === "reveal") return poll(); }
    if (every && Date.now() - lastPoll >= every) poll();
  }

  /* ---- answer counts on the TV ---- */
  const phonePlayers = () => answering().filter(p => hasPhone(p.name));
  const current = () => (answersQi === S.qi ? answers : {});
  function countText() {
    const ph = phonePlayers();
    if (!ph.length) return "";
    return `${ph.filter(p => current()[p.name] != null).length} of ${ph.length} answered`;
  }
  function showCount() {
    const el = document.getElementById("answered");
    if (el) el.textContent = countText();
    document.querySelectorAll("[data-ph]").forEach(m => m.textContent = phoneMark(m.dataset.ph, true));
    document.querySelectorAll("[data-in]").forEach(c => {
      const on = current()[c.dataset.in] != null;
      if (on !== c.classList.contains("in")) { c.classList.toggle("in", on); c.textContent = (on ? "✓ " : "") + c.dataset.in; }
    });
  }
  // Phone players' names; each turns gold the moment they lock in.
  function whoIn() {
    const ph = phonePlayers();
    if (!ph.length) return "";
    return `<div class="whoin" aria-label="Who has answered">${ph.map(p => { const on = current()[p.name] != null;
      return `<span data-in="${esc(p.name)}" class="${on ? "in" : ""}">${on ? "✓ " : ""}${esc(p.name)}</span>`; }).join("")}</div>`;
  }
  function phoneMark(name, inner) {
    if (!hasPhone(name)) return "";
    const t = current()[name] != null ? "📱✓" : "📱";
    return inner ? t : `<span class="mark" data-ph="${esc(name)}">${t}</span>`;
  }

  /* ---- reveal: phone answers fill in who was right ---- */
  function apply(names) {
    const a = cur().a, got = current();
    let changed = false;
    names.forEach(n => {
      const p = S.players.find(p => p.name === n), v = got[n];
      if (!p || !answering().includes(p) || v == null) return;
      if (S.mode === "type") {
        S.typed[n] = v;
        if (counted && matches(v, a) && !S.correct.includes(n)) { S.correct.push(n); changed = true; }
      } else if (v === a && !S.correct.includes(n)) { S.correct.push(n); changed = true; }
    });
    return changed;
  }
  // Called at the start of reveal(). In type mode, reveal() then runs matches() over S.typed.
  function fillAnswers() {
    counted = null;
    apply(Object.keys(current()));
    counted = new Set(Object.keys(current()));
  }
  // An answer that reached the server just before the lock but after our last poll.
  function lateAnswers() {
    if (!counted) return;
    const fresh = Object.keys(current()).filter(n => !counted.has(n));
    fresh.forEach(n => counted.add(n));
    if (fresh.length) { apply(fresh); render(); }
  }

  /* ---- emoji reactions from phones: a little burst floats up the TV with the sender's name ---- */
  // The server keeps a short log of recent bursts ({ id, name, e }); show every one newer than the last we showed.
  let reactSeen = null;
  function floatReacts(log) {
    const items = (log || []).map(x => { try { return typeof x === "string" ? JSON.parse(x) : x; } catch (e) { return null; } }).filter(x => x && x.id);
    const top = items.reduce((m, x) => Math.max(m, x.id), 0);
    if (reactSeen === null) { reactSeen = top; return; }   // first look after loading: don't replay old ones
    if (top < reactSeen) reactSeen = 0;                    // a new game wiped the log
    const fresh = items.filter(x => x.id > reactSeen).sort((a, b) => a.id - b.id).slice(-10);
    reactSeen = Math.max(reactSeen, top);
    fresh.forEach((x, i) => { try { Party.emoji(x.name); } catch (e) {} setTimeout(() => burst(x.name, x.e), i * 260); });
  }
  function burst(who, e) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const x = 8 + Math.random() * 84, box = document.createElement("div");
    box.style.cssText = `position:fixed;left:${x}vw;bottom:-80px;z-index:2147483005;pointer-events:none;width:0;height:0`;
    for (let k = 0; k < 6; k++) {
      const s = document.createElement("span"); s.textContent = e;
      const size = 1.4 + Math.random() * 1.6, dx = (Math.random() - .5) * 140, rise = 55 + Math.random() * 30;
      s.style.cssText = `position:absolute;left:0;bottom:0;font-size:${size}rem;filter:drop-shadow(0 3px 6px rgba(0,0,0,.5))`;
      s.animate([{ transform: "translate(0,0) scale(.4)", opacity: 0 }, { transform: `translate(${dx * .3}px,-12vh) scale(1.1)`, opacity: 1, offset: .2 },
        { transform: `translate(${dx}px,-${rise}vh) rotate(${dx / 4}deg) scale(1)`, opacity: 0 }], { duration: 2600 + Math.random() * 900, delay: k * 90, easing: "cubic-bezier(.3,.7,.4,1)", fill: "both" });
      box.appendChild(s);
    }
    const tag = document.createElement("div"); tag.textContent = `${e} ${who}`;
    tag.style.cssText = "position:absolute;left:0;bottom:0;transform:translateX(-50%);white-space:nowrap;background:#e8b04b;color:#2a1c05;font:800 clamp(.9rem,1.6vw,1.25rem) Outfit,system-ui,sans-serif;padding:.3em .8em;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.45)";
    tag.animate([{ transform: "translate(-50%,0) scale(.6)", opacity: 0 }, { transform: "translate(-50%,-16vh) scale(1)", opacity: 1, offset: .25 }, { transform: "translate(-50%,-38vh)", opacity: 0 }],
      { duration: 3000, easing: "ease-out", fill: "both" });
    box.appendChild(tag); document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
  }

  /* ---- lobby: who has signed in on a phone, so the host knows when to start ---- */
  let shownIn = [], shownCount = -1;
  function roster() {
    const ps = active();
    if (!ps.length) return "";
    const waiting = ps.filter(p => !hasPhone(p.name)).map(p => p.name);
    const fresh = phones.filter(n => !shownIn.includes(n)); shownIn = phones.slice();
    const status = !waiting.length ? `<div class="status all">🎉 Everyone's in! Start the Games</div>`
      : waiting.length <= 4 ? `<div class="status">Waiting on ${waiting.map(esc).join(", ")}</div>` : "";
    const n = ps.length - waiting.length, bump = n !== shownCount; shownCount = n;
    const count = `<div class="count" aria-label="${n} of ${ps.length} players signed in"><span class="n${bump ? " bump" : ""}">${n}</span><span class="of">/ ${ps.length}</span><span class="lbl">players signed in</span></div>`;
    return `<div class="roster">${count}${status}<div class="ppl">${ps.map(p => { const on = hasPhone(p.name);
      return `<div class="p${on ? " in" : ""}${on && fresh.includes(p.name) ? " new" : ""}"><img src="${AV(p.name)}" alt="">${esc(p.name)}<small>${on ? `✓ signed in${typeof Ambient !== "undefined" ? ` · ⭐ ${Ambient.training(p.name)}` : ""}` : "waiting…"}</small></div>`; }).join("")}</div>
      <div class="tiny">No phone? They can still play by shouting answers to the host.</div></div>`;
  }

  /* ---- lobby: QR code + link ---- */
  const joinUrl = () => `${location.origin}/play`;
  function joinCard() {
    let qr = "";
    try { const q = qrcode(0, "M"); q.addData(joinUrl()); q.make(); qr = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch (e) {}
    const n = phones.length;
    return `<div class="join">
      <div class="qr" aria-label="QR code for ${esc(joinUrl())}">${qr}</div>
      <div class="join-t"><div class="eyebrow">Join on your phone</div>
        <div class="join-url">${esc(joinUrl().replace(/^https?:\/\//, ""))}</div>
        <div class="tiny">Scan the code or type the link, then tap your name.</div>
        <div class="tiny">${n ? `📱 ${n} phone${n > 1 ? "s" : ""} connected` : "No phones connected yet"}
          ${n ? ` · <button class="linkbtn" id="clearphones">Clear phone names</button>` : ""}</div></div></div>`;
  }
  document.addEventListener("click", async e => {
    if (!e.target.closest("#clearphones")) return;
    if (!confirm("Clear every phone's name? Everyone will need to tap their name again.")) return;
    try { await post({ action: "clearPlayers" }); } catch (err) {}
    phones = []; render();
  });

  /* ---- someone taps a colored bar on the TV: point them to their phone ---- */
  document.addEventListener("click", e => {
    if (!e.target.closest(".ans") || S.phase !== "question") return;
    let t = document.getElementById("tvhint");
    if (!t) { t = document.createElement("div"); t.id = "tvhint"; document.body.appendChild(t);
      t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9;background:#b8322a;color:#fff;font-weight:800;padding:14px 22px;border-radius:16px;box-shadow:0 0 0 3px #e8b04b,0 10px 30px rgba(0,0,0,.5);text-align:center;max-width:min(92vw,560px)"; }
    t.innerHTML = `📱 This is the TV screen. Answer on your phone at<br><span style="color:#ffd36b">${esc(joinUrl().replace(/^https?:\/\//, ""))}</span>`;
    t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 4000);
  });

  /* ---- host menu: a faint ⚙ in the corner, easy to miss on purpose ---- */
  (function hostMenu() {
    const b = document.createElement("button");
    b.textContent = "⚙"; b.title = "Host menu"; b.setAttribute("aria-label", "Host menu");
    b.style.cssText = "position:fixed;left:6px;top:6px;z-index:40;width:26px;height:26px;border-radius:50%;border:0;background:transparent;color:#fbf6ea;opacity:.18;font-size:15px;cursor:pointer;padding:0;transition:opacity .2s";
    b.onmouseenter = () => b.style.opacity = ".9"; b.onmouseleave = () => b.style.opacity = ".18";
    const m = document.createElement("div"); m.hidden = true;
    m.style.cssText = "position:fixed;left:8px;top:38px;z-index:41;background:#16302a;border-radius:12px;padding:8px;display:grid;gap:6px;box-shadow:0 0 0 2px #e8b04b,0 10px 30px rgba(0,0,0,.5);font:600 14px Outfit,system-ui,sans-serif";
    const item = (label, fn) => { const x = document.createElement("button"); x.textContent = label;
      x.style.cssText = "background:transparent;color:#fbf6ea;border:0;text-align:left;padding:8px 12px;border-radius:8px;cursor:pointer;font:inherit";
      x.onmouseenter = () => x.style.background = "rgba(255,255,255,.08)"; x.onmouseleave = () => x.style.background = "transparent";
      x.onclick = () => { m.hidden = true; fn(); }; m.appendChild(x); };
    item("↺ Restart from the beginning", restart);
    item("⏭ Skip to the winner (test)", skipToEnd);
    item("📱 Clear phone names", async () => { if (!confirm("Clear every phone's name? Everyone will need to tap their name again.")) return;
      try { await post({ action: "clearPlayers" }); } catch (e) {} phones = []; render(); });
    item("✕ Close", () => {});
    b.onclick = e => { e.stopPropagation(); m.hidden = !m.hidden; };
    document.addEventListener("click", e => { if (!m.contains(e.target) && e.target !== b) m.hidden = true; });
    const add = () => { document.body.appendChild(b); document.body.appendChild(m); };
    document.body ? add() : addEventListener("DOMContentLoaded", add);
  })();
  // Host test: jump straight to the winner screen (to check the winner song)
  function skipToEnd() {
    try { clearInterval(readyT); } catch (e) {}
    try { cancelAnimationFrame(raf); } catch (e) {}
    try { window.Walkout && Walkout.cancel && Walkout.cancel(); } catch (e) {}
    try { window.Rules && Rules.active() ? Rules.go(true) : document.getElementById("rules")?.remove(); } catch (e) {}
    try { ensureAudio(); } catch (e) {}
    if (!S.rounds || !S.rounds.length || S.phase === "lobby") { newGame(); try { clearInterval(readyT); } catch (e) {} }
    S.minisDone = [12, 24]; S.tb = null;
    S.qi = S.rounds.length - 1; S.locked = true; S.phase = "reveal"; S.correct = []; S.typed = Object.fromEntries(S.players.map(p => [p.name, "skip"]));   // everyone counts as answered: no "too slow" penalty
    score();
  }
  // Back to the lobby with a clean slate. Phones keep their names and follow along.
  function restart(ask = true) {
    if (ask && !confirm("Restart from the beginning? This ends the current game and clears the scores.")) return;
    try { clearInterval(readyT); } catch (e) {}
    try { stopSong(); } catch (e) {}
    try { window.Walkout && Walkout.cancel && Walkout.cancel(); } catch (e) {}
    try { window.Rules && Rules.active() ? Rules.go(true) : document.getElementById("rules")?.remove(); } catch (e) {}
    try { FireTimer.stop(); } catch (e) {}
    try { Party.reset(); } catch (e) {}   // stops a mini-game that's mid-race
    try { cancelAnimationFrame(raf); } catch (e) {}
    S.players.forEach(p => { p.score = 0; p.streak = 0; p.delta = 0; p.move = 0; });
    try { Extras.reset(); } catch (e) {}
    Object.assign(S, { phase: "lobby", qi: 0, rounds: [], locked: false, correct: [], typed: {}, elapsed: 0, fallen: [] });
    reset(); render();
  }

  /* ---- new game: wipe last game's answers ---- */
  function reset() {
    S.gid = Date.now(); answers = {}; answersQi = -1; counted = null; reactSeen = null;
    post({ action: "reset", total: Q.length + 20 }).catch(() => {});
  }

  /* ---- keep a copy so a TV reload doesn't lose the game ---- */
  function saved() {
    try {
      const g = JSON.parse(localStorage.getItem(SAVE)) || {};
      // A game saved before faces were added or removed would replay the old list: start fresh instead.
      if (g.rounds?.length && g.rounds.filter(r => !r.tb).length !== Q.length) return {};
      if (g.phase) g.mode = "type"; // the game is typed-only now
      return g;
    } catch (e) { return {}; }
  }
  function save() { try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {} }

  setInterval(() => {
    if (!S) return;
    push();
    maybePoll();
    if (Date.now() - lastSave > 1000) { lastSave = Date.now(); save(); }
  }, 250);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S) { pollKey = ""; maybePoll(); } });

  // the host's 🔮 prediction for this face (a number), if she made one
  function hostPick() { const v = current()[HOST]; const m = /^🔮(\d+)$/.exec(v || ""); return m ? +m[1] : null; }
  return { fresh, hostPick, restart, hasPhone, countText, whoIn, roster, phoneMark, fillAnswers, joinCard, reset, saved };
})();
