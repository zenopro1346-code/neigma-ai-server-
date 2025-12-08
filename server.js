import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// ENV
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Telegram API
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_URL = `https://neigma-ai-server-3.onrender.com/webhook`;

// ----------------------
// 1) SET TELEGRAM WEBHOOK
// ----------------------
app.get("/", async (req, res) => {
  if (!TELEGRAM_TOKEN) return res.send("Missing TELEGRAM_TOKEN");

  try {
    await axios.get(
      `${TELEGRAM_API}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}`
    );
    res.send("Webhook set successfully");
  } catch (err) {
    res.send("Error setting webhook: " + err.message);
  }
});

// ----------------------
// 2) TELEGRAM MESSAGE HANDLER
// ----------------------
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const userText = message.text;

    // Groq Request
    const groqResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: userText }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    const botReply = groqResponse.data.choices[0].message.content;

    // Send reply to Telegram
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: message.chat.id,
      text: botReply,
    });

    res.sendStatus(200);
  } catch (err) {
    console.log("TELEGRAM ERROR:", err.message);
    res.sendStatus(200);
  }
});

// ----------------------
// 3) AI API FOR SUPERAPP
// ----------------------
app.post("/ai", async (req, res) => {
  try {
    const userText = req.body.message;

    const groqResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: userText }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    const aiText = groqResponse.data.choices[0].message.content;

    res.send({ reply: aiText });
  } catch (err) {
    res.send({ error: err.message });
  }
});

// ----------------------
// 4) START SERVER
// ----------------------
app.listen(3000, () => console.log("Server running on port 3000"));
