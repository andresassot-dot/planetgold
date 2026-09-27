const fs = require("fs");
const FILE = "/tmp/pg-rank.json";

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) { return []; }
}
function save(board) {
  try { fs.writeFileSync(FILE, JSON.stringify(board)); } catch (e) {}
}
function keyOf(p) {
  return String((p && (p.name || p.id)) || "").toLowerCase().replace(/^@/, "").trim();
}
function merge(board, rows) {
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
      pts: Math.max(Number(p.pts||0), Number(old.pts||0)),
      pend: Number(p.pend||old.pend||0),
      tgold: Number(p.tgold||old.tgold||0),
      card: p.card || old.card || "",
      cardImg: p.cardImg || old.cardImg || "",
      weapon: p.weapon || old.weapon || "",
      relic: p.relic || old.relic || "",
      pet: p.pet || old.pet || "",
      en: p.en != null ? p.en : old.en,
      gifts: p.gifts != null ? p.gifts : old.gifts,
      at: Math.max(Number(p.at||0), Number(old.at||0), Date.now())
    };
  });
  return Object.values(map).sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,40);
}

function ok(res, board) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok:true, players: board });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  let board = load();
  if (req.method === "GET") return ok(res, board);

  if (req.method !== "POST") return res.status(405).json({ error:"POST/GET" });
  try {
    const p = req.body || {};
    const incoming = [];
    if (p.name || p.id) incoming.push(p);
    if (Array.isArray(p.peers)) incoming.push(...p.peers);
    board = merge(board, incoming);
    save(board);
    return ok(res, board);
  } catch (e) {
    return res.status(500).json({ error: String(e.message||e) });
  }
};
