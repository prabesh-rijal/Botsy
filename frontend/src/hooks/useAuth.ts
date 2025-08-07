import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Session, User } from "@supabase/supabase-js"

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user || null)
      
      // Store token for API calls
      if (session) {
        localStorage.setItem('supabase_token', session.access_token)
      }
      
      setLoading(false)
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
      setUser(session?.user || null)
      
      // Update stored token
      if (session) {
        localStorage.setItem('supabase_token', session.access_token)
      } else {
        localStorage.removeItem('supabase_token')
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return { user, session, loading }
}
