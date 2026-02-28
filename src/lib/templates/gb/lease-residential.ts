import type { DocumentTemplate } from "../types";

export const gbLeaseResidential: DocumentTemplate = {
  id: "gb-lease-residential",
  version: "1.0.0",
  country: "GB",
  category: "rental",
  docType: "lease-residential",
  label: "Assured Shorthold Tenancy Agreement (UK)",
  description: "Standard AST agreement compliant with the Housing Act 1988 and Tenant Fees Act 2019.",
  legalBasis: "Housing Act 1988 (as amended); Tenant Fees Act 2019; Deregulation Act 2015; Energy Performance of Buildings Regulations 2012",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Landlord's full name", type: "text", required: true, validation: { minLength: 2 }, group: "Landlord" },
    { key: "landlordAddress", label: "Landlord's address", type: "text", required: true, group: "Landlord" },
    { key: "landlordEmail", label: "Landlord's email", type: "email", required: false, group: "Landlord" },
    { key: "landlordPhone", label: "Landlord's phone", type: "phone", required: false, group: "Landlord" },
    { key: "tenantName", label: "Tenant's full name", type: "text", required: true, validation: { minLength: 2 }, group: "Tenant" },
    { key: "tenantEmail", label: "Tenant's email", type: "email", required: false, group: "Tenant" },
    { key: "tenantPhone", label: "Tenant's phone", type: "phone", required: false, group: "Tenant" },
    { key: "propertyAddress", label: "Property address", type: "text", required: true, group: "The Property" },
    { key: "propertyType", label: "Property type", type: "select", required: true, options: [
      { value: "Flat", label: "Flat" },
      { value: "House", label: "House" },
      { value: "Studio", label: "Studio" },
      { value: "Room", label: "Room (in shared house)" },
    ], group: "The Property" },
    { key: "furnished", label: "Furnished?", type: "select", required: true, options: [
      { value: "unfurnished", label: "Unfurnished" },
      { value: "part-furnished", label: "Part furnished" },
      { value: "furnished", label: "Fully furnished" },
    ], defaultValue: "unfurnished", group: "The Property" },
    { key: "epcRating", label: "EPC rating", type: "select", required: true, options: [
      { value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" },
      { value: "D", label: "D" }, { value: "E", label: "E" },
    ], group: "Energy" },
    { key: "gasSafety", label: "Gas Safety Certificate provided?", type: "select", required: true, options: [
      { value: "yes", label: "Yes" }, { value: "no-gas", label: "No gas supply" },
    ], group: "Safety" },
    { key: "rentAmount", label: "Monthly rent (£)", type: "number", required: true, validation: { min: 1 }, group: "Financial terms" },
    { key: "depositAmount", label: "Deposit (£)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const dep = Number(val);
        const rent = Number(all.rentAmount);
        if (rent > 0 && dep > rent * 5) return "Deposit cannot exceed 5 weeks' rent for annual rent under £50,000 (Tenant Fees Act 2019).";
        return null;
      }
    }, group: "Financial terms" },
    { key: "depositScheme", label: "Deposit protection scheme", type: "select", required: true, options: [
      { value: "DPS", label: "Deposit Protection Service (DPS)" },
      { value: "MyDeposits", label: "MyDeposits" },
      { value: "TDS", label: "Tenancy Deposit Scheme (TDS)" },
    ], group: "Financial terms" },
    { key: "paymentDay", label: "Rent due day", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 1, group: "Financial terms" },
    { key: "paymentMethod", label: "Payment method", type: "select", required: true, options: [
      { value: "bank-transfer", label: "Bank transfer" },
      { value: "standing-order", label: "Standing order" },
    ], defaultValue: "standing-order", group: "Financial terms" },
    { key: "startDate", label: "Tenancy start date", type: "date", required: true, group: "Term" },
    { key: "duration", label: "Fixed term", type: "select", required: true, options: [
      { value: "6", label: "6 months" },
      { value: "12", label: "12 months" },
      { value: "24", label: "24 months" },
    ], defaultValue: "12", group: "Term" },
  ],
  clauses: [
    { id: "parties", label: "1. Parties", required: true,
      text: "THIS AGREEMENT is made between:\n\nLandlord: {landlordName} of {landlordAddress}\n\nTenant: {tenantName}\n\nThis is an Assured Shorthold Tenancy as defined in the Housing Act 1988." },
    { id: "property", label: "2. The Property", required: true,
      text: "The Landlord lets to the Tenant the property known as {propertyAddress} (the \"Property\"), a {propertyType}, {furnished}.\n\nEPC Rating: {epcRating}\nGas Safety Certificate: {gasSafety}" },
    { id: "term", label: "3. Term", required: true,
      text: "The tenancy begins on {startDate} for a fixed term of {duration} months.\n\nAfter the fixed term, the tenancy will become a statutory periodic tenancy (running month to month) unless either party gives proper notice.\n\nThe Tenant must give at least 1 month's written notice to end a periodic tenancy.\nThe Landlord must follow the correct legal process (Section 21 or Section 8 of the Housing Act 1988)." },
    { id: "rent", label: "4. Rent", required: true,
      text: "The rent is £{rentAmount} per calendar month, payable in advance on or before the {paymentDay}th day of each month by {paymentMethod}.\n\nRent increases during the fixed term are not permitted unless agreed in writing. After the fixed term, the Landlord may propose an increase with at least 1 month's notice using a Section 13 notice." },
    { id: "deposit", label: "5. Deposit", required: true,
      text: "The Tenant pays a deposit of £{depositAmount}.\n\nThe deposit will be protected in {depositScheme} within 30 days of receipt. The Landlord will provide the Tenant with the prescribed information as required by the Housing Act 2004.\n\nThe deposit is held as security against:\n• Damage to the Property beyond fair wear and tear\n• Unpaid rent or bills\n• Missing items (if furnished)\n• Cleaning costs at the end of the tenancy\n\nFailure to protect the deposit means the Landlord cannot serve a valid Section 21 notice and may be ordered to pay compensation of 1–3 times the deposit amount." },
    { id: "obligations-tenant", label: "6. Tenant's Obligations", required: true,
      text: "The Tenant agrees to:\n\n• Pay the rent on time\n• Keep the Property in good condition and repair any damage caused\n• Not make alterations without written consent\n• Not sub-let or assign without written consent\n• Allow the Landlord reasonable access for inspections and repairs (with at least 24 hours' notice)\n• Not cause nuisance or annoyance to neighbours\n• Notify the Landlord promptly of any disrepair\n• Comply with the terms of any buildings insurance" },
    { id: "obligations-landlord", label: "7. Landlord's Obligations", required: true,
      text: "The Landlord agrees to:\n\n• Keep the structure and exterior in repair (Landlord and Tenant Act 1985, s.11)\n• Keep installations for water, gas, electricity, and sanitation in repair\n• Provide a valid Gas Safety Certificate annually\n• Provide a valid EPC (minimum rating E)\n• Install and maintain smoke alarms on each floor and a carbon monoxide alarm in rooms with solid fuel appliances\n• Provide the Government's \"How to Rent\" guide to the Tenant\n• Protect the deposit and provide prescribed information" },
    { id: "ending", label: "8. Ending the Tenancy", required: true,
      text: "During the fixed term: the tenancy can only be ended by mutual agreement or if the Tenant is in breach.\n\nAfter the fixed term:\n• Tenant: 1 month's written notice\n• Landlord: Section 21 notice (2 months' notice, no fault) or Section 8 notice (specific grounds)\n\nSection 21 notices are only valid if:\n• The deposit is protected and prescribed information provided\n• Gas Safety Certificate, EPC, and How to Rent guide have been given to the Tenant\n• The Property is licensed (if required by the local authority)" },
    { id: "law", label: "9. Governing Law", required: true,
      text: "This agreement is governed by the laws of England and Wales.\n\nNothing in this agreement affects the Tenant's statutory rights under the Housing Act 1988, the Landlord and Tenant Act 1985, the Protection from Eviction Act 1977, or any other applicable legislation." },
  ],
};

export const gbRentReceipt: DocumentTemplate = {
  id: "gb-rent-receipt",
  version: "1.0.0",
  country: "GB",
  category: "rental",
  docType: "rent-receipt",
  label: "Rent Receipt (UK)",
  description: "Receipt for rent payment.",
  legalBasis: "Common law",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Landlord's name", type: "text", required: true, group: "Landlord" },
    { key: "tenantName", label: "Tenant's name", type: "text", required: true, group: "Tenant" },
    { key: "propertyAddress", label: "Property address", type: "text", required: true, group: "Property" },
    { key: "rentAmount", label: "Rent amount (£)", type: "number", required: true, group: "Amounts" },
    { key: "period", label: "Period", type: "text", required: true, placeholder: "January 2026", group: "Period" },
    { key: "paymentDate", label: "Payment date", type: "date", required: true, group: "Period" },
    { key: "paymentMethod", label: "Payment method", type: "select", required: true, options: [
      { value: "bank-transfer", label: "Bank transfer" },
      { value: "standing-order", label: "Standing order" },
      { value: "cash", label: "Cash" },
    ], group: "Payment" },
  ],
  clauses: [
    { id: "receipt", label: "Receipt", required: true,
      text: "RENT RECEIPT\n\nReceived from: {tenantName}\nProperty: {propertyAddress}\n\nAmount: £{rentAmount}\nPeriod: {period}\nDate received: {paymentDate}\nPayment method: {paymentMethod}\n\nReceived by: {landlordName}\n\nThis receipt confirms full payment of rent for the period stated above.\n\nSignature: ____________\nDate: ____________" },
  ],
};
