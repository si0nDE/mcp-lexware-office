import { logger } from './logger.js';

const LEXWARE_OFFICE_API_KEY = process.env.LEXWARE_OFFICE_API_KEY!;
if (!LEXWARE_OFFICE_API_KEY) {
	logger.error('Error: LEXWARE_OFFICE_API_KEY environment variable is required');
	process.exit(1);
}

const LEXOFFICE_API_BASE = 'https://api.lexoffice.io';
const USER_AGENT = 'mcp-lexware-office/0.2.0';

// Helper function for making NWS API requests
export async function makeLexwareOfficeRequest<T>(path: string): Promise<T | null> {
	const url = `${LEXOFFICE_API_BASE}${path}`;
	const headers = {
		'User-Agent': USER_AGENT,
		Accept: 'application/json',
		Authorization: `Bearer ${LEXWARE_OFFICE_API_KEY}`,
	};

	logger.log('Making Lexware Office request', {
		url,
	});

	try {
		const response = await fetch(url, { headers });
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const json = await response.json();
		logger.log('Lexware Office response', { json });
		return json as T;
	} catch (error) {
		logger.error('Error making Lexware Office request', { error });
		return null;
	}
}

export async function makeLexwareOfficeFileRequest(
	path: string,
	accept: 'application/pdf' | 'application/xml',
): Promise<{ data: Buffer; mimeType: string } | null> {
	const url = `${LEXOFFICE_API_BASE}${path}`;
	const headers = {
		'User-Agent': USER_AGENT,
		Accept: accept,
		Authorization: `Bearer ${LEXWARE_OFFICE_API_KEY}`,
	};

	logger.log('Making Lexware Office file request', { url });

	try {
		const response = await fetch(url, { headers });
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const contentType = response.headers.get('Content-Type') ?? accept;
		const mimeType = contentType.split(';')[0].trim();
		const arrayBuffer = await response.arrayBuffer();
		const data = Buffer.from(arrayBuffer);
		logger.log('Lexware Office file response received', { mimeType, bytes: data.length });
		return { data, mimeType };
	} catch (error) {
		logger.error('Error making Lexware Office file request', { error });
		return null;
	}
}
