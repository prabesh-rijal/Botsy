import React from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Palette } from 'lucide-react'

export const ThemeWidget: React.FC = () => {
  const { themeConfig, setTheme, currentTheme } = useTheme()

  const themes = [
    { id: 'default', name: 'Default', color: 'bg-blue-500' },
    { id: 'dark', name: 'Dark', color: 'bg-gray-800' },
    { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
    { id: 'green', name: 'Green', color: 'bg-green-500' },
  ]

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">Theme</span>
        </div>
        <div className="flex gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setTheme?.(theme.id)}
              className={`w-8 h-8 ${theme.color} rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                currentTheme === theme.id ? 'border-white shadow-lg' : 'border-white/30'
              }`}
              title={theme.name}
            />
          ))}
        </div>
      </div>
    </div>
  )
}