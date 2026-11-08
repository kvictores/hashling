export const LINE = '#4A4A55'

export interface Palette { base: string; shade: string; spot: string; belly: string; glow?: boolean }

export const FUR: Record<string, Palette> = {
  fur_classic: { base: '#F1EFEA', shade: '#D8D3C8', spot: '#5B5A60', belly: '#FFFDF8' },
  fur_moss: { base: '#CFE3C4', shade: '#A9C99B', spot: '#3E6B47', belly: '#F1F8EC' },
  fur_amber: { base: '#F7D9A8', shade: '#E9B97A', spot: '#8A4B2A', belly: '#FFF4E2' },
  fur_cyan: { base: '#CFF5F1', shade: '#9FE3DC', spot: '#137A75', belly: '#F0FFFD', glow: true },
}
