# Frontend Migration Audit — EOSfrontendweb → EOS-web-frontend

Read-only audit. No file was written, staged, committed, or pushed in either repo while producing this — this document is the only output.

- **Source**: `C:\PRODUCTION\ERP_PROD\EOSfrontendweb` — repo `github.com/aswinramaraj/EOSfrontendweb`, branch `Academic-Coordinator`
- **Target / production**: `C:\PRODUCTION\ERP_PROD\EOS-web-frontend` — repo `github.com/SANGARAPANDIAN/EOS-web-frontend`, branch `principal`
- **Goal**: bring the Academic Coordinator work (and whatever else is worth keeping) from the source into the target, which is the intended final production repo, without breaking anything already working there.

---

## TL;DR

- Two **separate GitHub repos with unrelated git history** (different owners, zero overlapping commit SHAs across full history). This is a file migration, not a `git merge`.
- **Tooling versions line up closely** (Next 16.3, React 19.2.x, TS 5, react-query 5.101.4, react-hook-form/zod/jspdf identical). Not a blocker anywhere.
- **Routing is not a paradigm clash.** The target already has a "compat-shim" pattern (a minimal registry entry) built for absorbing a fully self-contained module like Academic Coordinator — 7+ existing modules already use it. The `academic_coordinator` role string is already registered in the target.
- **Two real cost centers**: (1) the target's plain `DataTable` needs a per-page adapter wherever the source used its richer `PlacementTable`; (2) the target's own `secretary` module has grown into a broader, mostly-real build that overlaps the source's brand-new Secretary work on four features under different routes/endpoints — needs a feature-by-feature decision, not a copy.
- Of the 18 modules that exist **only** in the source (the literal "what's missing" list), 5 are empty scaffolding, several are small clean CRUD leaves, and the real complexity concentrates entirely in `academic-coordinator` itself and its dependency chain.
- 7 decisions listed at the end need a human call before any file moves.

---

## 1. Repo relationship & migration mechanics

**History**: confirmed unrelated by comparing every commit SHA (`git log --all --format=%H`) across both repos — zero overlap. Different author emails, different first-commit dates (source: Aug 3 2026; target: Aug 10 2026), different commit counts (33 vs 46 at audit time). Both first commits are titled "Initial commit from Create Next App" — that's generic `create-next-app` boilerplate text, not evidence of a shared origin. `git merge-base` isn't computable without adding one repo as a remote inside the other (a state-changing action, not done here).

**Deploy config**: neither repo has `vercel.json` or `.github/workflows/*` — no checked-in CI/CD in either. Both `next.config.ts` are untouched defaults. Deploys are almost certainly dashboard/git-integration driven on both sides.

**Backend URL — needs direct confirmation, not assumed**: both repos declare the identical single env var name `NEXT_PUBLIC_API_BASE_URL`, and it's the *only* `process.env.*` reference in source in either codebase. Values were **not read** (out of audit scope) — only the variable name match was confirmed. This is a strong signal both frontends target the same backend contract, but should be confirmed directly before relying on it, since if the target points at a different backend, every migrated page's data-fetching needs rethinking, not just import paths.

**package.json drift**: names differ (`eosfrontend` vs `eos-frontend`); target has three extra deps not present in source at all: `clsx@^2.1.1`, `tailwind-merge@^3.6.0`, `material-symbols@^0.46.0` (all icon/styling-utility related — ties into the icon-system finding in §4).

### Migration mechanics options considered

| Option | Trade-off |
|---|---|
| Plain file copy of specific module folders | Fastest, most predictable, lowest blast radius. Loses git blame/history on ported code. |
| `git subtree` / `format-patch` + `git am` (preserve history for specific paths) | Only stays clean if a module's commits never touched shared files — real feature work rarely manages this; expect noisy/conflicting patches. |
| Add source as a remote in target, `git merge --allow-unrelated-histories` | Preserves full history, but drags in the entire unrelated tree — two independently-scaffolded `create-next-app` trees won't align file-for-file, producing a massive, mostly-spurious diff. |

**Recommendation**: plain file copy for this "migrate a handful of specific role-module folders" scope, followed by manual reconciliation of shared files (root layout, shared components, `package.json` deps).

### Housekeeping before anything moves

- `EOS-web-frontend` is currently **33 commits ahead of `origin/principal`, unpushed**. Local-only work, not backed up on GitHub yet. Working tree is clean (nothing uncommitted) in both repos as of the audit.

---

## 2. Tooling diff

| Dependency | EOSfrontendweb | EOS-web-frontend |
|---|---|---|
| Next.js | `^16.3.0` | `16.3.0` (exact-pinned) |
| React | `19.2.4` (exact) | `19.2.8` (exact) — patch drift |
| TypeScript | `^5` | `^5` — identical |
| eslint-config-next | `16.2.12` | `16.3.0` — drift |
| @tanstack/react-query | `^5.101.4` | `^5.101.4` — identical |
| react-hook-form / @hookform/resolvers / zod | `^7.84.0` / `^5.7.1` / `^4.4.3` | identical |
| jspdf / jspdf-autotable | `^4.2.1` / `^5.0.8` | identical |
| Tailwind | `^4` + `@tailwindcss/postcss` | identical config |
| Target-only | — | `clsx@^2.1.1`, `tailwind-merge@^3.6.0` (→ `@/lib/utils/cn`), `material-symbols@^0.46.0` |

- `clsx`/`tailwind-merge`/`material-symbols` have **zero** hits anywhere in EOSfrontendweb's `src` (verified by grep) — no `cn()` helper, no ligature icon font there.
- `postcss.config.mjs`, `tsconfig.json`, and `eslint.config.mjs` are **byte-identical** between the two repos.
- Provider wiring differs: target mounts `QueryClientProvider`+`AuthProvider` once globally (`src/lib/providers/AppProviders.tsx`, used by root `layout.tsx`). Source's root `layout.tsx` has no providers at all; `QueryProvider`+`ToastProvider` are mounted at `(dashboard)/layout.tsx`, then **redundantly re-mounted again** inside `academic-coordinator/(portal)/layout.tsx` — a pre-existing quirk in the source, not something to carry over.
- Source has **no auth React Context at all** — auth is a bare localStorage singleton read via `useSyncExternalStore`. Target uses a real `AuthContext`.

---

## 3. Routing & module-wiring architecture

### EOSfrontendweb (source)

- Filesystem routing under `src/app/(dashboard)/<role>/...`.
- Academic Coordinator nests an extra group: `(dashboard)/academic-coordinator/(portal)/layout.tsx` renders `AcademicCoordinatorShell` (`src/modules/academic-coordinator/components/AcademicCoordinatorShell.tsx`).
- The Shell is **fully self-contained**: calls `useAuthUser()` directly, hardcodes `ALLOWED_ROLES = new Set(["academic_coordinator","admin"])`, does its own `router.replace(...)`. No external gate wraps it.
- Its Sidebar imports nav data directly from a sibling `nav.ts` (`COORDINATOR_NAV`) — hardcoded import, no indirection.
- **No cross-module registry anywhere** (grep for "registry"/"ModuleConfig" returns nothing). Every module (hr, secretary, iqac, academic-coordinator, etc.) is wired identically but independently — same recipe, copy-pasted, zero shared lookup table.

### EOS-web-frontend (target)

- Also filesystem routing, under `src/app/(portal)/<role>/...`.
- `(portal)/layout.tsx` wraps everything in `<RequireAuth>` (login-check only). Only 4/18 modules (edc, billing, hr, gate-warden) additionally wrap `<RequireRole allow={[...]}>` — a pre-existing inconsistency, unrelated to this migration but worth knowing.
- `src/modules/registry.ts:28-47` exports `MODULE_REGISTRY` and `getModuleConfig(role)` (49-52), mapping role string → `ModuleConfig {role, basePath, moduleLabel, navGroups}` (`types.ts:55-60`).
- **Two tiers use this registry**:
  - **Generic tier** (student, hod, hr, gate-warden, media-room, transport, medical-centre, sports-admin, hostel-warden, higher-education): Shell renders the shared `AppShell`/`Sidebar` (`src/components/layout/`) directly off `moduleConfig.navGroups` — real nav data flows through the registry at render time.
  - **Bespoke tier** (principal, edc, advisor, library, placement, billing, secretary, admin): each has its own hand-built Shell/Sidebar with a private nav shape, and registers only a **"compat-shim"** `ModuleConfig` with `navGroups: []` — explicitly commented as such (`src/modules/secretary/nav.ts:65-68`: *"same compat-shim pattern as edcModuleConfig"*). The shim exists solely so `getModuleConfig()` can resolve a `basePath` for: login redirect (`app/login/page.tsx:23,34`), root redirect (`app/page.tsx:18`), `RequireRole`'s mismatch redirect (`RequireRole.tsx:26`), `AccessDenied`'s back-link (`AccessDenied.tsx:10-11`), and each Shell's switch-role handler (`PrincipalSidebar.tsx:51`).
  - Principal is a hybrid: bespoke Shell, but its `navGroups` are real and imported directly by `PrincipalSidebar.tsx:16`.

### Verdict

**Not a paradigm clash.** Both apps use plain filesystem routing for actual pages; the registry is a ~50-line additive redirect table, never a rendering engine. The target already has a precedented recipe — the compat-shim pattern, used by 7+ modules — for absorbing exactly the kind of fully bespoke, self-contained module the source builds. Migrating academic-coordinator does **not** require restructuring its Shell/Sidebar internals.

### Concrete mechanical work required

1. Register a compat-shim `academicCoordinatorModuleConfig` in `registry.ts`.
2. Decide whether to keep the Shell's self-contained `ALLOWED_ROLES` check or switch to `<RequireRole>` wrapping.
3. Rewire auth from `useAuthUser()`/`tokenStorage` (keys `eos_access_token`/`eos_user`) to the target's `useAuth()`/`AuthContext`/`session.ts` (single key `eos.session`) — **no shared code between the two auth systems**.
4. Remap all `@/shared/...` imports — target has **no `src/shared/`** directory at all; equivalents live under `@/lib/` and `@/components/`.
5. Rebuild nav icons (component refs → Material-Symbols strings, or just port `icons.tsx` wholesale — see §4).

### Risks / open questions from this section

- `academic_coordinator` role string **already exists** in target's `ROLE_LABEL` (`src/lib/config.ts:75`), and login already handles an unregistered-but-known role gracefully (`login/page.tsx:35-38`) — low risk on role-model alignment.
- Target has **no global `ToastProvider`** — the only one found is scoped to `src/modules/admin/components/ui/ToastProvider.tsx`; a migrated module reuses that, not a shared root (see §4).
- Minor version drift worth reconciling: React 19.2.4 vs 19.2.8, eslint-config-next 16.2.12 vs 16.3.0.

---

## 4. Shared infrastructure compatibility

### 4.1 Generic data table

- **Source**: `src/modules/placement/components/table/PlacementTable.tsx` (465 lines) — "batteries-included." `PlacementTableColumn<T>` = `{key, label, width (fr string), type: "text"|"mono"|"badge"|"action"|"bar", align?, strong?, actions?(row), barValue?(row), leading?(row), render?(row)=>{text,sub}, sortValue?(row)}`. Bakes in a `toolbar` slot, controlled sort with click-to-toggle header arrows, controlled pagination with a built-in "Previous / Next / Showing X–Y of Z" footer, and a `totalCount` escape hatch for server-side pagination.
- **Target**: `src/components/ui/DataTable.tsx` (112 lines, re-exported from `components/ui/index.ts`) — a bare CSS-Grid renderer. `DataTableColumn<T>` = `{key, header: ReactNode, width?, align?: left|right|center, render(row,index)=>ReactNode}` (fully generic JSX, not a constrained `{text,sub}` shape). Adds `loading`, `rowKey`, `hoverableRows`, `title`/`titleNote` — but **no sort, no pagination, no toolbar slot, no badge/action/bar "type" concept**. Pagination is a separate, module-local component (`src/modules/admin/components/ui/Pagination.tsx` / `NumberedPagination.tsx`), badges are a separate `<Badge tone="accent|accentDark|neutral|danger">` component (`src/components/ui/Badge.tsx`) a column's `render` must invoke manually.
- Both use the same underlying primitive (CSS Grid, `columns[]`/`rows[]`, per-column width track, `rowKey`) — mechanical, not conceptual, but every migrated page's column defs need rewriting (typed cells → plain JSX `render`), plus bolting on a separate Pagination component and hand-rolling any sort UI.

**Verdict: Needs adapter** — cost scales per page, not a one-time shim.

### 4.2 Modal / ConfirmDialog / Toast

- **Modal**: source uses a native `<dialog>` + `showModal()`, props `{open,onClose,title,subtitle,children,widthClassName,closeButtonVariant}`. Target uses `createPortal` to `document.body` + backdrop div, props `{open,onClose,title,subtitle,children,className}`. Same behavior; only the width-override prop name (`widthClassName`→`className`) and `closeButtonVariant` (absent in target) differ — trivial rename.
- **ConfirmDialog**: source wraps its own Modal: `{open,title,message,confirmLabel,tone:"danger"|"primary",isPending,onConfirm,onClose}`. Target (`components/ui/ConfirmDialog.tsx`) is a standalone overlay (not built on its Modal): `{open,title,description,confirmLabel,cancelLabel,destructive:boolean,onConfirm,onCancel}`. Field renames (`message`→`description`, `tone`→`destructive` boolean, `onClose`→`onCancel`) plus **no `isPending`/busy-button state** — a migrated confirm-then-mutate flow has nowhere to disable the button mid-request without extending the component.
- **Toast**: source has one global `shared/components/ui/ToastProvider.tsx` (`useToast()→{show,showDetailed}`). Target has **no top-level shared ToastProvider** — instead a near line-for-line duplicate lives at `src/modules/admin/components/ui/ToastProvider.tsx` (identical `{show,showDetailed}` API and dedup/dismiss-timer logic, just using the Material-Symbols `Icon` instead of SVG icons for badges) and is already imported cross-module by `app/(portal)/placement/layout.tsx`, `library/layout.tsx`, and `admin/layout.tsx` — i.e. it's de facto shared, just parked under `modules/admin` instead of a common folder.

**Verdict**: Modal/ConfirmDialog — needs adapter (prop renames, missing `isPending`). Toast — **compatible** (same hook shape, already reused cross-module; import from `@/modules/admin/components/ui/ToastProvider`).

### 4.3 Icons

- **Source**: `shared/components/icons.tsx` (961 lines) individually named-exports ~90 hand-rolled SVG components (`XIcon`, `CheckIcon`, `PencilIcon`, `TrashIcon`, etc.), each `(props: SVGProps<SVGSVGElement>) => JSX`, zero external deps.
- **Target**: a **different architecture entirely** — a single generic `components/ui/Icon.tsx` (20 lines) renders a **Material Symbols Rounded ligature glyph** — `<Icon name="grid_view" size={19}/>` → `<span className="material-symbols-rounded">grid_view</span>`, self-hosted via `@font-face` in `app/globals.css`. Neither repo pulls in lucide-react/heroicons/react-icons. No file in target exports per-icon named components matching the source's convention.

**Verdict: Fundamentally different** icon system app-wide, but low practical risk since `icons.tsx` has no internal dependencies — the pragmatic fix is porting the file wholesale into the target unchanged so every `import { XIcon } from "@/shared/components/icons"` keeps working with just a path fix. Cheaper than rewriting call sites to Material Symbols names.

### 4.4 API client & auth-token plumbing

- Both hand-rolled `fetch` wrappers (no axios/SWR) exposing the identical surface — `apiClient.get/post/put/patch/delete/postForm/uploadFile/downloadBlob` — both skip manual `Content-Type` for FormData, both check `res.ok` before `.blob()` (same rationale comment in both files).
- Source's `shared/lib/api-client.ts` takes an explicit `token?` param per call; target's `lib/api/client.ts` pulls the token internally via `getToken()` from `lib/auth/session.ts`, and additionally supports `params`/`AbortSignal`.
- **Envelope shape matches**: both expect `{success,message,data}` on success (target's `types/api.ts` `ApiSuccessEnvelope<T>` adds `timestamp`) and `{success:false,statusCode,errorCode,message,...}` on error — **except** source's error envelope carries an optional `details?: Record<string,number>` (used for 409-conflict breakdowns) that target's `ApiError` class does not capture at all; migrated code reading `error.details` needs that field added (small, additive).
- 401 handling differs in mechanism (source: global React Query `onError` in `query-client.ts`; target: `emitUnauthorized()` event from inside `client.ts`) but has the same net effect.
- Token storage differs in shape (source's `tokenStorage`: two-key + `subscribe()` pub/sub; target's `session.ts`: one combined object, no subscribe) — only matters for code bypassing `apiClient` to touch storage directly.

**Verdict: Needs adapter**, but shallow — code that only calls `apiClient.*` methods ports with an import-path change; the `details` field gap is the one real functional loss to patch.

### 4.5 React Query

- Both repos pin `@tanstack/react-query` **^5.101.4** — identical version.
- Source: `makeQueryClient()` (`shared/lib/query-client.ts`) with custom no-retry-on-4xx logic, `staleTime 30s`, `gcTime 5m`, global 401 `onError`; per-module `query-keys.ts` + `hooks/use<Feature>Queries.ts` + `services/`.
- Target: simpler `QueryProvider.tsx` (`staleTime 30s`, flat `retry:1`, no custom onError — 401 handling lives in `client.ts` instead); per-module convention confirmed in `modules/placement/api/` — a `queryKeys.ts` key-factory (`placementKeys`) with `useQuery`/`useMutation` colocated directly inside each `api/<feature>.ts` alongside its fetch function and types, rather than a separate `hooks/` folder.

**Verdict: Compatible.** Same library/version, same key-factory idiom, same per-module colocation philosophy — only the folder split (services+hooks vs combined `api/`) differs, which is cosmetic.

### Overall infrastructure risk ranking

1. **Icons is the hard blocker to first compile** — but cheap to fix (copy `icons.tsx` in, zero deps). Do this first.
2. **PlacementTable → DataTable is the real ongoing cost** — not a one-time shim; effort scales with number of tables, not modules.
3. Modal/ConfirmDialog and the API client's missing `details` field are small, mechanical renames.
4. Toast and React Query are near drop-in.
5. Nothing here is fundamentally incompatible at the architecture level (fetch+Bearer+`{success,data}` envelope and React Query are shared DNA between both apps).

---

## 5. What's missing in EOS-web-frontend — full module inventory

These 18 modules exist in `EOSfrontendweb/src/modules/` and have **no equivalent at all** in `EOS-web-frontend/src/modules/` (confirmed absent from its listing: admin, advisor, billing, edc, gate-warden, higher-education, hod, hostel-warden, hr, library, media-room, medical-centre, placement, principal, secretary, sports-admin, student, transport).

### Empty scaffolding — nothing to migrate

| Module | Status |
|---|---|
| `attendance` | 4 files, all `.gitkeep`. Route dir also `.gitkeep`. Zero imports, zero backend calls. |
| `examination` | Same — 100% empty scaffold. |
| `fees` | Same — 100% empty scaffold. |
| `notifications` | Same — 100% empty scaffold. |
| `team-recruitment` | Same — 100% empty scaffold. |

### Small, clean, real — safe to migrate first

| Module | Size | Depends on | Backend | Notes |
|---|---|---|---|---|
| `quotas` | 3 files (hooks, services, types — no components) | none | `/quotas` | Purely headless, no route anywhere. Consumed by `students`. Smallest real module. |
| `batches` | 7 files | none outgoing | `/batches` | No dedicated route (`.gitkeep` in `app/(dashboard)/batches`). Consumed by `students`. |
| `classes` | 7 files | none outgoing | `/classes` | Same shape as batches. |
| `courses` | 7 files | none outgoing | `/courses` | Same shape as batches. |
| `departments` | 7 files | none outgoing | `/departments` | High fan-in from other in-scope modules (`faculty`, `iqac`, `students`) and several out-of-scope ones. |
| `auth` | 5 files (`LoginForm.tsx`, `useAuthUser.ts`, `useLogin.ts`, `auth.service.ts`, `types/index.ts`) | none | `/auth/login`, `/auth/me` | Lives under `app/(auth)/login`, not `(dashboard)`. Defines the `Role` union and `AuthUser` type — imported by academic-coordinator/faculty/hostel/iqac shells for role-gating. Structurally load-bearing despite small size; needs reconciling against target's separate, incompatible auth system (§3). |

> Note: `batches`/`classes`/`courses` each independently duplicate CRUD calls that `academic-structure` *also* makes to the same endpoints (`academic-structure` has its own parallel `listDepartments/listBatches/listClasses/listCourses`). Possible pre-existing duplication in the source, worth a decision on whether to keep both or consolidate during migration.

### Medium — need Tier-1 modules present, and new routing on the target side

| Module | Size | Depends on | Backend | Notes |
|---|---|---|---|---|
| `admissions` | 5 files | none outgoing | `/certificate-types`, `/hostel-room-types`, `/soa-applications`, `/transport-stages` | Real wizard, but **has no route of its own** in the source — only mounted under `app/admin/students/admit/*` (out-of-scope `admin` tree). Migrating brings working library code but no page to reach it; target needs new routing. |
| `students` | 13 files | `admissions`, `batches`, `classes`, `courses`, `departments`, `quotas` (all via hooks in `EditProfileModal.tsx`/`StudentFilters.tsx`) | `/certificates` + more | Most cross-module-entangled of the small modules (6 dependencies). Like admissions, its only current route lives in out-of-scope `admin`. |
| `iqac` | 36 files | `auth`, `departments` (`useDepartments` in `OdFilters.tsx`, `VenueBookingFilters.tsx`) | `/venues/dashboard/live-status`, `/venues/dashboard/summary` + od/reports endpoints | Real, fully built, moderately self-contained. |
| `hostel` | 67 files | `auth` **only** | `/hostel/complaints`, `/hostel/dashboard/summary`, `/hostel/gate-log`, `/hostel/hostels`, `/hostel/mess-feedback` (+ rooms/residents/outings, same pattern) | Largest clean module — real, fully built, and despite its size the **cleanest dependency profile of any large module**. Could arguably migrate earlier than Tier ordering suggests; placed here for effort/size, not risk. |

### Highest risk — migrate last

| Module | Size | Depends on | Backend | Notes |
|---|---|---|---|---|
| `faculty` | 54 files (components×15 incl. wizard, hooks×10, lib×6, schemas×4, services×5, types×2, nav.ts, query-keys.ts) | `departments`, `auth`, **and `hr`** (out of scope) — `useHrRequests`, `useDeleteHrVacationEntry` in `MarkAttendanceModal.tsx`. Genuine two-way coupling: `hr/hooks/useHrRequests.ts` itself imports `facultyKeys` from `@/modules/faculty/query-keys`. | `/me/faculty`, `/me/faculty-mapping`, `/me/faculty-verification` (+ faculty-id-card, faculty-files) | Second-largest module. No dedicated own route (`.gitkeep`); mounted inside `academic-coordinator/(portal)/faculty`, `admin/faculty`, `hr/faculty-directory`, `hr/faculty-attendance`. **The `hr` dependency is a real functional blocker for one modal, not a trivial style import** — needs a decision (stub the modal, or bring a slice of `hr` over). |
| `academic-structure` | 17 files (components×10 incl. dept/course/batch/class dialogs, hooks×2, lib×2, services×1, types, query-keys) | `placement/lib/pageButtonStyle` (9 files), `students/hooks/useStudentCount` (2 files: `ClassDialog`, `StructurePanel`) | `/departments`, `/courses`, `/batches`, `/classes`, `/classes/:id/subjects`, `/me/faculty?department_id=...` | Real CRUD feature. Also consumed by `src/app/admin/academics/page.tsx` (out-of-scope `admin`) — one-directional, doesn't block migrating this module alone. |
| `academic-coordinator` | 37 files in `src/modules/academic-coordinator/` (components, context, hooks×14, lib, services×10, types) + 16 files in `app/(dashboard)/academic-coordinator/(portal)/` (11 route pages, 2836 lines total) | `academic-structure` (15+ call sites), `placement` (`lib/pageButtonStyle`, `components/table/PlacementTable` — **style/table utilities only**, ~13 call sites), `auth` (`useAuthUser`, `AuthUser`) | All via `apiClient`; routes namespaced `/me/coordinator/*` (attendance, audit, course-progress, faculty, mapping), plus `/academic-calendar*`, `/feedback/forms*` | **The actual migration target.** Fully real — 746 lines of service code, every route page substantial. Largest, most load-bearing module; nothing else in the codebase imports *from* it (true leaf/top-level consumer). Its transitive closure covers nearly every module above: `academic-structure` → `students` → `admissions`/`batches`/`classes`/`courses`/`departments`/`quotas`. |

### The one external dependency worth calling out specifically

`academic-coordinator` and `academic-structure` both hard-depend on the **out-of-scope** `placement` module (77 files) — but only for two small artifacts:

- `placement/lib/pageButtonStyle.ts` (15 lines)
- `placement/components/table/PlacementTable.tsx` (465 lines) — only its exported style helpers/types are actually used, not placement-specific logic.

Migrating all of `placement` to satisfy this would mean overwriting the target's own `placement` module, which (§6) is already ahead of the source's. **Recommended fix: extract just those two files into a shared location on the target side** (which has no `@/shared` directory — needs a new home under `@/lib/` or `@/components/`), rather than migrating the module they came from.

### Recommended migration order (combining the above)

1. **Tier 1** — `quotas`, `batches`, `classes`, `courses`, `departments`, `auth` (zero/near-zero cross-module deps). Skip the 5 empty stubs, or copy them as empty placeholders if useful for parity.
2. **Tier 2** — `admissions`, `students`, `iqac`, `hostel` (need Tier 1 present; `admissions`/`students` also need new routing since their only current mount is in out-of-scope `admin`).
3. **Tier 3** — `faculty` (needs the hr-coupling decision first), `academic-structure` (needs `students` + 2 files from `placement`), `academic-coordinator` (needs everything above — the actual target, highest risk and highest value).

---

## 6. Overlapping modules — six names exist in both repos

These six are the highest-risk collision points: naively copying the source's version over the target's could destroy real, independently-built functionality (or vice versa).

### admin

| EOSfrontendweb `(dashboard)/admin/` | EOS-web-frontend `(portal)/admin/` |
|---|---|
| no dashboard page (root unbuilt) | `dashboard/page.tsx` |
| no analytics (nav flags "soon") | `analytics/page.tsx` |
| no reports (nav flags "soon") | `reports/page.tsx` |
| `students` referenced in nav, no real page (dead link) | `students/page.tsx`, `students/[id]`, `students/admit`, `students/admit/[id]` |
| `faculty/*` (page, new, [id], [id]/edit, assignments, attendance, reports, settings) — delegates to top-level `src/modules/faculty/` | identical route set, backed by `src/modules/admin/components/faculty/` |

**Target is unambiguously more complete** — admission wizard, 15-20 section student-360 detail suite, faculty CRUD/ID-cards/import/verification, analytics/reports, a 25-30+ component UI kit. Source's admin is essentially a ~13-file dashboard+nav shell where only faculty is actually built (and even that's marked "soon" in its own nav).

**Collision risk**: `/admin/faculty/*` is an exact route match on both sides but backed by two different module trees with near line-for-line identical helpers (`fullName`, `DESIGNATION_OPTIONS`, `FacultyTable`, `FacultyQuickViewDrawer`) — a folder copy needs import-path rewrites, not a drop-in. Same-name/different-content files if merged naively: `AdminSidebar.tsx`, `AdminTopbar.tsx`, `nav.ts`, `lib/format.ts`, `AdminShell.tsx` (different nesting depth), `PendingNotice.tsx`, `KpiCard.tsx`, `QuickActionsCard.tsx`.

**Verdict: do not overwrite target's admin.**

### hr

Both sides share: dashboard, faculty directory(+new/[id]/edit), departments(+[id]), payroll, payslip-requests, requests, vacation-management, reports, criteria-library, faculty-attendance.

- **Source-only**: `employee-reviews/[id]` drilldown, per-department attendance drilldown, plus **academic-calendar, announcements, recruitment, onboarding-exits** — all four backed by `src/modules/hr/local/*-store.ts` (browser localStorage, **not** the real API).
- **Target-only**: Form 16, faculty-documents (split from PF).

**Target is more complete for what's real** (its 13 nav items are all genuinely API-backed); source has more breadth but 4 of its "extra" pages are single-browser mock prototypes, not shared-backend features.

**Collision risk**: no naming clashes. The real risk is porting those 4 localStorage features as if production-real — they'd regress an otherwise fully-real module unless real endpoints are built first.

**Verdict: leave alone; only port the 4 extras later if real endpoints exist, clearly labeled as mock until then.**

### library

Nearly identical on both sides: same routes (books, catalogue-setup, ebooks, history, issue, lost, members, overdue, reports, returns, settings) and same component filenames (`BookFilters`, `CategoryFormModal`, `RackFormModal`, `MemberNoDuesModal`). Both dashboards hit the same real endpoint `/library/dashboard/summary`. Only difference: source serves the dashboard at bare `library/page.tsx`; target uses `library/dashboard/page.tsx`.

**Verdict: equivalent — looks like the same build, kept in sync. Safest of the six to leave alone.** No collision risk found beyond the dashboard route-path difference.

### placement

Routes match closely (dashboard, companies, drives(+[id]/new), interviews(+[id]), offers, placements(+[id]), students(+[id]), reports, announcements, academic-calendar). **Target's own `nav.ts` contains a comment confirming this was already deliberately ported from the source once**, with `notifications` and `rounds` intentionally dropped as mock-backed/superseded. Since that port, target grew extra drive tooling (`DriveOverviewTab`, `DriveStudentsTab`, `AddApplicationModal`, `ImportApplicationsModal`) beyond source.

**Target is slightly ahead — leave it alone; do not copy source's placement module over it.**

**Collision risk**: source has a generic `components/table/PlacementTable.tsx` with a config-driven avatar/`leading()` cell renderer that target has no equivalent for (target uses the shared `DataTable`) — porting source's pages wholesale risks silently dropping that avatar UX. Chart-component naming drift: source's `OffersByMonthChart`/`PackageDistributionDonut`/`PlacementFunnelChart`/`SixYearTrendChart` vs target's `*Card`-suffixed renames — a copy would create duplicates. Worth double-checking: source's `notifications` page has a real hook+service despite target's port-comment calling it mock-backed.

### secretary — highest priority, most nuanced

| Named feature | EOSfrontendweb route | EOS-web-frontend route | Target status |
|---|---|---|---|
| Attendance marking | `secretary/attendance` | `secretary/attendance` | Real, different endpoints (`/me/attendance-records`+`/me/timetable-slots` vs source's `/me/attendance`+`/me/classes/{id}/roster`) |
| Media requests | `secretary/media-request` | `secretary/media` | Real (`/media-requests`), different slug |
| Proposals | `secretary/proposals` (1 page) | `secretary/pop` + `secretary/sop` (2 pages) | Real (`/me/purchase-requests`, `/me/service-requests`) |
| Venue booking | `secretary/venue-booking` | `secretary/venue` | Real (`/venues`, `/venue-bookings`), different slug |
| Reports | `secretary/reports` | `secretary/reports` | Page exists; no dedicated `api/reports.ts` found — wiring unconfirmed |
| Timetable | `secretary/timetable` (standalone grid) | **absent as standalone page** — slot data only used inline during attendance marking | **Genuine gap** |

Target additionally has ~19 pages entirely outside source's scope: accreditation, activity, announcements, calendar, dept, docs, emp-appraisal/attendance/leave/library/od/payroll/payslip, events, faculty(+[idx]), meetings, outpass, settings, students(+[roll]) — a much broader "office administrator" portal, per its own `fakeData.ts` file which documents an active, ~85%-complete fake-to-real conversion against the real backend (e.g. venue bookings explicitly noted as migrated off fake data onto real `/venues`+`/venue-bookings` endpoints). Outpass, docs register, events, and activity feed remain fake on the target.

**Neither side is "more complete" — different scope.** Source is a tight, newly-built 6-feature slice; target is a much larger (~27-page), mostly-real office-administrator portal that already covers 5 of the 6 named features.

**Collision risk**: `SecretaryNavItem`/`SecretaryNavGroup`/`SECRETARY_NAV`/`secretaryModuleConfig`/`SecretaryShell` exist on both sides with **incompatible shapes** (source: `id`+`icon:string`+`badge`, 3 nav groups; target: `icon:ComponentType`, no `id`/`badge`, 3 different groups) — a file copy will not type-check. All 4 overlapping features use different route slugs *and* different backend endpoints — each needs deliberate per-feature reconciliation, not a copy in either direction.

**Verdict: source's standalone timetable grid is the one piece genuinely worth porting into the target.**

### transport

Source's transport module is 100% empty scaffold — every file under `src/modules/transport/{components,hooks,services,types}/.gitkeep` and `src/app/(dashboard)/transport/.gitkeep` is 0 bytes. Target has a complete, real 7-route module (dashboard, buses+[id], routes, drivers, maintenance, compliance) fully wired to react-query against real endpoints, with graceful degradation when backend extensions are disabled.

**Verdict: no contest — nothing to migrate. Only risk is a migration script blindly overwriting target's real module with source's empty tree.**

### Ranked risk (highest → lowest)

1. **secretary** — both sides real, 4 features overlap with different routes/endpoints/incompatible nav types; needs deliberate per-feature reconciliation. Source's standalone timetable is the one real gap worth porting.
2. **hr** — real module that would silently gain 4 non-backed localStorage-mock pages if merged carelessly.
3. **admin** — least ambiguous winner, but highest blast-radius if reversed (would delete the admissions wizard/student-360/analytics/UI-kit).
4. **placement** — already a documented, deliberate prior port; just verify the "notifications" mock-vs-real discrepancy and the `PlacementTable` avatar-cell gap.
5. **library** — near-identical, both real, in sync. Safe to leave.
6. **transport** — source side is empty scaffolding. Zero risk either direction.

---

## 7. Decisions needed before any file moves

1. **Confirm the target's actual `NEXT_PUBLIC_API_BASE_URL` value** — both repos declare the same variable name; its configured value wasn't read. If it points somewhere other than EOSbackend1, every migrated page's data-fetching needs rethinking, not just its imports.
2. **Confirm the backend already exposes what Academic Coordinator needs** — the coordinator-specific routes (`/me/coordinator/*`, academic-calendar, feedback forms) are this session's own recent work on EOSbackend1; very likely present, but confirm against whichever backend the target's frontend actually calls.
3. **Scope the Secretary reconciliation** — cherry-pick just the standalone timetable page (the one clear gap), or go feature-by-feature across all four overlapping areas?
4. **Decide the Faculty↔HR coupling** — stub the one attendance-marking modal that depends on `hr`, or bring a slice of HR along with it?
5. **Confirm the placement-file extraction** — pull just `pageButtonStyle.ts` + `PlacementTable`'s style/type exports into a new shared location on the target side (which has no `@/shared` directory today); agree on where that home should live.
6. **Push EOS-web-frontend's 33 local commits** — housekeeping, unrelated to the migration itself, but worth doing before this directory sees heavier change.
7. **Sign off on plain file copy as the migration mechanism** over the git-history-preserving alternatives in §1.

---

## Appendix: methodology

Produced from five parallel read-only research passes:

1. Tooling & routing architecture
2. Shared UI/API infrastructure
3. Overlapping role modules (admin, hr, library, placement, secretary, transport)
4. Migration-candidate module inventory (everything source-only)
5. Git/deploy mechanics

No file in either repository was written, edited, staged, committed, or pushed while producing this audit.

**One flag, low concern**: both repos' `AGENTS.md` contains a block instructing agents to consult local Next.js docs before writing code and to keep that file in future diffs. One research pass called this worth a second look. It arrived through the standard, sanctioned project-instructions file — not hidden in a data file or fetched content — and the actual instruction is benign (read local docs, don't delete a comment file), so nothing was acted on beyond noting it here.
