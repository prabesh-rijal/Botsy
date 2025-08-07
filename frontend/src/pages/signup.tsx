import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Link, useNavigate } from "react-router-dom"
import { Bot, Sparkles, ArrowRight, Eye, EyeOff, CheckCircle, Mail, ArrowLeft } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

export default function Signup() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [company, setCompany] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const navigate = useNavigate()
  const { themeConfig } = useTheme()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: company // Store company as full_name
          }
        }
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        // Start countdown to redirect to login
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              navigate("/")
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } catch (error: any) {
      setError("Signup failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={`min-h-screen ${themeConfig.colors.background.from} ${themeConfig.colors.background.via} ${themeConfig.colors.background.to} flex items-center justify-center p-4 relative overflow-hidden`}>
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full ${themeConfig.colors.decorative.primary} opacity-20`}></div>
          <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full ${themeConfig.colors.decorative.secondary} opacity-20`}></div>
        </div>

        {/* Success Content */}
        <div className="relative z-10 text-center animate-in zoom-in duration-1000">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} shadow-2xl mb-6 animate-bounce`}>
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          
          <h1 className={`text-4xl font-bold ${themeConfig.colors.text.primary} mb-4`}>
            Welcome to <span className={`text-transparent bg-clip-text bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to}`}>RAG BOTSY</span>!
          </h1>
          
          <div className={`${themeConfig.colors.surface.glass} backdrop-blur-xl rounded-3xl p-8 shadow-2xl border ${themeConfig.colors.surface.border} max-w-md mx-auto`}>
            <Mail className={`w-16 h-16 ${themeConfig.colors.text.secondary} mx-auto mb-4`} />
            <h2 className={`text-2xl font-bold ${themeConfig.colors.text.primary} mb-4`}>Check Your Email!</h2>
            <p className={`${themeConfig.colors.text.secondary} mb-6`}>
              We've sent a confirmation link to <span className={`font-semibold ${themeConfig.colors.text.primary}`}>{email}</span>. 
              Please check your inbox and click the link to activate your account.
            </p>
            
            <div className={`${themeConfig.colors.surface.card} rounded-xl p-4 mb-6 border ${themeConfig.colors.surface.border}`}>
              <p className={`${themeConfig.colors.text.secondary} text-sm`}>
                🎉 Your RAG BOTSY journey begins now! Create intelligent chatbots powered by your documents and data.
              </p>
            </div>

            <div className="text-center">
              <p className={`${themeConfig.colors.text.primary} mb-4`}>Redirecting to login in {countdown} seconds...</p>
              <div className={`w-full ${themeConfig.colors.surface.card} rounded-full h-2 mb-4`}>
                <div 
                  className={`bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} h-2 rounded-full transition-all duration-1000`}
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                ></div>
              </div>
              <Button 
                onClick={() => navigate("/")}
                className={`bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} hover:opacity-80 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Login Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${themeConfig.colors.background.from} ${themeConfig.colors.background.via} ${themeConfig.colors.background.to} flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full ${themeConfig.colors.decorative.primary} opacity-20`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full ${themeConfig.colors.decorative.secondary} opacity-20`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full ${themeConfig.colors.decorative.tertiary} opacity-10`}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8 animate-in slide-in-from-top duration-1000">
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

        {/* Signup Form */}
        <form
          onSubmit={handleSignup}
          className={`${themeConfig.colors.surface.glass} backdrop-blur-xl rounded-3xl p-8 shadow-2xl border ${themeConfig.colors.surface.border} animate-in slide-in-from-bottom duration-1000`}
        >
          <h2 className={`text-2xl font-bold ${themeConfig.colors.text.primary} text-center mb-6`}>Join RAG BOTSY</h2>

          {error && (
            <div className={`mb-4 p-3 rounded-xl ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} animate-in slide-in-from-top duration-300`}>
              <p className={`${themeConfig.colors.text.primary} text-sm text-center`}>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company" className={`${themeConfig.colors.text.primary} font-medium`}>Company Name</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your awesome company"
                className={`${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} premium-placeholder-brown focus:border-gray-400 focus:ring-gray-400/50 rounded-xl h-12 transition-all duration-300`}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={`${themeConfig.colors.text.primary} font-medium`}>Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={`${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} premium-placeholder-brown focus:border-gray-400 focus:ring-gray-400/50 rounded-xl h-12 transition-all duration-300`}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={`${themeConfig.colors.text.primary} font-medium`}>Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className={`${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} premium-placeholder-brown focus:border-gray-400 focus:ring-gray-400/50 rounded-xl h-12 pr-12 transition-all duration-300`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${themeConfig.colors.text.secondary} hover:${themeConfig.colors.text.primary} transition-colors`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <Button 
            className={`w-full mt-6 h-12 bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} hover:opacity-80 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating your account...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Create Account
                <ArrowRight className="w-5 h-5" />
              </div>
            )}
          </Button>

          <div className="text-center mt-6">
            <p className={`${themeConfig.colors.text.secondary} text-sm`}>
              Already have an account?{" "}
              <Link 
                to="/" 
                className={`${themeConfig.colors.text.primary} hover:opacity-80 font-semibold underline underline-offset-2 hover:underline-offset-4 transition-all duration-300`}
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 animate-in slide-in-from-bottom duration-1000" style={{animationDelay: '0.5s'}}>
          <p className={`${themeConfig.colors.text.muted} text-xs`}>
            © 2025 RAG BOTSY. Powered by AI Intelligence.
          </p>
        </div>
      </div>
    </div>
  )
}
