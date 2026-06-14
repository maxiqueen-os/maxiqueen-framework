export const runtime = 'edge';

const cors = {
  'Access-Control-Allow-Origin': '*', // en Sprint 2 lo acotamos a tu dominio
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { headers: cors });
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const cleanMessages = messages.map((m: any) => {
      let content = m.content;
      if (Array.isArray(content)) {
        content = content.filter((c: any) => c.type === 'text' || c.type === 'image_url');
      }
      return { role: m.role, content };
    });

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: cleanMessages,
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!r.ok ||!r.body) {
      const err = await r.text();
      return new Response(err, { status: r.status, headers: cors });
    }

    // Reenvía el stream de Groq tal cual
    return new Response(r.body, {
      headers: {
       ...cors,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e: any) {
    return new Response(String(e.message || e), { status: 500, headers: cors });
  }
}
