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
    panel2: '#f5f7fb',
    border: '#ECCBD9',       
    borderStrong: '#83BCFF', 
    text: '#171725',
    muted: '#83BCFF',        
    accent: '#83BCFF',       
    accentBright: '#80FFE8', 
    danger: '#f2897c',
    success: '#5fcf8a',
    termBg: '#FFFFFF',
    termText: '#171725',
    canvasBg: '#E1EFF6',     
    canvasGrid: '#83BCFF',   
  },
  dark: {
    mode: 'dark',
    bg: '#070c14',
    panel: '#0b1220',
    panel2: '#101a29',
    border: '#1e2a3d',
    borderStrong: '#30435a',
    text: '#E1EFF6',         
    muted: '#97D2FB',        
    accent: '#80FFE8',       
    accentBright: '#80FFE8', 
    danger: '#ECCBD9',       
    success: '#80FFE8',      
    termBg: '#0a1019',
    termText: '#E1EFF6',     
    canvasBg: '#070c14',
    canvasGrid: '#30435a',
  }
};