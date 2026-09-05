import { StoreProvider } from './StoreProvider'
import { useStore } from './store'
import Header from './components/Header'
import Footer from './components/Footer'
import AdminTopbar from './components/AdminTopbar'
import Toast from './components/Toast'
import CartDrawer from './components/CartDrawer'
import CartLoginPrompt from './components/CartLoginPrompt'
import Home from './pages/Home'
import AllProducts from './pages/AllProducts'
import GoalSetup from './pages/GoalSetup'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFail from './pages/PaymentFail'
import Orders from './pages/Orders'
import MyPage from './pages/MyPage'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminProducts from './pages/AdminProducts'
import AdminOrders from './pages/AdminOrders'
import ServiceInfo from './pages/ServiceInfo'

const PAGES = {
  main: Home,
  products: AllProducts,
  goalSetup: GoalSetup,
  detail: ProductDetail,
  cart: Cart,
  checkout: Checkout,
  paymentSuccess: PaymentSuccess,
  paymentFail: PaymentFail,
  orders: Orders,
  mypage: MyPage,
  login: Login,
  register: Register,
  adminProducts: AdminProducts,
  adminOrders: AdminOrders,
  philosophy: ServiceInfo,
  terms: ServiceInfo,
  privacy: ServiceInfo,
  cleanLabel: ServiceInfo,
  support: ServiceInfo,
}

function Shell() {
  const { view, loginPromptOpen } = useStore()
  const Page = PAGES[view] || Home
  const isAdmin = view === 'adminProducts' || view === 'adminOrders'
  return (
    <div className="app">
      {isAdmin ? <AdminTopbar /> : <Header />}
      <main>
        <div className="view-fade" key={view}>
          <Page />
        </div>
      </main>
      {!isAdmin && <Footer />}
      <CartDrawer />
      <Toast />
      {loginPromptOpen && <CartLoginPrompt />}
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
