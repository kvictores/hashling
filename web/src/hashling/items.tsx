// Customization layers (hat, collar, accessory). Artwork lives in items.json (shared with the extension).
import ITEMS from './items.json'

type Group = Record<string, string>
const hats = ITEMS.hat as Group
const collars = ITEMS.collar as Group
const accBehind = ITEMS.accessory_behind as Group
const accFront = ITEMS.accessory_front as Group

interface LayerProps { item?: string; anim?: boolean }

function Svg({ markup }: { markup?: string }) {
  if (!markup) return null
  return <g dangerouslySetInnerHTML={{ __html: markup }} />
}

/** Hats: drawn in head coordinates, on top of the face. */
export function HatLayer({ item }: LayerProps) { return <Svg markup={item ? hats[item] : undefined} /> }
/** Collars: drawn in head coordinates, under the chin. */
export function CollarLayer({ item }: LayerProps) { return <Svg markup={item ? collars[item] : undefined} /> }
/** Accessories: body coordinates; some have a part behind the body (e.g. backpack panels). */
export function AccessoryBehind({ item }: LayerProps) { return <Svg markup={item ? accBehind[item] : undefined} /> }
export function AccessoryLayer({ item }: LayerProps) { return <Svg markup={item ? accFront[item] : undefined} /> }
