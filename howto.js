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
    if (kind === "tribute") return {
      goal: ["🎯", "Name the mystery face", "before time runs out."],
      sections: [
        ["How to play", [["📸", "Watch the TV", "A face starts super zoomed in, then slowly zooms out."],
          ["⌨️", "Type who it is", "Right here on your phone. Only you see it."],
          ["⏱️", "30 seconds", "Then 💥 the cannon fires and answers lock."]]],
        ["Points", [["✅", "Right answer", "1,000 points"],
          ["🔥", "Streak", "More points for answers in a row"],
          ["🍗", "The Feast", "The last round is worth ×3"]]],
        ["Bonuses", [["🏃", "Mini-games", "Between rounds. Top 3 get bonus points."],
          ...(g.host ? [["🔮", `${g.host} is the Gamemaker`, "She predicts how many of you get each face right."]] : []),
          ["🎉", "Emojis", "Tap them to send them up the TV."]]],
      ],
      end: "Highest score wins!",
    };
    if (kind === "secrets") return {
      goal: ["🎯", "Guess whose secret it is", "Every secret is true, and from someone in this room."],
      sections: [
        ["How to play", [["🔏", "Read the secret", "It appears on the TV."],
          ["⌨️", "Type a name", "Your guess is sealed. Nobody sees it."]]],
        ["Points", [["✅", "Right guess", "1,000 points"],
          ["⚡", "Be quick", "Faster guesses get a speed bonus."],
          ["🔥", "Streak", "More points for guesses in a row"],
          ["💰", "Last secret", "Counts ×2"]]],
        ["If it's YOUR secret", [["🤫", "Keep a straight face", "Type a decoy name instead."],
          ["🎭", "Fool people", "+150 for everyone who guesses wrong"]]],
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
          ["⏱️", "30 seconds", "Then Survey says…!"]]],
        ["Points", [["✅", "Called it", "+1 point"],
          ["⚡", "Fast", "Lock in within 10 seconds: +1 more"],
          ["🔥", "3 in a row", "You're on fire: +1 more each time"],
          ["🏆", "You're the #1 answer", "Your votes count for you too!"]]],
        ["Bonuses", [["⚔️", "Ties", "Go to a secret face-off vote on your phone."],
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
      ${c.sections.map(([h, rows]) => `<h2>${esc(h)}</h2><ul>${rows.map(row).join("")}</ul>`).join("")}
      <div class="ht-end">${esc(c.end)}</div></div>
      <div class="ht-bar"><button type="button" class="ht-ok">Got it! ✅</button></div>`;
    root.querySelector(".ht-ok").onclick = () => { folded = true; try { navigator.vibrate && navigator.vibrate(20); } catch (e) {} draw(kind, g); };
  }

  /* called with the latest game state after every poll */
  function sync(g) {
    const kind = g && g.howto;
    if (!kind) { if (root) { root.remove(); root = null; key = ""; folded = false; } return; }
    const k = kind + ":" + (g.gid || "") + ":" + JSON.stringify(g.opts && g.opts.bets || 0);
    if (root && k === key) return;
    if (!document.getElementById("howto-css")) { const st = document.createElement("style"); st.id = "howto-css"; st.textContent = CSS; document.head.appendChild(st); }
    if (!root) { root = document.createElement("div"); root.id = "howto"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "How to play"); document.body.appendChild(root); folded = false; }
    key = k; draw(kind, g);
  }
  return { sync };
})();
