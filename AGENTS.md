## Agent skills

### Issue tracker

Issues and specs for this repo live as GitHub issues, driven via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary, five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one root `CONTEXT.md` plus `docs/adr/` for ADRs. See `docs/agents/domain.md`.

## Working preferences

The user starts the dev server themselves — never launch it on their behalf. In hand-offs, give the command to run and what to look for, but don't start the app.
