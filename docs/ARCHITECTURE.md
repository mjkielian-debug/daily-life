# Daily Life architecture

## Goal

Daily Life remains an installable PWA while growing into a private multi-user
app that can accept entries from the Daily Life interface, ChatGPT
conversations/photo interpretation, and automatic financial-account sync.

The public GitHub repository must never contain a user's private records,
provider access tokens, bank credentials, or private API secrets.

## Target free stack

- Frontend: GitHub Pages PWA
- Auth/database/API: Supabase Free
- Bank data: Plaid Trial while within its free Production Item limit
- Conversational logging: authenticated Daily Life API first, with ChatGPT/MCP
  integration layered on top later

This keeps Daily Life useful even if a ChatGPT integration changes later.

## Privacy boundary

Browser-safe values may be present in the public frontend only when they are
intended to be public, such as a Supabase publishable key protected by Row
Level Security.

Never commit Supabase secret/service-role keys, Plaid secrets, Plaid access
tokens, bank passwords, private starter backups, transaction exports, or
private photos.

Plaid access tokens belong in encrypted server-side secret storage such as
Supabase Vault. Public connection metadata stores only an opaque secret
reference.

## Multi-user model

Every cloud record belongs to an authenticated user. Row Level Security limits
normal browser access to the signed-in owner's rows.

The first schema includes profiles, household members, generic life entries, a
transitional whole-app snapshot, monthly budget data, financial connection
metadata, financial accounts, and financial transactions.

The life_entries table is deliberately flexible so conversational logging can
add categories without a database migration for every new Daily Life feature.

## Transition from IndexedDB

The installed app's existing IndexedDB data is not deleted or overwritten.

Migration stages:

1. Add optional sign-in.
2. Upload a private snapshot only after the user explicitly signs in and
   enables cloud sync.
3. Continue writing locally first while also syncing cloud records.
4. Confirm successful round-trip sync.
5. Only then make cloud state authoritative for signed-in users.

Offline/local use remains available.

## Conversational logging

The life-log Edge Function is an authenticated write doorway. Future ChatGPT
actions can translate natural language or photo interpretation into structured
entries such as food, water, work_shift, self_care, reading, tire, chore, meal,
shopping, and home_care.

The API stores the structured payload and source rather than embedding ChatGPT
logic into the PWA.

## Financial sync

Financial provider writes happen only server-side. The browser never receives
Plaid access tokens.

Planned flow:

1. signed-in user asks to connect a bank,
2. server creates a Plaid Link token,
3. browser completes Plaid Link,
4. server exchanges the public token,
5. access token is stored encrypted server-side,
6. accounts and transactions sync into private tables,
7. Daily Life reads synced data through authenticated access,
8. budget and bill-readiness calculations use current synced account data.

Sync screens must show freshness / last-synced timestamps and must not imply a
balance is live when it is stale.

## Free-tier boundary

Daily Life itself can be shared with other users independently of bank sync.

The free Plaid Trial has a limited number of Production Items, so the owner's
personal free bank-sync experiment must not be offered as unlimited free bank
sync to every public user. If usage grows beyond the free limit, bank sync
becomes an optional feature requiring a different provider or paid plan.

Supabase Free projects can pause for low activity. Daily use should normally
produce activity, but Daily Life must fail gracefully and preserve local data
if the backend is temporarily paused.
