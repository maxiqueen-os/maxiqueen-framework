'use client';
import { useState } from 'react';

type Msg = { role: 'user' | 'assistant', content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Soy MaxiQueen OS, inteligencia local. ¿En qué te ayudo hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  const speak = (text: string) => {
    if (!synth || !voiceEnabled) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = 1.0;
    synth.speak(u);
  };

  const toggleVoice = () => {
    if (voiceEnabled && synth) synth.cancel();
    setVoiceEnabled(!voiceEnabled);
  };

  const pauseVoice = () => {
    if (!synth) return;
    if (synth.speaking && !synth.paused) synth.pause();
    else if (synth.paused) synth.resume();
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const newMessages: Msg[] = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const reply = await r.text();
      const assistantMsg: Msg = { role: 'assistant', content: reply };
      setMessages([...newMessages, assistantMsg]);
      speak(reply);
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: 'Error de conexión.' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'system-ui, Inter, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: 2, color: '#facc15', margin: 0 }}>MAXIQUEEN OS</h1>
          <p style={{ color: '#9ca3af', marginTop: 8, letterSpacing: 1, fontSize: 13 }}>ARQUITECTURA DIGITAL INCORRUPTIBLE</p>
          <p style={{ color: '#facc15', fontSize: 12, marginTop: 4 }}>INTELIGENCIA LOCAL • ÉLITE ESTRATÉGICA</p>
        </div>

        <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: 16, padding: 20, minHeight: 420 }}>
          <div style={{ height: 360, overflowY: 'auto', marginBottom: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 14, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                <span style={{
                  display: 'inline-block',
                  background: m.role === 'user' ? '#facc15' : '#1f1f1f',
                  color: m.role === 'user' ? '#0a0a0a' : '#e5e5e5',
                  padding: '10px 14px',
                  borderRadius: 12,
                  maxWidth: '80%',
                  whiteSpace: 'pre-wrap'
                }}>
                  {m.content}
                </span>
              </div>
            ))}
            {loading && <p style={{ color: '#9ca3af' }}>MaxiQueen está pensando…</p>}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="MaxiQueen OS te atiende..."
              style={{ flex: 1, background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', outline: 'none' }}
            />
            <button onClick={send} disabled={loading}
              style={{ background: '#facc15', color: '#0a0a0a', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}>
              Enviar
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 14, fontSize: 13, color: '#9ca3af', alignItems: 'center' }}>
            <button onClick={toggleVoice} style={{ background: 'transparent', color: '#facc15', border: '1px solid #333', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
              {voiceEnabled ? '🔊 Silenciar' : '🔇 Activar voz'}
            </button>
            <button onClick={pauseVoice} style={{ background: 'transparent', color: '#9ca3af', border: '1px solid #333', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
              ⏯️ Pausar
            </button>
            <span>Proceso • Sistema • Pensamiento estructurado</span>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#555', fontSize: 12, marginTop: 24 }}>
          MaxiQueen OS © 2026 — Inteligencia Local
        </p>
      </div>
    </div>
  );
}
