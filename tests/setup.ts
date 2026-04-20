import { config } from 'dotenv';

config();

const API_KEY = process.env.LEXWARE_OFFICE_API_KEY;
if (!API_KEY) throw new Error('LEXWARE_OFFICE_API_KEY is required. Copy .env.example to .env and fill in the key.');

export const API_BASE = 'https://api.lexoffice.io';
export const TEST_PREFIX = '[TEST]';

async function request<T>(path: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T | null }> {
	const res = await fetch(`${API_BASE}${path}`, {
		...options,
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${API_KEY}`,
			...options.headers,
		},
	});
	let data: T | null = null;
	try { data = await res.json() as T; } catch { /* 204 No Content etc */ }
	return { ok: res.ok, status: res.status, data };
}

export async function apiGet<T>(path: string): Promise<T> {
	const { ok, status, data } = await request<T>(path);
	if (!ok) throw new Error(`GET ${path} returned ${status}: ${JSON.stringify(data)}`);
	return data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
	const { ok, status, data } = await request<T>(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!ok) throw new Error(`POST ${path} returned ${status}: ${JSON.stringify(data)}`);
	return data as T;
}

export async function apiDelete(path: string): Promise<void> {
	const { ok, status, data } = await request<unknown>(path, { method: 'DELETE' });
	if (!ok && status !== 204) throw new Error(`DELETE ${path} returned ${status}: ${JSON.stringify(data)}`);
}

export async function apiPostMultipart<T>(path: string, formData: FormData): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
		body: formData,
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) throw new Error(`POST ${path} returned ${res.status}: ${JSON.stringify(data)}`);
	return data as T;
}
