// 국내 회원가입에서 널리 쓰이는 Daum(카카오) 우편번호 서비스 래퍼.
// 런타임에 스크립트를 1회만 주입하고, 실패 시엔 호출부에서 수기 입력으로 대체한다.
const SCRIPT_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

let scriptPromise = null

function loadPostcodeScript() {
  if (typeof window !== 'undefined' && window.daum?.Postcode) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('POSTCODE_SCRIPT_FAILED'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

// onComplete: ({ zonecode, address }) => void
export async function openPostcode(onComplete) {
  await loadPostcodeScript()
  new window.daum.Postcode({
    oncomplete: (data) => {
      const address = data.roadAddress || data.jibunAddress || data.address || ''
      onComplete({ zonecode: data.zonecode || '', address })
    },
  }).open()
}
