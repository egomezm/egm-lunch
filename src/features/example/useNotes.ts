import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'

export interface Note {
  id: string
  text: string
}

const KEY = ['notes']

export function useNotes() {
  return useQuery({ queryKey: KEY, queryFn: () => api<Note[]>('/notes') })
}

export function useAddNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      api<Note>('/notes', { method: 'POST', body: JSON.stringify({ text }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
