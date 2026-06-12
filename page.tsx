'use client';
import { useState } from 'react';

export default function Page() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role:string,content:string}[]>([]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages })
    });
    const text = await res.text();
    setMessages([...newMessages, { role: 'assistant', content: text }]);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 20 }}>
      <h1>MaxiQueen OS</h1>
      <div style={{ border: '1px solid #ddd', minHeight: 300, padding: 10, marginBottom: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '8px 0' }}><b>{m.role}:</b> {m.content}</div>
        ))}
        {loading && <div>...</div>}
      </div>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} 
        style={{ width: '80%', padding: 8 }} placeholder="Escribe..." />
      <button onClick={send} style={{ padding: '8px 16px', marginLeft: 8 }}>Enviar</button>
    </div>
  );
}
