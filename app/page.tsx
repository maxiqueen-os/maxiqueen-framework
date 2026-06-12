'use client';

import { useState, useRef, useEffect } from 'react';

type Msg = { role: 'user' | 'assistant', content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
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
    if (!input.trim()) return;
    const newMessages: Msg[] = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages })
    });
    const reply = await r.text();
    const assistantMsg: Msg = { role: 'assistant', content: reply };
    setMessages([...newMessages, assistantMsg]);
    speak(reply);
  };

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>MaxiQueen OS</h1>
      
      <div style={{ border: '1px solid #ddd', padding: 16, minHeight: 300, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <p key={i}><b>{m.role}:</b> {m.content}</p>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="MaxiQueen OS te atiende..."
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={send}>Enviar</button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={toggleVoice}>
          {voiceEnabled ? '🔊 Silenciar' : '🔇 Activar voz'}
        </button>
        <button onClick={pauseVoice}>
          ⏯️ Pausar/Reanudar
        </button>
      </div>
    </div>
  );
}
