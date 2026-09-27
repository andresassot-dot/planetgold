let ads = [];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    ads = ads.filter(a => (a.left||0) > 0);
    return res.status(200).json({ ok:true, ads });
  }

  if (req.method !== "POST") return res.status(405).json({ error:"POST/GET" });
  const b = req.body || {};
  const act = b.act || "pub";

  if (act === "pub") {
    const row = {
      id: String(b.id || ("ad"+Date.now())),
      kind: String(b.kind||"canal").slice(0,20),
      url: String(b.url||"").slice(0,240),
      title: String(b.title||"Anuncio").slice(0,60),
      by: String(b.by||"").slice(0,40),
      left: 100,
      hits: 0,
      seen: [],
      at: Date.now()
    };
    if (!row.url) return res.status(400).json({ error:"url" });
    ads.unshift(row);
    ads = ads.slice(0,40);
    return res.status(200).json({ ok:true, ads });
  }

  if (act === "hit") {
    const who = String(b.who||"").slice(0,40);
    const ad = ads.find(x => x.id===b.id);
    if (!ad) return res.status(200).json({ ok:false, ads });
    if (who && ad.seen.includes(who)) {
      return res.status(200).json({ ok:true, already:true, ads });
    }
    if (who) ad.seen.push(who);
    if (ad.seen.length > 120) ad.seen = ad.seen.slice(-120);
    ad.hits = (ad.hits||0)+1;
    ad.left = Math.max(0, (ad.left||100)-1);
    ads = ads.filter(a => (a.left||0) > 0);
    return res.status(200).json({ ok:true, ads });
  }

  return res.status(200).json({ ok:true, ads });
};
