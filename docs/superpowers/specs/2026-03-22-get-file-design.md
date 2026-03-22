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

- Sets `Accept` header to the `accept` argument (`'application/pdf'` or `'application/xml'`)
- Reads response as `arrayBuffer()` instead of parsing JSON
- Determines `mimeType` from the response `Content-Type` header, stripped of parameters (everything before `;`). Falls back to the `accept` argument if the header is absent.
- Returns `{ data: Buffer, mimeType: string }` on success, `null` on any error (non-2xx, network failure, etc.)
- Accepted limitation: HTTP status codes (404, 403, 500) are not distinguished; all errors result in `null` and a logged error — consistent with the existing `makeLexwareOfficeRequest` pattern
- Uses the same auth and base URL as `makeLexwareOfficeRequest`

### Changes to `index.ts`

Add one new tool `get-file`:

**Tool description string:**
`"Download a file (PDF or XML) from Lexware Office by its file ID. File IDs are found in the 'files.documentFileId' field of voucher or invoice details."`

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `id` | `string (UUID)` | yes | — | File ID from `files.documentFileId` in voucher/invoice details |
| `format` | `'pdf' \| 'xml'` | no | `'pdf'` | Requested file format. Note: XML (XRechnung) is only available for specific invoice types; if unsupported, the API returns an error. |

**`format` → `Accept` header mapping** (performed in `index.ts` before calling the helper):
- `'pdf'` → `'application/pdf'`
- `'xml'` → `'application/xml'`

**`.describe()` text for `format` parameter:**
`"File format to download: 'pdf' (default) or 'xml' (XRechnung, only available for specific invoice types)."`

**Success response:**
```json
{
  "content": [{
    "type": "resource",
    "resource": {
      "uri": "lexware://files/<id>",
      "mimeType": "application/pdf",
      "blob": "<base64-encoded content>"
    }
  }]
}
```

The `uri` value `lexware://files/<id>` is a non-dereferenceable identifier used only for MCP resource identification; the SDK will not attempt to resolve it.

**Error response:**
```json
{
  "content": [{
    "type": "text",
    "text": "Failed to retrieve file"
  }]
}
```

If the API returns an error for an XML request on an unsupported document type, this same error response is returned.

## Data Flow

```
User calls get-file(id, format)
  → map format to Accept header: 'pdf' → 'application/pdf', 'xml' → 'application/xml'
  → makeLexwareOfficeFileRequest("/v1/files/{id}", acceptHeader)
    → GET https://api.lexoffice.io/v1/files/{id}
       Accept: application/pdf
       Authorization: Bearer <key>
    ← arrayBuffer + Content-Type header
  ← { data: Buffer, mimeType } (mimeType from Content-Type, stripped of parameters)
→ encode data as base64
→ MCP resource { type: "resource", blob: base64, mimeType, uri: "lexware://files/<id>" }
→ Claude reads PDF/XML natively
```

## Error Handling

- API returns non-2xx: log error, return `null`, tool returns `{ content: [{ type: "text", text: "Failed to retrieve file" }] }`
- API returns unexpected/missing `Content-Type`: use the `accept` argument value as `mimeType`
- XML requested for unsupported document type: API returns non-2xx → same error path as above
- No changes to error handling of existing tools

## Out of Scope

- File upload
- Listing files for a voucher (IDs already available via `get-voucher-details`/`get-invoice-details`)
- Caching
- HTTP status code propagation (accepted limitation, consistent with existing pattern)
