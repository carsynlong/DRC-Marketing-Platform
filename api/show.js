// The Christmas Games show (/show) and the phones that join it (/showphone).
// Uses its own "sh:" keys so it never mixes with the three games.
//
// Phones:
//   POST { a:"join",  pid, name }          claim a tribute (one phone per name)
//   POST { a:"leave", pid, name }          give the tribute back ("Not you?")
//   POST { a:"react", pid, name, e }       emoji burst on the TV
//   POST { a:"cam",   pid, name, img }     one camera frame (small JPEG data URL) for the live corner on the TV
//   POST { a:"camoff",pid, name }          stop being live
//   GET  ?a=phone&me=<name>                what the TV is showing right now, my side quest, everyone's points
// Gamemaker (PIN): quest {to,q,ic,secs}, questdone {result}, pointsadd {to,n}, pointsreset, cmd {cmd}
// TV:
//   POST { a:"state", slide }              what's on screen (title + text), for phones to read along
//   GET  ?a=tv&since=<reactId>             new reactions, who's live (with their latest frame), who joined
import { redis, hash, reply, text } from "../lib/redis.js";

const NAMES = ["Jessie","Elisha","Grandad","Dash","Jonny","Carsyn","Tinsley","Natalie","Kamdon","Brandon","QUEEN MOTHER","Kyle"];
const EMOJI = ["🏹", "🔥", "🌹", "🍞", "🐦", "🎁", "😱", "😂", "🎂"];
// each tribute also gets their own district's emojis (same as their profile effects)
const DEMOJI = {Jessie:["💎","✨","💍","👑"],Elisha:["🪨","🧱","🛡️","⚔️"],Grandad:["⚡","🔌","💡","🤖"],Dash:["🐟","🔱","🎣","🫧"],Jonny:["🔋","💥","☀️","⚡"],Carsyn:["🚂","🚆","🚗","✈️"],Tinsley:["🪵","🌲","🪓","🍂"],Natalie:["🧵","🪡","🧶","👗"],Kamdon:["🌾","🍞","🥖","🌽"],Brandon:["🐄","🐑","🐖","🤠"],"QUEEN MOTHER":["🍎","🍑","🚜","🌻"],Kyle:["⛏️","🪨","🔦","🖤"]};
const P = "sh:";
// The Gamemaker's phone remote and twists need this PIN (only Carsyn knows it).
const HOST_PIN = "1185";
const CMDS = ["next", "prev", "close", "intermission", "live", "mute",
  "twist:fire", "twist:storm", "twist:mutts", "twist:freeze", "twist:bonus", "twist:rule", "twist:feast", "clearrule", "points", "sponsor", "sponsor:on", "sponsor:off", "draft", "awards", "photo", "pollreveal", "betlock",
  "chaos:on", "chaos:off", "ticker:on", "ticker:off", "recap", "predictreveal", "board", "crown", "phonetour", "pointsinfo", "briefgo", "click", "goto", "video", "clock:off", "clock:5", "clock:10", "clock:15", "clock:20", "clock:30"];
// 🎙️ soundboard: the TV plays these
const SFX = ["airhorn", "cheer", "applause", "gasp", "laugh", "rimshot", "trombone", "cannon", "drumroll", "siren", "boom", "fanfare"];
const SONGS = ["wu_ride", "wu_snap", "wu_walk", "wu_thunder", "wu_country", "wu_crazytrain", "wu_gangsta", "wu_goingbad", "wu_boom", "wu_hypnotize", "wu_jump", "wu_throat", "hh_cookie", "hh_tribute", "hh_mitten", "hh_feud", "hh_scoop", "hh_secrets", "hh_lrc", "hh_bingo", "hh_lounge", "battle", "march", "board", "lobby"];
const WHY = ["fell asleep", "is cheating", "is on their phone", "is talking trash", "broke the rule", "stole a snack", "is hogging the snacks", "didn't do their side quest"];
const stat = (k, n = 1) => redis.hincrby(P + "stats", k, n);
const jget = async k => { const r = await redis.get(k); try { return r ? (typeof r === "string" ? JSON.parse(r) : r) : null; } catch { return null; } };

const MISSIONS = [
  "Get Grandad to say the word \"turkey\" without asking him to",
  "Sneak the word \"Mockingjay\" into a normal sentence 3 times",
  "Get QUEEN MOTHER to give you a hug",
  "Get someone to hand you a napkin without asking for one",
  "Make someone say \"Merry Christmas\" to you first",
  "Get a high five from 3 different tributes",
  "Get someone to sing any Christmas song",
  "Steal one cookie without anyone noticing",
  "Get Kyle to talk about cars",
  "Get someone to say \"Gamemaker\"",
  "Wink at the Gamemaker 5 times without getting caught",
  "Get 2 people to switch seats without telling them why",
  "Get someone to say \"I'm full\"",
  "Start a slow clap and get 2 people to join"];
const others = (not = []) => NAMES.filter(n => n !== "Carsyn" && !not.includes(n));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const TWISTS = ["wheel", "swap", "silence", "decree", "bounty", "alliance", "mission"];
const LV = ["poll", "bet", "hot", "mercy", "predict", "bday", "race"];
const LVK = LV.map(k => P + "lv:" + k);
const pj = x => { try { return x ? (typeof x === "string" ? JSON.parse(x) : x) : null; } catch { return null; } };
// TV pages that publish their on-screen buttons for the remote (remote-tv.js)
const PAGES = ["show", "wheel", "bingo"];
const BTNK = PAGES.map(p => P + "btns:" + p);
const readLive = async () => { const v = await redis.mget(...LVK); const o = {}; LV.forEach((k, i) => { o[k] = pj(v[i]); }); return o; };
const saveLive = (k, val) => val == null ? redis.del(P + "lv:" + k) : redis.set(P + "lv:" + k, JSON.stringify(val), { ex: 43200 });
// wrong PIN guesses are limited (30 a minute per network; only actual PIN entries count, not background checks)
const pinOk = async (req) => {
  const ip = String(req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || "x").split(",")[0].trim().slice(0, 60);
  if (req.body?.pin === HOST_PIN) return true;
  const n = await redis.incr(P + "pinbad:" + ip); if (n === 1) await redis.expire?.(P + "pinbad:" + ip, 60);
  return false;
};
const pinBlocked = async (req) => { const ip = String(req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || "x").split(",")[0].trim().slice(0, 60);
  return (Number(await redis.get(P + "pinbad:" + ip)) || 0) >= 30; };
const pushCmd = async (cmd, data) => {
  const id = await redis.incr(P + "cmdid");
  await redis.lpush(P + "cmdlog", JSON.stringify({ id, cmd, data, t: Date.now() }));
  await redis.ltrim(P + "cmdlog", 0, 19);
};
const readQuest = async () => { try { const r = await redis.get(P + "quest"); return r ? (typeof r === "string" ? JSON.parse(r) : r) : null; } catch { return null; } };
const points = async () => { const h = await hash(P + "points"); const o = {}; for (const [k, v] of Object.entries(h)) o[k] = Number(v) || 0; return o; };
const owns = async (name, pid) => name && pid && (await redis.hget(P + "players", name)) === pid;

export default async function handler(req, res) {
  try { req.body; } catch { return reply(res, 400, { error: "Bad request" }); }
  try { return await main(req, res); } catch (e) { return reply(res, 500, { error: "Server error" }); }
}

async function main(req, res) {
  const a = req.query?.a ?? req.body?.a;
  // 🔒 any request that carries a PIN: too many wrong guesses from one device = locked out for a minute
  const givenPin = req.body?.pin ?? req.query?.pin;
  if (req.method === "POST" && givenPin !== undefined && givenPin !== null) {
    if (await pinBlocked(req)) return reply(res, 429, { error: "Too many wrong PINs. Wait a minute." });
    if (givenPin !== HOST_PIN) await pinOk(req);
  }

  if (req.method === "GET" && a === "phone") {
    const isGM = text(req.query.me, 40) === "Carsyn";
    const [raw, qraw, ep, ...rest] = await redis.mget(P + "state", P + "quest", P + "epoch", ...LVK, ...(isGM ? BTNK : []));
    const lvv = rest.slice(0, LVK.length), tvbtns = isGM ? {} : undefined;
    if (isGM) PAGES.forEach((pg, i) => { const v = pj(rest[LVK.length + i]); if (v) tvbtns[pg] = v; });
    const slide = pj(raw);
    const me = text(req.query.me, 40), full = req.query.full === "1";
    const q = pj(qraw);
    const quest = q && me && q.to === me && Date.now() - q.t < 5 * 60000 ? q : null;
    const pts = await points();
    let mission;   // undefined = "not checked this time"
    const mine = me && full && req.query.pid && (await redis.hget(P + "players", me)) === String(req.query.pid);
    if (mine) mission = pj(await redis.hget(P + "missions", me)); else if (me && full) mission = null;
    const epoch = Number(ep) || 0;
    const live = {}; LV.forEach((k, i) => { live[k] = pj(lvv[i]); });
    let vote = null, bet = null, walkup = null;
    if (live.poll && live.poll.open) vote = { ...live.poll, mine: me ? await redis.hget(P + "votes:" + live.poll.id, me) : null };
    if (live.bet && live.bet.state !== "paid") { const mb = me ? await redis.hget(P + "bets:" + live.bet.id, me) : null; let mine = null; try { mine = mb ? (typeof mb === "string" ? JSON.parse(mb) : mb) : null; } catch {} bet = { ...live.bet, mine }; }
    if (me && full) walkup = await redis.hget(P + "walkups", me); else walkup = undefined;
    const hot = live.hot ? { id: live.hot.id, to: live.hot.to } : null;
    let mercy = null, predict = null;
    if (live.mercy && live.mercy.open) mercy = { ...live.mercy, mine: me ? await redis.hget(P + "mercy:" + live.mercy.id, me) : null };
    if (live.predict && live.predict.open) predict = { open: true, mine: me ? await redis.hget(P + "predict", me) : null };
    const bday = live.bday && Date.now() - live.bday.t < 120000 ? live.bday : null;
    let race = null;
    if (live.race && live.race.state === "live" && Date.now() - live.race.start < 120000) race = { ...live.race, winner: live.race.winner || (await redis.get(P + "racewin:" + live.race.id)) || null, mine: me ? Number(await redis.hget(P + "race:" + live.race.id, me)) || 0 : 0 };
    // join screen: which faces are already on someone's phone (so they show "on a phone")
    let taken;
    if (!me && full) { const all = await hash(P + "players"), ns = Object.keys(all).filter(n => all[n] !== String(req.query.pid || ""));
      const sv = ns.length ? await redis.mget(...ns.map(n => `${P}seen:${n}`)) : []; taken = ns.filter((n, i) => sv[i]); }
    return reply(res, 200, { slide, quest, points: pts, mission, epoch, vote, bet, walkup, hot, mercy, predict, race, bday, taken, tvbtns, now: Date.now() });
  }

  // sabotage for the online games (sabotage.js)
  if (req.method === "GET" && a === "sab") {
    const me = text(req.query.me, 40); let sab = null;
    if (me) { const r = await redis.hget(P + "sab", me); try { sab = r ? (typeof r === "string" ? JSON.parse(r) : r) : null; } catch {} }
    return reply(res, 200, { sab, now: Date.now() });
  }
  if (req.method === "GET" && a === "sablog") {
    const since = Number(req.query.since) || 0, out = [];
    for (const r of (await redis.lrange(P + "sablog", 0, 9)) || []) { try { const o = typeof r === "string" ? JSON.parse(r) : r; if (o.id > since) out.push(o); } catch {} }
    return reply(res, 200, { sabs: out.reverse() });
  }

  // 📋 results the TV laptop publishes (victors, 2nd places, bingo rounds, tiebreakers), for the Gamemaker's phone
  if (req.method === "GET" && a === "results") {
    return reply(res, 200, { results: await jget(P + "results"), points: await points() });
  }

  if (req.method === "GET" && (a === "asks" || a === "shouts")) {
    if (req.query.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    if (a === "asks") { const lv = await readLive(); if (!lv.hot) return reply(res, 200, { asks: [] });
      const l = (await redis.lrange(P + "asks:" + lv.hot.id, 0, 49)) || []; return reply(res, 200, { hot: lv.hot, asks: l.map((x, i) => { try { const o = typeof x === "string" ? JSON.parse(x) : x; return { i: o.i, q: o.q }; } catch { return null; } }).filter(Boolean) }); }
    const l = (await redis.lrange(P + "shouts", 0, 29)) || [];
    const hl = (await redis.lrange(P + "helps", 0, 19)) || [];
    const helps = hl.map(x => { try { return typeof x === "string" ? JSON.parse(x) : x; } catch { return null; } }).filter(Boolean);
    return reply(res, 200, { helps, shouts: l.map(x => { try { return typeof x === "string" ? JSON.parse(x) : x; } catch { return null; } }).filter(Boolean) });
  }

  // 🩺 health check page: can we write to and read from the database?
  if (req.method === "GET" && a === "ping") {
    const t0 = Date.now(), v = String(t0);
    await redis.set(P + "ping", v, { ex: 600 }); const back = await redis.get(P + "ping");
    return reply(res, 200, { ok: String(back) === v, ms: Date.now() - t0, joined: Object.keys(await hash(P + "players")).length });
  }

  if (req.method === "GET" && a === "stats") {
    const [st, w] = await Promise.all([hash(P + "stats"), hash(P + "walkups")]);
    const o = {}; for (const [k, v] of Object.entries(st)) o[k] = Number(v) || 0;
    return reply(res, 200, { stats: o, walkups: w, points: await points(), joined: Object.keys(await hash(P + "players")) });
  }

  if (req.method === "GET" && a === "cmds") {
    const since = Number(req.query.since) || 0, cmds = [];
    const [clog, last] = await Promise.all([redis.lrange(P + "cmdlog", 0, 19), redis.get(P + "cmdid")]);
    for (const r of clog || []) { try { const o = typeof r === "string" ? JSON.parse(r) : r; if (o.id > since && (o.cmd === "click")) cmds.push(o); } catch {} }
    return reply(res, 200, { cmds: cmds.reverse(), last: Number(last) || 0 });
  }

  if (req.method === "GET" && a === "tv") {
    const since = Number(req.query.since) || 0, csince = Number(req.query.csince) || 0;
    const full = req.query.full === "1";
    const [log, players, cams, clog] = await Promise.all([redis.lrange(P + "reactlog", 0, 39), full ? hash(P + "players") : null, hash(P + "cams"), redis.lrange(P + "cmdlog", 0, 19)]);
    const cmds = [];
    for (const r of clog || []) { try { const o = typeof r === "string" ? JSON.parse(r) : r; if (o.id > csince) cmds.push(o); } catch {} }
    const reacts = [];
    for (const r of log || []) { try { const o = typeof r === "string" ? JSON.parse(r) : r; if (o.id > since) reacts.push(o); } catch {} }
    const now = Date.now(), live = {}, stale = [];
    for (const [name, v] of Object.entries(cams)) {
      try { const o = JSON.parse(v); if (now - o.t < 6000) live[name] = o.img; else stale.push(name); } catch { stale.push(name); }
    }
    if (stale.length) await redis.hdel(P + "cams", ...stale);
    const lv = await readLive();
    let poll = null, bets = null;
    if (lv.poll && lv.poll.open) { const v = await hash(P + "votes:" + lv.poll.id); poll = { ...lv.poll, votes: v }; }
    if (lv.bet && lv.bet.state !== "paid") { const b = await hash(P + "bets:" + lv.bet.id); const o = {}; for (const [k, x] of Object.entries(b)) { try { o[k] = JSON.parse(x); } catch {} } bets = { ...lv.bet, bets: o }; }
    let mercy = null;
    if (lv.mercy && lv.mercy.open) { const v = await hash(P + "mercy:" + lv.mercy.id); let up = 0, down = 0; Object.values(v).forEach(x => x === "up" ? up++ : down++); mercy = { ...lv.mercy, up, down }; }
    let race = null;
    if (lv.race && lv.race.state === "live" && Date.now() - lv.race.start < 120000) { const t = await hash(P + "race:" + lv.race.id); const o = {}; for (const [k, v] of Object.entries(t)) o[k] = Number(v) || 0; race = { ...lv.race, taps: o }; }
    return reply(res, 200, { reacts: reacts.reverse(), live, joined: players ? Object.keys(players) : undefined, cmds: cmds.reverse(), points: full ? await points() : undefined, poll, bets, mercy, race });
  }

  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const pid = text(req.body?.pid, 64), name = text(req.body?.name, 40);

  if ((a === "results" || a === "state" || a === "btns") && req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
  if (a === "results") {
    const r = req.body?.results; if (!r || typeof r !== "object") return reply(res, 400, { error: "Missing results" });
    const j = JSON.stringify({ ...r, t: Date.now() }); if (j.length > 20000) return reply(res, 400, { error: "Too big" });
    await redis.set(P + "results", j, { ex: 60 * 60 * 24 * 3 }); return reply(res, 200, { ok: true });
  }

  if (a === "btns") {
    const pg = req.body?.page; if (!PAGES.includes(pg)) return reply(res, 400, { error: "Unknown page" });
    if (req.body?.gone) { await redis.del(P + "btns:" + pg); return reply(res, 200, { ok: true }); }
    const list = (Array.isArray(req.body?.list) ? req.body.list : []).slice(0, 100)
      .filter(x => Array.isArray(x) && /^\d{1,8}$/.test(String(x[0]))).map(x => [String(x[0]), text(x[1], 60) || "?", x[2] ? 1 : 0]);
    const slides = pg === "show" && Array.isArray(req.body?.slides) ? req.body.slides.slice(0, 80)
      .filter(x => Array.isArray(x) && /^[a-z0-9-]{1,40}$/.test(String(x[0]))).map(x => [String(x[0]), text(x[1], 60) || String(x[0])]) : undefined;
    const o = { page: pg, visible: !!req.body?.visible, title: text(req.body?.title, 80) || "", popup: !!req.body?.popup, list, video: !!req.body?.video, slide: text(req.body?.slide, 40) || "", slides, t: Date.now() };
    await redis.set(P + "btns:" + pg, JSON.stringify(o), { ex: 45 });
    return reply(res, 200, { ok: true });
  }

  if (a === "state") {
    const s = req.body?.slide;
    if (!s || typeof s !== "object") return reply(res, 400, { error: "Missing slide" });
    const clean = { id: text(s.id, 40) || "", n: Number(s.n) || 0, total: Number(s.total) || 0,
      title: (typeof s.title === "string" ? s.title.trim().slice(0, 160) : ""), body: (typeof s.body === "string" ? s.body.slice(0, 900) : ""), todo: typeof s.todo === "string" ? s.todo.trim().slice(0, 220) : "", t: Date.now() };
    await redis.set(P + "state", JSON.stringify(clean), { ex: 60 * 60 * 12 });
    return reply(res, 200, { ok: true });
  }

  if (a === "join") {
    if (!pid || !NAMES.includes(name)) return reply(res, 400, { error: "Unknown name" });
    // a phone checking in from before the Gamemaker cleared the phones must join again
    if (req.body?.epoch != null && Number(req.body.epoch) !== (Number(await redis.get(P + "epoch")) || 0)) return reply(res, 410, { error: "reset" });
    const all = await hash(P + "players");
    if (all[name] && all[name] !== pid && (await redis.get(`${P}seen:${name}`))) return reply(res, 409, { error: "taken" });
    const mine = Object.keys(all).filter(n => all[n] === pid && n !== name);
    if (mine.length) await redis.hdel(P + "players", ...mine);
    await redis.hset(P + "players", { [name]: pid });
    await redis.set(`${P}seen:${name}`, "1", { ex: 120 });
    return reply(res, 200, { me: name, epoch: Number(await redis.get(P + "epoch")) || 0 });
  }

  // "Not you?" on a phone: free the name so someone else can take it
  if (a === "leave") {
    if (!pid || !NAMES.includes(name)) return reply(res, 400, { error: "Unknown name" });
    if ((await redis.hget(P + "players", name)) === pid) { await redis.hdel(P + "players", name); await redis.del(`${P}seen:${name}`); }
    return reply(res, 200, { ok: true });
  }

  // Gamemaker-only actions that only need the PIN (so the laptop host menu can use them too)
  if (a === "sab") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const kind = req.body?.kind;
    if (!["freeze", "bite", "fog", "flip", "jackers"].includes(kind)) return reply(res, 400, { error: "Unknown sabotage" });
    let to = text(req.body?.to, 40);
    if (to === "random") to = pick(others());
    if (!NAMES.includes(to)) return reply(res, 400, { error: "Unknown tribute" });
    const id = await redis.incr(P + "sabid"), allBut = !!req.body?.allBut, s = { id, to, kind, allBut, t: Date.now() };
    if (allBut) { const o = {}; for (const n of others([to])) o[n] = JSON.stringify(s); await redis.hset(P + "sab", o); }
    else await redis.hset(P + "sab", { [to]: JSON.stringify(s) });
    await redis.lpush(P + "sablog", JSON.stringify(s)); await redis.ltrim(P + "sablog", 0, 9);
    if (allBut) { for (const n of others([to])) await stat("sab:" + n); } else await stat("sab:" + to);
    await pushCmd("sab", s);
    return reply(res, 200, { ok: true, sab: s });
  }

  if (["pollopen", "pollclose", "betopen", "betpay", "betcancel"].includes(a)) {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const lv = await readLive();
    if (a === "pollopen") {
      const q = text(req.body?.q, 120); if (!q) return reply(res, 400, { error: "Missing question" });
      lv.poll = { id: Date.now(), q, open: true }; await saveLive("poll", lv.poll);
      await pushCmd("poll", lv.poll); return reply(res, 200, { ok: true, poll: lv.poll });
    }
    if (a === "pollclose") {
      if (!lv.poll || !lv.poll.open || !(await redis.set(P + "pollclosed:" + lv.poll.id, "1", { nx: true, ex: 43200 }))) return reply(res, 409, { error: "No vote running" });
      const v = await hash(P + "votes:" + lv.poll.id), c = {};
      for (const x of Object.values(v)) c[x] = (c[x] || 0) + 1;
      const max = Math.max(0, ...Object.values(c)), win = Object.keys(c).filter(k => c[k] === max && max > 0);
      for (const w of win) await stat("votewin:" + w);
      lv.poll.open = false; await saveLive("poll", lv.poll);
      await pushCmd("pollresult", { ...lv.poll, counts: c, win }); return reply(res, 200, { ok: true, counts: c, win });
    }
    if (a === "betopen") {
      lv.bet = { id: Date.now(), game: text(req.body?.game, 60) || "the next game", state: "open" };
      await saveLive("bet", lv.bet); await pushCmd("betopen", lv.bet); return reply(res, 200, { ok: true, bet: lv.bet });
    }
    if (!lv.bet || lv.bet.state === "paid") return reply(res, 409, { error: "No betting round" });
    if (a === "betpay" && !NAMES.includes(text(req.body?.winner, 40))) return reply(res, 400, { error: "Unknown tribute" });
    if (!(await redis.set(P + "betdone:" + lv.bet.id, "1", { nx: true, ex: 43200 }))) return reply(res, 409, { error: "Already settled" });
    if (a === "betcancel") { lv.bet.state = "paid"; await saveLive("bet", lv.bet); await pushCmd("betcancel", {}); return reply(res, 200, { ok: true }); }
    const winner = text(req.body?.winner, 40); if (!NAMES.includes(winner)) return reply(res, 400, { error: "Unknown tribute" });
    const b = await hash(P + "bets:" + lv.bet.id), results = [];
    for (const [who, raw] of Object.entries(b)) { let x; try { x = JSON.parse(raw); } catch { continue; }
      const n = x.on === winner ? x.amt : -x.amt; await redis.hincrby(P + "points", who, n); results.push({ who, on: x.on, amt: x.amt, n }); }
    lv.bet.state = "paid"; await saveLive("bet", lv.bet);
    await pushCmd("betpaid", { winner, game: lv.bet.game, results }); return reply(res, 200, { ok: true, results });
  }
  // 🧹 wipe only the end-of-night award stats (emoji counts, sabotages, snitches, quests...)
  if (a === "statsreset") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    await redis.del(P + "stats"); return reply(res, 200, { ok: true });
  }
  if (a === "helpdone") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const id = Number(req.body?.id), l = (await redis.lrange(P + "helps", 0, 19)) || [];
    for (const x of l) { let o; try { o = typeof x === "string" ? JSON.parse(x) : x; } catch { continue; } if (o.id === id) { await redis.lrem(P + "helps", 1, typeof x === "string" ? x : JSON.stringify(x)); break; } }
    return reply(res, 200, { ok: true });
  }
  if (["hotseat", "hotend", "askshow", "mercyopen", "mercyclose", "predictopen", "predictlock", "predictpay", "say", "shoutok", "shoutno"].includes(a)) {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const lv = await readLive(); const save = k => saveLive(k, lv[k]);
    if (a === "hotseat") { let to = text(req.body?.to, 40); if (!to || to === "random") to = pick(others()); if (!NAMES.includes(to)) return reply(res, 400, { error: "Unknown tribute" });
      lv.hot = { id: Date.now(), to }; await save("hot"); await pushCmd("hotseat", lv.hot); return reply(res, 200, { ok: true, hot: lv.hot }); }
    if (a === "hotend") { lv.hot = null; await save("hot"); await pushCmd("hotend", {}); return reply(res, 200, { ok: true }); }
    if (a === "askshow") { if (!lv.hot) return reply(res, 409, { error: "No hot seat" }); const q = text(req.body?.q, 140); if (!q) return reply(res, 400, { error: "Missing" });
      await pushCmd("askshow", { to: lv.hot.to, q }); return reply(res, 200, { ok: true }); }
    if (a === "mercyopen") { let to = text(req.body?.to, 40); if (!to || to === "random") to = pick(others()); if (!NAMES.includes(to)) return reply(res, 400, { error: "Unknown tribute" });
      lv.mercy = { id: Date.now(), to, open: true }; await save("mercy"); await pushCmd("mercy", lv.mercy); return reply(res, 200, { ok: true, mercy: lv.mercy }); }
    if (a === "mercyclose") { if (!lv.mercy || !lv.mercy.open || !(await redis.set(P + "mercyclosed:" + lv.mercy.id, "1", { nx: true, ex: 43200 }))) return reply(res, 409, { error: "No mercy vote" });
      const v = await hash(P + "mercy:" + lv.mercy.id); let up = 0, down = 0; Object.values(v).forEach(x => x === "up" ? up++ : down++);
      lv.mercy.open = false; await save("mercy"); const r = { to: lv.mercy.to, up, down, spared: up > down }; await pushCmd("mercyresult", r); return reply(res, 200, { ok: true, ...r }); }
    if (a === "predictopen") { await redis.del(P + "predict"); lv.predict = { open: true, id: Date.now() }; await save("predict"); await pushCmd("predictopen", {}); return reply(res, 200, { ok: true }); }
    if (a === "predictlock") { lv.predict = { ...(lv.predict || {}), open: false }; await save("predict"); await pushCmd("predictlock", {}); return reply(res, 200, { ok: true }); }
    if (a === "predictpay") { const win = [].concat(req.body?.winners || []).filter(n => NAMES.includes(n)); if (!win.length) return reply(res, 400, { error: "No winner" });
      if (!lv.predict || lv.predict.paid || !(await redis.set(P + "predictpaid:" + (lv.predict.id || 0), "1", { nx: true, ex: 43200 }))) return reply(res, 409, { error: "Already paid" });
      const pr = await hash(P + "predict"), right = [];
      for (const [who, ch] of Object.entries(pr)) if (win.includes(ch)) { right.push(who); await redis.hincrby(P + "points", who, 3); }
      lv.predict = { ...lv.predict, open: false, paid: true }; await save("predict"); await pushCmd("predictpaid", { win, right, all: pr }); return reply(res, 200, { ok: true, right }); }
    if (a === "say") { const t = text(req.body?.text, 200); if (!t) return reply(res, 400, { error: "Missing" }); await pushCmd("say", { text: t }); return reply(res, 200, { ok: true }); }
    const id = Number(req.body?.id); const l = (await redis.lrange(P + "shouts", 0, 29)) || []; let found = null, raw = null;
    for (const x of l) { let o; try { o = typeof x === "string" ? JSON.parse(x) : x; } catch { continue; } if (o.id === id) { found = o; raw = typeof x === "string" ? x : JSON.stringify(x); break; } }
    if (raw && !(await redis.lrem(P + "shouts", 1, raw))) found = null;
    if (a === "shoutok" && found) await pushCmd("shout", found);
    return reply(res, 200, { ok: !!found });
  }

  // 🎂 QUEEN MOTHER's (belated) birthday takeover: the TV and every phone
  if (a === "bday") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const lv = await readLive(); lv.bday = { id: Date.now(), t: Date.now() };
    await saveLive("bday", lv.bday); await pushCmd("bday", lv.bday); return reply(res, 200, { ok: true });
  }

  if (a === "raceopen" || a === "raceend") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const lv = await readLive();
    if (a === "raceopen") {
      const goal = [30, 50, 75, 100].includes(Number(req.body?.goal)) ? Number(req.body.goal) : 50;
      lv.race = { id: Date.now(), start: Date.now() + 6000, goal, state: "live", winner: null };
      await saveLive("race", lv.race); await pushCmd("race", lv.race); return reply(res, 200, { ok: true, race: lv.race });
    }
    if (lv.race) { lv.race.state = "done"; await saveLive("race", lv.race); }
    await pushCmd("raceend", {}); return reply(res, 200, { ok: true });
  }

  if (a === "betlock") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const lv = await readLive(); if (!lv.bet || lv.bet.state !== "open") return reply(res, 409, { error: "No open betting" });
    lv.bet.state = "locked"; await saveLive("bet", lv.bet); await pushCmd("betlock", lv.bet); return reply(res, 200, { ok: true });
  }

  // ⚙ host menu on the TV: sign every phone out (they scan and tap their name again)
  if (a === "clearphones") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    await redis.incr(P + "epoch");
    for (const k of ["players", "cams", "missions", "quest"]) await redis.del(P + k);
    for (const n of NAMES) await redis.del(`${P}seen:${n}`);
    return reply(res, 200, { ok: true, epoch: Number(await redis.get(P + "epoch")) || 0 });
  }

  if (a === "tw") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const kind = req.body?.kind;
    if (!TWISTS.includes(kind)) return reply(res, 400, { error: "Unknown twist" });
    let to = text(req.body?.to, 40);
    if (!to || to === "random" || !NAMES.includes(to)) to = null;
    const data = { kind, t: Date.now() };
    if (kind === "bounty") {
      const pts = await points(); const top = Object.entries(pts).sort((x, y) => y[1] - x[1])[0];
      data.to = top && top[1] > 0 ? top[0] : (to || pick(others()));   // always the points leader when there is one
    } else if (kind === "swap" || kind === "alliance") {
      data.to = to || pick(others()); data.with = pick(others([data.to]));
    } else if (kind === "silence" || kind === "wheel" || kind === "mission") {
      data.to = to || pick(others());
    }
    if (kind === "mission") {
      const m = { id: Date.now(), text: pick(MISSIONS) };
      await redis.hset(P + "missions", { [data.to]: JSON.stringify(m) });
      await pushCmd("tw", { kind, t: data.t });   // the TV never learns who
      return reply(res, 200, { ok: true, tw: { ...data, mission: m.text } });
    }
    if (kind === "decree") data.text = text(req.body?.text, 140) || null;
    await pushCmd("tw", data);
    return reply(res, 200, { ok: true, tw: data });
  }

  if (a === "quest" || a === "questdone" || a === "pointsreset" || a === "pointsadd") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    if (a === "quest") {
      let to = text(req.body?.to, 40);
      if (to === "random") {
        const pl = Object.keys(await hash(P + "players")).filter(n => n !== "Carsyn");
        const pool = pl.length ? pl : NAMES.filter(n => n !== "Carsyn");
        to = pool[Math.floor(Math.random() * pool.length)];
      }
      if (!NAMES.includes(to)) return reply(res, 400, { error: "Unknown tribute" });
      const q = text(req.body?.q, 160), ic = text(req.body?.ic, 8) || "📜";
      if (!q) return reply(res, 400, { error: "Missing quest" });
      const secs = Math.min(120, Math.max(5, Number(req.body?.secs) || 15));
      const now = Date.now();
      const quest = { id: now, to, q, ic, secs, t: now, start: now + 5000, status: "live", double: !!req.body?.double };
      await redis.set(P + "quest", JSON.stringify(quest), { ex: 60 * 30 });
      await pushCmd("quest", quest);
      return reply(res, 200, { ok: true, quest });
    }
    if (a === "questdone") {
      const q = await readQuest();
      if (!q || q.status !== "live") return reply(res, 409, { error: "No quest running" });
      if (!(await redis.set(P + "qpaid:" + q.id, "1", { nx: true, ex: 3600 }))) return reply(res, 409, { error: "No quest running" });
      const ok = req.body?.result === "done";
      let pts = ok ? 1 : -1;
      if (q.double) {   // double or nothing: win doubles what you have (at least +2), lose it all (at least -2)
        const have = (await points())[q.to] || 0;
        pts = ok ? Math.max(2, have) : -Math.max(2, have);
      }
      await redis.hincrby(P + "points", q.to, pts);
      await stat((ok ? "qdone:" : "qfail:") + q.to);
      q.status = ok ? "done" : "fail"; q.pts = pts;
      await redis.set(P + "quest", JSON.stringify(q), { ex: 60 * 30 });
      await pushCmd("questdone", q);
      return reply(res, 200, { ok: true, quest: q, points: await points() });
    }
    if (a === "pointsadd") {
      const to = text(req.body?.to, 40), n = Math.max(-10, Math.min(10, Math.round(Number(req.body?.n) || 0)));
      if (!NAMES.includes(to) || !n) return reply(res, 400, { error: "Bad points" });
      await redis.hincrby(P + "points", to, n);
      await pushCmd("pointsadd", { to, n });
      return reply(res, 200, { ok: true, points: await points() });
    }
    await redis.del(P + "points"); await redis.del(P + "quest"); await redis.del(P + "missions"); await redis.del(P + "stats"); for (const k of LVK) await redis.del(k); await redis.del(P + "helps"); await redis.del(P + "predict"); await redis.del(P + "shouts");
    return reply(res, 200, { ok: true, points: {} });
  }

  if (a === "pin") return reply(res, req.body?.pin === HOST_PIN ? 200 : 403, { ok: req.body?.pin === HOST_PIN });

  if (!(await owns(name, pid))) return reply(res, 403, { error: "Not your name" });

  if (a === "cmd") {
    if (name !== "Carsyn" || req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const c = req.body?.cmd;
    if (!CMDS.includes(c) && !(typeof c === "string" && c.startsWith("sfx:") && SFX.includes(c.slice(4)))) return reply(res, 400, { error: "Unknown command" });
    const d = req.body?.data || {};
    if (c === "click") {
      if (!PAGES.includes(d.page) || !/^\d{1,8}$/.test(String(d.rid))) return reply(res, 400, { error: "Bad button" });
      await pushCmd(c, { page: d.page, rid: String(d.rid) }); return reply(res, 200, { ok: true });
    }
    if (c === "goto") {
      if (!/^[a-z0-9-]{1,40}$/.test(String(d.id))) return reply(res, 400, { error: "Bad slide" });
      await pushCmd(c, { id: String(d.id) }); return reply(res, 200, { ok: true });
    }
    if (c === "video") {
      if (!["toggle", "restart"].includes(d.op)) return reply(res, 400, { error: "Bad video" });
      await pushCmd(c, { op: d.op }); return reply(res, 200, { ok: true });
    }
    await pushCmd(req.body.cmd);
    return reply(res, 200, { ok: true });
  }
  await redis.set(`${P}seen:${name}`, "1", { ex: 120 });

  if (a === "tap") {
    const lv = await readLive(); const r = lv.race;
    if (!r || r.state !== "live" || Date.now() < r.start - 300 || Date.now() - r.start > 120000) return reply(res, 409, { error: "No race" });
    const k = P + "race:" + r.id, had = Number(await redis.hget(k, name)) || 0;
    const maxNow = Math.floor(Math.max(0, Date.now() - r.start) / 1000 * 15) + 3;   // nobody taps faster than ~15 a second
    const n = Math.min(r.goal, maxNow, Math.max(had, Math.min(had + 14, Math.round(Number(req.body?.n) || 0))));
    if (n > had) await redis.hset(k, { [name]: n });
    if (n >= r.goal && (await redis.set(P + "racewin:" + r.id, name, { nx: true, ex: 3600 }))) {
      await redis.hincrby(P + "points", name, 1); await stat("racewin:" + name);
      await pushCmd("racewin", { name, goal: r.goal, secs: Math.round((Date.now() - r.start) / 100) / 10 });
    }
    return reply(res, 200, { ok: true, n });
  }

  if (a === "ask") {
    const lv = await readLive(); if (!lv.hot) return reply(res, 409, { error: "No hot seat" });
    const q = text(req.body?.q, 140); if (!q) return reply(res, 400, { error: "Type a question" });
    if (!(await redis.set(`${P}ak:${name}`, "1", { nx: true, ex: 10 }))) return reply(res, 429, { error: "One question every 10 seconds" });
    const i = await redis.incr(P + "askid"); await redis.lpush(P + "asks:" + lv.hot.id, JSON.stringify({ i, q, from: name })); await redis.ltrim(P + "asks:" + lv.hot.id, 0, 49);
    return reply(res, 200, { ok: true });
  }
  if (a === "give") {
    const to = text(req.body?.to, 40), n = Math.round(Number(req.body?.n));
    if (!NAMES.includes(to) || to === name || ![1, 2, 3].includes(n)) return reply(res, 400, { error: "Bad trade" });
    if (((await points())[name] || 0) < n) return reply(res, 409, { error: "You don't have that many points" });
    if (!(await redis.set(`${P}gv:${name}`, "1", { nx: true, ex: 10 }))) return reply(res, 429, { error: "Wait a few seconds" });
    await redis.hincrby(P + "points", name, -n); await redis.hincrby(P + "points", to, n); await stat("gave:" + name, n);
    await pushCmd("give", { from: name, to, n }); return reply(res, 200, { ok: true });
  }
  if (a === "mvote") {
    const lv = await readLive(); if (!lv.mercy || !lv.mercy.open) return reply(res, 409, { error: "No mercy vote" });
    if (name === lv.mercy.to) return reply(res, 400, { error: "You can't vote on yourself" });
    const v = req.body?.v === "up" ? "up" : "down"; await redis.hset(P + "mercy:" + lv.mercy.id, { [name]: v }); return reply(res, 200, { ok: true });
  }
  if (a === "predict") {
    const lv = await readLive(); if (!lv.predict || !lv.predict.open) return reply(res, 409, { error: "Predictions are closed" });
    const ch = text(req.body?.choice, 40); if (!NAMES.includes(ch)) return reply(res, 400, { error: "Unknown tribute" });
    await redis.hset(P + "predict", { [name]: ch }); return reply(res, 200, { ok: true });
  }
  if (a === "help") {
    if (!(await redis.set(`${P}hp:${name}`, "1", { nx: true, ex: 20 }))) return reply(res, 429, { error: "Help is on the way" });
    const id = await redis.incr(P + "helpid"); await redis.lpush(P + "helps", JSON.stringify({ id, from: name, t: Date.now() })); await redis.ltrim(P + "helps", 0, 19);
    return reply(res, 200, { ok: true });
  }
  if (a === "shout") {
    const t = text(req.body?.text, 90); if (!t) return reply(res, 400, { error: "Type a message" });
    if (!(await redis.set(`${P}so:${name}`, "1", { nx: true, ex: 30 }))) return reply(res, 429, { error: "One shout-out every 30 seconds" });
    const id = await redis.incr(P + "shoutid"); await redis.lpush(P + "shouts", JSON.stringify({ id, from: name, text: t })); await redis.ltrim(P + "shouts", 0, 29);
    return reply(res, 200, { ok: true });
  }

  if (a === "vote") {
    const lv = await readLive();
    if (!lv.poll || !lv.poll.open) return reply(res, 409, { error: "No vote open" });
    const ch = text(req.body?.choice, 40); if (!NAMES.includes(ch)) return reply(res, 400, { error: "Unknown tribute" });
    await redis.hset(P + "votes:" + lv.poll.id, { [name]: ch }); return reply(res, 200, { ok: true });
  }
  if (a === "bet") {
    const lv = await readLive();
    if (!lv.bet || lv.bet.state !== "open") return reply(res, 409, { error: "Betting is closed" });
    const on = text(req.body?.on, 40), amt = Math.round(Number(req.body?.amt));
    if (!NAMES.includes(on) || ![1, 2, 3].includes(amt)) return reply(res, 400, { error: "Bad bet" });
    await redis.hset(P + "bets:" + lv.bet.id, { [name]: JSON.stringify({ on, amt }) }); return reply(res, 200, { ok: true });
  }
  // 😤 Buzz Buzz's catchphrase button (Natalie's phone only)
  if (a === "notfair") {
    if (name !== "Natalie") return reply(res, 403, { error: "Only Buzz Buzz can say that" });
    if (!(await redis.set(`${P}nf`, "1", { nx: true, ex: 45 }))) return reply(res, 429, { error: "wait" });
    await stat("notfair:" + name); await pushCmd("notfair", { from: name }); return reply(res, 200, { ok: true });
  }
  if (a === "snitch") {
    const to = text(req.body?.to, 40), why = text(req.body?.why, 60);
    if (!NAMES.includes(to) || !WHY.includes(why) || to === name) return reply(res, 400, { error: "Bad report" });
    if (!(await redis.set(`${P}sn:${name}`, "1", { nx: true, ex: 30 }))) return reply(res, 429, { error: "Wait a bit before snitching again" });
    await stat("snitcher:" + name); await stat("snitched:" + to);
    await pushCmd("snitch", { from: name, to, why }); return reply(res, 200, { ok: true });
  }
  if (a === "walkup") {
    const song = req.body?.song; if (!SONGS.includes(song)) return reply(res, 400, { error: "Unknown song" });
    await redis.hset(P + "walkups", { [name]: song }); return reply(res, 200, { ok: true });
  }

  if (a === "react") {
    if (!EMOJI.includes(req.body?.e) && !(DEMOJI[name] || []).includes(req.body?.e)) return reply(res, 400, { error: "Unknown emoji" });
    if (!(await redis.set(`${P}rl:${name}`, "1", { nx: true, px: 350 }))) return reply(res, 429, { error: "Slow down" });
    const id = await redis.incr(P + "reactid");
    await redis.lpush(P + "reactlog", JSON.stringify({ id, name, e: req.body.e }));
    await redis.ltrim(P + "reactlog", 0, 39);
    await stat("react:" + name);
    return reply(res, 200, { ok: true });
  }

  if (a === "cam") {
    const img = req.body?.img;
    if (typeof img !== "string" || !img.startsWith("data:image/jpeg;base64,") || img.length > 140000) return reply(res, 400, { error: "Bad frame" });
    await redis.hset(P + "cams", { [name]: JSON.stringify({ img, t: Date.now() }) });
    return reply(res, 200, { ok: true });
  }

  if (a === "camoff") { await redis.hdel(P + "cams", name); await stat("live:" + name); return reply(res, 200, { ok: true }); }

  reply(res, 400, { error: "Unknown action" });
}
