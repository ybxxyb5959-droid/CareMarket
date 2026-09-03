import { createContext, useContext, useEffect, useState } from 'react'

// 컨텍스트 + 훅만 담은 모듈 (컴포넌트를 함께 내보내지 않아 Fast Refresh 안전)
export const StoreContext = createContext(null)
export const useStore = () => useContext(StoreContext)

// 히어로 슬라이드 자동 전환 훅
export function useAutoSlide(length, delay = 6000) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((p) => (p + 1) % length), delay)
    return () => window.clearInterval(t)
  }, [length, delay])
  return [i, setI]
}
