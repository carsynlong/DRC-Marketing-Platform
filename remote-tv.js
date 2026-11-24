/* ================= REMOTE TV BUTTONS (Carsyn's phone can press anything on the TV) =================
   Loaded by show.html, wheel.html and bingo.html.
   Every second it looks at what's on top of the TV screen (a pop-up, a tiebreaker, a briefing,
   or the slide itself), lists the buttons you could click there, and sends that list to the server
   (only when it changes, plus every 20 s). The Gamemaker remote (/showphone as Carsyn) shows them as
   big buttons; tapping one sends cmd "click" {page, rid} and this page clicks that exact button.
   show.html runs its own command poll and calls RemoteTV.run(); wheel and bingo poll here.

   RemoteTV.start({ page:"show", exclude:".hud", extra:()=>({slides:[...], video:true}), ready:()=>true, poll:false }) */
(() => {
  if (window.RemoteTV) return;
  const pin = () => { try { return localStorage.getItem("xmas-host-pin") || ""; } catch (e) { return ""; } };
  const shown = el => { if (!el || !el.getClientRects().length) return false; const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none"; };
  const label = el => {
    let t = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    if (!t) t = el.getAttribute("aria-label") || el.title || "";
    return t.slice(0, 60);
  };
  // the top full-screen layer (pop-up, tiebreaker, briefing, or the slide stage)
  function topLayer() {
    let best = null, bz = -Infinity;
    for (const el of document.body.children) {
      if (/^(CANVAS|SCRIPT|STYLE)$/.test(el.tagName)) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden" || cs.pointerEvents === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width < innerWidth * .6 || r.height < innerHeight * .6) continue;
      const z = parseInt(cs.zIndex, 10) || 0;
      if (z >= bz) { bz = z; best = el; }
    }
    return best;
  }
  let opts = null, n = 0, sig = "", sentAt = 0, cmdSince = null;
  function scan() {
    const layer = topLayer() || document.body;
    const list = [];
    layer.querySelectorAll("button,a[href]").forEach(el => {
      if (list.length >= 100) return;
      if (opts.exclude && el.closest(opts.exclude)) return;
      if (el.disabled || !shown(el)) return;
      if (el.tagName === "A" && (el.getAttribute("href") || "").startsWith("#")) return;
      const t = label(el); if (!t) return;
      if (!el.dataset.rid) el.dataset.rid = String(++n);
      list.push([el.dataset.rid, t, el.classList.contains("on") || el.classList.contains("new") ? 1 : 0]);
    });
    const h = layer.querySelector("h1,h2");
    const title = (h ? (h.innerText || h.textContent) : "").replace(/\s+/g, " ").trim().slice(0, 80);
    return { title, popup: layer !== document.body && !layer.matches("#stage"), list };
  }
  async function publish(force) {
    if (!opts || !pin() || (opts.ready && !opts.ready())) return;
    const s = scan(), ex = opts.extra ? opts.extra() : {};
    const body = { page: opts.page, visible: !document.hidden, title: s.title, popup: s.popup, list: s.list, ...ex };
    const k = JSON.stringify(body);
    if (!force && k === sig && Date.now() - sentAt < 20000) return;
    sig = k; sentAt = Date.now();
    try { await fetch("/api/show", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ a: "btns", pin: pin(), ...body }) }); } catch (e) {}
  }
  // press a button the remote picked
  function run(cmd, data) {
    if (!data || data.page !== opts.page) return false;
    if (cmd === "click") {
      const el = document.querySelector(`[data-rid="${CSS.escape(String(data.rid))}"]`);
      if (!el || !el.isConnected) return true;
      if (el.tagName === "A" && el.target) {
        const w = window.open(el.href, "_blank");   // from the remote this needs Chrome set to "Always allow pop-ups" for this site
        if (!w) { if (opts.blocked) opts.blocked(); } else if (opts.opened) opts.opened(el);
      } else {
        // the remote already asked "are you sure?", so a confirm() or alert() can't freeze the TV waiting for a click
        const c = window.confirm, a = window.alert; window.confirm = () => true; window.alert = () => {};
        try { el.click(); } finally { window.confirm = c; window.alert = a; }
      }
      setTimeout(() => publish(true), 350);
      return true;
    }
    return false;
  }
  function start(o) {
    opts = o;
    setInterval(() => publish(false), 1000);
    addEventListener("visibilitychange", () => publish(true));
    addEventListener("pagehide", () => { if (!pin()) return;
      try { fetch("/api/show", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ a: "btns", pin: pin(), page: o.page, gone: true }) }); } catch (e) {} });
    if (o.poll) {
      const tick = async () => {
        try { const r = await fetch("/api/show?a=cmds&since=" + (cmdSince || 0), { cache: "no-store" });
          if (r.ok) { const j = await r.json(); const cmds = j.cmds || [];
            if (cmdSince === null) cmdSince = Math.max(0, j.last || 0, ...cmds.map(x => x.id));   // skip taps sent before this page opened
            else for (const x of cmds) { if (x.id <= cmdSince) continue; cmdSince = x.id; run(x.cmd, x.data); } } } catch (e) {}
        setTimeout(tick, 1200);
      };
      tick();
    }
  }
  window.RemoteTV = { start, run, publish };
})();
