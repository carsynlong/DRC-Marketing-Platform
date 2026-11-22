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
  let lastPushed = "", pushing = false, polling = false, lastPoll = 0, lastSave = 0, pollKey = "", firstPoll = true;

  const post = body => fetch("/api/host", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const hasPhone = n => phones.includes(n);

  /* ---- what phones see. Never the photos, and never the right answer before the reveal. ---- */
  function snapshot() {
    const r = S.rounds[S.qi], inGame = S.phase !== "lobby" && !!r;
    const g = { gid: S.gid || 0, phase: S.phase, qi: S.qi, total: Q.length, mode: S.mode, names: NAMES,
      playing: active().map(p => p.name), locked: !(S.phase === "question" && !S.locked), double: DOUBLE.has(S.qi) };
    if (inGame && (S.phase === "question" || S.phase === "reveal")) g.choices = r.choices;
    if (inGame && ["reveal", "board", "final"].includes(S.phase)) { g.answer = Q[r.qi].a; g.correct = S.correct; }
    if (inGame) {
      let rank = 0, prev = null;
      g.scores = ranked().map((p, i) => { if (p.score !== prev) { rank = i + 1; prev = p.score }
        return { name: p.name, score: p.score, delta: p.delta, streak: p.streak, rank }; });
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
    return 0;
  }
  async function poll() {
    if (polling) return;
    polling = true; lastPoll = Date.now();
    const qi = S.phase === "lobby" ? null : S.qi;
    try {
      const d = await (await fetch(`/api/host${qi == null ? "" : `?qi=${qi}`}`, { cache: "no-store" })).json();
      const before = phones.join("|"), had = phones;
      phones = d.players.sort();
      // Someone who just picked their name on a phone wants to play: switch them on.
      // (The host can still tap them to sit out. Skipped on the TV's first look after loading.)
      if (S.phase === "lobby" && !firstPoll) S.players.forEach(p => { if (phones.includes(p.name) && !had.includes(p.name)) p.on = true; });
      firstPoll = false;
      if (d.qi != null && d.qi === S.qi) { answers = d.answers; answersQi = d.qi; }
      if (S.phase === "lobby" && before !== phones.join("|")) render();
      if (S.phase === "question") showCount();
      if (S.phase === "reveal") lateAnswers();
    } catch (e) { /* try again next time */ }
    polling = false;
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
  const phonePlayers = () => active().filter(p => hasPhone(p.name));
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
      if (!p || !p.on || v == null) return;
      if (S.mode === "type") {
        S.typed[n] = v;
        if (counted && n !== a && matches(v, a) && !S.correct.includes(n)) { S.correct.push(n); changed = true; }
      } else if (v === a && n !== a && !S.correct.includes(n)) { S.correct.push(n); changed = true; }
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
      return `<div class="p${on ? " in" : ""}${on && fresh.includes(p.name) ? " new" : ""}"><img src="${AV(p.name)}" alt="">${esc(p.name)}<small>${on ? "✓ signed in" : "waiting…"}</small></div>`; }).join("")}</div>
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

  /* ---- new game: wipe last game's answers ---- */
  function reset() {
    S.gid = Date.now(); answers = {}; answersQi = -1; counted = null;
    post({ action: "reset", total: Q.length }).catch(() => {});
  }

  /* ---- keep a copy so a TV reload doesn't lose the game ---- */
  function saved() {
    try {
      const g = JSON.parse(localStorage.getItem(SAVE)) || {};
      // A game saved before faces were added or removed would replay the old list: start fresh instead.
      if (g.rounds?.length && g.rounds.length !== Q.length) return {};
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

  return { hasPhone, countText, whoIn, roster, phoneMark, fillAnswers, joinCard, reset, saved };
})();
