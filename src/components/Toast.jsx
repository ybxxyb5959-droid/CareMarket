import { useStore } from '../store'
import Icon from './Icon'

export default function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  // 하위호환: 문자열이면 일반 토스트로 처리
  const { msg, kind } = typeof toast === 'string' ? { msg: toast, kind: 'default' } : toast
  const isAuth = kind === 'auth' || kind === 'auth-error'
  const isError = kind === 'auth-error'
  return (
    <div className={`toast${isAuth ? ' toast-auth' : ''}${isError ? ' toast-error' : ''}`} role={isError ? 'alert' : 'status'}>
      <Icon name={isError ? 'alert-circle' : 'check-circle'} size={18} />
      <span>{msg}</span>
    </div>
  )
}
