import { describe, it, expect, beforeAll } from 'vitest';
import { apiGet, apiPost } from './setup.js';

describe('vouchers', () => {
	let testVoucherId: string;

	beforeAll(async () => {
		const categories = await apiGet<Array<{ id: string; type: string }>>('/v1/posting-categories');
		const incomeCategory = categories.find((c) => c.type === 'outgo');
		if (!incomeCategory) throw new Error('No income posting category found — cannot create test voucher');

		const contact = await apiPost<{ id: string }>('/v1/contacts', {
			version: 0,
			roles: { vendor: {} },
			company: { name: '[TEST] Voucher Integrationtest Lieferant' },
		});

		const voucher = await apiPost<{ id: string }>('/v1/vouchers', {
			type: 'purchaseinvoice',
			voucherDate: '2026-04-20T00:00:00.000+02:00',
			voucherNumber: '[TEST]-integrationtest-001',
			contactId: contact.id,
			taxType: 'gross',
			voucherItems: [{
				amount: 119.00,
				taxAmount: 19.00,
				taxRatePercent: 19,
				categoryId: incomeCategory.id,
			}],
			totalGrossAmount: 119.00,
			totalTaxAmount: 19.00,
		});
		testVoucherId = voucher.id;
	});

	it('lists vouchers and returns paginated content', async () => {
		const data = await apiGet<{ content: unknown[]; totalElements: number }>(
			'/v1/voucherlist?voucherType=purchaseinvoice&voucherStatus=open,unchecked,paid&page=0&size=25',
		);
		expect(data).toHaveProperty('content');
		expect(Array.isArray(data.content)).toBe(true);
		expect(typeof data.totalElements).toBe('number');
	});

	it('retrieves a voucher by ID', async () => {
		const data = await apiGet<{ id: string; type: string }>(`/v1/vouchers/${testVoucherId}`);
		expect(data.id).toBe(testVoucherId);
		expect(data).toHaveProperty('type');
	});

	it('retrieves voucher with expected shape', async () => {
		const data = await apiGet<{ id: string; voucherItems: unknown[]; taxType: string }>(
			`/v1/vouchers/${testVoucherId}`,
		);
		expect(data).toHaveProperty('voucherItems');
		expect(Array.isArray(data.voucherItems)).toBe(true);
		expect(data).toHaveProperty('taxType');
	});
});
