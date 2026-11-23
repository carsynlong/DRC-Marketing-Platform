/* Show extras shared by Who's That Tribute and District Secrets:
   1. Walkout: player introductions at the start of the show.
   2. Ticker:  a live leaderboard bar along the bottom of the TV.
   3. Rules:   a "How to play" screen the announcer reads out loud, then a Ready button.

   Walk-out introductions:
   Each player gets a spotlight: their photo zooms in, "From District N…", their name, a hype line and a cheer.
   The announcer voice (the browser's built-in speech) reads each name when sound is on.

   Walkout.run({
     names:    ["Jonny", ...]            who walks out, in order
     district: name => number            their district
     photo:    name => image url
     theme:    "tribute" | "secrets"     colors, font and lines that match the game
     sound:    () => true/false          the game's music/sound switch
     onDone:   () => {}                  called once, after the last walk-out or when skipped
     hypeFor:  name => line or null      optional: a special line for someone (e.g. the host)
     style:    "reaping" | "lineup"      optional: Who's That Tribute draws names from the reaping bowl; District Secrets puts suspects in a lineup
   })
   Space, Enter or the Skip button ends it early. While it runs, it sits on top of the game's lobby. */
window.Walkout = (() => {
  const THEMES = {
    tribute: {
      tag: "🏹 Presenting the tributes", font: '"Rye", Georgia, serif', ink: "#fbf6ea",
      accent: "#e8b04b", accent2: "#b8322a", bg1: "#16302a", bg2: "#0d1f18",
      hype: ["Volunteered without blinking!", "Sponsors are already watching!", "Trained for this moment!", "Fierce, festive and ready!",
        "Victor material!", "Bringing the fire!", "The Capitol's new favorite!", "Here for the glory (and the cookies)!",
        "Never misses a target!", "Cool as District 12 snow!", "A threat in a Santa hat!", "Ready for the arena!"],
    },
    secrets: {
      tag: "🔏 Presenting the suspects", font: '"Cinzel Decorative", "Cinzel", Georgia, serif', ink: "#f4ecdb",
      accent: "#d9b25f", accent2: "#a3182b", bg1: "#251a36", bg2: "#0b0a14",
      hype: ["Has a secret to hide…", "Keeps a perfect poker face!", "Trust no one. Especially them.", "Knows something you don't!",
        "The vault's most wanted!", "Never cracks under pressure!", "Smooth as candlelight!", "Leaves no fingerprints!",
        "Hiding something under the tree…", "The master of misdirection!", "Sealed lips, sharp mind!", "Suspiciously innocent!"],
    },
  };

  let root = null, timers = [], finish = null, ac = null, soundOn = () => true;
  // the silly bits for each walk-out (shuffled per show)
  const PROPS = [{ e: "🎅" }, { e: "🕶️", eyes: 1 }, { e: "👑" }, { e: "🦌" }, { e: "🎩" }, { e: "🥸", eyes: 1 }, { e: "🎀" }, { e: "🧝" }, { e: "⭐" }, { e: "🤠" }];
  const FUNNY = ["airhorn", "whistle", "kazoo", "boing", "airhorn", "kazoo"];
  const CONF = ["🎉", "✨", "❄️", "🎄", "⭐", "🍪", "🎁", "🔔"];
  const STATS = ["🍪 Cookies eaten today: 14", "🤫 Secrets kept: 2 (allegedly)", "🎄 Ugly sweater rating: 11/10", "🦌 Reindeer games won: 3", "😴 Naps taken this week: 9",
    "🎁 Gifts peeked at early: ALL of them", "☕ Hot cocoa level: dangerous", "🕺 Dance moves: questionable", "🏹 Trash talk level: elite", "🧦 Socks received: 37 pairs",
    "📺 Hallmark movies watched: 22", "🍬 Candy canes hidden in pockets: 6", "🎶 Times sang Mariah this week: 40", "🛷 Sled crashes: undefeated"];
  const WEAPONS = ["Wrapping paper", "A candy cane", "Tangled Christmas lights", "A fruitcake", "An ugly sweater", "Snowballs", "A rolling pin", "Jingle bells", "Scalding hot cocoa", "A nutcracker", "Tinsel", "A gingerbread shield"];
  const ODDS = ["Ever in their favor", "Excellent", "Questionable", "50/50", "The sponsors are nervous", "Better than Santa's diet", "Suspiciously good", "Ask again after dessert"];
  const ALIASES = ["The Cookie Bandit", "Sticky Fingers", "The Tinsel Thief", "Agent Eggnog", "The Silent Night", "The Candy Cane Kid", "The Re-Gifter", "The Midnight Snacker", "Agent Mistletoe", "The Gift Peeker", "Frosty Fingers", "The Fruitcake Fence"];
  const SEEN = ["near the cookie jar", "under the mistletoe", "behind the Christmas tree", "in the gift-wrap aisle", "at the dessert table", "by the fireplace", "in the Capitol archives", "on the naughty list"];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CSS = `
#walkout{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;color:var(--wo-ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  background:radial-gradient(ellipse at 50% 40%,var(--wo-bg1),var(--wo-bg2) 75%);text-align:center;padding:16px;box-sizing:border-box}
#walkout .wo-rays{position:absolute;left:50%;top:42%;width:220vmax;height:220vmax;margin:-110vmax 0 0 -110vmax;pointer-events:none;
  background:repeating-conic-gradient(color-mix(in srgb,var(--wo-accent) 22%,transparent) 0 9deg,transparent 9deg 18deg);
  -webkit-mask:radial-gradient(circle,#000 0,transparent 40%);mask:radial-gradient(circle,#000 0,transparent 40%);animation:wo-spin 24s linear infinite}
#walkout .wo-beam{position:absolute;top:-10vh;left:50%;width:60vmin;height:120vh;margin-left:-30vmin;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,246,210,.28),rgba(255,246,210,0) 80%);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%)}
#walkout .wo-in{position:relative;display:grid;justify-items:center;gap:clamp(6px,1.4vh,14px);max-width:900px}
#walkout .wo-tag{font-family:var(--wo-font);font-size:clamp(.95rem,2.2vw,1.4rem);color:var(--wo-ink);background:var(--wo-accent2);padding:.3em 1em;border-radius:999px;box-shadow:0 0 0 3px var(--wo-accent)}
#walkout .wo-av{width:clamp(170px,30vh,300px);aspect-ratio:1;border-radius:50%;object-fit:cover;
  box-shadow:0 0 0 8px var(--wo-accent),0 0 0 16px var(--wo-accent2),0 0 120px rgba(255,236,170,.6);animation:wo-zoom .7s 1.25s cubic-bezier(.2,1.4,.4,1) both}
#walkout .wo-from{font-family:var(--wo-font);color:var(--wo-accent);font-size:clamp(1.1rem,2.8vw,1.9rem);animation:wo-pop .45s .1s both}
#walkout .wo-name{font-family:var(--wo-font);font-size:clamp(2.8rem,9vw,6.2rem);line-height:1;color:var(--wo-ink);text-transform:uppercase;overflow-wrap:anywhere;
  text-shadow:0 5px 0 var(--wo-accent2),0 0 40px color-mix(in srgb,var(--wo-accent) 60%,transparent);}
#walkout .wo-name span{display:inline-block;animation:wo-drop .55s cubic-bezier(.2,1.6,.4,1) both;animation-delay:calc(1.35s + var(--k)*55ms)}
#walkout .wo-hype{font-size:clamp(1.15rem,2.6vw,1.8rem);font-weight:800;color:var(--wo-accent);animation:wo-pop .45s 2.3s both}
/* 🎉 the funny bits: a prop drops onto the photo, a silly stat card, emoji confetti, a searching spotlight */
#walkout .wo-photo{position:relative;display:grid;place-items:center}
#walkout .wo-prop{position:absolute;left:50%;top:-6%;font-size:clamp(4rem,11vh,7rem);line-height:1;transform:translateX(-50%) rotate(-8deg);filter:drop-shadow(0 6px 10px rgba(0,0,0,.5));
  animation:wo-propfall 1s 3.1s cubic-bezier(.3,1.5,.5,1) both}
#walkout .wo-prop.eyes{top:28%;font-size:clamp(3.4rem,9vh,5.6rem)}
#walkout .wo-stat{font-size:clamp(1rem,2.1vw,1.35rem);font-weight:800;color:var(--wo-ink);background:rgba(0,0,0,.35);border-radius:12px;padding:.45em 1em;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--wo-accent) 60%,transparent);
  animation:wo-stamp .5s 2.8s cubic-bezier(.3,1.6,.5,1) both}
#walkout .wo-conf{position:absolute;top:-8vh;font-size:clamp(1.6rem,3.4vw,2.6rem);pointer-events:none;animation:wo-fall var(--t) var(--d) linear both}
#walkout .wo-search{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at var(--x,50%) 45%,rgba(255,246,210,.22) 0,transparent 22%);animation:wo-hunt 1.2s ease-in-out both}
@keyframes wo-propfall{0%{transform:translate(-50%,-120vh) rotate(-40deg)}70%{transform:translate(-50%,0) rotate(6deg)}85%{transform:translate(-50%,-6%) rotate(-4deg)}100%{transform:translate(-50%,0) rotate(-8deg)}}
@keyframes wo-stamp{from{transform:scale(2.2) rotate(-8deg);opacity:0}to{transform:none;opacity:1}}
@keyframes wo-fall{from{transform:translateY(0) rotate(0);opacity:1}to{transform:translateY(118vh) rotate(var(--r));opacity:.9}}
@keyframes wo-hunt{0%{--x:20%;opacity:0}15%{opacity:1}100%{opacity:0}}
#walkout .wo-dots{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
#walkout .wo-dots i{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.25)}
#walkout .wo-dots i.on{background:var(--wo-accent)}
#walkout .wo-skip{font:inherit;font-weight:800;font-size:1rem;color:var(--wo-ink);background:rgba(255,255,255,.08);border:0;border-radius:999px;padding:.6em 1.3em;
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.3);cursor:pointer;margin-top:6px}
#walkout .wo-skip:focus-visible{outline:3px solid var(--wo-accent);outline-offset:3px}
#walkout .wo-hint{font-size:.85rem;opacity:.7}
#walkout .wo-flash{position:absolute;inset:0;background:#fff;pointer-events:none;animation:wo-flash .5s ease-out forwards}
@keyframes wo-spin{to{rotate:360deg}}
@keyframes wo-zoom{from{transform:scale(.15) rotate(-25deg);opacity:0}}
@keyframes wo-pop{from{transform:scale(.6);opacity:0}}
@keyframes wo-drop{from{transform:translateY(-140%) rotate(-12deg);opacity:0}}
@keyframes wo-flash{from{opacity:.6}to{opacity:0}}
@property --x{syntax:"<percentage>";inherits:false;initial-value:50%}
#walkout .wo-search{animation:wo-hunt2 1.2s ease-in-out both}
@keyframes wo-hunt2{0%{--x:15%;opacity:0}20%{opacity:1}50%{--x:80%}80%{--x:50%;opacity:1}100%{--x:50%;opacity:0}}
/* 🏹 REAPING style (Who's That Tribute): a slip is drawn from the bowl, then their tribute card, then a flaming chariot */
#walkout .wo-stage{display:grid;place-items:center}
#walkout .wo-stage>*{grid-area:1/1}
#walkout .wo-bowl{position:relative;width:clamp(220px,30vh,320px);height:clamp(200px,28vh,290px);animation:wo-bowlout .45s 1.2s ease-in both}
#walkout .wo-glass{position:absolute;inset:auto 0 0 0;height:72%;border-radius:12% 12% 50% 50%/10% 10% 60% 60%;overflow:hidden;
  background:radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.45),rgba(255,255,255,.08) 40%,rgba(180,220,255,.12));box-shadow:inset 0 0 0 4px rgba(255,255,255,.55),inset 0 -20px 40px rgba(255,255,255,.15),0 20px 40px rgba(0,0,0,.4)}
#walkout .wo-glass i{position:absolute;width:28%;height:14%;background:#f6ecd2;border-radius:3px;box-shadow:0 2px 3px rgba(0,0,0,.25);animation:wo-jiggle .3s ease-in-out infinite alternate}
#walkout .wo-hand{position:absolute;left:50%;top:-6%;font-size:clamp(3.4rem,8vh,5rem);transform:translateX(-50%);animation:wo-dip 1s .1s ease-in-out both;z-index:2}
#walkout .wo-slip{position:absolute;left:50%;top:22%;z-index:3;transform:translate(-50%,0);background:#f6ecd2;color:#2b1d12;border-radius:4px;padding:.25em .8em;
  font:700 clamp(1.6rem,4vh,2.4rem)/1.1 "Caveat","Segoe Print","Bradley Hand",cursive;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,.45);animation:wo-slipup 1.15s .15s cubic-bezier(.3,1.2,.5,1) both}
#walkout .wo-card{display:grid;grid-template-columns:auto auto;gap:clamp(16px,2.6vw,34px);align-items:center;text-align:left;background:linear-gradient(180deg,#f6ecd2,#e8d6ac);color:#2b1d12;
  border-radius:16px;padding:clamp(14px,2.2vh,24px) clamp(18px,2.6vw,34px);box-shadow:0 0 0 5px var(--wo-accent),0 0 0 10px var(--wo-accent2),0 24px 60px rgba(0,0,0,.55);
  animation:wo-cardin .75s 1.25s cubic-bezier(.2,1.4,.4,1) both;transform-origin:center}
#walkout .wo-card .wo-av{width:clamp(150px,26vh,260px);animation:none}
#walkout .wo-card .wo-from{color:var(--wo-accent2);animation:none;font-size:clamp(1rem,2.2vw,1.5rem)}
#walkout .wo-card .wo-name{color:#2b1d12;text-shadow:0 3px 0 var(--wo-accent);font-size:clamp(2.2rem,6vw,4.4rem)}
#walkout .wo-sheet{display:grid;gap:4px;margin-top:8px;font-weight:800;font-size:clamp(.95rem,1.8vw,1.25rem)}
#walkout .wo-sheet div{animation:wo-pop .35s var(--d) both}
#walkout .wo-sheet b{color:var(--wo-accent2)}
#walkout .wo-chariot{position:absolute;bottom:6%;left:-45vw;font-size:clamp(2.6rem,7vh,4rem);white-space:nowrap;display:flex;align-items:center;gap:4px;pointer-events:none;
  filter:drop-shadow(0 0 14px rgba(255,120,0,.9));animation:wo-ride 2.2s 2.7s linear both}
#walkout .wo-chariot img{width:1.2em;height:1.2em;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px #ffb02e}
@keyframes wo-bowlout{to{opacity:0;transform:scale(.6) translateY(40px)}}
@keyframes wo-jiggle{to{transform:translateY(-3px) rotate(4deg)}}
@keyframes wo-dip{0%{transform:translate(-50%,-60px);opacity:0}25%{opacity:1}50%{transform:translate(-50%,60px)}100%{transform:translate(-50%,-40px)}}
@keyframes wo-slipup{0%{transform:translate(-50%,90px) scaleY(.15);opacity:0}45%{transform:translate(-50%,-30px) scaleY(.15);opacity:1}75%{transform:translate(-50%,-40px) scaleY(1)}100%{transform:translate(-50%,-40px) scaleY(1)}}
@keyframes wo-cardin{from{transform:perspective(900px) rotateY(90deg) scale(.6);opacity:0}to{transform:none;opacity:1}}
@keyframes wo-ride{from{transform:translateX(0)}to{transform:translateX(170vw)}}
/* 🔏 LINEUP style (District Secrets): height chart, mugshot flash, fingerprint scan, typed case file, SUSPECT stamp */
#walkout .wo-lineup{display:grid;grid-template-columns:auto minmax(0,420px);gap:clamp(16px,3vw,40px);align-items:center;text-align:left}
#walkout .wo-mug{position:relative;padding:18px 18px 54px;border-radius:8px;
  background:repeating-linear-gradient(180deg,transparent 0 37px,rgba(255,255,255,.35) 37px 39px),linear-gradient(180deg,#3a3446,#24202e);box-shadow:inset 0 0 0 3px rgba(255,255,255,.25),0 18px 40px rgba(0,0,0,.5)}
#walkout .wo-mug .wo-av{border-radius:6px;width:clamp(170px,28vh,270px);box-shadow:0 0 0 4px #ddd;animation:wo-mugshot .6s 1.2s both}
#walkout .wo-mug .wo-hgt{position:absolute;right:4px;top:10px;display:grid;gap:22px;font:800 .72rem/1 monospace;color:rgba(255,255,255,.55)}
#walkout .wo-plac{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);background:#111;color:#fff;font:800 clamp(.75rem,1.4vw,1rem)/1.2 "Courier New",monospace;padding:.35em .9em;border-radius:3px;white-space:nowrap;letter-spacing:.06em}
#walkout .wo-scanl{position:absolute;left:18px;right:18px;height:4px;top:18px;background:#5dff9b;box-shadow:0 0 18px 4px rgba(93,255,155,.8);opacity:0;animation:wo-scan 1.1s 1.7s ease-in-out both}
#walkout .wo-match{position:absolute;left:50%;top:84%;transform:translate(-50%,-50%) rotate(-8deg);font:900 clamp(1.2rem,2.6vw,2rem)/1 "Courier New",monospace;color:#5dff9b;background:rgba(0,0,0,.7);
  padding:.2em .5em;border:3px solid #5dff9b;border-radius:6px;white-space:nowrap;animation:wo-stamp .4s 2.85s cubic-bezier(.3,1.6,.5,1) both}
#walkout .wo-file{position:relative;background:#efe2c4;color:#2b1d12;border-radius:4px;padding:16px 18px 18px;box-shadow:0 14px 30px rgba(0,0,0,.5),inset 0 0 40px rgba(120,80,30,.3);transform:rotate(1.5deg);
  font:700 clamp(.95rem,1.8vw,1.25rem)/1.45 "Special Elite","Courier New",monospace;animation:wo-pop .5s 1.3s both}
#walkout .wo-fhead{font-size:.75em;letter-spacing:.12em;border-bottom:2px dashed rgba(80,50,20,.35);padding-bottom:6px;margin-bottom:6px;opacity:.8}
#walkout .wo-tl{overflow:hidden;white-space:nowrap;width:0;animation:wo-type .9s var(--d) steps(28) both}
#walkout .wo-red{background:#111;color:#111;border-radius:2px}
#walkout .wo-sus{position:absolute;right:-16px;top:-20px;font:900 clamp(1.1rem,2.2vw,1.7rem)/1 "Courier New",monospace;color:#c11b2a;border:4px solid #c11b2a;padding:.1em .4em;border-radius:6px;
  transform:rotate(-12deg);background:rgba(239,226,196,.85);animation:wo-stamp .45s 3.3s cubic-bezier(.3,1.6,.5,1) both}
@keyframes wo-mugshot{from{filter:brightness(0) contrast(2)}to{filter:none}}
@keyframes wo-scan{0%{opacity:1;top:18px}50%{top:calc(100% - 60px)}100%{opacity:0;top:18px}}
@keyframes wo-type{to{width:100%}}
@media (max-width:760px){#walkout .wo-card,#walkout .wo-lineup{grid-template-columns:1fr;justify-items:center;text-align:center}}
@media (prefers-reduced-motion:reduce){#walkout *{animation:none!important}}
#walkout .wo-back,#rules .ru-back{position:absolute;top:max(14px,env(safe-area-inset-top,0px));left:max(14px,env(safe-area-inset-left,0px));z-index:2;font:inherit;font-weight:800;font-size:.95rem;
  color:#fff;background:rgba(0,0,0,.35);border:0;border-radius:10px;padding:.5em .95em;box-shadow:inset 0 0 0 2px rgba(255,255,255,.3);cursor:pointer}
#walkout .wo-back:hover,#rules .ru-back:hover{box-shadow:inset 0 0 0 2px #fff}`;

  function sfx(kind) {
    if (!soundOn()) return;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
    } catch (e) { return; }
    const t = ac.currentTime + .01, buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const burst = (at, dur, vol, freq, q) => {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
      s.connect(f); f.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + .005); g.gain.exponentialRampToValueAtTime(.0001, at + dur);
      s.start(at, Math.random() * .5); s.stop(at + dur + .05);
    };
    if (kind === "whoosh") burst(t, .5, .22, 900, .5);
    const tone = (type, f, at, dur, vol, glide) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, at);
      if (glide) o.frequency.exponentialRampToValueAtTime(glide, at + dur); o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + .02); g.gain.setValueAtTime(vol, at + dur * .8); g.gain.exponentialRampToValueAtTime(.0001, at + dur); o.start(at); o.stop(at + dur + .05); };
    if (kind === "drumroll") for (let k = 0; k < 26; k++) burst(t + k * .045, .06, .05 + k * .009, 1800 + Math.random() * 400, .8);
    if (kind === "airhorn") [0, .32].forEach(d => [233, 235.5, 466].forEach(f => tone("sawtooth", f, t + d, d ? .7 : .26, .07, f * 1.02)));
    if (kind === "whistle") tone("sine", 600, t, .7, .12, 2400);
    if (kind === "boing") { tone("sine", 160, t, .45, .25, 620); tone("sine", 620, t + .12, .5, .12, 180); }
    if (kind === "kazoo") [[392, .14], [440, .14], [494, .14], [587, .5]].reduce((at, [f, d]) => { tone("sawtooth", f, at, d, .05, f * 1.01); tone("square", f * 2, at, d, .015); return at + d; }, t);
    if (kind === "drop") tone("sine", 1800, t, .8, .1, 300);
    if (kind === "cheer") for (let k = 0; k < 70; k++) burst(t + Math.random() * 1.3, .03 + Math.random() * .05, .04 + Math.random() * .06, 1500 + Math.random() * 2800, 1.4);
  }
  /* 🎺 Entrance theme: a pounding wrestling-style beat with a big brass "God Rest Ye Merry Gentlemen"
     (traditional English carol, public domain), sleigh bells, and a BAM on every name. All made in the browser. */
  const Music = (() => {
    let out = null, timer = 0, next = 0, i = 0, start = 0, nb = null;
    const BPM = 132, SPB = 60 / BPM, LEN = 16;           // 4 bars of 4/4, looped
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const env = (g, t, a, v, d) => { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + d); };
    function noiseBuf() { if (nb) return nb; nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = nb.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1; return nb; }
    function noise(t, dur, vol, type, freq, q, dest) { const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
      s.connect(f); f.connect(g); g.connect(dest || out); env(g, t, .003, vol, dur); s.start(t, Math.random() * .5); s.stop(t + dur + .05); }
    function tone(type, f, t, dur, vol, cut, dest, glide) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
      let n = o; if (cut) { const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = cut; o.connect(fl); n = fl; } n.connect(g); g.connect(dest || out); env(g, t, .006, vol, dur); o.start(t); o.stop(t + dur + .05); }
    const kick = t => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .14); o.connect(g); g.connect(out); env(g, t, .003, .7, .28); o.start(t); o.stop(t + .32); };
    const brass = (m, t, d, v = 1) => { [0, .006].forEach(det => tone("sawtooth", hz(m) * (1 + det), t, d * .95, .07 * v, 2200)); tone("square", hz(m - 12), t, d * .9, .03 * v, 1200); };
    // the carol melody, in E minor (beats)
    const MEL = [[64,1],[64,1],[71,1],[71,1],[69,1],[67,1],[66,1],[64,1],[62,1],[64,1],[66,1],[67,1],[69,1],[71,3]];
    const ROOTS = [40, 36, 38, 35];                       // Em, C, D, B: one per bar
    function bar(b, t0) {
      const root = ROOTS[b % 4];
      for (let k = 0; k < 4; k++) kick(t0 + k * SPB);
      [1, 3].forEach(k => { noise(t0 + k * SPB, .16, .35, "bandpass", 1800, .8); noise(t0 + k * SPB, .09, .18, "highpass", 5000); });
      for (let k = 0; k < 8; k++) tone("sawtooth", hz(root) * (k % 2 ? 2 : 1), t0 + k * SPB / 2, SPB * .45, .09, 700);   // driving bass
      for (let k = 0; k < 16; k++) noise(t0 + k * SPB / 4, .05, k % 4 === 0 ? .07 : .035, "bandpass", 9000, 1.3);        // sleigh bells
      if (b % 4 === 3) [2, 2.5, 3, 3.25, 3.5, 3.75].forEach((x, k) => tone("sine", 160 - k * 14, t0 + x * SPB, .25, .5, 0, out, 70)); // tom fill
    }
    function tick() {
      while (next < ac.currentTime + .2) {
        const b = i % 4, t0 = next;
        bar(b, t0);
        if (b === 0) { let at = 0; MEL.forEach(([m, d]) => { brass(m, t0 + at * SPB, d * SPB); at += d; }); }
        i++; next += 4 * SPB;
      }
    }
    return {
      start() {
        if (!soundOn() || timer) return;
        try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) { return; }
        out = ac.createGain(); out.gain.value = .42;
        const lim = ac.createDynamicsCompressor(); lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = .003; lim.release.value = .2;   // keeps the BAMs from distorting
        out.connect(lim); lim.connect(ac.destination);
        i = 0; next = ac.currentTime + .1; tick(); timer = setInterval(tick, 50);
      },
      stop() { clearInterval(timer); timer = 0; if (out) { const o = out; try { o.gain.setTargetAtTime(.0001, ac.currentTime, .15); } catch (e) {} setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 800); out = null; } },
      duck(v) { if (out) out.gain.setTargetAtTime(v, ac.currentTime, .08); },
      // 💥 the hit when a name lands: boom + crash + brass stab + bell sparkle
      bam() {
        if (!out) return; const t = ac.currentTime + .01;
        tone("sine", 90, t, 1.2, .7, 0, out, 28); noise(t, 1.6, .32, "highpass", 3000); noise(t, .35, .4, "lowpass", 400);
        [64, 67, 71, 76].forEach(m => brass(m, t, .9, 1.1));
        [88, 91, 95, 100].forEach((m, k) => tone("sine", hz(m), t + .08 + k * .05, .6, .08));
      },
    };
  })();
  function say(text) {
    try {
      if (!soundOn() || !window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.rate = 1; u.pitch = .85; u.volume = 1;
      u.onstart = () => Music.duck(.2); u.onend = () => Music.duck(.42);   // the music dips so the announcer is heard
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function onKey(e) {
    if (!root) return;
    if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); end(); }
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); end(true); }
  }
  function end(back) {
    if (!root) return;
    timers.forEach(clearTimeout); timers = [];
    try { speechSynthesis.cancel(); } catch (e) {}
    Music.stop();
    window.removeEventListener("keydown", onKey, true);
    root.remove(); root = null;
    const f = back === true ? null : finish; finish = null; if (f) f();   // Back to setup: don't start the game
  }

  function run(o) {
    const names = (o.names || []).filter(Boolean);
    if (root || !names.length) { if (!root) o.onDone && o.onDone(); return; }
    const T = THEMES[o.theme] || THEMES.tribute;
    soundOn = o.sound || (() => true); finish = o.onDone;
    if (!document.getElementById("walkout-css")) { const st = document.createElement("style"); st.id = "walkout-css"; st.textContent = CSS; document.head.appendChild(st); }
    root = document.createElement("div"); root.id = "walkout"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Player introductions");
    root.style.cssText = `--wo-font:${T.font};--wo-ink:${T.ink};--wo-accent:${T.accent};--wo-accent2:${T.accent2};--wo-bg1:${T.bg1};--wo-bg2:${T.bg2}`;
    document.body.appendChild(root);
    window.addEventListener("keydown", onKey, true);
    const hype = (o.hype || T.hype).slice().sort(() => Math.random() - .5);
    const stats = STATS.slice().sort(() => Math.random() - .5), seed = Math.random() * 100 | 0;
    Music.start();
    const pick = (arr, k) => arr[(k + seed) % arr.length];
    const letters = n => `<div class="wo-name" aria-label="${esc(n)}">${[...String(n)].map((c, k) => `<span style="--k:${k}">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("")}</div>`;
    const photoHTML = (n, prop) => `<div class="wo-photo"><img class="wo-av" src="${esc(o.photo ? o.photo(n) : "")}" alt="">${calm ? "" : `<span class="wo-prop${prop.eyes ? " eyes" : ""}" aria-hidden="true">${prop.e}</span>`}</div>`;
    const hypeLine = (n, i) => `<div class="wo-hype">${esc((o.hypeFor && o.hypeFor(n)) || hype[i % hype.length])}</div>`;
    function middle(style, n, dn, prop, stat, i) {
      if (style === "reaping") {   // 🏹 drawn from the reaping bowl, then the tribute card
        const slips = Array.from({ length: 14 }, (_, k) => `<i style="left:${(k * 6.5) % 76}%;bottom:${(k * 13) % 50}%;transform:rotate(${(k * 37) % 70 - 35}deg);animation-delay:${(k % 5) * 60}ms"></i>`).join("");
        return `<div class="wo-stage"><div class="wo-bowl" aria-hidden="true"><div class="wo-glass">${slips}</div><div class="wo-hand">✋</div><div class="wo-slip">${esc(n)}</div></div>
          <div class="wo-card">${photoHTML(n, prop)}<div><div class="wo-from">District ${dn} Tribute</div>${letters(n)}
          <div class="wo-sheet"><div style="--d:1.9s">🎯 Training score: <b>${o.training ? o.training(n) : 5 + ((i * 7 + seed) % 8)}</b></div><div style="--d:2.15s">🗡️ Weapon of choice: <b>${esc(pick(WEAPONS, i))}</b></div><div style="--d:2.4s">🎲 Odds: <b>${esc(pick(ODDS, i))}</b></div></div></div></div></div>${hypeLine(n, i)}`;
      }
      if (style === "lineup") {   // 🔏 mugshot against the height chart, fingerprint match, typed case file
        const red = "█".repeat(6 + (i % 5));
        return `<div class="wo-lineup"><div class="wo-mug"><div class="wo-hgt" aria-hidden="true"><span>6'</span><span>5'</span><span>4'</span><span>3'</span></div>${photoHTML(n, prop)}
          <div class="wo-scanl" aria-hidden="true"></div><div class="wo-match">MATCH ✓</div><div class="wo-plac">SUSPECT #${i + 1} · DISTRICT ${dn}</div></div>
          <div class="wo-file"><div class="wo-fhead">CASE FILE #${(1200 + seed * 7 + i * 13) % 9000 + 1000}</div>
          <div class="wo-tl" style="--d:1.8s">ALIAS: ${esc(pick(ALIASES, i))}</div><div class="wo-tl" style="--d:2.4s">KNOWN FOR: <span class="wo-red">${red}</span></div>
          <div class="wo-tl" style="--d:3s">LAST SEEN: ${esc(pick(SEEN, i))}</div><div class="wo-sus">SUSPECT</div></div></div>${letters(n)}${hypeLine(n, i)}`;
      }
      return `${photoHTML(n, prop)}<div class="wo-from">From District ${dn}…</div>${letters(n)}${hypeLine(n, i)}<div class="wo-stat">${esc(stat)}</div>`;
    }
    if (!document.getElementById("wo-font") && o.style === "reaping") { const l = document.createElement("link"); l.id = "wo-font"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap"; document.head.appendChild(l); }
    let i = -1;
    const step = () => {
      if (!root) return;
      i++;
      if (i >= names.length) { later(end, 500); return; }
      const n = names[i], dn = o.district ? o.district(n) : i + 1;
      const prop = PROPS[(i + seed) % PROPS.length], stat = stats[i % stats.length], funny = FUNNY[(i + seed) % FUNNY.length];
      const conf = calm ? "" : Array.from({ length: 18 }, (_, k) => `<span class="wo-conf" style="left:${(k * 5.6 + Math.random() * 4).toFixed(1)}%;--t:${(2.2 + Math.random() * 1.6).toFixed(2)}s;--d:${(1.5 + Math.random() * .9).toFixed(2)}s;--r:${(Math.random() * 720 - 360) | 0}deg">${CONF[(k + i) % CONF.length]}</span>`).join("");
      root.innerHTML = `${calm ? "" : '<div class="wo-rays"></div><div class="wo-search"></div>'}<div class="wo-beam"></div>${conf}<button class="wo-back" type="button">↩ Back to setup</button>
        <div class="wo-in"><div class="wo-tag">${T.tag}</div>
        ${middle(o.style, n, dn, prop, stat, i)}
        <div class="wo-dots">${names.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>
        <button class="wo-skip" type="button">Skip intros</button><div class="wo-hint">Space: skip</div></div>`;
      if (o.style === "reaping" && !calm) root.insertAdjacentHTML("beforeend", `<div class="wo-chariot" aria-hidden="true">🔥🔥🛞<img src="${esc(o.photo ? o.photo(n) : "")}" alt=""><span style="display:inline-block;transform:scaleX(-1)">🐎🐎</span></div>`);
      root.querySelector(".wo-skip").onclick = () => end();
      root.querySelector(".wo-back").onclick = () => end(true);
      // ~5 seconds each: drumroll → BAM (photo + name) → a funny sound and confetti → the prop drops on their head
      sfx("whoosh"); Music.duck(.12); sfx("drumroll");
      say(`${i === 0 ? "Ladies and gentlemen… " : ""}From District ${dn}… give it up for… ${n}!`);
      later(() => { Music.bam(); Music.duck(.42); sfx("cheer"); if (!calm && root) { const f = document.createElement("div"); f.className = "wo-flash"; root.appendChild(f); setTimeout(() => f.remove(), 600); } }, 1250);
      later(() => sfx(funny), 1900);
      later(() => sfx("drop"), 3050); later(() => sfx("boing"), 3700);
      later(step, 4900);
    };
    step();
  }
  return { run, active: () => !!root, end, cancel: () => end(true) };
})();

/* Live leaderboard along the bottom of the TV.
   Ticker.start({
     theme:  "tribute" | "secrets"
     label:  "🏆 Leaderboard"
     photo:  name => image url
     rows:   () => [{name, score}] or null to hide it (e.g. in the lobby)
     format: score => text (optional)
   })
   It checks rows() a few times a second and only redraws when something changed.
   When a score goes up, that name pops and shows "+points". */
window.Ticker = (() => {
  const THEMES = {
    tribute: { font: '"Rye", Georgia, serif', ink: "#fbf6ea", accent: "#e8b04b", bg1: "#16302a", bg2: "#0d1f18" },
    secrets: { font: '"Cinzel Decorative", "Cinzel", Georgia, serif', ink: "#f4ecdb", accent: "#d9b25f", bg1: "#251a36", bg2: "#0b0a14" },
  };
  const CSS = `
#ticker{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;align-items:center;gap:14px;overflow:hidden;white-space:nowrap;
  padding:8px max(16px,env(safe-area-inset-left,0px)) calc(8px + env(safe-area-inset-bottom,0px));
  background:linear-gradient(180deg,var(--tk-bg1),var(--tk-bg2));border-top:3px solid var(--tk-accent);color:var(--tk-ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  box-shadow:0 -8px 24px rgba(0,0,0,.35);transform:translateY(110%);transition:transform .45s cubic-bezier(.2,1.2,.4,1)}
#ticker.on{transform:none}
#ticker>b{font-family:var(--tk-font);font-weight:400;color:var(--tk-accent);flex:none;font-size:1rem}
#ticker .tk-l{display:flex;gap:18px;overflow:hidden;min-width:0;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}
#ticker .tk-c{flex:none;display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:1rem;text-transform:uppercase;letter-spacing:.02em}
#ticker .tk-c img{width:28px;height:28px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px var(--tk-accent)}
#ticker .tk-c i{font-style:normal;font-weight:800;color:var(--tk-accent);font-variant-numeric:tabular-nums}
#ticker .tk-c .tk-r{opacity:.7;font-size:.85rem}
#ticker .tk-c.bump{animation:tk-bump .9s cubic-bezier(.2,1.6,.4,1)}
#ticker .tk-c em{font-style:normal;font-weight:800;color:#7dff9e;font-size:.85rem;animation:tk-plus 1.8s ease-out both}
@keyframes tk-bump{30%{transform:scale(1.25);color:var(--tk-accent)}}
@keyframes tk-plus{0%{opacity:0;transform:translateY(10px)}20%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-12px)}}
body.has-ticker{padding-bottom:52px}
@media (prefers-reduced-motion:reduce){#ticker,#ticker *{animation:none!important;transition:none!important}}`;
  let el = null, last = "", prev = {}, timer = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function start(o) {
    const T = THEMES[o.theme] || THEMES.tribute, fmt = o.format || (n => Number(n || 0).toLocaleString());
    if (!document.getElementById("ticker-css")) { const st = document.createElement("style"); st.id = "ticker-css"; st.textContent = CSS; document.head.appendChild(st); }
    if (!el) {
      el = document.createElement("div"); el.id = "ticker"; el.setAttribute("aria-label", o.label || "Leaderboard");
      el.style.cssText = `--tk-font:${T.font};--tk-ink:${T.ink};--tk-accent:${T.accent};--tk-bg1:${T.bg1};--tk-bg2:${T.bg2}`;
      document.body.appendChild(el);
    }
    clearInterval(timer);
    timer = setInterval(() => {
      let rows = null;
      try { rows = o.rows(); } catch (e) { rows = null; }
      const show = !!(rows && rows.length);
      el.classList.toggle("on", show); document.body.classList.toggle("has-ticker", show);
      if (!show) { prev = {}; last = ""; return; }
      rows = rows.slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
      const key = rows.map(r => r.name + ":" + r.score).join("|");
      if (key === last) return;
      last = key;
      let rank = 0, before = null;
      el.innerHTML = `<b>${esc(o.label || "🏆 Leaderboard")}</b><div class="tk-l">${rows.map((r, i) => {
        if (r.score !== before) { rank = i + 1; before = r.score; }
        const gain = prev[r.name] != null && r.score > prev[r.name] ? r.score - prev[r.name] : 0;
        return `<span class="tk-c ${gain ? "bump" : ""}"><span class="tk-r">${rank === 1 && r.score > 0 ? "👑" : "#" + rank}</span>${o.photo ? `<img src="${esc(o.photo(r.name))}" alt="">` : ""}${esc(r.name)} <i>${fmt(r.score)}</i>${gain ? `<em>+${fmt(gain)}</em>` : ""}</span>`;
      }).join("")}</div>`;
      prev = Object.fromEntries(rows.map(r => [r.name, r.score]));
    }, 300);
    // more players than fit: glide back and forth so everyone gets seen
    if (!start.glide) { let dir = 1, wait = 0; start.glide = setInterval(() => {
      const l = el && el.querySelector(".tk-l"); if (!l) return;
      const max = l.scrollWidth - l.clientWidth; if (max <= 4) { l.scrollLeft = 0; return; }
      if (wait > 0) { wait--; return; }
      l.scrollLeft += dir; if (l.scrollLeft >= max - 1 || l.scrollLeft <= 0) { dir = -dir; wait = 60; }
    }, 30); }
  }
  return { start };
})();

/* "How to play": the steps light up one at a time while the announcer voice reads them.
   Rules.run({
     theme:   "tribute" | "secrets" | "feud"
     title:   "How to play"
     steps:   [["📱", "On your phone, type who you think it is."], ...]
     sound:   () => true/false       read out loud only when the game's sound is on
     onReady: () => {}               the host clicked Ready (or pressed Space)
     onBack:  () => {}               optional: the host clicked Back to setup (or pressed Esc); nothing starts
     photo:   name => url            optional: show each checked-in player's photo, lighting up when they tap Got it
   }) */
window.Rules = (() => {
  const THEMES = {
    tribute: { font: '"Rye", Georgia, serif', ink: "#fbf6ea", accent: "#e8b04b", accent2: "#b8322a", bg1: "#16302a", bg2: "#0d1f18", btnInk: "#2a1c05" },
    secrets: { font: '"Cinzel Decorative", "Cinzel", Georgia, serif', ink: "#f4ecdb", accent: "#d9b25f", accent2: "#a3182b", bg1: "#251a36", bg2: "#0b0a14", btnInk: "#2b1d12" },
    feud: { font: '"Bungee", Impact, sans-serif', ink: "#ffffff", accent: "#ffc92e", accent2: "#e3232c", bg1: "#1846c4", bg2: "#060b26", btnInk: "#3a2000" },
  };
  const CSS = `
#rules{position:fixed;inset:0;z-index:2147483001;display:flex;overflow:auto;color:var(--ru-ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  background:radial-gradient(ellipse at 50% 30%,var(--ru-bg1),var(--ru-bg2) 75%);padding:24px 16px;box-sizing:border-box}
#rules .ru-in{margin:auto;width:100%;max-width:980px;display:grid;gap:clamp(8px,1.5vh,16px);justify-items:center;text-align:center}
#rules h1{margin:0;font-family:var(--ru-font);font-weight:400;font-size:clamp(2rem,min(5.5vw,8vh),4.2rem);line-height:1;color:var(--ru-accent);text-shadow:0 4px 0 var(--ru-accent2);animation:ru-pop .6s cubic-bezier(.2,1.5,.4,1) both}
#rules .ru-sub{font-weight:700;opacity:.8;font-size:clamp(1rem,2vw,1.25rem)}
#rules ol{list-style:none;margin:0;padding:0;display:grid;gap:clamp(5px,1vh,10px);width:100%;text-align:left}
#rules li{display:flex;align-items:center;gap:16px;padding:clamp(6px,1.1vh,13px) 18px;border-radius:14px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 2px rgba(255,255,255,.12);
  font-size:clamp(1rem,min(2.2vw,2.9vh),1.5rem);font-weight:700;line-height:1.25;opacity:.4;transition:opacity .35s,transform .35s,box-shadow .35s,background .35s}
#rules li .ru-ic{font-size:1.6em;flex:none;width:1.4em;text-align:center}
#rules li.seen{opacity:.85}
#rules li.now{opacity:1;transform:scale(1.03);background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 3px var(--ru-accent),0 0 30px color-mix(in srgb,var(--ru-accent) 35%,transparent)}
#rules .ru-ctl{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:4px}
#rules button{font:inherit;font-weight:800;border:0;cursor:pointer;border-radius:14px;padding:.75em 1.5em;font-size:clamp(1rem,2vw,1.3rem)}
#rules .ru-go{background:var(--ru-accent);color:var(--ru-btn);box-shadow:0 5px 0 color-mix(in srgb,var(--ru-accent) 55%,#000);animation:ru-throb 1.3s ease-in-out infinite}
#rules .ru-again{background:rgba(255,255,255,.08);color:var(--ru-ink);box-shadow:inset 0 0 0 2px rgba(255,255,255,.3)}
#rules button:focus-visible{outline:3px solid var(--ru-accent);outline-offset:3px}
#rules .ru-hint{font-size:.85rem;opacity:.65}
#rules .ru-ready{font-weight:800;font-size:clamp(1rem,2vw,1.35rem);color:var(--ru-accent)}
#rules .ru-ready b{font-family:var(--ru-font);font-weight:400;font-size:1.5em;margin-right:.15em}
#rules .ru-ready.all{animation:ru-throb 1.1s ease-in-out infinite}
#rules .ru-faces{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:6px}
#rules .ru-face{position:relative;display:grid;justify-items:center;gap:3px;font-size:.72rem;font-weight:800;text-transform:uppercase;color:var(--ru-ink);opacity:.4;filter:grayscale(.9);transition:opacity .3s,filter .3s}
#rules .ru-face img{width:clamp(30px,3.2vw,42px);aspect-ratio:1;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(255,255,255,.3)}
#rules .ru-face.on{opacity:1;filter:none}
#rules .ru-face.on img{box-shadow:0 0 0 3px var(--ru-accent),0 0 16px color-mix(in srgb,var(--ru-accent) 60%,transparent)}
#rules .ru-face.on::before{content:"✓";position:absolute;top:-4px;right:-4px;z-index:1;width:18px;height:18px;border-radius:50%;background:#19a35a;color:#fff;display:grid;place-items:center;font-size:.7rem;box-shadow:0 0 0 2px #fff}
#rules .ru-face.pop{animation:ru-pop .5s cubic-bezier(.2,1.8,.4,1)}
#rules .ru-ready small{display:block;font-weight:600;font-size:.7em;color:var(--ru-ink);opacity:.7;margin-top:2px}
@keyframes ru-pop{from{transform:scale(.5);opacity:0}}
@keyframes ru-throb{50%{transform:scale(1.06)}}
@media (prefers-reduced-motion:reduce){#rules *{animation:none!important;transition:none!important}}
#walkout .wo-back,#rules .ru-back{position:absolute;top:max(14px,env(safe-area-inset-top,0px));left:max(14px,env(safe-area-inset-left,0px));z-index:2;font:inherit;font-weight:800;font-size:.95rem;
  color:#fff;background:rgba(0,0,0,.35);border:0;border-radius:10px;padding:.5em .95em;box-shadow:inset 0 0 0 2px rgba(255,255,255,.3);cursor:pointer}
#walkout .wo-back:hover,#rules .ru-back:hover{box-shadow:inset 0 0 0 2px #fff}`;
  let root = null, ready = null, onBack = null, timers = [], soundOn = () => true, run_id = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clear = () => { timers.forEach(clearTimeout); timers = []; try { speechSynthesis.cancel(); } catch (e) {} };
  function onKey(e) {
    if (!root) return;
    if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); go(); }
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); go(true); }
  }
  function go(back) {
    if (!root) return;
    clear(); window.removeEventListener("keydown", onKey, true);
    root.remove(); root = null;
    const f = back === true ? onBack : ready; ready = null; onBack = null; if (f) f();   // Back to setup: don't start the game
  }
  /* light each step and read it; the next one starts when the voice finishes (or after a fair pause) */
  function read(title, steps) {
    clear(); const id = ++run_id;
    const items = [...root.querySelectorAll("li")];
    items.forEach(li => li.classList.remove("now", "seen"));
    const voice = soundOn() && window.speechSynthesis;
    const speak = (text, then) => {
      if (!voice) { timers.push(setTimeout(then, 1400)); return; }
      let done = false; const t0 = Date.now();
      const next = () => { if (done || id !== run_id) return; const wait = 1500 - (Date.now() - t0); // each step stays lit at least 1.5s
        if (wait > 0) { timers.push(setTimeout(next, wait)); return; } done = true; then(); };
      try {
        const u = new SpeechSynthesisUtterance(text); u.rate = 1; u.pitch = .95; u.onend = next; u.onerror = next;
        speechSynthesis.speak(u);
      } catch (e) {}
      timers.push(setTimeout(next, 1500 + text.length * 75)); // in case the voice never says it's done
    };
    let i = -1;
    const step = () => {
      if (!root || id !== run_id) return;
      if (i >= 0) { items[i].classList.remove("now"); items[i].classList.add("seen"); }
      i++;
      if (i >= steps.length) { speak("When everyone's ready, press Ready!", () => {}); return; }
      items[i].classList.add("now"); items[i].scrollIntoView({ block: "nearest", behavior: "smooth" });
      speak(steps[i][1].replace(/[^\p{L}\p{N}\s.,!?'’:;#-]/gu, ""), step);
    };
    speak(title, step);
  }
  function run(o) {
    if (root) return;
    const T = THEMES[o.theme] || THEMES.tribute, title = o.title || "How to play", steps = o.steps || [];
    soundOn = o.sound || (() => true); ready = o.onReady; onBack = o.onBack || null;
    if (!document.getElementById("rules-css")) { const st = document.createElement("style"); st.id = "rules-css"; st.textContent = CSS; document.head.appendChild(st); }
    root = document.createElement("div"); root.id = "rules"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", title);
    root.style.cssText = `--ru-font:${T.font};--ru-ink:${T.ink};--ru-accent:${T.accent};--ru-accent2:${T.accent2};--ru-bg1:${T.bg1};--ru-bg2:${T.bg2};--ru-btn:${T.btnInk}`;
    root.innerHTML = `<button class="ru-back" type="button">↩ Back to setup</button><div class="ru-in"><h1>${esc(title)}</h1>${o.sub ? `<div class="ru-sub">${esc(o.sub)}</div>` : ""}
      <ol>${steps.map(([ic, t]) => `<li><span class="ru-ic" aria-hidden="true">${ic}</span><span>${esc(t)}</span></li>`).join("")}</ol>
      <div class="ru-ctl"><button class="ru-again" type="button">🔊 Read it again</button><button class="ru-go" type="button">Ready! ▶</button></div>
      <div class="ru-ready" aria-live="polite"></div>
      <div class="ru-hint">Space: Ready · Esc: back to setup</div></div>`;
    document.body.appendChild(root);
    root.querySelector(".ru-go").onclick = () => go();
    root.querySelector(".ru-back").onclick = () => go(true);
    root.querySelector(".ru-again").onclick = () => read(title, steps);
    window.addEventListener("keydown", onKey, true);
    read(title, steps);
    watchReady(o.theme, o.photo);
  }
  // how many phones tapped "Got it!" (shown under the buttons)
  let readyT = 0;
  function watchReady(theme, photo) {
    clearInterval(readyT); let shown = new Set();
    const g = { secrets: "ds", feud: "df" }[theme] || "", word = theme === "tribute" ? "tributes" : "players";
    const post = body => fetch("/api/host", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ g, ...body }) });
    post({ action: "readyReset" }).catch(() => {});
    const show = async () => {
      if (!root) return clearInterval(readyT);
      try {
        const d = await (await fetch(`/api/host?ready=1${g ? "&g=" + g : ""}`, { cache: "no-store" })).json();
        const players = d.players || [], ready = (d.ready || []).filter(n => players.includes(n)), el = root && root.querySelector(".ru-ready");
        if (!el) return;
        const waiting = players.filter(n => !ready.includes(n)), all = players.length && !waiting.length;
        el.classList.toggle("all", !!all);
        el.innerHTML = !players.length ? "" : all ? `✅ All <b>${players.length}</b> ${word} are ready!`
          : `✅ <b>${ready.length}</b> of ${players.length} ${word} ready${waiting.length <= 4 ? `<small>Waiting on ${waiting.map(esc).join(", ")}</small>` : ""}`;
        // everyone checked in on a phone, lighting up as they tap Got it
        if (photo && players.length) el.innerHTML += `<div class="ru-faces">${players.map(n => `<div class="ru-face ${ready.includes(n) ? "on" : ""} ${ready.includes(n) && !shown.has(n) ? "pop" : ""}" title="${esc(n)}"><img src="${esc(photo(n))}" alt="${esc(n)}"></div>`).join("")}</div>`;
        shown = new Set(ready);
      } catch (e) {}
    };
    setTimeout(show, 600); readyT = setInterval(show, 1500);
  }
  return { run, active: () => !!root, go };
})();

/* 🎵 Lobby music: Carsyn's own tracks, one per game, looped.
   A game with a track calls LobbyMusic.start(game) from playSong("lobby") instead of its own lobby tune; stopSong() calls LobbyMusic.stop().
   A game set to null plays its own lobby music. */
window.LobbyMusic = (() => {
  const TRACKS = {
    tribute: "/sfx/lobby-tribute.m4a",   // Caesar Flick, from 0:06.55 (the flashy host: presenting the tributes)
    feud: "/sfx/lobby-feud.m4a",         // track 2, from 0:13 (upbeat, game show)
    secrets: "/sfx/lobby-secrets.m4a",   // The Hanging Tree, from 1:34 (dark and haunting: the mystery game)
  };
  let ac = null, buf = null, bufFor = null, loading = null, src = null, gain = null, want = false, SRC = null;
  function load() {
    if (buf && bufFor === SRC) return Promise.resolve(buf);
    if (bufFor !== SRC) { buf = null; loading = null; }
    bufFor = SRC;
    return loading = loading || fetch(SRC).then(r => r.arrayBuffer())
      .then(a => new Promise((ok, no) => ac.decodeAudioData(a, ok, no))).then(b => (buf = b));
  }
  // browsers keep sound muted until a tap: unlock this player on the first click anywhere, so it can start on its own later
  const unlock = () => { try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) {} };
  ["pointerdown", "keydown"].forEach(ev => addEventListener(ev, unlock, { capture: true, passive: true }));
  async function start(game) {
    want = true; SRC = TRACKS[game] || SRC;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      await load();
      if (!want || src) return;
      gain = ac.createGain(); gain.gain.value = .0001; gain.connect(ac.destination); gain.gain.setTargetAtTime(.9, ac.currentTime, .15);
      src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(gain); src.start();
    } catch (e) { loading = null; }
  }
  // if the browser held the track back (no recent tap), start it on the next tap, click or key press
  ["pointerdown", "keydown", "touchstart"].forEach(ev => addEventListener(ev, () => { if (want && ac && ac.state === "suspended") { ac.resume(); } if (want && !src && ac) start(); }, true));
  function stop() {
    want = false;
    if (!src) return;
    const s = src, g = gain; src = null; gain = null;
    try { g.gain.setTargetAtTime(.0001, ac.currentTime, .12); } catch (e) {}
    setTimeout(() => { try { s.stop(); g.disconnect(); } catch (e) {} }, 600);
  }
  function duck(v) { if (gain) gain.gain.setTargetAtTime(v, ac.currentTime, .1); }
  return { start, stop, duck, playing: () => !!src, has: game => !!TRACKS[game] };
})();

/* ⏰ The last 10 seconds to answer: a giant see-through countdown, red edges getting hotter, a heartbeat thump.
   Hurry.show(secondsLeft, soundOn) every tick while answering; Hurry.hide() when answers lock. */
window.Hurry = (() => {
  const CSS = `
#hurry{position:fixed;inset:0;z-index:2147482000;pointer-events:none;display:grid;place-items:center;
  box-shadow:inset 0 0 calc(60px + var(--h)*140px) calc(8px + var(--h)*46px) rgba(227,35,44,calc(.3 + var(--h)*.5));animation:hu-throb 1s ease-in-out infinite}
#hurry .hn{font:900 min(40vw,56vh)/1 system-ui,-apple-system,"Segoe UI",sans-serif;color:rgba(255,70,70,.26);-webkit-text-stroke:5px rgba(255,255,255,.4);animation:hu-in .9s ease-out both}
#hurry .ht{position:absolute;top:3.5%;font:900 clamp(1.3rem,3.2vw,2.6rem)/1 system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;background:#e3232c;padding:.25em .9em;border-radius:12px;
  box-shadow:0 0 0 4px #ffc92e,0 10px 30px rgba(0,0,0,.4);letter-spacing:.04em;animation:hu-beat .5s ease-in-out infinite alternate}
@keyframes hu-in{from{transform:scale(1.7);opacity:0}to{transform:none;opacity:1}}
@keyframes hu-beat{to{transform:scale(1.08)}}
@keyframes hu-throb{50%{opacity:.75}}
@media (prefers-reduced-motion:reduce){#hurry,#hurry *{animation:none!important}}`;
  let el = null, last = null, ac = null;
  function thump(left) {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume();
      const t = ac.currentTime + .01;
      [0, .16].forEach((d, k) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(k ? 70 : 85, t + d); o.frequency.exponentialRampToValueAtTime(40, t + d + .18);
        o.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(.0001, t + d); g.gain.exponentialRampToValueAtTime(left <= 3 ? .9 : .6, t + d + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d + .22); o.start(t + d); o.stop(t + d + .25); });
    } catch (e) {}
  }
  function show(left, sound) {
    if (left == null || left <= 0) return hide();
    if (left === last) return; last = left;
    if (!document.getElementById("hurry-css")) { const st = document.createElement("style"); st.id = "hurry-css"; st.textContent = CSS; document.head.appendChild(st); }
    if (!el) { el = document.createElement("div"); el.id = "hurry"; el.setAttribute("aria-hidden", "true"); document.body.appendChild(el); }
    el.style.setProperty("--h", Math.max(0, Math.min(1, (10 - left) / 9)).toFixed(2));
    el.innerHTML = `<div class="ht">⏰ HURRY! Lock it in!</div><div class="hn">${left}</div>`;
    if (sound) thump(left);
  }
  function hide() { if (el) el.remove(); el = null; last = null; }
  return { show, hide };
})();

/* 🔊 the same safety net for each game's own music: any sound the browser held back starts on the next tap or key press */
(() => {
  const wake = () => { try { if (typeof AC !== "undefined" && AC && AC.state === "suspended") AC.resume(); } catch (e) {} };
  ["pointerdown", "keydown", "touchstart"].forEach(ev => addEventListener(ev, wake, true));
})();

/* 🏆 A recorded track for a big moment (District Feud's winner reveal).
   Track.preload(url) early (decodes it ahead of time), Track.play(url) at the moment (loops), Track.stop() fades out.
   If the browser held sound back, it starts on the next tap or key press. */
window.Track = (() => {
  let ac = null, src = null, gain = null, want = null;
  const bufs = {};
  const ctx = () => { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); return ac; };
  function load(url) {
    if (!bufs[url]) bufs[url] = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(a => new Promise((ok, no) => ctx().decodeAudioData(a, ok, no))).catch(e => { delete bufs[url]; throw e; });
    return bufs[url];
  }
  function preload(url) { try { ctx(); load(url).catch(() => {}); } catch (e) {} }
  async function play(url) {
    want = url;
    try {
      ctx(); const b = await load(url);
      if (want !== url || src) return true;
      gain = ac.createGain(); gain.gain.value = .0001; gain.connect(ac.destination); gain.gain.setTargetAtTime(.95, ac.currentTime, .08);
      src = ac.createBufferSource(); src.buffer = b; src.loop = true; src.connect(gain); src.start();
      return true;
    } catch (e) { return false; }
  }
  function stop() {
    want = null; if (!src) return;
    const s = src, g = gain; src = null; gain = null;
    try { g.gain.setTargetAtTime(.0001, ac.currentTime, .15); } catch (e) {}
    setTimeout(() => { try { s.stop(); g.disconnect(); } catch (e) {} }, 700);
  }
  ["pointerdown", "keydown", "touchstart"].forEach(ev => addEventListener(ev, () => { if (want && ac && ac.state === "suspended") ac.resume(); if (want && !src) play(want); }, true));
  return { preload, play, stop, playing: () => !!src };
})();

/* ⏭️ A tiny, faint "skip to end" button in the bottom-left corner of the TV, so Carsyn can test the end music.
   SkipEnd.add(fn): fn jumps the game to its ending. Asks first, since it ends the game in progress. */
window.SkipEnd = { add(fn) {
  const b = document.createElement("button");
  b.textContent = "⏭ skip to end"; b.title = "Test: jump to the end of the game";
  b.style.cssText = "position:fixed;left:4px;bottom:4px;z-index:99999;font:10px system-ui,sans-serif;padding:2px 6px;border-radius:6px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.35);color:rgba(255,255,255,.55);opacity:.35;cursor:pointer";
  b.onmouseenter = () => b.style.opacity = "1"; b.onmouseleave = () => b.style.opacity = ".35";
  b.onclick = e => { e.stopPropagation(); b.blur(); if (confirm("Skip to the end of the game? (for testing the end music)")) try { fn(); } catch (err) { console.error(err); } };
  // sit just above anything pinned to the bottom (like the leaderboard strip)
  const lift = () => { try {
    b.style.visibility = "hidden"; let el = document.elementFromPoint(40, innerHeight - 4), up = 0;
    while (el && el !== document.body) { if (getComputedStyle(el).position === "fixed") { up = Math.max(0, innerHeight - el.getBoundingClientRect().top); break; } el = el.parentElement; }
    b.style.bottom = (up ? up + 4 : 4) + "px";
  } catch (e) {} finally { b.style.visibility = ""; } };
  (document.body ? Promise.resolve() : new Promise(r => addEventListener("DOMContentLoaded", r))).then(() => { document.body.appendChild(b); lift(); setInterval(lift, 700); });
} };

/* 🔊 Music on/off pinned to the top-left of the TV, so it's one quick click instead of scrolling to the bottom.
   Hides itself whenever the screen already shows its own Music button near the top. */
window.MusicPill = { add({ on, toggle }) {
  const b = document.createElement("button"); b.type = "button"; b.id = "musicpill";
  b.style.cssText = "position:fixed;left:14px;top:14px;z-index:99998;font:800 15px/1 system-ui,-apple-system,'Segoe UI',sans-serif;padding:9px 14px;border-radius:999px;border:0;cursor:pointer;" +
    "color:#fff;background:rgba(0,0,0,.55);box-shadow:inset 0 0 0 2px rgba(255,255,255,.4),0 4px 14px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)";
  const paint = () => {
    let state = false; try { state = !!on(); } catch (e) {}
    b.textContent = state ? "🔊 Music on" : "🔇 Music off"; b.setAttribute("aria-pressed", state);
    const own = document.getElementById("snd"), r = own && own.getBoundingClientRect();
    b.hidden = !!(r && r.width && r.top >= 0 && r.bottom <= innerHeight);   // the screen already shows its own Music button
    if (!b.hidden) place();
  };
  // top-left corner; if another button is already there (like "Back to setup"), slide down just below it
  const blocker = () => {
    const r = b.getBoundingClientRect(); b.style.visibility = "hidden";
    try {
      for (const [x, y] of [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]]) {
        const el = document.elementFromPoint(x, y), hit = el && el.closest && el.closest("button,a,input,select,[role=button]");
        if (hit) return hit;
      }
      return null;
    } finally { b.style.visibility = ""; }
  };
  function place() {
    b.style.left = "14px"; b.style.top = "14px";
    for (let n = 0; n < 4; n++) {
      const hit = blocker(); if (!hit) return;
      const below = Math.round(hit.getBoundingClientRect().bottom + 8);
      if (below > 140) { b.hidden = true; return; }   // a menu is open there: step aside until it closes
      b.style.top = below + "px";
    }
  }
  b.onclick = e => { e.stopPropagation(); try { toggle(); } catch (err) { console.error(err); } b.blur(); paint(); };
  (document.body ? Promise.resolve() : new Promise(r => addEventListener("DOMContentLoaded", r))).then(() => { document.body.appendChild(b); paint(); setInterval(paint, 400); });
} };
