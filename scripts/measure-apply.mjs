#!/usr/bin/env node
/**
 * Measures the token-layer work one settings interaction causes, and smoke-tests
 * the settings page wiring.
 *
 * The browser half is loaded with a stubbed Cordis context and a stubbed theme
 * service, then the interactions are replayed in the order the client produces
 * them. Only `overrideTokens` calls and token counts are measured; the cost of
 * the theme presenter's document writes follows from the token count it
 * receives.
 *
 * The last section renders the settings page and drives its handlers, because a
 * callback bound to something outside its scope throws inside an event handler,
 * where the only visible symptom is a thumb that moves and a page that does not.
 */
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

/** Every token map handed to the theme service, in call order. */
const calls = []

/** Minimal observable source: getSnapshot plus subscribe. */
function source(initial) {
  let snapshot = initial
  const listeners = new Set()
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    emit: (next) => {
      snapshot = next
      for (const listener of listeners) listener()
    },
  }
}

const NAMESPACE = 'theme-linen'
const stored = { enabled: true, palette: 'warm', textFont: '', codeFont: '', strongWeight: 600 }

const directory = source({
  status: 'ready',
  view: {
    writable: true,
    namespaces: [{ ns: NAMESPACE, revision: 1, value: stored, schema: { properties: { strongWeight: {} } } }],
  },
})

const form = source({ status: 'ready', value: stored, writable: true, revision: 1 })
form.set = () => Promise.resolve(true)

const registered = []
const context = {
  effect: (fn) => {
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  theme: {
    overrideTokens: (name, tokens) => {
      calls.push({ source: name, tokens })
      return () => {}
    },
  },
  slots: {
    inject: (_slot, callback) => {
      callback()
      return () => {}
    },
    register: (options, component) => {
      registered.push({ options, component })
      return () => {}
    },
  },
  configForms: {
    describe: () => directory,
    get: () => form,
  },
  locale: {
    register: () => () => {},
    bind: () => key => key,
  },
}

// ------------------------------------------------------------- load client
let definition
globalThis.window = {
  __ModuleLoader__: { load: (loaded) => { definition = loaded } },
}
const react = {
  createElement: (type, props, ...children) => ({
    type,
    props: { ...(props ?? {}), children: children.length === 0 ? undefined : children },
  }),
  useState: () => [null, () => {}],
}
await import(pathToFileURL(join(root, 'client.js')).href)
const plugin = definition.factory(specifier =>
  specifier === 'react' ? react : { Input: () => null, Switch: () => null })
plugin.apply(context)

const face = registered[0].options.inject()
const save = face.save
const preview = face.preview

/** Radius tokens from one rebuild, as the presenter would receive them. */
const radiusOf = (call) => ['xs', 'sm', 'md', 'lg', 'xl', 'panel']
  .map(tier => call.tokens[`--dsw-radius-${tier}`]?.light)
  .join(' ')

const startupCalls = calls.length
const startupTokens = calls.reduce((total, call) => total + Object.keys(call.tokens).length, 0)

// ------------------------------------------- a document written before sliders
// It stores the old `radius` preset and no `radiusScale`. It must keep
// rendering the previous scale exactly.
form.emit({
  status: 'ready',
  writable: true,
  revision: 2,
  value: { ...stored, radius: 'large' },
})
const legacyRadius = radiusOf(calls[calls.length - 1])
if (legacyRadius !== '8px 14px 18px 24px 28px 36px') {
  failures.push(`legacy "large" resolved to ${legacyRadius}, expected 8px 14px 18px 24px 28px 36px`)
}

// ------------------------------------------------------- replay two clicks
const beforeClick = calls.length
const first = save('radiusScale', 50)
const afterFirst = calls.length
await first
form.emit({ status: 'ready', writable: true, revision: 3, value: { ...stored, radiusScale: 50 } })
const afterFirstEcho = calls.length

const second = save('radiusScale', 200)
const afterSecond = calls.length
await second
form.emit({ status: 'ready', writable: true, revision: 4, value: { ...stored, radiusScale: 200 } })
const afterSecondEcho = calls.length

const wasted = (afterFirstEcho - afterFirst) + (afterSecondEcho - afterSecond)
const applied = (afterFirst - beforeClick) + (afterSecond - afterFirstEcho)
if (wasted !== 0) failures.push(`${wasted} rebuild(s) carried no change`)
if (applied !== 2) failures.push(`expected 2 applying rebuilds, measured ${applied}`)

// ------------------------------------------------------------- dragging
// A drag reports many positions. Previews are coalesced and only the release
// writes, so a gesture costs a bounded number of rebuilds.
const beforeDrag = calls.length
for (let position = 100; position <= 195; position += 5) preview('radiusScale', position)
const immediate = calls.length - beforeDrag
await new Promise(resolve => setTimeout(resolve, 200))
const coalesced = calls.length - beforeDrag
const beforeRelease = calls.length
await save('radiusScale', 195)
const onRelease = calls.length - beforeRelease

if (coalesced === 0) failures.push('a drag repainted nothing')
if (coalesced > 3) failures.push(`a 20-position drag caused ${coalesced} rebuilds`)

// ------------------------------------------------- rendered page wiring
/** Depth-first walk of the stub element tree, expanding component functions. */
function walk(node, visit) {
  if (node === null || node === undefined || node === false) return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (typeof node !== 'object') return
  if (typeof node.type === 'function') {
    walk(node.type(node.props), visit)
    return
  }
  visit(node)
  if (node.props?.children !== undefined) walk(node.props.children, visit)
}

let sliders = []
try {
  walk(registered[0].component({
    ...face,
    useConfig: (selector) => selector(form.getSnapshot()),
    t: key => key,
  }), (node) => {
    if (node.type === 'input' && node.props?.type === 'range') sliders.push(node)
  })
} catch (error) {
  failures.push(`rendering the settings page threw: ${error.message}`)
}
if (sliders.length !== 2) failures.push(`expected 2 sliders, rendered ${sliders.length}`)

const radiusSlider = sliders.find(node => node.props.max === 200)
if (radiusSlider === undefined) {
  failures.push('the radius slider does not span 0..200')
} else {
  const beforeDrive = calls.length
  try {
    radiusSlider.props.onChange({ currentTarget: { value: '200' } })
  } catch (error) {
    failures.push(`dragging the radius slider threw: ${error.message}`)
  }
  if (calls.length === beforeDrive) failures.push('dragging the radius slider repainted nothing')
  const atMaximum = radiusOf(calls[calls.length - 1])
  if (atMaximum !== '12px 20px 26px 34px 40px 52px') {
    failures.push(`radius at 200 is ${atMaximum}, expected 12px 20px 26px 34px 40px 52px`)
  }
  try {
    radiusSlider.props.onPointerUp({ currentTarget: { value: '200' } })
  } catch (error) {
    failures.push(`releasing the radius slider threw: ${error.message}`)
  }
}

// ------------------------------------------------------------------ report
const perRebuild = Object.keys(calls[calls.length - 1]?.tokens ?? {}).length
console.log('tokens per full rebuild:', perRebuild)
console.log('inline style writes the presenter makes per rebuild:', 2 * perRebuild)
console.log('')
console.log('apply() sequence:')
console.log(`  startup                                     ${String(startupCalls).padStart(3)} call(s) (${startupTokens} tokens)`)
console.log(`  legacy "large" resolves to                  ${legacyRadius}`)
console.log(`  click: slider -> 50                         ${String(afterFirst - beforeClick).padStart(3)} call(s)`)
console.log(`  click: slider -> 200                        ${String(afterSecond - afterFirstEcho).padStart(3)} call(s)`)
console.log(`  write echoes carrying no change             ${String(wasted).padStart(3)} call(s)`)
console.log('')
console.log('drag of 20 positions (100..195 in steps of 5):')
console.log(`  rebuilds applied immediately                ${String(immediate).padStart(3)}`)
console.log(`  rebuilds once coalescing settles            ${String(coalesced).padStart(3)}`)
console.log(`  extra rebuilds on release                   ${String(onRelease).padStart(3)}`)
console.log('')
if (failures.length > 0) {
  for (const failure of failures) console.error('FAIL', failure)
  process.exit(1)
}
console.log('all measurements within expectation')
