// A phone answers the current face. First answer counts (like Kahoot).
// POST /api/answer { pid, name, qi, answer } -> { answer }
import { redis, readGame, reply, text } from "../lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const { pid, name, qi } = req.body || {};
  const answer = text(req.body?.answer, 40);
  if (!answer) return reply(res, 400, { error: "Empty answer" });

  const game = await readGame();
  if (!game || game.phase !== "question" || game.locked || game.qi !== qi) {
    return reply(res, 409, { error: "locked" });
  }
  if (typeof name !== "string" || (await redis.hget("players", name)) !== pid) {
    return reply(res, 403, { error: "Not your name" });
  }
  if (game.mode === "choice" && !game.choices?.includes(answer)) {
    return reply(res, 400, { error: "Not one of the choices" });
  }

  // Each phone writes only its own field, so twelve people answering at once can't collide.
  const key = `answers:${qi}`;
  const fresh = await redis.hsetnx(key, name, answer);
  reply(res, 200, { answer: fresh ? answer : await redis.hget(key, name) });
}
