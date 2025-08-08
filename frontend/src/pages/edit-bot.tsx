import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import useAuth from "@/hooks/useAuth"
import client from "@/api/client"
import { useTheme } from "@/hooks/useTheme"
import { supabase } from "@/lib/supabase"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Bot, Save, Plus, FileText, Link, LogOut, AlertTriangle, Sparkles, X, MessageSquare, Image as ImageIcon } from "lucide-react"

interface MenuOption {
  option_name: string;
  prompt: string;
}

export default function EditBot() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { themeConfig } = useTheme()
  const [searchParams] = useSearchParams()
  const botId = searchParams.get('id')
  
  const [bot, setBot] = useState<any>(null)
  const [botName, setBotName] = useState("")
  const [botDescription, setBotDescription] = useState("")
  const [greetingMessage, setGreetingMessage] = useState("")
  const [botAvatar, setBotAvatar] = useState("")
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [urls, setUrls] = useState("")
  const [existingDocuments, setExistingDocuments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [botAvatarFile, setBotAvatarFile] = useState<File | null>(null)

  useEffect(() => {
    if (loading) return
    
    if (!user) {
      navigate("/")
      return
    }
    
    if (!botId) {
      console.log("Bot ID not found in URL")
      navigate("/dashboard")
      return
    }
    
    console.log("Bot ID:", botId)
    loadBot()
  }, [user, loading, botId])

  const loadBot = async () => {
    try {
      setError("")
      const response = await client.get(`/api/bots/${botId}`)
      const botData = response.data
      setBot(botData)
      setBotName(botData.name || "")
      setBotDescription(botData.description || "")
      setGreetingMessage(botData.greeting_message || "")
      setBotAvatar(botData.avatar || "")
      setMenuOptions(botData.menu_options || [])
      
      await loadExistingDocuments()
    } catch (error: any) {
      console.error('Error loading bot:', error)
      setError(error.response?.data?.detail || "Failed to load bot. Please try again.")
    }
  }

  const loadExistingDocuments = async () => {
    try {
      const response = await client.get(`/api/bots/${botId}/documents`)
      setExistingDocuments(response.data)
      
      const urlDocuments = response.data.filter((doc: any) => 
        doc.filename.startsWith('URL: ')
      )
      
      const extractedUrls = urlDocuments.map((doc: any) => {
        return doc.filename.substring(5)
      }).join('\n')
      
      if (extractedUrls.trim()) {
        setUrls(extractedUrls)
      }
      
      if (!extractedUrls.trim()) {
        try {
          const chunksResponse = await client.get(`/api/bots/${botId}/chunks`)
          if (chunksResponse.data && chunksResponse.data.length > 0) {
            const urlChunks = chunksResponse.data.filter((chunk: any) => 
              chunk.source && chunk.source.startsWith('URL: ')
            )
            
            if (urlChunks.length > 0) {
              const urlsFromChunks = [...new Set(urlChunks.map((chunk: any) => 
                chunk.source.substring(5)
              ))].join('\n')
              
              if (urlsFromChunks.trim()) {
                setUrls(urlsFromChunks)
              }
            }
          }
        } catch (chunkError) {
          console.log('No chunks endpoint available, using documents only')
        }
      }
      
    } catch (error: any) {
      console.error('Error loading documents:', error)
    }
  }

  const handleDeleteDocument = async (documentId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return
    }

    try {
      await client.delete(`/api/bots/${botId}/documents/${documentId}`)
      setSuccess(`Document "${filename}" deleted successfully.`)
      
      setTimeout(() => setSuccess(""), 3000)
      
      setExistingDocuments(prev => prev.filter(doc => doc.id !== documentId))
      
    } catch (error: any) {
      console.error('Error deleting document:', error)
      setError(error.response?.data?.detail || "Failed to delete document. Please try again.")
    }
  }

  const handleUpdateBot = async () => {
    if (!botName.trim()) {
      setError("Please enter a bot name")
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      // Always use the current avatar URL unless a new file is selected
      let avatarUrl = botAvatar;
      if (botAvatarFile) {
        const formData = new FormData();
        formData.append('file', botAvatarFile);
        const response = await client.post(`/api/bots/${botId}/avatar`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        avatarUrl = response.data.avatar;
      }

      // Update bot details, always send avatarUrl (persist previous if not changed)
      await client.put(`/api/bots/${botId}`, {
        name: botName,
        description: botDescription || `A chatbot named ${botName}`,
        greeting_message: greetingMessage,
        avatar: avatarUrl,
        menu_options: menuOptions
      });

      // Upload new files if any
      if (selectedFiles && selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const formData = new FormData();
          formData.append('file', file);
          await client.post(`/api/bots/${botId}/documents`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      }

      // Process new URLs if any
      if (urls.trim()) {
        const urlList = urls.trim().split('\n').filter(url => url.trim());
        for (const url of urlList) {
          try {
            await client.post(`/api/bots/${botId}/documents/url`, {
              url: url.trim()
            });
          } catch (error) {
            console.error(`Error processing URL ${url}:`, error);
          }
        }
      }

      setSuccess(`🎉 Bot "${botName}" updated successfully!`);
      setTimeout(() => setSuccess(""), 3000);
      // Reload bot data to get the latest state
      loadBot();
    } catch (error: any) {
      console.error('Error updating bot:', error);
      setError(error.response?.data?.detail || "Failed to update bot. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout? Any unsaved changes will be lost.')) {
      return
    }
    
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('supabase_token')
      navigate("/")
    } catch (error: any) {
      console.error('Logout error:', error)
      localStorage.removeItem('supabase_token')
      navigate("/")
    }
  }

  const handleAddMenuOption = () => {
    setMenuOptions([...menuOptions, { option_name: "", prompt: "" }])
  }

  const handleRemoveMenuOption = (index: number) => {
    const newOptions = [...menuOptions]
    newOptions.splice(index, 1)
    setMenuOptions(newOptions)
  }

  const handleMenuOptionChange = (index: number, field: keyof MenuOption, value: string) => {
    const newOptions = [...menuOptions]
    newOptions[index][field] = value
    setMenuOptions(newOptions)
  }

  if (loading || (!bot && !error)) return (
    <div className={`min-h-screen ${themeConfig.colors.background.from} ${themeConfig.colors.background.via} ${themeConfig.colors.background.to} flex items-center justify-center`}>
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} shadow-2xl mb-4`}>
          <Bot className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className={`${themeConfig.colors.text.primary} text-lg`}>Loading bot editor...</p>
      </div>
    </div>
  )

  const displayBotName = bot?.name || botName || "Unknown Bot"

  return (
    <div className={`min-h-screen ${themeConfig.colors.background.from} ${themeConfig.colors.background.via} ${themeConfig.colors.background.to}`}>
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full ${themeConfig.colors.decorative.primary} opacity-20`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full ${themeConfig.colors.decorative.secondary} opacity-20`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full ${themeConfig.colors.decorative.tertiary} opacity-10`}></div>
      </div>

      <div className="relative z-10 p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 animate-in slide-in-from-top duration-1000">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} hover:${themeConfig.colors.surface.glass} backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5`}
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
              <span className="hidden sm:inline font-medium">Back to Dashboard</span>
            </button>
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} shadow-lg`}>
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${themeConfig.colors.text.primary} tracking-tight`}>
                Edit <span className={`text-transparent bg-clip-text bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to}`}>{displayBotName}</span>
              </h1>
              <p className={`${themeConfig.colors.text.secondary} text-sm`}>Modify your AI assistant's configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className={`group ${themeConfig.colors.surface.glass} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} hover:${themeConfig.colors.surface.card} backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5 px-4 py-2.5 h-auto`}
              >
                <LogOut className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                <span className="font-medium">Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className={`mb-6 p-4 ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} rounded-xl backdrop-blur-sm animate-in slide-in-from-top duration-300`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
              {!bot && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadBot}
                  className={`${themeConfig.colors.surface.glass} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} hover:${themeConfig.colors.surface.card}`}
                >
                  Retry
                </Button>
              )}
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

        <Card className={`mb-8 ${themeConfig.colors.surface.glass} backdrop-blur-xl border ${themeConfig.colors.surface.border} animate-in slide-in-from-bottom duration-1000`}>
          <CardHeader>
            <CardTitle className={`${themeConfig.colors.text.primary} flex items-center gap-2`}>
              <Bot className="w-5 h-5" />
              Bot Configuration
            </CardTitle>
            <CardDescription className={`${themeConfig.colors.text.secondary}`}>
              Update your bot's settings, add more documents, or modify its behavior.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="botName" className={`${themeConfig.colors.text.primary} font-medium`}>Bot Name *</Label>
                <Input
                  id="botName"
                  placeholder={bot ? "Bot name..." : "Loading bot name..."}
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  disabled={!bot && !error}
                  className={`${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} premium-placeholder-brown focus:border-gray-400 focus:ring-gray-400/50 rounded-xl h-11 ${!bot && !error ? 'opacity-50' : ''}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="botDescription" className={`${themeConfig.colors.text.primary} font-medium`}>Description</Label>
                <Input
                  id="botDescription"
                  placeholder={bot ? "Bot description..." : "Loading bot description..."}
                  value={botDescription}
                  onChange={(e) => setBotDescription(e.target.value)}
                  disabled={!bot && !error}
                  className={`${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} premium-placeholder-brown focus:border-gray-400 focus:ring-gray-400/50 rounded-xl h-11 ${!bot && !error ? 'opacity-50' : ''}`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="greetingMessage" className={`${themeConfig.colors.text.primary} font-medium flex items-center gap-2`}>
                <MessageSquare className="w-4 h-4" />
                Greeting Message
              </Label>
              <Input
                id="greetingMessage"
                placeholder="e.g., Hello! How can I help you today?"
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                className={`${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} premium-placeholder-brown focus:border-gray-400 focus:ring-gray-400/50 rounded-xl h-11`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="botAvatar" className={`${themeConfig.colors.text.primary} font-medium flex items-center gap-2`}>
                <ImageIcon className="w-4 h-4" />
                Bot Avatar
              </Label>
              <Input
                id="botAvatar"
                type="file"
                accept="image/*"
                onChange={(e) => setBotAvatarFile(e.target.files ? e.target.files[0] : null)}
                className={`${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} file:bg-gray-800 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 hover:file:bg-gray-700 rounded-xl h-11`}
              />
            </div>

            <div className="space-y-4">
              <Label className={`${themeConfig.colors.text.primary} font-medium flex items-center gap-2`}>
                <Plus className="w-4 h-4" />
                Menu Options
              </Label>
              {menuOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                  <Input
                    placeholder="Option Name (e.g., 'Pricing')"
                    value={option.option_name}
                    onChange={(e) => handleMenuOptionChange(index, 'option_name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Prompt (e.g., 'What are your pricing plans?')"
                    value={option.prompt}
                    onChange={(e) => handleMenuOptionChange(index, 'prompt', e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveMenuOption(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={handleAddMenuOption}>
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>

            {existingDocuments.length > 0 && (
              <div className="space-y-3">
                <Label className={`${themeConfig.colors.text.primary} font-medium flex items-center gap-2`}>
                  <FileText className="w-4 h-4" />
                  Current Documents ({existingDocuments.length})
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {existingDocuments
                    .filter((doc) => {
                      return doc.filename !== 'webpage' && !doc.filename.startsWith('URL: ') && doc.content_type !== 'text/html'
                    })
                    .map((doc) => {
                    return (
                      <div key={doc.id} className={`${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} rounded-lg p-3 flex items-center justify-between`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className={`w-4 h-4 ${themeConfig.colors.text.muted} flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${themeConfig.colors.text.primary} truncate`}>
                              {doc.filename}
                            </p>
                            <p className={`text-xs ${themeConfig.colors.text.muted}`}>
                              {doc.content_type} • {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                          className={`p-1 rounded-full hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors`}
                          title="Delete document"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <p className={`text-sm ${themeConfig.colors.text.muted}`}>
                  These documents are currently part of your bot's knowledge base
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fileUpload" className={`${themeConfig.colors.text.primary} font-medium flex items-center gap-2`}>
                <FileText className="w-4 h-4" />
                Add More Documents
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
                Add new documents to expand your bot's knowledge base
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urls" className={`${themeConfig.colors.text.primary} font-medium flex items-center gap-2`}>
                <Link className="w-4 h-4" />
                Website URLs
              </Label>
              <Textarea
                id="urls"
                className={`min-h-[100px] ${themeConfig.colors.surface.card} border ${themeConfig.colors.surface.border} ${themeConfig.colors.text.primary} premium-placeholder-brown focus:border-gray-400 focus:ring-gray-400/50 rounded-xl`}
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
              />
              <p className={`text-sm ${themeConfig.colors.text.muted}`}>
                Add website URLs to scrape content from (one per line). URL documents will appear in the "Current Documents" section above.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={handleUpdateBot}
                disabled={isLoading || !botName.trim()}
                className={`flex-1 h-12 bg-gradient-to-r ${themeConfig.colors.primary.from} ${themeConfig.colors.primary.to} hover:opacity-80 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating Bot...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    Update Bot
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
