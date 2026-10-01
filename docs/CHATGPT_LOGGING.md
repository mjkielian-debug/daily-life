# Daily Life conversational logging

Daily Life has an authenticated `life-log` endpoint and a client-side
inbox/pull mechanism. The goal is for a user to describe life naturally in
ChatGPT and have structured entries appear in their own Daily Life account.

## Privacy model

Every `life_entries` row has an authenticated owner. Row Level Security
prevents normal users from reading or writing another user's rows.

A ChatGPT-generated entry should use:

- `source: "chatgpt"`
- a stable `external_id` when retrying the same action, so retries are
  idempotent
- the user's local date
- a small structured JSON payload

The installed PWA remembers applied entry IDs so a pull cannot apply the same
action twice.

## Supported categories

### water

```json
{"category":"water","payload":{"oz":26}}
```

### stretch

```json
{"category":"stretch","payload":{"minutes":10}}
```

### self_care

```json
{"category":"self_care","payload":{"key":"brush","done":true}}
```

### food

```json
{
  "category":"food",
  "payload":{
    "name":"Chicken, potatoes, and vegetables",
    "calories":620,
    "protein":38,
    "notes":"Estimated from photo"
  }
}
```

Photo-derived nutrition should remain clearly estimated when portions or
ingredients are uncertain.

### work_shift

```json
{
  "category":"work_shift",
  "payload":{"start":"04:20","end":"08:05","rate":22}
}
```

### tire

```json
{
  "category":"tire",
  "payload":{"psi":28.5,"event":"reading","notes":"Before work"}
}
```

### reading

```json
{
  "category":"reading",
  "payload":{"reader":"Child","pages":22,"book":"Book title"}
}
```

### chore

```json
{
  "category":"chore",
  "payload":{"child":"Child","chore":"Dishes","done":true}
}
```

### shopping

```json
{
  "category":"shopping",
  "payload":{"item":"Toilet paper","qty":"1","store":"Any"}
}
```

### home_care

```json
{
  "category":"home_care",
  "payload":{"area":"Kitchen","task":"Clean refrigerator","status":"done"}
}
```

### task

```json
{
  "category":"task",
  "payload":{"title":"Return library books","category":"family","done":false}
}
```

### meal

```json
{
  "category":"meal",
  "payload":{"date":"2026-10-01","type":"dinner","dish":"Pot roast","status":"planned"}
}
```

### budget_spending

```json
{
  "category":"budget_spending",
  "payload":{"date":"2026-10-01","amount":24.50,"category":"household","note":"Household supplies"}
}
```

Allowed budget categories are `transport`, `dining`, `household`,
`personal`, `grocery`, `fun`, `cushion`, and `ebt`.

### bill_add

Adds a new upcoming bill only when the bill name + due date is not already
present. This is useful for conversational requests such as "add this trial
renewal to my bills."

```json
{
  "category":"bill_add",
  "payload":{
    "name":"Streaming trial",
    "amount":14.99,
    "due":"2026-10-04",
    "paymentSetup":"Autopay",
    "amountType":"Fixed amount",
    "frequency":"Trial / decision pending",
    "repeatMonths":0
  }
}
```

When a synced Money account is known, private conversational entries may use
`paymentAccountCloudId` (or `desiredPaymentAccountCloudId`). The installed
app resolves that private cloud account ID to the user's local Money-account
key; account keys do not need to be hard-coded into public app code.

### bill_update

A bill update must identify exactly one bill. Prefer the app's bill ID. If no
ID is available, use an exact bill name and due date. Ambiguous matches are
ignored instead of guessing.

```json
{
  "category":"bill_update",
  "payload":{"bill_id":"uuid","status":"paid","repeatMonths":1,"paymentAccountCloudId":"private-cloud-account-id"}
}
```

## Safety rules

- Never silently invent a dollar amount, bill identity, meal portion, or bank
  transaction category.
- Estimates from photos should be labeled as estimates.
- Financial-provider data remains separate from conversational guesses.
- Bank transfers are not treated as spending merely because money moved.
- Bill payment setup recorded in Daily Life is not represented as independently
  verified unless it came from a provider sync that actually supports that
  field.
