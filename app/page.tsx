import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

type Todo = { id?: string; _id?: string; external_id?: string; title?: string; text?: string } | string

export default async function Page(): Promise<JSX.Element> {
  // cookies() is synchronous in Next's app-router
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: todos, error } = await supabase.from('todos').select('*')

  if (error) {
    return <div>Failed to load todos: {error.message}</div>
  }

  if (!todos || todos.length === 0) {
    return <div>No todos yet</div>
  }

  return (
    <ul>
      {todos.map((todo: Todo) => {
        const t = typeof todo === 'string' ? todo : todo
        const key = (typeof t === 'string') ? t : (t.id ?? t._id ?? t.external_id ?? JSON.stringify(t))
        const label = typeof t === 'object' ? (t.title ?? t.text ?? JSON.stringify(t)) : String(t)
        return <li key={key}>{label}</li>
      })}
    </ul>
  )
}
