#!/usr/bin/env node
/**
 * Package invariants for the Linen theme bundle.
 *
 * Every check here guards something that would break the shipped artifact
 * silently rather than loudly:
 * - the browser module id must equal the package name, or the module table
 *   registers a row nobody can request;
 * - the settings namespace must equal the patch row id, or the settings page
 *   cannot find the configuration the Host persists under that id;
 * - the vendored schema library must still resolve from the packed files, or
 *   activation fails on a clean machine even though it works in this checkout;
 * - every locale file must carry a title and description, or the plugin
 *   manager falls back to template text.
 *
 * Usage:
 *   node scripts/verify.mjs                  content checks only
 *   node scripts/verify.mjs pack.json        also assert the packed file list,
 *                                            where pack.json is the stdout of
 *                                            `npm pack --dry-run --json`
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const checks = []

/**
 * Record one check outcome.
 * @param {boolean} ok - whether the invariant holds.
 * @param {string} label - what was checked.
 * @param {string} detail - evidence shown for either outcome.
 */
function check(ok, label, detail) {
  checks.push({ ok, label, detail })
  if (!ok) failures.push(`${label}: ${detail}`)
}

const read = path => readFileSync(join(root, path), 'utf8')

// ---------------------------------------------------------------- manifest
let pkg
try {
  pkg = JSON.parse(read('package.json'))
  check(true, 'package.json parses', pkg.name)
} catch (error) {
  check(false, 'package.json parses', error.message)
  report()
}

check(typeof pkg.name === 'string' && pkg.name.length > 0, 'package name is set', String(pkg.name))
check(/^\d+\.\d+\.\d+/.test(pkg.version ?? ''), 'version is semver', String(pkg.version))
check(pkg.type === 'module', 'package is ESM', String(pkg.type))
check(pkg.dsh?.bundle?.patch === './cordis.patch.yml', 'declares a bundle patch', String(pkg.dsh?.bundle?.patch))
check(pkg.dsh?.client?.platform === 'web', 'declares the web client platform', String(pkg.dsh?.client?.platform))
check(pkg.exports?.['./client'] !== undefined, 'exports ./client', String(pkg.exports?.['./client']))
check(pkg.exports?.['./icon'] !== undefined, 'exports ./icon', String(pkg.exports?.['./icon']))

for (const target of Object.values(pkg.exports ?? {})) {
  if (typeof target !== 'string') continue
  if (target.includes('*')) continue
  check(existsSync(join(root, target)), `export target exists: ${target}`, target)
}

// ------------------------------------------------------------- module id
const client = read('client.js')
const moduleId = client.match(/__ModuleLoader__\.load\(\{\s*id:\s*'([^']+)'/)?.[1]
check(moduleId === pkg.name, 'browser module id equals the package name', `${String(moduleId)} vs ${pkg.name}`)

// ------------------------------------------------- settings namespace vs row
const patch = read('cordis.patch.yml')
const rowId = patch.match(/^\s*-\s*id:\s*(\S+)\s*$/m)?.[1]
const namespace = client.match(/const NAMESPACE = '([^']+)'/)?.[1]
check(rowId !== undefined, 'bundle patch inserts a row', String(rowId))
check(namespace === rowId, 'settings namespace equals the patch row id', `${String(namespace)} vs ${String(rowId)}`)
check(new RegExp(`name:\\s*'?${pkg.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'?`).test(patch),
  'bundle patch names this package', pkg.name)

// ------------------------------------------------------------ syntax
for (const file of ['index.js', 'client.js']) {
  try {
    execFileSync(process.execPath, ['--check', join(root, file)], { stdio: 'pipe' })
    check(true, `syntax: ${file}`, 'node --check')
  } catch (error) {
    check(false, `syntax: ${file}`, String(error.stderr ?? error.message).trim().split('\n')[0])
  }
}

// ---------------------------------------------------------------- locales
const locales = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'ru', 'pt']
for (const locale of locales) {
  const file = `locale/${locale}.json`
  if (!existsSync(join(root, file))) {
    check(false, `locale ${locale} exists`, file)
    continue
  }
  try {
    const dict = JSON.parse(read(file))
    const title = dict?.meta?.title
    const description = dict?.meta?.description
    check(typeof title === 'string' && title.length > 0, `locale ${locale} has a title`, String(title))
    check(typeof description === 'string' && description.length > 0, `locale ${locale} has a description`, String(description))
  } catch (error) {
    check(false, `locale ${locale} parses`, error.message)
  }
}

// ------------------------------------------------------------------- icon
const iconPath = join(root, 'icon.svg')
if (!existsSync(iconPath)) {
  check(false, 'icon exists', 'icon.svg')
} else {
  const size = statSync(iconPath).size
  check(size <= 256 * 1024, 'icon is within the 256 KiB limit', `${size} bytes`)
  const svg = read('icon.svg')
  check(svg.includes('<svg') && svg.includes('viewBox'), 'icon is an SVG with a viewBox', 'ok')
}

// ---------------------------------------------------------------- vendor
for (const file of ['vendor/schemastery.mjs', 'vendor/cosmokit.js', 'vendor/schemastery-LICENSE', 'vendor/cosmokit-LICENSE']) {
  check(existsSync(join(root, file)), `vendored file present: ${file}`, file)
}

// ------------------------------------------------------- host half loads
try {
  const host = await import(pathToFileURL(join(root, 'index.js')).href)
  check(typeof host.Config?.dict === 'object', 'host half exports a Config schema', 'Config.dict')
  const keys = Object.keys(host.Config?.dict ?? {})
  check(keys.length > 0, 'Config declares fields', keys.join(','))
  const resolved = host.Config({})
  check(resolved !== undefined, 'Config resolves its defaults', keys.join(','))
  for (const key of keys) {
    check(host.Config.dict[key]?.meta?.volatile === true, `Config field is volatile: ${key}`,
      'the settings directory hides namespaces without a live field')
  }
  const clientInjects = client.match(/inject:\s*\[([^\]]+)\]/)?.[1] ?? ''
  check(['theme', 'slots', 'configForms', 'locale'].every(name => clientInjects.includes(`'${name}'`)),
    'browser half declares the services it uses', clientInjects.trim())
} catch (error) {
  check(false, 'host half loads from the package directory', error.message)
}

// ------------------------------------------------------- packed file list
const packFile = process.argv[2]
if (packFile !== undefined) {
  try {
    const report = JSON.parse(readFileSync(packFile, 'utf8'))
    const entry = Array.isArray(report) ? report[0] : report
    const packed = new Set((entry?.files ?? []).map(file => file.path))
    check(packed.size > 0, 'npm pack lists files', `${packed.size} entries`)
    const required = [
      'package.json', 'index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'README.md', 'LICENSE',
      'vendor/schemastery.mjs', 'vendor/cosmokit.js', 'vendor/schemastery-LICENSE', 'vendor/cosmokit-LICENSE',
      ...locales.map(locale => `locale/${locale}.json`),
    ]
    for (const file of required) {
      check(packed.has(file), `packed: ${file}`, file)
    }
    for (const file of packed) {
      check(existsSync(join(root, file)), `packed file exists on disk: ${file}`, file)
    }
  } catch (error) {
    check(false, 'packed file list is readable', error.message)
  }
}

report()

/** Print every check, then exit non-zero when one failed. */
function report() {
  for (const { ok, label, detail } of checks) {
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail === undefined ? '' : ` — ${detail}`}`)
  }
  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed`)
    process.exit(1)
  }
  console.log(`\n${checks.length} checks passed`)
  process.exit(0)
}
