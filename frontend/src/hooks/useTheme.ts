import { useState, useEffect } from 'react'
import { themeConfigs } from '@/lib/theme-config'

export interface ThemeConfig {
  colors: {
    background: {
      from: string
      via: string
      to: string
    }
    primary: {
      from: string
      to: string
    }
    text: {
      primary: string
      secondary: string
      muted: string
    }
    surface: {
      card: string
      border: string
      glass: string
    }
    decorative: {
      primary: string
      secondary: string
      tertiary: string
    }
  }
}

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<string>('default')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'default'
    setCurrentTheme(savedTheme)
  }, [])

  const setTheme = (theme: string) => {
    setCurrentTheme(theme)
    localStorage.setItem('theme', theme)
  }

  const themeConfig: ThemeConfig = themeConfigs[currentTheme] || themeConfigs.default

  return {
    currentTheme,
    setTheme,
    themeConfig
  }
}