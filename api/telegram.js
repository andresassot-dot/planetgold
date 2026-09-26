const URL = "https://planetgold.vercel.app";
const BOT = "https://t.me/Planetgoldgame_bot";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");
  const token = process.env.BOT_TOKEN;
  if (!token) return res.status(200).json({ ok: false });

  const update = req.body || {};
  const msg = update.message;
  if (!msg || !msg.text) return res.status(200).json({ ok: true });

  const text = String(msg.text).split("@")[0].trim().toLowerCase();
  if (text !== "/play" && text !== "/start" && text !== "/jugar") {
    return res.status(200).json({ ok: true });
  }

  const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
  const body = {
    chat_id: msg.chat.id,
    text: isGroup
      ? "PLANET GOLD\nToca el botón y abre el juego en el bot."
      : "PLANET GOLD\nElige ficha, dispara a la portería y gana tgold.",
    reply_markup: {
      inline_keyboard: isGroup
        ? [[{ text: "🎮 JUGAR AHORA", url: BOT }]]
        : [[{ text: "🎮 JUGAR AHORA", web_app: { url: URL } }]]
    }
  };

  await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.status(200).json({ ok: true });
}
