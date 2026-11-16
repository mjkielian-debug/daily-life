# Money review release

Build: `20261115-money-review1`

- Overdue bills and bills without valid dates remain available in the Money review queue.
- Known unpaid amounts reserve cash even when a payment account has not been assigned.
- Missing amounts, balances, or cloud confirmation prevent a confirmed spending estimate.
- Today's cushion and Money coaching use the current month, independent of the budget month being viewed.
- Required transfers and overdue bills require review rather than showing an on-track badge.
- Overdue bills reduce the suggested checking-account sweep before future deposits.
- Existing room maps, avatar changes, and private financial records are preserved.

Validation: 148 dependency-free regression tests passed, including twelve Money calculation and navigation scenarios. Uploaded source blobs matched the tested local files. Interactive browser preview was not verified because the preview session failed; no real bank transfers or payments are performed by these controls.
