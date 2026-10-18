---
"@genmotion/desktop": minor
"@genmotion/shared": minor
---

Brands: a brand kit the agent reads

A new Brands section holds everything a video needs to look like a company: the
real logo files, the exact hex values, the typefaces, reference work that is
on-brand, written notes, and optionally skills of its own. Each brand is an
ordinary folder under `~/.genmotion/brands`, so a logo can be dropped in from
Finder.

Pick a brand from the composer and the project gets it before the first
message: the palette and type are written into `components/brand.ts`, the real
logo files are copied into `assets/brand/`, and the brand folder becomes
readable to the agent alongside the prompt block naming all of it. New brand asks for the
company's website first: the API reads it with Firecrawl and comes back with
the name, what they do, the palette, the typefaces and the real logo, and
nothing is written until you confirm what it found.

Two new agent tools, `brand_overview` and `use_brand_asset`, and a
`brand-assets` capability the owner skills now require.

Colours are picked in the app rather than through the macOS colour panel,
which dismissed itself whenever anything else took focus.

The New brand dialog is two columns: the form on the left, and on the right the
palette running as banded simplex noise, drawn live from whatever is ticked. It
idles in GenMotion's own colours until a site has been read.
