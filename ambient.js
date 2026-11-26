/* ================= THE ARENA: things floating across while people wait =================
   Used by the TV (index.html, via tv-fx.js) and the phones (play.html). All original art.
   Ambient.set(mode, opts)  mode: "off" | "edges" (keep clear of the middle) | "full"
                            opts.tap: true lets people tap things (phones)
                            opts.sound(kind): play a sound effect (phones pass PFX.sfx) */
const Ambient = (() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ART = {
    chute: `<svg viewBox="0 0 120 150"><path d="M8 52C8 20 32 4 60 4s52 16 52 48c-9-7-17-7-26 0-9-7-17-7-26 0-9-7-17-7-26 0-9-7-17-7-26 0z" fill="#dfe6ee" stroke="#9aa7b4" stroke-width="2"/>
      <path d="M8 52 52 112M34 52 56 112M60 52v60M86 52 64 112M112 52 68 112" stroke="#c9d2dc" stroke-width="1.5"/>
      <rect x="44" y="108" width="32" height="30" rx="3" fill="#b8322a"/><rect x="57" y="108" width="6" height="30" fill="#e8b04b"/><rect x="44" y="119" width="32" height="6" fill="#e8b04b"/></svg>`,
    rose: `<svg viewBox="0 0 80 140"><path d="M40 52c-2 30 4 56 0 84" stroke="#2c6a3c" stroke-width="4" fill="none"/>
      <path d="M40 92c-14-12-30-8-34 2 12 4 22 6 34-2zM41 76c14-10 28-6 32 3-11 4-20 5-32-3z" fill="#3e8a52"/>
      <path d="M34 104l-6-4M46 70l6-3" stroke="#2c6a3c" stroke-width="2"/>
      <path d="M40 58c-16 0-26-12-24-28 2-12 12-20 24-20s22 8 24 20c2 16-8 28-24 28z" fill="#b5121b"/>
      <path d="M40 54c-10-2-16-10-14-20 6 6 14 6 18 0 2 8-1 16-4 20zM40 54c8-2 14-8 14-16-4 4-10 4-14 2" fill="#e0233a"/>
      <path d="M30 26c4-8 16-10 22-2-6-2-12 0-14 6-2-4-5-5-8-4z" fill="#ff4b5c"/><path d="M38 22c2 6 10 8 12 4" stroke="#7d0c12" stroke-width="1.5" fill="none"/></svg>`,
    wasp: `<svg viewBox="0 0 90 60"><ellipse cx="30" cy="18" rx="16" ry="10" fill="rgba(220,240,255,.75)" stroke="#9ab" stroke-width="1"><animate attributeName="ry" values="10;3;10" dur=".08s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="48" cy="16" rx="14" ry="9" fill="rgba(220,240,255,.7)" stroke="#9ab" stroke-width="1"><animate attributeName="ry" values="9;2;9" dur=".08s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="42" cy="36" rx="24" ry="12" fill="#f2b705"/><path d="M30 26v20M40 24v24M50 25v22" stroke="#1d1a10" stroke-width="5"/>
      <circle cx="68" cy="34" r="9" fill="#1d1a10"/><circle cx="71" cy="31" r="2.5" fill="#ff3b30"/><path d="M18 38 4 42l14 2z" fill="#1d1a10"/></svg>`,
    berries: `<svg viewBox="0 0 70 60"><path d="M34 6c-6 10-16 16-22 20M36 6c4 10 14 16 22 18M35 6v16" stroke="#3d2a1a" stroke-width="2" fill="none"/>
      <path d="M36 6c8-6 20-4 24 2-8 2-16 2-24-2z" fill="#3e8a52"/>
      <circle cx="14" cy="34" r="9" fill="#2a1240"/><circle cx="34" cy="30" r="10" fill="#3a1a5a"/><circle cx="56" cy="34" r="9" fill="#2a1240"/><circle cx="24" cy="48" r="8" fill="#341650"/><circle cx="46" cy="48" r="8" fill="#2a1240"/>
      <circle cx="31" cy="26" r="2.5" fill="#b9a3d9"/><circle cx="11" cy="31" r="2" fill="#b9a3d9"/><circle cx="53" cy="31" r="2" fill="#b9a3d9"/></svg>`,
    // ---- District Secrets theme ----
    envelope: `<svg viewBox="0 0 80 56"><rect x="2" y="4" width="76" height="48" rx="4" fill="#efe2c4" stroke="#8a6a26" stroke-width="2"/><path d="M2 8l38 26L78 8" fill="none" stroke="#8a6a26" stroke-width="2"/>
      <circle cx="40" cy="32" r="9" fill="#a3182b" stroke="#5e0a17" stroke-width="1.5"/><path d="M36 32h8M40 28v8" stroke="#f6dfa0" stroke-width="1.6"/></svg>`,
    seal: `<svg viewBox="0 0 60 60"><path d="M30 3c5 0 7 4 11 5s9-1 11 3-1 8 1 12 6 6 4 11-7 5-9 9-1 9-6 11-8-2-12-2-7 4-12 2-3-7-6-11-8-4-9-9 3-7 4-11-2-9 2-12 8 0 11-3 6-5 11-5z" fill="#a3182b" stroke="#5e0a17" stroke-width="1.5"/>
      <circle cx="30" cy="30" r="15" fill="none" stroke="#5e0a17" stroke-width="2"/><path d="M30 19l3.2 6.6 7.3.8-5.4 5 1.5 7.2-6.6-3.6-6.6 3.6 1.5-7.2-5.4-5 7.3-.8z" fill="#d8393f" stroke="#5e0a17" stroke-width="1"/></svg>`,
    key: `<svg viewBox="0 0 90 40"><circle cx="18" cy="20" r="14" fill="none" stroke="#d9b25f" stroke-width="6"/><circle cx="18" cy="20" r="5" fill="#d9b25f"/>
      <path d="M32 20h52M70 20v10M80 20v8M60 20v6" stroke="#d9b25f" stroke-width="6" stroke-linecap="round"/><path d="M8 12c4-6 14-6 18 0" stroke="#f6dfa0" stroke-width="2" fill="none"/></svg>`,
    quill: `<svg viewBox="0 0 40 120"><path d="M20 118l2-30" stroke="#8a6a26" stroke-width="3" stroke-linecap="round"/>
      <path d="M22 88C6 70 4 36 26 4c4 30 4 60-4 84z" fill="#f4ecdb" stroke="#ab9fbe" stroke-width="1.5"/><path d="M22 86c2-26 3-52 4-80" stroke="#ab9fbe" stroke-width="1.2" fill="none"/>
      <path d="M12 60l9-4M10 44l12-6M13 28l10-6" stroke="#cfc3df" stroke-width="1.2"/></svg>`,
    magnifier: `<svg viewBox="0 0 80 80"><circle cx="32" cy="32" r="22" fill="rgba(200,230,255,.25)" stroke="#d9b25f" stroke-width="7"/>
      <path d="M48 48l24 24" stroke="#6b3d1a" stroke-width="10" stroke-linecap="round"/><path d="M20 24c2-6 8-10 14-10" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/></svg>`,
    lock: `<svg viewBox="0 0 60 70"><path d="M16 30V20a14 14 0 0 1 28 0v10" fill="none" stroke="#c9b385" stroke-width="6"/><rect x="6" y="28" width="48" height="38" rx="6" fill="#d9b25f" stroke="#8a6a26" stroke-width="2"/>
      <circle cx="30" cy="44" r="5" fill="#2b1d12"/><path d="M30 46v10" stroke="#2b1d12" stroke-width="4" stroke-linecap="round"/></svg>`,
    scroll: `<svg viewBox="0 0 90 60"><rect x="12" y="8" width="66" height="44" fill="#efe2c4" stroke="#8a6a26" stroke-width="1.5"/>
      <rect x="4" y="4" width="12" height="52" rx="6" fill="#c9b385" stroke="#8a6a26" stroke-width="1.5"/><rect x="74" y="4" width="12" height="52" rx="6" fill="#c9b385" stroke="#8a6a26" stroke-width="1.5"/>
      <path d="M22 20h44M22 28h40M22 36h44" stroke="#8a6a26" stroke-width="2" opacity=".6"/><text x="45" y="49" text-anchor="middle" font-family="Georgia,serif" font-size="9" font-weight="700" fill="#a3182b">CLASSIFIED</text></svg>`,
    question: `<svg viewBox="0 0 50 70"><text x="25" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="64" font-weight="900" fill="#d9b25f" stroke="#8a6a26" stroke-width="1.5">?</text></svg>`,
    // a gold Capitol coin (original design: laurel wreath and a star)
    coin: `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#e8b04b" stroke="#9a6c1c" stroke-width="3"/><circle cx="30" cy="30" r="21" fill="none" stroke="#9a6c1c" stroke-width="1.5"/>
      <path d="M18 40c-6-8-6-18 0-24M42 40c6-8 6-18 0-24" stroke="#9a6c1c" stroke-width="2" fill="none"/>
      <path d="M17 22l-4 1M16 28l-4 0M17 34l-4 2M43 22l4 1M44 28l4 0M43 34l4 2" stroke="#9a6c1c" stroke-width="2"/>
      <path d="M30 17l3.5 7.5 8 .8-6 5.4 1.8 7.9L30 34.6 22.7 38.6l1.8-7.9-6-5.4 8-.8z" fill="#fff1c1" stroke="#9a6c1c" stroke-width="1"/>
      <ellipse cx="22" cy="14" rx="8" ry="3" fill="#fff8de" opacity=".6" transform="rotate(-25 22 14)"/></svg>`,
    bread: `<svg viewBox="0 0 90 56"><path d="M8 40C4 22 22 8 45 8s41 14 37 32c-2 8-10 12-37 12S10 48 8 40z" fill="#c97a2b" stroke="#7a4410" stroke-width="2"/>
      <path d="M14 36C12 24 26 14 45 14s33 10 31 22" fill="#e09a45"/>
      <path d="M26 16c4 6 4 14 0 20M40 12c4 7 4 16 0 24M54 13c4 7 4 15 0 23M66 18c3 5 3 11 0 16" stroke="#f6d49a" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M58 40c4-2 10-2 14 2" stroke="#3a1d06" stroke-width="3" stroke-linecap="round" opacity=".6"/></svg>`,
    arrow: `<svg viewBox="0 0 160 20"><path d="M4 10h134" stroke="#e8b04b" stroke-width="3"/><path d="M158 10l-24-8v16z" fill="#d9dde3" stroke="#8b939c" stroke-width="1"/>
      <path d="M4 10 18 2h12L18 10l12 8H18z" fill="#b8322a"/></svg>`,
    sugar: `<svg viewBox="0 0 50 50"><path d="M10 18l16-8 16 8v18l-16 8-16-8z" fill="#fbf8f2" stroke="#cfc8b8" stroke-width="1.5"/><path d="M10 18l16 8 16-8M26 26v18" stroke="#d9d2c2" stroke-width="1.5" fill="none"/>
      <circle cx="18" cy="24" r="1.2" fill="#e5ddc9"/><circle cx="33" cy="30" r="1.2" fill="#e5ddc9"/><circle cx="22" cy="34" r="1" fill="#e5ddc9"/><circle cx="30" cy="17" r="1" fill="#e5ddc9"/></svg>`,
    flame: `<svg viewBox="0 0 50 70"><path d="M25 4c6 14 20 20 20 38 0 14-9 24-20 24S5 56 5 42c0-10 6-16 10-22 2 8 6 10 8 10-2-10 0-18 2-26z" fill="#ff6a00">
      <animate attributeName="d" dur=".5s" repeatCount="indefinite" values="M25 4c6 14 20 20 20 38 0 14-9 24-20 24S5 56 5 42c0-10 6-16 10-22 2 8 6 10 8 10-2-10 0-18 2-26z;M25 8c8 12 19 20 19 34 0 14-8 24-19 24S6 56 6 42c0-10 7-14 11-20 1 8 4 10 6 10-1-10 1-18 2-24z;M25 4c6 14 20 20 20 38 0 14-9 24-20 24S5 56 5 42c0-10 6-16 10-22 2 8 6 10 8 10-2-10 0-18 2-26z"/></path>
      <path d="M25 30c4 8 10 12 10 20 0 8-5 12-10 12s-10-4-10-12c0-6 4-8 6-12 1 4 3 5 4 5-1-5 0-9 0-13z" fill="#ffd23f"/></svg>`,
  };
  const GIFTS = ["hot cocoa ☕", "a warm loaf of bread 🍞", "a candy cane 🍬", "burn cream 🧴", "fuzzy socks 🧦", "a sleeping bag 🛌",
    "a Christmas cookie 🍪", "a box of matches 🔥", "a water bottle 💧", "an ugly sweater 🧶", "a bow and arrows 🏹", "a gingerbread man 🍪",
    "mittens 🧤", "a snow globe 🔮", "a lump of coal 🪨 (ouch)", "a rope 🪢", "a map of the arena 🗺️", "a major award 🏆"];

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:5;overflow:hidden";
  const style = document.createElement("style");
  style.textContent = `.amb{position:absolute;left:0;top:0;will-change:transform;user-select:none;-webkit-user-select:none}
    .amb svg,.amb img{width:100%;height:auto;display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,.45))}
    .amb.tap{pointer-events:auto;cursor:pointer;touch-action:manipulation}
    .amb-pop{position:absolute;transform:translate(-50%,-50%);background:#fbf6ea;color:#2a1c05;font:800 15px/1.25 Outfit,system-ui,sans-serif;padding:10px 14px;border-radius:14px;
      box-shadow:0 0 0 3px #e8b04b,0 10px 24px rgba(0,0,0,.5);text-align:center;max-width:220px;pointer-events:none;animation:ambpop 2.6s ease-out both}
    .amb-pop small{display:block;font-weight:600;font-size:11px;color:#7a5a20;letter-spacing:.08em;text-transform:uppercase}
    @keyframes ambpop{0%{opacity:0;transform:translate(-50%,-30%) scale(.5)}12%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}20%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-120%)}}
    .amb-ember{position:absolute;width:5px;height:5px;border-radius:50%;background:#ffb347;box-shadow:0 0 8px 2px #ff6a00}`;
  document.head.appendChild(style);
  const attach = () => document.body.appendChild(layer);
  document.body ? attach() : addEventListener("DOMContentLoaded", attach);

  let mode = "off", opts = {}, timer = 0;
  const live = () => layer.querySelectorAll(".amb").length;
  const R = (a, b) => a + Math.random() * (b - a);
  const W = () => innerWidth, H = () => innerHeight;

  function sprite(html, size, tappable) {
    const el = document.createElement("div"); el.className = "amb" + (tappable ? " tap" : ""); el.style.width = size + "px"; el.innerHTML = html;
    layer.appendChild(el); return el;
  }
  // x for things that fall: anywhere, or only near the sides
  const fallX = size => mode === "edges" ? (Math.random() < .5 ? R(0, W() * .09) : R(W() * .91 - size, W() - size)) : R(0, W() - size);
  // y for things that cross: anywhere, or only near the top and bottom
  const crossY = size => mode === "edges" ? (Math.random() < .6 ? R(H() * .01, H() * .1) : R(H() * .88, H() * .96 - size * .6)) : R(H() * .05, H() * .8);

  function popup(x, y, html) {
    const p = document.createElement("div"); p.className = "amb-pop"; p.innerHTML = html;
    p.style.left = Math.min(Math.max(x, 120), W() - 120) + "px"; p.style.top = Math.max(y, 70) + "px";
    layer.appendChild(p); setTimeout(() => p.remove(), 2700);
  }
  function tapped(el, kind, onTap) {
    el.addEventListener("pointerdown", e => {
      e.preventDefault(); const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      el.getAnimations().forEach(a => a.cancel()); el.remove(); onTap(x, y);
    }, { once: true });
  }

  const KINDS = {
    bird() {
      const size = R(70, 120), ltr = Math.random() < .5, y = crossY(size), t = R(5500, 8500);
      const el = sprite(`<img src="bird-fly.svg" alt="">`, size, opts.tap);
      const flip = ltr ? 1 : -1, x0 = ltr ? -size - 20 : W() + 20, x1 = ltr ? W() + 20 : -size - 20;
      el.animate([{ transform: `translate(${x0}px,${y}px) scaleX(${flip})` }, { transform: `translate(${(x0 + x1) / 2}px,${y + R(-50, 50)}px) scaleX(${flip})` },
        { transform: `translate(${x1}px,${y + R(-60, 30)}px) scaleX(${flip})` }], { duration: t, easing: "ease-in-out" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "bird", (x, y) => { opts.sound?.("whistle"); popup(x, y, "🎶 Tweet tweet!<small>The bird sings for you</small>"); });
    },
    chute() {
      const size = opts.tap ? R(70, 96) : R(60, 100), x = fallX(size), t = R(9000, 13000);
      const el = sprite(ART.chute, size, opts.tap);
      el.animate([{ transform: `translate(${x}px,${-size * 1.4}px) rotate(-8deg)` }, { transform: `translate(${x + 20}px,${H() * .35}px) rotate(7deg)` },
        { transform: `translate(${x - 15}px,${H() * .7}px) rotate(-6deg)` }, { transform: `translate(${x + 10}px,${H() + 20}px) rotate(5deg)` }], { duration: t, easing: "linear" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "chute", (x, y) => { opts.sound?.("gift"); opts.burst?.(); popup(x, y, `<small>Inside the care package:</small>${GIFTS[Math.random() * GIFTS.length | 0]}`); });
    },
    rose() {
      const size = R(38, 56), x = fallX(size), t = R(9000, 12000);
      const el = sprite(ART.rose, size, opts.tap);
      el.animate([{ transform: `translate(${x}px,${-size * 2}px) rotate(-20deg)` }, { transform: `translate(${x + 30}px,${H() * .5}px) rotate(160deg)` },
        { transform: `translate(${x - 10}px,${H() + 30}px) rotate(330deg)` }], { duration: t, easing: "ease-in-out" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "rose", (x, y) => { opts.sound?.("gong"); popup(x, y, "🌹 The President sends his regards.<small>He's watching</small>"); });
    },
    wasp() {
      const size = R(40, 60), ltr = Math.random() < .5, y = crossY(size), t = R(4000, 6500);
      const el = sprite(ART.wasp, size, opts.tap), flip = ltr ? 1 : -1, x0 = ltr ? -size - 20 : W() + 20, x1 = ltr ? W() + 20 : -size - 20;
      const frames = []; for (let i = 0; i <= 8; i++) frames.push({ transform: `translate(${x0 + (x1 - x0) * i / 8}px,${y + (i % 2 ? -1 : 1) * R(10, 40)}px) scaleX(${flip})` });
      el.animate(frames, { duration: t, easing: "linear" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "wasp", (x, y) => { opts.sound?.("buzz"); popup(x, y, "💥 Swatted!<small>One less tracker jacker</small>"); });
    },
    berries() {
      const size = R(34, 50), x = fallX(size), t = R(6000, 8500);
      const el = sprite(ART.berries, size, opts.tap);
      el.animate([{ transform: `translate(${x}px,${-size}px) rotate(0)` }, { transform: `translate(${x}px,${H() + 20}px) rotate(${R(-360, 360)}deg)` }], { duration: t, easing: "ease-in" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "berries", (x, y) => { opts.sound?.("wrong"); popup(x, y, "⚠️ Don't eat the berries!<small>Seriously. Put them down.</small>"); });
    },
    embers() {
      for (let i = 0; i < 6; i++) {
        const e = document.createElement("div"); e.className = "amb-ember"; if (opts.theme === "ds") e.style.cssText = "background:#f6dfa0;box-shadow:0 0 8px 2px #d9b25f"; layer.appendChild(e);
        const x = mode === "edges" ? (Math.random() < .5 ? R(0, W() * .1) : R(W() * .9, W())) : R(0, W());
        e.animate([{ transform: `translate(${x}px,${H() + 10}px)`, opacity: 1 }, { transform: `translate(${x + R(-60, 60)}px,${H() * R(.3, .7)}px)`, opacity: 0 }],
          { duration: R(2500, 4500), delay: i * 180, easing: "ease-out", fill: "backwards" }).onfinish = () => e.remove();
      }
    },
  };
  // things that fall or float up, with what a tap says (phones)
  function faller(art, size, t, spin, tapKind, sound, msg) {
    const x = fallX(size), el = sprite(ART[art], size, opts.tap);
    el.animate([{ transform: `translate(${x}px,${-size * 1.5}px) rotate(0)` }, { transform: `translate(${x + R(-30, 30)}px,${H() * .5}px) rotate(${spin / 2}deg)` },
      { transform: `translate(${x + R(-20, 20)}px,${H() + 30}px) rotate(${spin}deg)` }], { duration: t, easing: "linear" }).onfinish = () => el.remove();
    if (opts.tap) tapped(el, tapKind, (x, y) => { opts.sound?.(sound); popup(x, y, msg()); });
  }
  let coins = 0;
  Object.assign(KINDS, {
    coin() { faller("coin", R(34, 48), R(5000, 7500), R(-720, 720), "coin", "points", () => { const n = opts.coin ? opts.coin() : ++coins;
      return `🪙 +1 Capitol coin!<small>You have ${n} coin${n > 1 ? "s" : ""}. Most coins wins a shout-out!</small>`; }); },
    bread() {
      // tossed in an arc across the screen
      const size = R(56, 80), ltr = Math.random() < .5, y = crossY(size), t = R(3500, 5000);
      const el = sprite(ART.bread, size, opts.tap), x0 = ltr ? -size - 20 : W() + 20, x1 = ltr ? W() + 20 : -size - 20;
      el.animate([{ transform: `translate(${x0}px,${y + 60}px) rotate(0)` }, { transform: `translate(${(x0 + x1) / 2}px,${y - 70}px) rotate(${ltr ? 200 : -200}deg)` },
        { transform: `translate(${x1}px,${y + 80}px) rotate(${ltr ? 400 : -400}deg)` }], { duration: t, easing: "linear" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "bread", (x, y) => { opts.sound?.("tap"); popup(x, y, "🍞 Someone tossed you bread.<small>You owe them one.</small>"); });
    },
    arrow() {
      const size = R(110, 160), ltr = Math.random() < .5, y = crossY(30), t = R(1400, 2200);
      const el = sprite(ART.arrow, size, opts.tap), x0 = ltr ? -size - 20 : W() + 20, x1 = ltr ? W() + 20 : -size - 20, flip = ltr ? 1 : -1;
      el.animate([{ transform: `translate(${x0}px,${y}px) scaleX(${flip})` }, { transform: `translate(${x1}px,${y - R(0, 40)}px) scaleX(${flip})` }], { duration: t, easing: "cubic-bezier(.3,0,.8,.6)" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "arrow", (x, y) => { opts.sound?.("lock"); popup(x, y, "🎯 Bullseye!<small>Nice reflexes, tribute</small>"); });
    },
    sugar() { faller("sugar", R(30, 42), R(6000, 8500), R(-540, 540), "sugar", "tap", () => "🧊 Want a sugar cube?<small>Sweet. Very sweet.</small>"); },
    flame() {
      const size = R(34, 50), x = fallX(size), t = R(4000, 6000), el = sprite(ART.flame, size, opts.tap);
      el.animate([{ transform: `translate(${x}px,${H() + 20}px)`, opacity: 1 }, { transform: `translate(${x + R(-40, 40)}px,${H() * .3}px)`, opacity: 0 }], { duration: t, easing: "ease-out" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "flame", (x, y) => { opts.sound?.("fire"); popup(x, y, "🔥 Tribute on fire!<small>Too hot to handle</small>"); });
    },
  });
  const NOTES = ["Rumor has it the elves are unionizing.", "Someone in this room has never seen a single Christmas movie. Allegedly.",
    "Classified: the fruitcake is 11 years old.", "Top secret: Santa's real weight.", "Psst. The cookies on the counter are store-bought.",
    "Confidential: the reindeer prefer carrots.", "Leaked memo: Rudolph's nose is battery-powered.", "Off the record: someone regifted last year.",
    "Eyes only: the tree is slightly crooked.", "Redacted: [this part has been eaten by the dog]."];
  let keys = 0;
  Object.assign(KINDS, {
    envelope() {
      const size = opts.tap ? R(64, 84) : R(56, 86), x = fallX(size), t = R(9000, 12500), el = sprite(ART.envelope, size, opts.tap);
      el.animate([{ transform: `translate(${x}px,${-size}px) rotate(-10deg)` }, { transform: `translate(${x + 30}px,${H() * .35}px) rotate(12deg)` },
        { transform: `translate(${x - 20}px,${H() * .7}px) rotate(-8deg)` }, { transform: `translate(${x + 10}px,${H() + 20}px) rotate(10deg)` }], { duration: t, easing: "linear" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "envelope", (x, y) => { opts.sound?.("seal"); opts.burst?.(); popup(x, y, `<small>✉️ A secret note</small>${NOTES[Math.random() * NOTES.length | 0]}`); });
    },
    seal() { faller("seal", R(36, 52), R(6000, 8500), R(-540, 540), "seal", "seal", () => "🔴 Sealed with wax.<small>And maybe a kiss</small>"); },
    key() { faller("key", R(60, 80), R(6000, 8500), R(-720, 720), "key", "right", () => { const n = opts.key ? opts.key() : ++keys;
      return `🗝️ You found a key!<small>${n} key${n > 1 ? "s" : ""} to the vault</small>`; }); },
    lock() { faller("lock", R(34, 46), R(6500, 9000), R(-180, 180), "lock", "tap", () => "🔒 Locked tight.<small>Nice try, detective</small>"); },
    scroll() { faller("scroll", R(60, 84), R(7000, 9500), R(-300, 300), "scroll", "shh", () => `📜 Classified memo<small>${NOTES[Math.random() * NOTES.length | 0]}</small>`); },
    quill() {
      const size = R(26, 36), ltr = Math.random() < .5, x0 = ltr ? -60 : W() + 20, x1 = ltr ? W() * R(.5, 1.1) : W() * R(-.1, .5), t = R(9000, 12000), el = sprite(ART.quill, size, opts.tap);
      el.animate([{ transform: `translate(${x0}px,${R(-40, H() * .2)}px) rotate(${ltr ? 30 : -30}deg)` }, { transform: `translate(${(x0 + x1) / 2}px,${H() * .5}px) rotate(${ltr ? -20 : 20}deg)` },
        { transform: `translate(${x1}px,${H() + 40}px) rotate(${ltr ? 25 : -25}deg)` }], { duration: t, easing: "ease-in-out" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "quill", (x, y) => { opts.sound?.("shh"); popup(x, y, "🪶 Your secret is safe with us.<small>Probably.</small>"); });
    },
    magnifier() {
      const size = R(56, 80), ltr = Math.random() < .5, y = crossY(size), t = R(5000, 7500), el = sprite(ART.magnifier, size, opts.tap);
      const x0 = ltr ? -size - 20 : W() + 20, x1 = ltr ? W() + 20 : -size - 20, frames = [];
      for (let i = 0; i <= 6; i++) frames.push({ transform: `translate(${x0 + (x1 - x0) * i / 6}px,${y + Math.sin(i * 1.4) * 30}px) rotate(${(i % 2 ? -1 : 1) * 12}deg)` });
      el.animate(frames, { duration: t, easing: "ease-in-out" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "magnifier", (x, y) => { opts.sound?.("right"); popup(x, y, "🔍 Clue found!<small>It's definitely someone in this room.</small>"); });
    },
    question() {
      const size = R(28, 44), x = fallX(size), t = R(5000, 7000), el = sprite(ART.question, size, opts.tap);
      el.animate([{ transform: `translate(${x}px,${H() + 20}px) rotate(-10deg)`, opacity: 1 }, { transform: `translate(${x + R(-40, 40)}px,${H() * .25}px) rotate(10deg)`, opacity: 0 }], { duration: t, easing: "ease-out" }).onfinish = () => el.remove();
      if (opts.tap) tapped(el, "question", (x, y) => { opts.sound?.("tap"); popup(x, y, "❓ Who could it be?<small>Trust no one.</small>"); });
    },
  });
  const BAG_DS = ["envelope", "envelope", "envelope", "seal", "seal", "key", "key", "lock", "scroll", "scroll", "quill", "magnifier", "magnifier", "question", "question", "embers"];
  const BAG = ["bird", "bird", "chute", "chute", "chute", "rose", "wasp", "wasp", "berries", "embers", "coin", "coin", "bread", "bread", "arrow", "sugar", "flame"];

  function spawn() {
    if (mode === "off" || document.hidden || calm) return;
    const bag = opts.theme === "ds" ? BAG_DS : BAG;
    if (live() < (opts.max || 6)) KINDS[bag[Math.random() * bag.length | 0]]();
  }
  function loop() { clearTimeout(timer); if (mode === "off") return; spawn(); timer = setTimeout(loop, R(opts.every?.[0] || 1400, opts.every?.[1] || 2600)); }

  function set(m, o = {}) {
    const changed = m !== mode || JSON.stringify(o.every) !== JSON.stringify(opts.every);
    mode = m; opts = o;
    if (m === "off") { clearTimeout(timer); return; }
    if (changed) { clearTimeout(timer); timer = setTimeout(loop, 400); }
  }
  function clear() { layer.querySelectorAll(".amb,.amb-ember").forEach(e => e.remove()); }
  // A tribute's training score, 1 to 12. Same answer on the TV and every phone for the whole day.
  function training(name) {
    let h = 2166136261; for (const c of name + new Date().toDateString()) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0) % 12 + 1;
  }
  // An original horn of plenty for The Feast
  const CORNUCOPIA = `<svg viewBox="0 0 220 140" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe39a"/><stop offset=".5" stop-color="#e8b04b"/><stop offset="1" stop-color="#8a5c14"/></linearGradient></defs>
    <path d="M14 30c10 8 18 6 26 0 30 22 70 30 110 28 20-1 36 10 40 34 3 22-10 40-34 42-40 4-86-12-118-40C18 78 4 52 14 30z" fill="url(#cg)" stroke="#7a5212" stroke-width="2"/>
    <path d="M40 30c6 20 20 40 40 54M64 40c4 18 16 34 32 46M92 50c2 14 10 28 22 38M120 56c0 12 6 24 16 32" stroke="#9a6c1c" stroke-width="2" fill="none" opacity=".7"/>
    <ellipse cx="170" cy="96" rx="34" ry="38" fill="#3a2410" stroke="#7a5212" stroke-width="2"/>
    <circle cx="160" cy="80" r="11" fill="#c8312a"/><circle cx="178" cy="92" r="10" fill="#e8b04b"/><circle cx="162" cy="104" r="10" fill="#3e8a52"/><circle cx="182" cy="112" r="9" fill="#6b2d8a"/>
    <path d="M150 116c10-6 26-6 36 2-10 6-26 6-36-2z" fill="#c97a2b"/><path d="M176 70l6-8M162 70l-2-9" stroke="#3e8a52" stroke-width="3"/></svg>`;
  return { set, clear, spawn: k => KINDS[k]?.(), training, CORNUCOPIA, ART };
})();
