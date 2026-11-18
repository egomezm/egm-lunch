import { HashRouter, Route, Routes } from 'react-router-dom'
import { BrandHeader, Footer } from '../components/Chrome'
import { Landing } from '../pages/Landing'
import { OptionsPage } from '../pages/OptionsPage'
import { ResultsPage } from '../pages/ResultsPage'
import { StatsPage } from '../pages/StatsPage'
import { SessionLayout } from '../pages/SessionLayout'
import { ReviewsPage } from '../pages/ReviewsPage'
import { RankPage, VetoPage } from '../pages/VetoRank'

export function App() {
  return (
    <HashRouter>
      <main className="shell">
        <BrandHeader />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route element={<SessionLayout />}>
            <Route path="/options" element={<OptionsPage />} />
            <Route path="/veto" element={<VetoPage />} />
            <Route path="/rank" element={<RankPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
          </Route>
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
      <Footer />
    </HashRouter>
  )
}
