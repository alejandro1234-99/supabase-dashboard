/**
 * Agente de investigación de ofertas de trabajo
 * --------------------------------------------------
 * Usa Claude con búsqueda web nativa para encontrar cada día
 * las mejores oportunidades en automatización, no-code e IA
 * para hispanohablantes. Filtra, genera copy HTML y guarda en Supabase.
 *
 * Ejecución:
 *   npx tsx scripts/job-research-agent.ts
 *
 * Variables de entorno necesarias:
 *   ANTHROPIC_API_KEY         — API key de Anthropic
 *   NEXT_PUBLIC_SUPABASE_URL  — URL del proyecto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key de Supabase
 */

import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../lib/supabase'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface JobOffer {
  title: string
  company?: string
  platform: string
  url: string
  description: string
  budget_min?: number
  budget_max?: number
  currency: string
  job_type: string
  category: string
  html_body: string
  why_selected: string
}

// ─────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un agente especializado en encontrar oportunidades de trabajo en automatización, no-code e inteligencia artificial para una comunidad hispanohablante de profesionales del sector.

Tienes acceso a búsqueda web. Úsala activamente para encontrar ofertas reales publicadas recientemente.

Criterios de selección (todos deben cumplirse):
- Oferta de trabajo o proyecto freelance REAL y publicado recientemente
- En español o para hispanohablantes (España o Latinoamérica)
- Sin requisito de inglés
- Presupuesto mínimo 500€/$ por proyecto, o contratación con salario digno
- Relevante para: automatización, no-code, IA aplicada, agencias de IA

Tipos de trabajo válidos:
- Proyectos de automatización (Make, Zapier, n8n, Power Automate...)
- Desarrollo no-code (Bubble, Webflow, Airtable, Notion...)
- Servicios de IA (agentes, GPTs personalizados, RAG, chatbots...)
- Posiciones en agencias de IA (perfil técnico o comercial)
- Consultorías de automatización bien pagadas

Lo que NO incluir:
- Artículos, noticias o tutoriales
- Trabajos por menos de 500€
- Ofertas que requieran inglés
- Nada no relacionado con el sector`

function buildResearchPrompt(today: string): string {
  return `Hoy es ${today}.

Tu misión: encontrar las mejores ofertas de trabajo del día en automatización, no-code e inteligencia artificial para hispanohablantes.

FASE 1 — INVESTIGACIÓN
Busca en estas plataformas y con estas queries (usa la herramienta de búsqueda web varias veces):

1. workana.com — busca "automatización" "make" "zapier" "n8n" "inteligencia artificial"
2. malt.es — busca "automatización" "no code" "agente IA"
3. freelancer.com — busca "automatizacion" "no code" "inteligencia artificial" idioma español
4. linkedin.com/jobs — busca "automatización" OR "no code" España OR Latinoamérica
5. infojobs.net — busca "automatización procesos" "inteligencia artificial"
6. Búsqueda general: "oferta trabajo automatización no code 2025 español"
7. Búsqueda general: "busco freelancer inteligencia artificial agente IA español"
8. Búsqueda general: "proyecto automatización make zapier n8n presupuesto"

FASE 2 — VERIFICACIÓN Y SELECCIÓN
Para cada oferta candidata, verifica con búsqueda web que la URL sea accesible y redirija a una oferta real activa.
Descarta cualquier oferta cuya URL no cargue, redirija a un error 404, o no muestre la oferta.
Selecciona MÁXIMO 3 ofertas verificadas (o menos si no hay suficiente calidad).
Prefiere siempre calidad sobre cantidad. Si solo encuentras 1 buena, devuelve solo 1.

FASE 3 — RESPUESTA FINAL
Cuando hayas terminado la investigación, responde ÚNICAMENTE con este JSON (sin texto adicional antes ni después).

El campo "html_body" debe ser HTML compatible con Circle (sin estilos inline, sin clases CSS).
Usa ÚNICAMENTE estas etiquetas: <div>, <p>, <strong>, <b>, <br>, <ul>, <li>, <a>.
IMPORTANTE: En los atributos HTML usa comillas simples (no dobles) para no romper el JSON. Ejemplo: <a href='URL' target='_blank'>texto</a>
Sigue EXACTAMENTE esta estructura:

<div>
  <p><strong>FRASE GANCHO impactante que resume la oportunidad y por qué importa.</strong></p>
  <p><b>Lo que necesitas:</b><br>• Habilidad 1<br>• Habilidad 2<br>• Nivel requerido<br>• Modalidad (remoto/presencial)</p>
  <p><b>Detalles:</b><br>• 💰 Presupuesto: IMPORTE o "no especificado"<br>• 🌍 Modalidad<br>• ⏰ Duración: a convenir<br>• 👥 Contexto del proyecto</p>
  <p><b>¿Por qué es ideal para ti?</b><ul><li>Razón concreta 1</li><li>Razón concreta 2</li><li>Razón concreta 3</li><li>Razón concreta 4</li></ul></p>
  <p><b>💪 Frase motivadora de cierre.</b><br>Reflexión breve sobre el valor de esta oportunidad para crecer como profesional.</p>
  <p><b>¡Postula aquí!</b> <a href="URL_EXACTA" target="_blank" rel="noopener noreferrer">👉 Ver la oferta en PLATAFORMA</a></p>
  <p><b>💡 Consejos para destacar:</b><ul><li>Consejo práctico 1</li><li>Consejo práctico 2</li><li>Consejo práctico 3</li><li>Consejo práctico 4</li></ul></p>
</div>

JSON a devolver:

\`\`\`json
{
  "offers": [
    {
      "title": "Título atractivo y descriptivo",
      "company": "Empresa o cliente (null si no se conoce)",
      "platform": "Plataforma donde se encontró",
      "url": "URL exacta de la oferta",
      "description": "Descripción completa en 2-3 párrafos (texto plano, sin HTML)",
      "budget_min": 500,
      "budget_max": 2000,
      "currency": "EUR",
      "job_type": "project",
      "category": "automation",
      "why_selected": "Por qué esta oferta es valiosa para la comunidad",
      "html_body": "<div><p><strong>FRASE GANCHO...</strong></p>...</div>"
    }
  ]
}
\`\`\`

Si no encuentras ninguna oferta de calidad que cumpla los criterios, devuelve:
\`\`\`json
{"offers": []}
\`\`\``
}

// ─────────────────────────────────────────────
// Loop agéntico con web_search nativo
// ─────────────────────────────────────────────

async function runResearchAgent(today: string): Promise<JobOffer[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: buildResearchPrompt(today) },
  ]

  let iteration = 0
  const MAX_ITERATIONS = 20 // suficiente para búsquedas múltiples

  while (iteration < MAX_ITERATIONS) {
    iteration++
    console.log(`   → Iteración ${iteration}...`)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: [
        // web_search_20250305 es el tool nativo de búsqueda web de Anthropic.
        // No requiere API externa: Anthropic ejecuta la búsqueda en su infraestructura.
        { type: 'web_search_20250305', name: 'web_search' } as Anthropic.Tool,
      ],
      messages,
    })

    // Acumular el mensaje del asistente en el historial
    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      // Respuesta final — extraer JSON
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')

      const match = text.match(/```json\s*([\s\S]*?)\s*```/)
      if (!match) {
        console.error('Respuesta de Claude (sin JSON):', text.slice(0, 400))
        throw new Error('Claude no devolvió JSON en la respuesta final')
      }

      let data: { offers?: JobOffer[] }
      try {
        data = JSON.parse(match[1])
      } catch {
        // Intentar reparar JSON con comillas dobles dentro de strings HTML
        const repaired = match[1].replace(
          /"html_body":\s*"([\s\S]*?)(?=",\s*"\w+"|"\s*\})/g,
          (_m, html) => `"html_body": "${html.replace(/"/g, "'")}"`
        )
        try {
          data = JSON.parse(repaired)
        } catch {
          console.error('JSON inválido incluso tras reparación:', match[1].slice(0, 300))
          return []
        }
      }
      return data.offers ?? []
    }

    if (response.stop_reason === 'tool_use') {
      // Claude está usando web_search. Anthropic ejecuta la búsqueda server-side.
      // Continuamos el loop: el siguiente turno recibirá los resultados de búsqueda.
      const toolNames = response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map(b => `"${(b.input as Record<string, string>)?.query ?? b.name}"`)
        .join(', ')
      if (toolNames) console.log(`   → Buscando: ${toolNames}`)
      continue
    }

    // stop_reason inesperado
    console.warn(`⚠️  stop_reason inesperado: ${response.stop_reason}`)
    break
  }

  throw new Error(`Máximo de iteraciones alcanzado (${MAX_ITERATIONS})`)
}

// ─────────────────────────────────────────────
// Verificación de URLs
// ─────────────────────────────────────────────

async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)' },
    })
    return res.status < 400
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────
// Almacenamiento en Supabase
// ─────────────────────────────────────────────

async function storeOffers(offers: JobOffer[]): Promise<void> {
  if (offers.length === 0) {
    console.log('ℹ️  Sin ofertas para guardar hoy.')
    return
  }

  const supabase = createAdminClient()

  for (const offer of offers) {
    // Verificar que la URL es accesible
    if (offer.url) {
      const reachable = await isUrlReachable(offer.url)
      if (!reachable) {
        console.log(`🔗 URL inaccesible, omitiendo: ${offer.title} (${offer.url})`)
        continue
      }

      // Evitar duplicados por URL
      const { data: existing } = await supabase
        .from('job_offers')
        .select('id')
        .eq('url', offer.url)
        .maybeSingle()

      if (existing) {
        console.log(`⏭️  Duplicado, omitiendo: ${offer.title}`)
        continue
      }
    }

    const { error } = await supabase.from('job_offers').insert({
      title: offer.title,
      company: offer.company ?? null,
      platform: offer.platform,
      url: offer.url ?? null,
      description: offer.description,
      budget_min: offer.budget_min ?? null,
      budget_max: offer.budget_max ?? null,
      currency: offer.currency ?? 'EUR',
      job_type: offer.job_type,
      category: offer.category,
      html_header: '',
      html_body: offer.html_body,
      raw_data: { why_selected: offer.why_selected },
      status: 'pending_review', // siempre pending hasta validación manual
      found_at: new Date().toISOString(),
    })

    if (error) {
      console.error(`❌ Error guardando "${offer.title}":`, error.message)
    } else {
      console.log(`✅ Guardada: ${offer.title}`)
    }
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  console.log('🔍 Agente de investigación de empleos iniciado')
  console.log('─'.repeat(50))

  // Validar variables de entorno
  const required = [
    'ANTHROPIC_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  const missing = required.filter(v => !process.env[v])
  if (missing.length > 0) {
    console.error(`❌ Faltan variables de entorno: ${missing.join(', ')}`)
    process.exit(1)
  }

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  console.log(`📅 ${today}`)

  // 1. Investigar con Claude (búsqueda web nativa)
  console.log('\n🤖 Claude investigando ofertas con búsqueda web...')
  let offers = await runResearchAgent(today)
  console.log(`   → ${offers.length} oferta(s) seleccionada(s)`)

  // Límite duro: máximo 3
  if (offers.length > 3) {
    console.warn('⚠️  Claude devolvió más de 3 — recortando a 3')
    offers = offers.slice(0, 3)
  }

  // 2. Guardar en Supabase
  console.log('\n💾 Guardando en Supabase...')
  await storeOffers(offers)

  // Resumen
  console.log('\n' + '─'.repeat(50))
  console.log(`✅ Completado: ${offers.length} oferta(s) con status "pending_review"`)
  offers.forEach(o => console.log(`   • ${o.title} (${o.platform})`))
  console.log('\n⚠️  Valida las ofertas en Supabase antes de publicar.')
}

main().catch(err => {
  console.error('💥 Error fatal:', err)
  process.exit(1)
})
