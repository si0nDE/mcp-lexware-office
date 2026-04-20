import { describe, it, expect, beforeAll } from 'vitest';
import { apiGet, apiPost } from './setup.js';

describe('quotations', () => {
	let testQuotationId: string;

	beforeAll(async () => {
		const quotation = await apiPost<{ id: string }>('/v1/quotations', {
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
			expirationDate: '2026-05-20T00:00:00.000+02:00',
			totalPrice: { currency: 'EUR' },
		});
		testQuotationId = quotation.id;
	});

	it('lists quotations and returns paginated content', async () => {
		const data = await apiGet<{ content: unknown[]; totalElements: number }>(
			'/v1/voucherlist?voucherType=quotation&voucherStatus=draft,open,accepted,rejected,voided&page=0&size=10',
		);
		expect(data).toHaveProperty('content');
		expect(Array.isArray(data.content)).toBe(true);
		expect(typeof data.totalElements).toBe('number');
	});

	it('retrieves a quotation by ID', async () => {
		const data = await apiGet<{ id: string; voucherStatus: string }>(`/v1/quotations/${testQuotationId}`);
		expect(data.id).toBe(testQuotationId);
		expect(data).toHaveProperty('voucherStatus');
	});

	it('retrieves quotation with expected shape', async () => {
		const data = await apiGet<{ id: string; lineItems: unknown[]; taxConditions: unknown }>(
			`/v1/quotations/${testQuotationId}`,
		);
		expect(data).toHaveProperty('lineItems');
		expect(Array.isArray(data.lineItems)).toBe(true);
		expect(data).toHaveProperty('taxConditions');
	});
});
