import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// ENV
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BOT_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// AI simple responder
async function ai(prompt) {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
      },
      { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
    );

    return res.data.choices?.[0]?.message?.content || "No response";
  } catch (e) {
    return "AI error: " + e.message;
  }
}

// Telegram Webhook
app.post("/telegram/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const msg = req.body.message;
    if (!msg || !msg.text) return;
    const chatId = msg.chat.id;
    const text = msg.text;

    const reply = await ai(text);

    await axios.post(`${BOT_URL}/sendMessage`, {
      chat_id: chatId,
      text: reply
    });
  } catch (e) {
    console.log("Webhook error:", e.message);
  }
});

// Set Webhook
app.get("/", async (req, res) => {
  try {
    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    const hook = `${renderUrl}/telegram/webhook`;

    await axios.get(`${BOT_URL}/setWebhook`, {
      params: { url: hook }
    });

    res.send("Webhook set successfully");
  } catch (e) {
    res.send("Webhook error: " + e.message);
  }
});

// AI endpoint
app.post("/ai", async (req, res) => {
  const prompt = req.body.prompt;
  const response = await ai(prompt);
  res.json({ response });
});

// Agent endpoint
app.post("/agent", async (req, res) => {
  const input = req.body.input;
  const response = await ai("Act like an agent: " + input);
  res.json({ response });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server running on port", port);
});
