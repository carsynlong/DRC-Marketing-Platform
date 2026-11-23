/* ================= WALL OF FIRE countdown (Who's That Tribute TV) =================
   - A big timer and a burning fuse along the top of the photo, the whole time a face is up.
   - Last 10 seconds: the arena's wall of fire closes in. Flames and embers rise from the bottom,
     the screen glows hotter red every second, the photo frame turns red and throbs, and a heartbeat thumps.
   - Last 3 seconds: a giant number slams onto the photo with a drum hit.
   index.html calls FireTimer.update(left, frac) from tick() and FireTimer.stop() when answers lock. */
const FireTimer = (() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.head.insertAdjacentHTML("beforeend", `<style>
  .timer{width:clamp(96px,9vw,130px)!important;height:clamp(96px,9vw,130px)!important}
  .timer .n{font-family:var(--display);font-size:clamp(2.4rem,3.6vw,3.4rem)!important;color:var(--ink);text-shadow:0 3px 0 rgba(0,0,0,.4)}
  .timer.fire .n{color:#ffd36b;animation:ft-beat .5s ease-out}
  .timer.fire{filter:drop-shadow(0 0 18px rgba(255,90,20,.85))}
  @keyframes ft-beat{0%{transform:scale(1.55)}100%{transform:scale(1)}}
  /* burning fuse along the top of the photo */
  .ft-fuse{position:absolute;left:14px;right:14px;top:10px;height:8px;z-index:3;pointer-events:none}
  .ft-fuse i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:repeating-linear-gradient(90deg,#c9a46b 0 10px,#8a6a3a 10px 14px);box-shadow:0 0 0 2px rgba(0,0,0,.35)}
  .ft-fuse b{position:absolute;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;
    background:radial-gradient(circle,#fff 0 18%,#ffd36b 30%,#ff7a1a 55%,rgba(255,60,0,0) 72%);animation:ft-spark .12s infinite alternate}
  @keyframes ft-spark{from{transform:scale(.8) rotate(0)}to{transform:scale(1.25) rotate(40deg)}}
  /* the wall of fire */
  #ft-wall{position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;transition:opacity .4s}
  #ft-wall.on{opacity:1}
  #ft-wall .glow{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 120%,rgba(255,80,0,calc(.35 + var(--heat)*.45)),transparent calc(45% + var(--heat)*30%)),
    radial-gradient(ellipse at 50% 50%,transparent calc(70% - var(--heat)*25%),rgba(200,20,10,calc(.25 + var(--heat)*.4)) 100%);animation:ft-flicker .18s infinite alternate}
  @keyframes ft-flicker{from{opacity:.85}to{opacity:1}}
  #ft-wall .flames{position:absolute;left:0;right:0;bottom:0;height:calc(10vh + var(--heat)*22vh);display:flex;align-items:flex-end;justify-content:space-around;
    filter:blur(1px) drop-shadow(0 -6px 18px rgba(255,90,0,.7))}
  #ft-wall .flames span{display:block;width:6vw;height:100%;border-radius:50% 50% 20% 20%/80% 80% 20% 20%;
    background:linear-gradient(0deg,#ff3d00,#ff8a00 45%,#ffd36b 75%,rgba(255,240,180,0));transform-origin:50% 100%;animation:ft-lick .5s ease-in-out infinite alternate}
  @keyframes ft-lick{from{transform:scaleY(.75) skewX(-6deg)}to{transform:scaleY(1.08) skewX(6deg)}}
  .stage.ft-hot{box-shadow:0 0 0 4px #ff7a1a,0 0 0 9px #b8322a,0 0 40px rgba(255,80,0,.75)!important;animation:ft-throb .5s ease-in-out infinite alternate}
  @keyframes ft-throb{to{box-shadow:0 0 0 5px #ffd36b,0 0 0 11px #ff3d00,0 0 70px rgba(255,80,0,.95)}}
  .ft-slam{position:absolute;inset:0;display:grid;place-items:center;z-index:5;pointer-events:none;font-family:var(--display);font-size:min(34vh,22vw);
    color:#fff3d0;-webkit-text-stroke:4px #b8322a;text-shadow:0 0 40px rgba(255,90,0,.9),0 8px 0 #6e1712;animation:ft-slam .85s cubic-bezier(.2,1.4,.4,1) forwards}
  @keyframes ft-slam{0%{transform:scale(2.6);opacity:0}25%{transform:scale(1);opacity:.95}80%{opacity:.85}100%{transform:scale(.85);opacity:0}}
  .ft-ember{position:fixed;bottom:-10px;width:6px;height:6px;border-radius:50%;background:#ffb347;box-shadow:0 0 10px 3px #ff6a00;z-index:4;pointer-events:none}
  @media (prefers-reduced-motion:reduce){#ft-wall .flames span,#ft-wall .glow,.stage.ft-hot,.ft-fuse b{animation:none!important}}
  </style>`);

  let wall = null, last = null, emberT = 0;
  function ensureWall() {
    if (wall) return wall;
    wall = document.createElement("div"); wall.id = "ft-wall"; wall.setAttribute("aria-hidden", "true");
    wall.innerHTML = `<div class="glow"></div><div class="flames">${Array.from({ length: 14 }, (_, i) => `<span style="animation-delay:${(i * .13) % .5}s;height:${70 + (i * 37) % 30}%"></span>`).join("")}</div>`;
    document.body.appendChild(wall); return wall;
  }
  function fuse(frac) {
    const st = document.querySelector(".stage"); if (!st) return;
    let f = st.querySelector(".ft-fuse");
    if (!f) { f = document.createElement("div"); f.className = "ft-fuse"; f.innerHTML = "<i></i><b></b>"; st.appendChild(f); }
    const pct = Math.max(0, Math.min(1, frac)) * 100;
    f.querySelector("i").style.width = pct + "%"; f.querySelector("b").style.left = pct + "%";
  }
  function heartbeat(left) {
    try { if (!S.sound || !ensureAudio()) return; const t = AC.currentTime + .01, v = left <= 3 ? 1.1 : .8;
      [0, .17].forEach((d, k) => osc("sine", k ? 55 : 62, t + d, .22, (k ? .35 : .5) * v, sfxBus));
      if (left <= 3) { INST.kick(t, 0, 0, 1.3); noise(t, .25, .3, sfxBus, "bandpass", 1500, .7); } } catch (e) {}
  }
  function embers(on) {
    clearInterval(emberT); if (!on || calm) return;
    emberT = setInterval(() => {
      const e = document.createElement("div"); e.className = "ft-ember"; e.style.left = Math.random() * 100 + "vw"; document.body.appendChild(e);
      e.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: `translate(${(Math.random() - .5) * 120}px,-${50 + Math.random() * 40}vh)`, opacity: 0 }],
        { duration: 1800 + Math.random() * 1400, easing: "ease-out" }).onfinish = () => e.remove();
    }, 90);
  }
  function update(left, frac) {
    fuse(frac);
    if (left === last) return; last = left;
    const tm = document.querySelector(".timer"), st = document.querySelector(".stage");
    if (left <= 10 && left > 0) {
      const w = ensureWall(); w.classList.add("on"); w.style.setProperty("--heat", ((10 - left) / 9).toFixed(2));
      tm && tm.classList.add("fire"); if (tm) { const n = tm.querySelector(".n"); n.style.animation = "none"; void n.offsetWidth; n.style.animation = ""; }
      st && st.classList.add("ft-hot");
      heartbeat(left); if (left === 10) embers(true);
      if (left <= 3 && st && !calm) { const s = document.createElement("div"); s.className = "ft-slam"; s.textContent = left; st.appendChild(s); setTimeout(() => s.remove(), 900); }
    } else if (left > 10) { off(); }
  }
  function off() {
    last = null; embers(false);
    if (wall) wall.classList.remove("on");
    document.querySelector(".timer")?.classList.remove("fire");
    document.querySelector(".stage")?.classList.remove("ft-hot");
  }
  function stop() { off(); document.querySelectorAll(".ft-fuse,.ft-slam").forEach(e => e.remove()); }
  return { update, stop };
})();
