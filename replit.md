# Overview

This is a **Visual Database Schema Designer** — a client-side web application that lets users design PostgreSQL database schemas on an infinite canvas. Users can create tables, define columns with types and constraints, draw relationships between tables, and export the result as SQL. All schema data is persisted in the browser's `localStorage` — there is no backend database or API involved in the core functionality.

The app is built as a full-stack TypeScript project, but the server is essentially a static file server with a single health-check endpoint. The real application logic lives entirely on the client.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend (Client)

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives, styled with Tailwind CSS
- **State Management**: Custom React hook (`useSchemaStore`) using `useState` with undo/redo history stack. No Redux or Zustand — state is managed through a single hook that commits changes to a history array.
- **Data Persistence**: `localStorage` only. The schema (tables, columns, relations) is serialized to JSON and saved/loaded from `localStorage` under the key `schema-designer-state`.
- **Infinite Canvas**: `react-zoom-pan-pinch` provides pan and zoom. Table nodes are absolutely positioned divs, and relationship lines are SVG paths rendered on top.
- **Drag & Drop**: Native Pointer Events (no drag library). Table dragging is handled by tracking pointer movement and dividing by the current canvas scale for accurate positioning.
- **Table Layout**: Tables have a fixed width of 288px (`w-72`) to enable deterministic math for SVG relationship line anchor points.
- **SQL Export**: Client-side PostgreSQL DDL generation (`sql-generator.ts`) that produces CREATE TABLE statements and ALTER TABLE for foreign keys.
- **ID Generation**: `uuid` (v4) for tables, columns, and relationships.
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

## Backend (Server)

- **Framework**: Express.js on Node.js
- **Purpose**: Serves the built frontend in production; proxies through Vite dev server in development. Has a single `/api/ping` health-check endpoint.
- **Database**: None actively used. `server/db.ts` exports an empty object. `server/storage.ts` has an empty `MemStorage` class. The Drizzle config exists and points to PostgreSQL via `DATABASE_URL`, but the app doesn't use it for core functionality.
- **Dev Server**: Vite middleware is used in development for HMR (Hot Module Replacement) over the Express HTTP server.
- **Build**: Custom build script (`script/build.ts`) using esbuild for server bundling and Vite for client bundling. Output goes to `dist/`.

## Shared Code (`shared/`)

- **schema.ts**: Zod schemas and TypeScript types for the data model (Table, Column, Relation, DatabaseSchema). Duplicated in `client/src/lib/schema-types.ts` for client-side use.
- **routes.ts**: API route definitions with Zod response schemas (minimal — only ping endpoint).

## Key Design Decisions

1. **Client-only state with localStorage** — No backend needed for the core product. This simplifies deployment and makes the app work offline. The tradeoff is no multi-device sync or collaboration.

2. **Undo/Redo via history stack** — The `useSchemaStore` hook maintains `past`, `present`, and `future` arrays. Every mutation commits the current state to the past stack and clears the future stack.

3. **Fixed table width for relationship math** — Tables are always 288px wide so relationship line endpoints can be calculated with pure arithmetic (no DOM measurement needed), keeping the canvas performant.

4. **Dark theme by default** — CSS variables in `index.css` define a dark professional palette. There's no light mode toggle — the app is dark-only.

5. **Drizzle ORM configured but unused** — The project has Drizzle config pointing to PostgreSQL. If backend persistence is ever needed, the infrastructure is ready. Run `npm run db:push` to push schema to a database.

## Data Model

The core data model (defined in `shared/schema.ts`):

- **DatabaseSchema**: `{ tables: Table[], relations: Relation[] }`
- **Table**: `{ id, name, columns: Column[], position: { x, y } }`
- **Column**: `{ id, name, type, isPrimaryKey, isNotNull, isUnique }`
- **Relation**: `{ id, fromTableId, fromColumnId, toTableId, toColumnId, type: "1:1" | "1:N" }`

Column types supported: uuid, integer, serial, text, varchar, boolean, timestamp, date, json, jsonb, real, double precision.

# External Dependencies

- **PostgreSQL** (via `DATABASE_URL` env var): Configured in `drizzle.config.ts` but not actively used by the application. Required if backend database features are added.
- **Google Fonts**: Inter and Fira Code loaded via CSS `@import` and HTML `<link>` tags.
- **No external APIs**: The app is fully self-contained. No auth providers, no third-party services, no cloud storage.

### Key npm packages:
- `react-zoom-pan-pinch` — Infinite canvas pan/zoom
- `uuid` — Unique ID generation
- `drizzle-orm` / `drizzle-kit` — ORM (configured, not actively used)
- `zod` — Schema validation for data types
- `wouter` — Client-side routing
- `@tanstack/react-query` — Available but minimally used (no real API calls)
- `shadcn/ui` + Radix UI — Component library
- `tailwindcss` — Styling
- `lucide-react` — Icons