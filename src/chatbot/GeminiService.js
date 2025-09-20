// src/chatbot/GeminiService.js
import Config from 'react-native-config';

const GEMINI_API_KEY = Config.GEMINI_API_KEY;
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function pingGemini() {
  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.log('Ping error payload:', data);
    throw new Error(`HTTP ${res.status}`);
  }
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function getGeminiAnswer(messages) {
  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: messages }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.log('Answer error payload:', data);
    throw new Error(`HTTP ${res.status}`);
  }
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}