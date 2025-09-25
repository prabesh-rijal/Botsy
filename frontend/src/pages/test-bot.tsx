import { useState, useEffect, useRef } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useTheme } from "@/hooks/useTheme"
import client from "@/api/client"
import { supabase } from "@/lib/supabase"
import { Send, Bot, User, FileText, ExternalLink, ChevronDown, ChevronUp, ArrowLeft, LogOut, RotateCcw, Trash2, Scale, Shield, BookOpen, AlertCircle, Star } from "lucide-react"

interface LegalCitation {
  document_title: string
  article_section: string
  chunk_id: string
  direct_quote: string
  page?: number
  confidence_score: number
}

interface LegalResponse {
  summary: string
  applicable_statutes: LegalCitation[]
  reasoning: string
  confidence_score: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  legal_response?: LegalResponse
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!botId) {
      navigate('/dashboard')
      return
    }
    loadBot()
  }, [botId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message || response.data.summary || "I apologize, but I couldn't process your request.",
        legal_response: response.data.legal_response,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scale className="w-6 h-6 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Loading legal assistant...</p>
        </div>
      </div>
    )
  }

  const renderLegalResponse = (message: Message, index: number) => {
    const legal = message.legal_response
    if (!legal) return null

    return (
      <div className="mt-4 space-y-4">
        {/* Summary */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <div className="flex items-center mb-2">
            <BookOpen className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="font-semibold text-blue-900">Summary</h4>
          </div>
          <p className="text-blue-800 text-sm leading-relaxed">{legal.summary}</p>
        </div>

        {/* Applicable Statutes */}
        {legal.applicable_statutes && legal.applicable_statutes.length > 0 && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
            <div className="flex items-center mb-3">
              <Scale className="w-5 h-5 text-green-600 mr-2" />
              <h4 className="font-semibold text-green-900">Applicable Statutes & Articles</h4>
            </div>
            <div className="space-y-3">
              {legal.applicable_statutes.map((statute, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="font-medium text-green-900">{statute.document_title}</h5>
                      <p className="text-sm text-green-700">{statute.article_section}</p>
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="text-xs font-medium text-gray-600">{(statute.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <blockquote className="border-l-2 border-green-300 pl-3 text-sm text-gray-700 italic">
                    "{statute.direct_quote}"
                  </blockquote>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>Chunk ID: {statute.chunk_id}</span>
                    {statute.page && <span>Page: {statute.page}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reasoning */}
        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-purple-600 mr-2" />
            <h4 className="font-semibold text-purple-900">Legal Reasoning</h4>
          </div>
          <p className="text-purple-800 text-sm leading-relaxed whitespace-pre-line">{legal.reasoning}</p>
        </div>

        {/* Confidence Score */}
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-amber-600 mr-2" />
              <h4 className="font-semibold text-amber-900">Confidence Score</h4>
            </div>
            <div className="flex items-center">
              <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                <div 
                  className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${legal.confidence_score * 100}%` }}
                ></div>
              </div>
              <span className="font-bold text-amber-800">{(legal.confidence_score * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{bot?.name || 'Legal Assistant'}</h1>
              <p className="text-sm text-gray-500">AI Legal Research Assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={restartChat}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Restart conversation"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                <Scale className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Legal Research Assistant</h2>
              <p className="text-gray-600 text-center max-w-md">
                Ask questions about legal documents, statutes, and regulations. I'll provide detailed answers with proper citations and confidence scores.
              </p>
            </div>
          ) : (
            <div className="space-y-6 p-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start space-x-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-blue-600' 
                        : 'bg-gradient-to-r from-blue-500 to-purple-600'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Scale className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                      {message.role === 'assistant' && renderLegalResponse(message, index)}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3 max-w-3xl">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Scale className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask a legal question..."
                className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
