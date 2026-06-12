# Tasks

1. [x] Add an `architecture` delta spec at `openspec/changes/allow-cross-feature-imports-via-barrels/specs/architecture/spec.md` with a `## MODIFIED Requirements` section.
2. [x] Replace the "Cross-cutting imports are exceptional" requirement in `openspec/specs/architecture/spec.md` with a barrel-only cross-feature rule.
3. [x] Update the "Dependency direction is layered" requirement in `openspec/specs/architecture/spec.md` to remove the implication that cross-feature imports are exceptional, and update its reference paragraph at the bottom.
4. [x] Update the supporting scenarios under the replaced requirement so the wording reflects the new barrel-only rule.
5. [x] Run `npm run format`, `npm run typecheck`, `npm run lint`, and `npm run test` to make sure no source code is left in a broken state by the spec change.
6. [x] Archive the change with `opsx-archive allow-cross-feature-imports-via-barrels` once the spec is applied and verified.
