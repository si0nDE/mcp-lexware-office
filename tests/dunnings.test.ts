import { describe, it, expect } from 'vitest';
import { apiGet } from './setup.js';

// Note: The Lexware Office API does NOT support listing dunnings via the voucherlist
// (voucherType=dunning is an invalid parameter — 400 Bad Request).
// Dunnings can only be retrieved by ID via GET /v1/dunnings/{id}.
//
// Note: The Lexware Office API always returns voucherStatus "draft" for dunnings,
// regardless of whether finalize=true was passed. PDFs are generated immediately.
// This is expected API behaviour, not a bug.

describe('dunnings', () => {
	it('retrieves dunning details by a known ID', async () => {
		// Test dunning created during Wave 3 integration testing
		const id = 'c030635c-723c-48bc-a514-d22e3593e773';
		const data = await apiGet<{
			id: string;
			voucherStatus: string;
			voucherDate: string;
			title: string;
		}>(`/v1/dunnings/${id}`);
		expect(data.id).toBe(id);
		expect(data).toHaveProperty('voucherStatus');
		expect(data).toHaveProperty('voucherDate');
		expect(data.title).toBe('Mahnung');
	});
});
