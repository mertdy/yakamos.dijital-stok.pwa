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
