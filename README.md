# BREEXZED Digital Estate

This repository is primarily owned by Breexzed. It is a personal digital estate: a small static website that turns writing, projects, and ideas into a browsable, graph-like system instead of a normal blog or database-driven app.

If you are not technical, the simplest way to think about it is this:

- Write content as markdown pages in `nodes/`
- The site reads those pages and turns them into a network of related ideas
- The homepage, corpus, signals, and node pages are generated from that content
- The whole thing is built locally and deployed as a static site

This is meant to feel like a living archive, not a standard CMS.

## Who this is for

This repo is mainly for Breexzed as a personal knowledge and publishing space, but it is structured so that future edits can be made in a clean, low-friction way.

The project is designed around a simple rule: content is the source of truth, and code should mostly stay out of the way.

## How this repo was built

At a high level, the site is built in three layers:

1. Content layer
   - Everything important lives in markdown files under `nodes/`
   - Each markdown file represents a node in the estate
   - A node can have a title, summary, links, tags, visual asset, and relationships to other nodes

2. Build pipeline
   - A Node.js build process reads those markdown files and turns them into structured data
   - The project compiles the content into `data/topology.json` and a search index
   - Images and local assets are copied into the public site output and linked correctly

3. Frontend layer
   - Vite serves and bundles the front-end
   - The browser renders the estate as a homepage, corpus grid, graph map, and individual node pages
   - The main UI is a static site with JavaScript-driven navigation and visual interactions

The key tools are:

- Vite for local serving and production build
- TypeScript for app logic
- Markdown for content
- Node scripts for content processing and asset handling
- Graphology/Sigma for the network/map view

## The important folders

- `nodes/` — the live content that makes up the estate
- `templates/` — starter files for new nodes
- `scripts/` — build scripts that turn markdown into site data
- `src/` — app logic and front-end rendering
- `css/` — styling and visual language
- `public/` — generated public assets and static files
- `docs/` — notes and system/reference docs

## The simple mental model

Think of the estate like this:

- a home page for the whole space
- a corpus of ideas/projects/articulations
- a graph or map view to show relationships
- individual node pages for reading deeper
- a signal surface for observations and evolving threads

The system is intentionally authored as a living network rather than a linear timeline.

## How to use this repo

### 1. Install dependencies

From the project root:

```bash
npm install
```

### 2. Run it locally

Start the local development environment:

```bash
npm run dev
```

This will build the content pipeline and start the app in a local browser preview.

### 3. Build the site for production

```bash
npm run build
```

This generates the production-ready output in `dist/`.

### 4. Preview the production build

```bash
npm run preview
```

### 5. Regenerate content only

If you are making changes to markdown nodes or frontmatter:

```bash
npm run build:content
```

This runs the topology and asset pipeline without a full app rebuild.

## What usually gets edited

If you are not highly technical, the main thing you will use is:

- `nodes/` for writing and organizing content
- `templates/` for creating new post-like entries
- `public/assets/...` for uploaded images or portraits
- `src/config/site.ts` for site-level contact/social links

You do not usually need to edit the application logic unless you are intentionally changing the structure or display system.

## Creating a new page or node

1. Open the relevant folder under `nodes/`
2. Copy a file from `templates/`
3. Rename it to match your new node
4. Fill in the frontmatter and body text
5. Run:

```bash
npm run build:content
```

If the build passes, the node is accepted into the estate.

## Adding images

You can attach visuals to a node by placing an image beside the markdown file and referencing it in the frontmatter or body.

Examples:

```yaml
visual: ./example-image.jpg
```

or

```yaml
thumbnail: ./example-image.jpg
```

The build pipeline copies these assets to the static public folder and rewrites internal references automatically.

## Core commands

```bash
npm install
npm run dev
npm run build:content
npm run build
npm run preview
npm run smoke
```

Useful shorthand:

- `npm run dev` = work locally
- `npm run build:content` = update content model
- `npm run build` = full production build
- `npm run smoke` = quick validation check

## Repo structure in plain English

- `nodes/` = the estate itself
- `templates/` = starting points for new writings
- `scripts/` = the build engine
- `src/` = browser app logic
- `css/` = visual styling
- `docs/` = design and authoring reference material

## Ownership

This project is primarily owned by Breexzed.

The repository is a personal digital estate and reflection space for Breexzed's work, ideas, projects, systems, and traces. The design and editorial direction are part of that ownership and identity.

## Quick start for a non-technical person

If you just want to add or update content without touching the code:

1. Open `nodes/`
2. Pick a node type folder or template
3. Create a new markdown file
4. Add title, summary, and links in frontmatter
5. Write your content in markdown
6. Add any image next to it
7. Run:

```bash
npm run build:content
```

8. Run:

```bash
npm run dev
```

9. Open the local site and check it

That is the main day-to-day use of the repo.

## Notes

This project is intentionally not a traditional app with a database and login system. It is a static site built around content, relationships, and public reading.

The interesting thing is not that it is advanced in a big-application sense. The interesting thing is that it organizes ideas as a navigable estate: readable, connected, and human.

For deeper technical notes, see:

- `docs/SYSTEM_SPEC.md`
- `docs/AUTHORING.md`
- `docs/visual-system-guide.md`

## Final summary

This repo is Breexzed's digital estate: a lightweight, static, content-first website that turns writing into a browsable system of relationships. It is built from markdown, processed into structured topology data, and rendered as a graph-rich site with curated reading surfaces.

If you want to work with it, focus on the content in `nodes/` and the templates first. The code exists to support the structure, not to replace the underlying ideas.
  Tree/detail rendering
- `src/types/`
  Runtime and graph contracts
- `public/data/`
  Generated public artifacts
- `docs/`
  Current system specification and migration notes
- `src/config/site.ts`
  Footer social/account configuration

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
npm run smoke
```

And the key interaction scenarios to verify are:
- `/map` graph default
- `/node/:id` explorer fallback
- search-to-node routing
- corpus filtering
- mobile/touch graph behavior
