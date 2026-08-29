# Description

- Refer to '@README.md' for a description explaining the project.

# Architecture

Juel is a Lit 3 / TypeScript web component library (custom elements prefixed `juel-`), ~69 components organized under `src/<Module>/<Component>/` across these modules: Buttons, Data, Dialog, Display, Document, Editors, Gallery, Layout, Menus, Navigation, Utilities, Visualization. Shared infrastructure lives in underscore-prefixed folders: `_Base` (component base classes — `JuelComponent`, `InputBase`, `ListBase`, `ItemBase`, `FilteredBase`/`FilteredItemBase`, `CollapsibleBase`, `CommandBase`/`CommandComponent`, `NavigationBase`), `_Core`, `_Services`, `_Templates`, `_Utils`, `_Converters`, `_Directives`, `_CommonStyles`, `_Modules`, `_Strings`.

Each component typically has a `Component.ts`, a `Component.less` (bundled in via Parcel's `bundle-text:` import), and often a `ComponentEvents.ts`. Modules are wired up via per-module `Import.ts` barrel files, all re-exported from the root `juel.ts` entry point (note: `Dialog` uses `Imports.ts`, plural — the one exception).

`Editors/` splits value editors (form fields — `context[property]` model binding: Check, Date, Number, Select, Text, …) from **style editors** in `Editors/Style/` — components that visually edit a CSS property of a *target DOM element* with live preview + undo. They extend `Editors/Style/StylePropertyEditorBase.ts` (target resolution, `HistoryController` wiring, `applyLive` with baseline-removal; subclass hooks `parse`/`serialize`/`renderControls`/`changeEventName` and drives history via `commit`/`previewChange`/`cancelPreview`). Existing: `juel-position-editor`, `juel-gradient-editor`; more to come (shadow, transform, filter, clip-path, …). `Editors/Style/Import.ts` barrels them into `Editors/Import.ts`.

# Build & dev

- `npm run dev` — Parcel build (unoptimized) + copies `dist/*` into `examples/` for local browsing.
- `npm run serve` — dev build + `live-server` against `examples/`.
- `npm run build` — production build to `dist/`.
- `npm run lint` / `npm run lint:fix` — ESLint.
- Distributed via jsDelivr CDN pointing at `dist/juel.js` (see README).

# Testing

Jest + ts-jest is configured but test coverage is thin (`tests/util/`, `tests/MessageBox/`). Don't assume component behavior is protected by tests — the `examples/` directory (one HTML page per component/feature) is the primary manual verification surface. Pure logic (parsers, data structures like `_Core/History/HistoryStack`) is the exception — unit-test that in `tests/`.

# Shared infrastructure worth knowing

- **Undo / redo.** Any editor component that has discrete committed states (and optionally a
  live drag/typing preview) should use `HistoryController` (`_Base/HistoryController.ts`), a Lit
  Reactive Controller wrapping the pure `HistoryStack<T>` (`_Core/History/HistoryStack.ts`).
  **Read `src/_Core/History/README.md` before wiring it into a component** — it has the
  integration recipe, the `record` vs `preview` model, the `apply`-callback contract, and the
  init-timing gotcha. Reference consumer: `src/Editors/Style/PositionEditor/PositionEditor.ts`.

# Known in-progress work / quirks

- Mid-migration from `@popperjs/core` to `@floating-ui/dom` for positioning. Newer code (`Display/Tooltip`, `_Shared/Item`, `_Utils/dom/createFloating.ts`) uses floating-ui; older code (`_Base/InputBase`, `_Services/PopupService*`, `_Services/TooltipService`, `_Modules/WindowModule`, `_Core/VirtualElement`) still uses Popper. Prefer floating-ui when touching positioning code, unless matching existing Popper-based code nearby.
- `JuelComponent` (`_Base/JuelComponent.ts`) depends on a global jQuery (`$.when($.ready)`) inside its `firstUpdated`/`updated` lifecycle hooks — a legacy holdover in an otherwise modern Lit/TS codebase; jQuery isn't imported as a module anywhere, so it's assumed to be a global.