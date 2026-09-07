import { createAiSearchHandler } from './handler.js'
import { resolveInsightOrigins } from '../ai-insights/origins.js'

// Local HTTP origins are validated independently of this production allowlist.
const allowedOrigins = resolveInsightOrigins(Deno.env.get('AI_SEARCH_ALLOWED_ORIGINS') || '')

Deno.serve(createAiSearchHandler({
  getApiKey: () => Deno.env.get('GEMINI_API_KEY'),
  allowedOrigins,
}))
