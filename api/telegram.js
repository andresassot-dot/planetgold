const URL = "https://planetgold.vercel.app";

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

  const body = {
    chat_id: msg.chat.id,
    text:
      "PLANET GOLD\nElige ficha, dispara a la portería y gana tgold.\nToca JUGAR para abrir el Mini App.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎮 JUGAR AHORA", web_app: { url: URL } }]
      ]
    }
  };

  // In groups Telegram often requires url button instead of web_app
  if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
    body.reply_markup = {
      inline_keyboard: [
        [{ text: "🎮 JUGAR AHORA", url: "https://t.me/Planetgoldgame_bot?startapp" }]
      ]
    };
  }

  await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.status(200).json({ ok: true });
}
