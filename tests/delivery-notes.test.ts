import { describe, it, expect, beforeAll } from 'vitest';
import { apiGet, apiPost } from './setup.js';

describe('delivery-notes', () => {
	let testDeliveryNoteId: string;

	beforeAll(async () => {
		const deliveryNote = await apiPost<{ id: string }>('/v1/delivery-notes', {
			voucherDate: '2026-04-20T00:00:00.000+02:00',
			address: { name: '[TEST] Integrationtest', countryCode: 'DE' },
			lineItems: [{
				type: 'custom',
				name: '[TEST] Integrationstest Position',
				quantity: 1,
				unitName: 'Stück',
			}],
			taxConditions: { taxType: 'net' },
			shippingConditions: { shippingDate: '2026-04-20T00:00:00.000+02:00', shippingType: 'delivery' },
		});
		testDeliveryNoteId = deliveryNote.id;
	});

	it('lists delivery notes and returns paginated content', async () => {
		const data = await apiGet<{ content: unknown[]; totalElements: number }>(
			'/v1/voucherlist?voucherType=deliverynote&voucherStatus=draft,open&page=0&size=25',
		);
		expect(data).toHaveProperty('content');
		expect(Array.isArray(data.content)).toBe(true);
		expect(typeof data.totalElements).toBe('number');
	});

	it('retrieves a delivery note by ID', async () => {
		const data = await apiGet<{ id: string; voucherStatus: string }>(
			`/v1/delivery-notes/${testDeliveryNoteId}`,
		);
		expect(data.id).toBe(testDeliveryNoteId);
		expect(data).toHaveProperty('voucherStatus');
	});

	it('retrieves delivery note with expected shape', async () => {
		const data = await apiGet<{ id: string; lineItems: unknown[] }>(
			`/v1/delivery-notes/${testDeliveryNoteId}`,
		);
		expect(data).toHaveProperty('lineItems');
		expect(Array.isArray(data.lineItems)).toBe(true);
	});
});
