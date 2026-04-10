import type { DocumentTemplate } from "../types";

/* ─── Section 21 Notice (No-fault eviction) ─── */
export const gbSection21: DocumentTemplate = {
  id: "gb-section-21",
  version: "1.0.0",
  country: "GB",
  category: "rental",
  docType: "conges-bailleur",
  label: "Section 21 Notice (Form 6A)",
  description: "No-fault possession notice under Housing Act 1988, s.21 (Form 6A).",
  legalBasis: "Housing Act 1988, s.21; Deregulation Act 2015; The Assured Shorthold Tenancy Notices and Prescribed Requirements (England) Regulations 2015",
  needsLegalReview: true,
  active: true,
  fields: [
    { key: "landlordName", label: "Landlord's full name", type: "text", required: true, group: "Landlord" },
    { key: "landlordAddress", label: "Landlord's address", type: "text", required: true, group: "Landlord" },
    { key: "tenantName", label: "Tenant's full name", type: "text", required: true, group: "Tenant" },
    { key: "tenantAddress", label: "Property address", type: "text", required: true, group: "Tenant" },
    { key: "propertyAddress", label: "Address of the dwelling-house", type: "text", required: true, group: "Property" },
    { key: "tenancyStartDate", label: "Tenancy start date", type: "date", required: true, group: "Tenancy" },
    { key: "noticeDate", label: "Date of this notice", type: "date", required: true, group: "Notice" },
    { key: "possessionDate", label: "Earliest date possession required", type: "date", required: true, group: "Notice" },
    { key: "depositProtected", label: "Deposit protected?", type: "select", required: true, options: [
      { value: "yes", label: "Yes — deposit protected and prescribed info given" },
      { value: "no", label: "No — deposit not protected" },
    ], group: "Compliance" },
    { key: "epcProvided", label: "EPC provided to tenant?", type: "select", required: true, options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" },
    ], group: "Compliance" },
    { key: "gasSafetyProvided", label: "Gas Safety Certificate provided?", type: "select", required: true, options: [
      { value: "yes", label: "Yes" }, { value: "no-gas", label: "No gas supply" },
    ], group: "Compliance" },
    { key: "howToRentProvided", label: "How to Rent guide provided?", type: "select", required: true, options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" },
    ], group: "Compliance" },
  ],
  clauses: [
    { id: "notice", label: "Section 21 Notice", required: true,
      text: "NOTICE SEEKING POSSESSION OF A PROPERTY\nLET ON AN ASSURED SHORTHOLD TENANCY\n(Housing Act 1988, Section 21(1) and (4) as amended)\n\nTo: {tenantName}\nOf: {propertyAddress}\n\nI/We: {landlordName}\nOf: {landlordAddress}\n\nGive you notice that I/we require possession of the dwelling-house known as:\n{propertyAddress}\n\nafter {possessionDate}.\n\nThis notice is given under section 21(1)/21(4) of the Housing Act 1988.\n\nThe tenancy to which this notice relates began on {tenancyStartDate}.\n\nIMPORTANT INFORMATION FOR THE TENANT:\n\n1. This notice is the first step towards requiring you to give up possession of your home. You should read it very carefully.\n\n2. Your landlord cannot make you leave your home without an order for possession from the court.\n\n3. You do not have to leave your home on the date specified in this notice. The notice is the start of a process, not the end.\n\n4. If you need advice about this notice and what you should do about it, take it immediately to a Citizens' Advice Bureau, a housing advice centre, a law centre, or a solicitor.\n\nVALIDITY CHECKLIST:\n• Deposit protected: {depositProtected}\n• EPC provided: {epcProvided}\n• Gas Safety Certificate: {gasSafetyProvided}\n• How to Rent guide: {howToRentProvided}\n\nWARNING: A Section 21 notice is only valid if ALL prescribed requirements have been met.\n\nDate: {noticeDate}\n\nSigned: ____________" },
  ],
};

/* ─── Section 13 Rent Increase Notice ─── */
export const gbSection13: DocumentTemplate = {
  id: "gb-section-13",
  version: "1.0.0",
  country: "GB",
  category: "rental",
  docType: "rent-revision",
  label: "Section 13 Rent Increase Notice",
  description: "Statutory rent increase notice for periodic tenancies under Housing Act 1988, s.13.",
  legalBasis: "Housing Act 1988, s.13; The Assured Tenancies and Agricultural Occupancies (Forms) (England) Regulations 2015",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Landlord's name", type: "text", required: true, group: "Landlord" },
    { key: "landlordAddress", label: "Landlord's address", type: "text", required: true, group: "Landlord" },
    { key: "tenantName", label: "Tenant's name", type: "text", required: true, group: "Tenant" },
    { key: "tenantAddress", label: "Property address", type: "text", required: true, group: "Tenant" },
    { key: "propertyAddress", label: "Address of the dwelling-house", type: "text", required: true, group: "Property" },
    { key: "currentRent", label: "Current rent (£/month)", type: "number", required: true, group: "Rent" },
    { key: "newRent", label: "Proposed new rent (£/month)", type: "number", required: true, group: "Rent" },
    { key: "effectiveDate", label: "Effective date of new rent", type: "date", required: true, group: "Dates" },
    { key: "noticeDate", label: "Date of this notice", type: "date", required: true, group: "Dates" },
  ],
  clauses: [
    { id: "s13-notice", label: "Section 13 Notice", required: true,
      text: "LANDLORD'S NOTICE PROPOSING A NEW RENT\nUNDER AN ASSURED PERIODIC TENANCY\n(Housing Act 1988, Section 13)\n\nTo: {tenantName}\nOf: {propertyAddress}\n\nFrom: {landlordName}\nOf: {landlordAddress}\n\nI/We give notice that, as from {effectiveDate}, the new rent for the dwelling-house at {propertyAddress} will be:\n\nCurrent rent: £{currentRent} per month\nProposed new rent: £{newRent} per month\n\nIMPORTANT INFORMATION FOR THE TENANT:\n\n1. The landlord can normally only increase the rent once a year for a periodic tenancy.\n\n2. This notice must be given at least one month before the proposed new rent takes effect (for monthly tenancies).\n\n3. If you believe the proposed rent is above the market rate, you may refer this notice to a First-tier Tribunal (Property Chamber) before the proposed effective date.\n\n4. The Tribunal will determine the market rent and their decision is binding on both parties.\n\n5. If you do not refer this notice to the Tribunal, you will be required to pay the new rent from the effective date.\n\nDate: {noticeDate}\n\nSigned: ____________" },
  ],
};

/* ─── Detailed Inventory / Schedule of Condition ─── */
export const gbInventory: DocumentTemplate = {
  id: "gb-inventory-detailed",
  version: "1.0.0",
  country: "GB",
  category: "rental",
  docType: "inventory",
  label: "Inventory & Schedule of Condition",
  description: "Professional inventory and condition report for check-in/check-out.",
  legalBasis: "Housing Act 2004 (deposit protection); common law",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "reportType", label: "Report type", type: "select", required: true, options: [
      { value: "check-in", label: "Check-in" },
      { value: "check-out", label: "Check-out" },
    ], group: "Type" },
    { key: "propertyAddress", label: "Property address", type: "text", required: true, group: "Property" },
    { key: "landlordName", label: "Landlord / Agent", type: "text", required: true, group: "Parties" },
    { key: "tenantName", label: "Tenant", type: "text", required: true, group: "Parties" },
    { key: "reportDate", label: "Date of inspection", type: "date", required: true, group: "Date" },
    { key: "meterElec", label: "Electricity meter reading", type: "text", required: false, group: "Meter readings" },
    { key: "meterGas", label: "Gas meter reading", type: "text", required: false, group: "Meter readings" },
    { key: "meterWater", label: "Water meter reading", type: "text", required: false, group: "Meter readings" },
    { key: "keysCount", label: "Number of keys provided", type: "number", required: true, group: "Keys" },
    { key: "keysDetail", label: "Key details", type: "textarea", required: false, placeholder: "2× front door\n1× back door\n1× garage\n2× window keys\n1× mailbox", group: "Keys" },
    { key: "roomsDescription", label: "Room-by-room condition report", type: "textarea", required: true, validation: { minLength: 20 }, placeholder: "HALLWAY:\n- Floor: laminate — good condition\n- Walls: magnolia paint — good, minor scuff marks\n- Ceiling: white — good\n- Smoke alarm: present and working\n\nLIVING ROOM:\n- Floor: carpet — good\n...", group: "Condition" },
    { key: "cleanlinessRating", label: "Overall cleanliness", type: "select", required: true, options: [
      { value: "professional", label: "Professionally cleaned" },
      { value: "good", label: "Good — domestic standard" },
      { value: "fair", label: "Fair — some attention needed" },
      { value: "poor", label: "Poor — significant cleaning required" },
    ], group: "Condition" },
    { key: "observations", label: "Additional observations", type: "textarea", required: false, group: "Observations" },
  ],
  clauses: [
    { id: "header", label: "Header", required: true,
      text: "INVENTORY AND SCHEDULE OF CONDITION\n{reportType}\n\nProperty: {propertyAddress}\nDate: {reportDate}\n\nLandlord/Agent: {landlordName}\nTenant: {tenantName}\n\nOverall cleanliness: {cleanlinessRating}" },
    { id: "meters", label: "Meter readings", required: true,
      text: "METER READINGS\n\n• Electricity: {meterElec}\n• Gas: {meterGas}\n• Water: {meterWater}\n\nReadings taken at the time of inspection." },
    { id: "keys", label: "Keys", required: true,
      text: "KEYS PROVIDED\n\nTotal keys: {keysCount}\n\nDetails:\n{keysDetail}" },
    { id: "rooms", label: "Room-by-room report", required: true,
      text: "CONDITION REPORT — ROOM BY ROOM\n(Floors, walls, ceilings, windows, doors, fixtures, fittings)\n\n{roomsDescription}" },
    { id: "observations-clause", label: "Observations", required: false,
      conditional: (data) => !!data.observations && String(data.observations).length > 3,
      text: "ADDITIONAL OBSERVATIONS\n\n{observations}" },
    { id: "signatures", label: "Signatures", required: true,
      text: "DECLARATION\n\nBoth parties agree that this inventory accurately reflects the condition of the property at the time of inspection.\n\nThis document may be used as evidence in any deposit dispute.\n\nLandlord/Agent: _______________     Date: ____________\n\nTenant: _______________              Date: ____________" },
  ],
};

/* ─── Deposit Return Statement ─── */
export const gbDepositReturn: DocumentTemplate = {
  id: "gb-deposit-return",
  version: "1.0.0",
  country: "GB",
  category: "rental",
  docType: "deposit-return",
  label: "Deposit Return Statement",
  description: "End-of-tenancy deposit deductions and return statement.",
  legalBasis: "Housing Act 2004, ss.212-215; Tenant Fees Act 2019; TDS/DPS/MyDeposits scheme rules",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Landlord's name", type: "text", required: true, group: "Landlord" },
    { key: "landlordAddress", label: "Landlord's address", type: "text", required: true, group: "Landlord" },
    { key: "tenantName", label: "Tenant's name", type: "text", required: true, group: "Tenant" },
    { key: "tenantNewAddress", label: "Tenant's new address", type: "text", required: true, group: "Tenant" },
    { key: "propertyAddress", label: "Property address", type: "text", required: true, group: "Property" },
    { key: "tenancyEndDate", label: "Tenancy end date", type: "date", required: true, group: "Tenancy" },
    { key: "depositAmount", label: "Deposit held (£)", type: "number", required: true, group: "Deposit" },
    { key: "depositScheme", label: "Protection scheme", type: "select", required: true, options: [
      { value: "DPS", label: "DPS" },
      { value: "MyDeposits", label: "MyDeposits" },
      { value: "TDS", label: "TDS" },
    ], group: "Deposit" },
    { key: "deductionsDetail", label: "Proposed deductions", type: "textarea", required: false, placeholder: "Cleaning (professional clean required): £150\nDamage to bedroom carpet (beyond fair wear and tear): £200\nMissing items (2 dining chairs): £80\nRent arrears: £0", group: "Deductions" },
    { key: "totalDeductions", label: "Total deductions (£)", type: "number", required: false, defaultValue: 0, group: "Deductions" },
    { key: "tenantBankDetails", label: "Tenant bank details for refund", type: "text", required: false, group: "Refund" },
    { key: "issueDate", label: "Date", type: "date", required: true, group: "Date" },
  ],
  clauses: [
    { id: "statement", label: "Deposit Return Statement", required: true,
      text: "DEPOSIT RETURN STATEMENT\n\nFrom: {landlordName}, {landlordAddress}\nTo: {tenantName}, {tenantNewAddress}\n\nProperty: {propertyAddress}\nTenancy end date: {tenancyEndDate}\nDeposit protection scheme: {depositScheme}\n\nDate: {issueDate}\n\n╔══════════════════════════════════════╗\n║ Deposit held               : £{depositAmount}\n║ ────────────────────────────────────\n║ Proposed deductions:\n{deductionsDetail}\n║ Total deductions           : £{totalDeductions}\n║ ────────────────────────────────────\n║ AMOUNT TO BE RETURNED:\n║ £{depositAmount} - £{totalDeductions}\n╚══════════════════════════════════════╝\n\nIMPORTANT INFORMATION:\n\n• If you agree with the proposed deductions, please confirm in writing within 10 days.\n• If you disagree, you have the right to raise a dispute through the {depositScheme} scheme's Alternative Dispute Resolution (ADR) service — free of charge.\n• The deposit scheme will make a binding decision based on evidence provided by both parties.\n• Evidence may include: check-in/check-out inventories, photographs, receipts, and correspondence.\n• The landlord bears the burden of proof for any deductions claimed.\n\nBank details for refund: {tenantBankDetails}\n\nSigned: ____________" },
  ],
};

/* ─── Tenant Notice to Quit ─── */
export const gbTenantNotice: DocumentTemplate = {
  id: "gb-tenant-notice",
  version: "1.0.0",
  country: "GB",
  category: "rental",
  docType: "conges-locataire",
  label: "Tenant's Notice to Quit",
  description: "Written notice from tenant to end a periodic assured shorthold tenancy.",
  legalBasis: "Housing Act 1988; common law (periodic tenancy notice requirements)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "tenantName", label: "Tenant's full name", type: "text", required: true, group: "Tenant" },
    { key: "tenantAddress", label: "Current address (property)", type: "text", required: true, group: "Tenant" },
    { key: "landlordName", label: "Landlord's full name", type: "text", required: true, group: "Landlord" },
    { key: "landlordAddress", label: "Landlord's address", type: "text", required: true, group: "Landlord" },
    { key: "propertyAddress", label: "Property address", type: "text", required: true, group: "Property" },
    { key: "tenancyStartDate", label: "Tenancy start date", type: "date", required: true, group: "Tenancy" },
    { key: "vacateDate", label: "Date you will vacate", type: "date", required: true, group: "Notice" },
    { key: "newAddress", label: "Forwarding address", type: "text", required: false, group: "Notice" },
    { key: "noticeDate", label: "Date of this notice", type: "date", required: true, group: "Notice" },
  ],
  clauses: [
    { id: "notice", label: "Notice to Quit", required: true,
      text: "{tenantName}\n{tenantAddress}\n\n{landlordName}\n{landlordAddress}\n\n{noticeDate}\n\nDear {landlordName},\n\nNOTICE TO QUIT\n\nI am writing to give you notice that I wish to end my tenancy of the property at:\n\n{propertyAddress}\n\nThe tenancy began on {tenancyStartDate}. I will vacate the property on or before {vacateDate}.\n\nI confirm that this notice provides at least one full month's notice, ending on a rent payment date, as required for a periodic tenancy.\n\nI would be grateful if you could arrange:\n• A check-out inspection / inventory at a mutually convenient time\n• Meter readings to be taken on the day of departure\n• Return of my deposit through {depositScheme} in accordance with the law\n\nMy forwarding address for correspondence and deposit return: {newAddress}\n\nPlease acknowledge receipt of this notice.\n\nYours sincerely,\n\n_______________\n{tenantName}" },
  ],
};
