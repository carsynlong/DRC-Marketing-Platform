/* ================= PHONE SOUND (play.html) =================
   Short sound effects for every moment, plus optional music.
   All sounds are made in the browser (no audio files). Music uses public-domain carols.
   Phones can only make sound after the first tap, so the first tap on the page unlocks it.
   Settings are remembered on this phone. */
const PFX = (() => {
  const KEY = "tribute-sound";
  let prefs = { sound: true, music: false };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} };

  let AC = null, sfxBus, musicBus, noiseBuf;
  function ready() {
    try {
      if (!AC) {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        const master = AC.createGain(); master.gain.value = .8; master.connect(AC.destination);
        sfxBus = AC.createGain(); sfxBus.gain.value = .9; sfxBus.connect(master);
        musicBus = AC.createGain(); musicBus.gain.value = .35; musicBus.connect(master);
        noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (AC.state === "suspended") AC.resume();
      return true;
    } catch (e) { return false; }
  }
  // iOS only counts touchend / click as a gesture that may start audio (pointerdown isn't one), so listen for all three
  const unlock = () => { ready(); if (prefs.music && wantSong && !song) music(wantSong); };
  ["pointerdown", "touchend", "click"].forEach(t => document.addEventListener(t, unlock, true));

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dec); }
  function osc(type, f, t, dur, vol, dest, cut, glide) {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    let n = o; if (cut) { const fl = AC.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = cut; o.connect(fl); n = fl; }
    n.connect(g); g.connect(dest); env(g, t, .006, vol, dur); o.start(t); o.stop(t + dur + .05);
  }
  function noise(t, dur, vol, dest, type, freq, q) {
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noiseBuf;
    f.type = type; f.frequency.value = freq; if (q) f.Q.value = q; s.connect(f); f.connect(g); g.connect(dest);
    env(g, t, .003, vol, dur); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  const bells = (t, n, vol = .1) => { for (let k = 0; k < n; k++) noise(t + k * .05, .08, vol, sfxBus, "bandpass", 9000, 1.3); };

  /* ---- sound effects ---- */
  const SFX = {
    tap: t => osc("triangle", 1040, t, .08, .14, sfxBus),
    // a slip of paper drawn from the reaping bowl
    reap: t => { noise(t, .25, .25, sfxBus, "bandpass", 3000, .7); [76, 81, 88].forEach((m, k) => osc("sine", hz(m), t + .2 + k * .09, .7, .14, sfxBus)); },
    // an original three-note whistle: the face is up
    whistle: t => [[79, 0, .22], [84, .24, .22], [88, .48, .55]].forEach(([m, d, l]) => { osc("sine", hz(m), t + d, l, .22, sfxBus); osc("sine", hz(m) * 2, t + d, l * .6, .03, sfxBus); }),
    // arrow released ... and it hits the target
    lock: t => { noise(t, .18, .35, sfxBus, "highpass", 2500); osc("triangle", 900, t, .16, .1, sfxBus, 0, 300);
      osc("sine", 140, t + .2, .25, .55, sfxBus, 0, 60); noise(t + .2, .1, .4, sfxBus, "lowpass", 900); },
    // the arena cannon: time is up
    cannon: t => { noise(t, 1.8, .9, sfxBus, "lowpass", 380); osc("sine", 90, t, 1.2, .9, sfxBus, 0, 26); },
    right: t => { [72, 76, 79, 84].forEach((m, k) => { osc("square", hz(m), t + k * .08, .25, .07, sfxBus, 3500); osc("sine", hz(m + 12), t + k * .08, .6, .06, sfxBus); }); bells(t + .3, 10); },
    wrong: t => { osc("sawtooth", 220, t, .28, .12, sfxBus, 900, 160); osc("sawtooth", 165, t + .3, .5, .12, sfxBus, 900, 110); },
    // a sponsor parachute drifting down
    gift: t => { noise(t, .9, .2, sfxBus, "bandpass", 1200, .5); bells(t + .2, 14, .09); osc("sine", hz(88), t + .9, .8, .12, sfxBus); },
    points: t => { for (let k = 0; k < 8; k++) osc("triangle", hz(84 + (k % 4) * 2), t + k * .06, .08, .08, sfxBus); },
    // a tracker jacker getting swatted
    buzz: t => { const o = AC.createOscillator(), g = AC.createGain(), lfo = AC.createOscillator(), lg = AC.createGain();
      o.type = "sawtooth"; o.frequency.value = 190; lfo.frequency.value = 38; lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
      o.connect(g); g.connect(sfxBus); env(g, t, .01, .12, .45); o.start(t); lfo.start(t); o.stop(t + .5); lfo.stop(t + .5);
      noise(t + .42, .12, .4, sfxBus, "lowpass", 600); },
    gong: t => { osc("sine", hz(45), t, 2.2, .35, sfxBus); osc("sine", hz(57), t, 1.8, .14, sfxBus); noise(t, .5, .18, sfxBus, "bandpass", 600, 2); },
    fire: t => { noise(t, .9, .3, sfxBus, "bandpass", 700, .6); noise(t + .1, .6, .2, sfxBus, "highpass", 4000); },
    win: t => { [[60, 0], [64, .15], [67, .3], [72, .45], [67, .75], [72, .9]].forEach(([m, d], k) => { const l = k === 5 ? 1.6 : .3;
      osc("square", hz(m + 12), t + d, l, .09, sfxBus, 3000); osc("triangle", hz(m), t + d, l, .1, sfxBus); });
      [48, 55, 60].forEach(m => osc("triangle", hz(m), t + .9, 1.6, .12, sfxBus)); bells(t + .9, 16); },
  };
  function sfx(kind) { if (!prefs.sound || !SFX[kind] || !ready()) return; SFX[kind](AC.currentTime + .02); }

  /* ---- music: soft public-domain carol loops while you wait (off by default) ---- */
  const seq = (mel, inst) => { let b = 0; const ev = []; mel.forEach(([m, d]) => { if (m) ev.push([b, inst, m + 12, d]); b += d; }); return ev; };
  const INST = {
    lead: (t, m, d) => { osc("triangle", hz(m), t, d * .9, .12, musicBus, 2600); },
    bell: (t, m, d) => { osc("sine", hz(m), t, 1, .14, musicBus); osc("sine", hz(m) * 2.76, t, .3, .03, musicBus); },
    bass: (t, m, d) => osc("triangle", hz(m), t, d * .9, .22, musicBus, 800),
  };
  const SONGS = {
    // "Jingle Bells" chorus (1857)
    jingle: (() => { const L1 = [[64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4]];
      const L2 = [[65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[67,1],[67,1],[65,1],[62,1],[60,4]];
      const ev = seq([...L1, ...L2], "bell"); [36,36,41,36,36,43,36,36].forEach((r, i) => ev.push([i * 4, "bass", r, 2], [i * 4 + 2, "bass", r + 7, 2]));
      return { bpm: 140, len: 32, ev }; })(),
    // "Deck the Halls" (traditional Welsh)
    deck: (() => { const A = [[67,1.5],[65,.5],[64,1],[62,1],[60,1],[62,1],[64,1],[60,1],[62,.5],[64,.5],[65,.5],[62,.5],[64,1.5],[62,.5],[60,1],[59,1],[60,2],[0,2]];
      const ev = seq(A, "lead"); [36,43,36,43,36,43,36,36,36].forEach((r, i) => ev.push([i * 2, "bass", r, 1], [i * 2 + 1, "bass", r + 12, 1]));
      return { bpm: 120, len: 18, ev }; })(),
  };
  let song = null, wantSong = null, timer = 0;
  function music(name) {
    wantSong = name;
    if (!prefs.music || !name) return stopMusic();
    if (song === SONGS[name]) return;
    stopMusic(); if (!ready()) return;
    song = SONGS[name];
    const evs = song.ev.slice().sort((a, b) => a[0] - b[0]); let i = 0, start = AC.currentTime + .1;
    timer = setInterval(() => {
      const spb = 60 / song.bpm;
      while (true) { const e = evs[i], t = start + e[0] * spb; if (t > AC.currentTime + .15) break;
        if (t >= AC.currentTime - .02) INST[e[1]](t, e[2], e[3] * spb);
        if (++i >= evs.length) { i = 0; start += song.len * spb; } }
    }, 30);
  }
  function stopMusic() { clearInterval(timer); timer = 0; song = null; }
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopMusic(); else if (wantSong) music(wantSong); });

  function toggle(which) { prefs[which] = !prefs[which]; save(); ready(); if (which === "music") music(wantSong); if (which === "sound" && prefs.sound) sfx("tap"); }
  return { sfx, music, toggle, prefs };
})();
