const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, transfer } = require("@solana/spl-token");
const bs58 = require("bs58");
const MINT = new PublicKey("CBQx46tG5sUcm5bT3jV7oqNo2wvzfqevghmPvcRp6ray");
const RPC = "https://api.mainnet-beta.solana.com";
function loadKey(raw) {
  const s = String(raw || "").trim();
  if (!s) throw new Error("Falta TREASURY_SECRET");
  if (s.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(s)));
  try { return Keypair.fromSecretKey(bs58.decode(s)); } catch (e) {}
  if (/^[0-9a-fA-F]+$/.test(s) && s.length >= 64) {
    return Keypair.fromSeed(Buffer.from(s.slice(0, 64), "hex"));
  }
  throw new Error("Formato de clave no reconocido");
}
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const wallet = (req.body && req.body.wallet) || "";
    if (!wallet || wallet.length < 32) return res.status(400).json({ error: "wallet invalida" });
    const payer = loadKey(process.env.TREASURY_SECRET);
    const dest = new PublicKey(wallet);
    const conn = new Connection(RPC, "confirmed");
    const fromAta = await getAssociatedTokenAddress(MINT, payer.publicKey);
    const toAta = await getOrCreateAssociatedTokenAccount(conn, payer, MINT, dest);
    const sig = await transfer(conn, payer, fromAta, toAta.address, payer.publicKey, 1000000);
    return res.status(200).json({ ok: true, sig });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};