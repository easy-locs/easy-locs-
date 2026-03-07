import type { DocumentTemplate, Country, FieldSchema } from "./types";
import { frRentReceipt } from "./fr/rent-receipt";
import { frLeaseEmpty } from "./fr/lease-empty";
import { frLeaseFurnished } from "./fr/lease-furnished";
import { frLeaseCommercial } from "./fr/lease-commercial";
import { frSwornStatement } from "./fr/sworn-statement";
import { frFormalNotice } from "./fr/formal-notice";
import { frTermination } from "./fr/termination";
import { frCompanySAS, frCompanySARL, frCompanyEURL, frMicroEntrepreneur, frLegalNotice, frFormM0, frFormP0 } from "./fr/company-creation";
import { frChangeDirector, frChangeOffice, frChangeActivity } from "./fr/company-changes";
import { frPVAGO, frAccountsApproval, frShareTransfer, frCapitalIncrease, frDissolution, frPVAGE, frActeCession, frRapportGestion } from "./fr/company-admin";
import { frInventory, frRentRevision, frChargesRegularization, frUnpaidNotice } from "./fr/rental-extras";
import { frCongesBailleur, frCongesLocataire, frCautionSolidaire, frAttestationHebergement, frCommandementPayer, frRestitutionDepot } from "./fr/rental-legal";
import { frStatutsSAS, frStatutsSARL, frPacteAssocies, frNominationCAC } from "./fr/company-legal";
import { deNebenkostenabrechnung, deMieterhoehung, deKuendigungVermieter, deKuendigungMieter, deUebergabeprotokoll, deMietschuldenfreiheit, deKautionsabrechnung } from "./de/rental-extras";
import { esInventario, esRevisionRenta, esDesistimiento, esNoRenovacion, esCertificadoNoDeuda } from "./es/rental-extras";
import { itVerbaleConsegna, itAggiornamentoIstat, itDisdettaConduttore, itDisdettaLocatore } from "./it/rental-extras";
import { ptAutoVistoria, ptAtualizacaoRenda, ptDenunciaArrendatario, ptOposicaoSenhorio } from "./pt/rental-extras";
import { gbSection21, gbSection13, gbInventory, gbDepositReturn, gbTenantNotice } from "./gb/rental-extras";
import { allEuropeTemplates } from "./europe-packs";
import { allWorldTemplates } from "./world-packs";
import { allExtraWorldTemplates } from "./world-packs-extra";
import { allExtraWorldTemplates2 } from "./world-packs-extra2";
import { getAllCountryEntries, getCountryEntry, type CountryEntry } from "@/lib/global-country-registry";

// ─── FULL LOCALIZED LABELS (31 languages) ───
interface LegalLabels {
  leaseLabel: string; leaseDesc: string;
  receiptLabel: string; receiptDesc: string;
  noticeLabel: string; noticeDesc: string;
  inventoryLabel: string; inventoryDesc: string;
  terminationLabel: string; terminationDesc: string;
  depositReturnLabel: string; depositReturnDesc: string;
  lang: string;
  clauseParties: string; clauseProperty: string; clauseRent: string;
  clauseDuration: string; clauseReceipt: string; clauseNotice: string;
  clauseInventory: string; clauseTermination: string; clauseDeposit: string;
  fieldLandlord: string; fieldTenant: string; fieldAddress: string;
  fieldSurface: string; fieldRooms: string; fieldRent: string;
  fieldCharges: string; fieldDeposit: string; fieldStartDate: string;
  fieldEndDate: string; fieldDuration: string; fieldPeriod: string;
  fieldPaymentDate: string; fieldTaxId: string; fieldBankIban: string;
  fieldSignaturePlace: string;
  // Clause text templates (government-aligned)
  leaseClauseParties: string; leaseClauseProperty: string;
  leaseClauseRent: string; leaseClauseDuration: string;
  leaseClauseDeposit: string; leaseClauseTermination: string;
  receiptClause: string; noticeClause: string;
  inventoryClause: string; terminationClause: string;
  depositReturnClause: string;
  legalFooter: string;
  // Extended clauses for comprehensive government-aligned templates
  clauseObligationsTenant?: string; clauseObligationsLandlord?: string;
  clauseMaintenance?: string; clauseGoverningLaw?: string;
  leaseClauseObligationsTenant?: string; leaseClauseObligationsLandlord?: string;
  leaseClauseMaintenance?: string; leaseClauseGoverningLaw?: string;
}

const L_FR: LegalLabels = {
  leaseLabel: "Contrat de bail résidentiel", leaseDesc: "Bail d'habitation conforme à la législation en vigueur.",
  receiptLabel: "Quittance de loyer", receiptDesc: "Attestation de paiement du loyer mensuel.",
  noticeLabel: "Mise en demeure", noticeDesc: "Courrier de mise en demeure pour loyers impayés.",
  inventoryLabel: "État des lieux", inventoryDesc: "Constat contradictoire d'entrée ou de sortie.",
  terminationLabel: "Congé / Résiliation", terminationDesc: "Notification de fin de bail.",
  depositReturnLabel: "Restitution du dépôt de garantie", depositReturnDesc: "Courrier de restitution du dépôt.",
  lang: "fr",
  clauseParties: "Article 1 — Désignation des parties", clauseProperty: "Article 2 — Désignation du bien",
  clauseRent: "Article 3 — Loyer et charges", clauseDuration: "Article 4 — Durée du bail",
  clauseReceipt: "Quittance", clauseNotice: "Mise en demeure",
  clauseInventory: "État des lieux", clauseTermination: "Congé", clauseDeposit: "Dépôt de garantie",
  fieldLandlord: "Bailleur", fieldTenant: "Locataire", fieldAddress: "Adresse du bien",
  fieldSurface: "Surface habitable (m²)", fieldRooms: "Nombre de pièces principales",
  fieldRent: "Loyer mensuel hors charges", fieldCharges: "Provision pour charges",
  fieldDeposit: "Dépôt de garantie", fieldStartDate: "Date de prise d'effet",
  fieldEndDate: "Date de fin", fieldDuration: "Durée du bail",
  fieldPeriod: "Période", fieldPaymentDate: "Date de paiement",
  fieldTaxId: "SIRET / NIF", fieldBankIban: "IBAN",
  fieldSignaturePlace: "Fait à",
  leaseClauseParties: "Entre les soussignés :\n{landlordName}, demeurant {landlordAddress}, ci-après dénommé « le Bailleur »,\net\n{tenantName}, ci-après dénommé « le Locataire »,\nil a été convenu ce qui suit :",
  leaseClauseProperty: "Le Bailleur donne en location au Locataire le bien situé :\n{propertyAddress}\nSurface habitable : {surface} m² — Nombre de pièces : {rooms}",
  leaseClauseRent: "Le loyer mensuel est fixé à {rentAmount} {currency}, charges comprises pour {chargesAmount} {currency}.\nLe loyer est payable mensuellement, d'avance, le 1er de chaque mois.",
  leaseClauseDuration: "Le présent bail est consenti pour une durée de {duration}, prenant effet le {startDate}.",
  leaseClauseDeposit: "Un dépôt de garantie de {depositAmount} {currency} est versé à la signature du bail.",
  leaseClauseTermination: "Le bail peut être résilié conformément aux dispositions légales en vigueur, avec un préavis de {noticePeriod}.",
  receiptClause: "Je soussigné(e) {landlordName}, bailleur, déclare avoir reçu de {tenantName}, locataire du bien sis {propertyAddress}, la somme de {totalAmount} {currency} au titre du loyer et des charges pour la période de {period}.\n\nDétail : Loyer {rentAmount} {currency} + Charges {chargesAmount} {currency}.\n\nFait à {signaturePlace}, le {paymentDate}.",
  noticeClause: "Par la présente, {landlordName}, demeurant {landlordAddress}, met en demeure {tenantName} de régler la somme de {amountDue} {currency} correspondant aux loyers et charges impayés pour le bien situé {propertyAddress}.\n\nÀ défaut de régularisation sous 8 jours, des poursuites judiciaires pourront être engagées.",
  inventoryClause: "État des lieux ({reportType}) établi contradictoirement le {reportDate} entre {landlordName} (bailleur) et {tenantName} (locataire) pour le bien situé {propertyAddress}.\n\nObservations : {generalNotes}",
  terminationClause: "Par la présente, {senderName} notifie à {recipientName} sa décision de mettre fin au bail du bien situé {propertyAddress}, avec effet au {endDate}, conformément aux dispositions légales.",
  depositReturnClause: "Le bailleur {landlordName} restitue au locataire {tenantName} le dépôt de garantie d'un montant de {depositAmount} {currency}, déduction faite des retenues éventuelles.",
  legalFooter: "Document établi conformément à la législation en vigueur.",
  clauseObligationsTenant: "Obligations du locataire", clauseObligationsLandlord: "Obligations du bailleur",
  clauseMaintenance: "Entretien et réparations", clauseGoverningLaw: "Droit applicable",
  leaseClauseObligationsTenant: "Le locataire s'engage à :\n• Payer le loyer à la date convenue\n• Utiliser les lieux exclusivement à des fins d'habitation\n• Maintenir le logement en bon état\n• Ne pas sous-louer sans accord écrit du bailleur\n• Permettre l'accès pour les visites et réparations avec préavis\n• Ne pas causer de troubles de voisinage\n• Signaler sans délai tout dommage ou dysfonctionnement\n• Restituer le logement en bon état, compte tenu de l'usure normale",
  leaseClauseObligationsLandlord: "Le bailleur s'engage à :\n• Délivrer un logement décent et en bon état\n• Assurer l'entretien des parties communes et de la structure\n• Effectuer les grosses réparations (sauf celles imputables au locataire)\n• Respecter la jouissance paisible du locataire\n• Fournir les diagnostics et certificats obligatoires\n• Donner un préavis avant toute visite du logement\n• Se conformer à la réglementation en matière de logement",
  leaseClauseMaintenance: "Le locataire est responsable de l'entretien courant et des menues réparations.\n\nLe bailleur est responsable des réparations structurelles et des équipements essentiels.\n\nLe locataire ne peut effectuer de travaux sans l'accord écrit du bailleur.",
  leaseClauseGoverningLaw: "Le présent contrat est soumis au droit français. Tout litige sera porté devant le tribunal compétent du lieu de situation de l'immeuble.",
};

const L_EN: LegalLabels = {
  leaseLabel: "Residential Tenancy Agreement", leaseDesc: "Lease agreement compliant with local tenancy law.",
  receiptLabel: "Rent Receipt", receiptDesc: "Official proof of rent payment.",
  noticeLabel: "Formal Notice / Demand Letter", noticeDesc: "Legal notice for overdue rent.",
  inventoryLabel: "Property Inventory Report", inventoryDesc: "Check-in / check-out condition report.",
  terminationLabel: "Notice of Termination", terminationDesc: "Formal termination of tenancy.",
  depositReturnLabel: "Security Deposit Return", depositReturnDesc: "Statement of deposit return.",
  lang: "en",
  clauseParties: "Section 1 — Parties", clauseProperty: "Section 2 — Premises",
  clauseRent: "Section 3 — Rent & Charges", clauseDuration: "Section 4 — Term",
  clauseReceipt: "Receipt", clauseNotice: "Notice",
  clauseInventory: "Inventory", clauseTermination: "Termination", clauseDeposit: "Security Deposit",
  fieldLandlord: "Landlord / Lessor", fieldTenant: "Tenant / Lessee", fieldAddress: "Property address",
  fieldSurface: "Floor area", fieldRooms: "Number of rooms",
  fieldRent: "Monthly rent", fieldCharges: "Service charges",
  fieldDeposit: "Security deposit", fieldStartDate: "Commencement date",
  fieldEndDate: "End date", fieldDuration: "Duration",
  fieldPeriod: "Period", fieldPaymentDate: "Payment date",
  fieldTaxId: "Tax ID", fieldBankIban: "IBAN / Account No.",
  fieldSignaturePlace: "Signed at",
  leaseClauseParties: "This Tenancy Agreement is made between:\nThe Landlord: {landlordName}, of {landlordAddress},\nand\nThe Tenant: {tenantName}.\nThe parties agree as follows:",
  leaseClauseProperty: "The Landlord lets to the Tenant the premises at:\n{propertyAddress}\nFloor area: {surface} — Rooms: {rooms}",
  leaseClauseRent: "The monthly rent is {rentAmount} {currency}, with service charges of {chargesAmount} {currency}.\nRent is payable monthly in advance on the first day of each month.",
  leaseClauseDuration: "This tenancy is for a term of {duration}, commencing on {startDate}.",
  leaseClauseDeposit: "A security deposit of {depositAmount} {currency} is payable upon signing.",
  leaseClauseTermination: "Either party may terminate this agreement in accordance with applicable law, providing {noticePeriod} notice.",
  receiptClause: "I, {landlordName}, landlord, hereby acknowledge receipt from {tenantName}, tenant at {propertyAddress}, of the sum of {totalAmount} {currency} for rent and charges for the period {period}.\n\nBreakdown: Rent {rentAmount} {currency} + Charges {chargesAmount} {currency}.\n\nSigned at {signaturePlace}, on {paymentDate}.",
  noticeClause: "{landlordName}, of {landlordAddress}, hereby gives formal notice to {tenantName} to pay the outstanding amount of {amountDue} {currency} for the property at {propertyAddress}.\n\nFailure to pay within 14 days may result in legal proceedings.",
  inventoryClause: "Inventory report ({reportType}) prepared on {reportDate} by {landlordName} (landlord) and {tenantName} (tenant) for the property at {propertyAddress}.\n\nNotes: {generalNotes}",
  terminationClause: "{senderName} hereby gives notice to {recipientName} of termination of the tenancy at {propertyAddress}, effective {endDate}, in accordance with applicable law.",
  depositReturnClause: "The landlord {landlordName} returns to the tenant {tenantName} the security deposit of {depositAmount} {currency}, less any deductions.",
  legalFooter: "This document is prepared in accordance with applicable tenancy legislation.",
  clauseObligationsTenant: "Tenant's Obligations", clauseObligationsLandlord: "Landlord's Obligations",
  clauseMaintenance: "Maintenance & Repairs", clauseGoverningLaw: "Governing Law",
  leaseClauseObligationsTenant: "The Tenant agrees to:\n• Pay rent punctually on the due date\n• Use the premises exclusively for residential purposes\n• Keep the property in good condition\n• Not sublet or assign without written consent\n• Allow reasonable access for inspections with prior notice\n• Not cause nuisance or disturbance to neighbours\n• Report damage or needed repairs promptly\n• Comply with all applicable laws and building regulations\n• Return the property in its original condition, accounting for fair wear and tear",
  leaseClauseObligationsLandlord: "The Landlord agrees to:\n• Deliver the property in habitable condition\n• Maintain the structural integrity and essential systems (plumbing, electrical, heating)\n• Carry out major repairs not caused by the Tenant\n• Respect the Tenant's right to quiet enjoyment\n• Provide required documentation and certificates\n• Give proper notice before entering the property\n• Comply with all applicable housing and safety regulations",
  leaseClauseMaintenance: "The Tenant is responsible for minor day-to-day maintenance and upkeep.\n\nThe Landlord is responsible for structural repairs, essential installations, and any repairs not attributable to the Tenant's use.\n\nThe Tenant shall not make alterations without the Landlord's prior written consent.",
  leaseClauseGoverningLaw: "This agreement is governed by the applicable tenancy laws. Any dispute shall be submitted to the competent courts of the jurisdiction where the property is located. If any provision is found invalid, the remaining provisions continue in full force.",
};

const L_ES: LegalLabels = {
  leaseLabel: "Contrato de arrendamiento de vivienda", leaseDesc: "Contrato conforme a la Ley de Arrendamientos Urbanos (LAU).",
  receiptLabel: "Recibo de alquiler", receiptDesc: "Justificante de pago de la renta mensual.",
  noticeLabel: "Requerimiento de pago", noticeDesc: "Carta formal de reclamación de rentas impagadas.",
  inventoryLabel: "Inventario del inmueble", inventoryDesc: "Acta de entrega y devolución del inmueble.",
  terminationLabel: "Comunicación de resolución", terminationDesc: "Notificación de finalización del contrato.",
  depositReturnLabel: "Devolución de la fianza", depositReturnDesc: "Comunicación de devolución de fianza.",
  lang: "es",
  clauseParties: "Cláusula 1ª — Partes contratantes", clauseProperty: "Cláusula 2ª — Inmueble arrendado",
  clauseRent: "Cláusula 3ª — Renta y gastos", clauseDuration: "Cláusula 4ª — Duración del contrato",
  clauseReceipt: "Recibo", clauseNotice: "Requerimiento",
  clauseInventory: "Inventario", clauseTermination: "Resolución", clauseDeposit: "Fianza",
  fieldLandlord: "Arrendador", fieldTenant: "Arrendatario", fieldAddress: "Dirección del inmueble",
  fieldSurface: "Superficie útil (m²)", fieldRooms: "Habitaciones",
  fieldRent: "Renta mensual", fieldCharges: "Gastos comunes",
  fieldDeposit: "Fianza", fieldStartDate: "Fecha de inicio",
  fieldEndDate: "Fecha de finalización", fieldDuration: "Duración",
  fieldPeriod: "Periodo", fieldPaymentDate: "Fecha de pago",
  fieldTaxId: "NIF / CIF", fieldBankIban: "IBAN",
  fieldSignaturePlace: "Firmado en",
  leaseClauseParties: "De una parte, D./Dña. {landlordName}, con domicilio en {landlordAddress}, en calidad de ARRENDADOR.\nDe otra parte, D./Dña. {tenantName}, en calidad de ARRENDATARIO.\nAmbas partes se reconocen capacidad legal y acuerdan lo siguiente:",
  leaseClauseProperty: "El arrendador cede en arrendamiento al arrendatario la vivienda sita en:\n{propertyAddress}\nSuperficie útil: {surface} m² — Habitaciones: {rooms}",
  leaseClauseRent: "La renta mensual se fija en {rentAmount} {currency}, más gastos comunes de {chargesAmount} {currency}.\nEl pago se realizará por mensualidades anticipadas dentro de los 7 primeros días de cada mes.",
  leaseClauseDuration: "El presente contrato tendrá una duración de {duration}, comenzando el {startDate}.",
  leaseClauseDeposit: "Se deposita como fianza la cantidad de {depositAmount} {currency} conforme al art. 36 LAU.",
  leaseClauseTermination: "El contrato podrá resolverse conforme a los artículos 9, 10 y 11 de la LAU.",
  receiptClause: "D./Dña. {landlordName}, arrendador del inmueble sito en {propertyAddress}, declara haber recibido de D./Dña. {tenantName} la cantidad de {totalAmount} {currency} en concepto de renta y gastos del periodo {period}.\n\nDesglose: Renta {rentAmount} {currency} + Gastos {chargesAmount} {currency}.",
  noticeClause: "D./Dña. {landlordName}, con domicilio en {landlordAddress}, requiere formalmente a D./Dña. {tenantName} el pago de {amountDue} {currency} correspondiente a rentas impagadas del inmueble sito en {propertyAddress}.",
  inventoryClause: "Acta de inventario ({reportType}) del inmueble sito en {propertyAddress}, realizada el {reportDate} por {landlordName} y {tenantName}.\n\nObservaciones: {generalNotes}",
  terminationClause: "{senderName} comunica a {recipientName} la resolución del contrato de arrendamiento del inmueble sito en {propertyAddress}, con efectos a partir del {endDate}.",
  depositReturnClause: "El arrendador {landlordName} procede a la devolución de la fianza de {depositAmount} {currency} al arrendatario {tenantName}.",
  legalFooter: "Documento conforme a la Ley de Arrendamientos Urbanos (LAU).",
};

const L_DE: LegalLabels = {
  leaseLabel: "Wohnungsmietvertrag", leaseDesc: "Mietvertrag gemäß BGB §§ 535 ff.",
  receiptLabel: "Mietquittung", receiptDesc: "Bestätigung des Mieteingangs.",
  noticeLabel: "Abmahnung / Zahlungsaufforderung", noticeDesc: "Schriftliche Mahnung wegen Mietrückstand.",
  inventoryLabel: "Übergabeprotokoll", inventoryDesc: "Wohnungsübergabeprotokoll bei Ein-/Auszug.",
  terminationLabel: "Kündigung des Mietverhältnisses", terminationDesc: "Formelle Kündigung.",
  depositReturnLabel: "Kautionsrückgabe", depositReturnDesc: "Abrechnung der Mietkaution.",
  lang: "de",
  clauseParties: "§1 Vertragsparteien", clauseProperty: "§2 Mietobjekt",
  clauseRent: "§3 Miete und Nebenkosten", clauseDuration: "§4 Mietdauer",
  clauseReceipt: "Quittung", clauseNotice: "Mahnung",
  clauseInventory: "Übergabeprotokoll", clauseTermination: "Kündigung", clauseDeposit: "Kaution",
  fieldLandlord: "Vermieter", fieldTenant: "Mieter", fieldAddress: "Anschrift des Mietobjekts",
  fieldSurface: "Wohnfläche (m²)", fieldRooms: "Zimmeranzahl",
  fieldRent: "Kaltmiete", fieldCharges: "Nebenkosten / Betriebskosten",
  fieldDeposit: "Mietkaution", fieldStartDate: "Mietbeginn",
  fieldEndDate: "Mietende", fieldDuration: "Laufzeit",
  fieldPeriod: "Zeitraum", fieldPaymentDate: "Zahlungsdatum",
  fieldTaxId: "Steuer-Nr. / USt-IdNr.", fieldBankIban: "IBAN",
  fieldSignaturePlace: "Ort",
  leaseClauseParties: "Zwischen dem Vermieter:\n{landlordName}, wohnhaft in {landlordAddress},\nund dem Mieter:\n{tenantName},\nwird folgender Mietvertrag geschlossen:",
  leaseClauseProperty: "Der Vermieter vermietet dem Mieter die Wohnung:\n{propertyAddress}\nWohnfläche: {surface} m² — Zimmer: {rooms}",
  leaseClauseRent: "Die monatliche Kaltmiete beträgt {rentAmount} {currency}.\nNebenkosten (Vorauszahlung): {chargesAmount} {currency}.\nDie Miete ist monatlich im Voraus bis zum 3. Werktag zu zahlen.",
  leaseClauseDuration: "Das Mietverhältnis beginnt am {startDate} und wird auf {duration} geschlossen.",
  leaseClauseDeposit: "Der Mieter zahlt eine Kaution von {depositAmount} {currency} gemäß § 551 BGB.",
  leaseClauseTermination: "Das Mietverhältnis kann unter Einhaltung der gesetzlichen Kündigungsfristen gemäß § 573c BGB gekündigt werden.",
  receiptClause: "Hiermit bestätigt {landlordName} (Vermieter) den Erhalt von {totalAmount} {currency} von {tenantName} (Mieter) für die Wohnung {propertyAddress} für den Zeitraum {period}.\n\nKaltmiete: {rentAmount} {currency} + Nebenkosten: {chargesAmount} {currency}.\n\n{signaturePlace}, den {paymentDate}.",
  noticeClause: "{landlordName}, wohnhaft {landlordAddress}, mahnt hiermit {tenantName} zur Zahlung des ausstehenden Betrags von {amountDue} {currency} für die Wohnung {propertyAddress}.",
  inventoryClause: "Übergabeprotokoll ({reportType}) vom {reportDate} für die Wohnung {propertyAddress}.\nVermieter: {landlordName} — Mieter: {tenantName}.\nAnmerkungen: {generalNotes}",
  terminationClause: "{senderName} kündigt hiermit das Mietverhältnis für die Wohnung {propertyAddress} zum {endDate} gemäß den gesetzlichen Bestimmungen.",
  depositReturnClause: "Der Vermieter {landlordName} erstattet dem Mieter {tenantName} die Kaution von {depositAmount} {currency} abzüglich etwaiger Einbehalte.",
  legalFooter: "Erstellt gemäß BGB §§ 535 ff.",
};

const L_IT: LegalLabels = {
  leaseLabel: "Contratto di locazione abitativa", leaseDesc: "Contratto conforme alla Legge 431/1998.",
  receiptLabel: "Ricevuta di pagamento canone", receiptDesc: "Attestazione di pagamento del canone di locazione.",
  noticeLabel: "Diffida ad adempiere", noticeDesc: "Intimazione formale per canoni insoluti.",
  inventoryLabel: "Verbale di consegna immobile", inventoryDesc: "Verbale di consegna e riconsegna dell'immobile.",
  terminationLabel: "Disdetta del contratto", terminationDesc: "Comunicazione di recesso dal contratto.",
  depositReturnLabel: "Restituzione del deposito cauzionale", depositReturnDesc: "Comunicazione di restituzione cauzione.",
  lang: "it",
  clauseParties: "Art. 1 — Parti contraenti", clauseProperty: "Art. 2 — Immobile locato",
  clauseRent: "Art. 3 — Canone e oneri accessori", clauseDuration: "Art. 4 — Durata della locazione",
  clauseReceipt: "Ricevuta", clauseNotice: "Diffida",
  clauseInventory: "Verbale", clauseTermination: "Disdetta", clauseDeposit: "Deposito cauzionale",
  fieldLandlord: "Locatore", fieldTenant: "Conduttore", fieldAddress: "Indirizzo dell'immobile",
  fieldSurface: "Superficie (m²)", fieldRooms: "Numero vani",
  fieldRent: "Canone mensile", fieldCharges: "Spese condominiali",
  fieldDeposit: "Deposito cauzionale", fieldStartDate: "Data di decorrenza",
  fieldEndDate: "Data di scadenza", fieldDuration: "Durata",
  fieldPeriod: "Periodo", fieldPaymentDate: "Data di pagamento",
  fieldTaxId: "Codice fiscale / P.IVA", fieldBankIban: "IBAN",
  fieldSignaturePlace: "Luogo",
  leaseClauseParties: "Tra il Sig./Sig.ra {landlordName}, residente in {landlordAddress}, di seguito « Locatore »,\ne il Sig./Sig.ra {tenantName}, di seguito « Conduttore »,\nsi conviene quanto segue:",
  leaseClauseProperty: "Il Locatore concede in locazione al Conduttore l'immobile sito in:\n{propertyAddress}\nSuperficie: {surface} m² — Vani: {rooms}",
  leaseClauseRent: "Il canone mensile di locazione è fissato in {rentAmount} {currency}, oltre a spese condominiali di {chargesAmount} {currency}.\nIl pagamento è dovuto entro il 5 di ogni mese.",
  leaseClauseDuration: "La locazione ha durata di {duration}, con decorrenza dal {startDate}.",
  leaseClauseDeposit: "Il conduttore versa un deposito cauzionale di {depositAmount} {currency} ai sensi dell'art. 11 L. 392/1978.",
  leaseClauseTermination: "Il contratto può essere risolto nel rispetto dei termini previsti dalla Legge 431/1998.",
  receiptClause: "Il/La sottoscritto/a {landlordName}, locatore dell'immobile sito in {propertyAddress}, dichiara di aver ricevuto dal conduttore {tenantName} la somma di {totalAmount} {currency} per il periodo {period}.\n\nCanone: {rentAmount} {currency} + Spese: {chargesAmount} {currency}.",
  noticeClause: "Il/La Sig./Sig.ra {landlordName}, residente in {landlordAddress}, intima formalmente al conduttore {tenantName} il pagamento della somma di {amountDue} {currency} relativa ai canoni insoluti per l'immobile sito in {propertyAddress}.",
  inventoryClause: "Verbale di consegna ({reportType}) redatto il {reportDate} tra {landlordName} (locatore) e {tenantName} (conduttore) per l'immobile sito in {propertyAddress}.\n\nNote: {generalNotes}",
  terminationClause: "{senderName} comunica al {recipientName} la disdetta del contratto di locazione dell'immobile sito in {propertyAddress}, con effetto dal {endDate}.",
  depositReturnClause: "Il locatore {landlordName} restituisce al conduttore {tenantName} il deposito cauzionale di {depositAmount} {currency}, al netto di eventuali trattenute.",
  legalFooter: "Documento conforme alla Legge 431/1998 e al Codice Civile.",
};

const L_PT: LegalLabels = {
  leaseLabel: "Contrato de arrendamento habitacional", leaseDesc: "Conforme ao NRAU (Lei n.º 6/2006).",
  receiptLabel: "Recibo de renda", receiptDesc: "Comprovativo de pagamento de renda.",
  noticeLabel: "Notificação judicial avulsa", noticeDesc: "Interpelação para pagamento de rendas em atraso.",
  inventoryLabel: "Auto de vistoria", inventoryDesc: "Auto de vistoria de entrada/saída do imóvel.",
  terminationLabel: "Denúncia do contrato", terminationDesc: "Comunicação de cessação do contrato.",
  depositReturnLabel: "Restituição da caução", depositReturnDesc: "Comunicação de restituição da caução.",
  lang: "pt",
  clauseParties: "Artigo 1.º — Partes", clauseProperty: "Artigo 2.º — Imóvel arrendado",
  clauseRent: "Artigo 3.º — Renda e encargos", clauseDuration: "Artigo 4.º — Prazo",
  clauseReceipt: "Recibo", clauseNotice: "Notificação",
  clauseInventory: "Vistoria", clauseTermination: "Denúncia", clauseDeposit: "Caução",
  fieldLandlord: "Senhorio", fieldTenant: "Inquilino/Arrendatário", fieldAddress: "Morada do imóvel",
  fieldSurface: "Área útil (m²)", fieldRooms: "Divisões",
  fieldRent: "Renda mensal", fieldCharges: "Encargos",
  fieldDeposit: "Caução", fieldStartDate: "Data de início",
  fieldEndDate: "Data de termo", fieldDuration: "Duração",
  fieldPeriod: "Período", fieldPaymentDate: "Data de pagamento",
  fieldTaxId: "NIF", fieldBankIban: "IBAN",
  fieldSignaturePlace: "Local",
  leaseClauseParties: "Entre:\nPrimeiro Outorgante (Senhorio): {landlordName}, com domicílio em {landlordAddress},\nSegundo Outorgante (Arrendatário): {tenantName},\nÉ celebrado o presente contrato de arrendamento:",
  leaseClauseProperty: "O Senhorio arrenda ao Arrendatário o imóvel sito em:\n{propertyAddress}\nÁrea: {surface} m² — Divisões: {rooms}",
  leaseClauseRent: "A renda mensal é de {rentAmount} {currency}, acrescida de encargos de {chargesAmount} {currency}.\nA renda é devida até ao 8.º dia útil de cada mês.",
  leaseClauseDuration: "O contrato tem a duração de {duration}, com início em {startDate}.",
  leaseClauseDeposit: "O arrendatário entrega uma caução de {depositAmount} {currency} nos termos do art. 1076.º CC.",
  leaseClauseTermination: "O contrato pode cessar nos termos previstos no NRAU.",
  receiptClause: "{landlordName}, senhorio do imóvel sito em {propertyAddress}, declara ter recebido de {tenantName} a quantia de {totalAmount} {currency} referente ao período {period}.\n\nRenda: {rentAmount} {currency} + Encargos: {chargesAmount} {currency}.",
  noticeClause: "{landlordName}, com domicílio em {landlordAddress}, notifica {tenantName} para proceder ao pagamento de {amountDue} {currency} referente a rendas em atraso do imóvel sito em {propertyAddress}.",
  inventoryClause: "Auto de vistoria ({reportType}) realizado em {reportDate} entre {landlordName} e {tenantName} para o imóvel sito em {propertyAddress}.\n\nObservações: {generalNotes}",
  terminationClause: "{senderName} comunica a {recipientName} a denúncia do contrato de arrendamento do imóvel sito em {propertyAddress}, com efeitos a partir de {endDate}.",
  depositReturnClause: "O senhorio {landlordName} restitui ao arrendatário {tenantName} a caução de {depositAmount} {currency}.",
  legalFooter: "Documento elaborado ao abrigo do NRAU (Lei n.º 6/2006).",
};

const L_NL: LegalLabels = {
  leaseLabel: "Huurovereenkomst woonruimte", leaseDesc: "Conform het Burgerlijk Wetboek Boek 7, Titel 4.",
  receiptLabel: "Huurkwitantie", receiptDesc: "Betalingsbewijs van de maandelijkse huur.",
  noticeLabel: "Ingebrekestelling", noticeDesc: "Formele aanmaning voor achterstallige huur.",
  inventoryLabel: "Opnamestaat", inventoryDesc: "Staat van oplevering bij aanvang/einde huur.",
  terminationLabel: "Huuropzegging", terminationDesc: "Opzegging van de huurovereenkomst.",
  depositReturnLabel: "Teruggave waarborgsom", depositReturnDesc: "Afrekening waarborgsom.",
  lang: "nl",
  clauseParties: "Artikel 1 — Partijen", clauseProperty: "Artikel 2 — Het gehuurde",
  clauseRent: "Artikel 3 — Huurprijs en servicekosten", clauseDuration: "Artikel 4 — Duur",
  clauseReceipt: "Kwitantie", clauseNotice: "Aanmaning",
  clauseInventory: "Opnamestaat", clauseTermination: "Opzegging", clauseDeposit: "Waarborgsom",
  fieldLandlord: "Verhuurder", fieldTenant: "Huurder", fieldAddress: "Adres van het gehuurde",
  fieldSurface: "Woonoppervlakte (m²)", fieldRooms: "Kamers",
  fieldRent: "Kale huurprijs", fieldCharges: "Servicekosten",
  fieldDeposit: "Waarborgsom", fieldStartDate: "Ingangsdatum",
  fieldEndDate: "Einddatum", fieldDuration: "Looptijd",
  fieldPeriod: "Periode", fieldPaymentDate: "Betaaldatum",
  fieldTaxId: "BTW-nummer / BSN", fieldBankIban: "IBAN",
  fieldSignaturePlace: "Plaats",
  leaseClauseParties: "Ondergetekenden:\nVerhuurder: {landlordName}, wonende te {landlordAddress},\nHuurder: {tenantName},\nKomen het volgende overeen:",
  leaseClauseProperty: "De verhuurder verhuurt aan de huurder de woonruimte gelegen te:\n{propertyAddress}\nOppervlakte: {surface} m² — Kamers: {rooms}",
  leaseClauseRent: "De kale huurprijs bedraagt {rentAmount} {currency} per maand.\nServicekosten: {chargesAmount} {currency}.\nDe huur is bij vooruitbetaling verschuldigd vóór de eerste van elke maand.",
  leaseClauseDuration: "De huurovereenkomst wordt aangegaan voor {duration}, ingaande {startDate}.",
  leaseClauseDeposit: "De huurder betaalt een waarborgsom van {depositAmount} {currency}.",
  leaseClauseTermination: "Opzegging geschiedt conform de wettelijke bepalingen (BW Boek 7).",
  receiptClause: "Verhuurder {landlordName} verklaart van huurder {tenantName} te hebben ontvangen {totalAmount} {currency} voor huur en servicekosten van {propertyAddress} over de periode {period}.\n\nHuur: {rentAmount} {currency} + Servicekosten: {chargesAmount} {currency}.",
  noticeClause: "{landlordName}, wonende te {landlordAddress}, stelt {tenantName} hierbij in gebreke voor het bedrag van {amountDue} {currency} wegens achterstallige huur voor {propertyAddress}.",
  inventoryClause: "Opnamestaat ({reportType}) opgemaakt op {reportDate} door {landlordName} en {tenantName} voor {propertyAddress}.\n\nOpmerkingen: {generalNotes}",
  terminationClause: "{senderName} zegt hierbij de huurovereenkomst voor {propertyAddress} op per {endDate}.",
  depositReturnClause: "Verhuurder {landlordName} retourneert aan huurder {tenantName} de waarborgsom van {depositAmount} {currency}.",
  legalFooter: "Opgesteld conform BW Boek 7, Titel 4.",
};

const L_AR: LegalLabels = {
  leaseLabel: "عقد إيجار سكني", leaseDesc: "عقد إيجار متوافق مع قانون الإيجارات المحلي.",
  receiptLabel: "إيصال دفع الإيجار", receiptDesc: "إثبات رسمي لدفع الإيجار الشهري.",
  noticeLabel: "إنذار رسمي بالدفع", noticeDesc: "إنذار قانوني بسداد الإيجارات المتأخرة.",
  inventoryLabel: "محضر تسليم العقار", inventoryDesc: "محضر استلام وتسليم العقار.",
  terminationLabel: "إشعار إنهاء العقد", terminationDesc: "إخطار رسمي بإنهاء عقد الإيجار.",
  depositReturnLabel: "رد مبلغ التأمين", depositReturnDesc: "بيان رد مبلغ التأمين.",
  lang: "ar",
  clauseParties: "البند الأول — الأطراف المتعاقدة", clauseProperty: "البند الثاني — وصف العقار",
  clauseRent: "البند الثالث — بدل الإيجار", clauseDuration: "البند الرابع — مدة العقد",
  clauseReceipt: "إيصال", clauseNotice: "إنذار",
  clauseInventory: "محضر تسليم", clauseTermination: "إنهاء", clauseDeposit: "مبلغ التأمين",
  fieldLandlord: "المؤجر", fieldTenant: "المستأجر", fieldAddress: "عنوان العقار",
  fieldSurface: "المساحة (م²)", fieldRooms: "عدد الغرف",
  fieldRent: "الإيجار الشهري", fieldCharges: "رسوم الخدمات",
  fieldDeposit: "مبلغ التأمين", fieldStartDate: "تاريخ بدء العقد",
  fieldEndDate: "تاريخ انتهاء العقد", fieldDuration: "مدة العقد",
  fieldPeriod: "الفترة", fieldPaymentDate: "تاريخ الدفع",
  fieldTaxId: "الرقم الضريبي / رقم الهوية", fieldBankIban: "رقم الحساب البنكي (IBAN)",
  fieldSignaturePlace: "مكان التوقيع",
  leaseClauseParties: "أُبرم هذا العقد بين:\nالطرف الأول (المؤجر): {landlordName}، المقيم في {landlordAddress}\nالطرف الثاني (المستأجر): {tenantName}\nواتفقا على ما يلي:",
  leaseClauseProperty: "يؤجر الطرف الأول للطرف الثاني العقار الكائن في:\n{propertyAddress}\nالمساحة: {surface} م² — الغرف: {rooms}",
  leaseClauseRent: "بدل الإيجار الشهري: {rentAmount} {currency}.\nرسوم الخدمات: {chargesAmount} {currency}.\nيُدفع الإيجار شهرياً مقدماً في اليوم الأول من كل شهر.",
  leaseClauseDuration: "مدة هذا العقد {duration}، اعتباراً من {startDate}.",
  leaseClauseDeposit: "يدفع المستأجر مبلغ تأمين قدره {depositAmount} {currency}.",
  leaseClauseTermination: "يجوز لأي من الطرفين إنهاء العقد وفقاً للقانون المعمول به.",
  receiptClause: "يقر {landlordName} (المؤجر) بتسلمه من {tenantName} (المستأجر) مبلغ {totalAmount} {currency} عن إيجار العقار الكائن في {propertyAddress} عن الفترة {period}.\n\nالإيجار: {rentAmount} {currency} + الخدمات: {chargesAmount} {currency}.",
  noticeClause: "ينذر {landlordName}، المقيم في {landlordAddress}، السيد/السيدة {tenantName} بسداد مبلغ {amountDue} {currency} المستحق عن العقار الكائن في {propertyAddress}.",
  inventoryClause: "محضر تسليم ({reportType}) محرر بتاريخ {reportDate} بين {landlordName} و{tenantName} للعقار الكائن في {propertyAddress}.\n\nملاحظات: {generalNotes}",
  terminationClause: "يخطر {senderName} السيد/السيدة {recipientName} بإنهاء عقد إيجار العقار الكائن في {propertyAddress} اعتباراً من {endDate}.",
  depositReturnClause: "يرد المؤجر {landlordName} للمستأجر {tenantName} مبلغ التأمين البالغ {depositAmount} {currency}.",
  legalFooter: "وُقّع هذا المستند وفقاً للقوانين واللوائح المعمول بها.",
};

const L_TR: LegalLabels = {
  leaseLabel: "Konut Kira Sözleşmesi", leaseDesc: "Türk Borçlar Kanunu'na uygun kira sözleşmesi.",
  receiptLabel: "Kira Makbuzu", receiptDesc: "Kira ödemesi belgesi.",
  noticeLabel: "İhtarname", noticeDesc: "Kira borcu için resmi ihtar.",
  inventoryLabel: "Teslim Tutanağı", inventoryDesc: "Giriş/çıkış teslim tutanağı.",
  terminationLabel: "Kira Fesih Bildirimi", terminationDesc: "Sözleşme fesih bildirimi.",
  depositReturnLabel: "Depozito İadesi", depositReturnDesc: "Depozito iade bildirimi.",
  lang: "tr",
  clauseParties: "Madde 1 — Taraflar", clauseProperty: "Madde 2 — Kiralanan",
  clauseRent: "Madde 3 — Kira Bedeli", clauseDuration: "Madde 4 — Süre",
  clauseReceipt: "Makbuz", clauseNotice: "İhtar",
  clauseInventory: "Tutanak", clauseTermination: "Fesih", clauseDeposit: "Depozito",
  fieldLandlord: "Kiraya Veren", fieldTenant: "Kiracı", fieldAddress: "Taşınmaz adresi",
  fieldSurface: "Kullanım alanı (m²)", fieldRooms: "Oda sayısı",
  fieldRent: "Aylık kira bedeli", fieldCharges: "Aidat/Ortak giderler",
  fieldDeposit: "Depozito", fieldStartDate: "Başlangıç tarihi",
  fieldEndDate: "Bitiş tarihi", fieldDuration: "Süre",
  fieldPeriod: "Dönem", fieldPaymentDate: "Ödeme tarihi",
  fieldTaxId: "T.C. Kimlik No / Vergi No", fieldBankIban: "IBAN",
  fieldSignaturePlace: "İmza yeri",
  leaseClauseParties: "Aşağıda bilgileri yazılı taraflar arasında kira sözleşmesi akdedilmiştir:\nKiraya Veren: {landlordName}, adres: {landlordAddress}\nKiracı: {tenantName}",
  leaseClauseProperty: "Kiralanan taşınmaz:\n{propertyAddress}\nKullanım alanı: {surface} m² — Oda: {rooms}",
  leaseClauseRent: "Aylık kira bedeli {rentAmount} {currency}, aidat {chargesAmount} {currency} olarak belirlenmiştir.\nKira, her ayın ilk 5 günü içinde ödenecektir.",
  leaseClauseDuration: "Sözleşme süresi {duration} olup {startDate} tarihinde başlar.",
  leaseClauseDeposit: "Kiracı, {depositAmount} {currency} tutarında depozito öder.",
  leaseClauseTermination: "Sözleşme, TBK hükümlerine uygun olarak feshedilebilir.",
  receiptClause: "{landlordName} (kiraya veren), {tenantName} (kiracı) tarafından {propertyAddress} adresindeki taşınmaz için {period} dönemi kira bedeli olarak {totalAmount} {currency} aldığını beyan eder.\n\nKira: {rentAmount} {currency} + Aidat: {chargesAmount} {currency}.",
  noticeClause: "{landlordName}, {landlordAddress} adresinden, {tenantName}'e {propertyAddress} adresindeki taşınmaz için {amountDue} {currency} tutarındaki gecikmiş kira bedelini ödemesi konusunda ihtarda bulunur.",
  inventoryClause: "Teslim tutanağı ({reportType}), {reportDate} tarihinde {landlordName} ve {tenantName} tarafından {propertyAddress} için düzenlenmiştir.\n\nNotlar: {generalNotes}",
  terminationClause: "{senderName}, {recipientName}'e {propertyAddress} adresindeki taşınmazın kira sözleşmesinin {endDate} tarihinden itibaren feshedildiğini bildirir.",
  depositReturnClause: "Kiraya veren {landlordName}, kiracı {tenantName}'e {depositAmount} {currency} tutarındaki depozitoyu iade eder.",
  legalFooter: "Türk Borçlar Kanunu'na uygun olarak düzenlenmiştir.",
};

const L_JA: LegalLabels = {
  leaseLabel: "賃貸借契約書", leaseDesc: "借地借家法に準拠した賃貸契約。",
  receiptLabel: "家賃領収書", receiptDesc: "家賃支払いの公式証明。",
  noticeLabel: "催告書", noticeDesc: "未払い賃料の法的通知。",
  inventoryLabel: "物件引渡確認書", inventoryDesc: "入退去時の物件状態確認書。",
  terminationLabel: "契約解除通知", terminationDesc: "賃貸契約の解除通知。",
  depositReturnLabel: "敷金返還通知", depositReturnDesc: "敷金返還の明細書。",
  lang: "ja",
  clauseParties: "第1条 当事者", clauseProperty: "第2条 目的物件",
  clauseRent: "第3条 賃料", clauseDuration: "第4条 契約期間",
  clauseReceipt: "領収書", clauseNotice: "催告",
  clauseInventory: "確認書", clauseTermination: "解除", clauseDeposit: "敷金",
  fieldLandlord: "賃貸人（貸主）", fieldTenant: "賃借人（借主）", fieldAddress: "物件所在地",
  fieldSurface: "専有面積（m²）", fieldRooms: "部屋数",
  fieldRent: "月額賃料", fieldCharges: "共益費・管理費",
  fieldDeposit: "敷金", fieldStartDate: "契約開始日",
  fieldEndDate: "契約終了日", fieldDuration: "契約期間",
  fieldPeriod: "対象期間", fieldPaymentDate: "支払日",
  fieldTaxId: "法人番号 / マイナンバー", fieldBankIban: "口座番号",
  fieldSignaturePlace: "署名場所",
  leaseClauseParties: "賃貸人（甲）：{landlordName}（住所：{landlordAddress}）\n賃借人（乙）：{tenantName}\n甲乙間において、以下の通り賃貸借契約を締結する。",
  leaseClauseProperty: "甲は乙に対し、以下の物件を賃貸する。\n所在地：{propertyAddress}\n専有面積：{surface} m² ／ 部屋数：{rooms}",
  leaseClauseRent: "月額賃料：{rentAmount} {currency}\n共益費：{chargesAmount} {currency}\n毎月末日までに翌月分を支払うものとする。",
  leaseClauseDuration: "契約期間：{duration}（{startDate}より開始）",
  leaseClauseDeposit: "敷金として {depositAmount} {currency} を契約時に預託する。",
  leaseClauseTermination: "本契約は借地借家法の規定に従い解除することができる。",
  receiptClause: "賃貸人 {landlordName} は、賃借人 {tenantName} より、{propertyAddress} の {period} 分の賃料として {totalAmount} {currency} を受領したことを証する。\n\n内訳：賃料 {rentAmount} {currency} ＋ 共益費 {chargesAmount} {currency}",
  noticeClause: "{landlordName}（{landlordAddress}）は、{tenantName} に対し、{propertyAddress} の未払い賃料 {amountDue} {currency} の支払いを催告する。",
  inventoryClause: "物件確認書（{reportType}）：{reportDate}作成\n物件：{propertyAddress}\n賃貸人：{landlordName} ／ 賃借人：{tenantName}\n備考：{generalNotes}",
  terminationClause: "{senderName} は {recipientName} に対し、{propertyAddress} の賃貸借契約を {endDate} をもって解除することを通知する。",
  depositReturnClause: "賃貸人 {landlordName} は賃借人 {tenantName} に敷金 {depositAmount} {currency} を返還する。",
  legalFooter: "借地借家法に基づき作成。",
};

const L_KO: LegalLabels = {
  leaseLabel: "주거용 임대차 계약서", leaseDesc: "주택임대차보호법에 따른 임대차 계약.",
  receiptLabel: "임대료 영수증", receiptDesc: "월 임대료 납부 증명.",
  noticeLabel: "최고서 / 독촉장", noticeDesc: "미납 임대료에 대한 법적 최고.",
  inventoryLabel: "물건 인도 확인서", inventoryDesc: "입퇴거 시 물건 상태 확인.",
  terminationLabel: "계약 해지 통보서", terminationDesc: "임대차 계약 해지 통보.",
  depositReturnLabel: "보증금 반환 통보서", depositReturnDesc: "보증금 반환 내역서.",
  lang: "ko",
  clauseParties: "제1조 계약 당사자", clauseProperty: "제2조 임대 목적물",
  clauseRent: "제3조 차임", clauseDuration: "제4조 계약 기간",
  clauseReceipt: "영수증", clauseNotice: "최고서",
  clauseInventory: "확인서", clauseTermination: "해지", clauseDeposit: "보증금",
  fieldLandlord: "임대인", fieldTenant: "임차인", fieldAddress: "부동산 소재지",
  fieldSurface: "전용면적 (m²)", fieldRooms: "방 수",
  fieldRent: "월 차임", fieldCharges: "관리비",
  fieldDeposit: "보증금", fieldStartDate: "계약 개시일",
  fieldEndDate: "계약 종료일", fieldDuration: "계약 기간",
  fieldPeriod: "대상 기간", fieldPaymentDate: "납부일",
  fieldTaxId: "사업자등록번호 / 주민등록번호", fieldBankIban: "계좌번호",
  fieldSignaturePlace: "서명 장소",
  leaseClauseParties: "임대인(갑): {landlordName} (주소: {landlordAddress})\n임차인(을): {tenantName}\n갑과 을은 다음과 같이 임대차 계약을 체결한다.",
  leaseClauseProperty: "갑은 을에게 아래 부동산을 임대한다.\n소재지: {propertyAddress}\n전용면적: {surface} m² / 방 수: {rooms}",
  leaseClauseRent: "월 차임: {rentAmount} {currency}\n관리비: {chargesAmount} {currency}\n매월 말일까지 익월분을 납부한다.",
  leaseClauseDuration: "계약 기간: {duration} ({startDate}부터)",
  leaseClauseDeposit: "보증금으로 {depositAmount} {currency}을 계약 시 납부한다.",
  leaseClauseTermination: "본 계약은 주택임대차보호법에 따라 해지할 수 있다.",
  receiptClause: "임대인 {landlordName}은(는) 임차인 {tenantName}으로부터 {propertyAddress}의 {period} 차임 {totalAmount} {currency}을 수령하였음을 확인합니다.\n\n내역: 차임 {rentAmount} {currency} + 관리비 {chargesAmount} {currency}",
  noticeClause: "{landlordName} ({landlordAddress})은(는) {tenantName}에게 {propertyAddress}의 미납 차임 {amountDue} {currency}의 납부를 최고합니다.",
  inventoryClause: "물건 확인서 ({reportType}): {reportDate} 작성\n물건: {propertyAddress}\n임대인: {landlordName} / 임차인: {tenantName}\n비고: {generalNotes}",
  terminationClause: "{senderName}은(는) {recipientName}에게 {propertyAddress}의 임대차 계약을 {endDate}부로 해지함을 통보합니다.",
  depositReturnClause: "임대인 {landlordName}은(는) 임차인 {tenantName}에게 보증금 {depositAmount} {currency}을 반환합니다.",
  legalFooter: "주택임대차보호법에 의거하여 작성.",
};

const L_ZH: LegalLabels = {
  leaseLabel: "住宅租赁合同", leaseDesc: "符合当地租赁法规的租赁合同。",
  receiptLabel: "租金收据", receiptDesc: "月租金支付证明。",
  noticeLabel: "催缴通知书", noticeDesc: "拖欠租金的法律催告。",
  inventoryLabel: "房屋交接清单", inventoryDesc: "入住/退房验收记录。",
  terminationLabel: "合同解除通知", terminationDesc: "租赁合同终止通知。",
  depositReturnLabel: "押金退还通知", depositReturnDesc: "押金退还明细。",
  lang: "zh",
  clauseParties: "第一条 合同双方", clauseProperty: "第二条 租赁房屋",
  clauseRent: "第三条 租金及费用", clauseDuration: "第四条 租赁期限",
  clauseReceipt: "收据", clauseNotice: "催告",
  clauseInventory: "交接单", clauseTermination: "解除", clauseDeposit: "押金",
  fieldLandlord: "出租人（甲方）", fieldTenant: "承租人（乙方）", fieldAddress: "房屋地址",
  fieldSurface: "建筑面积（m²）", fieldRooms: "房间数",
  fieldRent: "月租金", fieldCharges: "物业管理费",
  fieldDeposit: "押金", fieldStartDate: "起租日期",
  fieldEndDate: "到期日期", fieldDuration: "租期",
  fieldPeriod: "期间", fieldPaymentDate: "付款日期",
  fieldTaxId: "纳税人识别号 / 身份证号", fieldBankIban: "银行账号",
  fieldSignaturePlace: "签署地点",
  leaseClauseParties: "出租人（甲方）：{landlordName}，地址：{landlordAddress}\n承租人（乙方）：{tenantName}\n甲乙双方经协商一致，签订本合同：",
  leaseClauseProperty: "甲方将以下房屋出租给乙方：\n地址：{propertyAddress}\n面积：{surface} m² / 房间数：{rooms}",
  leaseClauseRent: "月租金：{rentAmount} {currency}\n物业费：{chargesAmount} {currency}\n租金于每月1日前支付。",
  leaseClauseDuration: "租赁期限为{duration}，自{startDate}起。",
  leaseClauseDeposit: "乙方于签约时支付押金{depositAmount} {currency}。",
  leaseClauseTermination: "本合同可依据相关法律法规解除。",
  receiptClause: "出租人{landlordName}确认收到承租人{tenantName}支付的{propertyAddress}{period}期间租金{totalAmount} {currency}。\n\n明细：租金{rentAmount} {currency} + 物业费{chargesAmount} {currency}。",
  noticeClause: "{landlordName}（{landlordAddress}）特此催告{tenantName}支付{propertyAddress}的欠租{amountDue} {currency}。",
  inventoryClause: "房屋交接清单（{reportType}）：{reportDate}\n房屋：{propertyAddress}\n甲方：{landlordName} / 乙方：{tenantName}\n备注：{generalNotes}",
  terminationClause: "{senderName}通知{recipientName}，{propertyAddress}的租赁合同于{endDate}解除。",
  depositReturnClause: "出租人{landlordName}向承租人{tenantName}退还押金{depositAmount} {currency}。",
  legalFooter: "依据相关租赁法律法规订立。",
};

const L_HI: LegalLabels = {
  leaseLabel: "आवासीय किराया अनुबंध", leaseDesc: "स्थानीय किराया नियंत्रण कानून के अनुसार।",
  receiptLabel: "किराया रसीद", receiptDesc: "मासिक किराया भुगतान का प्रमाण।",
  noticeLabel: "कानूनी नोटिस", noticeDesc: "बकाया किराये की कानूनी सूचना।",
  inventoryLabel: "संपत्ति हस्तांतरण रिपोर्ट", inventoryDesc: "प्रवेश/निकास स्थिति रिपोर्ट।",
  terminationLabel: "अनुबंध समाप्ति सूचना", terminationDesc: "किराया अनुबंध की समाप्ति सूचना।",
  depositReturnLabel: "जमानत राशि वापसी", depositReturnDesc: "जमानत राशि वापसी विवरण।",
  lang: "hi",
  clauseParties: "धारा 1 — पक्षकार", clauseProperty: "धारा 2 — संपत्ति",
  clauseRent: "धारा 3 — किराया एवं शुल्क", clauseDuration: "धारा 4 — अवधि",
  clauseReceipt: "रसीद", clauseNotice: "नोटिस",
  clauseInventory: "सूची", clauseTermination: "समाप्ति", clauseDeposit: "जमानत",
  fieldLandlord: "मकान मालिक", fieldTenant: "किरायेदार", fieldAddress: "संपत्ति का पता",
  fieldSurface: "क्षेत्रफल (वर्ग फुट)", fieldRooms: "कमरों की संख्या",
  fieldRent: "मासिक किराया", fieldCharges: "रखरखाव शुल्क",
  fieldDeposit: "जमानत राशि", fieldStartDate: "प्रारंभ तिथि",
  fieldEndDate: "समाप्ति तिथि", fieldDuration: "अवधि",
  fieldPeriod: "अवधि", fieldPaymentDate: "भुगतान तिथि",
  fieldTaxId: "पैन / आधार", fieldBankIban: "बैंक खाता संख्या",
  fieldSignaturePlace: "हस्ताक्षर स्थान",
  leaseClauseParties: "मकान मालिक: {landlordName}, पता: {landlordAddress}\nकिरायेदार: {tenantName}\nदोनों पक्ष निम्नलिखित शर्तों पर सहमत हैं:",
  leaseClauseProperty: "मकान मालिक किरायेदार को निम्न संपत्ति किराये पर देता है:\nपता: {propertyAddress}\nक्षेत्रफल: {surface} / कमरे: {rooms}",
  leaseClauseRent: "मासिक किराया: {rentAmount} {currency}\nरखरखाव: {chargesAmount} {currency}\nकिराया प्रत्येक माह की 5 तारीख तक देय है।",
  leaseClauseDuration: "अनुबंध की अवधि: {duration}, {startDate} से प्रभावी।",
  leaseClauseDeposit: "किरायेदार {depositAmount} {currency} जमानत राशि के रूप में देगा।",
  leaseClauseTermination: "अनुबंध लागू कानून के अनुसार समाप्त किया जा सकता है।",
  receiptClause: "{landlordName} (मकान मालिक) प्रमाणित करता है कि {tenantName} (किरायेदार) से {propertyAddress} के {period} का किराया {totalAmount} {currency} प्राप्त हुआ।\n\nविवरण: किराया {rentAmount} {currency} + रखरखाव {chargesAmount} {currency}।",
  noticeClause: "{landlordName} ({landlordAddress}) {tenantName} को {propertyAddress} के बकाया किराये {amountDue} {currency} के भुगतान हेतु कानूनी नोटिस देता है।",
  inventoryClause: "संपत्ति सूची ({reportType}): {reportDate}\nसंपत्ति: {propertyAddress}\nमकान मालिक: {landlordName} / किरायेदार: {tenantName}\nटिप्पणी: {generalNotes}",
  terminationClause: "{senderName} {recipientName} को {propertyAddress} के किराया अनुबंध की {endDate} से समाप्ति की सूचना देता है।",
  depositReturnClause: "मकान मालिक {landlordName} किरायेदार {tenantName} को {depositAmount} {currency} जमानत राशि वापस करता है।",
  legalFooter: "लागू किराया नियंत्रण कानून के अनुसार तैयार।",
};

// ─── LABEL MAP ───
const ALL_LABELS: Record<string, LegalLabels> = {
  fr: L_FR, en: L_EN, es: L_ES, de: L_DE, it: L_IT, pt: L_PT,
  nl: L_NL, ar: L_AR, tr: L_TR, ja: L_JA, ko: L_KO, zh: L_ZH, hi: L_HI,
};

const COUNTRY_LANG_MAP: Record<string, string> = {
  FR: "fr", BE: "fr", CH: "fr", LU: "fr", MC: "fr",
  SN: "fr", CI: "fr", CM: "fr", GA: "fr", CG: "fr", CD: "fr", MG: "fr",
  MA: "fr", TN: "fr", DZ: "fr", BF: "fr", ML: "fr", NE: "fr", TD: "fr",
  BJ: "fr", TG: "fr", GN: "fr", RW: "fr", MU: "fr", LB: "fr",
  ES: "es", MX: "es", AR: "es", CL: "es", CO: "es", PE: "es",
  UY: "es", EC: "es", VE: "es", DO: "es", CR: "es", PA: "es",
  GT: "es", HN: "es", SV: "es", NI: "es", CU: "es", BO: "es", PY: "es",
  IT: "it",
  DE: "de", AT: "de",
  PT: "pt", BR: "pt",
  NL: "nl",
  TR: "tr",
  JP: "ja", KR: "ko", CN: "zh", TW: "zh", HK: "zh",
  IN: "hi",
  AE: "ar", SA: "ar", QA: "ar", BH: "ar", KW: "ar", OM: "ar",
  JO: "ar", IQ: "ar", EG: "ar", LY: "ar", SD: "ar",
};

function getL(countryCode: string): LegalLabels {
  const mappedLang = COUNTRY_LANG_MAP[countryCode]?.toLowerCase();
  const registryLang = getCountryEntry(countryCode)?.defaultLanguage?.toLowerCase();

  const candidates = [mappedLang, registryLang, "en"];
  for (const lang of candidates) {
    if (lang && ALL_LABELS[lang]) return ALL_LABELS[lang];
  }
  return L_EN;
}

const DEFAULT_GOV_DOC_TYPES = [
  "lease-residential",
  "rent-receipt",
  "formal-notice",
  "inventory",
  "termination",
  "deposit-return",
] as const;

// ─── CORE TEMPLATES ───
const allTemplates: DocumentTemplate[] = [
  // France — Rental
  frRentReceipt, frLeaseEmpty, frLeaseFurnished, frLeaseCommercial,
  frInventory, frRentRevision, frChargesRegularization, frUnpaidNotice,
  // France — Rental legal
  frCongesBailleur, frCongesLocataire, frCautionSolidaire, frAttestationHebergement, frCommandementPayer, frRestitutionDepot,
  // France — Administrative
  frSwornStatement, frFormalNotice, frTermination,
  // France — Company creation
  frCompanySAS, frCompanySARL, frCompanyEURL, frMicroEntrepreneur,
  frLegalNotice, frFormM0, frFormP0,
  // France — Company changes
  frChangeDirector, frChangeOffice, frChangeActivity,
  // France — Company admin
  frPVAGO, frAccountsApproval, frShareTransfer, frCapitalIncrease,
  frDissolution, frPVAGE, frActeCession, frRapportGestion,
  // France — Company legal
  frStatutsSAS, frStatutsSARL, frPacteAssocies, frNominationCAC,
  // Germany — Pro extras
  deNebenkostenabrechnung, deMieterhoehung, deKuendigungVermieter, deKuendigungMieter,
  deUebergabeprotokoll, deMietschuldenfreiheit, deKautionsabrechnung,
  // Spain — Pro extras
  esInventario, esRevisionRenta, esDesistimiento, esNoRenovacion, esCertificadoNoDeuda,
  // Italy — Pro extras
  itVerbaleConsegna, itAggiornamentoIstat, itDisdettaConduttore, itDisdettaLocatore,
  // Portugal — Pro extras
  ptAutoVistoria, ptAtualizacaoRenda, ptDenunciaArrendatario, ptOposicaoSenhorio,
  // UK — Pro extras
  gbSection21, gbSection13, gbInventory, gbDepositReturn, gbTenantNotice,
  // Europe packs
  ...allEuropeTemplates,
  // World packs
  ...allWorldTemplates,
  ...allExtraWorldTemplates,
  ...allExtraWorldTemplates2,
];

const existingTemplateKeys = new Set(allTemplates.map((t) => `${String(t.country)}::${t.docType}`));

// ─── GENERATE LOCALIZED GOVERNMENT-FORMAT TEMPLATES FOR ALL COUNTRIES ───
function buildCountryTemplates(country: CountryEntry): DocumentTemplate[] {
  const cc = country.code.toLowerCase();
  const L = getL(country.code);
  const legalBasis = `${country.name} — ${country.taxIdLabel}`;

  const requiredDocTypes = new Set<string>([
    ...DEFAULT_GOV_DOC_TYPES,
    ...(country.legalDocumentTypes || []),
  ]);

  // UAE specific official format
  if (country.code === "AE") requiredDocTypes.add("ejari-contract");

  const hasDocType = (docType: string) => requiredDocTypes.has(docType);
  const hasTemplate = (docType: string) => existingTemplateKeys.has(`${country.code}::${docType}`);
  const surfaceUnit = country.measurementUnit === "imperial" ? "sq ft" : "m²";

  const baseFields = (withProperty = true): FieldSchema[] => {
    const fields: FieldSchema[] = [
      { key: "landlordName", label: L.fieldLandlord, type: "text", required: true, group: L.clauseParties },
      { key: "landlordAddress", label: `${L.fieldLandlord} — ${L.fieldAddress}`, type: "text", required: true, group: L.clauseParties },
      { key: "landlordTaxId", label: L.fieldTaxId, type: "text", required: false, group: L.clauseParties },
      { key: "tenantName", label: L.fieldTenant, type: "text", required: true, group: L.clauseParties },
      { key: "tenantAddress", label: `${L.fieldTenant} — ${L.fieldAddress}`, type: "text", required: false, group: L.clauseParties },
    ];

    if (withProperty) {
      fields.push(
        { key: "propertyAddress", label: L.fieldAddress, type: "text", required: true, group: L.clauseProperty },
        { key: "surface", label: `${L.fieldSurface} (${surfaceUnit})`, type: "number", required: true, group: L.clauseProperty },
        { key: "rooms", label: L.fieldRooms, type: "number", required: true, group: L.clauseProperty },
      );
    }

    return fields;
  };

  const templates: DocumentTemplate[] = [];

  if (hasDocType("lease-residential") && !hasTemplate("lease-residential")) {
    templates.push({
      id: `${cc}-lease-residential`, version: "1.0.0", country: country.code as Country,
      category: "rental", docType: "lease-residential",
      label: `${L.leaseLabel} (${country.name})`, description: L.leaseDesc,
      legalBasis, needsLegalReview: true, active: true,
      fields: [
        ...baseFields(),
        { key: "rentAmount", label: `${L.fieldRent} (${country.currencySymbol})`, type: "number", required: true, group: L.clauseRent },
        { key: "chargesAmount", label: `${L.fieldCharges} (${country.currencySymbol})`, type: "number", required: false, defaultValue: 0, group: L.clauseRent },
        { key: "depositAmount", label: `${L.fieldDeposit} (${country.currencySymbol})`, type: "number", required: false, defaultValue: 0, group: L.clauseRent },
        { key: "bankIban", label: L.fieldBankIban, type: "text", required: false, group: L.clauseRent },
        { key: "startDate", label: L.fieldStartDate, type: "date", required: true, group: L.clauseDuration },
        { key: "endDate", label: L.fieldEndDate, type: "date", required: false, group: L.clauseDuration },
        {
          key: "duration",
          label: L.fieldDuration,
          type: "select",
          required: true,
          group: L.clauseDuration,
          options: [
            { value: "6", label: "6" },
            { value: "12", label: "12" },
            { value: "24", label: "24" },
            { value: "36", label: "36" },
            { value: "48", label: "48" },
            { value: "60", label: "60" },
            { value: "indefinite", label: "Open-ended / Indéterminée" },
          ],
          defaultValue: "12",
        },
        { key: "signaturePlace", label: L.fieldSignaturePlace, type: "text", required: false, group: L.clauseDuration },
      ],
      clauses: [
        { id: "parties", label: L.clauseParties, required: true, text: L.leaseClauseParties },
        { id: "property", label: L.clauseProperty, required: true, text: L.leaseClauseProperty },
        { id: "rent", label: L.clauseRent, required: true, text: L.leaseClauseRent },
        { id: "term", label: L.clauseDuration, required: true, text: L.leaseClauseDuration },
        { id: "deposit", label: L.clauseDeposit, required: true, text: L.leaseClauseDeposit },
        { id: "obligations-tenant", label: L.clauseObligationsTenant || "Tenant Obligations", required: true,
          text: L.leaseClauseObligationsTenant || "The tenant shall pay rent on time, maintain the property in good condition, not sublet without consent, allow inspections with notice, report damages promptly, and return the property in its original condition accounting for normal wear and tear." },
        { id: "obligations-landlord", label: L.clauseObligationsLandlord || "Landlord Obligations", required: true,
          text: L.leaseClauseObligationsLandlord || "The landlord shall deliver the property in habitable condition, maintain structural integrity and essential systems, carry out major repairs, respect the tenant's quiet enjoyment, provide required certificates, and comply with housing regulations." },
        { id: "maintenance", label: L.clauseMaintenance || "Maintenance", required: true,
          text: L.leaseClauseMaintenance || "The tenant is responsible for minor maintenance. The landlord is responsible for structural repairs and essential installations. The tenant shall not make alterations without prior written consent." },
        { id: "termination", label: L.clauseTermination, required: true, text: L.leaseClauseTermination },
        { id: "governing-law", label: L.clauseGoverningLaw || "Governing Law", required: true,
          text: L.leaseClauseGoverningLaw || `This agreement is governed by applicable law. Disputes shall be submitted to the competent courts where the property is located.` },
      ],
    });
  }

  if (hasDocType("rent-receipt") && !hasTemplate("rent-receipt")) {
    templates.push({
      id: `${cc}-rent-receipt`, version: "1.0.0", country: country.code as Country,
      category: "rental", docType: "rent-receipt",
      label: `${L.receiptLabel} (${country.name})`, description: L.receiptDesc,
      legalBasis,
      needsLegalReview: false, active: true,
      fields: [
        { key: "landlordName", label: L.fieldLandlord, type: "text", required: true, group: L.clauseParties },
        { key: "landlordAddress", label: `${L.fieldLandlord} — ${L.fieldAddress}`, type: "text", required: false, group: L.clauseParties },
        { key: "tenantName", label: L.fieldTenant, type: "text", required: true, group: L.clauseParties },
        { key: "propertyAddress", label: L.fieldAddress, type: "text", required: true, group: L.clauseProperty },
        { key: "rentAmount", label: `${L.fieldRent} (${country.currencySymbol})`, type: "number", required: true, group: L.clauseRent },
        { key: "chargesAmount", label: `${L.fieldCharges} (${country.currencySymbol})`, type: "number", required: false, defaultValue: 0, group: L.clauseRent },
        { key: "totalAmount", label: `Total (${country.currencySymbol})`, type: "number", required: false, group: L.clauseRent },
        { key: "period", label: L.fieldPeriod, type: "text", required: true, group: L.clauseRent },
        { key: "paymentDate", label: L.fieldPaymentDate, type: "date", required: true, group: L.clauseRent },
        { key: "signaturePlace", label: L.fieldSignaturePlace, type: "text", required: false, group: L.clauseRent },
      ],
      clauses: [{ id: "receipt", label: L.clauseReceipt, required: true, text: L.receiptClause }],
    });
  }

  if (hasDocType("formal-notice") && !hasTemplate("formal-notice")) {
    templates.push({
      id: `${cc}-formal-notice`, version: "1.0.0", country: country.code as Country,
      category: "rental", docType: "formal-notice",
      label: `${L.noticeLabel} (${country.name})`, description: L.noticeDesc,
      legalBasis, needsLegalReview: true, active: true,
      fields: [
        ...baseFields(false),
        { key: "propertyAddress", label: L.fieldAddress, type: "text", required: true, group: L.clauseProperty },
        { key: "amountDue", label: `Amount due (${country.currencySymbol})`, type: "number", required: true, group: L.clauseNotice },
        { key: "noticeDate", label: L.fieldPaymentDate, type: "date", required: true, group: L.clauseNotice },
        { key: "details", label: "Details", type: "textarea", required: false, group: L.clauseNotice },
      ],
      clauses: [{ id: "notice", label: L.clauseNotice, required: true, text: L.noticeClause }],
    });
  }

  if (hasDocType("inventory") && !hasTemplate("inventory")) {
    templates.push({
      id: `${cc}-inventory`, version: "1.0.0", country: country.code as Country,
      category: "rental", docType: "inventory",
      label: `${L.inventoryLabel} (${country.name})`, description: L.inventoryDesc,
      legalBasis,
      needsLegalReview: false, active: true,
      fields: [
        { key: "landlordName", label: L.fieldLandlord, type: "text", required: true, group: L.clauseParties },
        { key: "tenantName", label: L.fieldTenant, type: "text", required: true, group: L.clauseParties },
        { key: "propertyAddress", label: L.fieldAddress, type: "text", required: true, group: L.clauseProperty },
        { key: "reportDate", label: L.fieldPaymentDate, type: "date", required: true, group: L.clauseInventory },
        {
          key: "reportType",
          label: "Type",
          type: "select",
          required: true,
          group: L.clauseInventory,
          options: [
            { value: "entry", label: "Entry / Entrée" },
            { value: "exit", label: "Exit / Sortie" },
          ],
          defaultValue: "entry",
        },
        { key: "generalNotes", label: "Notes", type: "textarea", required: false, group: L.clauseInventory },
      ],
      clauses: [{ id: "inventory", label: L.clauseInventory, required: true, text: L.inventoryClause }],
    });
  }

  if (hasDocType("termination") && !hasTemplate("termination")) {
    templates.push({
      id: `${cc}-termination`, version: "1.0.0", country: country.code as Country,
      category: "rental", docType: "termination",
      label: `${L.terminationLabel} (${country.name})`, description: L.terminationDesc,
      legalBasis, needsLegalReview: true, active: true,
      fields: [
        { key: "senderName", label: L.fieldLandlord, type: "text", required: true, group: L.clauseParties },
        { key: "senderAddress", label: `${L.fieldLandlord} — ${L.fieldAddress}`, type: "text", required: true, group: L.clauseParties },
        { key: "recipientName", label: L.fieldTenant, type: "text", required: true, group: L.clauseParties },
        { key: "recipientAddress", label: `${L.fieldTenant} — ${L.fieldAddress}`, type: "text", required: false, group: L.clauseParties },
        { key: "propertyAddress", label: L.fieldAddress, type: "text", required: true, group: L.clauseProperty },
        { key: "endDate", label: L.fieldEndDate, type: "date", required: true, group: L.clauseTermination },
        { key: "reason", label: "Reason / Motif", type: "textarea", required: false, group: L.clauseTermination },
      ],
      clauses: [{ id: "termination", label: L.clauseTermination, required: true, text: L.terminationClause }],
    });
  }

  if (hasDocType("deposit-return") && !hasTemplate("deposit-return")) {
    templates.push({
      id: `${cc}-deposit-return`, version: "1.0.0", country: country.code as Country,
      category: "rental", docType: "deposit-return",
      label: `${L.depositReturnLabel} (${country.name})`, description: L.depositReturnDesc,
      legalBasis,
      needsLegalReview: false, active: true,
      fields: [
        { key: "landlordName", label: L.fieldLandlord, type: "text", required: true, group: L.clauseParties },
        { key: "tenantName", label: L.fieldTenant, type: "text", required: true, group: L.clauseParties },
        { key: "propertyAddress", label: L.fieldAddress, type: "text", required: true, group: L.clauseProperty },
        { key: "depositAmount", label: `${L.fieldDeposit} (${country.currencySymbol})`, type: "number", required: true, group: L.clauseDeposit },
        { key: "deductions", label: "Deductions / Retenues", type: "textarea", required: false, group: L.clauseDeposit },
        { key: "bankIban", label: L.fieldBankIban, type: "text", required: false, group: L.clauseDeposit },
        { key: "documentDate", label: L.fieldPaymentDate, type: "date", required: true, group: L.clauseDeposit },
      ],
      clauses: [{ id: "deposit-return", label: L.clauseDeposit, required: true, text: L.depositReturnClause }],
    });
  }

  if (hasDocType("ejari-contract") && !hasTemplate("ejari-contract")) {
    templates.push({
      id: `${cc}-ejari-contract`,
      version: "1.0.0",
      country: country.code as Country,
      category: "rental",
      docType: "ejari-contract",
      label: `Ejari Tenancy Contract (${country.name})`,
      description: "Official-style UAE tenancy contract aligned with Ejari/DLD requirements.",
      legalBasis: "UAE — Dubai Law No. 26 of 2007 / RERA",
      needsLegalReview: true,
      active: true,
      fields: [
        { key: "landlordName", label: "Landlord full name", type: "text", required: true, group: "SECTION 1 — Parties" },
        { key: "landlordEmiratesId", label: "Landlord Emirates ID / Passport", type: "text", required: true, group: "SECTION 1 — Parties" },
        { key: "tenantName", label: "Tenant full name", type: "text", required: true, group: "SECTION 1 — Parties" },
        { key: "tenantEmiratesId", label: "Tenant Emirates ID / Passport", type: "text", required: true, group: "SECTION 1 — Parties" },
        { key: "propertyAddress", label: "Property address", type: "text", required: true, group: "SECTION 2 — Property" },
        { key: "makaniNumber", label: "Makani Number", type: "text", required: true, group: "SECTION 2 — Property" },
        { key: "dewaNumber", label: "DEWA Premises No.", type: "text", required: true, group: "SECTION 2 — Property" },
        { key: "surface", label: "Area (sq ft)", type: "number", required: true, group: "SECTION 2 — Property" },
        { key: "rooms", label: "Bedrooms", type: "number", required: true, group: "SECTION 2 — Property" },
        { key: "rentAmount", label: "Annual rent (AED)", type: "number", required: true, group: "SECTION 3 — Rent" },
        { key: "depositAmount", label: "Security deposit (AED)", type: "number", required: true, group: "SECTION 3 — Rent" },
        { key: "paymentMode", label: "Payment mode", type: "select", required: true, group: "SECTION 3 — Rent", options: [
          { value: "Cheque", label: "Cheque" },
          { value: "Bank transfer", label: "Bank transfer" },
          { value: "Cash", label: "Cash" },
        ], defaultValue: "Cheque" },
        { key: "startDate", label: "Start date", type: "date", required: true, group: "SECTION 4 — Duration" },
        { key: "endDate", label: "End date", type: "date", required: true, group: "SECTION 4 — Duration" },
        { key: "ejariNumber", label: "Ejari registration number", type: "text", required: false, group: "SECTION 6 — Ejari" },
      ],
      clauses: [{
        id: "ejari-legal",
        label: "Governing law",
        required: true,
        text: "This contract is governed by Dubai Law No. 26 of 2007 and related RERA regulations. Parties: {landlordName} and {tenantName}, property at {propertyAddress}.",
      }],
    });
  }

  return templates;
}

// Generate for all countries
const generatedFallbackTemplates: DocumentTemplate[] = getAllCountryEntries()
  .flatMap((country) => buildCountryTemplates(country));

allTemplates.push(...generatedFallbackTemplates);

// ─── EXPORTS ───
export function getTemplateById(id: string): DocumentTemplate | undefined {
  return allTemplates.find((t) => t.id === id);
}

export function getTemplatesByCountry(country: Country): DocumentTemplate[] {
  return allTemplates.filter((t) => t.country === country);
}

export function getActiveTemplates(country?: Country): DocumentTemplate[] {
  const filtered = country ? allTemplates.filter((t) => t.country === country) : allTemplates;
  return filtered.filter((t) => t.active);
}

export function getAllTemplates(): DocumentTemplate[] {
  return allTemplates;
}

export function getTemplatesByCategory(category: string, country?: Country): DocumentTemplate[] {
  return allTemplates.filter((t) => t.category === category && (!country || t.country === country));
}
