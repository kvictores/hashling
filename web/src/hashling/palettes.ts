// Fur swatches (shop chips + legends). The mascot itself uses the supplied fur artwork (see pets.json); these are
// only the representative colors sampled from each fur PNG: coat, shade and spot.
export const LINE = '#4A4A55'

export interface Palette { base: string; shade: string; spot: string; belly: string; glow?: boolean }

export const FUR: Record<string, Palette> = {
  fur_classic: { base: '#F3E8D6', shade: '#D9C8AF', spot: '#6B7A6E', belly: '#FFFDF8' },
  fur_moss: { base: '#BFD6AE', shade: '#9DB98B', spot: '#5A8764', belly: '#EDF4E4' },
  fur_amber: { base: '#EDBE74', shade: '#D49B4A', spot: '#8A4B2A', belly: '#FBE4B8' },
  fur_cyan: { base: '#B4E8E0', shade: '#8FD2C9', spot: '#2F8F8A', belly: '#EAFBF8' },
}
