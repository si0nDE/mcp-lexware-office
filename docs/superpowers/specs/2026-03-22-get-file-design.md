# Design: `get-file` Tool for MCP Lexware Office

**Date:** 2026-03-22
**Status:** Approved

## Overview

Add a `get-file` MCP tool that downloads a file (PDF or XML) from the Lexware Office API via `GET /v1/files/{id}` and returns it as a native MCP resource so Claude can analyze the content directly.

## Motivation

The existing tools (`get-voucher-details`, `get-invoice-details`) return a `files.documentFileId` but cannot retrieve the actual file. This blocks use cases like:
- Reading invoice line items and verifying amounts/VAT
- Parsing XRechnung XML for structured data extraction

## Architecture

### Changes to `helper.ts`

Add a new exported function alongside the existing `makeLexwareOfficeRequest`:

```ts
export async function makeLexwareOfficeFileRequest(
  path: string,
  accept: 'application/pdf' | 'application/xml'
): Promise<{ data: Buffer; mimeType: string } | null>
```

- Sets `Accept` header to the requested MIME type instead of `application/json`
- Reads response as `arrayBuffer()` instead of parsing JSON
- Returns `{ data: Buffer, mimeType: string }` on success, `null` on error
- Uses the same auth and base URL as `makeLexwareOfficeRequest`

### Changes to `index.ts`

Add one new tool `get-file`:

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `id` | `string (UUID)` | yes | — | File ID from `files.documentFileId` in voucher/invoice details |
| `format` | `'pdf' \| 'xml'` | no | `'pdf'` | Requested file format |

**Success response:**
```json
{
  "type": "resource",
  "resource": {
    "uri": "lexware://files/<id>",
    "mimeType": "application/pdf",
    "blob": "<base64-encoded content>"
  }
}
```

**Error response:**
```json
{
  "type": "text",
  "text": "Failed to retrieve file"
}
```

## Data Flow

```
User calls get-file(id, format)
  → makeLexwareOfficeFileRequest("/v1/files/{id}", "application/pdf")
    → GET https://api.lexoffice.io/v1/files/{id}
       Accept: application/pdf
       Authorization: Bearer <key>
    ← arrayBuffer
  ← { data: Buffer, mimeType }
→ MCP resource { type: "resource", blob: base64, mimeType, uri }
→ Claude reads PDF/XML natively
```

## Error Handling

- API returns non-2xx: log error, return `null`, tool returns error text message
- API returns unexpected content type: mimeType is read from response `Content-Type` header as fallback
- No changes to error handling of existing tools

## Out of Scope

- File upload
- Listing files for a voucher (IDs already available via `get-voucher-details`/`get-invoice-details`)
- Caching
