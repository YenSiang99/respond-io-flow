# Respond.io flow builder

A persistent frontend Vue 3 + Vite app for editing a flow on a canvas, implemented using Vue Flow. 
State is kept in the browser via `localStorage`, with a bundled JSON seed for first load.

## Requirements

- **Node.js** `^20.19.0` or `>=22.12.0` (see `package.json` → `engines`)

## Installation

From the project root:

```sh
npm install
```

## Running locally

**Development** (hot reload):

```sh
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

**Production build**:

```sh
npm run build
```

**Preview the production build** (after `npm run build`):

```sh
npm run preview
```

## Quality checks

```sh
npm run lint        # Oxlint + ESLint
npm run format      # Prettier (src/)
npm run test:unit   # Vitest
```

**End-to-end tests** (Playwright):

```sh
npx playwright install   # first time only
npm run build            # e2e expects a build
npm run test:e2e
```

## Design decisions

These are intentional tradeoffs aimed at clarity, interviewability, and maintainability—not accidental complexity.

1. **Domain model vs canvas library**  
   The source of truth is a flat **`steps` array** (triggers, messages, business-hours nodes, etc.) plus a separate **`positions` map** for node coordinates. [Vue Flow](https://vueflow.dev/) consumes `nodes` and `edges`; a dedicated **adapter** maps `steps` ↔ canvas shape. That keeps persistence and future APIs aligned with “flow JSON,” not with a particular graph UI.

2. **Pinia + TanStack Query together**  
   **Pinia** holds live edits (drag, connect, add node). **TanStack Query** owns the async load path and cache key for the same payload, and a **mutation** writes debounced snapshots to `localStorage`. Pinia is a good fit for fast, synchronous UI state; Query gives a consistent pattern if loading moves to HTTP later.

3. **Debounced persistence**  
   Saves to `localStorage` run on a **short debounce** after `steps` / `positions` change, so rapid drags do not stringify and write on every frame.

4. **Bootstrap vs async load**  
   The store **hydrates synchronously** from `localStorage` or the bundled seed so the first paint is consistent. Query still loads the same logical data for cache coherence and any UI that depends on query state.

5. **Branch “connector” steps**  
   Business-hours branching is modeled with lightweight **`dateTimeConnector`** steps (success/failure routing) so the canvas can show two edges without overloading the main card node. That matches how many flow builders separate “routing” from “content” steps.

---

Built with Vue 3, Vite, Pinia, Vue Router, Tailwind CSS v4, [@vue-flow/core](https://github.com/bcakmakoglu/vue-flow), and [@tanstack/vue-query](https://tanstack.com/query/latest).
