export const PRESENTATION_STAGE = import.meta.env?.VITE_PRESENTATION_STAGE || ''

export const IS_MIDTERM_PRESENTATION = PRESENTATION_STAGE === 'midterm'

export const MIDTERM_ALLOWED_VIEWS = new Set([
  'main',
  'products',
  'detail',
  'goalSetup',
  'cart',
  'mypage',
  'login',
  'register',
  'notFound',
])

export function isPresentationViewAllowed(view, stage = PRESENTATION_STAGE) {
  return stage !== 'midterm' || MIDTERM_ALLOWED_VIEWS.has(view)
}
