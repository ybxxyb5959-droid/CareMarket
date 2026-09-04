import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import Icon from './Icon'

export default function CartLoginPrompt() {
  const { setLoginPromptOpen, navigate } = useStore()
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])
  const close = () => setLoginPromptOpen(false)
  return (
    <dialog ref={dialog} className="cart-login-prompt" aria-labelledby="cart-login-title"
      aria-describedby="cart-login-description" onCancel={close}>
      <button className="icon-btn cart-login-close" aria-label="닫기" onClick={close}><Icon name="x" /></button>
      <div className="cart-login-mark"><Icon name="leaf" size={25} /></div>
      <h2 id="cart-login-title">로그인이 필요한 기능이에요</h2>
      <p id="cart-login-description">장바구니에 상품을 담으려면 먼저 로그인해주세요.</p>
      <button className="btn btn-primary btn-block" onClick={() => { close(); navigate('login') }}>
        <Icon name="user" size={16} /> 로그인하기
      </button>
      <button className="btn btn-ghost btn-block" onClick={close}>계속 둘러보기</button>
    </dialog>
  )
}
