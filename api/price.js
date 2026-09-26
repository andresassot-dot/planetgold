export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
  try {
    const r = await fetch(
      "https://api.geckoterminal.com/api/v2/networks/solana/pools/GXjeLNKFiwh3pfbYWS3Cn7GMKxSNJXBeGvymaVWc5cHS",
      { headers: { Accept: "application/json" } }
    );
    const j = await r.json();
    const a = j.data && j.data.attributes;
    if (!a) return res.status(502).json({ error: "sin datos" });
    return res.status(200).json({
      symbol: "TGOLD",
      price: Number(a.base_token_price_usd),
      change24: Number((a.price_change_percentage && a.price_change_percentage.h24) || 0),
      liq: Number(a.reserve_in_usd),
      vol: Number((a.volume_usd && a.volume_usd.h24) || 0),
      fdv: Number(a.fdv_usd)
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
