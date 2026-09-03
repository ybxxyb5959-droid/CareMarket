import { useStore } from '../store'
import Icon from './Icon'

export default function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return (
    <div className="toast" role="status">
      <Icon name="check-circle" size={18} />
      <span>{toast}</span>
    </div>
  )
}
