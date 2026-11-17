import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase = url && key ? createClient(url, key) : null
export const isConfigured = supabase !== null

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const api = {
  serverNow: () => call<string>('server_now'),
  createSession: (name: string, creatorId: string, suggestMinutes: number, rankSeconds: number) =>
    call<string>('create_session', {
      p_name: name,
      p_creator_id: creatorId,
      p_suggest_minutes: suggestMinutes,
      p_rank_seconds: rankSeconds,
    }),
  join: (code: string, clientId: string, name: string) =>
    call<string>('join_session', { p_code: code, p_client_id: clientId, p_name: name }),
  addOption: (code: string, clientId: string, name: string, url: string) =>
    call<string>('add_option', { p_code: code, p_client_id: clientId, p_name: name, p_url: url }),
  removeOption: (optionId: string, clientId: string) =>
    call<void>('remove_option', { p_option_id: optionId, p_client_id: clientId }),
  toggleVeto: (optionId: string, clientId: string) =>
    call<boolean>('toggle_veto', { p_option_id: optionId, p_client_id: clientId }),
  saveBallot: (code: string, clientId: string, ranking: string[], locked: boolean) =>
    call<void>('save_ballot', {
      p_code: code,
      p_client_id: clientId,
      p_ranking: ranking,
      p_locked: locked,
    }),
  extend: (code: string, clientId: string, seconds: number) =>
    call<void>('extend_phase', { p_code: code, p_client_id: clientId, p_seconds: seconds }),
  endEarly: (code: string, clientId: string) =>
    call<void>('end_phase_early', { p_code: code, p_client_id: clientId }),
}
