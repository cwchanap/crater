# Repository Guidelines

## Project Structure & Module Organization

The monorepo follows a Turborepo layout. `apps/` holds end-user targets: `crater-web` (SvelteKit front end), `crater-ext` (VS Code extension bundling a webview), and `crater-image-editor` (Svelte editor consumed by the extension). Shared logic lives in `packages/`, chiefly `@crater/core` for TypeScript utilities and `@crater/ui-components` for reusable Svelte UI. Docs live in `docs/`.

## Build, Test, and Development Commands

Run `pnpm install` once to hydrate workspaces. Workflows:

- `pnpm dev --filter crater-web` starts the SvelteKit dev server; swap the filter for another app when needed.
- `pnpm build` executes `turbo build` and produces artifacts (`dist/`, `.svelte-kit/`, `out/`) across projects.
- `pnpm test` fans out to Vitest and VS Code extension test harnesses via Turborepo.
- `pnpm lint`, `pnpm type-check`, and `pnpm format:check` keep quality gates green before opening a PR.
- `pnpm clean` clears cached builds when toolchains get confused.

## Coding Style & Naming Conventions

Formatting is enforced by Prettier (`.prettierrc`): 4-space indentation for TypeScript/JavaScript, 2-space for Svelte, stylesheets, and Markdown; single quotes and no semicolons. ESLint (`eslint.config.js`) layers TypeScript-aware rules—use `const` over `let` where possible, avoid `any`, and prefix intentionally unused values with `_`. Svelte components follow PascalCase filenames (e.g., `Button.svelte`), while modules in `@crater/core` stay in kebab-case directories with camelCase exports.

## Testing Guidelines

Unit tests use Vitest (`*.test.ts`) in packages and Svelte apps; run `pnpm --filter @crater/core test` or `pnpm --filter crater-web test:unit` for targeted checks. The VS Code extension relies on `@vscode/test` via `pnpm --filter crater-ext test`; ensure the build step succeeds first because compiled output under `dist/` is exercised. Add regression tests alongside new features and prefer browser-based Vitest suites for webview behavior when DOM APIs are involved.

## Commit & Pull Request Guidelines

Follow Conventional Commits as seen in history (`feat:`, `fix:`, `docs:`). Keep commit scopes narrow and code formatted before committing so Husky’s lint-staged hook passes. PRs should include a concise summary, screenshots or screen recordings for UI-affecting changes, linked issues when available, and a checklist of commands run (build, test, lint). Mention any follow-up tasks so reviewers understand remaining risks.

## Configuration & Secrets

The VS Code extension reads provider credentials from user settings (`crater-ext.geminiApiKey`, `crater-ext.openaiApiKey`). Never commit real keys or generated assets meant for demos; use `.gitignore`d paths such as `apps/crater-ext/edited-images/`. Document required environment tweaks in `docs/` or the PR description to keep agent hand-off smooth.
