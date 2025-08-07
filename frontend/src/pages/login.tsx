import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useTheme } from "@/hooks/useTheme"
import { Bot, Sparkles, Eye, EyeOff, Mail, Lock, LogIn } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { themeConfig } = useTheme()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })

      if (error) {
        setError(error.message)
      } else {
        // Store the session token for API calls
        const session = data.session
        if (session) {
          localStorage.setItem('supabase_token', session.access_token)
        }
        navigate("/dashboard")
      }
    } catch (error: any) {
      setError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen ${themeConfig.colors.background.from} ${themeConfig.colors.background.via} ${themeConfig.colors.background.to} flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full ${themeConfig.colors.decorative.primary} opacity-20`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full ${themeConfig.colors.decorative.secondary} opacity-20`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full ${themeConfig.colors.decorative.tertiary} opacity-10`}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} shadow-2xl mb-4 transform hover:scale-105 transition-transform duration-300`}>
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className={`text-4xl font-bold ${themeConfig.colors.text.primary} mb-2 tracking-tight`}>
            RAG <span className={`text-transparent bg-clip-text bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to}`}>BOTSY</span>
          </h1>
          <p className={`${themeConfig.colors.text.secondary} text-sm flex items-center justify-center gap-1`}>
            <Sparkles className="w-4 h-4" />
            Your AI-Powered Knowledge Assistant
            <Sparkles className="w-4 h-4" />
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className={`${themeConfig.colors.surface.card} backdrop-blur-xl rounded-3xl p-8 shadow-2xl border ${themeConfig.colors.surface.border}`}>
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl text-red-700 text-sm backdrop-blur-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className={`text-sm font-medium ${themeConfig.colors.text.primary} flex items-center gap-2`}>
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} rounded-xl ${themeConfig.colors.text.primary} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm`}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className={`text-sm font-medium ${themeConfig.colors.text.primary} flex items-center gap-2`}>
                <Lock className="w-4 h-4" />
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} rounded-xl ${themeConfig.colors.text.primary} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm pr-12`}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${themeConfig.colors.text.secondary} hover:${themeConfig.colors.text.primary} transition-colors duration-200`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} text-white font-semibold rounded-xl shadow-lg hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Sign In
                </div>
              )}
            </button>

            <div className="text-center">
              <p className={`${themeConfig.colors.text.secondary} text-sm`}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className={`${themeConfig.colors.text.primary} hover:opacity-80 font-semibold transition-colors duration-200 underline decoration-amber-400 hover:decoration-amber-600`}
                >
                  Sign up here
                </button>
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className={`${themeConfig.colors.text.muted} text-xs`}>
            © 2025 RAG BOTSY. Powered by AI Intelligence.
          </p>
        </div>
      </div>
    </div>
  )
}
