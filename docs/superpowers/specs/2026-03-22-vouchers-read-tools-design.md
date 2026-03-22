# Design: Voucher Read Tools for Lexware Office MCP Server

**Date:** 2026-03-22
**Status:** Approved

## Background

The user writes invoices with external software and only uses Lexware Office for incoming receipts (Eingangsbelege). These are divided into four types:

- **Ausgaben** (Expenses) — `purchaseinvoice`
- **Ausgabenminderung** (Expense Reduction) — `purchasecreditnote`
- **Einnahmen** (Income) — `invoice`
- **Einnahmenminderung** (Income Reduction) — `salescreditnote`

The existing MCP server is read-only. Two new tools follow the established pattern of `get-invoices` / `get-invoice-details`.

## Tools

### `get-vouchers`

Lists vouchers via `GET /v1/voucherlist`.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `voucherType` | `enum` (optional) | all types | Filter by voucher type: `purchaseinvoice`, `purchasecreditnote`, `invoice`, `salescreditnote` |
| `status` | `array<enum>` (optional) | all statuses | Filter by status: `open`, `draft`, `paid`, `paidoff`, `voided` |
| `page` | `number` (optional) | `0` | Page number (zero-indexed) |
| `size` | `number` (optional) | `250` | Results per page (1–250) |

**Behaviour:**
- Builds query string from non-null parameters
- Returns JSON list of matching vouchers
- Returns error message if request fails or result is empty

### `get-voucher-details`

Retrieves a single voucher via `GET /v1/vouchers/{id}`.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | The voucher ID |

**Behaviour:**
- Calls `/v1/vouchers/{id}`
- Returns full JSON voucher object
- Returns error message if request fails

## Architecture

Both tools are added to `src/index.ts` following the existing pattern:
- Use `makeLexwareOfficeRequest` from `helper.ts`
- Use `zod` for parameter validation
- Return `{ content: [{ type: 'text', text: '...' }] }`

No new files, no new dependencies. Scope is minimal.

## Out of Scope

- Creating, updating, or deleting vouchers
- File upload/download for voucher attachments
- Webhook/event subscriptions
