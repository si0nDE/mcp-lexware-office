# Design: Voucher Read Tools for Lexware Office MCP Server

**Date:** 2026-03-22
**Status:** Draft

## Background

The user writes invoices with external software and only uses Lexware Office for incoming receipts (Eingangsbelege). These are divided into four types:

- **Ausgaben** (Expenses) — `purchaseinvoice`
- **Ausgabenminderung** (Expense Reduction) — `purchasecreditnote`
- **Einnahmen** (Income) — `invoice`
- **Einnahmenminderung** (Income Reduction) — `salescreditnote`

The existing MCP server is read-only. Two new tools follow the established pattern of `get-invoices` / `get-invoice-details`.

## Implementation Action Items

Before finalising the implementation, verify the following:

- [ ] Confirm that `purchaseinvoice`, `purchasecreditnote`, and `salescreditnote` are valid `voucherType` values accepted by `GET /v1/voucherlist`. The value `invoice` is already verified (used by `get-invoices`). Test by calling the endpoint with each type and confirming non-error responses.

## Tools

### `get-vouchers`

Lists vouchers via `GET /v1/voucherlist`.

**Tool description string:** `'Get a list of vouchers (Belege) from Lexware Office'`

**Parameters (Zod input name → API query param):**

| Zod param | API query param | Zod definition | Describe string |
|---|---|---|---|
| `voucherType` | `voucherType` | `z.enum(['purchaseinvoice', 'purchasecreditnote', 'invoice', 'salescreditnote']).optional()` | `'Filter by voucher type: "purchaseinvoice" (Ausgaben), "purchasecreditnote" (Ausgabenminderung), "invoice" (Einnahmen), "salescreditnote" (Einnahmenminderung). Omit to retrieve all types.'` |
| `status` | `voucherStatus` | `z.array(z.enum(['open', 'draft', 'paid', 'paidoff', 'voided'])).optional().default(['open', 'draft', 'paid', 'paidoff', 'voided'])` | `'Filter by voucher status. Default: all statuses.'` |
| `page` | `page` | `z.number().min(0).optional().default(0)` | `'page number to retrieve; starts at 0'` |
| `size` | `size` | `z.number().min(1).max(250).optional().default(250)` | `'number of vouchers to retrieve per page'` |

**Query string construction:**

Build the URL using a template literal (not `URLSearchParams`) to preserve literal commas in the status list:

```
/v1/voucherlist?voucherStatus=${status.join(',')}&page=${page}&size=${size}
```

- `voucherStatus` is always sent as a comma-joined string using a template literal; do not use `URLSearchParams` for this as it would percent-encode the comma as `%2C`
- `voucherType` is only appended when provided; check `if (voucherType !== undefined)` before appending
- `page` and `size` are always included in the URL

> **Important:** Unlike `get-invoices`, which accidentally omits `page` and `size` from the URL, `get-vouchers` must destructure `{ voucherType, status, page, size }` from the handler and append all params to the URL. Do **not** copy the `get-invoices` handler verbatim.

**Response payload:**

The API returns `{ content: [...], totalElements: N, totalPages: N, ... }`. The voucher array is at `data.content`.

**Response text format:**

```
There are ${vouchers.length} vouchers in Lexware Office:\n\n${JSON.stringify(vouchers, null, 2)}
```

**Guard order (in this exact sequence):**

1. Assign the result of `makeLexwareOfficeRequest` to `data`. Check `if (!data)` **before** accessing `data.content`. If null → return `'Failed to retrieve vouchers'`.
2. Read `data.content` into `vouchers`. If `!vouchers || vouchers.length === 0` → return `'No vouchers found'`.
3. Else → return the response text above.

> Do not write `const vouchers = data.content` before the null check on `data` — this is the bug present in `get-invoices` (line 33 of `src/index.ts`).

### `get-voucher-details`

Retrieves a single voucher via `GET /v1/vouchers/{id}`.

> Note: `/v1/vouchers/{id}` is the generic endpoint for all four voucher types. It is distinct from `/v1/invoices/{id}` used by `get-invoice-details`.

**Tool description string:** `'Get details of a voucher (Beleg) from Lexware Office'`

**Parameters:**

| Zod param | Zod definition | Describe string |
|---|---|---|
| `id` | `z.string().uuid()` | `'The id of the voucher'` |

**Guard order:**

1. If `makeLexwareOfficeRequest` returns `null` → return `'Failed to retrieve voucher data'`
2. Else → return `'Voucher details:\n\n' + JSON.stringify(voucherData, null, 2)`

No empty-content guard is needed. The API returns a 404 for unknown IDs, which `makeLexwareOfficeRequest` catches and returns as `null`.

## Architecture

Both tools are added to `src/index.ts` following the existing pattern:
- Use `makeLexwareOfficeRequest` from `helper.ts`
- Use `zod` for parameter validation
- Return `{ content: [{ type: 'text', text: '...' }] }`

No new files, no new dependencies.

## Out of Scope

- Creating, updating, or deleting vouchers
- File upload/download for voucher attachments
- Webhook/event subscriptions
