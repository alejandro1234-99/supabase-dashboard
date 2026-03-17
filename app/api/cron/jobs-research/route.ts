/**
 * Cron diario: investigación de ofertas de trabajo con agente Claude
 * Ejecutado por Vercel Cron: 0 9 * * * (9:00 AM UTC = 11:00h España)
 * Protegido con CRON_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase";

export const maxDuration = 300; // 5 minutos

const CRON_SECRET = process.env.CRON_SECRET;

interface JobOffer {
  title: string;
  company?: string;
  platform: string;
  url: string;
  description: string;
  budget_min?: number;
  budget_max?: number;
  currency: string;
  job_type: string;
  category: string;
  html_body: string;
  why_selected: string;
}

const SYSTEM_PROMPT = `Eres un agente especializado en encontrar oportunidades de trabajo en automatización, no-code e inteligencia artificial para una comunidad hispanohablante de profesionales del sector.

Tienes acceso a búsqueda web. Úsala activamente para encontrar ofertas reales publicadas recientemente.

Criterios de selección (todos deben cumplirse):
- Oferta de trabajo o proyecto freelance REAL y publicado recientemente
- En español o para hispanohablantes (España o Latinoamérica)
- Sin requisito de inglés
- Presupuesto mínimo 500€/$ por proyecto, o contratación con salario digno
- Relevante para: automatización, no-code, IA aplicada, agencias de IA

Lo que NO incluir:
- Artículos, noticias o tutoriales
- Trabajos por menos de 500€
- Ofertas que requieran inglés
- Nada no relacionado con el sector`

function buildPrompt(today: string): string {
  return `Hoy es ${today}.

Tu misión: encontrar las mejores ofertas de trabajo del día en automatización, no-code e inteligencia artificial para hispanohablantes.

FASE 1 — INVESTIGACIÓN
Busca en estas plataformas (usa la herramienta de búsqueda web varias veces):
1. workana.com — "automatización" "make" "zapier" "n8n" "inteligencia artificial"
2. malt.es — "automatización" "no code" "agente IA"
3. freelancer.com — "automatizacion" "no code" "inteligencia artificial" idioma español
4. linkedin.com/jobs — "automatización" OR "no code" España OR Latinoamérica
5. infojobs.net — "automatización procesos" "inteligencia artificial"

FASE 2 — VERIFICACIÓN Y SELECCIÓN
Para cada oferta candidata, verifica con búsqueda web que la URL sea accesible y redirija a una oferta real activa.
Descarta cualquier oferta cuya URL no cargue o muestre error 404.
Selecciona MÁXIMO 3 ofertas verificadas (o menos si no hay suficiente calidad).

FASE 3 — RESPUESTA FINAL
Responde ÚNICAMENTE con este JSON (sin texto adicional antes ni después).

El campo "html_body" debe ser HTML compatible con Circle.
Usa ÚNICAMENTE: <div>, <p>, <strong>, <b>, <br>, <ul>, <li>, <a>.
IMPORTANTE: En los atributos HTML usa comillas simples (no dobles) para no romper el JSON.
Ejemplo: <a href='URL' target='_blank'>texto</a>

Estructura HTML:
<div>
  <p><strong>FRASE GANCHO impactante.</strong></p>
  <p><b>Lo que necesitas:</b><br>• Habilidad 1<br>• Habilidad 2</p>
  <p><b>Detalles:</b><br>• 💰 Presupuesto<br>• 🌍 Modalidad<br>• ⏰ Duración</p>
  <p><b>¿Por qué es ideal para ti?</b><ul><li>Razón 1</li><li>Razón 2</li></ul></p>
  <p><b>💪 Frase motivadora.</b></p>
  <p><b>¡Postula aquí!</b> <a href='URL' target='_blank'>👉 Ver la oferta en PLATAFORMA</a></p>
  <p><b>💡 Consejos:</b><ul><li>Consejo 1</li><li>Consejo 2</li></ul></p>
</div>

\`\`\`json
{
  "offers": [
    {
      "title": "Título atractivo",
      "company": null,
      "platform": "Workana",
      "url": "URL exacta",
      "description": "Descripción en texto plano",
      "budget_min": 500,
      "budget_max": 2000,
      "currency": "EUR",
      "job_type": "project",
      "category": "automation",
      "why_selected": "Por qué es valiosa",
      "html_body": "<div>...</div>"
    }
  ]
}
\`\`\`

Si no encuentras ninguna oferta de calidad devuelve: \`\`\`json\n{"offers": []}\n\`\`\``
}

async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)" },
    });
    return res.status < 400;
  } catch {
    return false;
  }
}

async function runAgent(today: string): Promise<JobOffer[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildPrompt(today) },
  ];

  let iteration = 0;
  while (iteration < 20) {
    iteration++;
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" } as unknown as Anthropic.Tool],
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      const match = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (!match) return [];

      let data: { offers?: JobOffer[] };
      try {
        data = JSON.parse(match[1]);
      } catch {
        const repaired = match[1].replace(
          /"html_body":\s*"([\s\S]*?)(?=",\s*"\w+"|"\s*\})/g,
          (_m, html) => `"html_body": "${html.replace(/"/g, "'")}"`
        );
        try { data = JSON.parse(repaired); } catch { return []; }
      }
      return (data.offers ?? []).slice(0, 3);
    }

    if (response.stop_reason !== "tool_use") break;
  }
  return [];
}

export async function GET(req: NextRequest) {
  // Verificar secret
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const offers = await runAgent(today);
  const supabase = createAdminClient();
  const saved: string[] = [];
  const skipped: string[] = [];

  for (const offer of offers) {
    if (offer.url) {
      const reachable = await isUrlReachable(offer.url);
      if (!reachable) { skipped.push(offer.title); continue; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from("job_offers" as any) as any)
        .select("id").eq("url", offer.url).maybeSingle();
      if (existing) { skipped.push(offer.title); continue; }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("job_offers" as any) as any).insert({
      title: offer.title,
      company: offer.company ?? null,
      platform: offer.platform,
      url: offer.url ?? null,
      description: offer.description,
      budget_min: offer.budget_min ?? null,
      budget_max: offer.budget_max ?? null,
      currency: offer.currency ?? "EUR",
      job_type: offer.job_type,
      category: offer.category,
      html_header: "",
      html_body: offer.html_body,
      raw_data: { why_selected: offer.why_selected },
      status: "pending_review",
      found_at: new Date().toISOString(),
    });

    if (!error) saved.push(offer.title);
  }

  return NextResponse.json({ ok: true, saved, skipped });
}
