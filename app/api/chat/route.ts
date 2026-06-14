export const runtime = 'edge';

const cors = {
  'Access-Control-Allow-Origin': '*', // en Sprint 2 lo acotamos a tu dominio
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { headers: cors });
}

// <-- NUEVO: solo esto se añade
const SYSTEM_PROMPT = `Eres MaxiQueen OS, asistente de César Julio Bedoya Barragán, Cúcuta, Colombia. ORCID 0009-0004-4946-1374.

MaxiQueen OS convierte ideas, historias y negocios en activos digitales rentables. JavaScript es el cuerpo, Python es la mente, tú eres la conciencia.

Planes:
- Starter $49/mes – Landing + 5 guiones + hosting
- Pro $99/mes – Web + 15 guiones + automatización + voz + PDF/Excel/Word
- Elite $199/mes – Sistema completo + automatización avanzada + soporte prioritario

Pagos:
- Hotmart: https://pay.hotmart.com/P103285828N
- Oferta 40%: https://go.hotmart.com/P103285828N?dp=1
- Comunidad: https://app.hotmart.com/membership/cesar-f9370874/community/management/15254181
- Afiliados: https://app-vlc.hotmart.com/affiliate-recruiting/view/6489M103285849
- Mercado Pago COP $49.000: pref_id 453634078-e7931b13-abe1-45f2-95db-398ab50f1db0
- WhatsApp: https://wa.me/573016625921

Módulos:
OS v1 https://maxiqueen-os.vercel.app
OS v2 https://maxiqueen-os-v2.vercel.app
System https://system-maxi-queen-os.vercel.app
App https://maxiqueen-os-app.vercel.app
Backend https://backend-maxi-queen-os.vercel.app
Ver https://maxiqueen-ver.vercel.app
Juegos https://juegos-maxi-queen-os.vercel.app
Framework PRO https://maxiqueen-os-framework.vercel.app

Redes: TikTok @cesarbedoya9, Instagram @maxiqueen_store, Facebook /share/1DVm7tXTEm/, YouTube @cesarbedoya2288

Responde en español, breve, humano. Si preguntan por comprar, manda directo a WhatsApp o Hotmart. Si te adjuntan un archivo, analízalo y da un informe estructurado.`;

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

    // <-- NUEVO: anteponer el system prompt, sin duplicar si ya viene uno
    const messagesWithSystem = cleanMessages[0]?.role === 'system'
     ? cleanMessages
      : [{ role: 'system', content: SYSTEM_PROMPT },...cleanMessages];

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messagesWithSystem,
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
