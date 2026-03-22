import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { makeLexwareOfficeRequest, makeLexwareOfficeFileRequest, makeLexwareOfficeWriteRequest } from './helper.js';
import { logger } from './logger.js';

const contactPersonSchema = z.object({
	salutation: z.string().optional(),
	firstName: z.string().optional(),
	lastName: z.string(),
	emailAddress: z.string().optional(),
	phoneNumber: z.string().optional(),
});

const addressEntrySchema = z.object({
	street: z.string().optional(),
	zip: z.string().optional(),
	city: z.string().optional(),
	countryCode: z.string().length(2).optional(),
	supplement: z.string().optional(),
});

function writeErrorResponse(result: { status: number; error: unknown } | null): string {
	if (!result) return 'Request failed due to a network or server error.';
	if (result.status === 404) return 'Record not found.';
	if (result.status === 409) return 'Version conflict — please re-fetch the record and try again.';
	if (result.status === 401 || result.status === 403) return 'Authentication or permission error.';
	return `API error (${result.status}): ${JSON.stringify(result.error, null, 2)}`;
}

const server = new McpServer({
	name: 'lexware-office',
	version: '0.3.0',
});

server.tool(
	'get-invoices',
	'Get a list of invoices from Lexware Office',
	{
		status: z
			.array(z.enum(['open', 'draft', 'paid', 'paidoff', 'voided']))
			.optional()
			.default(['open', 'draft', 'paid', 'paidoff', 'voided']),
		page: z.number().min(0).optional().default(0).describe('page number to retrieve; starts at 0'),
		size: z
			.number()
			.min(1)
			.max(250)
			.optional()
			.default(250)
			.describe('number of invoices to retrieve per page'),
	},
	async ({ status }) => {
		const voucherlistUrl = `/v1/voucherlist?voucherType=invoice&voucherStatus=${status.join(',')}`;
		const voucherlistData = await makeLexwareOfficeRequest<any>(voucherlistUrl);
		const vouchers = voucherlistData.content;

		if (!vouchers || vouchers.length === 0) {
			return {
				content: [
					{
						type: 'text',
						text: 'Failed to retrieve invoices',
					},
				],
			};
		}

		const response = `There are ${vouchers.length} invoices in Lexware Office:\n\n${JSON.stringify(
			vouchers,
			null,
			2,
		)}`;

		return {
			content: [
				{
					type: 'text',
					text: response,
				},
			],
		};
	},
);

server.tool(
	'get-invoice-details',
	'Get details of an invoice from Lexware Office',
	{
		id: z.string().uuid().describe('The id of the invoice'),
	},
	async ({ id }) => {
		const invoiceUrl = `/v1/invoices/${id}`;
		const invoiceData = await makeLexwareOfficeRequest<any>(invoiceUrl);

		if (!invoiceData) {
			return {
				content: [
					{
						type: 'text',
						text: 'Failed to retrieve invoice data',
					},
				],
			};
		}

		const response = `Invoice details:\n\n${JSON.stringify(invoiceData, null, 2)}`;

		return {
			content: [
				{
					type: 'text',
					text: response,
				},
			],
		};
	},
);

server.tool(
	'get-contacts',
	'Get contacts from Lexware Office with optional filters that are combined with a logical AND',
	{
		email: z
			.string()
			.min(3)
			.optional()
			.describe(
				'filters contacts where any of their email addresses inside the emailAddresses object or in company contactPersons match the given email value; can be a substring; _ is allowed as wildcard for any character; % is allowed as wildcard for any number of characters; _ and % can be escaped with \\',
			),
		name: z
			.string()
			.min(3)
			.optional()
			.describe(
				'filters contacts whose name matches the given name value; can be a substring; _ is allowed as wildcard for any character; % is allowed as wildcard for any number of characters; _ and % can be escaped with \\',
			),
		number: z
			.number()
			.int()
			.optional()
			.describe(
				'returns the contacts with the specified contact number (customer or vendor number)',
			),
		customer: z
			.boolean()
			.optional()
			.describe(
				'if set to true filters contacts that have the role customer, if set to false filters contacts that do not have the customer role',
			),
		vendor: z
			.boolean()
			.optional()
			.describe(
				'if set to true filters contacts that have the role vendor, if set to false filters contacts that do not have the vendor role',
			),
		page: z.number().min(0).optional().default(0).describe('page number to retrieve; starts at 0'),
		size: z
			.number()
			.min(1)
			.max(250)
			.optional()
			.default(250)
			.describe('number of contacts to retrieve per page'),
	},
	async ({ email, name, number, customer, vendor }) => {
		const params = new URLSearchParams();
		if (email) params.append('email', email);
		if (name) params.append('name', name);
		if (number) params.append('number', number.toString());
		if (customer !== undefined) params.append('customer', customer.toString());
		if (vendor !== undefined) params.append('vendor', vendor.toString());

		const contactsUrl = `/v1/contacts?${params.toString()}`;
		const contactsData = await makeLexwareOfficeRequest<any>(contactsUrl);

		if (!contactsData) {
			return {
				content: [
					{
						type: 'text',
						text: 'Failed to retrieve contacts',
					},
				],
			};
		}

		const response = `Contacts:\n\n${JSON.stringify(contactsData, null, 2)}`;

		return {
			content: [
				{
					type: 'text',
					text: response,
				},
			],
		};
	},
);

server.tool(
	'list-posting-categories',
	'Retrieve list of posting categories for bookkeeping vouchers',
	{
		type: z.enum(['income', 'outgo']).optional().describe('Filter posting categories by type'),
	},
	async ({ type }) => {
		const postingCategoriesUrl = `/v1/posting-categories`;
		const postingCategoriesData = await makeLexwareOfficeRequest<any>(postingCategoriesUrl);

		if (!postingCategoriesData) {
			return {
				content: [
					{
						type: 'text',
						text: 'Failed to retrieve posting categories',
					},
				],
			};
		}

		// Filter by type if specified
		let filteredCategories = postingCategoriesData;
		if (type) {
			filteredCategories = postingCategoriesData.filter((category: any) => category.type === type);
		}

		const response = `Posting Categories:\n\n${JSON.stringify(filteredCategories, null, 2)}`;

		return {
			content: [
				{
					type: 'text',
					text: response,
				},
			],
		};
	},
);

server.tool(
	'list-countries',
	'Retrieve list of countries known to lexoffice with their tax classifications. Tax classifications include "de" (Germany), "intraCommunity" (eligible for Innergemeinschaftliche Lieferung within EU), and "thirdPartyCountry" (countries outside the EU).',
	{
		taxClassification: z
			.enum(['de', 'intraCommunity', 'thirdPartyCountry'])
			.optional()
			.describe(
				'Filter countries by tax classification: "de" for Germany, "intraCommunity" for EU countries eligible for Innergemeinschaftliche Lieferung, or "thirdPartyCountry" for non-EU countries',
			),
	},
	async ({ taxClassification }) => {
		const countriesUrl = `/v1/countries`;
		const countriesData = await makeLexwareOfficeRequest<any>(countriesUrl);

		if (!countriesData) {
			return {
				content: [
					{
						type: 'text',
						text: 'Failed to retrieve countries',
					},
				],
			};
		}

		// Filter by taxClassification if specified
		let filteredCountries = countriesData;
		if (taxClassification) {
			filteredCountries = countriesData.filter(
				(country: any) => country.taxClassification === taxClassification,
			);
		}

		const response = `Countries:\n\n${JSON.stringify(filteredCountries, null, 2)}`;

		return {
			content: [
				{
					type: 'text',
					text: response,
				},
			],
		};
	},
);

server.tool(
	'get-vouchers',
	'Get a list of bookkeeping vouchers (Eingangsbelege/Ausgangsbelege) from Lexware Office. Voucher types: purchaseinvoice (Ausgaben), purchasecreditnote (Ausgabenminderung), salesinvoice (Einnahmen), salescreditnote (Einnahmenminderung).',
	{
		voucherType: z
			.array(
				z.enum(['purchaseinvoice', 'purchasecreditnote', 'salesinvoice', 'salescreditnote']),
			)
			.optional()
			.default(['purchaseinvoice', 'purchasecreditnote', 'salesinvoice', 'salescreditnote'])
			.describe('Filter by voucher type'),
		voucherStatus: z
			.array(
				z.enum(['unchecked', 'open', 'paid', 'paidoff', 'voided', 'transferred', 'sepadebit']),
			)
			.optional()
			.default(['unchecked', 'open', 'paid', 'paidoff', 'voided', 'transferred', 'sepadebit'])
			.describe('Filter by voucher status'),
		page: z.number().min(0).optional().default(0).describe('page number to retrieve; starts at 0'),
		size: z
			.number()
			.min(1)
			.max(250)
			.optional()
			.default(250)
			.describe('number of vouchers to retrieve per page'),
	},
	async ({ voucherType, voucherStatus, page, size }) => {
		const voucherlistUrl = `/v1/voucherlist?voucherType=${voucherType.join(',')}&voucherStatus=${voucherStatus.join(',')}&page=${page}&size=${size}`;
		const voucherlistData = await makeLexwareOfficeRequest<any>(voucherlistUrl);
		const vouchers = voucherlistData?.content;

		if (!vouchers || vouchers.length === 0) {
			return {
				content: [
					{
						type: 'text',
						text: 'No vouchers found',
					},
				],
			};
		}

		const response = `There are ${voucherlistData.totalElements} vouchers in total (showing ${vouchers.length} on page ${page}):\n\n${JSON.stringify(vouchers, null, 2)}`;

		return {
			content: [
				{
					type: 'text',
					text: response,
				},
			],
		};
	},
);

server.tool(
	'get-voucher-details',
	'Get details of a bookkeeping voucher from Lexware Office by its ID',
	{
		id: z.string().uuid().describe('The id of the voucher'),
	},
	async ({ id }) => {
		const voucherUrl = `/v1/vouchers/${id}`;
		const voucherData = await makeLexwareOfficeRequest<any>(voucherUrl);

		if (!voucherData) {
			return {
				content: [
					{
						type: 'text',
						text: 'Failed to retrieve voucher data',
					},
				],
			};
		}

		const response = `Voucher details:\n\n${JSON.stringify(voucherData, null, 2)}`;

		return {
			content: [
				{
					type: 'text',
					text: response,
				},
			],
		};
	},
);

server.tool(
	'get-file',
	'Download a file (PDF or XML) from Lexware Office by its file ID. File IDs are found in the \'files.documentFileId\' field of voucher or invoice details.',
	{
		id: z.string().uuid().describe('The file ID from the files.documentFileId field in voucher or invoice details'),
		format: z
			.enum(['pdf', 'xml'])
			.optional()
			.default('pdf')
			.describe("File format to download: 'pdf' (default) or 'xml' (XRechnung, only available for specific invoice types)."),
	},
	async ({ id, format }) => {
		const accept = format === 'xml' ? 'application/xml' : 'application/pdf';
		const fileData = await makeLexwareOfficeFileRequest(`/v1/files/${id}`, accept);

		if (!fileData) {
			return {
				content: [
					{
						type: 'text',
						text: 'Failed to retrieve file',
					},
				],
			};
		}

		return {
			content: [
				{
					type: 'resource',
					resource: {
						uri: `lexware://files/${id}`,
						mimeType: fileData.mimeType,
						blob: fileData.data.toString('base64'),
					},
				},
			],
		};
	},
);

server.tool(
	'get-payments',
	'Get payment information for an invoice or voucher from Lexware Office. Returns payment history including amounts, dates, and payment method.',
	{
		id: z.string().uuid().describe('The ID of the invoice or voucher to retrieve payment information for'),
	},
	async ({ id }) => {
		const paymentsData = await makeLexwareOfficeRequest<any>(`/v1/payments?openItemId=${id}`);

		if (!paymentsData) {
			return {
				content: [{ type: 'text', text: 'Failed to retrieve payment information' }],
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: `Payment information:\n\n${JSON.stringify(paymentsData, null, 2)}`,
				},
			],
		};
	},
);

server.tool(
	'get-payment-conditions',
	'Retrieve available payment conditions (Zahlungsbedingungen) from Lexware Office. Use these as reference when creating invoices.',
	{},
	async () => {
		const data = await makeLexwareOfficeRequest<any>('/v1/payment-conditions');

		if (!data) {
			return {
				content: [{ type: 'text', text: 'Failed to retrieve payment conditions' }],
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: `Payment conditions:\n\n${JSON.stringify(data, null, 2)}`,
				},
			],
		};
	},
);

server.tool(
	'create-contact',
	'Create a new contact (customer or vendor) in Lexware Office.',
	{
		roles: z
			.object({
				customer: z.object({}).optional().describe('Include to assign the customer role'),
				vendor: z.object({}).optional().describe('Include to assign the vendor role'),
			})
			.optional(),
		company: z
			.object({
				name: z.string(),
				taxNumber: z.string().optional(),
				vatRegistrationId: z.string().optional(),
				contactPersons: z.array(contactPersonSchema).optional(),
			})
			.optional()
			.describe('Company details — provide either company or person, not both'),
		person: z
			.object({
				salutation: z.string().optional(),
				firstName: z.string().optional(),
				lastName: z.string(),
			})
			.optional()
			.describe('Person details — provide either company or person, not both'),
		addresses: z
			.object({
				billing: z.array(addressEntrySchema).optional(),
				shipping: z.array(addressEntrySchema).optional(),
			})
			.optional(),
		emailAddresses: z
			.object({
				business: z.array(z.string()).optional(),
				office: z.array(z.string()).optional(),
				private: z.array(z.string()).optional(),
				other: z.array(z.string()).optional(),
			})
			.optional(),
		phoneNumbers: z
			.object({
				business: z.array(z.string()).optional(),
				office: z.array(z.string()).optional(),
				mobile: z.array(z.string()).optional(),
				private: z.array(z.string()).optional(),
				fax: z.array(z.string()).optional(),
				other: z.array(z.string()).optional(),
			})
			.optional(),
		note: z.string().optional(),
	},
	async (params) => {
		const result = await makeLexwareOfficeWriteRequest<any>('/v1/contacts', 'POST', params);

		if (!result || !result.ok) {
			return {
				content: [{ type: 'text', text: writeErrorResponse(result ? { status: result.status, error: result.error } : null) }],
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: `Contact created successfully:\n\n${JSON.stringify(result.data, null, 2)}`,
				},
			],
		};
	},
);

server.tool(
	'update-contact',
	'Update an existing contact in Lexware Office. Requires the current version number for optimistic locking (get it from get-contacts).',
	{
		id: z.string().uuid().describe('The ID of the contact to update'),
		version: z.number().int().describe('Current version of the contact (for optimistic locking)'),
		roles: z
			.object({
				customer: z.object({}).optional(),
				vendor: z.object({}).optional(),
			})
			.optional(),
		company: z
			.object({
				name: z.string(),
				taxNumber: z.string().optional(),
				vatRegistrationId: z.string().optional(),
				contactPersons: z.array(contactPersonSchema).optional(),
			})
			.optional(),
		person: z
			.object({
				salutation: z.string().optional(),
				firstName: z.string().optional(),
				lastName: z.string(),
			})
			.optional(),
		addresses: z
			.object({
				billing: z.array(addressEntrySchema).optional(),
				shipping: z.array(addressEntrySchema).optional(),
			})
			.optional(),
		emailAddresses: z
			.object({
				business: z.array(z.string()).optional(),
				office: z.array(z.string()).optional(),
				private: z.array(z.string()).optional(),
				other: z.array(z.string()).optional(),
			})
			.optional(),
		phoneNumbers: z
			.object({
				business: z.array(z.string()).optional(),
				office: z.array(z.string()).optional(),
				mobile: z.array(z.string()).optional(),
				private: z.array(z.string()).optional(),
				fax: z.array(z.string()).optional(),
				other: z.array(z.string()).optional(),
			})
			.optional(),
		note: z.string().optional(),
	},
	async ({ id, ...body }) => {
		const result = await makeLexwareOfficeWriteRequest<any>(`/v1/contacts/${id}`, 'PUT', body);

		if (!result || !result.ok) {
			return {
				content: [{ type: 'text', text: writeErrorResponse(result ? { status: result.status, error: result.error } : null) }],
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: `Contact updated successfully:\n\n${JSON.stringify(result.data, null, 2)}`,
				},
			],
		};
	},
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	logger.log('Lexware Office MCP Server running on stdio');
}

main().catch((error) => {
	logger.error('Fatal error in main():', { error });
	process.exit(1);
});
