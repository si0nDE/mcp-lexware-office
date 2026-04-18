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
		const LEXOFFICE_API_BASE = 'https://api.lexoffice.io';
		const LEXWARE_OFFICE_API_KEY = process.env.LEXWARE_OFFICE_API_KEY!;
		const response = await fetch(`${LEXOFFICE_API_BASE}/v1/payments/${id}`, {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${LEXWARE_OFFICE_API_KEY}`,
			},
		}).catch(() => null);

		if (!response) {
			return { content: [{ type: 'text', text: 'Network error retrieving payment information' }] };
		}

		let body: unknown;
		try { body = await response.json(); } catch { body = null; }

		if (!response.ok) {
			return {
				content: [{ type: 'text', text: `API error ${response.status}: ${JSON.stringify(body)}` }],
			};
		}

		return {
			content: [{ type: 'text', text: `Payment information:\n\n${JSON.stringify(body, null, 2)}` }],
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
	'Create a new contact in Lexware Office. Provide companyName for a company contact, or firstName/lastName for a person. Set customer and/or vendor to true.',
	{
		customer: z.string().optional().transform(v => v === 'true').describe('Set to "true" to assign the customer role'),
		vendor: z.string().optional().transform(v => v === 'true').describe('Set to "true" to assign the vendor role'),
		companyName: z.string().optional().describe('Company name — provide either companyName or lastName, not both'),
		taxNumber: z.string().optional().describe('Tax number of the company'),
		vatRegistrationId: z.string().optional().describe('VAT registration ID of the company'),
		firstName: z.string().optional().describe('First name — for person contacts'),
		lastName: z.string().optional().describe('Last name — for person contacts; required if companyName is not provided'),
		salutation: z.string().optional().describe('Salutation for person contacts'),
		note: z.string().optional(),
	},
	async ({ customer, vendor, companyName, taxNumber, vatRegistrationId, firstName, lastName, salutation, note }) => {
		const result = await makeLexwareOfficeWriteRequest<any>('/v1/contacts', 'POST', {
			version: 0,
			roles: {
				...(customer ? { customer: {} } : {}),
				...(vendor ? { vendor: {} } : {}),
			},
			...(companyName
				? { company: { name: companyName, ...(taxNumber ? { taxNumber } : {}), ...(vatRegistrationId ? { vatRegistrationId } : {}) } }
				: {}),
			...(lastName || firstName ? { person: { ...(salutation ? { salutation } : {}), ...(firstName ? { firstName } : {}), ...(lastName ? { lastName } : {}) } } : {}),
			...(note ? { note } : {}),
		});

		if (!result || !result.ok) {
			return {
				content: [{ type: 'text', text: writeErrorResponse(result && !result.ok ? result : null) }],
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
		customer: z.string().optional().transform(v => v === 'true').describe('Set to "true" to assign the customer role'),
		vendor: z.string().optional().transform(v => v === 'true').describe('Set to "true" to assign the vendor role'),
		companyName: z.string().optional().describe('Company name'),
		taxNumber: z.string().optional().describe('Tax number of the company'),
		vatRegistrationId: z.string().optional().describe('VAT registration ID of the company'),
		firstName: z.string().optional().describe('First name — for person contacts'),
		lastName: z.string().optional().describe('Last name — for person contacts'),
		salutation: z.string().optional().describe('Salutation for person contacts'),
		note: z.string().optional(),
	},
	async ({ id, customer, vendor, companyName, taxNumber, vatRegistrationId, firstName, lastName, salutation, note, version }) => {
		if (!customer && !vendor) {
			return {
				content: [{ type: 'text', text: 'Error: Lexoffice requires at least one role. Set customer or vendor to "true".' }],
			};
		}
		const apiRoles = {
			...(customer ? { customer: {} } : {}),
			...(vendor ? { vendor: {} } : {}),
		};
		const result = await makeLexwareOfficeWriteRequest<any>(`/v1/contacts/${id}`, 'PUT', {
			version,
			roles: apiRoles,
			...(companyName
				? { company: { name: companyName, ...(taxNumber ? { taxNumber } : {}), ...(vatRegistrationId ? { vatRegistrationId } : {}) } }
				: {}),
			...(lastName || firstName ? { person: { ...(salutation ? { salutation } : {}), ...(firstName ? { firstName } : {}), ...(lastName ? { lastName } : {}) } } : {}),
			...(note ? { note } : {}),
		});

		if (!result || !result.ok) {
			return {
				content: [{ type: 'text', text: writeErrorResponse(result && !result.ok ? result : null) }],
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

const lineItemSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.enum(['material', 'service', 'custom']),
		name: z.string().describe('Line item description'),
		quantity: z.number().describe('Quantity'),
		unitName: z.string().describe('Unit name, e.g. "Stunden", "Stück"'),
		unitPrice: z.object({
			currency: z.literal('EUR'),
			netAmount: z.string().describe('Net amount as string, e.g. "9.99"'),
			taxRatePercentage: z.number().describe('Tax rate, e.g. 19 for 19%'),
		}),
		discountPercentage: z.number().min(0).max(100).optional(),
	}),
	z.object({
		type: z.literal('text'),
		name: z.string().describe('Free text line (no price or quantity)'),
	}),
]);

const invoiceAddressSchema = z.union([
	z.object({
		contactId: z.string().uuid().describe('Reference to an existing contact'),
	}),
	z.object({
		name: z.string(),
		street: z.string().optional(),
		zip: z.string().optional(),
		city: z.string().optional(),
		countryCode: z.string().length(2).describe('ISO 3166-1 alpha-2, e.g. "DE"'),
	}),
]);

const invoiceSchema = {
	voucherDate: z.string().describe('Invoice date in ISO 8601 format, e.g. "2026-03-22T00:00:00.000+01:00"'),
	address: invoiceAddressSchema,
	lineItems: z.array(lineItemSchema).min(1),
	taxConditions: z.object({
		taxType: z.enum(['net', 'gross', 'vatfree']).describe('"net" = Netto, "gross" = Brutto, "vatfree" = steuerfrei'),
	}),
	shippingConditions: z.object({
		shippingDate: z.string().describe('Service/delivery date in ISO 8601 format'),
		shippingEndDate: z.string().optional().describe('End date for period types (serviceperiod/deliveryperiod)'),
		shippingType: z
			.enum(['service', 'delivery', 'serviceperiod', 'deliveryperiod'])
			.describe('"service" = Leistungsdatum, "delivery" = Lieferdatum, "serviceperiod" = Leistungszeitraum, "deliveryperiod" = Lieferzeitraum'),
	}).describe('Service/delivery conditions — required by Lexoffice API'),
	paymentConditions: z
		.object({
			paymentTermLabelLanguage: z.enum(['de', 'en']).optional(),
			paymentTermDuration: z.number().int().describe('Payment term in days'),
			paymentDiscountConditions: z
				.object({
					discountPercentage: z.number(),
					discountRange: z.number().int().describe('Days within which discount applies'),
				})
				.optional(),
		})
		.optional(),
	introduction: z.string().optional().describe('Introductory text before line items'),
	remark: z.string().optional().describe('Closing text after line items'),
};

async function handleInvoiceRequest(
	params: Record<string, unknown>,
	finalize: boolean,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
	const path = finalize ? '/v1/invoices?finalize=true' : '/v1/invoices';
	const body = {
		...params,
		totalPrice: { currency: 'EUR' },
	};
	const result = await makeLexwareOfficeWriteRequest<any>(path, 'POST', body);

	if (!result || !result.ok) {
		return { content: [{ type: 'text', text: writeErrorResponse(result && !result.ok ? result : null) }] };
	}

	const action = finalize ? 'created and finalized' : 'created as draft';
	return {
		content: [
			{
				type: 'text',
				text: `Invoice ${action} successfully:\n\n${JSON.stringify(result.data, null, 2)}`,
			},
		],
	};
}

server.tool(
	'create-invoice',
	'Create a new invoice as a draft in Lexware Office. The invoice will not be sent to the customer. Use finalize-invoice to create and immediately finalize.',
	invoiceSchema,
	async (params) => handleInvoiceRequest(params, false),
);

server.tool(
	'finalize-invoice',
	'Create and immediately finalize (publish) an invoice in Lexware Office. The invoice will be locked and cannot be edited. Use create-invoice to create a draft first.',
	invoiceSchema,
	async (params) => handleInvoiceRequest(params, true),
);

const dunningSchema = {
	precedingSalesVoucherId: z
		.string()
		.uuid()
		.describe('ID of the invoice this dunning is for (from get-invoices or get-invoice-details)'),
	voucherDate: z.string().describe('Dunning date in ISO 8601 format, e.g. "2026-03-22T00:00:00.000+01:00"'),
	address: invoiceAddressSchema,
	lineItems: z.array(lineItemSchema).min(1),
	taxConditions: z.object({
		taxType: z.enum(['net', 'gross', 'vatfree']),
	}),
	shippingConditions: z.object({
		shippingDate: z.string().describe('Service/delivery date in ISO 8601 format'),
		shippingEndDate: z.string().optional(),
		shippingType: z.enum(['service', 'delivery', 'serviceperiod', 'deliveryperiod']),
	}).describe('Required by Lexoffice API'),
	introduction: z.string().optional(),
	remark: z.string().optional(),
};

async function handleDunningRequest(
	params: Record<string, unknown>,
	finalize: boolean,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
	const { precedingSalesVoucherId, ...rest } = params;
	const queryParams = new URLSearchParams({
		precedingSalesVoucherId: precedingSalesVoucherId as string,
		...(finalize ? { finalize: 'true' } : {}),
	});
	const path = `/v1/dunnings?${queryParams.toString()}`;
	const body = {
		...rest,
		totalPrice: { currency: 'EUR' },
	};
	const result = await makeLexwareOfficeWriteRequest<any>(path, 'POST', body);

	if (!result || !result.ok) {
		return { content: [{ type: 'text', text: writeErrorResponse(result && !result.ok ? result : null) }] };
	}

	const action = finalize ? 'created and finalized' : 'created as draft';
	return {
		content: [
			{
				type: 'text',
				text: `Dunning ${action} successfully:\n\n${JSON.stringify(result.data, null, 2)}`,
			},
		],
	};
}

server.tool(
	'create-dunning',
	'Create a dunning notice (Mahnung) as a draft in Lexware Office for an existing invoice. Use finalize-dunning to create and immediately finalize.',
	dunningSchema,
	async (params) => handleDunningRequest(params, false),
);

server.tool(
	'finalize-dunning',
	'Create and immediately finalize a dunning notice (Mahnung) in Lexware Office for an existing invoice. The dunning will be locked and cannot be edited.',
	dunningSchema,
	async (params) => handleDunningRequest(params, true),
);

server.tool(
	'create-voucher',
	'Create a new bookkeeping voucher (Buchungsbeleg) in Lexware Office, e.g. an incoming invoice (Eingangsrechnung). Use list-posting-categories to find valid categoryId values.',
	{
		type: z
			.enum(['purchaseinvoice', 'purchasecreditnote', 'salesinvoice', 'salescreditnote'])
			.describe(
				'Voucher type: purchaseinvoice (Eingangsrechnung), purchasecreditnote (Eingangsgutschrift), salesinvoice (Ausgangsrechnung), salescreditnote (Ausgangsgutschrift)',
			),
		voucherDate: z.string().describe('Voucher date in ISO 8601 format, e.g. "2026-03-22T00:00:00.000+01:00"'),
		voucherNumber: z.string().optional().describe("The supplier's invoice number as printed on the document"),
		dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
		contactId: z.string().uuid().optional().describe('Reference to an existing contact (Lieferant/Kunde)'),
		remark: z.string().optional().describe('Internal note'),
		taxType: z
			.enum(['net', 'gross', 'vatfree'])
			.describe('"net" = Netto, "gross" = Brutto, "vatfree" = steuerfrei'),
		voucherItems: z
			.array(
				z.object({
					amount: z.number().describe('Gross amount, e.g. 119.00'),
					taxAmount: z.number().describe('Tax amount, e.g. 19.00'),
					taxRatePercent: z.number().describe('Tax rate: 0, 7, or 19'),
					categoryId: z
						.string()
						.uuid()
						.describe('Posting category ID from list-posting-categories'),
				}),
			)
			.min(1),
	},
	async (params) => {
		const totalGrossAmount = params.voucherItems.reduce((sum, item) => sum + item.amount, 0);
		const totalTaxAmount = params.voucherItems.reduce((sum, item) => sum + item.taxAmount, 0);
		const result = await makeLexwareOfficeWriteRequest<any>('/v1/vouchers', 'POST', {
			...params,
			totalGrossAmount,
			totalTaxAmount,
		});

		if (!result || !result.ok) {
			return { content: [{ type: 'text', text: writeErrorResponse(result && !result.ok ? result : null) }] };
		}

		return {
			content: [
				{
					type: 'text',
					text: `Voucher created successfully:\n\n${JSON.stringify(result.data, null, 2)}`,
				},
			],
		};
	},
);

server.tool(
	'update-voucher',
	'Update an existing bookkeeping voucher in Lexware Office. Requires the current version number (get it from get-voucher-details). All fields from create-voucher are required.',
	{
		id: z.string().uuid().describe('The ID of the voucher to update'),
		version: z.number().int().describe('Current version of the voucher (for optimistic locking)'),
		type: z.enum(['purchaseinvoice', 'purchasecreditnote', 'salesinvoice', 'salescreditnote']),
		voucherDate: z.string().describe('Voucher date in ISO 8601 format'),
		voucherNumber: z.string().optional().describe("The supplier's invoice number as printed on the document"),
		dueDate: z.string().optional(),
		contactId: z.string().uuid().optional(),
		remark: z.string().optional(),
		taxType: z.enum(['net', 'gross', 'vatfree']),
		voucherItems: z
			.array(
				z.object({
					amount: z.number().describe('Gross amount, e.g. 119.00'),
					taxAmount: z.number().describe('Tax amount, e.g. 19.00'),
					taxRatePercent: z.number(),
					categoryId: z.string().uuid(),
				}),
			)
			.min(1),
	},
	async ({ id, ...body }) => {
		const totalGrossAmount = body.voucherItems.reduce((sum, item) => sum + item.amount, 0);
		const totalTaxAmount = body.voucherItems.reduce((sum, item) => sum + item.taxAmount, 0);
		const result = await makeLexwareOfficeWriteRequest<any>(`/v1/vouchers/${id}`, 'PUT', {
			...body,
			totalGrossAmount,
			totalTaxAmount,
		});

		if (!result || !result.ok) {
			return { content: [{ type: 'text', text: writeErrorResponse(result && !result.ok ? result : null) }] };
		}

		return {
			content: [
				{
					type: 'text',
					text: `Voucher updated successfully:\n\n${JSON.stringify(result.data, null, 2)}`,
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
