import { useState, useEffect, useRef } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useTheme } from "@/hooks/useTheme"
import client from "@/api/client"
import { supabase } from "@/lib/supabase"
import { Send, Bot, User, FileText, ExternalLink, ChevronDown, ChevronUp, ArrowLeft, LogOut, Home, RotateCcw, Globe, Trash2, Menu } from "lucide-react"
import ChatWidget from "@/components/ChatWidget"

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: any[]
}

export default function TestBot() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { themeConfig } = useTheme()
  const botId = searchParams.get('id')
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [bot, setBot] = useState<any>(null)
  const [showSources, setShowSources] = useState<{[key: number]: boolean}>({})
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!botId) {
      navigate('/dashboard')
      return
    }
    loadBot()
  }, [botId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuRef])

  const loadBot = async () => {
    try {
      const response = await client.get(`/api/bots/${botId}`)
      setBot(response.data)
      if (response.data.greeting_message) {
        setMessages([
          { role: 'assistant', content: response.data.greeting_message }
        ])
      }
    } catch (error) {
      console.error('Error loading bot:', error)
      navigate('/dashboard')
    }
  }

  const sendMessage = async (messageContent?: string) => {
    const content = messageContent || inputMessage;
    if (!content.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: content }
    setMessages(prev => [...prev, userMessage])
    if (!messageContent) {
      setInputMessage("")
    }
    setIsLoading(true)

    try {
      const response = await client.post(`/api/chat/${botId}`, {
        content: content
      })

      // Transform sources to expected format for ChatWidget
      let sources = response.data.sources || [];
      if (sources.length > 0) {
        sources = sources.map((src: any) => {
          if (src.metadata && src.metadata.url && src.metadata.title) {
            return src;
          }
          // Try to extract url/title from src or fallback
          return {
            metadata: {
              url: src.url || src.source_url || src.link || '',
              title: src.title || src.name || src.filename || src.url || 'Source'
            }
          };
        });
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message,
        sources: sources
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again."
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleSources = (messageIndex: number) => {
    setShowSources(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }))
  }

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to sign out? Any unsaved progress will be lost.")
    
    if (!confirmed) return
    
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('supabase_token')
      navigate("/")
    } catch (error: any) {
      console.error('Logout error:', error)
      // Force logout even if error
      localStorage.removeItem('supabase_token')
      navigate("/")
    }
  }

  const clearChat = () => {
    setMessages([])
    setInputMessage("")
    setShowSources({})
    setShowMenu(false)
  }

  const restartChat = () => {
    clearChat()
    if (bot && bot.greeting_message) {
      setMessages([
        { role: 'assistant', content: bot.greeting_message }
      ])
    }
  }

  if (!bot) {
    return (
      <div className={`min-h-screen ${themeConfig.colors.background.from} ${themeConfig.colors.background.via} ${themeConfig.colors.background.to} flex items-center justify-center`}>
        <div className="text-center">
          <Bot className="w-12 h-12 text-amber-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading bot...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${themeConfig.colors.background.from} ${themeConfig.colors.background.via} ${themeConfig.colors.background.to}`}>
      <div className={`${themeConfig.colors.surface.glass} backdrop-blur-sm border-b ${themeConfig.colors.surface.border} sticky top-0 z-10`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} flex items-center justify-center animate-pulse shadow-lg`}>
                {(() => {
                  const avatarPath = bot.avatar_url || bot.avatar;
                  if (avatarPath) {
                    // If already a full URL, use as is
                    if (/^https?:\/\//.test(avatarPath)) {
                      return <img src={avatarPath} alt="bot avatar" className="w-16 h-16 rounded-2xl object-cover" />;
                    }
                    // Otherwise, get public URL from Supabase
                    try {
                      const { data } = supabase.storage.from('botsy-bucket').getPublicUrl(avatarPath);
                      if (!data || !data.publicUrl) {
                        return <Bot className="w-10 h-10 text-white" />;
                      }
                      return <img src={data.publicUrl} alt="bot avatar" className="w-16 h-16 rounded-2xl object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />;
                    } catch {
                      return <Bot className="w-10 h-10 text-white" />;
                    }
                  }
                  return <Bot className="w-10 h-10 text-white" />;
                })()}
              </div>
              <h1 className={`text-2xl font-bold ${themeConfig.colors.text.primary} mt-2`}>{bot.name}</h1>
              <p className={`text-base ${themeConfig.colors.text.secondary} text-center max-w-md`}>{bot.description || "AI Assistant"}</p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => navigate('/dashboard')}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} hover:${themeConfig.colors.surface.glass} transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95`}
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>
              <button
                onClick={handleLogout}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.secondary} hover:${themeConfig.colors.text.primary} hover:${themeConfig.colors.surface.glass} transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 hover:border-red-300`}
              >
                <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 flex justify-center items-center">
        {bot && (
          <ChatWidget
            bot={bot}
            messages={messages}
            onSend={(message) => sendMessage(message)}
            onRestart={restartChat}
            onClear={clearChat}
          />
        )}
      </div>
    </div>
  )
}
