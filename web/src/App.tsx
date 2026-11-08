import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { UserProvider } from './UserContext'
import { Layout } from './components/Layout'
import Den from './pages/Den'
import Quiz from './pages/Quiz'
import ScamCheck from './pages/ScamCheck'
import Shop from './pages/Shop'
import FileCheck from './pages/FileCheck'
import Passwords from './pages/Passwords'
import About from './pages/About'
import Inbox from './pages/demo/Inbox'
import Parcel from './pages/demo/Parcel'
import Prize from './pages/demo/Prize'
import Gallery from './pages/dev/Gallery'

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Den />} />
            <Route path="quiz" element={<Quiz />} />
            <Route path="scam-check" element={<ScamCheck />} />
            <Route path="shop" element={<Shop />} />
            <Route path="file-check" element={<FileCheck />} />
            <Route path="passwords" element={<Passwords />} />
            <Route path="about" element={<About />} />
          </Route>
          {/* Demo pages: standalone fictional "external" sites for testing the extension */}
          <Route path="demo/inbox" element={<Inbox />} />
          <Route path="demo/parcel" element={<Parcel />} />
          <Route path="demo/prize" element={<Prize />} />
          <Route path="dev/hashling" element={<Gallery />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  )
}
