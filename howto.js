/* "How to play" on the phones. While the TV shows its How to play screen, it publishes game.howto
   ("tribute" | "secrets" | "feud"), and this pops up an easy-to-scan card list on every phone:
   one idea per line, a big emoji, a bold word or two, a short line under it, grouped into
   Goal → How → Points → Bonuses. Nothing is read aloud on the phone. "Got it!" folds it away.

   Each phone page calls HowTo.sync(D.game) after every poll. That's the only hook. */
window.HowTo = (() => {
  const THEMES = {
    tribute: { font: '"Rye", Georgia, serif', ink: "#fbf6ea", accent: "#e8b04b", accent2: "#b8322a", bg1: "#16302a", bg2: "#0d1f18", btnInk: "#2a1c05", name: "Who's That Tribute" },
    secrets: { font: '"Cinzel Decorative", "Cinzel", Georgia, serif', ink: "#f4ecdb", accent: "#d9b25f", accent2: "#a3182b", bg1: "#251a36", bg2: "#0b0a14", btnInk: "#2b1d12", name: "District Secrets" },
    feud: { font: '"Bungee", Impact, sans-serif', ink: "#ffffff", accent: "#ffc92e", accent2: "#e3232c", bg1: "#1846c4", bg2: "#060b26", btnInk: "#3a2000", name: "District Feud" },
  };

  /* the cards: [emoji, bold bit, short line] */
  function content(kind, g) {
    if (kind === "tribute" && g.speed) return {   // 🎡 Second Chance speed round
      goal: ["⚡", "Speed round!", "5 seconds to look, 20 to type."],
      sections: [
        ["How to play", [["👀", "5 seconds to look", "Then you have 20 seconds to type who it is."],
          ["⌨️", "Type fast", "The face ends as soon as everyone has answered."]]],
        ["Points", [["🥇", "Fastest right answer", "1,000 points"], ["🥈", "2nd fastest", "700 points"], ["🥉", "3rd fastest", "500 points"],
          ["✅", "Every other right answer", "300 points"], ["❌", "Wrong or no answer", "0 points"]]],
      ],
      end: "Speed round! 5 seconds to look, 20 to type. Fastest right answer: 1,000. Then 700, 500, and 300.",
    };
    if (kind === "tribute") return {
      goal: ["🎯", "Name the mystery face", "before time runs out."],
      sections: [
        ["How to play", [["📸", "Watch the TV", "A face starts super zoomed in, then slowly zooms out."],
          ["⌨️", "Type who it is", "Right here on your phone. Only you see it."],
          ["👀", "10 seconds to look", "Then you have a minute to type. 💥 The cannon fires and answers lock."], ["⚠️", "Don't run out of time", "No answer in time = −250 points."]]],
        ["Points", [["✅", "Right answer", "1,000 points"],
          ["⚡", "Speed bonus", "Faster right answers earn more"],
          ["🔥", "Streak", "More points for answers in a row"],
          ["🍗", "The Feast", "The last round is worth ×3"]]],
        ["Bonuses", [["🏃", "Mini-games", "Between rounds. Top 3 get bonus points."],
          ...(g.host ? [["🔮", `${g.host} is the Gamemaker`, "She predicts how many of you get each face right."]] : []),
          ["🎉", "Emojis", "Tap them to send them up the TV."]]],
      ],
      end: "Highest score wins!",
    };
    if (kind === "secrets") return {
      goal: ["🎯", "Guess whose secret it is", g.opts && g.opts.decoys ? "Secrets come from people in this room, but watch out for fakes!" : "Every secret is true, and from someone in this room."],
      sections: [
        ["How to play", [["🔏", "Read the secret", "It appears on the TV."],
          ["⌨️", "Type a name", "Your guess is sealed. Nobody sees it."]]],
        ["Points", [["✅", "Right guess", "1,000 points"],
          ["⚡", "Be quick", "Faster guesses get a speed bonus."],
          ["🔥", "Streak", "More points for guesses in a row"],
          ["💰", "Last secret", "Counts ×2"]]],
        ["If it's YOUR secret", [["🤫", "Keep a straight face", "Type a decoy name instead."],
          ["🎭", "Fool people", "+150 for everyone who guesses wrong"]]],
        ["Twists", (o => [o.decoys && ["🃏", "Fakes", "Some secrets are made up. Call them out!"],
          o.frame && ["🎯", "Frame someone", "Your secret? Frame a person. If the room accuses them most: +400"],
          o.interro && ["🔦", "Interrogation Room", "Change your vote. Switch to the right person: +250"],
          o.fifth && ["🤐", "Plead the Fifth", "In the hot seat, once per game. Costs 100."],
          o.story && ["🎤", "Story time", "Tell the story behind your secret: +300"],
          o.mole && ["🐀", "The mole", "One of you secretly pushes a wrong name. Trust no one!"]].filter(Boolean))(g.opts || {})],
        ["Bonuses", [...(g.opts && g.opts.bets ? [["🎲", "Sponsor bets", "Bet on your guess. Win big or lose points!"]] : []),
          ["🎉", "Emojis", "Tap them to send them up the TV."]]],
      ],
      end: "Highest score wins!",
    };
    return {
      goal: ["🎯", "Guess the #1 answer", "Who did the family pick most for each question?"],
      sections: [
        ["How to play", [["📋", "Read the question", "It appears on the TV."],
          ["👆", "Tap a face", "Right here on your phone."],
          ["⏱️", `${(g.kind !== "faceoff" && +g.secs) || 45} seconds`, "Then Survey says…!"],
          ["⚠️", "Don't run out of time", "No guess in time = −1 point."]]],
        ["Points", [["✅", "Called it", "+1 point"],
          ["⚡", "Fast", "Lock in within 10 seconds: +1 more"],
          ["🔥", "3 in a row", "You're on fire: +1 more each time"],
          ["🏆", "You're the #1 answer", "Your votes count for you too!"]]],
        ["Bonuses", [["👑", "Fan Favorite", "Most cheers during the intros: +1 point"],
          ["⚔️", "Ties", "Go to a secret face-off vote on your phone."],
          ...(g.host && g.hostIn !== false ? [["🎯", `${g.host} plays Stump the Room`, "She knows the answers, so she bets on someone to miss. Call it anyway and you steal +1!"]] : []),
          ["💰", "Last question", "Counts ×2"],
          ["🎉", "Emojis", "Tap them to send them up the TV."]]],
      ],
      end: "🏆 Most points wins the major award!",
    };
  }

  const CSS = `
#howto{position:fixed;inset:0;z-index:2147483000;overflow-y:auto;-webkit-overflow-scrolling:touch;color:var(--ht-ink);
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:radial-gradient(ellipse at 50% 0%,var(--ht-bg1),var(--ht-bg2) 70%);
  padding:max(18px,env(safe-area-inset-top)) 16px calc(28px + env(safe-area-inset-bottom));box-sizing:border-box;animation:ht-in .45s cubic-bezier(.2,1.2,.4,1) both}
#howto *{box-sizing:border-box}
#howto .ht-wrap{max-width:520px;margin:0 auto;display:grid;gap:14px}
#howto .ht-top{text-align:center}
#howto .ht-top small{display:block;text-transform:uppercase;letter-spacing:.18em;font-size:.72rem;font-weight:800;opacity:.75}
#howto h1{margin:2px 0 0;font-family:var(--ht-font);font-weight:400;font-size:clamp(1.9rem,9vw,2.6rem);line-height:1;color:var(--ht-accent);text-shadow:0 3px 0 var(--ht-accent2)}
#howto .ht-goal{display:flex;gap:14px;align-items:center;background:var(--ht-accent);color:var(--ht-btn);border-radius:16px;padding:14px 16px;box-shadow:0 5px 0 color-mix(in srgb,var(--ht-accent) 55%,#000)}
#howto .ht-goal .e{font-size:2.2rem;flex:none}
#howto .ht-goal b{display:block;font-size:1.25rem;line-height:1.15}
#howto .ht-goal span{display:block;font-weight:600;font-size:.95rem;line-height:1.3;margin-top:2px}
#howto h2{margin:6px 0 -4px;font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:var(--ht-accent)}
#howto ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
#howto li{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.07);border-radius:14px;padding:10px 14px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);
  animation:ht-rise .4s cubic-bezier(.2,1.3,.4,1) both;animation-delay:calc(var(--i)*45ms)}
#howto li .e{font-size:1.7rem;width:1.6em;text-align:center;flex:none}
#howto li b{display:block;font-size:1.08rem;line-height:1.2}
#howto li span{display:block;font-size:.92rem;line-height:1.3;opacity:.82}
#howto .ht-end{text-align:center;font-weight:800;font-size:1.1rem;color:var(--ht-accent)}
/* the button sits at the end of the list, after the last card (not floating over the cards) */
#howto .ht-bar{max-width:520px;margin:22px auto 0;padding:0}
#howto .ht-ok{display:block;width:100%;max-width:520px;margin:0 auto;font:inherit;font-weight:800;font-size:1.25rem;min-height:58px;border:0;border-radius:16px;cursor:pointer;
  background:var(--ht-accent);color:var(--ht-btn);box-shadow:0 5px 0 color-mix(in srgb,var(--ht-accent) 55%,#000)}
#howto .ht-ok:active{transform:translateY(3px);box-shadow:0 2px 0 color-mix(in srgb,var(--ht-accent) 55%,#000)}
#howto.done{display:grid;place-items:center;padding-bottom:max(18px,env(safe-area-inset-bottom))}
#howto .ht-done{text-align:center;display:grid;gap:10px;justify-items:center;animation:ht-in .4s both}
#howto .ht-done .e{font-size:4rem}
#howto .ht-done b{font-family:var(--ht-font);font-weight:400;font-size:2rem;color:var(--ht-accent)}
#howto .ht-done button{font:inherit;font-weight:800;color:var(--ht-ink);background:rgba(255,255,255,.08);border:0;border-radius:999px;padding:.6em 1.2em;box-shadow:inset 0 0 0 2px rgba(255,255,255,.3)}
@keyframes ht-in{from{opacity:0;transform:translateY(30px)}}
@keyframes ht-rise{from{opacity:0;transform:translateY(14px)}}
@media (prefers-reduced-motion:reduce){#howto,#howto *{animation:none!important}}`;

  let root = null, key = "", folded = false;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function draw(kind, g) {
    const T = THEMES[kind] || THEMES.feud;
    root.style.cssText = `--ht-font:${T.font};--ht-ink:${T.ink};--ht-accent:${T.accent};--ht-accent2:${T.accent2};--ht-bg1:${T.bg1};--ht-bg2:${T.bg2};--ht-btn:${T.btnInk}`;
    root.classList.toggle("done", folded);
    if (folded) {
      root.innerHTML = `<div class="ht-done"><div class="e">✅</div><b>You're ready!</b><div>Eyes on the TV. The show starts soon.</div>
        <button type="button" class="ht-again">📋 See the rules again</button></div>`;
      root.querySelector(".ht-again").onclick = () => { folded = false; draw(kind, g); };
      return;
    }
    const c = content(kind, g); let i = 0;
    const row = ([e, b, s]) => `<li style="--i:${i++}"><span class="e" aria-hidden="true">${e}</span><div><b>${esc(b)}</b><span>${esc(s)}</span></div></li>`;
    root.innerHTML = `<div class="ht-wrap">
      <div class="ht-top"><small>${esc(T.name)}</small><h1>How to play</h1></div>
      <div class="ht-goal"><span class="e" aria-hidden="true">${c.goal[0]}</span><div><b>${esc(c.goal[1])}</b><span>${esc(c.goal[2])}</span></div></div>
      ${c.sections.filter(([h, rows]) => rows.length).map(([h, rows]) => `<h2>${esc(h)}</h2><ul>${rows.map(row).join("")}</ul>`).join("")}
      <div class="ht-end">${esc(c.end)}</div></div>
      <div class="ht-bar"><button type="button" class="ht-ok">Got it! ✅</button></div>`;
    root.querySelector(".ht-ok").onclick = () => {
      try { navigator.vibrate && navigator.vibrate(20); } catch (e) {}
      if (manual) { manual = false; root.remove(); root = null; key = ""; return; }   // opened from the ❓ button: just close
      folded = true; draw(kind, g); tellReady(kind); };
  }

  // let the TV count this phone as ready (pid / D are the phone page's own globals)
  function tellReady(kind) {
    try {
      const who = typeof D !== "undefined" && D && D.me, id = typeof pid !== "undefined" ? pid : null;
      if (!who || !id) return;
      fetch("/api/ready", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ g: { secrets: "ds", feud: "df" }[kind] || "", pid: id, name: who }) }).catch(() => {});
    } catch (e) {}
  }
  /* ⏰ HURRY: the last 10 seconds, only for people who still haven't answered.
     The TV publishes game.hurry = the moment answers lock (ms); game.slow = who ran out of time (and slowPen). */
  const HCSS = `
#hurrybar{position:fixed;left:0;right:0;top:0;z-index:2147482500;display:flex;align-items:center;justify-content:center;gap:12px;
  padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px;background:linear-gradient(180deg,#ff2d37,#b3121b);color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  box-shadow:0 6px 0 #ffc92e,0 12px 30px rgba(0,0,0,.45);animation:hb-in .35s cubic-bezier(.2,1.5,.4,1) both}
#hurrybar b{font-size:2.6rem;line-height:1;font-weight:900;min-width:1.4em;text-align:center;font-variant-numeric:tabular-nums;animation:hb-pop .4s cubic-bezier(.2,1.8,.4,1) both}
#hurrybar span{font-weight:900;font-size:1.05rem;line-height:1.15;letter-spacing:.02em}
#hurrybar small{display:block;font-weight:700;font-size:.8rem;opacity:.9}
body.hurry-shake #hurrybar{animation:hb-shake .4s cubic-bezier(.36,.07,.19,.97)}
#slowtoast{position:fixed;left:16px;right:16px;top:calc(16px + env(safe-area-inset-top,0px));z-index:2147482600;background:#1b1b1b;color:#fff;font:800 1.15rem/1.3 system-ui,-apple-system,sans-serif;
  border-radius:16px;padding:16px;text-align:center;box-shadow:0 0 0 3px #ff2d37,0 10px 30px rgba(0,0,0,.5);animation:hb-in .4s cubic-bezier(.2,1.5,.4,1) both}
@keyframes hb-in{from{transform:translateY(-120%)}}
@keyframes hb-pop{from{transform:scale(1.8);opacity:0}}
@keyframes hb-shake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
@media (prefers-reduced-motion:reduce){#hurrybar,#hurrybar *,body.hurry-shake{animation:none!important}}`;
  let hb = null, hbTimer = 0, hbEnds = 0, hbLast = null, slowKey = "", hbHost = false, hbSpeed = false, hbSeen = null, hbLocal = 0;
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  function css2() { if (!document.getElementById("hurry-css2")) { const st = document.createElement("style"); st.id = "hurry-css2"; st.textContent = HCSS; document.head.appendChild(st); } }
  function stopHurry() { clearInterval(hbTimer); hbTimer = 0; hbEnds = 0; hbLast = null; if (hb) { hb.remove(); hb = null; } document.body.classList.remove("hurrying", "hurry-shake"); }
  function startHurry(ends) {
    if (hbTimer && hbEnds === ends) return;
    css2(); hbEnds = ends; clearInterval(hbTimer);
    if (!hb) { hb = document.createElement("div"); hb.id = "hurrybar"; hb.setAttribute("role", "alert"); document.body.appendChild(hb); }
    document.body.classList.add("hurrying");
    const tick = () => {
      const sec = Math.ceil((hbEnds - Date.now()) / 1000);
      if (sec <= 0) { stopHurry(); return; }
      if (sec === hbLast) return; hbLast = sec;
      hb.innerHTML = hbHost ? `<b>${sec}</b><span>⏰ HURRY! Make your 🔮 prediction!<small>Pick how many will get it right</small></span>`
        : `<b>${sec}</b><span>⏰ HURRY! Lock in your answer!<small>${hbSpeed ? "⚡ Speed round: faster = more points" : "Too slow = you lose points"}</small></span>`;
      buzz(sec <= 3 ? [180, 60, 180] : 120);
      document.body.classList.remove("hurry-shake"); void document.body.offsetWidth; document.body.classList.add("hurry-shake");
    };
    tick(); hbTimer = setInterval(tick, 150);
  }
  function slowToast(text) {
    css2(); let t = document.getElementById("slowtoast");
    if (!t) { t = document.createElement("div"); t.id = "slowtoast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = text; buzz([300, 80, 300]); clearTimeout(slowToast.t); slowToast.t = setTimeout(() => t.remove(), 4000);
  }
  function hurry(g, o) {
    const me = o.me, ends = g && g.hurry;
    const hostPlays = g && g.hostPlays && g.host === me;   // Who's That Tribute: the Gamemaker hurries too until she predicts
    const exempt = !me || (!hostPlays && ((g && g.tied && g.tied.includes(me)) || (g && g.host && g.host === me) || (g && g.playing && !g.playing.includes(me)) || (g && g.exempt === me)));
    // The TV's deadline is on the TV's clock, which can be set differently from this phone.
    // Turn it into this phone's clock once, when it first shows up: the seconds left the TV sent (if any), else assume about 10 seconds.
    if (ends && ends !== hbSeen) { hbSeen = ends; const skew = ends - Date.now();
      hbLocal = g.left != null ? Date.now() + Math.min(10, g.left) * 1000 : Date.now() + (skew > 0 && skew <= 10500 ? skew : 9000); }
    if (!ends) hbSeen = null;
    hbHost = !!hostPlays; hbSpeed = !!(g && g.speed);
    if (ends && !o.answered && !exempt && Date.now() < hbLocal) startHurry(hbLocal); else stopHurry();
    if (g && me && g.slow && g.slow.includes(me)) {
      const k = `${g.gid}:${g.qi}:${g.kind || ""}:${g.round || ""}`;
      if (k !== slowKey) { slowKey = k; const mine = (g.scores || []).find(s => s.name === me), pen = Array.isArray(g.slowHit) ? (g.slowHit.includes(me) ? g.slowPen : 0) : mine ? Math.min(g.slowPen || Infinity, Math.max(0, -(mine.delta || 0))) : g.slowPen;   // the no-answer part only (not a rose)
        slowToast(`⏰ Too slow! You didn't answer in time${pen ? `: −${pen}` : ""}`); }
    }
  }

  /* called with the latest game state after every poll; o = { me, answered } */
  /* ❓ a small button on every phone to read the rules again at any time */
  let manual = false, lastG = null;
  const pageKind = () => /district-secrets/.test(location.pathname) ? "secrets" : /district-feud/.test(location.pathname) ? "feud" : "tribute";
  function rulesButton(show) {
    if (window.HOWTO_OWN_BUTTON) return;   // District Secrets has its own How to play button (with every twist that's on)
    let b = document.getElementById("rulesbtn");
    if (!show) { if (b) { b.remove(); document.body.style.paddingBottom = ""; } return; }
    if (b) return lift(b);
    b = document.createElement("button"); b.id = "rulesbtn"; b.type = "button"; b.textContent = "❓"; b.setAttribute("aria-label", "How to play");
    b.style.cssText = "position:fixed;left:max(10px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));z-index:2147482400;width:40px;height:40px;border-radius:50%;border:0;" +
      "background:rgba(0,0,0,.55);color:#fff;font-size:20px;box-shadow:0 0 0 2px rgba(255,255,255,.35);cursor:pointer;padding:0";
    b.onclick = () => {
      if (root) return;
      if (!document.getElementById("howto-css")) { const st = document.createElement("style"); st.id = "howto-css"; st.textContent = CSS; document.head.appendChild(st); }
      manual = true; folded = false; root = document.createElement("div"); root.id = "howto"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "How to play");
      document.body.appendChild(root); key = "manual"; draw((lastG && lastG.howto) || pageKind(), lastG || {});
    };
    document.body.appendChild(b); lift(b);
  }
  // tuck into the label row of anything pinned to the bottom of the screen (like Feud's emoji bar)
  function lift(b) {
    try {
      b.style.visibility = "hidden";
      let el = document.elementFromPoint(24, innerHeight - 6), up = 0;
      while (el && el !== document.body) { const cs = getComputedStyle(el); if (cs.position === "fixed" || cs.position === "sticky") { up = Math.max(0, innerHeight - el.getBoundingClientRect().top); break; } el = el.parentElement; }
      // in a bar pinned to the bottom (Feud's emoji bar): tuck into its label row, smaller so it never covers an emoji
      b.style.bottom = up ? `${up - 29}px` : "max(10px,env(safe-area-inset-bottom))";
      b.style.width = b.style.height = up ? "26px" : "40px"; b.style.fontSize = up ? "13px" : "20px";
      if (b.dataset.pb == null) b.dataset.pb = getComputedStyle(document.body).paddingBottom || "0px";
      if (!up) document.body.style.paddingBottom = `calc(${b.dataset.pb} + 56px)`;   // room to scroll the last item clear of the ❓
    } catch (e) {} finally { b.style.visibility = ""; }
  }
  function sync(g, o) {
    lastG = g || lastG; rulesButton(!!(o && o.me && g));
    hurry(g, o || {});
    const kind = g && g.howto;
    if (!kind) { if (root && !manual) { root.remove(); root = null; key = ""; folded = false; } return; }
    if (manual) { manual = false; if (root) { root.remove(); root = null; key = ""; } }   // the real How to play takes over
    const k = kind + ":" + (g.gid || "") + ":" + JSON.stringify(g.opts && g.opts.bets || 0);
    // already tapped Got it: keep reminding the TV every few seconds (the TV clears the list each time the rules start)
    if (root && folded && Date.now() - (sync.sent || 0) > 4000) { sync.sent = Date.now(); tellReady(kind); }
    if (root && k === key) return;
    if (!document.getElementById("howto-css")) { const st = document.createElement("style"); st.id = "howto-css"; st.textContent = CSS; document.head.appendChild(st); }
    if (!root) { root = document.createElement("div"); root.id = "howto"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "How to play"); document.body.appendChild(root); folded = false; }
    key = k; draw(kind, g);
  }
  return { sync };
})();
