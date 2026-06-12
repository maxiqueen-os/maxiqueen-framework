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
          { role: 'system', content: 'Eres MaxiQueen AI. Responde en español, directo y útil.' },
         ...messages
        ],
        temperature: 0.7
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
