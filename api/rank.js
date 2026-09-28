export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!globalThis.pgStore) globalThis.pgStore = { players: [], listings: [] };
  const st = globalThis.pgStore;

  function keyOf(p) {
    return String((p && (p.name || p.id)) || "").toLowerCase().replace(/^@/, "").trim();
  }
  function mergePlayers(board, rows) {
    const map = {};
    [].concat(board || [], rows || []).forEach(p => {
      if (!p) return;
      const k = keyOf(p);
      if (!k) return;
      const old = map[k] || {};
      const newer = Number(p.at || 0) >= Number(old.at || 0);
      map[k] = {
        id: p.id || old.id || k,
        name: p.name || old.name,
        photo: p.photo || old.photo || "",
        pts: Math.max(Number(p.pts || 0), Number(old.pts || 0)),
        pend: Math.max(Number(p.pend || 0), Number(old.pend || 0)),
        tgold: Math.max(Number(p.tgold || 0), Number(old.tgold || 0)),
        card: newer ? (p.card || old.card || "") : (old.card || p.card || ""),
        cardImg: newer ? (p.cardImg || old.cardImg || "") : (old.cardImg || p.cardImg || ""),
        weapon: p.weapon || old.weapon || "",
        relic: p.relic || old.relic || "",
        pet: p.pet || old.pet || "",
        deck: (Array.isArray(p.deck) && p.deck.length) ? p.deck : (old.deck || []),
        en: p.en != null ? p.en : old.en,
        gifts: p.gifts != null ? p.gifts : old.gifts,
        at: Math.max(Number(p.at || 0), Number(old.at || 0))
      };
    });
    return Object.values(map).sort((a, b) => (b.pts || 0) - (a.pts || 0)).slice(0, 50);
  }

  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, players: st.players, listings: st.listings || [] });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST/GET" });
    }
    const p = req.body || {};
    const incoming = [];
    if (p.name || p.id) incoming.push(p);
    if (Array.isArray(p.peers)) incoming.push(...p.peers);
    st.players = mergePlayers(st.players, incoming);
    if (Array.isArray(p.listings) && p.listings.length) {
      const map = {};
      [].concat(st.listings || [], p.listings).forEach(o => {
        if (!o || !o.id) return;
        const k = String(o.sid || [o.by, o.kind, o.id, o.unit, o.qty].join("|"));
        map[k] = Object.assign({}, o, { sid: k });
      });
      st.listings = Object.values(map).slice(0, 80);
    }
    globalThis.pgStore = st;
    return res.status(200).json({ ok: true, players: st.players, listings: st.listings || [] });
  } catch (e) {
    return res.status(200).json({ ok: false, players: st.players || [], listings: st.listings || [], error: String(e.message || e) });
  }
}
