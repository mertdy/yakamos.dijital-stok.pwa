# AGENTS.md

# AI Operating Instructions

This file is the only document that should always be loaded.

## Primary Goal

Produce maintainable, scalable and production-ready code while minimizing unnecessary context usage.

Do not read every documentation file automatically.

Only load the documentation that is required for the current task.

---

# Documentation Routing

Read documents only when necessary.

| Task | Read |
|-------|------|
| Project overview | README.md |
| Folder layout | PROJECT_STRUCTURE.md |
| Architecture decisions | ARCHITECTURE.md |
| Business requirements | SRS.md |
| System design | DESIGN_DOCUMENT.md |
| Feature implementation | FEATURES.md |
| Database / Firestore | API.md |
| Coding conventions | CONVENTIONS.md |
| ADR / reasoning | DECISIONS.md |
| Future plans | ROADMAP.md |
| Terminology | GLOSSARY.md |

Never load every document unless explicitly requested.

---

# Required Reading

Always read:

- AI_CONTEXT.md

Everything else is optional.

---

# Documentation Maintenance

Whenever a significant architectural or business change is made:

Update only affected documents.

Never rewrite every document.

Example:

New Firestore Collection

Update:

- API.md
- DESIGN_DOCUMENT.md
- SRS.md

Do not modify unrelated documentation.

---

# Development Rules

Always:

- Prefer simple solutions.
- Avoid duplicated logic.
- Keep files cohesive.
- Prefer composition.
- Use existing project patterns.

---

# Before Writing Code

Determine which documentation is actually needed.

Load only those files.

Do not load every markdown file.

---

# Output Quality

Generated code must be:

- Production ready
- Typed
- Tested
- Readable
- Maintainable

Never sacrifice readability for brevity.
