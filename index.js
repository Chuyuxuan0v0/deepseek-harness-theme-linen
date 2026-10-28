/**
 * Host half of the Linen theme bundle.
 *
 * The Host owns the schema, so the settings page, the plugin manager, and any
 * later editor all read and write the same namespace through the standard
 * settings document. Every field is `volatile()`: the settings directory
 * exposes a namespace only when at least one field is live, and a token change
 * must apply without remounting the browser plugin that owns the override
 * layer.
 *
 * Vendored build of @deepseek-ai/schemastery 3.18.5 (MIT, license alongside):
 * a linked bundle directory gets no node_modules of its own, so a bare import
 * of the schema library would fail at activation wherever the folder is copied.
 */
import z from './vendor/schemastery.mjs'

/** Knobs the theme settings page edits; every one of them is deployment-safe. */
export const Config = z.object({
  /** Whether the override layer applies at all; false restores every product value. */
  enabled: z.boolean().default(true).volatile(),
  /** `warm` retunes surfaces; `product` keeps the shipped palette. */
  palette: z.union(['warm', 'product']).default('warm').volatile(),
  /**
   * Corner-radius position: 0 keeps the product scale, 100 is the roundest
   * scale of earlier releases, 200 is rounder still. Integer steps rather than
   * a multiplier so the stored value needs no floating-point tolerance.
   */
  radiusScale: z.number().step(5).min(0).max(200).default(50).volatile(),
  /**
   * Legacy corner preset, read only when {@link radiusScale} was never stored.
   * Kept in the schema so a document written before the slider existed still
   * validates instead of being dropped.
   */
  radius: z.union(['product', 'standard', 'large']).default('standard').volatile(),
  /** Default text font-family list; empty keeps the theme's own stack. */
  textFont: z.string().default('').volatile(),
  /** Default code font-family list; empty keeps the theme's own stack. */
  codeFont: z.string().default('').volatile(),
  /** Weight for emphasized body text; 500 is lighter than the shipped 600. */
  strongWeight: z.number().step(100).min(300).max(700).default(500).volatile(),
})

/** The Client half applies the overrides; the Host registers nothing. */
export function apply() {}
