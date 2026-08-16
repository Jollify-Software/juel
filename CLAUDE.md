# Description

- Refer to '@README.md' for a description explaining the project.

# Architecture

Juel is a Lit 3 / TypeScript web component library (custom elements prefixed `juel-`), ~69 components organized under `src/<Module>/<Component>/` across these modules: Buttons, Data, Dialog, Display, Document, Editors, Gallery, Layout, Menus, Navigation, Utilities, Visualization. Shared infrastructure lives in underscore-prefixed folders: `_Base` (component base classes — `JuelComponent`, `InputBase`, `ListBase`, `ItemBase`, `FilteredBase`/`FilteredItemBase`, `CollapsibleBase`, `CommandBase`/`CommandComponent`, `NavigationBase`), `_Core`, `_Services`, `_Templates`, `_Utils`, `_Converters`, `_Directives`, `_CommonStyles`, `_Modules`, `_Strings`.

Each component typically has a `Component.ts`, a `Component.less` (bundled in via Parcel's `bundle-text:` import), and often a `ComponentEvents.ts`. Modules are wired up via per-module `Import.ts` barrel files, all re-exported from the root `juel.ts` entry point (note: `Dialog` uses `Imports.ts`, plural — the one exception).

# Build & dev

- `npm run dev` — Parcel build (unoptimized) + copies `dist/*` into `examples/` for local browsing.
- `npm run serve` — dev build + `live-server` against `examples/`.
- `npm run build` — production build to `dist/`.
- `npm run lint` / `npm run lint:fix` — ESLint.
- Distributed via jsDelivr CDN pointing at `dist/juel.js` (see README).

# Testing

Jest + ts-jest is configured but test coverage is minimal (currently a single file, `tests/util/findUntilTests.ts`). Don't assume component behavior is protected by tests — the `examples/` directory (one HTML page per component/feature) is the primary manual verification surface.

# Known in-progress work / quirks

- Mid-migration from `@popperjs/core` to `@floating-ui/dom` for positioning. Newer code (`Display/Tooltip`, `_Shared/Item`, `_Utils/dom/createFloating.ts`) uses floating-ui; older code (`_Base/InputBase`, `_Services/PopupService*`, `_Services/TooltipService`, `_Modules/WindowModule`, `_Core/VirtualElement`) still uses Popper. Prefer floating-ui when touching positioning code, unless matching existing Popper-based code nearby.
- `JuelComponent` (`_Base/JuelComponent.ts`) depends on a global jQuery (`$.when($.ready)`) inside its `firstUpdated`/`updated` lifecycle hooks — a legacy holdover in an otherwise modern Lit/TS codebase; jQuery isn't imported as a module anywhere, so it's assumed to be a global.