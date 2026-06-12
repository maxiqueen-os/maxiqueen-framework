'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

type Msg = { role: 'user' | 'assistant', content: any };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Soy MaxiQueen OS, inteligencia local. ¿En qué te ayudo hoy? Puedes adjuntar imágenes, PDF, Word o Excel.' }
  ]);
  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<{name:string, type:string, dataUrl?:string, text?:string} | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const synth = typeof window!== 'undefined'? window.speechSynthesis : null;
  const speak = useCallback((text: string) => {
    if (!synth ||!voiceEnabled) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(typeof text === 'string'? text : '');
    u.lang = 'es-ES'; u.rate = 1.0; synth.speak(u);
  }, [voiceEnabled]);

  const toggleVoice = () => { if (voiceEnabled && synth) synth.cancel(); setVoiceEnabled(!voiceEnabled); };
  const pauseVoice = () => { if (!synth) return; if (synth.speaking &&!synth.paused) synth.pause(); else synth.resume(); };

  // carga parsers desde CDN, una vez
  useEffect(() => {
    const load = (src: string) => new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); });
    (async () => {
      // @ts-ignore
      if (!window.mammoth) await load('https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js');
      // @ts-ignore
      if (!window.XLSX) await load('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      // pdf.js
      // @ts-ignore
      if (!window.pdfjsLib) { await load('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs'); }
    })();
  }, []);

  const handleFile = async (f: File) => {
    if (f.size > 10 * 1024 * 1024) { alert('Máximo 10MB'); return; }
    const name = f.name; const type = f.type;

    // imágenes -> dataURL para visión
    if (type.startsWith('image/')) {
      const dataUrl = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); });
      setFile({ name, type, dataUrl }); return;
    }
    // texto plano
    if (type.startsWith('text/') || name.endsWith('.csv') || name.endsWith('.txt')) {
      const text = await f.text(); setFile({ name, type, text: text.slice(0, 30000) }); return;
    }
    // PDF
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      try {
        // @ts-ignore
        const pdfjs = window.pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
        const buf = await f.arrayBuffer();
        const pdf = await pdfjs.getDocument({data: buf}).promise;
        let out = ''; for (let i=1;i<=Math.min(pdf.numPages, 20);i++){ const p=await pdf.getPage(i); const c=await p.getTextContent(); out += c.items.map((x:any)=>x.str).join(' ')+'\n'; }
        setFile({ name, type, text: out.slice(0, 30000) }); return;
      } catch {}
    }
    // DOCX
    if (name.endsWith('.docx')) {
      try {
        // @ts-ignore
        const mammoth = window.mammoth;
        const buf = await f.arrayBuffer();
        const r = await mammoth.extractRawText({arrayBuffer: buf});
        setFile({ name, type, text: r.value.slice(0, 30000) }); return;
      } catch {}
    }
    // XLSX / XLS
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      try {
        // @ts-ignore
        const XLSX = window.XLSX;
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf); let out = '';
        wb.SheetNames.slice(0,3).forEach((n:string)=>{ out += `\n=== Hoja ${n} ===\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n]).slice(0,10000) });
        setFile({ name, type, text: out.slice(0, 30000) }); return;
      } catch {}
    }
    //.exe y otros binarios: no ejecutar, solo metadatos
    if (name.endsWith('.exe') || type === 'application/octet-stream') {
      setFile({ name, type, text: `Archivo ejecutable detectado: ${name}\nTamaño: ${(f.size/1024/1024).toFixed(2)} MB\nPor seguridad no ejecuto binarios. Si quieres un análisis estático dime qué buscas.` });
      return;
    }
    // fallback
    setFile({ name, type, text: `Archivo adjunto: ${name} (${type}, ${(f.size/1024).toFixed(0)} KB). No pude extraer texto automáticamente.` });
  };

  const send = async () => {
    if ((!input.trim() &&!file) || loading) return;
    let userContent: any = input || `Analiza el archivo ${file?.name}`;

    if (file?.dataUrl) {
      // visión
      userContent = [
        { type: 'text', text: input || `Analiza esta imagen (${file.name}) y entrega un informe estructurado.` },
        { type: 'image_url', image_url: { url: file.dataUrl } }
      ];
    } else if (file?.text) {
      userContent = `Archivo: ${file.name}\n\nContenido extraído:\n${file.text}\n\nInstrucción del usuario: ${input || 'Genera un informe completo de este documento.'}`;
    }

    const newMessages: Msg[] = [...messages, { role: 'user', content: userContent }];
    setMessages(newMessages);
    setInput(''); const sentFile = file; setFile(null); setLoading(true);

    try {
      const apiMessages = newMessages.map(m => typeof m.content === 'string'? m : { role: m.role, content: m.content });
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: apiMessages }) });
      const reply = await r.text();
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Error de conexión.' }]);
    }
    setLoading(false);
  };

  // puente voz padre
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'MQ_VOICE') {
        if (e.data.action === 'mute') { setVoiceEnabled(false); synth?.cancel(); }
        if (e.data.action === 'unmute') setVoiceEnabled(true);
        if (e.data.action === 'pause') synth?.pause();
        if (e.data.action === 'resume') synth?.resume();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [speak]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'system-ui, Inter, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: 2, color: '#facc15', margin: 0 }}>MAXIQUEEN OS</h1>
          <p style={{ color: '#9ca3af', marginTop: 8 }}>ARQUITECTURA DIGITAL INCORRUPTIBLE</p>
          <p style={{ color: '#facc15', fontSize: 12 }}>INTELIGENCIA LOCAL • ÉLITE ESTRATÉGICA</p>
        </div>
        <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: 16, padding: 20, minHeight: 420 }}>
          <div style={{ height: 380, overflowY: 'auto', marginBottom: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 14, textAlign: m.role === 'user'? 'right' : 'left' }}>
                <span style={{ display: 'inline-block', background: m.role === 'user'? '#facc15' : '#1f1f1f', color: m.role === 'user'? '#0a0a0a' : '#e5e5e5', padding: '10px 14px', borderRadius: 12, maxWidth: '80%', whiteSpace: 'pre-wrap' }}>
                  {typeof m.content === 'string'? m.content : '[Imagen adjunta]'}
                </span>
              </div>
            ))}
            {loading && <p style={{ color: '#9ca3af' }}>MaxiQueen está analizando…</p>}
          </div>

          {file && (
            <div style={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>📎 {file.name}</span>
              <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>✕</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="file" ref={fileRef} hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()}
              style={{ background: '#1f1f1f', color: '#e5e5e5', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>📎</button>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Escribe o adjunta un archivo para analizar..."
              style={{ flex: 1, background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', outline: 'none' }} />
            <button onClick={send} disabled={loading}
              style={{ background: '#facc15', color: '#0a0a0a', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}>
              Enviar
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 14, fontSize: 13, color: '#9ca3af', flexWrap: 'wrap' }}>
            <button onClick={toggleVoice} style={{ background: 'transparent', color: '#facc15', border: '1px solid #333', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
              {voiceEnabled? '🔊 Silenciar' : '🔇 Activar voz'}
            </button>
            <button onClick={pauseVoice} style={{ background: 'transparent', color: '#9ca3af', border: '1px solid #333', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>⏯ Pausar</button>
            <span>Analiza imágenes, PDF, Word, Excel • Max 10MB</span>
          </div>
        </div>
        <p style={{ textAlign: 'center', color: '#555', fontSize: 12, marginTop: 24 }}>
          MaxiQueen OS © 2026 — Inteligencia Local — Cesar Bedoya Barragán
        </p>
      </div>
    </div>
  );
}
