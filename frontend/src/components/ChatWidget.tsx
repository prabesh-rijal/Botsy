import { useState, useEffect, useRef } from 'react';
import { Send, RotateCcw, X, MessageSquare, Trash2, Bot, User, FileText, ChevronDown, ChevronUp, Globe, ExternalLink } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

interface MenuOption {
  option_name: string;
  prompt: string;
}

interface ChatWidgetProps {
  bot: {
    name: string;
    avatar?: string;
    avatar_url?: string;
    description?: string;
    greeting_message?: string;
    menu_options?: MenuOption[];
  };
  messages: Message[];
  onSend: (message: string) => void;
  onRestart: () => void;
  onClear: () => void;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

export default function ChatWidget({ bot, messages, onSend, onRestart, onClear, theme }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showSources, setShowSources] = useState<{[key: number]: boolean}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      onSend(inputValue);
      setInputValue('');
    }
  };

  const handleMenuOptionClick = (option: MenuOption) => {
    onSend(option.prompt);
  };

  const handleRestart = () => {
    onRestart();
  };

  const handleClear = () => {
    onClear();
    setInputValue('');
    setShowSources({});
  };

  const toggleSources = (messageIndex: number) => {
    setShowSources(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
  };

  // Helper to get avatar URL from bot object
  const botAvatarUrl = bot.avatar_url || bot.avatar || "";

  return (
    <>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 hover:scale-105 hover:bg-red-600"
        >
          <Bot size={20} className="mr-2" />
          <span className="font-semibold text-base">{bot.name}</span>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed bottom-5 right-5 bg-red-500 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 hover:scale-110 hover:bg-red-600"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-20 right-5 w-full max-w-sm h-[600px] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                {botAvatarUrl ? (
                  <img src={botAvatarUrl} alt="Bot Avatar" className="w-full h-full rounded-full" />
                ) : (
                  <Bot size={24} className="text-gray-500" />
                )}
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-lg leading-tight">{bot.name}</h3>
                <p className="text-xs text-gray-500 leading-tight max-w-[160px] truncate">{bot.description || "AI Assistant"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleClear} title="Clear Chat" className="text-gray-500 hover:text-gray-800">
                <Trash2 size={20} className="transition-transform duration-300 hover:scale-125 active:scale-90 hover:animate-bounce" />
              </button>
              <button onClick={() => setIsOpen(false)} title="Close" className="text-gray-500 hover:text-gray-800">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={index}>
                  <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {botAvatarUrl ? (
                          <img src={botAvatarUrl} alt="Bot Avatar" className="w-full h-full rounded-full" />
                        ) : (
                          <Bot size={20} className="text-gray-500" />
                        )}
                      </div>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-xs break-words text-xs ${
                        msg.role === 'user' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                   <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                     <User size={20} className="text-gray-600" />
                   </div>
                )}
              </div>
                  {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div className="mt-1 pl-8">
                      <button
                        onClick={() => toggleSources(index)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
                      >
                        <FileText className="w-3 h-3" />
                        <span>{msg.sources.length} {msg.sources.length > 1 ? 'Sources' : 'Source'}</span>
                        {showSources[index] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {showSources[index] && (
                        <div className="mt-1 space-y-2">
  {msg.sources.map((source: any, i: number) => {
    const url = source.metadata.url as string | undefined;
    const isUrl = !!url && /^https?:\/\//i.test(url);

    let displayName = source.metadata.title || "";
    if (!displayName) {
      if (isUrl) {
        try {
          const u = new URL(url!);
          displayName = u.origin; // just https://domain.tld
        } catch {
          displayName = "Untitled";
        }
      } else {
        displayName =
          source.metadata.filename ||
          (source.metadata.path?.split("/").pop() ?? "Untitled");
      }
    }

    return isUrl ? (
      <a
        key={i}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all duration-300"
      >
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs font-medium text-blue-600 hover:underline">
            {displayName}
          </p>
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </div>
      </a>
    ) : (
      <div
        key={i}
        className="block p-2 rounded-lg bg-gray-50 border border-gray-200"
      >
        <p className="text-xs font-medium text-gray-700">{displayName}</p>
      </div>
    );
  })}
</div>

                      )}
                    </div>
                  )}
                </div>
              ))}
              {messages.length === 1 && messages[0].role === 'assistant' && bot.menu_options && (
                <div className="flex flex-wrap gap-2 py-4">
                  {bot.menu_options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => handleMenuOptionClick(option)}
                      className="px-3 py-1.5 text-sm text-red-500 border border-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors duration-200"
                    >
                      {option.option_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-center gap-2">
              <button onClick={handleRestart} title="Restart Chat" className="p-2 text-gray-500 hover:text-gray-800">
                <RotateCcw size={20} className="transition-transform duration-500 hover:animate-spin hover:text-red-500" />
              </button>
              <textarea
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                placeholder="Type a message..."
                className="flex-1 w-full px-3 py-1 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 overflow-x-auto whitespace-nowrap text-sm"
                style={{overflowX: 'auto', whiteSpace: 'nowrap'}}
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-red-500 text-white rounded-lg disabled:opacity-50 transition-all duration-300 hover:scale-110 active:scale-90 hover:bg-red-600 focus:ring-2 focus:ring-red-400 animate-pulse"
                disabled={!inputValue.trim()}
              >
                <Send size={20} className="transition-transform duration-300 hover:scale-125 hover:animate-bounce" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}






