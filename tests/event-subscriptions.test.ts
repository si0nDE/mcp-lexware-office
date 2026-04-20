import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiGet, apiPost, apiDelete } from './setup.js';

describe('event-subscriptions', () => {
	let testSubscriptionId: string;

	beforeAll(async () => {
		const sub = await apiPost<{ id: string }>('/v1/event-subscriptions', {
			eventType: 'contact.created',
			callbackUrl: 'https://httpbin.org/post',
		});
		testSubscriptionId = sub.id;
	});

	afterAll(async () => {
		if (testSubscriptionId) {
			await apiDelete(`/v1/event-subscriptions/${testSubscriptionId}`);
		}
	});

	it('lists all event subscriptions', async () => {
		const data = await apiGet<{ content: unknown[] }>('/v1/event-subscriptions');
		expect(data).toHaveProperty('content');
		expect(Array.isArray(data.content)).toBe(true);
	});

	it('retrieves event subscription by ID', async () => {
		const data = await apiGet<{ subscriptionId: string; eventType: string; callbackUrl: string }>(
			`/v1/event-subscriptions/${testSubscriptionId}`,
		);
		expect(data.subscriptionId).toBe(testSubscriptionId);
		expect(data.eventType).toBe('contact.created');
		expect(data.callbackUrl).toBe('https://httpbin.org/post');
	});
});
