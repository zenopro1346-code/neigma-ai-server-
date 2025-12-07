import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_URL = process.env.RENDER_EXTERNAL_URL;

// --- Set Webhook ---
app.get("/", async (req, res) => {
  if (!WEBHOOK_URL) return res.send("Server running without external URL yet.");
  try {
    await axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}/webhook`);
    res.send("Webhook set successfully!");
  } catch (e) {
    res.send("Webhook error: " + e.message);
  }
});

// --- Telegram Handler ---
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) return res.send("No message");

    const userText = message.text;

    // GROQ request
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

    // Send message to user
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: message.chat.id,
      text: aiText,
    });

    res.send("OK");
  } catch (e) {
    console.log(e);
    res.send("Error: " + e.message);
  }
});

// --- Start ---
app.listen(3000, () => console.log("Server running on port 3000"));
