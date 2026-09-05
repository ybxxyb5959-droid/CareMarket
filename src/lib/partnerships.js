export const PARTNERSHIP_PROPOSAL_TYPES = [
  '브랜드 입점',
  '상품 입점',
  '콘텐츠 협업',
  '프로모션 / 공동 마케팅',
  '기타 제휴',
]

export const PARTNERSHIP_STATUS_LABELS = {
  new: '신규',
  reviewing: '검토중',
  approved: '승인',
  rejected: '거절',
}

export const EMPTY_PARTNERSHIP_FORM = {
  brandName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  proposalType: '',
  productCategory: '',
  productName: '',
  brandDescription: '',
  partnershipReason: '',
  privacyAgreed: false,
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validatePartnershipForm(values) {
  const errors = {}
  if (!values.brandName.trim()) errors.brandName = '브랜드명을 입력해 주세요.'
  if (!values.contactName.trim()) errors.contactName = '담당자명을 입력해 주세요.'
  if (!values.email.trim()) errors.email = '이메일을 입력해 주세요.'
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = '올바른 이메일 형식으로 입력해 주세요.'
  if (values.website.trim() && !isHttpUrl(values.website.trim())) errors.website = 'http:// 또는 https://로 시작하는 주소를 입력해 주세요.'
  if (!PARTNERSHIP_PROPOSAL_TYPES.includes(values.proposalType)) errors.proposalType = '제안 유형을 선택해 주세요.'
  if (!values.productCategory.trim()) errors.productCategory = '상품 카테고리를 입력해 주세요.'
  if (!values.brandDescription.trim()) errors.brandDescription = '브랜드와 제품 소개를 입력해 주세요.'
  if (!values.privacyAgreed) errors.privacyAgreed = '개인정보 수집 및 이용에 동의해 주세요.'
  return errors
}

export function toPartnershipPayload(values, inquiryId = crypto.randomUUID()) {
  return {
    id: inquiryId,
    brand_name: values.brandName.trim(),
    contact_name: values.contactName.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim() || null,
    website: values.website.trim() || null,
    proposal_type: values.proposalType,
    product_category: values.productCategory.trim(),
    product_name: values.productName.trim() || null,
    brand_description: values.brandDescription.trim(),
    partnership_reason: values.partnershipReason.trim() || null,
    privacy_agreed: true,
  }
}

export async function submitPartnershipInquiry(supabase, values) {
  const payload = toPartnershipPayload(values)
  const { error } = await supabase.from('partnership_inquiries').insert(payload)
  if (error) throw error

  return { id: payload.id }
}
