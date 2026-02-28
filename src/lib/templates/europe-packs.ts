import type { DocumentTemplate } from "./types";

// Belgium
import { beLeaseResidential, beRentReceipt } from "../templates/be/lease-residential";
// Spain
import { esLeaseResidential, esRentReceipt } from "../templates/es/lease-residential";
// Germany
import { deLeaseResidential, deRentReceipt } from "../templates/de/lease-residential";
// Italy
import { itLeaseResidential, itRentReceipt } from "../templates/it/lease-residential";
// Portugal
import { ptLeaseResidential, ptRentReceipt } from "../templates/pt/lease-residential";
// Netherlands
import { nlLeaseResidential, nlRentReceipt } from "../templates/nl/lease-residential";
// United Kingdom
import { gbLeaseResidential, gbRentReceipt } from "../templates/gb/lease-residential";
// Switzerland
import { chLeaseResidential, chRentReceipt } from "../templates/ch/lease-residential";
// Austria
import { atLeaseResidential, atRentReceipt } from "../templates/at/lease-residential";
// Luxembourg
import { luLeaseResidential, luRentReceipt } from "../templates/lu/lease-residential";

export const allEuropeTemplates: DocumentTemplate[] = [
  // Belgium
  beLeaseResidential,
  beRentReceipt,
  // Spain
  esLeaseResidential,
  esRentReceipt,
  // Germany
  deLeaseResidential,
  deRentReceipt,
  // Italy
  itLeaseResidential,
  itRentReceipt,
  // Portugal
  ptLeaseResidential,
  ptRentReceipt,
  // Netherlands
  nlLeaseResidential,
  nlRentReceipt,
  // United Kingdom
  gbLeaseResidential,
  gbRentReceipt,
  // Switzerland
  chLeaseResidential,
  chRentReceipt,
  // Austria
  atLeaseResidential,
  atRentReceipt,
  // Luxembourg
  luLeaseResidential,
  luRentReceipt,
];
