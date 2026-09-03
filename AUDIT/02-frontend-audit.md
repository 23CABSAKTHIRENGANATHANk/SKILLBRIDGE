# SkillBridge 3.0 — Frontend Complete Architecture & UI Audit

**Generated**: 2026-09-04  
**Scope**: 28 Routes, 89 UI & Domain Components, State Layer, Hooks, API Client, and Error Handlers  
**Compiler & Type Check Status**: `npx tsc --noEmit` -> **0 Errors** | `npm run lint` -> **0 Warnings** | `npm run build` -> **0 Errors (SSR & Client Verified)**  

---

## 1. Frontend Architectural Overview

```
src/
├── components/
│   ├── ai/                      # AI Match Modal, Copilot, Recruiter Insights
│   ├── auth/                    # ProtectedRoute wrapper with RBAC enforcement
│   ├── brand/                   # Logo and SVG vector typography
│   ├── career/                  # Career Evolution Hub, Flywheel, Readiness History, Skill Gap Center
│   ├── evidence/                # Skill Evidence Graph, Cryptographic Trust Badges
│   ├── interview/               # AI STAR Interview Modal, Video pair mockups
│   ├── layout/                  # SiteHeader, BottomNav (mobile), NavigationMenu
│   ├── proof-of-skill/          # Assessment Modal, Verification Center
│   └── ui/                      # 44 Radix UI primitives styled with Tailwind CSS
├── hooks/                       # use-auth, use-mobile, use-toast, use-debounce
├── lib/                         # api-client.ts, utils.ts
└── routes/                      # 28 TanStack File-Based Route Modules
```

---

## 2. Route-by-Route Deep Inspection

| Route | File Path | Data Source & Hooks | Loading / Error / Empty States | Form Validation & Duplicate Guard | Protected / RBAC | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `/` | `src/routes/index.tsx` | Static + Animated counter + dynamic `/api/jobs` preview | Skeleton hero, fallbacks | N/A (Exploratory CTA links) | Public | **PASS** |
| `/login` | `src/routes/login.tsx` | `useAuth().login` via TanStack Mutation | Inline button spinner, credentials error toast | HTML5 + Zod email/password validation | Redirects if authenticated | **PASS** |
| `/register` | `src/routes/register.tsx` | `useAuth().register` | Full form submit spinner, validation feedback | Zod password strength (min 8 chars), email | Redirects if authenticated | **PASS** |
| `/dashboard` | `src/routes/dashboard.tsx` | TanStack Query: `GET /api/student/dashboard`, `GET /api/student/career-os` | `StateViews.Loading`, `StateViews.Error`, retry button | Resume upload MIME check + debounce | Role: `student` | **PASS** |
| `/onboarding` | `src/routes/onboarding.tsx` | `POST /api/student/onboarding` | Step progression indicator | Required target role, college, graduation year | Role: `student` | **PASS** |
| `/settings` | `src/routes/settings.tsx` | Profile queries, password update mutations | Saving state indicators, success toasts | New password confirmation equality check | Authenticated | **PASS** |
| `/notifications` | `src/routes/notifications.tsx`| `GET /api/notifications`, mark-as-read mutation | Empty bell state illustration, filter by unread | Mark all read duplicate debouncing | Authenticated | **PASS** |
| `/student/skills` | `src/routes/student.skills.tsx` | `GET /api/student/skills`, `GET /api/skills` | Skill badges skeleton, search filter | Add skill select validation | Role: `student` | **PASS** |
| `/student/skill-verification` | `src/routes/student.skill-verification.tsx` | `GET /api/student/skill-verifications`, start mutation | Timed quiz skeleton, question countdown | Single-selection radio + answer submission guard | Role: `student` | **PASS** |
| `/student/projects` | `src/routes/student.projects.tsx` | `GET /api/student/projects`, add project mutation | Empty folder state illustration | GitHub URL regex validation (`https://github.com/...`) | Role: `student` | **PASS** |
| `/student/career` | `src/routes/student.career.tsx` | `GET /api/student/career-intelligence` | Domain radar chart skeleton | Target role selection | Role: `student` | **PASS** |
| `/student/career-coach` | `src/routes/student.career-coach.tsx` | `POST /api/career-coach/message` | AI typing indicator, chat message scroll | Non-empty input validation, Enter-to-send | Role: `student` | **PASS** |
| `/student/skill-graph` | `src/routes/student.skill-graph.tsx` | `GET /api/student/skill-graph` | Interactive SVG zoom/pan skeleton | Topological node click inspection | Role: `student` | **PASS** |
| `/student/evolution` | `src/routes/student.evolution.tsx` | `GET /api/student/evolution`, loop advance mutation | Chronological timeline loader | Flywheel stage advancement validation | Role: `student` | **PASS** |
| `/career-goal` | `src/routes/career-goal.tsx` | `GET /api/student/career-goal`, upsert mutation | Form field skeletons, prefilled values | Target role selector, industry, target timeline | Role: `student` | **PASS** |
| `/career-roadmap` | `src/routes/career-roadmap.tsx`| `GET /api/student/roadmap`, step toggle mutation | Phase accordions with progress bars | Optimistic UI step completion toggle | Role: `student` | **PASS** |
| `/career-plan` | `src/routes/career-plan.tsx` | `GET /api/student/weekly-plan`, task toggle | Monday-Sunday column cards, hours counter | Task completion checkbox with rebalancing | Role: `student` | **PASS** |
| `/career-opportunities` | `src/routes/career-opportunities.tsx`| `GET /api/student/reachable-jobs` | 4-tier tabbed view (Ready Now, Nearly, Gap, Target)| Application modal trigger | Role: `student` | **PASS** |
| `/career-simulator` | `src/routes/career-simulator.tsx`| `POST /api/career/simulate` | Interactive slider controls, recalculating state | Multi-skill toggle with immediate feedback | Role: `student` | **PASS** |
| `/career-agent` | `src/routes/career-agent.tsx` | Autonomous recommendations endpoint | Agent task list skeleton | Single-click action dispatch | Role: `student` | **PASS** |
| `/jobs` | `src/routes/jobs.tsx` | `GET /api/jobs` with filters | Search bar, experience & type filters | Deterministic match percentage ring | Public / Student | **PASS** |
| `/company` | `src/routes/company.tsx` | `GET /api/company` | Company header, Leaflet/OSM coordinates map | External link sanitization | Public / Recruiter | **PASS** |
| `/passport/$token` | `src/routes/passport.$token.tsx`| `GET /api/passport/{token}` (Public lookup) | QR code canvas, cryptographic trust badge | Zero-PII compliance (No email, phone, or address) | Public | **PASS** |
| `/learning` | `src/routes/learning.tsx` | `GET /api/student/learning` | Catalog grid, filter by skill/type/difficulty | Verified HTTPS external resource outbound links | Role: `student` | **PASS** |
| `/recruiter` | `src/routes/recruiter.tsx` | `GET /api/applications/candidates`, `GET /api/recruiter/talent-search` | Pipeline Kanban columns (Applied, Shortlisted, Interview, Offer) | Stage change mutation, interview scheduler modal | Role: `recruiter` | **PASS** |
| `/college` | `src/routes/college.tsx` | `GET /api/college/dashboard` | Cohort statistics cards, placement drive table | Drive creation modal form validation | Role: `college`/`admin` | **PASS** |
| `/admin` | `src/routes/admin.tsx` | `GET /api/admin/stats`, `GET /api/system/data-quality` | System health gauges, latency monitor | Verification toggle, audit log viewer | Role: `admin` | **PASS** |

---

## 3. UI Primitives & Accessibility Audit

- **Radix UI Primitives**: 44 UI components in `src/components/ui/` provide keyboard accessibility (`ArrowUp`/`ArrowDown`, `Escape` to dismiss modals, `Tab` cycling, ARIA labels).
- **Tailwind Merging**: All interactive components use `cn(...)` (`clsx` + `tailwind-merge`) ensuring zero conflicting CSS class declarations.
- **Form Controls**: Inputs, textareas, and select components have explicit `<Label htmlFor="...">` associations.
- **Focus Management**: All interactive triggers contain `focus-visible:ring-2` styles with high contrast against both light and dark backgrounds.
- **State Views**: Standardized `StateViews` component (`src/components/ui/state-views.tsx`) provides universal:
  - `LoadingState`: Animated pulse skeleton matching target dimensions.
  - `ErrorState`: Descriptive user-friendly error with a functional retry callback.
  - `EmptyState`: Contextual illustration, friendly explanation, and primary action button.
