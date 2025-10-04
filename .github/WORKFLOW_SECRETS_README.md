# Workflow Secrets (README)

This repository's GitHub Actions workflows require a small set of organization/project secrets to perform runtime operations.

Why we reference secrets in workflows

- SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY: Used to call Supabase Edge Functions and REST endpoints during scheduled tasks. These are required to interact with the project's database and queue functions.
- ANTHROPIC_API_KEY: Used by certain AI-driven steps (property extraction) that require an Anthropics/Claude-style key.
- SLACK_WEBHOOK_URL: Optional; used to send Slack notifications when workflows complete or fail.

Security and maintenance

- These secrets should be stored in the repository or organization Secrets (Settings → Secrets → Actions).
- Avoid printing secret values in logs. Steps in workflows should use the secrets only for Authorization headers or safe conditionals.

Notes about linter warnings

Some linters report "Context access might be invalid" for `secrets` lookups when they cannot validate the runtime context. These warnings are informational. If you want to eliminate the warning you can:

- Move secret usage into individual steps (e.g., use `env:` inside a step rather than the top-level `env:`), or
- Keep the current approach and document the intent (as we've done here). The behavior of `secrets` at runtime in GitHub Actions is correct when secrets are configured in the repo settings.
