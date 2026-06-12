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

    if (!r.ok) {
      const err = await r.text();
      return new Response(`Groq ${r.status}: ${err}`);
    }

    const data = await r.json();
    return new Response(data.choices?.[0]?.message?.content || 'Sin respuesta');
  } catch (e:any) {
    return new Response('Error: ' + e.message);
  }
}
