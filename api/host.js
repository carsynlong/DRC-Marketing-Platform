// Only the TV uses this.
// GET  /api/host?qi=3                      -> { players: [names with a phone], answers: {name: answer} }
// POST /api/host { action: "publish", game }    write what phones see
// POST /api/host { action: "reset", total }     new game: wipe every face's answers and the coins
// POST /api/host { action: "clearPlayers" }     everyone picks their name again
// POST /api/host { action: "wipe" }             start completely over: all answers, points, scores (phones stay signed in)
import { redis, hash, reply, prefix } from "../lib/redis.js";

export default async function handler(req, res) {
  const p = prefix(req);
  if (req.method === "GET") {
    const players = Object.keys(await hash(p + "players"));
    const qi = Number.parseInt(req.query.qi, 10);
    const answers = Number.isInteger(qi) ? await hash(`${p}answers:${qi}`) : {};
    const times = Number.isInteger(qi) ? await hash(`${p}anstime:${qi}`) : {};   // server time each answer arrived
    const coins = req.query.coins ? await hash(p + "coins") : undefined;
    const react = req.query.react ? await redis.lrange(p + "reactlog", 0, 59) : undefined;   // recent emoji bursts (District Secrets)
    const mini = req.query.mini ? await hash(p + "mini") : undefined;     // tap race / tree climb counts (Who's That Tribute)
    const ready = req.query.ready ? Object.keys(await hash(p + "ready")) : undefined;   // tapped Got it on How to play
    const buys = req.query.buys != null ? await hash(`${p}buys:${Number.parseInt(req.query.buys, 10) || 0}`) : undefined;   // sponsor shop (Tribute)
    const asks = req.query.asks ? await redis.lrange(p + "asks", 0, 99) : undefined;   // victor's interview questions (Tribute)
    return reply(res, 200, { qi: Number.isInteger(qi) ? qi : null, players, answers, times, now: Date.now(), coins, react, mini , ready , buys, asks });
  }
  if (req.method !== "POST") return reply(res, 405, { error: "GET or POST" });

  const { action } = req.body || {};
  if (action === "publish") {
    const game = req.body.game;
    if (!game || typeof game !== "object") return reply(res, 400, { error: "Missing game" });
    const json = JSON.stringify(game);
    if (json.length > 20000) return reply(res, 400, { error: "Too big" });
    await redis.set(p + "game", json);
    return reply(res, 200, { ok: true });
  }
  if (action === "reset") {
    const total = Math.min(Math.max(Number(req.body.total) || 0, 1), 100);
    await redis.del(p + "spent", p + "asks", ...Array.from({ length: total }, (_, i) => `${p}buys:${i}`));
    await redis.del(p + "coins", p + "reactlog", ...Array.from({ length: total }, (_, i) => `${p}answers:${i}`));
    await redis.del(...Array.from({ length: total }, (_, i) => `${p}anstime:${i}`));
    return reply(res, 200, { ok: true });
  }
  if (action === "wipe") {
    // ↺ Start completely over: every answer, point and score for this game, as if it never happened.
    // Phones stay signed in (players and seen are kept) so nobody has to scan again.
    const N = 200, idx = Array.from({ length: N }, (_, i) => i);
    const keys = [p + "coins", p + "spent", p + "asks", p + "reactlog", p + "mini", p + "ready",
      ...idx.flatMap(i => [`${p}answers:${i}`, `${p}anstime:${i}`, `${p}buys:${i}`])];
    // District Secrets: bets, story votes, frames, the Fifth, Quick Draw, Most likely to. The bonus secrets, two truths
    // and a lie, and the host's decoys people already wrote are kept (phones remember them, and they're not points).
    if (p === "ds:") keys.push(p + "fifthused",
      ...idx.flatMap(i => ["bets", "story", "switch", "storyans", "frame", "fifth", "duel", "duelat", "likely"].map(k => `${p}${k}:${i}`)));
    for (let i = 0; i < keys.length; i += 400) await redis.del(...keys.slice(i, i + 400));
    return reply(res, 200, { ok: true });
  }
  if (action === "miniReset") {
    await redis.del(p + "mini");
    return reply(res, 200, { ok: true });
  }
  if (action === "readyReset") {
    await redis.del(p + "ready");
    return reply(res, 200, { ok: true });
  }
  if (action === "clearPlayers") {
    await redis.del(p + "players");
    return reply(res, 200, { ok: true });
  }
  reply(res, 400, { error: "Unknown action" });
}
