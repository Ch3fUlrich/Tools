# Manual TODOs / Admin Steps

This file lists manual steps you (a repo admin or maintainer) must perform outside of automated workflows.

1) Repository settings (must be done in GitHub UI)
  - Enable "Squash and merge" and consider making it the default merge method. This satisfies the "combine commits into a single one" requirement.
  - Add branch protection for `main`:
    - Require status checks to pass (include `PR Commit Message Lint` and CI checks).
    - Require pull request reviews before merging.
    - Optionally require linear history and dismiss stale reviews.

2) Configure GHCR permissions (if your organization restricts GITHUB_TOKEN)
  - Create a Personal Access Token (PAT) with at least the following scopes:
    - repo (if private repo operations are needed)
    - write:packages and read:packages (to push to GitHub Container Registry)
  - Run locally (with `gh` CLI installed and authenticated):
    - ./scripts/setup-ghcr-secret.sh --repo OWNER/REPO --token <PAT>
    - This will create/update the repo secret `GHCR_PAT` used by the CD workflow.

3) Local developer setup (one-time per developer)
  - From repo root:
    - pnpm install
    - pnpm run prepare
  - After that Husky will install Git hooks and the `commit-msg` hook will run commitlint on local commits.

4) Signing policy & cosign
  - We configured keyless cosign signing in CI (OIDC-based). Keyless signing is free and uses Sigstore services.
  - If you require KMS-backed keys (AWS KMS, GCP KMS, Azure Key Vault) or hardware-backed keys (HSM), add a cosign key and update the CD workflow to use it. That will require storing credentials/secrets in the repo or using the cloud provider's IAM + OIDC.

5) Running a test tag push (REQUIRES YOUR CONFIRMATION)
  - Pushing a tag like `v0.0.0-test` to `origin` will trigger the publish workflow and attempt to build, push, and sign images. This WILL publish to GHCR if credentials allow.
  - Safe steps to prepare (recommended):
    - Ensure `GHCR_PAT` secret exists (or verify `GITHUB_TOKEN` can push to GHCR in your org).
    - Optionally point the CD workflow to a test registry by editing the workflow temporarily to use a non-production registry.
  - If you want me to perform the test tag push from this environment, confirm explicitly. I will then:
    - create a local lightweight tag `v0.0.0-test` and push it to `origin` (you must have push rights and network access from this environment).
    - or provide the exact commands for you to run locally if you prefer.

6) Post-release checks
  - After a tag/publish run, verify images exist in GHCR and the cosign signatures are present by running `cosign verify --keyless ghcr.io/OWNER/tools-backend:TAG`.

7) Security follow-ups (manual)
  - There's an outstanding advisory for `rsa 0.9.8` (timing side-channel) noted during audits. Monitor upstream for a patch or follow recommended mitigations. Consider an allowlist/denylist, additional runtime mitigations, and communicate with your security team.

8) Automatic dependency updates (Dependabot)
  - A Dependabot configuration file (`.github/dependabot.yml`) has been added to open PRs daily for:
    - `frontend` (pnpm)
    - `backend` (cargo)
  - Dependabot PRs will trigger your normal CI checks. An `automerge-dependabot` workflow was added; it enables auto-merge (squash) for Dependabot PRs once required status checks pass.
  - Recommended repo admin steps:
    - Ensure branch protection requires the CI checks (include `PR Commit Message Lint` and CI).
    - Consider limiting automerge to patch/minor updates only; we can adjust the workflow if you prefer.

If you'd like, I can open a small PR that adds branch protection guidance and a short `SECURITY.md` checklist. Tell me which of the above steps (especially the test tag push) you want me to run.
