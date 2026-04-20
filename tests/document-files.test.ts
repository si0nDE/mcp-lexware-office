import { describe, it, expect } from 'vitest';
import { API_BASE, apiGet } from './setup.js';

const API_KEY = process.env.LEXWARE_OFFICE_API_KEY!;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadDocumentFile(docType: string, id: string, retries = 3): Promise<{ status: number; contentType: string | null }> {
	const res = await fetch(`${API_BASE}/v1/${docType}/${id}/file`, {
		headers: { Accept: 'application/pdf', Authorization: `Bearer ${API_KEY}` },
	});
	if (res.status === 429 && retries > 0) {
		await sleep(1500);
		return downloadDocumentFile(docType, id, retries - 1);
	}
	return { status: res.status, contentType: res.headers.get('Content-Type') };
}

describe('document-files', () => {
	it('returns PDF for a finalized quotation if one exists', async () => {
		const list = await apiGet<{ content: Array<{ id: string }> }>(
			'/v1/voucherlist?voucherType=quotation&voucherStatus=open,accepted&page=0&size=1',
		);

		if (!list.content || list.content.length === 0) {
			console.log('No open/accepted quotations — skipping');
			return;
		}

		const { status, contentType } = await downloadDocumentFile('quotations', list.content[0].id);
		expect(status).toBe(200);
		expect(contentType).toContain('application/pdf');
	});

	it('returns 404 for a non-existent document ID', async () => {
		const { status } = await downloadDocumentFile('invoices', '00000000-0000-0000-0000-000000000000');
		expect([404, 406]).toContain(status); // Lexware may return 404 or 406 for invalid/missing docs
	});
});
