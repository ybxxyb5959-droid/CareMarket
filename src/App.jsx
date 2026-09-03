import { StoreProvider } from './StoreProvider'
import { useStore } from './store'
import DemoNav from './components/DemoNav'
import Header from './components/Header'
import Footer from './components/Footer'
import Toast from './components/Toast'
import CartDrawer from './components/CartDrawer'
import EventPopup from './components/EventPopup'
import Home from './pages/Home'
import GoalSetup from './pages/GoalSetup'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Orders from './pages/Orders'
import MyPage from './pages/MyPage'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminProducts from './pages/AdminProducts'
import AdminOrders from './pages/AdminOrders'

const PAGES = {
  main: Home,
  goalSetup: GoalSetup,
  detail: ProductDetail,
  cart: Cart,
  orders: Orders,
  mypage: MyPage,
  login: Login,
  register: Register,
  adminProducts: AdminProducts,
  adminOrders: AdminOrders,
}

function Shell() {
  const { view } = useStore()
  const Page = PAGES[view] || Home
  return (
    <div className="app">
      <DemoNav />
      <Header />
      <main>
        <Page />
      </main>
      <Footer />
      <CartDrawer />
      <Toast />
      <EventPopup />
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
