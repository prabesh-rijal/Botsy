import { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useTheme } from "@/hooks/useTheme"
import client from "@/api/client"
import { supabase } from "@/lib/supabase"
import { Send, Bot, User, FileText, ExternalLink, ChevronDown, ChevronUp, ArrowLeft, LogOut, Home, RotateCcw, Globe } from "lucide-react"

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

  useEffect(() => {
    if (!botId) {
      navigate('/dashboard')
      return
    }
    loadBot()
  }, [botId])

  const loadBot = async () => {
    try {
      const response = await client.get(`/api/bots/${botId}`)
      setBot(response.data)
    } catch (error) {
      console.error('Error loading bot:', error)
      navigate('/dashboard')
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: inputMessage }
    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const response = await client.post(`/api/chat/${botId}`, {
        content: inputMessage
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message,
        sources: response.data.sources || []
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
      {/* Navigation Header */}
      <div className={`${themeConfig.colors.surface.glass} backdrop-blur-sm border-b ${themeConfig.colors.surface.border} sticky top-0 z-10`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} hover:${themeConfig.colors.surface.glass} transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95`}
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} flex items-center justify-center animate-pulse`}>
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-xl font-bold ${themeConfig.colors.text.primary}`}>{bot.name}</h1>
                  <p className={`text-sm ${themeConfig.colors.text.secondary}`}>{bot.description || "AI Assistant"}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.secondary} hover:${themeConfig.colors.text.primary} hover:${themeConfig.colors.surface.glass} transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 hover:border-amber-300`}
              >
                <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                <span className="hidden sm:inline">Clear Chat</span>
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

      {/* Chat Area */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className={`${themeConfig.colors.surface.glass} backdrop-blur-sm rounded-2xl border ${themeConfig.colors.surface.border} min-h-[600px] flex flex-col`}>
          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Bot className={`w-16 h-16 text-amber-500 mx-auto mb-4`} />
                <h3 className={`text-lg font-semibold ${themeConfig.colors.text.primary} mb-2`}>Start a conversation</h3>
                <p className={`${themeConfig.colors.text.secondary}`}>Ask me anything about the uploaded documents!</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0`}>
                    <Bot className="w-5 h-5 text-amber-600" />
                  </div>
                )}
                
                <div className={`max-w-3xl ${message.role === 'user' ? 'order-first' : ''}`}>
                  <div className={`p-4 rounded-2xl ${
                    message.role === 'user'
                      ? `bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} text-white ml-12`
                      : `${themeConfig.colors.surface.card} ${themeConfig.colors.text.primary} border ${themeConfig.colors.surface.border}`
                  }`}>
                    <p className="leading-relaxed">{message.content}</p>
                  </div>

                  {/* Sources */}
                  {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => toggleSources(index)}
                        className={`group flex items-center gap-2 text-sm ${themeConfig.colors.text.secondary} hover:${themeConfig.colors.text.primary} transition-all duration-300 hover:scale-105 active:scale-95`}
                      >
                        <span>Sources ({message.sources.length})</span>
                        {showSources[index] ? 
                          <ChevronUp className="w-4 h-4 group-hover:-translate-y-1 transition-transform duration-300" /> : 
                          <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform duration-300" />
                        }
                      </button>
                      
                      {showSources[index] && (
                        <div className="mt-2 space-y-2 animate-in slide-in-from-top duration-300">
                          {message.sources.map((source, sourceIndex) => {
                            // Extract URL from multiple possible fields
                            const actualUrl = source.source_url || 
                              (source.filename?.startsWith('URL:') ? source.filename.replace('URL:', '').trim() : null) ||
                              source.url
                            
                            const isUrl = actualUrl && (actualUrl.startsWith('http://') || actualUrl.startsWith('https://'))
                            
                            return (
                              <div key={sourceIndex} className={`${themeConfig.colors.surface.card} rounded-lg p-3 border ${themeConfig.colors.surface.border} hover:shadow-md transition-all duration-300`}>
                                <div className="flex items-start gap-2">
                                  {isUrl ? (
                                    <ExternalLink className={`w-4 h-4 ${themeConfig.colors.text.muted} mt-0.5 flex-shrink-0`} />
                                  ) : (
                                    <FileText className={`w-4 h-4 ${themeConfig.colors.text.muted} mt-0.5 flex-shrink-0`} />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    {/* Title/URL and Similarity Score */}
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <div className="flex-1 min-w-0">
                                        {isUrl ? (
                                          <a
                                            href={actualUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`group text-sm font-medium ${themeConfig.colors.text.primary} hover:text-amber-600 transition-all duration-300 hover:scale-[1.02] transform-gpu block`}
                                          >
                                            <span className="truncate">{actualUrl}</span>
                                          </a>
                                        ) : (
                                          <span className={`text-sm font-medium ${themeConfig.colors.text.primary} block truncate`}>
                                            {source.filename || 'Document'}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Similarity Score - Check multiple field names */}
                                      {(source.similarity_score !== undefined && source.similarity_score !== null && source.similarity_score >= 0) ? (
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 border border-amber-200`}>
                                          <div className={`w-2 h-2 rounded-full ${
                                            source.similarity_score > 0.8 ? 'bg-green-500' :
                                            source.similarity_score > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}></div>
                                          <span className={`text-xs font-medium text-amber-800`}>
                                            {Math.round(source.similarity_score * 100)}%
                                          </span>
                                        </div>
                                      ) : (source.similarity !== undefined && source.similarity !== null && source.similarity >= 0) ? (
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 border border-amber-200`}>
                                          <div className={`w-2 h-2 rounded-full ${
                                            source.similarity > 0.8 ? 'bg-green-500' :
                                            source.similarity > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}></div>
                                          <span className={`text-xs font-medium text-amber-800`}>
                                            {Math.round(source.similarity * 100)}%
                                          </span>
                                        </div>
                                      ) : null}
                                    </div>
                                    
                                    {/* Content Preview */}
                                    {(source.content_preview || source.content) && (
                                      <p className={`text-xs ${themeConfig.colors.text.secondary} leading-relaxed line-clamp-2`}>
                                        {(source.content_preview || source.content).substring(0, 150)}...
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} flex items-center justify-center flex-shrink-0`}>
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className={`w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0`}>
                  <Bot className="w-5 h-5 text-amber-600" />
                </div>
                <div className={`${themeConfig.colors.surface.card} ${themeConfig.colors.text.primary} border ${themeConfig.colors.surface.border} p-4 rounded-2xl`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className={`border-t ${themeConfig.colors.surface.border} p-4`}>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className={`w-full px-4 py-3 ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} rounded-xl ${themeConfig.colors.text.primary} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none`}
                  rows={1}
                  style={{
                    minHeight: '44px',
                    maxHeight: '120px'
                  }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={`group w-11 h-11 bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} text-white rounded-xl hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 hover:shadow-lg`}
              >
                <Send className={`w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300 ${isLoading ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
