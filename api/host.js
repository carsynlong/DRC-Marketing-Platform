// Only the TV uses this.
// GET  /api/host?qi=3                      -> { players: [names with a phone], answers: {name: answer} }
// POST /api/host { action: "publish", game }    write what phones see
// POST /api/host { action: "reset", total }     new game: wipe every face's answers and the coins
// POST /api/host { action: "clearPlayers" }     everyone picks their name again
import { redis, hash, reply, prefix } from "../lib/redis.js";

export default async function handler(req, res) {
  const p = prefix(req);
  if (req.method === "GET") {
    const players = Object.keys(await hash(p + "players"));
    const qi = Number.parseInt(req.query.qi, 10);
    const answers = Number.isInteger(qi) ? await hash(`${p}answers:${qi}`) : {};
    const coins = req.query.coins ? await hash(p + "coins") : undefined;
    const react = req.query.react ? await redis.lrange(p + "reactlog", 0, 59) : undefined;   // recent emoji bursts (District Secrets)
    return reply(res, 200, { qi: Number.isInteger(qi) ? qi : null, players, answers, coins, react });
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
    await redis.del(p + "coins", p + "reactlog", ...Array.from({ length: total }, (_, i) => `${p}answers:${i}`));
    return reply(res, 200, { ok: true });
  }
  if (action === "clearPlayers") {
    await redis.del(p + "players");
    return reply(res, 200, { ok: true });
  }
  reply(res, 400, { error: "Unknown action" });
}
