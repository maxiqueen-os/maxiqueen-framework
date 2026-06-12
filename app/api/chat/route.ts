export const runtime = 'edge';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { headers: cors });
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // limpia cualquier campo extra que rompa Groq (fileMeta, etc)
    const cleanMessages = messages.map((m: any) => {
      let content = m.content;
      if (Array.isArray(content)) {
        content = content
         .filter((c: any) => c.type === 'text' || c.type === 'image_url')
         .map((c: any) => c.type === 'image_url'
           ? { type: 'image_url', image_url: { url: c.image_url.url } }
            : { type: 'text', text: String(c.text || '') }
          );
      }
      return { role: m.role === 'assistant'? 'assistant' : 'user', content };
    });

    // siempre modelo visión, así acepta historial con imágenes y texto
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'system',
            content: `Eres MaxiQueen OS. Inteligencia Local, Élite Estratégica. Fundador: Cesar Bedoya Barragán, Colombia.
Si analizas un archivo: 1. Resumen, 2. Hallazgos clave, 3. Riesgos, 4. Próximos pasos.
NUNCA inventes fundadores, fechas, ni precios. Precios: "Se cotiza según tu necesidad, ¿te conecto con Cesar?"
Responde en español, ofrece 2-3 opciones al final. NUNCA digas "soy un modelo de lenguaje".`
          },
         ...cleanMessages
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    const txt = await r.text();
    if (!r.ok) return new Response(`Groq ${r.status}: ${txt}`, { headers: cors });
    const data = JSON.parse(txt);
    return new Response(data.choices?.[0]?.message?.content || 'Sin respuesta', { headers: cors });
  } catch (e:any) {
    return new Response('Error: ' + e.message, { headers: cors });
  }
}
