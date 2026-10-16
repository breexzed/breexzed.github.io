<!-- readme-pattern: off — a personal site, not a released tool; owner wants it short (2026-10-17). -->
# breexzed.me

This is my home on the web: my writing, my build logs, and my portfolio. Every page starts as a markdown file in `nodes/`. A small build step turns those files into a site. Live at [breexzed.me](https://www.breexzed.me), portfolio at [breexzed.me/portfolio](https://www.breexzed.me/portfolio).

## What's where

| Path | What it is |
|---|---|
| `nodes/` | The content. One markdown file = one page at `/node/<id>`. |
| `templates/` | Starting files for new pages. |
| `portfolio.html`, `css/portfolio.css` | The portfolio page. Plain HTML, edit it by hand. |
| `index.html`, `src/`, `css/owlcyon.css` | The site itself: layout, routing, theme. |
| `scripts/` | The build: reads `nodes/`, writes `public/data/` and `public/ai/`. |
| `src/config/site.ts` | My social links. |

## Run it

Needs Node 20.

```bash
npm install
npm run dev      # build the content, then serve at localhost:8080
```

## Add a page

1. Copy a file from `templates/` into `nodes/`.
2. Fill in the frontmatter: a lowercase `id`, a `title`, `status: published`, and an `excerpt` for the card.
3. Write the page in markdown.
4. Run `npm run build:content`. If it passes, the page is in.

Folders, images and links: see `docs/AUTHORING.md`.

## Update the portfolio

Edit `portfolio.html`. When something I'm building changes, change the page in the same sitting, and move the "Updated" date at the bottom.

## Check it before pushing

```bash
npx tsc --noEmit
npm run smoke    # full build, then a headless Chromium check of routing, search and node pages
```

## Deploy

Push to `main`. Vercel builds it and serves breexzed.me within a few minutes. `vercel.json` sends `/portfolio` to the portfolio page and every other path to the main app.

## License

MIT.
