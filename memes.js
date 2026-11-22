/* ================= MEMES while you wait (all three games' phones) =================
   After you lock in an answer, a random meme shows on your phone while everyone else finishes.
   - Every phone sees the same meme for a question (so people can laugh about it together).
   - The memes are dealt into 3 piles, one per game, so no meme ever shows up in two different games.
   - Each new game shuffles its pile, so the order changes every time you play.
   To add memes: drop more pictures in memes/ named m17.jpg, m18.jpg, ... and raise COUNT below. */
const Memes = (() => {
  const COUNT = 19;
  const GAMES = ["tribute", "secrets", "feud"];
  const file = i => `/memes/m${String(i).padStart(2, "0")}.jpg`;
  // deal 1,2,3 → tribute, secrets, feud; 4,5,6 → tribute, secrets, feud; ...
  const pile = game => Array.from({ length: COUNT }, (_, i) => i + 1).filter(i => (i - 1) % GAMES.length === Math.max(0, GAMES.indexOf(game)));
  function shuffled(arr, seed) {           // same seed → same order on every phone
    let s = (Number(seed) || 1) % 2147483647; if (s <= 0) s += 2147483646;
    const rnd = () => (s = s * 16807 % 2147483647) / 2147483647, a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function pick(game, gid, qi) { const p = shuffled(pile(game), gid); return p.length ? file(p[(Number(qi) || 0) % p.length]) : null; }
  function html(game, gid, qi) {
    const src = pick(game, gid, qi); if (!src) return "";
    return `<figure style="margin:6px auto 0;max-width:340px;width:100%;display:grid;gap:6px;text-align:center">
      <figcaption style="font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;font-weight:800;opacity:.75">😂 While you wait</figcaption>
      <img src="${src}" alt="A Hunger Games meme" loading="eager" style="width:100%;max-height:42vh;object-fit:contain;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.45);background:#fff;animation:pop .5s cubic-bezier(.2,1.4,.4,1) both"></figure>`;
  }
  return { pick, html };
})();
