import { createAiFilterRecommendationHandler } from './handler.js'
import { resolveInsightOrigins } from '../ai-insights/origins.js'

const allowedOrigins = resolveInsightOrigins(Deno.env.get('AI_SEARCH_ALLOWED_ORIGINS') || '')

Deno.serve(createAiFilterRecommendationHandler({
  getApiKey: () => Deno.env.get('GEMINI_API_KEY'),
  allowedOrigins,
}))
