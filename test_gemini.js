import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // .env 파일 로드

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function getGeminiAnswer(sessionId, userMessage) {
  try {
    console.log("🔹 Sending to Gemini:", userMessage);
    const res = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.log("❌ Gemini answer error:", data);
      throw new Error(`HTTP ${res.status}`);
    }

    const botMessage = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no reply)";
    console.log("✅ Gemini response:", botMessage);
  } catch (err) {
    console.error("🔥 Error:", err);
  }
}

getGeminiAnswer("test-session", "오늘 서울 날씨 어때?");