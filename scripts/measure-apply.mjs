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
  useState: () => [undefined, () => {}],
}
await import(pathToFileURL(file).href)
const plugin = definition.factory(specifier => {
  if (specifier === 'react') return react
  return { Input: () => null, Switch: () => null }
})
plugin.apply(context)

const initialCalls = calls.length
const initialTokens = calls.reduce((total, call) => total + Object.keys(call.tokens).length, 0)

// ------------------------------------------------------- replay one click
const before = calls.length
const save = registered[0].inject().save

// 1. The click applies the chosen value before the Host is asked.
const pending = save('radius', 'large')
const afterClick = calls.length

// 2. The write answer folds in, then the Host's document-updated read answers
//    with the same value: both are no-ops now.
const changed = { ...section, radius: 'large' }
await pending
form.emit({ status: 'ready', value: changed, writable: true, revision: 3 })
const afterEcho = calls.length

// 3. A second click that genuinely changes the value again.
const twice = save('radius', 'standard')
const afterSecond = calls.length
await twice
form.emit({ status: 'ready', value: section, writable: true, revision: 4 })
const afterSecondEcho = calls.length

const line = (label, count, tokens) => {
  const detail = tokens === undefined ? '' : ` (${tokens} tokens)`
  console.log(`  ${label.padEnd(46)} ${String(count).padStart(3)} call(s)${detail}`)
}

const perRebuild = Object.keys(calls[calls.length - 1]?.tokens ?? {}).length
console.log('tokens per full rebuild:', perRebuild)
console.log('inline style writes the presenter makes per rebuild:', 2 * perRebuild)
console.log('')
console.log('apply() sequence:')
line('startup (paint defaults, then the saved value)', initialCalls, initialTokens)
line('click: radius standard -> large', afterClick - before)
line('write echo + document-updated (unchanged)', afterEcho - afterClick)
line('click: radius large -> standard', afterSecond - afterEcho)
line('write echo + document-updated (unchanged)', afterSecondEcho - afterSecond)

const wasteful = (afterEcho - afterClick) + (afterSecondEcho - afterSecond)
const useful = (afterClick - before) + (afterSecond - afterEcho)
console.log('')
console.log('rebuilds that carried a change:    ', useful)
console.log('rebuilds that carried no change:   ', wasteful)
console.log('rebuilds per click (wasted + real):', (useful + wasteful) / 2)
