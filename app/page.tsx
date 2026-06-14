'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

type Msg = {
  role: 'user' | 'assistant';
  content: any;
  fileMeta?: { name: string; type: string };
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Soy MaxiQueen OS, inteligencia local. ¿En qué te ayudo hoy? Puedes adjuntar imágenes, PDF, Word o Excel.' }
  ]);
  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<{name:string; type:string; dataUrl?:string; text?:string} | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const synth = typeof window!== 'undefined'? window.speechSynthesis : null;
  const speak = useCallback((text: string) => {
    if (!synth ||!voiceEnabled ||!text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES'; u.rate = 1.0; synth.speak(u);
  }, [voiceEnabled, synth]);

  const cleanForVoice = (text: string) =>
  text
    .replace(/\*\*(.*?)\*\*/g, '$1')   // **negrita**
    .replace(/\*(.*?)\*/g, '$1')       // *cursiva*
    .replace(/#{1,6}\s/g, '')          // ### títulos
    .replace(/[`_~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const toggleVoice = () => { if (voiceEnabled && synth) synth.cancel(); setVoiceEnabled(!voiceEnabled); };
  const pauseVoice = () => { if (!synth) return; if (synth.speaking &&!synth.paused) synth.pause(); else synth.resume(); };

  // carga parsers
  useEffect(() => {
    const load = (src: string) => new Promise<void>(res => { const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => res(); document.head.appendChild(s); });
    (async () => {
      // @ts-ignore
      if (!window.mammoth) await load('https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js');
      // @ts-ignore
      if (!window.XLSX) await load('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      // @ts-ignore
      if (!window.pdfjsLib) {
        await load('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        // @ts-ignore
        if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
    })();
  }, []);

  const compressImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1024;
      let { width, height } = img;
      if (width > max || height > max) {
        const r = Math.min(max / width, max / height);
        width *= r; height *= r;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });

  const handleFile = async (f: File) => {
    if (f.size > 10 * 1024 * 1024) { alert('Máximo 10MB'); return; }
    const name = f.name; const type = f.type;

    if (type.startsWith('image/')) {
      try {
        const dataUrl = await compressImage(f);
        setFile({ name, type, dataUrl });
        return;
      } catch { alert('No pude leer la imagen'); return; }
    }
    if (type.startsWith('text/') || /\.(txt|csv|md|json)$/i.test(name)) {
      const text = await f.text();
      setFile({ name, type, text: text.slice(0, 12000) }); return;
    }
    // PDF
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      try {
        // @ts-ignore
        const pdfjs = window.pdfjsLib;
        if (pdfjs) {
          const buf = await f.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: buf }).promise;
          let out = '';
          const pages = Math.min(pdf.numPages, 10);
          for (let i = 1; i <= pages; i++) {
            const page = await pdf.getPage(i);
            const tc = await page.getTextContent();
            out += tc.items.map((it:any) => it.str).join(' ') + '\n\n';
            if (out.length > 12000) break;
          }
          setFile({ name, type, text: out.slice(0, 12000) }); return;
        }
      } catch {}
      setFile({ name, type, text: `PDF adjunto: ${name}. No pude extraer texto en el navegador, describe qué necesitas analizar.` });
      return;
    }
    // DOCX
    if (name.endsWith('.docx')) {
      try {
        // @ts-ignore
        const mammoth = window.mammoth;
        if (mammoth) {
          const buf = await f.arrayBuffer();
          const r = await mammoth.extractRawText({ arrayBuffer: buf });
          setFile({ name, type, text: r.value.slice(0, 12000) }); return;
        }
      } catch {}
    }
    // XLSX
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      try {
        // @ts-ignore
        const XLSX = window.XLSX;
        if (XLSX) {
          const buf = await f.arrayBuffer();
          const wb = XLSX.read(buf); let out = '';
          wb.SheetNames.slice(0,3).forEach((n:string) => {
            out += `\n=== ${n} ===\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n]).slice(0,5000);
          });
          setFile({ name, type, text: out.slice(0, 12000) }); return;
        }
      } catch {}
    }
    setFile({ name, type, text: `Archivo adjunto: ${name} (${type}, ${(f.size/1024).toFixed(0)} KB)` });
  };

  const send = async () => {
    if ((!input.trim() &&!file) || loading) return;

    const displayText = input || `📎 ${file?.name}`;
    const userMsg: Msg = { role: 'user', content: displayText, fileMeta: file? { name: file.name, type: file.type } : undefined };
    setMessages(m => [...m, userMsg]);

    let apiContent: any = input || `Analiza el archivo ${file?.name}`;
    if (file?.dataUrl) {
      apiContent = [
        { type: 'text', text: input || `Analiza esta imagen (${file.name}).` },
        { type: 'image_url', image_url: { url: file.dataUrl } }
      ];
    } else if (file?.text) {
      apiContent = `Archivo: ${file.name}\n\n${file.text}\n\nInstrucción: ${input || 'Genera un informe estructurado.'}`;
    }

    const apiMessages = [...messages, { role: 'user', content: apiContent }]
     .map(m => ({ role: m.role, content: m.content }));

    setInput(''); setFile(null); setLoading(true);
    setMessages(m => [...m, { role: 'assistant', content: '' }]);

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      });
      if (!r.ok ||!r.body) throw new Error(await r.text());

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullText += delta;
                setMessages(m => {
                  const copy = [...m];
                  copy[copy.length - 1] = { role: 'assistant', content: fullText };
                  return copy;
                });
              }
            } catch {}
          }
        }
      }
      if (fullText) speak(cleanForVoice(fullText));
    } catch (e:any) {
      setMessages(m => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: 'Error de conexión con Groq: ' + String(e.message || e) };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight); }, [messages]);

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
  }, [synth]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'system-ui, Inter, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: 2, color: '#facc15', margin: 0 }}>MAXIQUEEN OS</h1>
          <p style={{ color: '#9ca3af', marginTop: 8 }}>ARQUITECTURA DIGITAL INCORRUPTIBLE</p>
          <p style={{ color: '#facc15', fontSize: 12 }}>INTELIGENCIA LOCAL • ÉLITE ESTRATÉGICA</p>
        </div>
        <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: 16, padding: 20 }}>
          <div ref={logRef} style={{ height: 380, overflowY: 'auto', marginBottom: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 14, textAlign: m.role === 'user'? 'right' : 'left' }}>
                <span style={{
                  display: 'inline-block', background: m.role === 'user'? '#facc15' : '#1f1f1f',
                  color: m.role === 'user'? '#0a0a0a' : '#e5e5e5',
                  padding: '10px 14px', borderRadius: 12, maxWidth: '80%', whiteSpace: 'pre-wrap'
                }}>
                  {typeof m.content === 'string'? m.content : '[Imagen]'}
                  {m.fileMeta && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>📎 {m.fileMeta.name}</div>}
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

          <div style={{ display: 'flex', gap: 8 }}>
            <input type="file" ref={fileRef} hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.md,.json"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()}
              style={{ background: '#1f1f1f', color: '#e5e5e5', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>📎</button>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' &&!e.shiftKey && (e.preventDefault(), send())}
              placeholder="Escribe o adjunta un archivo..."
              style={{ flex: 1, background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', outline: 'none' }} />
            <button onClick={send} disabled={loading}
              style={{ background: '#facc15', color: '#0a0a0a', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 700, cursor: 'pointer', opacity: loading? 0.6 : 1 }}>
              Enviar
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 14, fontSize: 13, color: '#9ca3af', flexWrap: 'wrap' }}>
            <button onClick={toggleVoice} style={{ background: 'transparent', color: '#facc15', border: '1px solid #333', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
              {voiceEnabled? '🔊 Silenciar' : '🔇 Activar voz'}
            </button>
            <button onClick={pauseVoice} style={{ background: 'transparent', color: '#9ca3af', border: '1px solid #333', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>⏯ Pausar</button>
            <span>Imágenes, PDF, Word, Excel • máx 10MB</span>
          </div>
        </div>
        <p style={{ textAlign: 'center', color: '#555', fontSize: 12, marginTop: 24 }}>
          MaxiQueen OS © 2026 — Inteligencia Local — Cesar Bedoya Barragán
        </p>
      </div>
    </div>
  );
}
