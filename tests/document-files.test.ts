import { describe, it, expect } from 'vitest';
import { API_BASE } from './setup.js';

const API_KEY = process.env.LEXWARE_OFFICE_API_KEY!;

async function downloadDocumentFile(docType: string, id: string): Promise<{ status: number; contentType: string | null }> {
	const res = await fetch(`${API_BASE}/v1/${docType}/${id}/file`, {
		headers: { Accept: 'application/pdf', Authorization: `Bearer ${API_KEY}` },
	});
	return { status: res.status, contentType: res.headers.get('Content-Type') };
}

describe('document-files', () => {
	it('returns PDF for a finalized quotation if one exists', async () => {
		const list = await fetch(`${API_BASE}/v1/voucherlist?voucherType=quotation&voucherStatus=open,accepted&page=0&size=1`, {
			headers: { Accept: 'application/json', Authorization: `Bearer ${API_KEY}` },
		}).then(r => r.json()) as { content: Array<{ id: string }> };

		if (list.content.length === 0) {
			console.log('No open/accepted quotations — skipping');
			return;
		}

		const { status, contentType } = await downloadDocumentFile('quotations', list.content[0].id);
		expect(status).toBe(200);
		expect(contentType).toContain('application/pdf');
	});

	it('returns 404 for a non-existent document ID', async () => {
		const { status } = await downloadDocumentFile('invoices', '00000000-0000-0000-0000-000000000000');
		expect(status).toBe(404);
	});
});
