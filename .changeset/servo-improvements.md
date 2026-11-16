---
"@openally/servo": minor
---

Faster file serving, safer path handling, and new helpers.

- Files are served faster, especially small files and missing ones.
- Path and file lookups are stricter, closing a few ways to reach files that should stay hidden.
- Precompressed files respect the client's encoding preferences more accurately.
- Helpers that were previously internal are now exported, and a few new cache and content-type options are available.
