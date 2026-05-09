import { useState, useCallback } from 'react';
import {
  SYSTEM_PROMPT,
  buildGeminiPayload,
  buildUserMessage,
  getStoredGeminiKey,
  setStoredGeminiKey,
} from '../utils/buildPrompt.js';
import { streamGeminiContent, generateGeminiContent, geminiErrorMessage } from '../utils/gemini.js';
import { MarkdownRenderer } from './MarkdownRenderer.jsx';
import styles from './AIAnalysisPanel.module.css';

export function AIAnalysisPanel({ buyRows, sellRows, allMetrics, statsReady }) {
  const [apiKeyPresent, setApiKeyPresent] = useState(() => Boolean(getStoredGeminiKey()));
  const [showKeyEditor, setShowKeyEditor] = useState(() => !getStoredGeminiKey());
  const [keyDraft, setKeyDraft] = useState('');

  const [analysis, setAnalysis] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [analysisTime, setAnalysisTime] = useState(null);

  const saveKey = useCallback(() => {
    const k = keyDraft.trim();
    if (!k) return;
    setStoredGeminiKey(k);
    setKeyDraft('');
    setApiKeyPresent(true);
    setShowKeyEditor(false);
  }, [keyDraft]);

  const startChangeKey = useCallback(() => {
    setShowKeyEditor(true);
    setKeyDraft('');
  }, []);

  const runAnalysis = useCallback(async () => {
    const apiKey = getStoredGeminiKey();
    if (!apiKey || !statsReady) return;

    setError(null);
    setAnalysis('');
    setStreaming(true);
    setAnalysisTime(null);

    const payload = buildGeminiPayload({ buyRows, sellRows, allMetrics });
    const userMessage = buildUserMessage(payload);

    try {
      let accumulated = '';
      try {
        for await (const chunk of streamGeminiContent(apiKey, SYSTEM_PROMPT, userMessage)) {
          accumulated += chunk;
          setAnalysis(accumulated);
        }
      } catch (streamErr) {
        if (streamErr?.status) throw streamErr;
        accumulated = await generateGeminiContent(apiKey, SYSTEM_PROMPT, userMessage);
        setAnalysis(accumulated);
      }

      setAnalysisTime(new Date());
    } catch (e) {
      const st = typeof e?.status === 'number' ? e.status : null;
      const msg =
        st != null ? geminiErrorMessage(st) : e instanceof Error ? e.message : 'Analysis failed';
      setError(msg);
    } finally {
      setStreaming(false);
    }
  }, [buyRows, sellRows, allMetrics, statsReady]);

  const canAnalyze = apiKeyPresent && statsReady && !streaming;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>AI Market Analysis</h2>

      {showKeyEditor ? (
        <div className={styles.keyBox}>
          <p className={styles.keyIntro}>
            Enter your free Gemini API key to enable AI analysis
          </p>
          <a
            className={styles.keyLink}
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get a free key at aistudio.google.com →
          </a>
          <div className={styles.keyRow}>
            <input
              type="password"
              className={styles.keyInput}
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="API key"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className={styles.saveKey} onClick={saveKey} disabled={!keyDraft.trim()}>
              Save Key
            </button>
          </div>
          <p className={styles.keyNote}>Free tier — 15 requests/min, no credit card needed</p>
        </div>
      ) : (
        <div className={styles.keySavedRow}>
          <button type="button" className={styles.changeKey} onClick={startChangeKey}>
            Change API Key
          </button>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.analyze} onClick={runAnalysis} disabled={!canAnalyze}>
          {streaming ? (
            <>
              <span className={styles.spinner} aria-hidden />
              Analyzing…
            </>
          ) : analysis ? (
            'Re-analyze'
          ) : (
            'Analyze Market →'
          )}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {(analysis || streaming) && (
        <div className={styles.output}>
          <MarkdownRenderer markdown={analysis} />
          {streaming && <span className={styles.cursor} aria-hidden />}
        </div>
      )}

      {analysisTime && !streaming && (
        <p className={styles.timestamp}>
          Analysis generated at{' '}
          {analysisTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      )}
    </section>
  );
}
