/**
 * Canonical Order Domain — atomic subdomain exports.
 * 
 * order.identity    → ID generation, validation
 * order.items       → line items, modifiers, subtotals
 * order.timeline    → state machine, transitions
 * order.pricing     → fee calculations
 * order.fulfillment → delivery/pickup tracking
 * order.assignment  → driver assignment
 * order.cancellation→ cancel rules, eligibility
 * order.refund      → refund calculations
 */
export * from "./order.identity";
export * from "./order.items";
export * from "./order.timeline";
export * from "./order.pricing";
export * from "./order.fulfillment";
export * from "./order.assignment";
export * from "./order.cancellation";
export * from "./order.refund";
