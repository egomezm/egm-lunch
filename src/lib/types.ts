export interface Session {
  id: string
  code: string
  name: string
  creator_id: string
  suggest_ends_at: string
  rank_seconds: number
  suggest_minutes?: number
  rank_base_seconds?: number
  created_at: string
}

export interface Participant {
  id: string
  session_id: string
  client_id: string
  name: string
}

export interface Option {
  id: string
  session_id: string
  participant_id: string
  name: string
  url: string | null
  created_at: string
}

export interface Veto {
  option_id: string
  participant_id: string
  session_id: string
}

export interface Ballot {
  participant_id: string
  session_id: string
  ranking: string[]
  locked: boolean
}

export interface SessionData {
  session: Session
  participants: Participant[]
  options: Option[]
  vetoes: Veto[]
  ballots: Ballot[]
}
