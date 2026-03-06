import { describe, it, expect, beforeEach } from "vitest";

describe("Local Store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("exports all CRUD functions", async () => {
    const mod = await import("@/lib/store");
    expect(mod.getDocuments).toBeDefined();
    expect(mod.addDocument).toBeDefined();
    expect(mod.deleteDocument).toBeDefined();
    expect(mod.getReminders).toBeDefined();
    expect(mod.setReminders).toBeDefined();
    expect(mod.addReminder).toBeDefined();
    expect(mod.getVaultFiles).toBeDefined();
    expect(mod.addVaultFile).toBeDefined();
    expect(mod.deleteVaultFile).toBeDefined();
    expect(mod.seedDemoData).toBeDefined();
  });

  it("saves and retrieves a document", async () => {
    const { addDocument, getDocuments } = await import("@/lib/store");
    const doc = {
      id: "test-1",
      userId: "user-1",
      type: "lease",
      country: "FR",
      title: "Test Bail",
      dataJson: { landlordName: "Jean" },
      createdAt: new Date().toISOString(),
    };
    addDocument(doc);
    const docs = getDocuments();
    expect(docs.length).toBeGreaterThanOrEqual(1);
    expect(docs[0].title).toBe("Test Bail");
  });

  it("saves and retrieves a reminder", async () => {
    const { addReminder, getReminders } = await import("@/lib/store");
    const reminder = {
      id: "rem-1",
      userId: "user-1",
      type: "rent",
      label: "Loyer janvier",
      schedule: "monthly",
      nextRunAt: "2025-02-01",
      active: true,
    };
    addReminder(reminder);
    const reminders = getReminders();
    expect(reminders.length).toBeGreaterThanOrEqual(1);
    expect(reminders.some(r => r.label === "Loyer janvier")).toBe(true);
  });

  it("saves and retrieves vault files", async () => {
    const { addVaultFile, getVaultFiles } = await import("@/lib/store");
    const file = {
      id: "vault-1",
      userId: "user-1",
      filename: "doc.pdf",
      fileUrl: "blob:xxx",
      tags: ["important"],
      createdAt: new Date().toISOString(),
      size: 1024,
    };
    addVaultFile(file);
    const files = getVaultFiles();
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files[0].filename).toBe("doc.pdf");
  });

  it("deletes a document by id", async () => {
    const { addDocument, deleteDocument, getDocuments } = await import("@/lib/store");
    addDocument({ id: "del-1", userId: "u", type: "t", country: "FR", title: "Del", dataJson: {}, createdAt: "" });
    deleteDocument("del-1");
    expect(getDocuments().find(d => d.id === "del-1")).toBeUndefined();
  });

  it("seedDemoData populates store", async () => {
    const { seedDemoData, getDocuments, getReminders, getVaultFiles } = await import("@/lib/store");
    seedDemoData();
    expect(getDocuments().length).toBeGreaterThan(0);
    expect(getReminders().length).toBeGreaterThan(0);
    expect(getVaultFiles().length).toBeGreaterThan(0);
  });
});
