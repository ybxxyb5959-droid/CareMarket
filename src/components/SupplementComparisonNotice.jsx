import { useEffect, useId, useRef, useState } from 'react'

export default function SupplementComparisonNotice() {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const pinned = useRef(false)
  const id = useId()
  useEffect(() => {
    const close = () => { pinned.current = false; setOpen(false) }
    const outside = event => { if (!root.current?.contains(event.target)) close() }
    const escape = event => { if (event.key === 'Escape' && open) { event.stopImmediatePropagation(); close() } }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', escape, true)
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('keydown', escape, true) }
  }, [open])
  return <div className="supplement-notice" ref={root}>
    <span>영양제는 특정 상품을 우선 추천하지 않아요.</span>
    <span className="supplement-info" onMouseEnter={() => setOpen(true)} onMouseLeave={() => { if (!pinned.current) setOpen(false) }}>
      <button type="button" aria-label="영양제 추천 미제공 안내" aria-expanded={open} aria-describedby={open ? id : undefined} onClick={() => { pinned.current = true; setOpen(true) }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="4.5" r="1" fill="currentColor" /><path d="M8 7v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
      {open && <span id={id} role="tooltip" className="supplement-tooltip">영양제는 상품마다 주요 성분과 선택 목적이 달라 특정 상품을 추천하지 않아요. 등록된 성분과 함량을 기준으로 비교해주세요.</span>}
    </span>
  </div>
}
