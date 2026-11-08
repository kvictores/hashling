// Client-side password helpers. Nothing here sends a password anywhere.

/** Unbiased random integer in [0, max) using crypto.getRandomValues + rejection sampling. */
export function randInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % max
  }
}

const SETS = {
  lower: 'abcdefghijkmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digits: '23456789',
  symbols: '!@#$%^&*-_=+?',
}
export type CharOpts = { length: number; lower: boolean; upper: boolean; digits: boolean; symbols: boolean }

export function generatePassword(o: CharOpts): string {
  const pools = (['lower', 'upper', 'digits', 'symbols'] as const).filter(k => o[k]).map(k => SETS[k])
  if (!pools.length) pools.push(SETS.lower)
  const all = pools.join('')
  const chars = pools.map(p => p[randInt(p.length)]) // at least one from each chosen set
  while (chars.length < o.length) chars.push(all[randInt(all.length)])
  for (let i = chars.length - 1; i > 0; i--) { const j = randInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]] }
  return chars.join('')
}

export function passwordEntropy(o: CharOpts): number {
  const size = (['lower', 'upper', 'digits', 'symbols'] as const).filter(k => o[k]).reduce((s, k) => s + SETS[k].length, 0) || SETS.lower.length
  return o.length * Math.log2(size)
}

// ~440 short, friendly words (solarpunk-flavored), about 8.8 bits of entropy per word. Entropy math uses WORDS.length.
export const WORDS = (
  'acorn alder algae amber anchor apple apricot arbor arch aspen atlas atom aurora autumn avocado badge bamboo banjo barley ' +
  'basil basket bay beacon bean bear beetle bell berry birch bison blossom bluff boat bobcat bolt bonsai boulder bramble branch ' +
  'breeze brick bridge brook bubble bucket bud buffalo bulb bumble bunny butter cabin cactus calm camel canal candle canoe canopy ' +
  'canyon capsule caramel cardinal cargo carrot cascade castle cedar cello chalk charm cherry chess chestnut chime cider cinder ' +
  'circuit citrus clay cliff clover cloud coast cobalt cocoa coconut comet compass copper coral cosmos cotton cove coyote crane ' +
  'crater creek cricket crimson crystal cube cumin current cypress daisy dandelion dawn delta desert dew dingo dolphin dove ' +
  'dragon drift drum dune dusk eagle echo eclipse eddy elder elm ember emerald engine estuary falcon fennel fern ferry fiddle ' +
  'field fig finch fjord flame flint flora flute forest fossil fox frost fungus galaxy garden garnet gazelle gecko geyser ginger ' +
  'glacier glade glow gnome goose gopher granite grape grove gull harbor harvest hawk hazel heath hedge heron hickory hill hive ' +
  'holly honey horizon hummingbird husky iceberg iris island ivy jade jaguar jasmine jelly jetty juniper kale kayak kelp kestrel ' +
  'kettle kiwi koala lagoon lantern larch lark lava lemon lentil lichen lilac lily lime linden lion lizard llama lobster locket ' +
  'lotus lunar lynx magnet magpie mango maple marble marsh meadow melon meteor mint mist moss moth mountain mulberry mustard ' +
  'nebula nectar nest nettle nickel nimbus noodle nutmeg oak oasis ocean octopus olive onyx orbit orchard orchid osprey otter ' +
  'owl oyster paddle palm panda pansy papaya parsley pebble pecan pelican pepper petal pine pixel plum pollen pond poppy prairie ' +
  'prism puffin pumpkin quail quartz quill quinoa rabbit radar radish rain raven reed reef ridge river robin rocket rose rowan ' +
  'ruby rye saffron sage salmon sapling satin seal sequoia shadow shell shore shrub sierra silk silver sky slate sloth snail ' +
  'solar sorrel spark sparrow spice spider spinach spire sprout spruce squash squirrel star stone stork stream sugar summit sun ' +
  'swallow swan sycamore tangle tapir teal tern thistle thorn thunder thyme tide tiger timber toad topaz torch toucan trail ' +
  'tulip tundra turtle twig umber valley vanilla velvet violet volcano vortex walnut walrus wander wasp water wave willow wind ' +
  'wisteria wolf wombat wren yarrow yew yucca zebra zenith zephyr zinnia zucchini atrium beryl bloom cairn cocoon dynamo fable ' +
  'gadget harp igloo jigsaw kite lattice mosaic nugget opal parcel quiver relay signal tablet ukulele vessel widget yonder zither ' +
  'acre bluebell cobble drizzle fizz gale hamlet inkwell jumble knoll loom mallow nook orbital pinecone quarry ripple sundial ' +
  'trellis upland verdant wildflower almond badger cumulus dahlia egret flicker grotto hollow inlet juniperberry kindle lupine'
).split(' ').filter((w, i, a) => w && a.indexOf(w) === i)

export type PhraseOpts = { words: number; sep: string; capitalize: boolean; number: boolean }

export function generatePassphrase(o: PhraseOpts): string {
  const ws = Array.from({ length: o.words }, () => WORDS[randInt(WORDS.length)])
  const out = ws.map(w => (o.capitalize ? w[0].toUpperCase() + w.slice(1) : w))
  if (o.number) out.splice(randInt(out.length + 1), 0, String(randInt(90) + 10))
  return out.join(o.sep)
}

export function passphraseEntropy(o: PhraseOpts): number {
  return o.words * Math.log2(WORDS.length) + (o.number ? Math.log2(90) + Math.log2(o.words + 1) : 0)
}

const COMMON = ['password', '123456', '12345678', 'qwerty', 'abc123', 'letmein', 'iloveyou', 'admin', 'welcome', 'monkey',
  'dragon', 'football', 'baseball', 'sunshine', 'princess', 'shadow', 'master', 'superman', 'trustno1', 'passw0rd', 'hello',
  'freedom', 'whatever', 'login', 'starwars', '111111', '000000', '654321', 'qwertyuiop', 'asdfgh', 'zxcvbn']

export interface Strength { bits: number; score: 0 | 1 | 2 | 3 | 4; label: string; tips: string[]; crack: string }

/** Rough, honest strength estimate for a typed password (pattern-aware, not a guarantee). */
export function estimateStrength(pw: string): Strength {
  const tips: string[] = []
  if (!pw) return { bits: 0, score: 0, label: 'Empty', tips: [], crack: '—' }
  let pool = 0
  if (/[a-z]/.test(pw)) pool += 26
  if (/[A-Z]/.test(pw)) pool += 26
  if (/\d/.test(pw)) pool += 10
  if (/[^A-Za-z0-9]/.test(pw)) pool += 33
  let bits = pw.length * Math.log2(pool || 1)
  const low = pw.toLowerCase()
  const leet = low.replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/[1!]/g, 'i').replace(/0/g, 'o').replace(/\$|5/g, 's')
  if (COMMON.some(c => low.includes(c) || leet.includes(c))) { bits = Math.min(bits, 12); tips.push('Contains a very common password or word.') }
  if (/(.)\1{2,}/.test(pw)) { bits -= 10; tips.push('Avoid repeated characters like “aaa”.') }
  if (/(?:abc|bcd|cde|123|234|345|456|567|678|789|qwe|wer|asd|sdf|zxc)/i.test(pw)) { bits -= 10; tips.push('Avoid sequences like “123” or “qwe”.') }
  if (/(19|20)\d{2}/.test(pw)) { bits -= 6; tips.push('Years and dates are easy to guess.') }
  if (/^[A-Z][a-z]+\d{1,4}[!@#$]?$/.test(pw)) { bits = Math.min(bits, 28); tips.push('“Word + numbers + !” is the first pattern attackers try.') }
  if (pw.length < 12) tips.push('Use at least 12 characters; length matters most.')
  bits = Math.max(0, Math.round(bits))
  const score = (bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4) as Strength['score']
  const label = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][score]
  return { bits, score, label, tips, crack: crackTime(bits) }
}

/** Time to guess at 10 billion guesses/second (offline attack on a fast hash), on average half the space. */
export function crackTime(bits: number): string {
  const secs = Math.pow(2, bits - 1) / 1e10
  if (secs < 1) return 'instantly'
  const units: [number, string][] = [[31557600 * 1e9, 'billion years'], [31557600 * 1e6, 'million years'], [31557600 * 1000, 'thousand years'], [31557600, 'years'], [86400, 'days'], [3600, 'hours'], [60, 'minutes'], [1, 'seconds']]
  for (const [s, name] of units) if (secs >= s) return `${Math.round(secs / s).toLocaleString()} ${name}`
  return 'instantly'
}

export async function sha1Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

/**
 * Have I Been Pwned "range" API with k-anonymity: only the first 5 hex chars of the SHA-1 are sent;
 * the ~800 returned suffixes are compared locally. Padding hides how many real results came back.
 */
export async function pwnedCount(password: string): Promise<{ count: number; prefix: string; suffix: string; returned: number }> {
  const h = await sha1Hex(password)
  const prefix = h.slice(0, 5), suffix = h.slice(5)
  const r = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { 'Add-Padding': 'true' } })
  if (!r.ok) throw new Error(`Breach service returned ${r.status}`)
  const lines = (await r.text()).split('\n')
  let count = 0
  for (const line of lines) {
    const [suf, c] = line.trim().split(':')
    if (suf === suffix) { count = parseInt(c, 10) || 0; break }
  }
  return { count, prefix, suffix, returned: lines.length }
}
