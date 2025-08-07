import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import useAuth from "@/hooks/useAuth"

export default function Profile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (user) {
      setEmail(user.email || "")
      setCompany(user.user_metadata?.company || "")
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Update user metadata for company
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { company }
      })

      if (metadataError) throw metadataError

      // Update password if provided
      if (password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password
        })

        if (passwordError) throw passwordError
      }

      // Update email if changed
      if (email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email
        })

        if (emailError) throw emailError
      }

      alert("Profile updated successfully!")
      setPassword("") // Clear password field
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold mb-6">Edit Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <Label htmlFor="company">Company Name</Label>
          <Input 
            id="company" 
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Your company name" 
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com" 
          />
        </div>

        <div>
          <Label htmlFor="password">New Password (leave blank to keep current)</Label>
          <Input 
            id="password" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" 
          />
        </div>

        <Button type="submit" disabled={loading} className="mt-4">
          {loading ? "Updating..." : "Update Profile"}
        </Button>
      </form>
    </div>
  );
}
