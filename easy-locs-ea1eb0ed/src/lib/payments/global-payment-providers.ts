import type { PaymentMethod, CountryCode } from "@/lib/country/global-country-config";
import { getCountryConfig, getTaxRate } from "@/lib/country/global-country-config";

export interface PaymentProviderConfig {
  method: PaymentMethod;
  name: string;
  icon: string;
  region: string[];
  minAmount?: number;
  maxAmount?: number;
  currencies: string[];
  requiresRedirect: boolean;
  processingTime: string;
  fees: { fixed: number; percent: number; currency: string };
}

export const PAYMENT_PROVIDERS: Record<PaymentMethod, PaymentProviderConfig> = {
  card: {
    method: "card", name: "Credit/Debit Card", icon: "credit-card",
    region: ["GLOBAL"], currencies: ["*"], requiresRedirect: false,
    processingTime: "instant", fees: { fixed: 0.30, percent: 2.9, currency: "USD" },
  },
  stripe: {
    method: "stripe", name: "Stripe", icon: "stripe",
    region: ["US", "EU", "GB", "CA", "AU", "SG", "JP", "BR", "MX", "IN"],
    currencies: ["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "JPY", "BRL", "MXN", "INR"],
    requiresRedirect: false, processingTime: "instant",
    fees: { fixed: 0.30, percent: 2.9, currency: "USD" },
  },
  apple_pay: {
    method: "apple_pay", name: "Apple Pay", icon: "apple",
    region: ["GLOBAL"], currencies: ["*"], requiresRedirect: false,
    processingTime: "instant", fees: { fixed: 0, percent: 0, currency: "USD" },
  },
  google_pay: {
    method: "google_pay", name: "Google Pay", icon: "google",
    region: ["GLOBAL"], currencies: ["*"], requiresRedirect: false,
    processingTime: "instant", fees: { fixed: 0, percent: 0, currency: "USD" },
  },
  wechat_pay: {
    method: "wechat_pay", name: "WeChat Pay", icon: "wechat",
    region: ["CN"], currencies: ["CNY"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0, percent: 0.6, currency: "CNY" },
  },
  alipay: {
    method: "alipay", name: "Alipay", icon: "alipay",
    region: ["CN"], currencies: ["CNY"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0, percent: 0.55, currency: "CNY" },
  },
  upi: {
    method: "upi", name: "UPI", icon: "upi",
    region: ["IN"], currencies: ["INR"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0, percent: 0, currency: "INR" },
    maxAmount: 100000,
  },
  pix: {
    method: "pix", name: "PIX", icon: "pix",
    region: ["BR"], currencies: ["BRL"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0, percent: 0, currency: "BRL" },
  },
  mercadopago: {
    method: "mercadopago", name: "MercadoPago", icon: "mercadopago",
    region: ["BR", "MX", "AR", "CO", "CL"], currencies: ["BRL", "MXN", "ARS", "COP", "CLP"],
    requiresRedirect: true, processingTime: "instant",
    fees: { fixed: 0, percent: 3.49, currency: "BRL" },
  },
  mobile_money: {
    method: "mobile_money", name: "Mobile Money", icon: "mobile",
    region: ["AF"], currencies: ["*"], requiresRedirect: false,
    processingTime: "instant", fees: { fixed: 0, percent: 1.5, currency: "USD" },
  },
  mtn_money: {
    method: "mtn_money", name: "MTN Mobile Money", icon: "mtn",
    region: ["NG", "GH", "CM", "UG", "CI"], currencies: ["NGN", "GHS", "XAF", "UGX", "XOF"],
    requiresRedirect: false, processingTime: "instant",
    fees: { fixed: 0, percent: 1.5, currency: "USD" },
  },
  airtel_money: {
    method: "airtel_money", name: "Airtel Money", icon: "airtel",
    region: ["KE", "UG", "TZ", "NG", "IN"], currencies: ["KES", "UGX", "TZS", "NGN", "INR"],
    requiresRedirect: false, processingTime: "instant",
    fees: { fixed: 0, percent: 1.5, currency: "USD" },
  },
  mpesa: {
    method: "mpesa", name: "M-Pesa", icon: "mpesa",
    region: ["KE", "TZ", "MZ", "GH", "EG"], currencies: ["KES", "TZS", "MZN", "GHS", "EGP"],
    requiresRedirect: false, processingTime: "instant",
    fees: { fixed: 0, percent: 1, currency: "KES" },
  },
  ideal: {
    method: "ideal", name: "iDEAL", icon: "ideal",
    region: ["NL"], currencies: ["EUR"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0.29, percent: 0, currency: "EUR" },
  },
  bancontact: {
    method: "bancontact", name: "Bancontact", icon: "bancontact",
    region: ["BE", "NL"], currencies: ["EUR"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0.25, percent: 1.4, currency: "EUR" },
  },
  sepa: {
    method: "sepa", name: "SEPA Direct Debit", icon: "bank",
    region: ["EU"], currencies: ["EUR"], requiresRedirect: false,
    processingTime: "3-5 business days", fees: { fixed: 0.35, percent: 0.8, currency: "EUR" },
  },
  klarna: {
    method: "klarna", name: "Klarna", icon: "klarna",
    region: ["DE", "SE", "NO", "FI", "DK", "NL", "AT", "CH", "GB", "US"],
    currencies: ["EUR", "SEK", "NOK", "DKK", "GBP", "USD", "CHF"],
    requiresRedirect: true, processingTime: "instant",
    fees: { fixed: 0.30, percent: 3.29, currency: "EUR" },
  },
  afterpay: {
    method: "afterpay", name: "Afterpay", icon: "afterpay",
    region: ["AU", "NZ", "US", "GB", "CA"], currencies: ["AUD", "NZD", "USD", "GBP", "CAD"],
    requiresRedirect: true, processingTime: "instant",
    fees: { fixed: 0.30, percent: 4, currency: "AUD" },
  },
  cash_on_delivery: {
    method: "cash_on_delivery", name: "Cash on Delivery", icon: "cash",
    region: ["GLOBAL"], currencies: ["*"], requiresRedirect: false,
    processingTime: "on delivery", fees: { fixed: 0, percent: 0, currency: "USD" },
  },
  bank_transfer: {
    method: "bank_transfer", name: "Bank Transfer", icon: "bank",
    region: ["GLOBAL"], currencies: ["*"], requiresRedirect: false,
    processingTime: "1-3 business days", fees: { fixed: 0, percent: 0, currency: "USD" },
  },
  crypto: {
    method: "crypto", name: "Cryptocurrency", icon: "bitcoin",
    region: ["GLOBAL"], currencies: ["BTC", "ETH", "USDT", "USDC"],
    requiresRedirect: true, processingTime: "10-60 minutes",
    fees: { fixed: 0, percent: 1, currency: "USD" },
  },
  paytm: {
    method: "paytm", name: "Paytm", icon: "paytm",
    region: ["IN"], currencies: ["INR"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0, percent: 1.99, currency: "INR" },
  },
  phonepe: {
    method: "phonepe", name: "PhonePe", icon: "phonepe",
    region: ["IN"], currencies: ["INR"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0, percent: 0, currency: "INR" },
  },
  boleto: {
    method: "boleto", name: "Boleto Bancário", icon: "boleto",
    region: ["BR"], currencies: ["BRL"], requiresRedirect: false,
    processingTime: "1-3 business days", fees: { fixed: 3.49, percent: 0, currency: "BRL" },
  },
  oxxo: {
    method: "oxxo", name: "OXXO", icon: "oxxo",
    region: ["MX"], currencies: ["MXN"], requiresRedirect: false,
    processingTime: "1-3 business days", fees: { fixed: 10, percent: 0, currency: "MXN" },
    maxAmount: 10000,
  },
  giropay: {
    method: "giropay", name: "Giropay", icon: "giropay",
    region: ["DE"], currencies: ["EUR"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0.25, percent: 1.4, currency: "EUR" },
  },
  eps: {
    method: "eps", name: "EPS", icon: "eps",
    region: ["AT"], currencies: ["EUR"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0.25, percent: 1.55, currency: "EUR" },
  },
  przelewy24: {
    method: "przelewy24", name: "Przelewy24", icon: "p24",
    region: ["PL"], currencies: ["PLN", "EUR"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0.25, percent: 1.5, currency: "PLN" },
  },
  sofort: {
    method: "sofort", name: "Sofort", icon: "sofort",
    region: ["DE", "AT", "CH", "NL", "BE"], currencies: ["EUR", "CHF"],
    requiresRedirect: true, processingTime: "instant",
    fees: { fixed: 0.25, percent: 1.4, currency: "EUR" },
  },
  multibanco: {
    method: "multibanco", name: "Multibanco", icon: "multibanco",
    region: ["PT"], currencies: ["EUR"], requiresRedirect: false,
    processingTime: "1-2 business days", fees: { fixed: 0.35, percent: 1, currency: "EUR" },
  },
  paypal: {
    method: "paypal", name: "PayPal", icon: "paypal",
    region: ["GLOBAL"], currencies: ["*"], requiresRedirect: true,
    processingTime: "instant", fees: { fixed: 0.30, percent: 3.49, currency: "USD" },
  },
};

export function getProviderConfig(method: PaymentMethod): PaymentProviderConfig | null {
  return PAYMENT_PROVIDERS[method] ?? null;
}

export function getAvailablePaymentMethods(countryCode: CountryCode): PaymentProviderConfig[] {
  const config = getCountryConfig(countryCode);
  if (!config) return [PAYMENT_PROVIDERS.card];
  return config.paymentMethods
    .map((m) => PAYMENT_PROVIDERS[m])
    .filter(Boolean);
}

export interface DynamicTaxResult {
  taxRate: number;
  taxName: string;
  taxAmount: number;
  subtotal: number;
  total: number;
  invoiceRequired: boolean;
}

export function calculateDynamicTax(
  subtotal: number,
  countryCode: CountryCode,
  category?: string,
): DynamicTaxResult {
  const config = getCountryConfig(countryCode);
  const taxRate = getTaxRate(countryCode, category);
  const taxAmount = subtotal * taxRate;

  return {
    taxRate,
    taxName: config?.tax.name ?? "Tax",
    taxAmount: Math.round(taxAmount * 100) / 100,
    subtotal,
    total: Math.round((subtotal + taxAmount) * 100) / 100,
    invoiceRequired: config?.tax.invoiceRequired ?? false,
  };
}

export interface VATInvoice {
  invoiceNumber: string;
  issueDate: string;
  sellerName: string;
  sellerVATId: string;
  sellerAddress: string;
  buyerName: string;
  buyerVATId?: string;
  buyerAddress: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; vatRate: number; total: number }>;
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  countryCode: string;
  isB2B: boolean;
  reverseCharge: boolean;
}

export function generateVATInvoiceData(params: {
  sellerName: string;
  sellerVATId: string;
  sellerAddress: string;
  buyerName: string;
  buyerVATId?: string;
  buyerAddress: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  countryCode: CountryCode;
  category?: string;
}): VATInvoice {
  const config = getCountryConfig(params.countryCode);
  const isB2B = !!params.buyerVATId;
  const reverseCharge = isB2B && config?.legalFrameworks.includes("GDPR") === true;

  const taxRate = reverseCharge ? 0 : getTaxRate(params.countryCode, params.category);

  const items = params.items.map((item) => ({
    ...item,
    vatRate: taxRate,
    total: Math.round(item.quantity * item.unitPrice * (1 + taxRate) * 100) / 100,
  }));

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const vatAmount = reverseCharge ? 0 : Math.round(subtotal * taxRate * 100) / 100;

  return {
    invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    issueDate: new Date().toISOString(),
    sellerName: params.sellerName,
    sellerVATId: params.sellerVATId,
    sellerAddress: params.sellerAddress,
    buyerName: params.buyerName,
    buyerVATId: params.buyerVATId,
    buyerAddress: params.buyerAddress,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount,
    total: Math.round((subtotal + vatAmount) * 100) / 100,
    currency: config?.currency ?? "EUR",
    countryCode: params.countryCode,
    isB2B,
    reverseCharge,
  };
}
