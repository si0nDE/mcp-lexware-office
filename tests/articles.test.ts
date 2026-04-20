import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiGet, apiPost, apiDelete } from './setup.js';

describe('articles', () => {
	let testArticleId: string;

	beforeAll(async () => {
		const article = await apiPost<{ id: string }>('/v1/articles', {
			type: 'SERVICE',
			title: '[TEST] Integrationstest Artikel',
			description: 'Automatisch erstellt durch Integrationstest',
			unitName: 'Stunde',
			price: { leadingPrice: 'NET', netPrice: 100.00, taxRate: 19 },
		});
		testArticleId = article.id;
	});

	afterAll(async () => {
		if (testArticleId) {
			await apiDelete(`/v1/articles/${testArticleId}`);
		}
	});

	it('lists articles and returns paginated content', async () => {
		const data = await apiGet<{ content: unknown[]; totalElements: number }>('/v1/articles?page=0&size=25');
		expect(data).toHaveProperty('content');
		expect(Array.isArray(data.content)).toBe(true);
		expect(typeof data.totalElements).toBe('number');
	});

	it('retrieves an article by ID', async () => {
		const data = await apiGet<{ id: string; title: string; type: string }>(
			`/v1/articles/${testArticleId}`,
		);
		expect(data.id).toBe(testArticleId);
		expect(data.title).toBe('[TEST] Integrationstest Artikel');
		expect(data.type).toBe('SERVICE');
	});

	it('retrieves article with expected shape', async () => {
		const data = await apiGet<{ id: string; version: number }>(`/v1/articles/${testArticleId}`);
		expect(data).toHaveProperty('id');
		expect(typeof data.version).toBe('number');
	});
});
