import { describe, it, expect, beforeAll } from 'vitest';
import { apiGet, apiPost } from './setup.js';

describe('credit-notes', () => {
	let testCreditNoteId: string;

	beforeAll(async () => {
		const creditNote = await apiPost<{ id: string }>('/v1/credit-notes', {
			voucherDate: '2026-04-20T00:00:00.000+02:00',
			address: { name: '[TEST] Integrationtest', countryCode: 'DE' },
			lineItems: [{
				type: 'custom',
				name: '[TEST] Integrationstest Dienstleistung',
				quantity: 1,
				unitName: 'Stunde',
				unitPrice: { currency: 'EUR', netAmount: '100.00', taxRatePercentage: 19 },
			}],
			taxConditions: { taxType: 'net' },
			shippingConditions: { shippingDate: '2026-04-20T00:00:00.000+02:00', shippingType: 'service' },
			totalPrice: { currency: 'EUR' },
		});
		testCreditNoteId = creditNote.id;
	});

	it('lists credit notes and returns paginated content', async () => {
		const data = await apiGet<{ content: unknown[]; totalElements: number }>(
			'/v1/voucherlist?voucherType=creditnote&voucherStatus=draft,open,paid,voided&page=0&size=10',
		);
		expect(data).toHaveProperty('content');
		expect(Array.isArray(data.content)).toBe(true);
		expect(typeof data.totalElements).toBe('number');
	});

	it('retrieves a credit note by ID', async () => {
		const data = await apiGet<{ id: string; voucherStatus: string }>(`/v1/credit-notes/${testCreditNoteId}`);
		expect(data.id).toBe(testCreditNoteId);
		expect(data).toHaveProperty('voucherStatus');
	});

	it('retrieves credit note with expected shape', async () => {
		const data = await apiGet<{ id: string; lineItems: unknown[]; taxConditions: unknown }>(
			`/v1/credit-notes/${testCreditNoteId}`,
		);
		expect(data).toHaveProperty('lineItems');
		expect(Array.isArray(data.lineItems)).toBe(true);
		expect(data).toHaveProperty('taxConditions');
	});
});
