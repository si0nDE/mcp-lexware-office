# Lexware Office MCP Server

An MCP server implementation that integrates with Lexware Office (formerly known as Lexoffice), providing a seamless interface for managing business operations through the Model Context Protocol.

## Features

- **Lexware Office Integration**: Direct integration with the Lexware Office API
- **Business Operations**: Manage invoices, contacts, vouchers, and other business documents

## Tools

The following tools are available through this MCP server:

| Tool | Description | API |
|---|---|---|
| `get-invoices` | Get a list of invoices from Lexware Office | `GET /v1/invoices` |
| `get-invoice-details` | Get details of a specific invoice | `GET /v1/invoices/{id}` |
| `get-contacts` | Get contacts with optional filters | `GET /v1/contacts` |
| `get-vouchers` | Get a list of bookkeeping vouchers | `GET /v1/voucherlist` |
| `get-voucher-details` | Get details of a specific bookkeeping voucher | `GET /v1/vouchers/{id}` |
| `get-file` | Download a file (PDF or XML) by file ID | `GET /v1/files/{id}` |
| `list-posting-categories` | List posting categories for bookkeeping vouchers | `GET /v1/posting-categories` |
| `list-countries` | List countries with their tax classifications | `GET /v1/countries` |
| `get-payments` | Get payment information for an invoice or voucher | `GET /v1/payments` |
| `get-payment-conditions` | List available payment conditions (Zahlungsbedingungen) | `GET /v1/payment-conditions` |
| `create-contact` | Create a new contact (customer or vendor) | `POST /v1/contacts` |
| `update-contact` | Update an existing contact | `PUT /v1/contacts/{id}` |
| `create-invoice` | Create an invoice as a draft | `POST /v1/invoices` |
| `finalize-invoice` | Create and immediately finalize an invoice | `POST /v1/invoices?finalize=true` |
| `create-dunning` | Create a dunning notice (Mahnung) as a draft | `POST /v1/dunnings` |
| `finalize-dunning` | Create and immediately finalize a dunning notice | `POST /v1/dunnings?finalize=true` |
| `create-voucher` | Create a bookkeeping voucher (Buchungsbeleg) | `POST /v1/vouchers` |
| `update-voucher` | Update an existing bookkeeping voucher | `PUT /v1/vouchers/{id}` |

## Permission Model

Tools are grouped into three tiers. You can restrict access by disabling tools in your Claude/MCP configuration:

| Tier | Allowed | Disable these tools |
|---|---|---|
| Read-only | All `get-*` and `list-*` tools | `create-*`, `update-*`, `finalize-*` |
| Draft mode | + create/update tools | `finalize-invoice`, `finalize-dunning` |
| Full access | All tools | _(nothing)_ |

Example (draft mode — no finalization):
```json
{
  "mcpServers": {
    "lexware-office": {
      "disabledTools": ["finalize-invoice", "finalize-dunning"]
    }
  }
}
```

## Configuration

### Getting a Lexware Office API key

Visit [https://app.lexoffice.de/addons/public-api](https://app.lexoffice.de/addons/public-api) to get your API key.

### Prerequisites

- Node.js 22 or higher

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

### Docker

```json
{
	"mcpServers": {
		"mcp-lexware-office": {
			"command": "docker",
			"args": ["run", "-i", "--rm", "-e", "LEXWARE_OFFICE_API_KEY", "mcp-lexware-office"],
			"env": {
				"LEXWARE_OFFICE_API_KEY": "YOUR_API_KEY_HERE"
			}
		}
	}
}
```

### NPX

```json
{
	"mcpServers": {
		"mcp-lexware-office": {
			"command": "npx",
			"args": ["-y", "JannikWempe/mcp-lexware-office"],
			"env": {
				"LEXWARE_OFFICE_API_KEY": "YOUR_API_KEY_HERE"
			}
		}
	}
}
```

## Build

Docker build:

```bash
docker build -t mcp-lexware-office:latest -f Dockerfile .
```

## License

This project is licensed under the MIT License. See the LICENSE file in the project repository for full details.
