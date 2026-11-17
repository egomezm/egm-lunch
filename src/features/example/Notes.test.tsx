import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Notes } from './Notes'

afterEach(() => vi.unstubAllGlobals())

describe('Notes', () => {
  it('renders notes returned by the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: '1', text: 'Tacos' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <Notes />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Tacos')).toBeInTheDocument()
  })
})
