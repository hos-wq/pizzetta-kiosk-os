import PizzettaWorldApp from './PizzettaWorldApp'
import StaffConsole from './StaffConsole'

export default function App() {
  return window.location.pathname.startsWith('/staff') ? <StaffConsole /> : <PizzettaWorldApp />
}
