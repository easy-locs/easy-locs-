// Local storage-based store for demo mode

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "individual" | "landlord" | "freelancer" | "business";
  country: string;
  createdAt: string;
}

export interface GeneratedDocument {
  id: string;
  userId: string;
  type: string;
  country: string;
  title: string;
  templateId?: string;
  templateVersion?: string;
  dataJson: Record<string, unknown>;
  pdfDataUri?: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  type: string;
  label: string;
  schedule: string;
  nextRunAt: string;
  active: boolean;
}

export interface VaultFile {
  id: string;
  userId: string;
  filename: string;
  fileUrl: string;
  tags: string[];
  createdAt: string;
  size: number;
}

const KEYS = {
  user: "easyloc_user",
  documents: "easyloc_documents",
  reminders: "easyloc_reminders",
  vault: "easyloc_vault",
  seeded: "easyloc_seeded",
};

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// User
export const getUser = (): UserProfile =>
  get<UserProfile>(KEYS.user, {
    id: "demo-user-1",
    email: "demo@easy-locs.com",
    name: "Jean Martin",
    role: "landlord",
    country: "FR",
    createdAt: "2026-01-15T10:00:00Z",
  });

export const setUser = (user: UserProfile) => set(KEYS.user, user);

// Documents
export const getDocuments = (): GeneratedDocument[] => get<GeneratedDocument[]>(KEYS.documents, []);
export const addDocument = (doc: GeneratedDocument) => {
  const docs = getDocuments();
  docs.unshift(doc);
  set(KEYS.documents, docs);
};
export const deleteDocument = (id: string) => {
  set(KEYS.documents, getDocuments().filter((d) => d.id !== id));
};

// Reminders
export const getReminders = (): Reminder[] => get<Reminder[]>(KEYS.reminders, []);
export const setReminders = (reminders: Reminder[]) => set(KEYS.reminders, reminders);
export const addReminder = (r: Reminder) => {
  const arr = getReminders();
  arr.push(r);
  set(KEYS.reminders, arr);
};

// Vault
export const getVaultFiles = (): VaultFile[] => get<VaultFile[]>(KEYS.vault, []);
export const addVaultFile = (f: VaultFile) => {
  const arr = getVaultFiles();
  arr.unshift(f);
  set(KEYS.vault, arr);
};
export const deleteVaultFile = (id: string) => {
  set(KEYS.vault, getVaultFiles().filter((f) => f.id !== id));
};

// Seed demo data
export const seedDemoData = () => {
  if (localStorage.getItem(KEYS.seeded)) return;

  const docs: GeneratedDocument[] = [
    {
      id: "demo-doc-1", userId: "demo-user-1", type: "rent-receipt", country: "FR",
      title: "Quittance de loyer — Février 2026",
      templateId: "fr-rent-receipt", templateVersion: "1.0.0",
      dataJson: { landlordName: "Jean Martin", tenantName: "Marie Dupont", propertyAddress: "12 rue de la Paix, 75011 Paris", rentAmount: 850, chargesAmount: 100, periodStart: "2026-02-01", periodEnd: "2026-02-28", paymentDate: "2026-02-05" },
      createdAt: "2026-02-05T14:30:00Z",
    },
    {
      id: "demo-doc-2", userId: "demo-user-1", type: "rent-receipt", country: "FR",
      title: "Quittance de loyer — Janvier 2026",
      templateId: "fr-rent-receipt", templateVersion: "1.0.0",
      dataJson: { landlordName: "Jean Martin", tenantName: "Marie Dupont", propertyAddress: "12 rue de la Paix, 75011 Paris", rentAmount: 850, chargesAmount: 100, periodStart: "2026-01-01", periodEnd: "2026-01-31", paymentDate: "2026-01-03" },
      createdAt: "2026-01-03T10:00:00Z",
    },
    {
      id: "demo-doc-3", userId: "demo-user-1", type: "sworn-statement", country: "FR",
      title: "Attestation sur l'honneur — Domicile",
      templateId: "fr-sworn-statement", templateVersion: "1.0.0",
      dataJson: { fullName: "Jean Martin", birthDate: "1985-06-15", birthPlace: "Lyon", address: "45 avenue Victor Hugo, 75016 Paris", statement: "Je soussigné certifie sur l'honneur résider à l'adresse indiquée ci-dessus." },
      createdAt: "2026-01-20T09:00:00Z",
    },
  ];

  const reminders: Reminder[] = [
    { id: "r1", userId: "demo-user-1", type: "rent-receipt", label: "Quittance de loyer — Apt. Paris 11e", schedule: "monthly", nextRunAt: "2026-03-01", active: true },
    { id: "r2", userId: "demo-user-1", type: "insurance", label: "Renouvellement assurance habitation", schedule: "yearly", nextRunAt: "2026-03-15", active: true },
    { id: "r3", userId: "demo-user-1", type: "rent-indexation", label: "Indexation loyer (IRL)", schedule: "yearly", nextRunAt: "2026-04-01", active: true },
    { id: "r4", userId: "demo-user-1", type: "tax", label: "Déclaration revenus fonciers", schedule: "yearly", nextRunAt: "2026-05-01", active: true },
  ];

  const vaultFiles: VaultFile[] = [
    { id: "vf1", userId: "demo-user-1", filename: "bail_paris_11e.pdf", fileUrl: "", tags: ["bail", "paris"], createdAt: "2026-01-10T10:00:00Z", size: 245000 },
    { id: "vf2", userId: "demo-user-1", filename: "assurance_habitation_2026.pdf", fileUrl: "", tags: ["assurance"], createdAt: "2026-01-05T08:00:00Z", size: 180000 },
  ];

  set(KEYS.documents, docs);
  set(KEYS.reminders, reminders);
  set(KEYS.vault, vaultFiles);
  localStorage.setItem(KEYS.seeded, "true");
};
