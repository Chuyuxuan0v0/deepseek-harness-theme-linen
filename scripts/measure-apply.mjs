#!/usr/bin/env node
/**
 * Counts the token-layer work one settings click causes.
 *
 * The browser half is loaded with a stubbed Cordis context and a stubbed theme
 * service, then two events are replayed in the order the client produces them
 * for a single write:
 *
 *   1. the write answer folds into the shared mirror (`acceptView`), which
 *      makes the form derive and the plugin adopt;
 *   2. the Host's `settings/document-updated` triggers a describe re-read,
 *      which makes the form derive again — with a value that is unchanged.
 *
 * Only `overrideTokens` calls and token counts are measured; the cost of the
 * theme presenter's document writes follows from the token count it receives.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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
const section = {
  enabled: true,
  palette: 'warm',
  radius: 'standard',
  textFont: '',
  codeFont: '',
  strongWeight: 500,
}

const directory = source({
  status: 'ready',
  view: {
    writable: true,
    namespaces: [{ ns: NAMESPACE, revision: 1, value: section, schema: { properties: { strongWeight: {} } } }],
  },
})

const formState = { status: 'ready', value: section, writable: true, revision: 1 }
const form = source(formState)
form.set = () => Promise.resolve(true)

const registered = []
const context = {
  effect: (fn) => {
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  theme: {
    overrideTokens: (sourceName, tokens) => {
      calls.push({ source: sourceName, tokens })
      return () => {}
    },
  },
  slots: {
    inject: (_slot, callback) => {
      callback()
      return () => {}
    },
    register: (options) => {
      registered.push(options)
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
const file = join(root, 'client.js')
let definition
globalThis.window = {
  __ModuleLoader__: {
    load: (loaded) => { definition = loaded },
  },
}
const react = {
  createElement: () => null,
  useState: () => [null, () => {}],
}
await import(pathToFileURL(file).href)
const plugin = definition.factory(specifier => {
  if (specifier === 'react') return react
  return { Input: () => null, Switch: () => null }
})
plugin.apply(context)

const initialCalls = calls.length
const initialTokens = calls.reduce((total, call) => total + Object.keys(call.tokens).length, 0)

/** Radius tokens from the last rebuild, as the presenter would receive them. */
const radiusOf = (call) => ['xs', 'sm', 'md', 'lg', 'xl', 'panel']
  .map(tier => call.tokens[`--dsw-radius-${tier}`]?.light)
  .join(' ')

// ------------------------------------------------------ legacy document
// A document written before the sliders existed stores `radius: 'large'` and
// no `radiusScale`. It must keep rendering the previous scale exactly.
const legacy = { enabled: true, palette: 'warm', radius: 'large', textFont: '', codeFont: '', strongWeight: 600 }
form.emit({ status: 'ready', value: legacy, writable: true, revision: 2 })
const legacyCall = calls[calls.length - 1]
const legacyRadius = radiusOf(legacyCall)
console.log('legacy radius "large" (no radiusScale stored) ->', legacyRadius)
console.log('  matches the previous large preset (8 14 18 24 28 36):',
  legacyRadius === '8px 14px 18px 24px 28px 36px')

// ------------------------------------------------------- replay one click
const before = calls.length
const face = registered[0].inject()
const save = face.save

// 1. The click applies the chosen value before the Host is asked.
const pending = save('radiusScale', 50)
const afterClick = calls.length

// 2. The write answer folds in, then the Host's document-updated read answers
//    with the same value: both are no-ops now.
const changed = { ...legacy, radiusScale: 50 }
await pending
form.emit({ status: 'ready', value: changed, writable: true, revision: 3 })
const afterEcho = calls.length
const halfRadius = radiusOf(calls[calls.length - 1])
console.log('slider at 50% ->', halfRadius)

// 3. A second click that genuinely changes the value again.
const twice = save('radiusScale', 100)
const afterSecond = calls.length
await twice
form.emit({ status: 'ready', value: legacy, writable: true, revision: 4 })
const afterSecondEcho = calls.length

const line = (label, count, tokens) => {
  const detail = tokens === undefined ? '' : ` (${tokens} tokens)`
  console.log(`  ${label.padEnd(46)} ${String(count).padStart(3)} call(s)${detail}`)
}

const perRebuild = Object.keys(calls[calls.length - 1]?.tokens ?? {}).length
console.log('')
console.log('tokens per full rebuild:', perRebuild)
console.log('inline style writes the presenter makes per rebuild:', 2 * perRebuild)
console.log('')
console.log('apply() sequence:')
line('startup (paint defaults, then the saved value)', initialCalls, initialTokens)
line('click: slider 0% -> 50%', afterClick - before)
line('write echo + document-updated (unchanged)', afterEcho - afterClick)
line('click: slider 50% -> 100%', afterSecond - afterEcho)
line('write echo + document-updated (unchanged)', afterSecondEcho - afterSecond)

const wasteful = (afterEcho - afterClick) + (afterSecondEcho - afterSecond)
const useful = (afterClick - before) + (afterSecond - afterEcho)
console.log('')
console.log('rebuilds that carried a change:    ', useful)
console.log('rebuilds that carried no change:   ', wasteful)
console.log('rebuilds per click (wasted + real):', (useful + wasteful) / 2)

// --------------------------------------------------- dragging a slider
// A drag reports many positions. Previews are coalesced, and only the release
// writes to the Host, so a gesture costs a bounded number of rebuilds.
const beforeDrag = calls.length
for (let position = 0; position <= 95; position += 5) face.preview('radiusScale', position)
const immediate = calls.length - beforeDrag
await new Promise(resolve => setTimeout(resolve, 150))
const afterCoalesce = calls.length - beforeDrag
const beforeRelease = calls.length
await save('radiusScale', 95)
const onRelease = calls.length - beforeRelease

console.log('')
console.log(`drag of 20 positions (0..95 in steps of 5):`)
console.log('  rebuilds applied immediately          ', immediate)
console.log('  rebuilds after coalescing settles     ', afterCoalesce)
console.log('  extra rebuilds when the drag is released', onRelease)
