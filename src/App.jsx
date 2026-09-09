import { StoreProvider } from './StoreProvider'
import { useStore } from './store'
import Header from './components/Header'
import Footer from './components/Footer'
import AdminTopbar from './components/AdminTopbar'
import Toast from './components/Toast'
import CartDrawer from './components/CartDrawer'
import CartLoginPrompt from './components/CartLoginPrompt'
import EventPopup from './components/EventPopup'
import ReviewModal from './components/ReviewModal'
import Home from './pages/Home'
import Deals from './pages/Deals'
import ProductCollection from './pages/ProductCollection'
import AllProducts from './pages/AllProducts'
import CustomShop from './pages/CustomShop'
import GoalSetup from './pages/GoalSetup'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFail from './pages/PaymentFail'
import Orders from './pages/Orders'
import MyPage from './pages/MyPage'
import Wishlist from './pages/Wishlist'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminProducts from './pages/AdminProducts'
import AdminDashboard from './pages/AdminDashboard'
import AdminOrders from './pages/AdminOrders'
import AdminPartnerships from './pages/AdminPartnerships'
import AdminInquiries from './pages/AdminInquiries'
import AdminReviews from './pages/AdminReviews'
import ServiceInfo from './pages/ServiceInfo'
import PartnerProposal from './pages/PartnerProposal'
import Support from './pages/Support'
import SupportInquiry from './pages/SupportInquiry'
import SupportInquiries from './pages/SupportInquiries'
import NotFound from './pages/NotFound'
import { IS_MIDTERM_PRESENTATION } from './lib/presentation'

const PAGES = {
  main: Home,
  deals: Deals,
  best: ProductCollection,
  new: ProductCollection,
  products: AllProducts,
  custom: CustomShop,
  goalSetup: GoalSetup,
  detail: ProductDetail,
  cart: Cart,
  checkout: Checkout,
  paymentSuccess: PaymentSuccess,
  paymentFail: PaymentFail,
  orders: Orders,
  mypage: MyPage,
  wishlist: Wishlist,
  login: Login,
  register: Register,
  adminDashboard: AdminDashboard,
  adminHistory: AdminDashboard,
  adminProducts: AdminProducts,
  adminOrders: AdminOrders,
  adminPartnerships: AdminPartnerships,
  adminInquiries: AdminInquiries,
  adminReviews: AdminReviews,
  about: ServiceInfo,
  principles: ServiceInfo,
  partners: ServiceInfo,
  partnerProposal: PartnerProposal,
  terms: ServiceInfo,
  privacy: ServiceInfo,
  cleanLabel: ServiceInfo,
  support: Support,
  supportInquiry: SupportInquiry,
  supportInquiries: SupportInquiries,
  notFound: NotFound,
}

function Shell() {
  const { view, loginPromptOpen, user, authLoading, authUserId, oauthRegistrationRequired, profileError, reloadProfile, logout } = useStore()
  const pendingOAuthProfile = user?.oauth && oauthRegistrationRequired === null
  const completingOAuth = user?.oauth && oauthRegistrationRequired === true
  const Page = completingOAuth ? Register : PAGES[view] || NotFound
  const isAdmin = ['adminDashboard', 'adminHistory', 'adminProducts', 'adminOrders', 'adminReviews', 'adminPartnerships', 'adminInquiries'].includes(view)
  return (
    <div className="app">
      {isAdmin ? <AdminTopbar /> : <Header />}
      <main>
        <div className="view-fade" key={completingOAuth ? `oauth-register:${authUserId}` : view}>
          {authLoading || pendingOAuthProfile ? <div className="wrap page auth-page">
            <div className="auth-container">
              <p role={profileError ? 'alert' : 'status'}>{profileError || '로그인 정보를 확인하고 있습니다.'}</p>
              {profileError && <><button type="button" className="btn btn-primary" onClick={reloadProfile}>다시 시도</button><button type="button" className="btn btn-text" onClick={logout}>로그아웃</button></>}
            </div>
          </div> : <Page />}
        </div>
      </main>
      {!isAdmin && <Footer />}
      {!pendingOAuthProfile && !completingOAuth && <CartDrawer />}
      <Toast />
      {loginPromptOpen && <CartLoginPrompt />}
      {!IS_MIDTERM_PRESENTATION && !isAdmin && !pendingOAuthProfile && !completingOAuth && <EventPopup />}
      {!IS_MIDTERM_PRESENTATION && !isAdmin && !pendingOAuthProfile && !completingOAuth && <ReviewModal />}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
