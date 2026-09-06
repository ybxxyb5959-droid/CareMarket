import { CART_DELIVERY_FEE, CART_FREE_DELIVERY_THRESHOLD } from './cart.js'

export const SUPPORT_CATEGORIES = [
  '주문·결제',
  '배송',
  '취소·반품·환불',
  '회원',
  '상품·영양정보',
  '입점·제휴',
]

export const INQUIRY_CATEGORIES = [
  '주문/결제',
  '배송',
  '취소/반품/환불',
  '상품',
  '회원',
  '기타',
]

export const INQUIRY_STATUS_LABELS = {
  received: '답변 대기',
  in_progress: '답변 대기',
  answered: '답변 완료',
}

export const CUSTOMER_INQUIRY_SELECT = 'id,user_id,category,order_id,title,content,contact_email,status,created_at,admin_answer,answered_at,orders(toss_order_id)'

export const SUPPORT_FAQS = [
  {
    id: 'order-history',
    category: '주문·결제',
    question: '주문 내역은 어디서 확인하나요?',
    answer: '로그인 후 주문 · 배송 조회에서 결제가 완료된 주문과 현재 처리 상태를 확인할 수 있어요.',
    featured: true,
  },
  {
    id: 'payment-methods',
    category: '주문·결제',
    question: '어떤 결제 방식을 사용할 수 있나요?',
    answer: '주문서의 토스페이먼츠 결제 영역에 현재 이용 가능한 결제수단이 표시돼요. 결제 단계에서 원하는 수단을 선택해 주세요.',
  },
  {
    id: 'payment-complete',
    category: '주문·결제',
    question: '결제가 완료됐는지 어떻게 확인하나요?',
    answer: '결제 승인 후 완료 화면이 표시되고, 주문 · 배송 조회에 주문이 나타나요. 완료 화면을 보지 못했다면 중복 결제하지 말고 주문 내역을 먼저 확인해 주세요.',
    featured: true,
  },
  {
    id: 'shipping-fee',
    category: '배송',
    question: '배송비는 얼마인가요?',
    answer: `상품 합계가 ${CART_FREE_DELIVERY_THRESHOLD.toLocaleString('ko-KR')}원 미만이면 배송비 ${CART_DELIVERY_FEE.toLocaleString('ko-KR')}원이 적용돼요. 장바구니와 주문서에서 결제 전 최종 배송비를 확인할 수 있어요.`,
  },
  {
    id: 'free-shipping',
    category: '배송',
    question: '무료배송 기준은 무엇인가요?',
    answer: `현재 상품 합계 ${CART_FREE_DELIVERY_THRESHOLD.toLocaleString('ko-KR')}원 이상 주문 시 무료배송이 적용돼요.`,
    featured: true,
  },
  {
    id: 'shipping-status',
    category: '배송',
    question: '배송 상태는 어디서 확인하나요?',
    answer: '로그인 후 주문 · 배송 조회에서 결제완료, 상품준비중, 배송중, 배송완료 상태를 확인할 수 있어요.',
    featured: true,
  },
  {
    id: 'before-payment-cancel',
    category: '취소·반품·환불',
    question: '결제 완료 전에 주문을 중단하면 어떻게 되나요?',
    answer: '결제 승인이 완료되지 않은 주문은 결제 완료 주문 내역에 표시되지 않아요. 장바구니를 확인한 뒤 필요할 때 다시 주문해 주세요.',
  },
  {
    id: 'paid-order-cancel',
    category: '취소·반품·환불',
    question: '결제한 주문을 취소하고 싶어요.',
    answer: '현재 화면에서 직접 취소하는 기능은 제공하지 않아요. 주문번호와 취소 사유를 적어 1:1 문의를 남겨주세요. 주문 처리 상태를 확인한 뒤 안내해 드려요.',
    featured: true,
  },
  {
    id: 'return-refund',
    category: '취소·반품·환불',
    question: '반품이나 환불은 어떻게 문의하나요?',
    answer: '1:1 문의에서 취소/반품/환불 유형을 선택하고 주문번호, 상품명, 사유를 남겨주세요. 접수 내용을 확인한 뒤 가능한 처리 방법을 안내해 드려요.',
  },
  {
    id: 'register',
    category: '회원',
    question: '회원가입은 어떻게 하나요?',
    answer: '로그인 화면의 회원가입에서 이메일, 비밀번호와 기본 회원정보를 입력할 수 있어요. 가입 절차에서 이메일 확인이 필요한 경우 안내에 따라 인증한 뒤 로그인해 주세요.',
  },
  {
    id: 'purchase-goal',
    category: '회원',
    question: '구매 목적과 선택 조건은 어디서 설정하나요?',
    answer: '로그인 후 마이페이지의 맞춤 웰빙 설정에서 구매 목적, 선택 조건, 제외할 알레르기 정보를 설정하거나 변경할 수 있어요.',
    featured: true,
  },
  {
    id: 'guest-order',
    category: '회원',
    question: '비회원도 주문할 수 있나요?',
    answer: 'CareMarket의 장바구니, 주문, 주문 내역은 로그인한 회원을 기준으로 제공돼요. 상품은 로그인 전에도 둘러볼 수 있어요.',
  },
  {
    id: 'nutrition-info',
    category: '상품·영양정보',
    question: '영양정보와 원재료는 어디서 확인하나요?',
    answer: '각 상품 상세의 영양정보 영역에서 등록된 영양성분, 원재료와 알레르기 정보를 확인할 수 있어요. 구매 전 상품 표시 정보도 함께 확인해 주세요.',
  },
  {
    id: 'personal-recommendation',
    category: '상품·영양정보',
    question: '맞춤 추천은 어떻게 동작하나요?',
    answer: '회원이 설정한 구매 목적과 선택 조건을 상품에 등록된 카테고리·영양정보와 연결해 추천 순서와 강조 정보를 조정해요. 추천은 선택을 돕는 참고 정보예요.',
  },
  {
    id: 'ai-not-medical',
    category: '상품·영양정보',
    question: 'AI 영양 밸런스는 의료 진단인가요?',
    answer: '아니요. 장바구니 상품에 등록된 영양정보와 구매 목적을 바탕으로 제공하는 참고용 분석이며, 질병의 진단·치료나 전문가의 상담을 대신하지 않아요.',
  },
  {
    id: 'partner-proposal',
    category: '입점·제휴',
    question: '브랜드 입점 제안은 어디서 하나요?',
    answer: '입점 · 제휴 안내의 제안하기 화면에서 브랜드와 상품 정보, 협업 내용을 작성해 접수할 수 있어요.',
  },
  {
    id: 'partner-review',
    category: '입점·제휴',
    question: '제출한 제안은 어떻게 검토되나요?',
    answer: '접수된 브랜드·상품 정보와 협업 내용을 CareMarket 담당자가 확인해요. 추가 협의가 필요한 경우 제출한 연락처를 기준으로 안내해 드려요.',
  },
  {
    id: 'partner-support',
    category: '입점·제휴',
    question: '입점 제안과 일반 고객 문의는 어떻게 구분하나요?',
    answer: '브랜드 입점이나 공동 마케팅 제안은 입점 · 제휴 제안으로, 주문·배송·상품 이용 문의는 고객지원의 1:1 문의로 접수해 주세요.',
  },
]

export const EMPTY_INQUIRY_FORM = {
  category: '',
  orderId: '',
  title: '',
  content: '',
  contactEmail: '',
  privacyAgreed: false,
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizedSearchText(value) {
  return String(value || '').trim().toLocaleLowerCase('ko-KR').replace(/\s+/g, ' ')
}

export function searchSupportFaqs(query) {
  const needle = normalizedSearchText(query)
  if (!needle) return SUPPORT_FAQS
  return SUPPORT_FAQS.filter((faq) => normalizedSearchText(
    `${faq.category} ${faq.question} ${faq.answer}`,
  ).includes(needle))
}

export function validateCustomerInquiry(values) {
  const errors = {}
  if (!INQUIRY_CATEGORIES.includes(values.category)) errors.category = '문의 유형을 선택해 주세요.'
  if (!values.title.trim()) errors.title = '제목을 입력해 주세요.'
  if (!values.content.trim()) errors.content = '문의 내용을 입력해 주세요.'
  if (!values.contactEmail.trim()) errors.contactEmail = '답변 받을 이메일을 입력해 주세요.'
  else if (!EMAIL_PATTERN.test(values.contactEmail.trim())) errors.contactEmail = '올바른 이메일 형식으로 입력해 주세요.'
  if (!values.privacyAgreed) errors.privacyAgreed = '개인정보 수집 및 이용에 동의해 주세요.'
  return errors
}

export function toCustomerInquiryPayload(values, userId, inquiryId = crypto.randomUUID()) {
  if (!userId) throw new Error('AUTH_REQUIRED')
  return {
    id: inquiryId,
    user_id: userId,
    category: values.category,
    order_id: values.orderId || null,
    title: values.title.trim(),
    content: values.content.trim(),
    contact_email: values.contactEmail.trim().toLowerCase(),
    privacy_agreed: Boolean(values.privacyAgreed),
  }
}

export async function submitCustomerInquiry(client, values, userId) {
  const payload = toCustomerInquiryPayload(values, userId)
  const { error } = await client.from('customer_inquiries').insert(payload)
  if (error) throw error
  return { id: payload.id }
}

export async function fetchInquiryOrders(client, userId) {
  if (!userId) return []
  const { data, error } = await client
    .from('orders')
    .select('order_id, toss_order_id, total_price, status, created_at')
    .eq('user_id', userId)
    .in('status', ['paid', 'preparing', 'shipped', 'delivered'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export function isAnsweredInquiry(inquiryOrStatus) {
  const status = typeof inquiryOrStatus === 'string' ? inquiryOrStatus : inquiryOrStatus?.status
  return status === 'answered'
}

export function inquiryStatusLabel(inquiryOrStatus) {
  const status = typeof inquiryOrStatus === 'string' ? inquiryOrStatus : inquiryOrStatus?.status
  return INQUIRY_STATUS_LABELS[status] || INQUIRY_STATUS_LABELS.received
}

export async function fetchCustomerInquiries(client, userId) {
  if (!userId) throw new Error('AUTH_REQUIRED')
  const { data, error } = await client
    .from('customer_inquiries')
    .select(CUSTOMER_INQUIRY_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export function validateAdminInquiryAnswer(answer) {
  const normalized = String(answer || '').trim()
  if (!normalized) return '답변 내용을 입력해 주세요.'
  if (normalized.length > 4000) return '답변은 4,000자 이내로 입력해 주세요.'
  return ''
}
