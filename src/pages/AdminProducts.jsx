import { useStore } from '../store'
import Icon from '../components/Icon'
import { won } from '../lib/format'

export default function AdminProducts() {
  const { products, openProduct, showToast } = useStore()
  return (
    <div className="wrap page">
      <div className="page-head">
        <div className="admin-head">
          <span className="kicker">ADMIN CONSOLE</span>
          <h1>웰빙 식품 데이터베이스 관리</h1>
          <p>등록된 클린라벨 식품 및 영양 실측치 모니터링</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => showToast('신규 식품 등록 모달 (프로토타입)')}>
          <Icon name="plus" size={16} /> 신규 식품 등록
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>상품명</th><th>카테고리</th><th>판매가</th>
              <th>단백질 / 칼로리</th><th>인증 태그</th><th style={{ textAlign: 'center' }}>동작</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="td-mono">#{p.id}</td>
                <td className="td-name">{p.name}</td>
                <td><span className="td-cat">{p.category}</span></td>
                <td style={{ fontWeight: 800, color: 'var(--ink)' }}>{won(p.price)}</td>
                <td style={{ color: 'var(--muted)' }}>{p.nutrition.protein}g / {p.nutrition.calories}kcal</td>
                <td>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {p.tags.slice(0, 2).map((t) => (
                      <span key={t} className="tag tag-soft" style={{ fontSize: 10.5 }}>{t}</span>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="td-link" onClick={() => openProduct(p)}>상세보기</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
