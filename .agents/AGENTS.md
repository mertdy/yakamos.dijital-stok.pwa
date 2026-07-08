# Project Scoped Rules

## Plan and Artifact Persistence

Whenever you create or update the following planning artifacts:

- `implementation_plan.md`
- `task.md`
- `walkthrough.md`
- `srs.md`
- `design_document.md`

You MUST maintain copies of these files in the project's `.agents` directory (`/Users/mertdy/Desktop/dijital-stok/.agents`).
When you update these artifacts in your system directory, you must also synchronize those changes to the versions in the `.agents` directory. The user expects them to be visible and tracked in that folder.

## Component Testing

Whenever you create a new React component, you MUST write its accompanying unit tests (e.g. `ComponentName.test.tsx`) in the same directory. Test its main functionality, edge cases, and accessibility attributes.

## Feature Module Exports (Barrel Imports)

When working with features inside the `src/features/` directory:

- Every feature folder must define a public API by exporting its components, stores, hooks, views, and types in a root `index.ts` file (barrel export).
- **Cross-feature imports**: Files outside a given feature directory (such as other features, shared folders, or `App.tsx`) MUST import using the feature's root module path (e.g., `import { X } from '@/features/feature-name'`). Deep imports to feature subpaths (e.g., `@/features/feature-name/store/X`) from the outside are strictly prohibited.
- **Internal imports**: Files inside a feature directory MUST import other elements of the *same* feature using relative imports (`./` or `../`) or specific subpaths to prevent circular dependencies at build/runtime. They must never import from `@/features/feature-name` (their own barrel).

## Quality Assurance & Verification Cycle

To ensure codebase stability, prevent regressions, and enforce strict code quality, you MUST execute the following verification steps whenever you generate, modify, or delete code:

1. **Format and Lint (Targeted):**
   - Run `npx prettier --write <path-to-modified-files>` only on the files you have added or modified.
   - Run `pnpm lint` to check for syntax and style issues. If lint errors are found, fix them immediately.

2. **Test Cycle (Targeted & Global):**
   - **New Features:** Whenever you add a new feature, component, hook, or utility, you MUST write its accompanying unit tests in the same directory (as described in the "Component Testing" rule).
   - **Deleted Features:** If you remove or refactor away a feature, you MUST clean up, refactor, or delete the corresponding test files/blocks. No orphaned or broken tests should remain.
   - **Targeted Test Execution:** Run `pnpm test -- <path-to-modified-test-files>` first to verify your changes locally and quickly.
   - **Global Test Execution:** Once targeted tests pass, run the full test suite with `pnpm test` to ensure no regressions were introduced.

3. **Build Verification:**
   - Run `pnpm build` to compile the TypeScript project and verify there are no compilation or bundling errors.

4. **Self-Correction & Iteration Limit:**
   - If any step (lint, test, or build) fails, analyze the compiler output, lint errors, or test failures, and fix the code.
   - You are allowed a maximum of **3 cycles** of self-correction. If the project still does not build, lint, or pass tests after 3 attempts, STOP and ask the user for assistance, providing the failure logs and what you attempted.

5. **Success Confirmation:**
   - Once all steps (lint -> test -> build) pass successfully with zero errors, confirm success to the user with a summary of the checks performed.
