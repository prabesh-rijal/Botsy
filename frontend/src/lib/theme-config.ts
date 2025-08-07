export const themeConfigs: Record<string, any> = {
  default: {
    colors: {
      background: {
        from: 'bg-gradient-to-br from-amber-50',
        via: 'via-orange-50',
        to: 'to-amber-100'
      },
      primary: {
        from: 'from-amber-600',
        to: 'to-orange-600'
      },
      text: {
        primary: 'text-gray-800',
        secondary: 'text-gray-600',
        muted: 'text-gray-500'
      },
      surface: {
        card: 'bg-white/80',
        border: 'border-amber-200',
        glass: 'bg-white/60'
      },
      decorative: {
        primary: 'bg-amber-200',
        secondary: 'bg-orange-200',
        tertiary: 'bg-yellow-200'
      }
    }
  }
}