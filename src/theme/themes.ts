export interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  accent: string;
  text: string;
  textMuted: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  colors: ThemeColors;
}

export const THEMES: Record<string, ThemeDefinition> = {
  apple_light: {
    id: 'apple_light',
    name: 'Apple Light',
    colors: {
      bg: '#f5f5f7',
      surface: '#ffffff',
      border: '#e5e5ea',
      accent: '#007aff',
      text: '#1d1d1f',
      textMuted: '#86868b',
    }
  },
  deep_dark: {
    id: 'deep_dark',
    name: 'Deep Dark',
    colors: {
      bg: '#09090b',
      surface: '#0a0a0c',
      border: '#18181b',
      accent: '#3b82f6',
      text: '#ffffff',
      textMuted: '#71717a',
    }
  },
  zinc_modern: {
    id: 'zinc_modern',
    name: 'Zinc Modern',
    colors: {
      bg: '#18181b',
      surface: '#27272a',
      border: '#3f3f46',
      accent: '#10b981',
      text: '#ffffff',
      textMuted: '#a1a1aa',
    }
  },
  midnight_blue: {
    id: 'midnight_blue',
    name: 'Midnight Blue',
    colors: {
      bg: '#020617',
      surface: '#0f172a',
      border: '#1e293b',
      accent: '#0ea5e9',
      text: '#f8fafc',
      textMuted: '#64748b',
    }
  },
  purple_night: {
    id: 'purple_night',
    name: 'Purple Night',
    colors: {
      bg: '#0f0717',
      surface: '#1a0b2e',
      border: '#2d144d',
      accent: '#a855f7',
      text: '#f3e8ff',
      textMuted: '#a78bfa',
    }
  }
};

export const applyTheme = (themeId: string) => {
  const theme = THEMES[themeId] || THEMES.apple_light;
  const root = document.documentElement;
  
  root.style.setProperty('--app-bg', theme.colors.bg);
  root.style.setProperty('--app-surface', theme.colors.surface);
  root.style.setProperty('--app-border', theme.colors.border);
  root.style.setProperty('--app-accent', theme.colors.accent);
  root.style.setProperty('--app-text', theme.colors.text);
  root.style.setProperty('--app-text-muted', theme.colors.textMuted);
};
