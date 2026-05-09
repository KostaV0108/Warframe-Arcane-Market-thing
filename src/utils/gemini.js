/** Override with `VITE_GEMINI_MODEL` (e.g. gemini-2.5-flash). */
function getModel() {
  const m = import.meta.env.VITE_GEMINI_MODEL;
  //return typeof m === 'string' && m.trim() ? m.trim() : 'gemini-2.5-pro';
  return 'gemini-2.5-flash';
}

/**
 * Pro / thinking models need headroom; 1024 often cuts replies mid-sentence.
 * Override with `VITE_GEMINI_MAX_OUTPUT_TOKENS`.
 */
function getMaxOutputTokens() {
  const raw = import.meta.env.VITE_GEMINI_MAX_OUTPUT_TOKENS;
  if (raw === undefined || raw === '') return 8192;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 65536) : 8192;
}

function buildRequestBody(systemText, userText) {
  return {
    systemInstruction: {
      parts: [{ text: systemText }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userText }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 14096,
      temperature: 0.4,
    },
  };
}

export function geminiErrorMessage(status) {
  switch (status) {
    case 400:
      return 'Invalid request — check that your data loaded fully before analyzing';
    case 403:
      return 'Invalid API key — get a free one at aistudio.google.com';
    case 404:
      return 'Gemini model not found (404) — refresh after updating the app, or set VITE_GEMINI_MODEL to an available model from aistudio.google.com';
    case 429:
      return 'Rate limited (15 req/min on free tier) — wait a moment and try again';
    case 500:
      return 'Gemini service error — try again in a few seconds';
    default:
      return `Request failed (${status}) — try again later`;
  }
}

/** Extract incremental text from one streamed JSON value (object or array root). */
function extractDeltaText(data) {
  if (data == null) return '';
  if (Array.isArray(data)) {
    return data.map((d) => extractDeltaText(d)).join('');
  }
  const candidates = data.candidates;
  if (!Array.isArray(candidates)) return '';
  let out = '';
  for (const c of candidates) {
    const parts = c?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const p of parts) {
      if (typeof p?.text === 'string') out += p.text;
    }
  }
  return out;
}

function* parseSseLines(textBlock) {
  const lines = textBlock.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.startsWith('data: ') ? trimmed.slice(6).trim() : trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const data = JSON.parse(payload);
      const text = extractDeltaText(data);
      if (text) yield text;
    } catch {
      /* skip malformed chunks */
    }
  }
}

/**
 * Stream Gemini text chunks. Yields incremental text segments (often small deltas).
 */
export async function* streamGeminiContent(apiKey, systemText, userText) {
  const key = apiKey?.trim();
  if (!key) throw new Error('Missing API key');

  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(systemText, userText)),
  });

  if (!response.ok) {
    const err = new Error(geminiErrorMessage(response.status));
    err.status = response.status;
    throw err;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let carry = '';

  while (true) {
    const { done, value } = await reader.read();
    carry += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = carry.split('\n');
    carry = lines.pop() ?? '';

    for (const text of parseSseLines(lines.join('\n'))) {
      yield text;
    }

    if (done) break;
  }

  // Flush any final line not terminated with \n (rare for Gemini SSE).
  if (carry.trim()) {
    for (const text of parseSseLines(carry)) {
      yield text;
    }
    const last = carry.trim();
    if (!last.startsWith('data:') && (last.startsWith('{') || last.startsWith('['))) {
      try {
        const data = JSON.parse(last);
        const text = extractDeltaText(data);
        if (text) yield text;
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Non-streaming fallback.
 */
export async function generateGeminiContent(apiKey, systemText, userText) {
  const key = apiKey?.trim();
  if (!key) throw new Error('Missing API key');

  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(systemText, userText)),
  });

  if (!response.ok) {
    const err = new Error(geminiErrorMessage(response.status));
    err.status = response.status;
    throw err;
  }

  const json = await response.json();
  const text = extractDeltaText(json);
  return text || '';
}
