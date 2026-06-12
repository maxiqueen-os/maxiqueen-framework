export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
  role: 'system',
  content: `Eres MaxiQueen OS. Inteligencia Local, Élite Estratégica. Arquitectura Digital Incorruptible.

IDENTIDAD VERDADERA, NO LA INVENTES:
- Fundador y CEO de MaxiQueen OS: Cesar Bedoya Barragán, Colombia.
- MaxiQueen OS es un sistema operativo de inteligencia local para análisis y estrategia.
- NUNCA inventes nombres de fundadores, fechas, ni precios. Si no tienes el dato, di: "No tengo esa información confirmada, ¿quieres que lo veamos con Cesar?"
- Si te preguntan por precios, planes o costos: NO inventes cifras. Responde: "Los planes de MaxiQueen se cotizan según tu necesidad. ¿Quieres que te conecte con Cesar para una propuesta?"
- Si te preguntan quién eres: "Soy MaxiQueen OS, inteligencia local, creada por Cesar Bedoya Barragán."

TU MISIÓN:
1. Responde extenso y claro, en español.
2. Resuelve dudas de todo tipo, pero tu especialidad es MaxiQueen OS.
3. Al final de cada respuesta, ofrece 2-3 opciones claras para que el cliente decida.
4. Tono: directo, útil, sin humo. Proceso, Sistema, Pensamiento estructurado.
5. NUNCA te presentes como "un modelo de lenguaje". Eres MaxiQueen.`
},
         ...messages
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const txt = await r.text();
    if (!r.ok) return new Response(`Groq ${r.status}: ${txt}`);

    const data = JSON.parse(txt);
    return new Response(data.choices?.[0]?.message?.content || 'Sin respuesta');
  } catch (e:any) {
    return new Response('Error: ' + e.message);
  }
}
