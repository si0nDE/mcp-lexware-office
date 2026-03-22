# get-vouchers & get-voucher-details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two read-only MCP tools (`get-vouchers`, `get-voucher-details`) for retrieving bookkeeping vouchers (Eingangsbelege) from Lexware Office.

**Architecture:** Two new `server.tool()` calls appended to `src/index.ts`, following the exact same pattern as the existing `get-invoices` and `get-invoice-details` tools. `get-vouchers` queries `/v1/voucherlist` with voucher-specific type/status filters; `get-voucher-details` queries `/v1/vouchers/{id}`.

**Tech Stack:** TypeScript, Zod (validation), `@modelcontextprotocol/sdk`, existing `makeLexwareOfficeRequest` helper.

---

## File Structure

- **Modify only:** `src/index.ts` — add two `server.tool()` registrations before `main()`

No new files needed.

---

### Task 1: Add `get-vouchers` tool

**Files:**
- Modify: `src/index.ts` — insert before `async function main()`

The tool lists vouchers via `/v1/voucherlist`. Relevant `voucherType` values for bookkeeping vouchers:
- `purchaseinvoice` — Ausgaben
- `purchasecreditnote` — Ausgabenminderung
- `salesinvoice` — Einnahmen
- `salescreditnote` — Einnahmenminderung

Relevant `voucherStatus` values for bookkeeping vouchers:
- `unchecked` — uploaded but not yet booked (important for user's use case)
- `open`, `paid`, `paidoff`, `voided`, `transferred`, `sepadebit`

- [ ] **Step 1: Add the tool registration to `src/index.ts`**

Insert the following block directly before `async function main()` in `src/index.ts`:

```typescript
server.tool(
	'get-vouchers',
	'Get a list of bookkeeping vouchers (Eingangsbelege/Ausgangsbelege) from Lexware Office. Voucher types: purchaseinvoice (Ausgaben), purchasecreditnote (Ausgabenminderung), salesinvoice (Einnahmen), salescreditnote (Einnahmenminderung).',
	{
		voucherType: z
			.array(
				z.enum(['purchaseinvoice', 'purchasecreditnote', 'salesinvoice', 'salescreditnote']),
			)
			.optional()
			.default(['purchaseinvoice', 'purchasecreditnote', 'salesinvoice', 'salescreditnote'])
			.describe('Filter by voucher type'),
		voucherStatus: z
			.array(
				z.enum(['unchecked', 'open', 'paid', 'paidoff', 'voided', 'transferred', 'sepadebit']),
			)
			.optional()
			.default(['unchecked', 'open', 'paid', 'paidoff', 'voided', 'transferred', 'sepadebit'])
			.describe('Filter by voucher status'),
		page: z.number().min(0).optional().default(0).describe('page number to retrieve; starts at 0'),
		size: z
			.number()
			.min(1)
			.max(250)
			.optional()
			.default(250)
			.describe('number of vouchers to retrieve per page'),
	},
	async ({ voucherType, voucherStatus, page, size }) => {
		const voucherlistUrl = `/v1/voucherlist?voucherType=${voucherType.join(',')}&voucherStatus=${voucherStatus.join(',')}&page=${page}&size=${size}`;
		const voucherlistData = await makeLexwareOfficeRequest<any>(voucherlistUrl);
		const vouchers = voucherlistData?.content;

		if (!vouchers || vouchers.length === 0) {
			return {
				content: [
					{
						type: 'text',
						text: 'No vouchers found',
					},
				],
			};
		}

		const response = `There are ${voucherlistData.totalElements} vouchers in total (showing ${vouchers.length} on page ${page}):\n\n${JSON.stringify(vouchers, null, 2)}`;

		return {
			content: [
				{
					type: 'text',
					text: response,
				},
			],
		};
	},
);
```

- [ ] **Step 2: Install dependencies (only needed once in the worktree)**

```bash
cd /Users/simon/Developer/mcp-lexware-office/.claude/worktrees/pedantic-chebyshev && npm install
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
cd /Users/simon/Developer/mcp-lexware-office/.claude/worktrees/pedantic-chebyshev && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add get-vouchers tool"
```

---

### Task 2: Add `get-voucher-details` tool

**Files:**
- Modify: `src/index.ts` — insert after `get-vouchers`, before `async function main()`

- [ ] **Step 1: Add the tool registration to `src/index.ts`**

Insert the following block directly after the `get-vouchers` tool, before `async function main()`:

```typescript
server.tool(
	'get-voucher-details',
	'Get details of a bookkeeping voucher from Lexware Office by its ID',
	{
		id: z.string().uuid().describe('The id of the voucher'),
	},
	async ({ id }) => {
		const voucherUrl = `/v1/vouchers/${id}`;
		const voucherData = await makeLexwareOfficeRequest<any>(voucherUrl);

		if (!voucherData) {
			return {
				content: [
					{
						type: 'text',
						text: 'Failed to retrieve voucher data',
					},
				],
			};
		}

		const response = `Voucher details:\n\n${JSON.stringify(voucherData, null, 2)}`;

		return {
			content: [
				{
					type: 'text',
					text: response,
				},
			],
		};
	},
);
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
cd /Users/simon/Developer/mcp-lexware-office/.claude/worktrees/pedantic-chebyshev && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add get-voucher-details tool"
```

---

### Task 3: Test in Claude Desktop

- [ ] **Step 1: Copy build to main repo and rebuild**

Since the code is in the worktree, copy the changed `src/index.ts` to the main repo and rebuild:

```bash
cp /Users/simon/Developer/mcp-lexware-office/.claude/worktrees/pedantic-chebyshev/src/index.ts \
   /Users/simon/Developer/mcp-lexware-office/src/index.ts
cd /Users/simon/Developer/mcp-lexware-office && npm run build
```

- [ ] **Step 2: Add local server to Claude Desktop config**

Open `~/Library/Application Support/Claude/claude_desktop_config.json` and add:

```json
"mcp-lexware-office-local": {
  "command": "node",
  "args": ["/Users/simon/Developer/mcp-lexware-office/build/index.js"],
  "env": {
    "LEXWARE_OFFICE_API_KEY": "<your-api-key>"
  }
}
```

- [ ] **Step 3: Restart Claude Desktop and test**

Ask Claude: "Zeige mir alle Belege aus Lexware Office" — should invoke `get-vouchers`.
Ask Claude: "Zeige mir Details zu Beleg <id>" — should invoke `get-voucher-details`.
