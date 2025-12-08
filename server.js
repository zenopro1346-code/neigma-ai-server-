import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import fs from "fs-extra";
import cors from "cors";

let TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
let GROQ_API_KEY = process.env.GROQ_API_KEY || "";

const app = express();
app.use(bodyParser.json({ limit: "20mb" }));
app.use(cors());

// ================= AI CORE =================
async function ai(prompt) {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data.choices[0].message.content;
  } catch (err) {
    return "❌ Groq API Error: " + (err?.response?.data?.error?.message || err);
  }
}

// =============== PROJECT BUILDER ===============
async function buildProject(instruction) {
  const out = await ai(`
You are a project-builder AI.
Output files in EXACT RAW FORMAT:

---filename---
folder/file.ext
---content---
<the file content>
---end---

INSTRUCTION: ${instruction}
  `);

  const files = out.split("---filename---").slice(1);

  for (const block of files) {
    const [path, rest] = block.split("---content---");
    const [content] = rest.split("---end---");

    const filePath = path.trim();
    const fileContent = content.trim();

    await fs.outputFile("./projects/" + filePath, fileContent);
  }

  return "✔ پروژه با موفقیت ساخته شد!";
}

// ================= RUNNER =================
async function runTask(cmd) {
  return await ai(`
You are an execution agent.
Process this command and return a meaningful result:

${cmd}
  `);
}

// ================= MASTER AGENT =================
async function agent(msg) {
  if (msg.startsWith("build:"))
    return await buildProject(msg.replace("build:", "").trim());

  if (msg.startsWith("run:"))
    return await runTask(msg.replace("run:", "").trim());

  return await ai(msg);
}

// ================= TELEGRAM BOT =================
app.post("/telegram/webhook", async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg) return res.sendStatus(200);

    const text = msg.text || "";
    const chat = msg.chat.id;

    const reply = await agent(text);

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: chat,
        text: reply
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.log("Telegram Error:", err?.response?.data || err);
    res.sendStatus(200);
  }
});

// ================= REST APIs =================
app.post("/builder", async (req, res) => {
  const output = await buildProject(req.body.instruction || "");
  res.json({ output });
});

app.post("/agent", async (req, res) => {
  const output = await agent(req.body.command || "");
  res.json({ output });
});

// ================= HOME =================
app.get("/", (req, res) => {
  res.send("AI Builder System (Safe Single File) Running");
});

// ================= START =================
app.listen(3000, () => console.log("🔥 Server running on port 3000 🔥"));

// ================= API KEYS (RENDER SETS THESE) =================
TELEGRAM_TOKEN = "";
GROQ_API_KEY = "";
          
