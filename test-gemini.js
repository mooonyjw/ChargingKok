// testGemini.js
import dotenv from 'dotenv';
dotenv.config(); // .env 파일 로드

// RN에서 쓰는 Config 대신 dotenv로 대체
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function pingGemini() {
  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.log('❌ Error payload:', data);
    throw new Error(`HTTP ${res.status}`);
  }
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function main() {
  console.log('🔑 API Key exists?', !!GEMINI_API_KEY);
  try {
    const pong = await pingGemini();
    console.log('✅ Pong:', pong);
  } catch (err) {
    console.error('🚨 Error:', err);
  }
}

main();