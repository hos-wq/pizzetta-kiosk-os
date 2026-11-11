import PizzettaWorldApp from './PizzettaWorldApp'
import StaffAccess from './StaffAccess'

export default function App() {
  return window.location.pathname.startsWith('/staff') ? <StaffAccess /> : <PizzettaWorldApp />
}
