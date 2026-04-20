import { describe, it, expect, beforeAll } from 'vitest';
import { apiGet, apiPost, TEST_PREFIX } from './setup.js';

describe('contacts', () => {
	let testContactId: string;

	beforeAll(async () => {
		const contact = await apiPost<{ id: string }>('/v1/contacts', {
			version: 0,
			roles: { customer: {} },
			person: { firstName: TEST_PREFIX, lastName: 'Integrationtest' },
		});
		testContactId = contact.id;
	});

	it('lists contacts and returns paginated content', async () => {
		const data = await apiGet<{ content: unknown[]; totalElements: number }>('/v1/contacts?page=0&size=10');
		expect(data).toHaveProperty('content');
		expect(Array.isArray(data.content)).toBe(true);
		expect(typeof data.totalElements).toBe('number');
	});

	it('retrieves a contact by ID', async () => {
		const data = await apiGet<{ id: string; version: number }>(`/v1/contacts/${testContactId}`);
		expect(data.id).toBe(testContactId);
		expect(typeof data.version).toBe('number');
	});

	it('retrieves contact with expected shape', async () => {
		const data = await apiGet<{ id: string; roles: unknown }>(`/v1/contacts/${testContactId}`);
		expect(data).toHaveProperty('id');
		expect(data).toHaveProperty('roles');
	});
});
