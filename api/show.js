// The Christmas Games show (/show) and the phones that join it (/showphone).
// Uses its own "sh:" keys so it never mixes with the three games.
//
// Phones:
//   POST { a:"join",  pid, name }          claim a tribute (one phone per name)
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
const EMOJI = ["🏹", "🔥", "🌹", "🍞", "🐦", "🎁", "😱", "😂"];
const P = "sh:";
// The Gamemaker's phone remote and twists need this PIN (only Carsyn knows it).
const HOST_PIN = "1185";
const CMDS = ["next", "prev", "close", "intermission", "live", "mute",
  "twist:fire", "twist:storm", "twist:mutts", "twist:freeze", "twist:bonus", "twist:rule", "twist:feast", "clearrule", "points", "sponsor", "sponsor:on", "sponsor:off", "draft", "awards", "photo", "pollreveal", "betlock",
  "chaos:on", "chaos:off", "ticker:on", "ticker:off", "recap", "predictreveal", "clock:off", "clock:5", "clock:10", "clock:15", "clock:20", "clock:30"];
// 🎙️ soundboard: the TV plays these
const SFX = ["airhorn", "cheer", "applause", "gasp", "laugh", "rimshot", "trombone", "cannon", "drumroll", "siren", "boom", "fanfare"];
const SONGS = ["hh_cookie", "hh_tribute", "hh_mitten", "hh_feud", "hh_scoop", "hh_secrets", "hh_lrc", "hh_bingo", "hh_lounge", "battle", "march", "board", "lobby"];
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
const pushCmd = async (cmd, data) => {
  const id = await redis.incr(P + "cmdid");
  await redis.lpush(P + "cmdlog", JSON.stringify({ id, cmd, data, t: Date.now() }));
  await redis.ltrim(P + "cmdlog", 0, 19);
};
const readQuest = async () => { try { const r = await redis.get(P + "quest"); return r ? (typeof r === "string" ? JSON.parse(r) : r) : null; } catch { return null; } };
const points = async () => { const h = await hash(P + "points"); const o = {}; for (const [k, v] of Object.entries(h)) o[k] = Number(v) || 0; return o; };
const owns = async (name, pid) => name && pid && (await redis.hget(P + "players", name)) === pid;

export default async function handler(req, res) {
  const a = req.query?.a ?? req.body?.a;

  if (req.method === "GET" && a === "phone") {
    const raw = await redis.get(P + "state");
    let slide = null; try { slide = raw ? JSON.parse(raw) : null; } catch {}
    const me = text(req.query.me, 40);
    const q = await readQuest();
    const quest = q && me && q.to === me && Date.now() - q.t < 5 * 60000 ? q : null;
    const pts = await points();
    let mission = null;
    if (me) { const m = await redis.hget(P + "missions", me); try { mission = m ? (typeof m === "string" ? JSON.parse(m) : m) : null; } catch {} }
    const epoch = Number(await redis.get(P + "epoch")) || 0;
    const live = (await jget(P + "live")) || {};
    let vote = null, bet = null, walkup = null;
    if (live.poll && live.poll.open) vote = { ...live.poll, mine: me ? await redis.hget(P + "votes:" + live.poll.id, me) : null };
    if (live.bet && live.bet.state !== "paid") { const mb = me ? await redis.hget(P + "bets:" + live.bet.id, me) : null; let mine = null; try { mine = mb ? (typeof mb === "string" ? JSON.parse(mb) : mb) : null; } catch {} bet = { ...live.bet, mine }; }
    if (me) walkup = await redis.hget(P + "walkups", me);
    const hot = live.hot ? { id: live.hot.id, to: live.hot.to } : null;
    let mercy = null, predict = null;
    if (live.mercy && live.mercy.open) mercy = { ...live.mercy, mine: me ? await redis.hget(P + "mercy:" + live.mercy.id, me) : null };
    if (live.predict) predict = { open: !!live.predict.open, mine: me ? await redis.hget(P + "predict", me) : null };
    return reply(res, 200, { slide, quest, points: pts, mission, epoch, vote, bet, walkup, hot, mercy, predict, now: Date.now() });
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
    if (a === "asks") { const lv = (await jget(P + "live")) || {}; if (!lv.hot) return reply(res, 200, { asks: [] });
      const l = (await redis.lrange(P + "asks:" + lv.hot.id, 0, 49)) || []; return reply(res, 200, { hot: lv.hot, asks: l.map((x, i) => { try { const o = typeof x === "string" ? JSON.parse(x) : x; return { i: o.i, q: o.q }; } catch { return null; } }).filter(Boolean) }); }
    const l = (await redis.lrange(P + "shouts", 0, 29)) || [];
    return reply(res, 200, { shouts: l.map(x => { try { return typeof x === "string" ? JSON.parse(x) : x; } catch { return null; } }).filter(Boolean) });
  }

  if (req.method === "GET" && a === "stats") {
    const [st, w] = await Promise.all([hash(P + "stats"), hash(P + "walkups")]);
    const o = {}; for (const [k, v] of Object.entries(st)) o[k] = Number(v) || 0;
    return reply(res, 200, { stats: o, walkups: w, points: await points(), joined: Object.keys(await hash(P + "players")) });
  }

  if (req.method === "GET" && a === "tv") {
    const since = Number(req.query.since) || 0, csince = Number(req.query.csince) || 0;
    const [log, players, cams, clog] = await Promise.all([redis.lrange(P + "reactlog", 0, 39), hash(P + "players"), hash(P + "cams"), redis.lrange(P + "cmdlog", 0, 19)]);
    const cmds = [];
    for (const r of clog || []) { try { const o = typeof r === "string" ? JSON.parse(r) : r; if (o.id > csince) cmds.push(o); } catch {} }
    const reacts = [];
    for (const r of log || []) { try { const o = typeof r === "string" ? JSON.parse(r) : r; if (o.id > since) reacts.push(o); } catch {} }
    const now = Date.now(), live = {}, stale = [];
    for (const [name, v] of Object.entries(cams)) {
      try { const o = JSON.parse(v); if (now - o.t < 6000) live[name] = o.img; else stale.push(name); } catch { stale.push(name); }
    }
    if (stale.length) await redis.hdel(P + "cams", ...stale);
    const lv = (await jget(P + "live")) || {};
    let poll = null, bets = null;
    if (lv.poll && lv.poll.open) { const v = await hash(P + "votes:" + lv.poll.id); poll = { ...lv.poll, votes: v }; }
    if (lv.bet && lv.bet.state !== "paid") { const b = await hash(P + "bets:" + lv.bet.id); const o = {}; for (const [k, x] of Object.entries(b)) { try { o[k] = JSON.parse(x); } catch {} } bets = { ...lv.bet, bets: o }; }
    let mercy = null;
    if (lv.mercy && lv.mercy.open) { const v = await hash(P + "mercy:" + lv.mercy.id); let up = 0, down = 0; Object.values(v).forEach(x => x === "up" ? up++ : down++); mercy = { ...lv.mercy, up, down }; }
    return reply(res, 200, { reacts: reacts.reverse(), live, joined: Object.keys(players), cmds: cmds.reverse(), points: await points(), poll, bets, mercy });
  }

  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const pid = text(req.body?.pid, 64), name = text(req.body?.name, 40);

  if (a === "results") {
    const r = req.body?.results; if (!r || typeof r !== "object") return reply(res, 400, { error: "Missing results" });
    const j = JSON.stringify({ ...r, t: Date.now() }); if (j.length > 20000) return reply(res, 400, { error: "Too big" });
    await redis.set(P + "results", j, { ex: 60 * 60 * 24 * 3 }); return reply(res, 200, { ok: true });
  }

  if (a === "state") {
    const s = req.body?.slide;
    if (!s || typeof s !== "object") return reply(res, 400, { error: "Missing slide" });
    const clean = { id: text(s.id, 40) || "", n: Number(s.n) || 0, total: Number(s.total) || 0,
      title: (text(s.title, 160) || ""), body: (typeof s.body === "string" ? s.body.slice(0, 900) : ""), t: Date.now() };
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
    await redis.set(`${P}seen:${name}`, "1", { ex: 30 });
    return reply(res, 200, { me: name, epoch: Number(await redis.get(P + "epoch")) || 0 });
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
    const lv = (await jget(P + "live")) || {};
    if (a === "pollopen") {
      const q = text(req.body?.q, 120); if (!q) return reply(res, 400, { error: "Missing question" });
      lv.poll = { id: Date.now(), q, open: true }; await redis.set(P + "live", JSON.stringify(lv), { ex: 43200 });
      await pushCmd("poll", lv.poll); return reply(res, 200, { ok: true, poll: lv.poll });
    }
    if (a === "pollclose") {
      if (!lv.poll) return reply(res, 409, { error: "No vote running" });
      const v = await hash(P + "votes:" + lv.poll.id), c = {};
      for (const x of Object.values(v)) c[x] = (c[x] || 0) + 1;
      const max = Math.max(0, ...Object.values(c)), win = Object.keys(c).filter(k => c[k] === max && max > 0);
      for (const w of win) await stat("votewin:" + w);
      lv.poll.open = false; await redis.set(P + "live", JSON.stringify(lv), { ex: 43200 });
      await pushCmd("pollresult", { ...lv.poll, counts: c, win }); return reply(res, 200, { ok: true, counts: c, win });
    }
    if (a === "betopen") {
      lv.bet = { id: Date.now(), game: text(req.body?.game, 60) || "the next game", state: "open" };
      await redis.set(P + "live", JSON.stringify(lv), { ex: 43200 }); await pushCmd("betopen", lv.bet); return reply(res, 200, { ok: true, bet: lv.bet });
    }
    if (!lv.bet || lv.bet.state === "paid") return reply(res, 409, { error: "No betting round" });
    if (a === "betcancel") { lv.bet.state = "paid"; await redis.set(P + "live", JSON.stringify(lv), { ex: 43200 }); await pushCmd("betcancel", {}); return reply(res, 200, { ok: true }); }
    const winner = text(req.body?.winner, 40); if (!NAMES.includes(winner)) return reply(res, 400, { error: "Unknown tribute" });
    const b = await hash(P + "bets:" + lv.bet.id), results = [];
    for (const [who, raw] of Object.entries(b)) { let x; try { x = JSON.parse(raw); } catch { continue; }
      const n = x.on === winner ? x.amt : -x.amt; await redis.hincrby(P + "points", who, n); results.push({ who, on: x.on, amt: x.amt, n }); }
    lv.bet.state = "paid"; await redis.set(P + "live", JSON.stringify(lv), { ex: 43200 });
    await pushCmd("betpaid", { winner, game: lv.bet.game, results }); return reply(res, 200, { ok: true, results });
  }
  if (["hotseat", "hotend", "askshow", "mercyopen", "mercyclose", "predictopen", "predictlock", "predictpay", "say", "shoutok", "shoutno"].includes(a)) {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const lv = (await jget(P + "live")) || {}; const save = () => redis.set(P + "live", JSON.stringify(lv), { ex: 43200 });
    if (a === "hotseat") { let to = text(req.body?.to, 40); if (!to || to === "random") to = pick(others()); if (!NAMES.includes(to)) return reply(res, 400, { error: "Unknown tribute" });
      lv.hot = { id: Date.now(), to }; await save(); await pushCmd("hotseat", lv.hot); return reply(res, 200, { ok: true, hot: lv.hot }); }
    if (a === "hotend") { lv.hot = null; await save(); await pushCmd("hotend", {}); return reply(res, 200, { ok: true }); }
    if (a === "askshow") { if (!lv.hot) return reply(res, 409, { error: "No hot seat" }); const q = text(req.body?.q, 140); if (!q) return reply(res, 400, { error: "Missing" });
      await pushCmd("askshow", { to: lv.hot.to, q }); return reply(res, 200, { ok: true }); }
    if (a === "mercyopen") { let to = text(req.body?.to, 40); if (!to || to === "random") to = pick(others()); if (!NAMES.includes(to)) return reply(res, 400, { error: "Unknown tribute" });
      lv.mercy = { id: Date.now(), to, open: true }; await save(); await pushCmd("mercy", lv.mercy); return reply(res, 200, { ok: true, mercy: lv.mercy }); }
    if (a === "mercyclose") { if (!lv.mercy || !lv.mercy.open) return reply(res, 409, { error: "No mercy vote" });
      const v = await hash(P + "mercy:" + lv.mercy.id); let up = 0, down = 0; Object.values(v).forEach(x => x === "up" ? up++ : down++);
      lv.mercy.open = false; await save(); const r = { to: lv.mercy.to, up, down, spared: up > down }; await pushCmd("mercyresult", r); return reply(res, 200, { ok: true, ...r }); }
    if (a === "predictopen") { lv.predict = { open: true }; await save(); await pushCmd("predictopen", {}); return reply(res, 200, { ok: true }); }
    if (a === "predictlock") { lv.predict = { open: false }; await save(); await pushCmd("predictlock", {}); return reply(res, 200, { ok: true }); }
    if (a === "predictpay") { const win = [].concat(req.body?.winners || []).filter(n => NAMES.includes(n)); if (!win.length) return reply(res, 400, { error: "No winner" });
      const pr = await hash(P + "predict"), right = [];
      for (const [who, ch] of Object.entries(pr)) if (win.includes(ch)) { right.push(who); await redis.hincrby(P + "points", who, 3); }
      lv.predict = { open: false, paid: true }; await save(); await pushCmd("predictpaid", { win, right, all: pr }); return reply(res, 200, { ok: true, right }); }
    if (a === "say") { const t = text(req.body?.text, 200); if (!t) return reply(res, 400, { error: "Missing" }); await pushCmd("say", { text: t }); return reply(res, 200, { ok: true }); }
    const id = Number(req.body?.id); const l = (await redis.lrange(P + "shouts", 0, 29)) || []; let found = null; const keep = [];
    for (const x of l) { let o; try { o = typeof x === "string" ? JSON.parse(x) : x; } catch { continue; } if (o.id === id) found = o; else keep.push(o); }
    await redis.del(P + "shouts"); for (const o of keep.reverse()) await redis.lpush(P + "shouts", JSON.stringify(o));
    if (a === "shoutok" && found) await pushCmd("shout", found);
    return reply(res, 200, { ok: !!found });
  }

  if (a === "betlock") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const lv = (await jget(P + "live")) || {}; if (!lv.bet || lv.bet.state !== "open") return reply(res, 409, { error: "No open betting" });
    lv.bet.state = "locked"; await redis.set(P + "live", JSON.stringify(lv), { ex: 43200 }); await pushCmd("betlock", lv.bet); return reply(res, 200, { ok: true });
  }

  // ⚙ host menu on the TV: sign every phone out (they scan and tap their name again)
  if (a === "clearphones") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    await redis.incr(P + "epoch");
    for (const k of ["players", "cams", "missions", "quest"]) await redis.del(P + k);
    for (const n of NAMES) await redis.del(`${P}seen:${n}`);
    return reply(res, 200, { ok: true });
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
      data.to = to || (top && top[1] > 0 ? top[0] : pick(others()));
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
    await redis.del(P + "points"); await redis.del(P + "quest"); await redis.del(P + "missions"); await redis.del(P + "stats"); await redis.del(P + "live"); await redis.del(P + "predict"); await redis.del(P + "shouts");
    return reply(res, 200, { ok: true, points: {} });
  }

  if (a === "pin") return reply(res, req.body?.pin === HOST_PIN ? 200 : 403, { ok: req.body?.pin === HOST_PIN });

  if (!(await owns(name, pid))) return reply(res, 403, { error: "Not your name" });

  if (a === "cmd") {
    if (name !== "Carsyn" || req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const c = req.body?.cmd;
    if (!CMDS.includes(c) && !(typeof c === "string" && c.startsWith("sfx:") && SFX.includes(c.slice(4)))) return reply(res, 400, { error: "Unknown command" });
    await pushCmd(req.body.cmd);
    return reply(res, 200, { ok: true });
  }
  await redis.set(`${P}seen:${name}`, "1", { ex: 30 });

  if (a === "ask") {
    const lv = (await jget(P + "live")) || {}; if (!lv.hot) return reply(res, 409, { error: "No hot seat" });
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
    const lv = (await jget(P + "live")) || {}; if (!lv.mercy || !lv.mercy.open) return reply(res, 409, { error: "No mercy vote" });
    if (name === lv.mercy.to) return reply(res, 400, { error: "You can't vote on yourself" });
    const v = req.body?.v === "up" ? "up" : "down"; await redis.hset(P + "mercy:" + lv.mercy.id, { [name]: v }); return reply(res, 200, { ok: true });
  }
  if (a === "predict") {
    const lv = (await jget(P + "live")) || {}; if (!lv.predict || !lv.predict.open) return reply(res, 409, { error: "Predictions are closed" });
    const ch = text(req.body?.choice, 40); if (!NAMES.includes(ch)) return reply(res, 400, { error: "Unknown tribute" });
    await redis.hset(P + "predict", { [name]: ch }); return reply(res, 200, { ok: true });
  }
  if (a === "shout") {
    const t = text(req.body?.text, 90); if (!t) return reply(res, 400, { error: "Type a message" });
    if (!(await redis.set(`${P}so:${name}`, "1", { nx: true, ex: 30 }))) return reply(res, 429, { error: "One shout-out every 30 seconds" });
    const id = await redis.incr(P + "shoutid"); await redis.lpush(P + "shouts", JSON.stringify({ id, from: name, text: t })); await redis.ltrim(P + "shouts", 0, 29);
    return reply(res, 200, { ok: true });
  }

  if (a === "vote") {
    const lv = (await jget(P + "live")) || {};
    if (!lv.poll || !lv.poll.open) return reply(res, 409, { error: "No vote open" });
    const ch = text(req.body?.choice, 40); if (!NAMES.includes(ch)) return reply(res, 400, { error: "Unknown tribute" });
    await redis.hset(P + "votes:" + lv.poll.id, { [name]: ch }); return reply(res, 200, { ok: true });
  }
  if (a === "bet") {
    const lv = (await jget(P + "live")) || {};
    if (!lv.bet || lv.bet.state !== "open") return reply(res, 409, { error: "Betting is closed" });
    const on = text(req.body?.on, 40), amt = Math.round(Number(req.body?.amt));
    if (!NAMES.includes(on) || ![1, 2, 3].includes(amt)) return reply(res, 400, { error: "Bad bet" });
    await redis.hset(P + "bets:" + lv.bet.id, { [name]: JSON.stringify({ on, amt }) }); return reply(res, 200, { ok: true });
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
    if (!EMOJI.includes(req.body?.e)) return reply(res, 400, { error: "Unknown emoji" });
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
