---
name: Logmate backup boundary
description: Privacy choices behind account-scoped storage, local encrypted snapshots, and explicit legacy import.
---

Logmate uses account-scoped local records, opt-in encrypted snapshots in the same browser, and manually transported encrypted files for another device. Do not present a local snapshot as a cloud backup or as protection against clearing all browser storage.

**Why:** The privacy requirement prioritizes keeping original journal text off the server. A carried file enables same-account recovery elsewhere without a server-side repository of journal contents. The old anonymous data has no verifiable account owner, so automatically assigning it on first login could disclose another person's records on a shared browser.

**How to apply:** Keep legacy import opt-in and non-destructive. When expanding sync or backup, obtain a clear product decision before adding remote storage. Never overwrite an existing encrypted snapshot with divergent local records just because its passphrase was entered; ask which copy to retain.