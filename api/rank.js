const KV = "https://keyvalue.immanuel.co/api/KeyVal";
const APP = "e8d7wezm";

function empty() { return { players: [], listings: [], ads: [], mktWipe: 0, sales: {} }; }

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

function packMkt(list) {
  return (list || []).map(o => [
    String(o.sid || o.idKey || [o.by,o.kind,o.id,o.pay||"pts"].join(".")).replace(/[|~]/g,"").slice(0,40),
    String(o.kind||"card"),
    String(o.id||"").replace(/[|~]/g,"").slice(0,24),
    String(o.qty||1),
    String(o.unit||o.price||0),
    String(o.pay||"pts"),
    String(o.by||"").replace(/[|~]/g,"").slice(0,24),
    String(o.at||0)
  ].join("|")).join("~");
}
function unpackMkt(txt) {
  if (!txt) return [];
  return String(txt).split("~").map(row => {
    const p = String(row).split("|");
    if (!p[2]) return null;
    return {
      sid: p[0], kind: p[1]||"card", id: p[2], qty: Number(p[3]||1),
      unit: Number(p[4]||0), price: Number(p[4]||0)*Number(p[3]||1),
      pay: p[5]||"pts", by: p[6]||"", at: Number(p[7]||0)
    };
  }).filter(Boolean);
}
async function loadRemoteMkt() {
  const a = await kvGet("pgM1");
  const b = await kvGet("pgM2");
  const wipe = Number(await kvGet("pgWipe") || 0);
  return { list: unpackMkt((a||"")+(b||"")), wipe };
}
async function saveRemote(st) {
  const packed = pack(st);
  await kvSet("pgA", packed.slice(0, 900));
  await kvSet("pgB", packed.slice(900, 1800));
  const ads = packAds(st.ads || []);
  await kvSet("pgAdA", ads.slice(0, 900));
  await kvSet("pgAdB", ads.slice(900, 1800));
  const m = packMkt(st.listings || []);
  await kvSet("pgM1", m.slice(0, 900));
  await kvSet("pgM2", m.slice(900, 1800));
  await kvSet("pgWipe", String(st.mktWipe || 0));
  const sales = st.sales || {};
  const pay = Object.keys(sales).map(k => k+","+(sales[k].pts||0)+","+(sales[k].tgold||0)).join("~");
  await kvSet("pgPay", pay.slice(0, 900));
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
    if (!st.listingsLoaded) {
      const rem = await loadRemoteMkt();
      st.mktWipe = Math.max(st.mktWipe||0, rem.wipe||0);
      if (rem.list && rem.list.length && !(st.listings||[]).length) st.listings = rem.list;
      st.listingsLoaded = true;
    }
    if (!st.salesLoaded) {
      try {
        const raw = await kvGet("pgPay");
        const sales = {};
        String(raw||"").split("~").forEach(row => {
          const a = String(row).split(",");
          if (!a[0]) return;
          sales[a[0].toLowerCase()] = { pts: Number(a[1]||0), tgold: Number(a[2]||0) };
        });
        st.sales = Object.assign({}, sales, st.sales||{});
      } catch(e) {}
      st.salesLoaded = true;
    }
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, players: st.players, listings: st.listings || [], ads: st.ads || [], mktWipe: st.mktWipe||0, sale: mySale || {pts:0,tgold:0} });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "POST/GET" });

    const p = req.body || {};
    if (p.clearMarket) {
      st.listings = [];
      st.mktWipe = Date.now();
      globalThis.pgStore = st;
      await saveRemote(st);
      return res.status(200).json({ ok: true, players: st.players, listings: [], ads: st.ads || [], mktWipe: st.mktWipe });
    }
    if (!st.sales) st.sales = {};
    function saleKeys(s) {
      const raw = String(s||"").toLowerCase().replace(/^@/, "").trim();
      return raw ? [raw, raw.replace(/[^a-z0-9]/g,"")] : [];
    }
    if (p.sale && (p.sale.to || p.sale.by)) {
      saleKeys(p.sale.to || p.sale.by).forEach(k => {
        const cur = st.sales[k] || { pts: 0, tgold: 0 };
        cur.pts += Number(p.sale.pts || 0);
        cur.tgold += Number(p.sale.tgold || 0);
        st.sales[k] = cur;
      });
    }
    const meKey = keyOf(p);
    const meKeys = Array.from(new Set([meKey].concat(saleKeys(p.name), saleKeys(p.id)).filter(Boolean)));
    let mySale = { pts: 0, tgold: 0 };
    meKeys.forEach(k => {
      if (st.sales[k]) {
        mySale.pts += Number(st.sales[k].pts||0);
        mySale.tgold += Number(st.sales[k].tgold||0);
      }
    });
    if (p.claimSale) {
      meKeys.forEach(k => { if (st.sales[k]) st.sales[k] = { pts: 0, tgold: 0 }; });
    }
    const incoming = [];
    if (p.name || p.id) incoming.push(p);
    if (Array.isArray(p.peers)) incoming.push(...p.peers);
    st.players = mergePlayers(st.players, incoming);
    if (Array.isArray(p.listings) && p.listings.length) {
      const wipe = Number(st.mktWipe || 0);
      if (!st.dead) st.dead = {};
      const map = {};
      [].concat(st.listings || [], p.listings).forEach(o => {
        if (!o || !o.id) return;
        const at = Number(o.at || 0);
        if (wipe && at && at < wipe) return;
        if (wipe && !at) return;
        const k = String(o.sid || o.idKey || [o.by, o.kind, o.id, o.pay||"pts"].join("|"));
        if (o.gone || o.qty===0) { st.dead[k] = Math.max(st.dead[k]||0, at||Date.now()); return; }
        if (st.dead[k] && at <= st.dead[k]) return;
        const prev = map[k] || {};
        const row = Object.assign({}, prev, o, { sid: k, at: Math.max(at, Number(prev.at||0), wipe) });
        map[k] = row;
      });
      st.listings = Object.values(map).filter(x => !x.gone && (x.qty||1)>0 && !(st.dead[x.sid] && Number(x.at||0) <= st.dead[x.sid])).slice(0, 80);
    }
    if (Array.isArray(p.ads) && p.ads.length) {
      st.ads = mergeAds(st.ads || [], p.ads);
    }
    globalThis.pgStore = st;
    saveRemote(st).catch(() => {});
    return res.status(200).json({ ok: true, players: st.players, listings: st.listings || [], ads: st.ads || [], mktWipe: st.mktWipe||0, sale: {pts:0,tgold:0} });
  } catch (e) {
    return res.status(200).json({ ok: false, players: st.players || [], listings: st.listings || [], ads: st.ads || [], error: String(e.message || e) });
  }
}
