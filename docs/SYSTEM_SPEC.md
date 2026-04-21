# BREEXZED Digital Estate: System Spec

## 1. Purpose

This repository is the active V2 static system for BREEXZED: a graph-first public corpus organized by relation rather than chronology.

The current live baseline is:
- strict build validation
- single-source topology JSON
- graph + explorer dual navigation
- published-only discovery
- scratch-seeded corpus using `concept`, `articulation`, `signal`, and `trail`

## 2. Runtime Surfaces

Canonical surfaces:
- `/`
- `/map`
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
- Persistence:
  - `src/lib/persistence.ts`
- Graph:
  - `src/lib/graph-adapter.ts`
  - `src/lib/graph-store.ts`
  - `src/lib/graph-engine.ts`
  - `src/lib/graph-bootstrap.ts`

## 4. Data Contract (`topology.json`)

Top-level fields:
- `generated`
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
- `type`
- `featured`
- `thumbnail`
- `externalUrl`
- `publishDate`
- `status`
- `domain`

Signal fields:
- `first_noticed`
- `current_status`

Trail fields:
- `source`
- `date_of_discovery`

## 5. Active Ontology

Active seeded corpus types:
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
8. `/node/:id` remains the canonical deep link.
9. Graph state is derived from the same canonical node registry as explorer/search.
10. Graph failure must not block list/detail exploration.

## 7. Graph Surface Contract

- `/map` defaults to Graph view
- `/node/:id` falls back to Map Explorer view
- Graph click routes to `/node/:id`
- Graph highlight syncs with active explorer node
- Layout may be stabilized from cache rather than reheated every load
- If graph render fails, explorer remains functional

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

## 10. Acceptance Checks

Build:
- `npm run build:content` succeeds
- `npx tsc --noEmit` succeeds
- `npm run build` succeeds

Runtime:
- `/map` opens graph by default
- `/node/:id` opens explorer-focused detail view
- search routes to canonical node path
- corpus filtering updates the visible corpus grid

Graph:
- graph/explorer selection remains synchronized
- cached coordinates prevent unnecessary repeat layout work
- explorer is still usable if graph is unavailable
