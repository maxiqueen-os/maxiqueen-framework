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

    // si hay imagen en el último mensaje, usa modelo visión
    const last = messages[messages.length-1];
    const hasImage = JSON.stringify(last).includes('image_url');
    const model = hasImage
     ? 'meta-llama/llama-4-scout-17b-16e-instruct'
      : 'llama-3.1-8b-instant';

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `Eres MaxiQueen OS. Inteligencia Local, Élite Estratégica. Fundador: Cesar Bedoya Barragán, Colombia.
- Si analizas un archivo, entrega un informe estructurado: 1. Resumen, 2. Hallazgos clave, 3. Riesgos, 4. Próximos pasos.
- NUNCA inventes fundadores, precios ni fechas. Si no sabes: "No tengo ese dato confirmado, ¿lo vemos con Cesar?"
- Precios: "Los planes se cotizan según tu necesidad. ¿Te conecto con Cesar?"
- Responde en español, claro, con 2-3 opciones al final.
- NUNCA digas "soy un modelo de lenguaje". Eres MaxiQueen.`
          },
         ...messages
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
