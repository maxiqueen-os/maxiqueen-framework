export const runtime = 'edge';

export async function POST(req: Request) {
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

  const data = await r.json();
  const content = data.choices?.[0]?.message?.content || 'Error en Groq';
  return new Response(content);
}
