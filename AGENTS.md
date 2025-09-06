# Repository Guidelines

## Project Structure & Module Organization
- app/: Next.js App Router routes and pages.
- components/: Reusable UI (PascalCase files, co-located styles).
- lib/: Utilities, API clients, helpers (camelCase modules).
- types/: Shared TypeScript types and schemas.
- public/: Static assets served at '/'.
- middleware.ts: Edge middleware for auth/routing.
- Config: next.config.js, tailwind.config.ts, tsconfig.json, .eslintrc.json, .prettierrc.

## Build, Test, and Development Commands
- pnpm dev: Run local dev server with hot reload.
- pnpm build: Create optimized production build.
- pnpm start: Start Next.js in production mode.
- pnpm lint: Run ESLint + Prettier rules.

## Coding Style & Naming Conventions
- Language: TypeScript (strict). React 18 + Next 13 App Router.
- Formatting: Prettier (single quotes, semicolons, 80 cols, trailingComma: es5).
- Linting: ESLint (react, @typescript-eslint, prettier). Fix warnings before PR.
- Naming: Components PascalCase (e.g., components/UserMenu.tsx); functions/vars camelCase; types/interfaces PascalCase in types/.
- Paths: Use '@/*' alias from tsconfig.

## Testing Guidelines
- Current status: No test runner configured.
- Recommendation: Vitest + React Testing Library. Name tests *.test.ts(x) alongside source or under __tests__/. Add pnpm test script when introduced.

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commits (feat, fix, chore, refactor, docs). Example: feat(auth): add GitHub OAuth callback guard.
- Scope: Keep commits focused; run pnpm lint before committing.
- PRs: Include summary, linked issues, screenshots/GIFs for UI changes, and notes for migrations or env updates. Request review once CI/lint pass.

## Security & Configuration Tips
- Env vars: Copy .env.local.example to .env.local and set values. Example keys: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, AUTH_GITHUB_ID/SECRET, NEXT_PUBLIC_FINATRA_API_URL.
- Do not commit secrets. If adding a new required var, update .env.local.example and README.md.
- API/Edge: Be mindful of middleware.ts and server components; avoid leaking secrets to client (only NEXT_PUBLIC_* in browser code).

## Architecture Overview
- Stack: Next.js 13.5, Tailwind CSS, Radix UI, Supabase, OpenAI/LangChain.
- Data: Supabase client via lib/; types in types/; shared UI in components/. Keep side effects (I/O) in lib/ and keep components presentational where possible.

