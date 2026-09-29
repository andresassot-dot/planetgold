const KV = "https://keyvalue.immanuel.co/api/KeyVal";
const APP = "e8d7wezm";

function empty() { return { players: [], listings: [], ads: [] }; }

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
  return Object.values(map).sort((a, b) => (b.pts || 0) - (a.pts || 0)).slice(0, 40);
}

function pack(st) {
  const rows = (st.players || []).map(p => {
    const id = String(p.id || p.name || "").replace(/^@/, "").replace(/[^a-zA-Z0-9._-]/g, "");
    const name = String(p.name || id).replace(/[@,~]/g, "");
    const card = String(p.card || "").replace(/[,~]/g, " ");
    return [id, name, p.pts || 0, card, p.at || 0].join(",");
  });
  return rows.join("~");
}
function unpack(txt) {
  if (!txt) return [];
  return String(txt).split("~").map(row => {
    const parts = String(row).split(",");
    const id = parts[0], name = parts[1], pts = parts[2], card = parts[3], at = parts[4];
    if (!id && !name) return null;
    const nick = name || id;
    return {
      id: String(id || nick).toLowerCase().replace(/^@/, ""),
      name: nick.startsWith("@") ? nick : ("@" + nick.replace(/^@/, "")),
      pts: Number(pts || 0),
      card: card || "",
      at: Number(at || 0),
      cardImg: "",
      photo: "",
      deck: []
    };
  }).filter(Boolean);
}

async function kvGet(k) {
  try {
    const r = await fetch(KV + "/GetValue/" + APP + "/" + k);
    const t = await r.text();
    return t.replace(/^"|"$/g, "");
  } catch (e) { return ""; }
}
async function kvSet(k, v) {
  const val = encodeURIComponent(String(v).slice(0, 1000));
  await fetch(KV + "/UpdateValue/" + APP + "/" + k + "/" + val, { method: "POST" });
}

function packAds(list) {
  return (list || []).map(a => [
    String(a.id || "").replace(/[|~]/g, ""),
    String(a.kind || "canal").replace(/[|~]/g, ""),
    String(a.title || "").replace(/[|~]/g, " ").slice(0, 40),
    String(a.url || "").replace(/[|~]/g, "").slice(0, 160),
    String(a.left == null ? 100 : a.left),
    String(a.by || "").replace(/[|~]/g, "").slice(0, 24),
    String(a.at || Date.now())
  ].join("|")).join("~");
}
function unpackAds(txt) {
  if (!txt) return [];
  return String(txt).split("~").map(row => {
    const p = String(row).split("|");
    if (!p[0] || !p[3]) return null;
    return {
      id: p[0], kind: p[1] || "canal", title: p[2] || "Anuncio", url: p[3],
      left: Math.max(0, Number(p[4] || 100)), by: p[5] || "", at: Number(p[6] || Date.now())
    };
  }).filter(Boolean);
}
function mergeAds(a, b) {
  const map = {};
  [].concat(a || [], b || []).forEach(x => {
    if (!x || !x.id || !x.url) return;
    const old = map[x.id] || {};
    map[x.id] = Object.assign({}, old, x, {
      left: Math.min(old.left != null ? old.left : 100, x.left != null ? x.left : 100)
    });
  });
  return Object.values(map).filter(x => x.left > 0).slice(0, 20);
}

async function loadRemote() {
  const a = await kvGet("pgA");
  const b = await kvGet("pgB");
  return mergePlayers([], unpack((a || "") + (b || "")));
}
async function loadRemoteAds() {
  const a = await kvGet("pgAdA");
  const b = await kvGet("pgAdB");
  return unpackAds((a || "") + (b || ""));
}

async function saveRemote(st) {
  const packed = pack(st);
  await kvSet("pgA", packed.slice(0, 900));
  await kvSet("pgB", packed.slice(900, 1800));
  const ads = packAds(st.ads || []);
  await kvSet("pgAdA", ads.slice(0, 900));
  await kvSet("pgAdB", ads.slice(900, 1800));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!globalThis.pgStore) globalThis.pgStore = empty();
  const st = globalThis.pgStore;

  try {
    if (!st.players.length) {
      const remote = await loadRemote();
      if (remote.length) st.players = mergePlayers(st.players, remote);
    }
    if (!st.ads || !st.ads.length) {
      const remoteAds = await loadRemoteAds();
      if (remoteAds.length) st.ads = mergeAds(st.ads || [], remoteAds);
    }
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, players: st.players, listings: st.listings || [], ads: st.ads || [] });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "POST/GET" });

    const p = req.body || {};
    if (p.clearMarket) {
      st.listings = [];
      globalThis.pgStore = st;
      saveRemote(st).catch(() => {});
      return res.status(200).json({ ok: true, players: st.players, listings: [], ads: st.ads || [] });
    }
    const incoming = [];
    if (p.name || p.id) incoming.push(p);
    if (Array.isArray(p.peers)) incoming.push(...p.peers);
    st.players = mergePlayers(st.players, incoming);
    if (Array.isArray(p.listings) && p.listings.length) {
      const map = {};
      [].concat(st.listings || [], p.listings).forEach(o => {
        if (!o || !o.id) return;
        const k = String(o.sid || o.idKey || [o.by, o.kind, o.id, o.pay||"pts"].join("|"));
        const prev = map[k] || {};
        const row = Object.assign({}, prev, o, { sid: k });
        if (o.gone || o.qty===0) row.gone = 1;
        map[k] = row;
      });
      st.listings = Object.values(map).filter(x => !x.gone && (x.qty||1)>0).slice(0, 80);
    }
    if (Array.isArray(p.ads) && p.ads.length) {
      st.ads = mergeAds(st.ads || [], p.ads);
    }
    globalThis.pgStore = st;
    saveRemote(st).catch(() => {});
    return res.status(200).json({ ok: true, players: st.players, listings: st.listings || [], ads: st.ads || [] });
  } catch (e) {
    return res.status(200).json({ ok: false, players: st.players || [], listings: st.listings || [], ads: st.ads || [], error: String(e.message || e) });
  }
}
