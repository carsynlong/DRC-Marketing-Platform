// District Secrets extras: bonus secrets people write on their phones, sponsor bets, story votes.
// Everything lives under "ds:" keys, apart from the other games.
//
// Phones:
//   POST { op: "secret", pid, name, text }        write (or rewrite) your bonus secret
//   POST { op: "unsecret", pid, name }            delete your bonus secret (it won't be played)
//   POST { op: "bet",    pid, name, qi, bet }     hunch | sure | allin, until guesses lock
//   POST { op: "vote",   pid, name, qi, v }       rate the story: fire | lol | wow (during story time)
//   POST { op: "switch", pid, name, qi, guess }   change your vote in the Interrogation Room (while it's open; needs a sealed guess)
// Host phone (needs the key the TV shows in its host menu). Anonymous: the host sees the text, never who wrote it.
//   GET  ?op=review&k=KEY                         every written secret: { id, text, status }
//   POST { op: "approve", k, id, ok }             approve (true) or skip (false) one
//   POST { op: "clearSecrets", k }                throw them all away
// TV:
//   POST { op: "hostkey", k }                     the key the host phone must show
//   GET  ?op=tv&qi=N                              bets + story votes for secret N, approved bonus secrets
//   POST { op: "reset", total }                   new game: clear bets and votes
import { redis, hash, readGame, reply, text } from "../lib/redis.js";

const P = "ds:";
const BETS = ["hunch", "sure", "allin"], VOTES = ["fire", "lol", "wow"];
const isPlayer = async (name, pid) => typeof name === "string" && !!pid && (await redis.hget(P + "players", name)) === pid;
const isHost = async k => typeof k === "string" && k.length >= 8 && (await redis.get(P + "hostkey")) === k;
const parse = s => { try { return JSON.parse(s); } catch { return null; } };

export default async function handler(req, res) {
  const q = req.method === "GET" ? req.query : req.body || {};
  const op = q.op;

  if (req.method === "GET" && op === "tv") {
    const qi = Number.parseInt(q.qi, 10);
    const [bets, votes, subs, ok, switches] = await Promise.all([
      Number.isInteger(qi) ? hash(`${P}bets:${qi}`) : {},
      Number.isInteger(qi) ? hash(`${P}story:${qi}`) : {},
      hash(P + "subs"), hash(P + "approved"),
      Number.isInteger(qi) ? hash(`${P}switch:${qi}`) : {},
    ]);
    const approved = Object.keys(subs).filter(n => ok[n] === "1").map(n => ({ name: n, text: parse(subs[n])?.text })).filter(x => x.text);
    return reply(res, 200, { bets, votes, approved, written: Object.keys(subs).length, switches });
  }
  if (req.method === "GET" && op === "review") {
    if (!(await isHost(q.k))) return reply(res, 403, { error: "Wrong host key" });
    const [subs, ok] = await Promise.all([hash(P + "subs"), hash(P + "approved")]);
    const list = Object.keys(subs).map(n => { const x = parse(subs[n]) || {};
      return { id: x.id || "", text: x.text || "", t: x.t || 0, status: ok[n] === "1" ? "approved" : ok[n] === "0" ? "skipped" : "new" }; });
    return reply(res, 200, { list: list.sort((a, b) => a.t - b.t) });
  }
  if (req.method !== "POST") return reply(res, 405, { error: "Unknown request" });

  if (op === "secret") {
    const t = text(q.text, 200);
    if (!t) return reply(res, 400, { error: "Write something first" });
    if (!(await isPlayer(q.name, q.pid))) return reply(res, 403, { error: "Not your name" });
    const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);   // lets the host approve it without seeing the name
    await redis.hset(P + "subs", { [q.name]: JSON.stringify({ text: t, t: Date.now(), id }) });
    await redis.hdel(P + "approved", q.name);   // a rewritten secret needs approving again
    return reply(res, 200, { ok: true });
  }
  if (op === "unsecret") {
    if (!(await isPlayer(q.name, q.pid))) return reply(res, 403, { error: "Not your name" });
    await redis.hdel(P + "subs", q.name); await redis.hdel(P + "approved", q.name);
    return reply(res, 200, { ok: true });
  }
  if (op === "switch") {
    const qi = q.qi, guess = text(q.guess, 40), game = await readGame(P);
    if (!guess) return reply(res, 400, { error: "Type a name" });
    if (!(await isPlayer(q.name, q.pid))) return reply(res, 403, { error: "Not your name" });
    if (!game || game.qi !== qi || game.phase !== "interro" || !game.roomOpen) return reply(res, 409, { error: "The room is closed" });
    if (!(await redis.hget(`${P}answers:${qi}`, q.name))) return reply(res, 409, { error: "No sealed guess to change" });
    await redis.hset(`${P}switch:${qi}`, { [q.name]: guess });
    return reply(res, 200, { ok: true });
  }
  if (op === "bet" || op === "vote") {
    const qi = q.qi, game = await readGame(P);
    if (!(await isPlayer(q.name, q.pid))) return reply(res, 403, { error: "Not your name" });
    if (!game || game.qi !== qi) return reply(res, 409, { error: "locked" });
    if (op === "bet") {
      if (!BETS.includes(q.bet)) return reply(res, 400, { error: "Unknown bet" });
      if (game.phase !== "question" || game.locked) return reply(res, 409, { error: "locked" });
      await redis.hset(`${P}bets:${qi}`, { [q.name]: q.bet });
    } else {
      if (!VOTES.includes(q.v)) return reply(res, 400, { error: "Unknown vote" });
      if (game.phase !== "story" || game.answer === q.name) return reply(res, 409, { error: "Not now" });
      await redis.hset(`${P}story:${qi}`, { [q.name]: q.v });
    }
    return reply(res, 200, { ok: true });
  }
  if (op === "approve" || op === "clearSecrets") {
    if (!(await isHost(q.k))) return reply(res, 403, { error: "Wrong host key" });
    if (op === "clearSecrets") await redis.del(P + "subs", P + "approved");
    else {
      const subs = await hash(P + "subs"), name = Object.keys(subs).find(n => parse(subs[n])?.id === q.id);
      if (!name) return reply(res, 404, { error: "That secret was changed or removed" });
      await redis.hset(P + "approved", { [name]: q.ok ? "1" : "0" });
    }
    return reply(res, 200, { ok: true });
  }
  if (op === "hostkey") {
    const k = text(q.k, 64);
    if (!k || k.length < 8) return reply(res, 400, { error: "Bad key" });
    await redis.set(P + "hostkey", k);
    return reply(res, 200, { ok: true });
  }
  if (op === "reset") {
    const total = Math.min(Math.max(Number(q.total) || 0, 1), 100);
    await redis.del(...Array.from({ length: total }, (_, i) => [`${P}bets:${i}`, `${P}story:${i}`, `${P}switch:${i}`]).flat());
    return reply(res, 200, { ok: true });
  }
  reply(res, 400, { error: "Unknown op" });
}
