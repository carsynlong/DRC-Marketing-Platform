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
  "twist:fire", "twist:storm", "twist:mutts", "twist:freeze", "twist:bonus", "twist:rule", "twist:feast", "clearrule", "points", "sponsor", "sponsor:on", "sponsor:off"];

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
    return reply(res, 200, { slide, quest, points: pts, now: Date.now() });
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
    return reply(res, 200, { reacts: reacts.reverse(), live, joined: Object.keys(players), cmds: cmds.reverse(), points: await points() });
  }

  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const pid = text(req.body?.pid, 64), name = text(req.body?.name, 40);

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
    const all = await hash(P + "players");
    if (all[name] && all[name] !== pid && (await redis.get(`${P}seen:${name}`))) return reply(res, 409, { error: "taken" });
    const mine = Object.keys(all).filter(n => all[n] === pid && n !== name);
    if (mine.length) await redis.hdel(P + "players", ...mine);
    await redis.hset(P + "players", { [name]: pid });
    await redis.set(`${P}seen:${name}`, "1", { ex: 30 });
    return reply(res, 200, { me: name });
  }

  // Gamemaker-only actions that only need the PIN (so the laptop host menu can use them too)
  if (a === "sab") {
    if (req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    const kind = req.body?.kind;
    if (!["freeze", "bite", "fog", "flip", "jackers"].includes(kind)) return reply(res, 400, { error: "Unknown sabotage" });
    let to = text(req.body?.to, 40);
    if (to === "random") { const pool = NAMES.filter(n => n !== "Carsyn"); to = pool[Math.floor(Math.random() * pool.length)]; }
    if (!NAMES.includes(to)) return reply(res, 400, { error: "Unknown tribute" });
    const id = await redis.incr(P + "sabid"), s = { id, to, kind, t: Date.now() };
    await redis.hset(P + "sab", { [to]: JSON.stringify(s) });
    await redis.lpush(P + "sablog", JSON.stringify(s)); await redis.ltrim(P + "sablog", 0, 9);
    await pushCmd("sab", s);
    return reply(res, 200, { ok: true, sab: s });
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
      const quest = { id: now, to, q, ic, secs, t: now, start: now + 5000, status: "live" };
      await redis.set(P + "quest", JSON.stringify(quest), { ex: 60 * 30 });
      await pushCmd("quest", quest);
      return reply(res, 200, { ok: true, quest });
    }
    if (a === "questdone") {
      const q = await readQuest();
      if (!q || q.status !== "live") return reply(res, 409, { error: "No quest running" });
      const ok = req.body?.result === "done";
      const pts = ok ? 1 : -1;
      await redis.hincrby(P + "points", q.to, pts);
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
    await redis.del(P + "points"); await redis.del(P + "quest");
    return reply(res, 200, { ok: true, points: {} });
  }

  if (a === "pin") return reply(res, req.body?.pin === HOST_PIN ? 200 : 403, { ok: req.body?.pin === HOST_PIN });

  if (!(await owns(name, pid))) return reply(res, 403, { error: "Not your name" });

  if (a === "cmd") {
    if (name !== "Carsyn" || req.body?.pin !== HOST_PIN) return reply(res, 403, { error: "Gamemaker only" });
    if (!CMDS.includes(req.body?.cmd)) return reply(res, 400, { error: "Unknown command" });
    await pushCmd(req.body.cmd);
    return reply(res, 200, { ok: true });
  }
  await redis.set(`${P}seen:${name}`, "1", { ex: 30 });

  if (a === "react") {
    if (!EMOJI.includes(req.body?.e)) return reply(res, 400, { error: "Unknown emoji" });
    if (!(await redis.set(`${P}rl:${name}`, "1", { nx: true, px: 350 }))) return reply(res, 429, { error: "Slow down" });
    const id = await redis.incr(P + "reactid");
    await redis.lpush(P + "reactlog", JSON.stringify({ id, name, e: req.body.e }));
    await redis.ltrim(P + "reactlog", 0, 39);
    return reply(res, 200, { ok: true });
  }

  if (a === "cam") {
    const img = req.body?.img;
    if (typeof img !== "string" || !img.startsWith("data:image/jpeg;base64,") || img.length > 140000) return reply(res, 400, { error: "Bad frame" });
    await redis.hset(P + "cams", { [name]: JSON.stringify({ img, t: Date.now() }) });
    return reply(res, 200, { ok: true });
  }

  if (a === "camoff") { await redis.hdel(P + "cams", name); return reply(res, 200, { ok: true }); }

  reply(res, 400, { error: "Unknown action" });
}
