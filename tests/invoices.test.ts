import { describe, it, expect, beforeAll } from 'vitest';
import { apiGet, apiPost } from './setup.js';

describe('invoices', () => {
	let testInvoiceId: string;

	beforeAll(async () => {
		const invoice = await apiPost<{ id: string }>('/v1/invoices', {
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
		testInvoiceId = invoice.id;
	});

	it('lists invoices and returns paginated content', async () => {
		const data = await apiGet<{ content: unknown[]; totalElements: number }>(
			'/v1/voucherlist?voucherType=invoice&voucherStatus=draft,open,paid,paidoff,voided&page=0&size=10',
		);
		expect(data).toHaveProperty('content');
		expect(Array.isArray(data.content)).toBe(true);
		expect(typeof data.totalElements).toBe('number');
	});

	it('retrieves an invoice by ID', async () => {
		const data = await apiGet<{ id: string; voucherStatus: string }>(`/v1/invoices/${testInvoiceId}`);
		expect(data.id).toBe(testInvoiceId);
		expect(data).toHaveProperty('voucherStatus');
	});

	it('retrieves invoice with expected shape', async () => {
		const data = await apiGet<{ id: string; lineItems: unknown[]; taxConditions: unknown }>(
			`/v1/invoices/${testInvoiceId}`,
		);
		expect(data).toHaveProperty('lineItems');
		expect(Array.isArray(data.lineItems)).toBe(true);
		expect(data).toHaveProperty('taxConditions');
	});
});
