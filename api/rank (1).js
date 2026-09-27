let board = [];

function ok(res, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(200).json(data);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const list = board.slice().sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,30);
    return ok(res, { ok:true, players:list });
  }

  if (req.method !== "POST") return res.status(405).json({ error:"POST/GET" });
  try {
    const p = req.body || {};
    const id = String(p.id || p.name || "").slice(0,80);
    if (!id) return res.status(400).json({ error:"falta id" });
    const row = {
      id,
      name: String(p.name || "Jugador").slice(0,40),
      photo: String(p.photo || "").slice(0,300),
      pts: Number(p.pts||0),
      pend: Number(p.pend||0),
      tgold: Number(p.tgold||0),
      card: String(p.card || "").slice(0,40),
      cardImg: String(p.cardImg || "").slice(0,200),
      weapon: String(p.weapon || "").slice(0,40),
      relic: String(p.relic || "").slice(0,40),
      pet: String(p.pet || "").slice(0,40),
      at: Date.now()
    };
    const key = String(row.name||id).toLowerCase().replace(/^@/,"");
    board = board.filter(x => String(x.name||x.id).toLowerCase().replace(/^@/,"") !== key && x.id !== id);
    board.push(row);
    if (board.length > 80) board = board.sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,80);
    return ok(res, { ok:true, players: board.sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,30) });
  } catch (e) {
    return res.status(500).json({ error: String(e.message||e) });
  }
};
