# BREEXZED Digital Estate

Graph-first static corpus for BREEXZED, built with Markdown, TypeScript, Vite, Graphology, and Sigma.

The current seeded corpus starts from scratch with the active ontology:
- `concept`
- `articulation`
- `signal`
- `trail`

`projects` is still supported by the compiler and runtime for future publishing and backward compatibility, but it is not used by the current seeded corpus.

Legacy node tokens remain supported in code for compatibility:
- `project` is normalized to `projects`
- `note`
- `essay`
- `page`

Those legacy types are not part of the current live corpus baseline.

Canonical behavior details live in [docs/SYSTEM_SPEC.md](/C:/Users/Owl/Owlcyon/the_topology_of_being/docs/SYSTEM_SPEC.md).

## Current Status

- Single-page home with dedicated route views for `Home`, `Map`, `Corpus`, `Signal`, and `Projects`
- Graph canvas is live and synchronized with explorer state
- `/map` defaults to Graph view
- `/node/:id` falls back to Map Explorer detail view
- Search is published-only and type-aware
- Seed corpus now builds entirely from `concept`, `articulation`, `signal`, and `trail`

## Stack

- TypeScript + Vite runtime
- Markdown content under `nodes/`
- Topology compiler in `scripts/build-topology.js`
- Search compiler in `scripts/build-search.js`
- Asset rewriting in `scripts/copy-assets.js`
- Graph state/rendering via Graphology + Sigma + ForceAtlas2

## Commands

```bash
npm install
npm run dev
npm run build:topology
npm run build:content
npx tsc --noEmit
npm run build
npm run preview
```

## Active Routes

- `/`
- `/map`
- `/corpus`
- `/signals`
- `/projects`
- `/node/:id`

Legacy route aliases are still normalized for compatibility:
- `/writing` -> `/signals`
- `/concepts` and `/logic` -> `/corpus`
- `/stack` -> `/projects`

Hash links are also normalized at runtime for compatibility.

## Map Behavior

- `/map` opens the graph by default
- Map surface can toggle between `Graph` and `Map Explorer`
- Clicking a graph node routes to `/node/:id`
- `/node/:id` opens the explorer/detail surface so content remains canonical
- Graph layout is cached in localStorage to avoid re-running layout work on every load

## Build Pipeline

1. `npm run build:topology`
   - Parses Markdown in `nodes/`
   - Validates required fields, IDs, parents, children, and `connects`
   - Normalizes `project` -> `projects`
   - Validates signal `current_status`
   - Writes `data/topology.json` and `public/data/topology.json`

2. `npm run copy:assets`
   - Rewrites asset paths in topology outputs
   - Copies eligible visuals into `public/assets/visuals`

3. `npm run build:search`
   - Builds `public/data/search-index.json`
   - Includes published nodes only

4. `npm run build`
   - Runs the content pipeline
   - Builds the Vite app into `dist/`

## Content Model

### Required frontmatter

```yaml
id: sample_node
title: Sample Node
formula: relation -> meaning
depth: 1
```

### Common optional fields

```yaml
label: concept
parent: root
children:
  - child_node
connects:
  - related_node
type: concept
status: published
domain: ontology
tags:
  - philosophy
```

### Type-specific fields

`signal`

```yaml
type: signal
first_noticed: 2026-04-20
current_status: emerging
domain: learning
children:
  - trail_learning_note
connects:
  - knowing_and_knowledge
  - knowledge_in_motion
```

`trail`

```yaml
type: trail
source: reading margin
date_of_discovery: 2026-04-21
domain: learning
connects:
  - knowing_and_knowledge
```

`articulation`

```yaml
type: articulation
source: working-thesis
domain: epistemics
connects:
  - knowing_and_knowledge
  - learning_edge
```

`concept`

```yaml
type: concept
domain: systems
connects:
  - world_as_systems
  - coordination_window
  - trail_coordination_note
```

`projects` (supported, not currently seeded)

```yaml
type: projects
externalUrl: https://example.com
publishDate: 2026-04-21
thumbnail: assets/visuals/example.png
featured: true
```

### Starter templates

Copy one of these files when publishing a new node from scratch:
- `templates/concept.md`
- `templates/articulation.md`
- `templates/signal.md`
- `templates/trail.md`
- `templates/projects.md`

## Authoring Notes

- Keep node IDs lowercase and stable
- Use `children` for tree structure
- Use `connects` for cross-links and graph relationships
- The current compiler treats body markdown links as inferred `children` only when neither `children` nor `connects` is explicitly authored
- Published-only discovery is a hard rule for search and public listing

## Repo Structure

- `nodes/`
  Active source corpus
- `scripts/`
  Build pipeline for topology, assets, and search
- `templates/`
  Copy-forward starter files for each supported node type
- `src/lib/`
  Runtime orchestration, explorer, router, graph, search UI
- `src/components/`
  Tree/detail rendering
- `src/types/`
  Runtime and graph contracts
- `public/data/`
  Generated public artifacts
- `docs/`
  Current system specification and migration notes

## Legacy / Historical Files

These are not part of the active V2 runtime, but may still remain in the repo for historical reference or compatibility:
- `js/`
- `build.js`
- `docs/MIGRATION_V2.md`

If they are retained, treat them as historical context rather than the canonical implementation.

## Verification Baseline

The expected baseline checks are:

```bash
npm run build:content
npx tsc --noEmit
npm run build
```

And the key interaction scenarios to verify are:
- `/map` graph default
- `/node/:id` explorer fallback
- search-to-node routing
- corpus filtering
- mobile/touch graph behavior
