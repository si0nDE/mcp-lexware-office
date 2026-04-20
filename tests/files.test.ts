import { describe, it, expect } from 'vitest';
import { apiPostMultipart } from './setup.js';

describe('files', () => {
	it('uploads a minimal PNG file and returns a file ID', async () => {
		// Minimal valid 1x1 pixel PNG (base64 decoded)
		const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==';
		const pngBuffer = Buffer.from(pngBase64, 'base64');
		const blob = new Blob([pngBuffer], { type: 'image/png' });
		const formData = new FormData();
		formData.append('file', blob, '[TEST]-upload.png');
		formData.append('type', 'voucher');

		const result = await apiPostMultipart<{ id: string }>('/v1/files', formData);
		expect(result).toHaveProperty('id');
		expect(typeof result.id).toBe('string');
	});
});
