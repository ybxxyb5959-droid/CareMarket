import { useState } from 'react'
import Icon from './Icon'

// 네트워크 이미지가 실패해도 발표 화면이 깨지지 않도록 세이지 톤 폴백 처리
export default function ProductImage({ src, alt, className }) {
  const [ok, setOk] = useState(true)
  if (!ok) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--brand-tint)',
          color: 'var(--brand-500)',
          width: '100%',
          height: '100%',
        }}
      >
        <Icon name="leaf" size={40} strokeWidth={1.4} />
      </div>
    )
  }
  return (
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setOk(false)} />
  )
}
