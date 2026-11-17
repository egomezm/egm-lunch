import { HashRouter, Route, Routes } from 'react-router-dom'
import { BrandHeader, Footer } from '../components/Chrome'
import { Landing } from '../pages/Landing'
import { OptionsPage } from '../pages/OptionsPage'
import { ResultsPage } from '../pages/ResultsPage'
import { SessionLayout } from '../pages/SessionLayout'
import { VetoRankPage } from '../pages/VetoRankPage'

export function App() {
  return (
    <HashRouter>
      <main className="shell">
        <BrandHeader />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<SessionLayout />}>
            <Route path="/options" element={<OptionsPage />} />
            <Route path="/veto" element={<VetoRankPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Route>
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
      <Footer />
    </HashRouter>
  )
}
