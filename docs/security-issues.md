# Security advisories and tracking

This document tracks known security advisories, planned mitigations and ownership.

## Current notable advisories

- rsa crate timing side-channel advisory (reported in dependency graph)
  - Impact: transitive dependency may expose timing side-channel; severity depends on usage surface.
  - Status: under monitoring
  - First triage: run `cargo audit` and inspect `cargo-audit-report` artifacts from CI.
  - Recommended action: if an updated version is available, update the depending crate(s) and run full test matrix; otherwise consider applying short-term mitigations (runtime guarding, reducing exposure surface) and monitor upstream fixes.

## Automation

- A scheduled `cargo-audit` workflow has been added at `.github/workflows/cargo-audit.yml` to run weekly and on-demand via workflow_dispatch. It uploads a JSON report as `cargo-audit-report` artifact for maintainers.

## Owner

- Security owner: @Ch3fUlrich (update as needed)

## How to triage

1. Download the artifact from the latest cargo-audit workflow run.
2. Inspect `cargo-audit.json` for `advisories` entries; identify affected crates and minimal upgrade paths.
3. Open a PR to update the affected dependency (pin to patched version) and include changes to CHANGELOG if needed.
4. Run `cargo test --workspace` and CI checks. If updating is not possible, document mitigation and add follow-up issue.

## Follow-ups (manual)

- [ ] If an advisory requires a breaking change, schedule a maintenance window and/or create a compatibility shim.
- [ ] Consider adding a regular Dependabot/Cargo update cadence (already configured) and configure automerge rules carefully.
