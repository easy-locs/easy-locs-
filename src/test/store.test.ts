import { describe, it, expect, beforeEach } from "vitest";

describe("Local Store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("exports all CRUD functions", async () => {
    const mod = await import("@/lib/store");
    expect(mod.getDocuments).toBeDefined();
    expect(mod.saveDocument).toBeDefined();
    expect(mod.getReminders).toBeDefined();
    expect(mod.saveReminder).toBeDefined();
    expect(mod.getVaultFiles).toBeDefined();
    expect(mod.saveVaultFile).toBeDefined();
  });

  it("saves and retrieves a document", async () => {
    const { saveDocument, getDocuments } = await import("@/lib/store");
    const doc = {
      id: "test-1",
      userId: "user-1",
      type: "lease",
      country: "FR",
      title: "Test Bail",
      dataJson: { landlordName: "Jean" },
      createdAt: new Date().toISOString(),
    };
    saveDocument(doc);
    const docs = getDocuments("user-1");
    expect(docs.length).toBe(1);
    expect(docs[0].title).toBe("Test Bail");
  });

  it("saves and retrieves a reminder", async () => {
    const { saveReminder, getReminders } = await import("@/lib/store");
    const reminder = {
      id: "rem-1",
      userId: "user-1",
      type: "rent",
      label: "Loyer janvier",
      schedule: "monthly",
      nextRunAt: "2025-02-01",
      active: true,
    };
    saveReminder(reminder);
    const reminders = getReminders("user-1");
    expect(reminders.length).toBe(1);
    expect(reminders[0].label).toBe("Loyer janvier");
  });

  it("saves and retrieves vault files", async () => {
    const { saveVaultFile, getVaultFiles } = await import("@/lib/store");
    const file = {
      id: "vault-1",
      userId: "user-1",
      filename: "doc.pdf",
      fileUrl: "blob:xxx",
      tags: ["important"],
      createdAt: new Date().toISOString(),
      size: 1024,
    };
    saveVaultFile(file);
    const files = getVaultFiles("user-1");
    expect(files.length).toBe(1);
    expect(files[0].filename).toBe("doc.pdf");
  });
});
