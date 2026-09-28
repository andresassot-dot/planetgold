const fs = require("fs");
const FILE = "/tmp/pg-store.json";
const OLD = "/tmp/pg-rank.json";

function empty() { return { players: [], listings: [] }; }
function load() {
  try { return Object.assign(empty(), JSON.parse(fs.readFileSync(FILE, "utf8"))); } catch (e) {}
  try {
    const old = JSON.parse(fs.readFileSync(OLD, "utf8"));
    if (Array.isArray(old)) return { players: old, listings: [] };
    return Object.assign(empty(), old);
  } catch (e) {}
  return empty();
}
function save(st) {
  try { fs.writeFileSync(FILE, JSON.stringify(st)); } catch (e) {}
}
function keyOf(p) {
  return String((p && (p.name || p.id)) || "").toLowerCase().replace(/^@/, "").trim();
}
function mergePlayers(board, rows) {
  const map = {};
  board.concat(rows || []).forEach(p => {
    if (!p) return;
    const k = keyOf(p);
    if (!k) return;
    const old = map[k] || {};
    map[k] = {
      id: p.id || old.id || k,
      name: p.name || old.name,
      photo: p.photo || old.photo || "",
      pts: (Number(p.at||0) >= Number(old.at||0)) ? Number(p.pts||0) : Number(old.pts||0),
      pend: Number(p.pend||old.pend||0),
      tgold: Number(p.tgold||old.tgold||0),
      card: p.card || old.card || "",
      cardImg: p.cardImg || old.cardImg || "",
      weapon: p.weapon || old.weapon || "",
      relic: p.relic || old.relic || "",
      pet: p.pet || old.pet || "",
      deck: Array.isArray(p.deck) && p.deck.length ? p.deck : (old.deck || []),
      en: p.en != null ? p.en : old.en,
      gifts: p.gifts != null ? p.gifts : old.gifts,
      at: Math.max(Number(p.at||0), Number(old.at||0), Date.now())
    };
  });
  return Object.values(map).sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,50);
}
function mergeListings(cur, incoming) {
  const map = {};
  [].concat(cur||[], incoming||[]).forEach(o => {
    if (!o || !o.id) return;
    const k = String(o.sid || (o.by+"|"+o.kind+"|"+o.id+"|"+o.unit+"|"+o.qty));
    map[k] = Object.assign({}, o, { sid: k });
  });
  return Object.values(map).slice(0,80);
}
function ok(res, st) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok:true, players: st.players, listings: st.listings||[] });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  const st = load();
  if (req.method === "GET") return ok(res, st);
  if (req.method !== "POST") return res.status(405).json({ error:"POST/GET" });
  try {
    const p = req.body || {};
    const incoming = [];
    if (p.name || p.id) incoming.push(p);
    if (Array.isArray(p.peers)) incoming.push(...p.peers);
    st.players = mergePlayers(st.players, incoming);
    if (Array.isArray(p.listings)) st.listings = mergeListings(st.listings, p.listings);
    if (p.buySid && st.listings) st.listings = st.listings.filter(x => x.sid !== p.buySid && (x.by+"|"+x.kind+"|"+x.id+"|"+x.unit+"|"+x.qty) !== p.buySid);
    save(st);
    return ok(res, st);
  } catch (e) {
    return res.status(500).json({ error: String(e.message||e) });
  }
};
