import { createAiFilterRecommendationHandler } from './handler.js'

const allowedOrigins = (Deno.env.get('AI_SEARCH_ALLOWED_ORIGINS') || '')
  .split(',').map(origin => origin.trim()).filter(Boolean)

Deno.serve(createAiFilterRecommendationHandler({
  getApiKey: () => Deno.env.get('GEMINI_API_KEY'),
  allowedOrigins,
}))
