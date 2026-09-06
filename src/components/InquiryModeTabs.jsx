export default function InquiryModeTabs({ mode, onChange }) {
  return <div className="inquiry-mode-tabs" role="tablist" aria-label="1:1 문의 메뉴">
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'compose'}
      aria-controls="inquiry-compose-panel"
      className={mode === 'compose' ? 'active' : ''}
      onClick={() => onChange('compose')}
    >
      1:1 문의 작성
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'history'}
      aria-controls="inquiry-history-panel"
      className={mode === 'history' ? 'active' : ''}
      onClick={() => onChange('history')}
    >
      작성내역 확인
    </button>
  </div>
}
