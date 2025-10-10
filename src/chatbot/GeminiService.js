// src/chatbot/GeminiService.js
import Config from 'react-native-config';
import { Platform } from 'react-native';

const GEMINI_API_KEY = Config.GEMINI_API_KEY;
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const BACKEND_API_URL = 
  Platform.OS === 'android'
    ? 'http://10.0.2.2:4000'
    : 'http://localhost:4000';

console.log('[ENV] GEMINI prefix:', (Config.GEMINI_API_KEY || '').slice(0,8));
console.log('[ENV] URL has key?', String(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Config.GEMINI_API_KEY}`
).includes('key='));

export async function pingGemini() {  
  console.log('[Gemini] KEY?', (GEMINI_API_KEY || '').slice(0,6));

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

// 실제 대화 요청 및 로그 저장
export async function getGeminiAnswer(contents) {
  try {
    console.log('[Gemini] Sending request with contents:', contents);
    const userMessage =
      contents?.[0]?.parts?.[0]?.text?.trim?.() ||
      contents?.find?.(c => c?.parts?.[0]?.text)?.parts?.[0]?.text?.trim?.() ||
      "";

    // 캐시 먼저 조회
    if (userMessage) {
      try {
        const cacheRes = await fetch(`${BACKEND_API_URL}/api/chatlogs/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage }),
        });
        const cache = await cacheRes.json();
        if (cache?.found && cache?.botMessage) {
          console.log("Cache hit. Returning cached answer.");
          return cache.botMessage;
        }
      } catch (e) {
        console.warn("cache lookup failed (ignored):", e?.message || e);
      }
    }

    // Gemini에게 답변 요청
    const res = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
      }),
    });
    
    console.log('[Gemini] Response status:', res.status);
    const data = await res.json();
    console.log('[Gemini] Response data:', data);

    if (!res.ok) {
      console.log('Gemini answer error:', data);
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
    }

    const botMessage =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '(no reply)';
    
    console.log('[Gemini] Bot message:', botMessage);

    // 백엔드 PostgreSQL에 로그 저장 (optional, 실패해도 답변은 반환)
    try {
      const sessionId = `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('[Gemini] Saving to PostgreSQL:', {
        sessionId,
        userMessage: userMessage.substring(0, 100) + '...',
        botMessage: botMessage.substring(0, 100) + '...'
      });
      
      const logResponse = await fetch(`${BACKEND_API_URL}/api/chatlogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userMessage,
          botMessage,
          userId: 'anonymous', // 추후 사용자 인증 시 실제 user_id 사용
          meta: {
            timestamp: new Date().toISOString(),
            platform: 'react-native',
            model: 'gemini-2.5-flash'
          }
        }),
      });
      
      if (logResponse.ok) {
        console.log('[Gemini] Successfully saved to PostgreSQL');
      } else {
        console.warn('[Gemini] PostgreSQL save failed:', logResponse.status);
      }
    } catch (logError) {
      console.warn('[Gemini] PostgreSQL log save failed:', logError?.message || logError);
    }

    // 결과 반환
    return botMessage;
  } catch (err) {
    console.error('getGeminiAnswer failed:', err);
    throw err;
  }
}