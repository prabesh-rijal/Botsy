import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import useAuth from "@/hooks/useAuth"
import client from "@/api/client"
import { supabase } from "@/lib/supabase"
import { useTheme } from "@/hooks/useTheme"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Trash2, Edit, MessageCircle, AlertTriangle, Bot, Plus, Sparkles, LogOut, User, FileText, Link, Settings, Code, Check, X } from "lucide-react"

export default function Dashboard() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { themeConfig } = useTheme()
  
  // State for bot creation
  const [botName, setBotName] = useState("")
  const [botDescription, setBotDescription] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [urls, setUrls] = useState("")
  const [isBuilding, setIsBuilding] = useState(false)
  const [bots, setBots] = useState<any[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // State for user profile management
  const [companyName, setCompanyName] = useState("")
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [tempCompanyName, setTempCompanyName] = useState("")

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to sign out? Any unsaved changes will be lost.")
    
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

  // Update company name
  const updateCompanyName = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: tempCompanyName }
      })
      
      if (error) {
        setError("Failed to update company name")
        return
      }
      
      setCompanyName(tempCompanyName)
      setIsEditingCompany(false)
      setSuccess("Company name updated successfully")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      setError("Failed to update company name")
    }
  }

  const cancelEditCompany = () => {
    setTempCompanyName(companyName)
    setIsEditingCompany(false)
  }

  // Load user's bots
  const loadBots = async () => {
    try {
      const response = await client.get('/api/bots/')
      setBots(response.data)
      
    } catch (error) {
      console.error('Error loading bots:', error)
    }
  }

  const handleBuildBot = async () => {
    if (!botName.trim()) {
      setError("Please enter a bot name")
      return
    }

    setIsBuilding(true)
    setError("")
    setSuccess("")

    try {
      // Create the bot first
      const botResponse = await client.post('/api/bots/', {
        name: botName,
        description: botDescription || `A chatbot named ${botName}`,
        system_prompt: `You are ${botName}, a helpful AI assistant. Answer questions based on the provided context.`
      })

      const botId = botResponse.data.id

      // Upload files if any
      if (selectedFiles && selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i]
          const formData = new FormData()
          formData.append('file', file)
          
          await client.post(`/api/bots/${botId}/documents`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
        }
      }

      // Process URLs if any
      if (urls.trim()) {
        const urlList = urls.trim().split('\n').filter(url => url.trim())
        for (const url of urlList) {
          await client.post(`/api/bots/${botId}/documents/url`, {
            url: url.trim()
          })
        }
      }

      setSuccess(`🎉 Bot "${botName}" created successfully! You can now create a widget for it.`)
      
      // Clear form
      setBotName("")
      setBotDescription("")
      setSelectedFiles(null)
      setUrls("")
      
      // Reload bots
      loadBots()
      
    } catch (error: any) {
      console.error('Error creating bot:', error)
      setError(error.response?.data?.detail || "Failed to create bot. Please try again.")
    } finally {
      setIsBuilding(false)
    }
  }

  const handleDeleteBot = async (botId: string, botName: string) => {
    if (!confirm(`Are you sure you want to delete "${botName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await client.delete(`/api/bots/${botId}`)
      setSuccess(`Bot "${botName}" deleted successfully.`)
      loadBots() // Reload the bots list
    } catch (error: any) {
      console.error('Error deleting bot:', error)
      setError(error.response?.data?.detail || "Failed to delete bot. Please try again.")
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      navigate("/")
      return
    }
    
    if (user) {
      loadBots()
      // Load company name from user metadata
      const company = user.user_metadata?.full_name || user.email?.split('@')[0] || "Your Company"
      setCompanyName(company)
      setTempCompanyName(company)
    }
  }, [user, loading, navigate])

  if (loading) return (
    <div className={`min-h-screen ${themeConfig.colors.background.from} ${themeConfig.colors.background.via} ${themeConfig.colors.background.to} flex items-center justify-center`}>
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} shadow-2xl mb-4`}>
          <Bot className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className={`${themeConfig.colors.text.primary} text-lg`}>Loading your RAG BOTSY dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen ${themeConfig.colors.background.from} ${themeConfig.colors.background.via} ${themeConfig.colors.background.to}`}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full ${themeConfig.colors.decorative.primary} opacity-20`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full ${themeConfig.colors.decorative.secondary} opacity-20`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full ${themeConfig.colors.decorative.tertiary} opacity-10`}></div>
      </div>

      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 animate-in slide-in-from-top duration-1000">
          <div className="flex items-center gap-4">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} shadow-lg`}>
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className={`text-2xl font-bold ${themeConfig.colors.text.primary} tracking-tight`}>
                  Welcome back, 
                </h1>
                {isEditingCompany ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-300">
                    <Input
                      value={tempCompanyName}
                      onChange={(e) => setTempCompanyName(e.target.value)}
                      className={`text-2xl font-bold ${themeConfig.colors.text.primary} bg-transparent border-0 border-b-2 border-amber-400 focus:border-amber-500 rounded-none p-0 h-auto transition-all duration-300`}
                      onKeyPress={(e) => e.key === 'Enter' && updateCompanyName()}
                      autoFocus
                    />
                    <Button
                      onClick={updateCompanyName}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white p-1 h-7 w-7 transition-all duration-300 hover:scale-110"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={cancelEditCompany}
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-50 p-1 h-7 w-7 transition-all duration-300 hover:scale-110"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <span className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to}`}>
                      {companyName}
                    </span>
                    <Button
                      onClick={() => setIsEditingCompany(true)}
                      size="sm"
                      variant="ghost"
                      className={`p-1 h-7 w-7 hover:${themeConfig.colors.surface.glass} transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <p className={`${themeConfig.colors.text.secondary} text-sm`}>AI-Powered Knowledge Assistant Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${themeConfig.colors.surface.glass} backdrop-blur-sm border ${themeConfig.colors.surface.border}`}>
              <User className={`w-4 h-4 ${themeConfig.colors.text.secondary}`} />
              <span className={`${themeConfig.colors.text.primary} text-sm`}>{user?.email}</span>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className={`${themeConfig.colors.surface.glass} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} hover:${themeConfig.colors.surface.card} backdrop-blur-sm`}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className={`mb-6 p-4 ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} rounded-xl backdrop-blur-sm animate-in slide-in-from-top duration-300`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </div>
          </div>
        )}
        {success && (
          <div className={`mb-6 p-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 rounded-xl backdrop-blur-sm animate-in slide-in-from-top duration-300`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {success}
            </div>
          </div>
        )}

        {/* Bot Creation Form */}
        <Card className={`mb-8 ${themeConfig.colors.surface.glass} backdrop-blur-xl border ${themeConfig.colors.surface.border} animate-in slide-in-from-bottom duration-1000`}>
          <CardHeader>
            <CardTitle className={`${themeConfig.colors.text.primary} flex items-center gap-2`}>
              <Plus className="w-5 h-5" />
              Create a New AI Chatbot
            </CardTitle>
            <CardDescription className={`${themeConfig.colors.text.secondary}`}>
              Upload documents and create an intelligent chatbot that can answer questions about your content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bot Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="botName" className={`${themeConfig.colors.text.primary} font-medium`}>Bot Name *</Label>
                <Input
                  id="botName"
                  placeholder="e.g., Support Bot, FAQ Helper"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className={`${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} premium-placeholder-brown focus:border-gray-400 focus:ring-gray-400/50 rounded-xl h-11`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="botDescription" className={`${themeConfig.colors.text.primary} font-medium`}>Description (optional)</Label>
                <Input
                  id="botDescription"
                  placeholder="What does this bot help with?"
                  value={botDescription}
                  onChange={(e) => setBotDescription(e.target.value)}
                  className={`${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} premium-placeholder-brown focus:border-gray-400 focus:ring-gray-400/50 rounded-xl h-11`}
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="fileUpload" className={`${themeConfig.colors.text.primary} font-medium flex items-center gap-2`}>
                <FileText className="w-4 h-4" />
                Upload Documents
              </Label>
              <Input
                id="fileUpload"
                type="file"
                accept=".txt,.pdf,.docx,.md"
                multiple
                onChange={(e) => setSelectedFiles(e.target.files)}
                className={`${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} file:bg-gray-800 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 hover:file:bg-gray-700 rounded-xl h-11`}
              />
              <p className={`text-sm ${themeConfig.colors.text.muted}`}>
                Supported: .txt, .pdf, .docx, .md files
              </p>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="urls" className={`${themeConfig.colors.text.primary} font-medium flex items-center gap-2`}>
                <Link className="w-4 h-4" />
                Website URLs
              </Label>
              <Textarea
                id="urls"
                placeholder="Enter one URL per line...&#10;https://example.com/docs&#10;https://example.com/faq"
                className={`min-h-[100px] ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} premium-placeholder-brown focus:border-gray-400 focus:ring-gray-400/50 rounded-xl`}
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
              />
              <p className={`text-sm ${themeConfig.colors.text.muted}`}>
                Enter website URLs to scrape content from (one per line)
              </p>
            </div>

            {/* Build Button */}
            <Button 
              onClick={handleBuildBot}
              disabled={isBuilding || (!selectedFiles && !urls.trim()) || !botName.trim()}
              className={`w-full h-12 bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} hover:opacity-80 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {isBuilding ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Building Your Bot...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Build My Bot
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Bots */}
        <Card className={`${themeConfig.colors.surface.glass} backdrop-blur-xl border ${themeConfig.colors.surface.border} animate-in slide-in-from-bottom duration-1000`} style={{animationDelay: '0.3s'}}>
          <CardHeader>
            <CardTitle className={`${themeConfig.colors.text.primary} flex items-center gap-2`}>
              <Bot className="w-5 h-5" />
              Your AI Chatbots
            </CardTitle>
            <CardDescription className={`${themeConfig.colors.text.secondary}`}>
              Manage and chat with your created intelligent assistants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bots.length === 0 ? (
              <div className="text-center py-12">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${themeConfig.colors.surface.card} mb-4`}>
                  <Bot className={`w-8 h-8 ${themeConfig.colors.text.secondary}`} />
                </div>
                <p className={`${themeConfig.colors.text.primary} text-lg mb-2`}>No bots created yet</p>
                <p className={`${themeConfig.colors.text.muted} text-sm`}>Create your first AI assistant above! ✨</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bots.map((bot, index) => (
                  <Card 
                    key={bot.id} 
                    className={`${themeConfig.colors.surface.card} backdrop-blur-sm border ${themeConfig.colors.surface.border} hover:${themeConfig.colors.surface.glass} hover:border-gray-300 transition-all duration-300 group animate-in slide-in-from-bottom duration-500`}
                    style={{animationDelay: `${index * 0.1}s`}}
                  >
                    <CardHeader>
                      <CardTitle className={`${themeConfig.colors.text.primary} text-lg group-hover:${themeConfig.colors.text.secondary} transition-colors`}>
                        {bot.name}
                      </CardTitle>
                      <CardDescription className={`${themeConfig.colors.text.secondary}`}>
                        {bot.description || "Your intelligent AI assistant"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={`space-y-2 text-sm ${themeConfig.colors.text.secondary} mb-4`}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>{bot.document_count} documents</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          <span>Created {new Date(bot.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/test-bot?id=${bot.id}`)}
                          className={`group flex items-center gap-1 bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} hover:opacity-80 text-white border-0 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg`}
                        >
                          <MessageCircle className="h-3 w-3 transition-transform duration-300 group-hover:rotate-12" />
                          Chat
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/edit-bot?id=${bot.id}`)}
                          className={`group flex items-center gap-1 border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.secondary} hover:${themeConfig.colors.surface.card} hover:${themeConfig.colors.text.primary} transition-all duration-300 hover:scale-105`}
                        >
                          <Edit className="h-3 w-3 transition-transform duration-300 group-hover:rotate-12" />
                          Edit
                        </Button>
                        
                        {/* Simple Embed Code Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/widget-demo.html?bot=${bot.id}`, '_blank')}
                          className={`group flex items-center gap-1 border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.secondary} hover:${themeConfig.colors.surface.card} hover:${themeConfig.colors.text.primary} transition-all duration-300 hover:scale-105`}
                        >
                          <Code className="h-3 w-3 transition-transform duration-300 group-hover:rotate-12" />
                          Get Embed Code
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBot(bot.id, bot.name)}
                          className={`group flex items-center gap-1 ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} hover:opacity-80 transition-all duration-300 hover:scale-105`}
                        >
                          <Trash2 className="h-3 w-3 transition-transform duration-300 group-hover:scale-110" />
                          Delete
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
