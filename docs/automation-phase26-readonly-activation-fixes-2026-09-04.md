# Phase 26: read-only activation fixes

The first enabled health run showed that GitHub-hosted runners receive `403` responses from the public `feeeye.com` Cloudflare edge, while the same production deployment remains readable through `feeeye-site.pages.dev`. Scheduled health checks now use that Pages production origin so the monitor tests the deployed bytes without changing Cloudflare configuration. Public canonicals remain `https://feeeye.com`.

The first repeated cross-channel run also proved that a wall-clock `generated_at` value made an otherwise identical analysis collide with its immutable ledger record. Cross-channel schema version 2 derives `generated_at` from the newest completed source window and writes a versioned immutable filename. Repeating the same encrypted inputs is now idempotent; changed records are still never overwritten.

Neither fix enables publication, content mutation, raw URL retention, personal-data collection, or any write access to Google, Cloudflare, or X.
