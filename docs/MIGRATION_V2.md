# The Topology of Being: V2 Migration Plan

## 1. Goal
Migrate from the current vanilla JS + compatibility-profile system to TypeScript + Vite + extended node model, while preserving existing behavior contracts from `docs/SYSTEM_SPEC.md` and avoiding double implementation work.

## 1.1 Current Status
1. Phase 1 completed.
2. Phase 2 completed.
3. Phase 3 completed.
4. Phase 4 completed.
5. Phase 5 completed.
6. Phase 6 completed.

## 2. Decision
Use a **parity-first migration**, not a "build everything on legacy first" approach.

Why:
1. Building new features on legacy first creates duplicate work and re-testing.
2. `SYSTEM_SPEC.md` already provides the behavior contract needed to migrate safely.
3. Strict-mode behavior is the intended stable target for V2.

## 3. Source Of Truth During Migration
1. Product and behavior contract: `docs/SYSTEM_SPEC.md`.
2. V2 architecture and feature scope: your "Complete Implementation Specification v2.0".
3. Runtime/data compatibility boundary: `data/topology.json` contract in `docs/SYSTEM_SPEC.md` section 4.

## 4. Migration Strategy
1. Freeze V1 baseline and define acceptance tests from `SYSTEM_SPEC`.
2. Promote strict behavior to default in V1 with rollback switch.
3. Stand up V2 infrastructure (TypeScript, Vite, new scripts) with behavior parity first.
4. Add new V2 features only after parity checks pass.
5. Remove legacy profile and old runtime only after cutover criteria are satisfied.

## 5. Workstreams

### 5.1 Workstream A: Behavioral Parity
Target: preserve and verify all strict behaviors currently gated by compatibility flags.

Checks to carry forward:
1. Root handling for `depth: 0`.
2. Non-empty tree traversal from valid roots.
3. Sidebar render fallback safety.
4. Breadcrumb correctness on initial load and restore.
5. Hash routing: direct ID and path-like hash resolution.
6. Markdown trust boundary hardening.
7. Cosmos null-canvas resilience.
8. Normalized source paths in built data.

### 5.2 Workstream B: Infrastructure Migration
Target: replace runtime/tooling foundation without behavior drift.

Scope:
1. Add `vite.config.ts`, `tsconfig.json`, `src/`, `public/`, `scripts/`.
2. Port modules from `js/*` to `src/lib/*` with typed interfaces.
3. Keep rendered UX and navigation behavior functionally equivalent at first pass.
4. Move CSS to modular files and keep same visual output initially.

### 5.3 Workstream C: Data Model Expansion
Target: adopt V2 node fields and preserve backward compatibility.

Scope:
1. Add `type`, `featured`, `thumbnail`, `externalUrl`, `publishDate`, `status`.
2. Default values for existing nodes:
   1. `type: "note"`
   2. `status: "published"`
   3. `featured: false`
3. Validate existing content still builds without adding new frontmatter immediately.

### 5.4 Workstream D: New Features
Target: add portfolio/search/mobile upgrades after parity.

Scope:
1. Projects and essays views.
2. Search index build + runtime search UI.
3. Asset pipeline.
4. Mobile sidebar/toggle improvements.

## 6. Execution Phases

### Phase 0: Baseline And Guardrails
Deliverables:
1. `docs/MIGRATION_V2.md` (this file).
2. Acceptance test checklist file (or test suite) for all `SYSTEM_SPEC` delta gates.
3. Current baseline build artifacts captured for comparison.

Exit criteria:
1. V1 strict and legacy behavior differences are documented and reproducible.

### Phase 1: Strict-First Stabilization In V1
Deliverables:
1. Runtime default profile switched to strict, legacy override retained.
2. Build default switched to strict, legacy build command retained.
3. Critical hardening patch: robust HTML sanitization (non-regex-only approach).

Exit criteria:
1. All `SYSTEM_SPEC` strict acceptance scenarios pass.
2. Rollback to legacy still possible via query/localStorage/build script.

### Phase 2: Tooling Skeleton (No Feature Expansion)
Deliverables:
1. Add Vite + TypeScript files and scripts.
2. Add `src/types/*`, `src/lib/*` skeletons.
3. Wire `index.html` to Vite entry.

Exit criteria:
1. `npm run dev`, `npm run build`, `npm run preview` work in V2 skeleton.
2. No behavior regressions on explorer navigation.

### Phase 3: Runtime Port With Parity
Deliverables:
1. Port `persistence`, `cosmos`, `explorer`, `main` to TypeScript.
2. Keep the same interaction behavior as strict V1.
3. Add component render functions (`TreeNav`, `DetailPanel`) with escaping/sanitization controls.

Exit criteria:
1. V2 runtime passes all parity checks from Workstream A.

### Phase 4: Build Pipeline Port
Deliverables:
1. `scripts/build-topology.js` with two-pass parse and validation.
2. Correct link resolution for relative and path-like links.
3. Backward-compatible `topology.json` fields plus V2 extensions.

Exit criteria:
1. Topology build passes contract checks.
2. Duplicate IDs and broken links fail build (not warning-only).

### Phase 5: Feature Expansion
Deliverables:
1. Search (`build-search.js`, `src/utils/search.ts`, `src/lib/search-ui.ts`).
2. Portfolio components (`ProjectCard`, `EssayCard`) and sections.
3. Asset copying and path rewrite pipeline.
4. Mobile sidebar improvements.

Exit criteria:
1. Functional criteria from your V2 spec are met.
2. New features do not break topology navigation contract.

### Phase 6: Cutover And Legacy Removal
Deliverables:
1. Remove profile-gated legacy branches from runtime and build scripts.
2. Remove old `js/*` runtime path from `index.html`.
3. Update docs and deployment workflows for V2 only.

Exit criteria:
1. Production build healthy.
2. No known blocker regressions.
3. Rollback path documented to previous release tag, not runtime profile switches.

## 7. Acceptance Matrix (Must Pass Before Cutover)

### 7.1 Behavior Contract (from `SYSTEM_SPEC`)
1. Root node included with `depth: 0`.
2. `treeOrder` generated and non-empty for valid topology.
3. Sidebar renders nodes even when build anomalies occur.
4. Initial breadcrumb matches resolved active node ancestry.
5. Hash routing resolves direct IDs and path-like hashes.
6. Unsafe markdown payloads do not execute.
7. Missing `#cosmos` does not crash app.
8. `source` paths use forward slashes in output.

### 7.2 V2 Functional Contract
1. TypeScript compiles with strict settings.
2. Vite dev/build/preview all pass.
3. Projects render with sorting and featured behavior.
4. Essays render and navigate.
5. Search opens with `/`, returns results, and navigates.
6. Mobile sidebar toggle works on coarse pointers.

## 8. Risk Register
1. **XSS risk via `innerHTML` templates**
   1. Mitigation: sanitize markdown output and escape interpolated metadata before render.
2. **Search import/export format mismatch**
   1. Mitigation: pin FlexSearch usage with tested serialization format and compatibility checks.
3. **Node ID convention drift**
   1. Mitigation: enforce one convention in builder (`kebab-case` recommended) and fail invalid IDs.
4. **Silent data corruption from duplicate IDs**
   1. Mitigation: hard fail on duplicate IDs during topology build.
5. **History/hash navigation regressions**
   1. Mitigation: explicit routing tests for forward/back and deep-link behavior.

## 9. Recommended Defaults For V2
1. Runtime profile concept removed after cutover.
2. Strict behavior becomes the only behavior.
3. Build defaults to strict-equivalent behavior.
4. Node visibility logic:
   1. `published`: visible in all discovery UIs.
   2. `draft`: hidden from public list/search, optionally visible in local dev.
   3. `archived`: hidden from list/search, accessible by direct link if desired.

## 10. Suggested Order For Your Proposed Features
1. Infrastructure and parity first.
2. Data model extension second.
3. Search and portfolio UI third.
4. Mobile refinements fourth.
5. Deployment/workflow hardening last.

This ordering gives you maximum velocity with minimum rewrite risk.

## 11. Implementation Checklist (Actionable)
1. Create V2 scaffolding files (`vite.config.ts`, `tsconfig.json`, `src/`, `public/`, `scripts/`).
2. Port build script to `scripts/build-topology.js` with strict-only semantics and hard validation.
3. Port runtime modules to `src/lib/*` with TypeScript types from `src/types/*`.
4. Add safe rendering utilities for escaped interpolation and sanitized markdown.
5. Add and wire component modules (`TreeNav`, `DetailPanel`, `ProjectCard`, `EssayCard`).
6. Add search indexing and UI modules.
7. Add asset pipeline and path rewrites.
8. Add new node content (`_about`, `projects/*`, `essays/*`).
9. Run parity + functional acceptance matrix.
10. Cut release tag for V2 and remove legacy branches.

## 12. Rollback Policy
1. Phase 6 removed runtime/build profile switching from active workflow.
2. Rollback is release-based only (git tag / deployment artifact).
3. Keep one stable pre-V2 tag and one stable post-V2 tag for deployment reversal.
