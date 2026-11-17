import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { Notes } from '../features/example/Notes'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <nav>
          <Link to="/">Home</Link>
        </nav>
        <main>
          <Routes>
            <Route path="/" element={<Notes />} />
            <Route path="*" element={<p>Not found</p>} />
          </Routes>
        </main>
      </HashRouter>
    </QueryClientProvider>
  )
}
