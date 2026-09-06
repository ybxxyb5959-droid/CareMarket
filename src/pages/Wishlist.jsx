import { useStore } from '../store'
import Icon from '../components/Icon'
import ProductCard from '../components/ProductCard'

export default function Wishlist() {
  const { user, isLoggedIn, wishlist, wishlistLoading, wishlistError, reloadWishlist, products, productsLoading, productsError, reloadProducts, navigate } = useStore()
  const wishedProducts = wishlist
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean)

  if (!isLoggedIn || !user) {
    return (
      <div className="wrap page">
        <div className="page-slim mypage-login"><div className="panel">
          <div className="auth-head"><h2>로그인이 필요합니다</h2><p>로그인하면 관심 상품을 찜하고 한곳에서 모아볼 수 있습니다.</p></div>
          <div className="mypage-login-actions"><button className="btn btn-primary" onClick={() => navigate('login')}>로그인</button><button className="btn btn-ghost" onClick={() => navigate('register')}>회원가입</button></div>
        </div></div>
      </div>
    )
  }

  return (
    <div className="wrap page">
      <div className="page-mid wishlist-page">
        <div className="page-head wishlist-page-head">
          <div>
            <span className="eyebrow">My Wishlist</span>
            <h1 className="page-title">찜한 상품</h1>
            <p>다시 보고 싶은 상품을 모아두었어요.</p>
          </div>
          <span className="wishlist-page-count"><Icon name="heart" size={15} fill="currentColor" /> {wishlist.length}개</span>
        </div>

        {wishlistLoading || (productsLoading && wishlist.length > 0) ? (
          <div className="empty" aria-live="polite">
            <Icon name="heart" size={42} />
            <h3>찜한 상품을 불러오고 있습니다.</h3>
          </div>
        ) : wishlistError ? (
          <div className="empty wishlist-page-empty" role="alert"><Icon name="alert-circle" size={44} /><h3>찜 목록을 불러오지 못했어요.</h3><p>잠시 후 다시 시도해 주세요.</p><button type="button" className="btn btn-primary" onClick={reloadWishlist}>다시 시도</button></div>
        ) : productsError && wishlist.length > 0 ? (
          <div className="empty wishlist-page-empty" role="alert"><Icon name="alert-circle" size={44} /><h3>찜한 상품 정보를 불러오지 못했어요.</h3><p>잠시 후 다시 시도해 주세요.</p><button type="button" className="btn btn-primary" onClick={reloadProducts}>다시 시도</button></div>
        ) : wishedProducts.length ? (
          <div className="product-grid wishlist-page-grid">
            {wishedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="empty wishlist-page-empty">
            <Icon name="heart" size={44} />
            <h3>아직 찜한 상품이 없습니다.</h3>
            <p>관심 있는 상품의 하트를 눌러 여기에 모아보세요.</p>
            <button className="btn btn-primary" onClick={() => navigate('products')}>상품 둘러보기</button>
          </div>
        )}
      </div>
    </div>
  )
}
