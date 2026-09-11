# BREEXZED Digital Estate

This repository is primarily owned by Breexzed. It is a personal digital estate: a static website that turns writing, projects, and ideas into a browsable, graph-like system.

the simplest way to think about it is this:

- You write content as markdown pages in `nodes/`
- The site reads those pages and turns them into a network of related ideas
- The homepage, corpus, signals, and node pages are generated from that content
- The whole thing is built locally and deployed as a static site

It's meant to feel like a living archive, not a standard CMS.

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
   - The browser renders the estate as a homepage, linked map explorer, corpus grid, and individual node pages
   - The main UI is a static site with JavaScript-driven navigation and visual interactions

The key tools are:

- Vite for local serving and production build
- TypeScript for app logic
- Markdown for content
- Node scripts for content processing and asset handling
- The topology compiler for node relationships and linked navigation

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

The system is intentionally authored as a living network.

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

## Creating a folder of notes

Folders are ordinary Markdown nodes, so adding one does not require changing the app code.

1. Create a directory such as `nodes/my-folder/`.
2. Copy `templates/folder.md` to `nodes/my-folder/my-folder.md`.
3. Give the folder a lowercase stable `id`, a `title`, `formula`, `depth`, its normal category `type` (for example `concept`), `folder: true`, and `parent`.
4. Add the child node IDs under `children`.
5. Move or create the child Markdown files in the same directory.
6. Set each child node's `parent` to the folder ID and increase its `depth` by one.
7. Add cross-folder relationships under `connects` when needed.
8. Put the folder's SVG files beside its Markdown file and keep `thumbnail` and `visual` in its frontmatter.
9. Run `npm run build:content`, then `npm run dev` to preview it.

Example:

```text
nodes/
└── my-folder/
    ├── my-folder.md
    ├── my-folder-thumb.svg
    ├── my-folder-visual.svg
    ├── first-note.md
    └── second-note.md
```

The folder appears in its normal category on the global surface with a single readable `FOLDER` badge, while its children appear as full preview cards inside the folder after its description. Child nodes are not duplicated globally. Each folder and note has a copyable node link. On Vercel/custom-domain deployments, links use clean paths such as `/node/worlds` and survive refreshes and new devices; GitHub Pages keeps the safe `/#/node/<id>` hash fallback.

To add another note later, create its Markdown file, add its ID to the folder's `children`, set its `parent` and `depth`, and rebuild content. No TypeScript or HTML changes are needed.

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

## Linking external reading

Use a normal Markdown link inside a node:

```md
[Shape Up — Foreword](https://basecamp.com/shapeup/0.1-foreword)
```

The site turns absolute `http://` and `https://` links into compact live-link previews showing the label, domain, path, and an external-link indicator. They open in a new tab. The site does not scrape or iframe third-party page contents: browser CORS rules and external security headers make that unreliable, and avoiding it keeps visitors' privacy and the source site's controls intact. For richer context, write a short summary or attributed excerpt directly below the link.

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

## Repo structure

- `nodes/` = the estate itself
- `templates/` = starting points for new writings
- `scripts/` = the build engine
- `src/` = browser app logic
- `css/` = visual styling
- `docs/` = design and authoring reference material

## Ownership

This project is primarily owned by Breexzed.

The repository is a personal digital estate and reflection space for Breexzed's work, ideas, projects, systems, and traces. The design and editorial direction are part of that ownership and identity. 
## Quick start 

If you just want to add or update content without touching the code:

1. Open `nodes/`
2. Pick a node category folder or template
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
- `/llms.txt` and `/ai/*` machine-readable retrieval surfaces
- `/node/:id` explorer fallback
- search-to-node routing
- corpus filtering
- mobile/touch node navigation
