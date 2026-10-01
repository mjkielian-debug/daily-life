# Daily Life bank sync setup

Daily Life is designed to use Plaid's free Trial allowance for the owner's
personal bank-sync experiment. The PWA itself remains usable without Plaid.

## Never commit these values

Do not place any of these in GitHub, browser JavaScript, screenshots, backups,
or chat messages:

- PLAID_SECRET
- Plaid access tokens
- bank usernames/passwords

Plaid access tokens are exchanged only by Supabase Edge Functions and stored
through Supabase Vault.

## Plaid dashboard setup

1. Create/sign in to a Plaid developer account.
2. Use the free Trial / Production testing path available to the account.
3. Add this exact OAuth redirect URI:
   `https://mjkielian-debug.github.io/daily-life/`
4. Note the Plaid Client ID and Production secret.
5. In Supabase Dashboard, open the Daily Life project and go to Edge Functions
   secrets.
6. Add:
   - `PLAID_CLIENT_ID`
   - `PLAID_SECRET`
   - `PLAID_ENV=production`

Enter the values directly in Supabase. Do not paste the secret into the Daily
Life public repo.

## Existing backend functions

- `plaid-link-token`: creates a user-scoped Link token
- `plaid-exchange`: exchanges the one-time public token and stores the access
  token in Vault
- `plaid-sync`: updates balances and transaction history using
  `/transactions/sync`

The browser never receives a Plaid access token.

## Budget behavior

Mapped checking/savings balances feed bill-readiness calculations.

Posted non-transfer bank purchases are auto-imported only when Daily Life can
conservatively map them to a flexible budget category. Likely known bills are
kept out of flexible spending to reduce double counting. Unclear transactions
are not silently categorized.

The app shows provider sync timestamps and does not represent a stale balance
as live.
