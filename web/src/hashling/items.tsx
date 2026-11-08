// Wearable layers (hat, collar, accessory). Artwork lives in items.json (shared with the extension); each fragment is
// authored in a canonical frame and mapped onto the pet by an anchor from pets.json (see geometry.ts).
import ITEMS from './items.json'
import { anchorTransform, type AnchorName, type WorldAnchor } from './geometry'

type Group = Record<string, string>
const hats = ITEMS.hat as Group
const collars = ITEMS.collar as Group
const accBehind = ITEMS.accessory_behind as Group
const accFront = ITEMS.accessory_front as Group
const accFrame = ITEMS.accessory_frame as Record<string, AnchorName>

type Anchors = Record<AnchorName, WorldAnchor> | null

function Wear({ markup, anchor, uid }: { markup?: string; anchor?: WorldAnchor; uid: string }) {
  if (!markup || !anchor) return null
  return <g transform={anchorTransform(anchor)} dangerouslySetInnerHTML={{ __html: markup.split('{{uid}}').join(uid) }} />
}

interface LayerProps { item?: string; anchors: Anchors; uid: string }

/** Hats: head frame, sit on the crown between the ears. */
export function HatLayer({ item, anchors, uid }: LayerProps) { return <Wear markup={item ? hats[item] : undefined} anchor={anchors?.crown} uid={`${uid}h`} /> }
/** Collars: neck frame, around the base of the neck below the chin. */
export function CollarLayer({ item, anchors, uid }: LayerProps) { return <Wear markup={item ? collars[item] : undefined} anchor={anchors?.neck} uid={`${uid}c`} /> }
/** Accessory parts that sit behind the pet (backpack panels behind the shoulders). */
export function AccessoryBehind({ item, anchors, uid }: LayerProps) {
  return <Wear markup={item ? accBehind[item] : undefined} anchor={item ? anchors?.[accFrame[item]] : undefined} uid={`${uid}b`} />
}
/** Accessory parts in front of the pet (straps, chest shield, magnifier). */
export function AccessoryFront({ item, anchors, uid }: LayerProps) {
  return <Wear markup={item ? accFront[item] : undefined} anchor={item ? anchors?.[accFrame[item]] : undefined} uid={`${uid}a`} />
}
