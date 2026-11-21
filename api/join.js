// A phone claims a name, or lets go of it ("Not you?").
// POST /api/join { pid, name }      -> { me } or 409 if someone else has it
// POST /api/join { pid, leave: true }
import { redis, hash, readGame, reply, text } from "../lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const pid = text(req.body?.pid, 64);
  if (!pid) return reply(res, 400, { error: "Missing phone id" });

  const all = await hash("players");
  const mine = Object.keys(all).filter(n => all[n] === pid);

  if (req.body.leave) {
    if (mine.length) await redis.hdel("players", ...mine);
    return reply(res, 200, { me: null });
  }

  const name = text(req.body.name, 40);
  const game = await readGame();
  if (!game || !name || !game.names?.includes(name)) return reply(res, 400, { error: "Unknown name" });
  if (all[name] === pid) return reply(res, 200, { me: name }); // same phone, reloaded

  // HSETNX only writes if nobody has this name yet, so two phones can't both win it.
  const won = await redis.hsetnx("players", name, pid);
  if (!won) return reply(res, 409, { error: "taken" });

  // One name per phone: let go of any other name this phone held.
  const old = mine.filter(n => n !== name);
  if (old.length) await redis.hdel("players", ...old);
  reply(res, 200, { me: name });
}
