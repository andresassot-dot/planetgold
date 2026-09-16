const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const spl = require("@solana/spl-token");
const bs58 = require("bs58");
const MINT = new PublicKey("CBQx46tG5sUcm5bT3jV7oqNo2wvzfqevghmPvcRp6ray");
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const wallet = (req.body && req.body.wallet) || "";
    if (!wallet || wallet.length < 32) return res.status(400).json({ error: "wallet invalida" });
    const raw = String(process.env.TREASURY_SECRET || "").trim();
    if (!raw) return res.status(500).json({ error: "Falta TREASURY_SECRET" });
    let payer;
    try {
      if (raw.startsWith("[")) payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
      else payer = Keypair.fromSecretKey(bs58.decode(raw));
    } catch (e) {
      return res.status(500).json({ error: "Clave tesoreria formato raro" });
    }
    const dest = new PublicKey(wallet);
    const conn = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const fromAta = await spl.getAssociatedTokenAddress(MINT, payer.publicKey);
    const toAta = await spl.getOrCreateAssociatedTokenAccount(conn, payer, MINT, dest);
    const sig = await spl.transfer(conn, payer, fromAta, toAta.address, payer, 1000000);
    return res.status(200).json({ ok: true, sig });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};