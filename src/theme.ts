export interface AppTheme {
  mode: 'light' | 'dark';
  bg: string;
  panel: string;
  panel2: string;
  border: string;
  borderStrong: string;
  text: string;
  muted: string;
  accent: string;
  accentBright: string;
  danger: string;
  success: string;
  termBg: string;
  termText: string;
  canvasBg: string;
  canvasGrid: string;
}

export const THEMES: Record<'light' | 'dark', AppTheme> = {
  light: {
    mode: 'light',
    bg: '#E1EFF6',
    panel: '#FFFFFF',
    panel2: '#F5F9FF',
    border: '#BFDBFE',
    borderStrong: '#93C5FD',
    text: '#172B4D',
    muted: '#53647A',
    accent: '#2563EB',
    accentBright: '#93C5FD',
    danger: '#f2897c',
    success: '#5fcf8a',
    termBg: '#FFFFFF',
    termText: '#172B4D',
    canvasBg: '#E1EFF6',
    canvasGrid: '#BFDBFE',
  },
  dark: {
    mode: 'dark',
    bg: '#070c14',
    panel: '#0b1220',
    panel2: '#101a29',
    border: '#29496B',
    borderStrong: '#47749E',
    text: '#E1EFF6',
    muted: '#97D2FB',
    accent: '#93C5FD',
    accentBright: '#93C5FD',
    danger: '#FCA5A5',
    success: '#86D9A4',
    termBg: '#0a1019',
    termText: '#E1EFF6',
    canvasBg: '#070c14',
    canvasGrid: '#47749E',
  }
};
