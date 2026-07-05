# CLAUDE.md — Cadence

Cadence is an offline-first day planner built with React Native (Expo + TypeScript).
It auto-schedules flexible tasks around fixed ones, re-plans the day when things slip,
and speaks reminders aloud (TTS). No backend, no paid APIs — everything runs on-device.

## Hard Rules (non-negotiable)

### Git
- `auto_commit: false` (see `.agent/config.yml`). NEVER run git write operations
  (add, commit, push, merge, rebase, reset, tag). Leave all changes for the user
  to commit manually. Read-only git commands (status, log, diff, show) are fine.

### Processes
- NEVER kill dev servers, Metro bundlers, emulators, or watchers after running
  tests or finishing a task. Leave running processes alone; the user manages them.

### Workflow (Superpowers)
- Follow `.agent/rules/` and `.agent/skills/` — index in `.agent/rules/superpowers.md`.
- New feature flow: brainstorm → design spec (`docs/superpowers/specs/`) →
  implementation plan (`docs/superpowers/plans/`) → TDD execution → verification.
- Bug fixes: present Root Cause + Evidence + Proposed Fix + Risk Assessment and
  WAIT for user confirmation before writing any fix code
  (`.agent/rules/debug-confirmation-policy.md`).
- Never claim something works without running the verification command and
  reading its output (`verification-before-completion` skill).
- After each work session, append an entry to `progress.md` (date, what was done,
  decisions made, next steps). Factual and short — no fluff.

### Language
- Respond to the user in Vietnamese (mirror their language).
- Code, comments, commit messages, branch names, file names: English.
- User-facing UI copy in the app: Vietnamese first.

## Code Standards
- TypeScript strict mode. No `any` unless unavoidable — justify with a comment.
- No dead code, no commented-out blocks, no placeholder comments
  (`// TODO: implement later`), no unused exports or dependencies.
- Business logic lives in `src/core/` as pure TypeScript (no React imports),
  fully unit-testable. UI components stay thin.
- One responsibility per file. Prefer small focused files over large ones.
- Follow the anti-patterns table in `.agent/skills/mobile-developer/SKILL.md`
  (FlatList over ScrollView, native-driver animations, no secrets in
  AsyncStorage, loading/error states for all async operations, etc.).
- Tests: TDD for all `src/core/` logic (Jest). Watch tests fail before implementing.

## Design Principles (user's explicit direction — treat as hard requirements)
- Natural, realistic, easy to use. Must feel hand-crafted by a human designer,
  NOT AI-generated.
- Smooth polished animations: react-native-reanimated, spring-based physics,
  always respect Reduce Motion.
- BANNED (AI-slop tells): purple/blue gradient heroes, glassmorphism sprinkled
  everywhere, emoji-heavy copy, sparkle/✨ AI iconography, robotic marketing-speak
  microcopy, identical rounded-card grids, decorative elements with no function.
- All copy must read like a real person wrote it — plain, warm, specific.
  If a sentence sounds like a chatbot or a pitch deck, rewrite it.
- Platform conventions per `.agent/skills/mobile-uiux-promax/SKILL.md`:
  touch targets ≥ 44pt/48dp, safe areas, haptics, dark mode, accessibility labels.

## Architecture Constraints
- 100% free and offline: no backend, no API keys, no paid services.
  On-device only: SQLite, expo-notifications, expo-speech (TTS), OS speech-to-text.
- The scheduling engine is deterministic TypeScript (constraint-based packing),
  not an LLM. Natural-language input is handled by a hand-written Vietnamese
  parser in `src/core/`.
- Scratch/temporary scripts go in `.agent/tmp/`, never in `/tmp/`.
