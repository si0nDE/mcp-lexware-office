import { describe, it, expect } from 'vitest';
import { apiGet } from './setup.js';

describe('dunnings', () => {
	it('lists dunnings from voucherlist and returns paginated shape', async () => {
		const data = await apiGet<{ content: unknown[]; totalElements: number }>(
			'/v1/voucherlist?voucherType=dunning&voucherStatus=draft,open&page=0&size=10',
		);
		expect(data).toHaveProperty('content');
		expect(Array.isArray(data.content)).toBe(true);
		expect(typeof data.totalElements).toBe('number');
	});

	it('retrieves dunning details by ID if any exist', async () => {
		const list = await apiGet<{ content: Array<{ id: string }> }>(
			'/v1/voucherlist?voucherType=dunning&voucherStatus=draft,open&page=0&size=1',
		);
		if (list.content.length === 0) {
			console.log('No dunnings found — skipping detail retrieval test');
			return;
		}
		const id = list.content[0].id;
		const data = await apiGet<{ id: string; voucherDate: string }>(`/v1/dunnings/${id}`);
		expect(data.id).toBe(id);
		expect(data).toHaveProperty('voucherDate');
	});
});
