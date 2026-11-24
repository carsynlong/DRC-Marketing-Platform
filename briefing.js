/* ================= BRIEFINGS (shared by the show and all three games) =================
   A "here's how this works" screen before a special round:
   title + steps read out loud one at a time (each step lights up as it's read),
   🔁 Read the steps again, ▶ Start (or Space / Enter). Nothing starts until Start is pressed.

   Briefing.show({
     eyebrow: "⚡ LIGHTNING ROUND",            // small label on top (optional)
     title: "Welcome to the Lightning Round", // big title
     steps: [["⚡", "Three secrets, <b>10 seconds</b> each", "Three secrets, ten seconds each."], ...],
                                              // [icon, text shown (HTML ok), text spoken (optional, defaults to the shown text without tags)]
     intro: "Welcome to the Lightning Round. Here's how it works.",   // spoken first (optional)
     outro: "When everyone's ready, the Game maker will start.",       // spoken last (optional)
     start: "▶ Start the round",              // Start button label (optional)
     muted: () => false,                       // return true to skip speaking (optional)
     onStart: () => { ... },                   // runs when Start is pressed
   });
   Briefing.open() tells you if one is showing. Briefing.close() closes it without starting. */
(() => {
  if (window.Briefing) return;
  const css = document.createElement("style");
  css.textContent = `
  .brf{position:fixed;inset:0;z-index:2147482000;display:grid;place-items:safe center;overflow-y:auto;padding:28px 18px;
    background:radial-gradient(ellipse at 50% 30%,rgba(40,34,20,.97),rgba(8,8,10,.98));color:#f4ecd8;font-family:Outfit,system-ui,sans-serif;text-align:center;animation:brfIn .35s both}
  @keyframes brfIn{from{opacity:0}}
  .brf .in{display:grid;gap:12px;justify-items:center;width:min(1200px,100%)}
  .brf .eb{letter-spacing:.22em;font-weight:800;font-size:clamp(.8rem,1.2vw,1rem);color:#e8c46a;background:rgba(0,0,0,.4);padding:.35em 1em;border-radius:999px}
  .brf h1{margin:0;font-family:Rye,Cinzel,Georgia,serif;font-weight:400;color:#f3d27a;font-size:clamp(1.9rem,4.2vw,3.4rem);line-height:1.05;text-shadow:0 4px 0 rgba(0,0,0,.5)}
  .brf .steps{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;text-align:left}
  .brf .steps.one{grid-template-columns:1fr;max-width:820px}
  .brf .st{display:grid;grid-template-columns:2.1em 1fr;gap:10px;align-items:center;background:rgba(255,255,255,.06);border-radius:12px;padding:9px 14px;
    font-size:clamp(1rem,1.45vw,1.25rem);line-height:1.3;opacity:.62;transition:.3s}
  .brf .st .i{font-size:1.45em;text-align:center}
  .brf .st.on{opacity:1;background:rgba(232,196,106,.14);box-shadow:0 0 0 2px #e8c46a;transform:scale(1.015)}
  .brf .st.done{opacity:.9}
  .brf .row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;align-items:center;margin-top:4px}
  .brf button{font:800 clamp(1rem,1.4vw,1.2rem) Outfit,system-ui,sans-serif;border:0;border-radius:999px;padding:.7em 1.5em;cursor:pointer}
  .brf .go{background:#b8322a;color:#fff;box-shadow:0 5px 0 #6e1712}
  .brf .again{background:transparent;color:#f4ecd8;box-shadow:inset 0 0 0 2px rgba(244,236,216,.5)}
  .brf .hint{font-size:.85rem;opacity:.6}
  @media (max-width:820px){.brf .steps{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
  const strip = h => String(h).replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const pickVoice = () => { try { const v = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
    return v.find(v => /Daniel|Google UK English Male|Arthur|Oliver/i.test(v.name)) || v.find(v => /en-GB/i.test(v.lang)) || v.find(v => /Samantha|Google US English|Alex/i.test(v.name)) || v[0] || null; } catch (e) { return null; } };
  let cur = null, run = 0;
  function speak(o, ov) {
    const my = ++run, rows = [...ov.querySelectorAll(".st")];
    const mark = i => rows.forEach((r, k) => { r.classList.toggle("on", k === i); r.classList.toggle("done", k < i); });
    try { speechSynthesis.cancel(); } catch (e) {}
    if ((o.muted && o.muted()) || !window.speechSynthesis) { mark(rows.length); return; }
    const voice = pickVoice();
    const lines = [[o.intro || (o.title + ". Here's how it works."), -1], ...o.steps.map((s, i) => [s[2] || strip(s[1]), i]), [o.outro || "When everyone's ready, the Game maker will start.", rows.length]];
    lines.forEach(([t, i]) => { const u = new SpeechSynthesisUtterance(t); if (voice) u.voice = voice; u.rate = 1; u.pitch = .95;
      u.onstart = () => { if (my === run && cur && cur.ov === ov) mark(i); }; speechSynthesis.speak(u); });
  }
  function close(start) {
    if (!cur) return; const c = cur; cur = null; run++;
    try { speechSynthesis.cancel(); } catch (e) {}
    document.removeEventListener("keydown", c.key, true); c.ov.remove();
    if (start && c.o.onStart) setTimeout(() => c.o.onStart(), 50);
  }
  function show(o) {
    if (cur) close(false);
    const ov = document.createElement("div"); ov.className = "brf";
    ov.innerHTML = `<div class="in">${o.eyebrow ? `<div class="eb">${o.eyebrow}</div>` : ""}<h1>${o.title}</h1>
      <div class="steps ${o.steps.length <= 3 ? "one" : ""}">${o.steps.map(s => `<div class="st"><span class="i">${s[0]}</span><span>${s[1]}</span></div>`).join("")}</div>
      <div class="row"><button class="again">🔁 Read the steps again</button><button class="go">${o.start || "▶ Start"}</button><span class="hint">Space: start</span></div></div>`;
    document.body.appendChild(ov);
    // the game behind doesn't get keys while the briefing is up
    const key = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); close(true); }
      else if (["ArrowRight", "ArrowLeft", "PageDown", "PageUp"].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); } };
    document.addEventListener("keydown", key, true);
    ov.addEventListener("click", e => e.stopPropagation());
    ov.querySelector(".go").onclick = e => { e.stopPropagation(); close(true); };
    ov.querySelector(".again").onclick = e => { e.stopPropagation(); speak(o, ov); };
    cur = { ov, o, key };
    setTimeout(() => { if (cur && cur.ov === ov) speak(o, ov); }, 450);
    return ov;
  }
  window.Briefing = { show, close: () => close(false), open: () => !!cur };
})();
