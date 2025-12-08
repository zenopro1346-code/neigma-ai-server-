import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// ====================== ROOT → SET WEBHOOK ======================
app.get("/", async (req, res) => {
  const url = `https://${req.headers.host}/webhook`;
  await axios.get(`${TELEGRAM_API}/setWebhook?url=${url}`);
  res.send("Webhook set successfully");
});

// ====================== TELEGRAM WEBHOOK ======================
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const userText = message.text || "";

    const ai = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: userText }],
      },
      {
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      }
    );

    const reply = ai.data.choices[0].message.content;

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: reply,
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

// ====================== /AI ENDPOINT ======================
app.post("/ai", async (req, res) => {
  try {
    const prompt = req.body.prompt || "";

    const ai = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      }
    );

    res.json({ reply: ai.data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "AI error" });
  }
});

// ====================== START SERVER ======================
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
      
