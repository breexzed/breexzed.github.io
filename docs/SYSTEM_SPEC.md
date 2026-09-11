# BREEXZED Digital Estate: System Spec

## 1. Purpose

This repository is the active V2 static system for BREEXZED: a relation-aware public corpus organized by meaning rather than chronology.

The current live baseline is:
- strict build validation
- single-source topology JSON
- linked explorer navigation
- published-only discovery
- scratch-seeded corpus using `concept`, `articulation`, `signal`, and `trail`

## 2. Runtime Surfaces

Canonical surfaces:
- `/`
- `/corpus`
- `/signals`
- `/projects`
- `/node/:id`

Compatibility aliases:
- `/writing` -> `/signals`
- `/concepts` and `/logic` -> `/corpus`
- `/stack` -> `/projects`

## 3. Architecture

- Frontend runtime:
  - `index.html`
  - `css/owlcyon.css`
  - `src/lib/*`
  - `src/components/*`
  - `src/utils/*`
- Build pipeline:
  - `scripts/build-topology.js`
  - `scripts/copy-assets.js`
  - `scripts/build-search.js`
- Authoring kit:
  - `templates/concept.md`
  - `templates/articulation.md`
  - `templates/signal.md`
  - `templates/trail.md`
  - `templates/projects.md`
  - `templates/folder.md`
- Persistence:
  - `src/lib/persistence.ts`
- Graph:
  - `src/lib/graph-adapter.ts`
  - `src/lib/graph-store.ts`
  - `src/lib/graph-engine.ts`
  - `src/lib/graph-bootstrap.ts`

## 4. Data Contract (`topology.json`)

Top-level fields:
- `nodeCount`
- `nodes`
- `treeOrder`
- `metadata.version`
- `metadata.builder`
- `metadata.source`
- `metadata.profile`

Per-node core fields:
- `id`
- `label`
- `title`
- `formula`
- `desc`
- `content`
- `markdown`
- `parent`
- `children`
- `connects`
- `depth`
- `glyph`
- `visual`
- `tags`
- `date`
- `source`
- `sourcePath`
- `type`
- `folder`
- `featured`
- `thumbnail`
- `externalUrl`
- `publishDate`
- `status`
- `domain`

Folder nodes use their normal category `type` (`concept`, `projects`, or `articulation`) plus `folder: true`. Their `children` define the contained notes; those children are omitted from global corpus discovery and rendered as full preview cards on the folder page. `connects` remains available for cross-folder graph relationships.

Markdown body links are rendered in two ways:

- relative or root-relative `.md` links resolve to internal node preview cards;
- absolute `http://` and `https://` links resolve to external live-link cards showing authored label and URL host/path.

External page contents are not fetched or embedded. This avoids cross-origin and iframe restrictions and leaves external content ownership, privacy, and navigation with the source site.

Signal fields:
- `first_noticed`
- `current_status`

Trail fields:
- `source`
- `date_of_discovery`

`source` is authored provenance.

`sourcePath` is compiler-generated file metadata used for runtime link resolution and asset rewriting.

## 5. Active Ontology

Active seeded corpus types:
- `root`
- `concept`
- `articulation`
- `signal`
- `trail`

Supported compatibility types:
- `projects`
- `note`
- `essay`
- `page`

Compatibility normalization:
- authored `project` normalizes to `projects`

## 6. Strict Behavior Guarantees

1. Duplicate IDs fail the topology build.
2. Broken markdown node links fail the topology build.
3. Invalid `parent`, `children`, or `connects` targets fail the topology build.
4. Invalid signal `current_status` fails the topology build.
5. Active node must exist before detail render.
6. Breadcrumb is ancestry-derived.
7. Search indexes published nodes only.
8. `/node/:id` remains the canonical deep link and dedicated reading page.
9. Node relationships are derived from the same canonical topology used by explorer/search.
10. Linked node navigation must remain functional without a graph renderer.

## 7. Retrieval Surface Contract

- `/node/:id` renders the dedicated node page
- Related nodes and markdown references route to `/node/:id`
- The topology data remains the source of parent, child, and cross-link relationships
- `/llms.txt` provides an orientation guide for AI agents
- `/ai/manifest.json`, `/ai/summaries.json`, `/ai/nodes.json`, and `/ai/relationships.json` provide structured retrieval layers

## 8. Search Contract

- Keyboard-first overlay remains active on `/`
- Published nodes only
- Search result cues may include:
  - type
  - signal status
  - domain
  - trail source
- Selection routes to canonical node route

## 9. Build Commands

- `npm run build:topology`
- `npm run copy:assets`
- `npm run build:search`
- `npm run build:content`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run smoke`

## 10. Acceptance Checks

Build:
- `npm run build:content` succeeds
- `npx tsc --noEmit` succeeds
- `npm run build` succeeds

Runtime:
- `/map` returns the not-found surface
- `/node/:id` opens the dedicated node page
- search routes to canonical node path
- corpus filtering updates the visible corpus grid

Retrieval:
- `/llms.txt` identifies the AI retrieval entry points
- `/ai/manifest.json` describes the generated bundle
- `/ai/nodes.json` and `/ai/relationships.json` support node-level traversal
- cached coordinates prevent unnecessary repeat layout work
- explorer is still usable if graph is unavailable
