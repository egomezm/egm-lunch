import { useState, type FormEvent } from 'react'
import { useAddNote, useNotes } from './useNotes'
import styles from './Notes.module.css'

export function Notes() {
  const { data, isPending, error } = useNotes()
  const addNote = useAddNote()
  const [text, setText] = useState('')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    addNote.mutate(text.trim(), { onSuccess: () => setText('') })
  }

  return (
    <section className={styles.notes}>
      <h2>Notes</h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="note">New note</label>
        <input id="note" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" disabled={addNote.isPending}>
          Add
        </button>
      </form>
      {isPending && <p>Loading…</p>}
      {error && <p role="alert">Could not load notes: {error.message}</p>}
      <ul>
        {data?.map((note) => (
          <li key={note.id}>{note.text}</li>
        ))}
      </ul>
    </section>
  )
}
