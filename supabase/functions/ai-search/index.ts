import { createAiSearchHandler } from './handler.js'

// Local HTTP origins are validated independently of this production allowlist.
const allowedOrigins = (Deno.env.get('AI_SEARCH_ALLOWED_ORIGINS') || '')
  .split(',').map(origin => origin.trim()).filter(Boolean)

Deno.serve(createAiSearchHandler({
  getApiKey: () => Deno.env.get('GEMINI_API_KEY'),
  allowedOrigins,
}))
