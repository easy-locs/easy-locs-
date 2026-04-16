import { describe, it, expect } from "vitest";
import { processOcrText, type OcrExtraction } from "./ocr.service";

function fieldValue(extraction: OcrExtraction, key: string): string | undefined {
  return extraction.fields.find((f) => f.key === key)?.value;
}

function fieldConfidence(extraction: OcrExtraction, key: string): number | undefined {
  return extraction.fields.find((f) => f.key === key)?.confidence;
}

describe("processOcrText – document type detection", () => {
  it("detects passport documents", () => {
    const result = processOcrText("PASSPORT\nName: John Doe");
    expect(result.documentType).toBe("passport");
  });

  it("detects passport in French (passeport)", () => {
    const result = processOcrText("PASSEPORT\nNom: Jean Dupont");
    expect(result.documentType).toBe("passport");
  });

  it("detects passport in Spanish (pasaporte)", () => {
    const result = processOcrText("PASAPORTE\nNombre: Juan Garcia");
    expect(result.documentType).toBe("passport");
  });

  it("detects driver's license", () => {
    const result = processOcrText("DRIVER LICENSE\nName: Jane Smith");
    expect(result.documentType).toBe("drivers_license");
  });

  it("detects driving permit", () => {
    const result = processOcrText("DRIVING PERMIT\nName: Jane Smith");
    expect(result.documentType).toBe("drivers_license");
  });

  it("detects French driving license (permis)", () => {
    const result = processOcrText("PERMIS DE CONDUIRE\nNom: Jean Dupont");
    expect(result.documentType).toBe("drivers_license");
  });

  it("detects ID card", () => {
    const result = processOcrText("NATIONAL ID CARD\nIdentity\nName: Bob Jones");
    expect(result.documentType).toBe("id_card");
  });

  it("detects identity card with 'carte'", () => {
    const result = processOcrText("CARTE D'IDENTITE\nNom: Pierre Martin");
    expect(result.documentType).toBe("id_card");
  });

  it("returns unknown for unrecognized documents", () => {
    const result = processOcrText("Some random text\nwith no keywords");
    expect(result.documentType).toBe("unknown");
  });
});

describe("processOcrText – extractFields for passport", () => {
  const passportText = [
    "PASSPORT",
    "Name: John Michael Doe",
    "Date of Birth: 15/03/1990",
    "No: AB1234567",
    "Exp: 20/06/2030",
    "Nationality: American",
    "Sex: M",
  ].join("\n");

  it("extracts full name", () => {
    const result = processOcrText(passportText);
    expect(fieldValue(result, "full_name")).toContain("John Michael Doe");
  });

  it("extracts date of birth", () => {
    const result = processOcrText(passportText);
    expect(fieldValue(result, "date_of_birth")).toBe("15/03/1990");
  });

  it("extracts document number", () => {
    const result = processOcrText(passportText);
    expect(fieldValue(result, "document_number")).toBe("AB1234567");
  });

  it("extracts expiry date", () => {
    const result = processOcrText(passportText);
    expect(fieldValue(result, "expiry_date")).toBe("20/06/2030");
  });

  it("extracts nationality", () => {
    const result = processOcrText(passportText);
    expect(fieldValue(result, "nationality")).toContain("American");
  });

  it("extracts gender", () => {
    const result = processOcrText(passportText);
    expect(fieldValue(result, "gender")).toBe("M");
  });
});

describe("processOcrText – extractFields for ID card", () => {
  const idText = [
    "CARTE NATIONALE",
    "Surname: Garcia Lopez",
    "D.O.B: 22-11-1985",
    "Number: ESP123456789",
    "Valid: 01-01-2028",
    "Nationality: Spanish",
    "Gender: FEMALE",
  ].join("\n");

  it("extracts surname as full name", () => {
    const result = processOcrText(idText);
    expect(fieldValue(result, "full_name")).toContain("Garcia Lopez");
  });

  it("extracts date of birth with D.O.B format", () => {
    const result = processOcrText(idText);
    expect(fieldValue(result, "date_of_birth")).toBe("22-11-1985");
  });

  it("extracts document number", () => {
    const result = processOcrText(idText);
    expect(fieldValue(result, "document_number")).toBe("ESP123456789");
  });

  it("detects document as id_card", () => {
    const result = processOcrText(idText);
    expect(result.documentType).toBe("id_card");
  });
});

describe("processOcrText – extractFields for driver's license", () => {
  const dlText = [
    "DRIVER LICENSE",
    "Name: Sarah Jane Connor",
    "Born: 05.07.1992",
    "No: DL987654",
    "Exp: 12.07.2027",
    "Sex: F",
  ].join("\n");

  it("extracts full name from driver's license", () => {
    const result = processOcrText(dlText);
    expect(fieldValue(result, "full_name")).toContain("Sarah Jane Connor");
  });

  it("extracts date of birth with dot separator", () => {
    const result = processOcrText(dlText);
    expect(fieldValue(result, "date_of_birth")).toBe("05.07.1992");
  });

  it("extracts document number with 'No' prefix", () => {
    const result = processOcrText(dlText);
    expect(fieldValue(result, "document_number")).toBe("DL987654");
  });

  it("extracts expiry with 'Exp' prefix", () => {
    const result = processOcrText(dlText);
    expect(fieldValue(result, "expiry_date")).toBe("12.07.2027");
  });

  it("detects document as drivers_license", () => {
    const result = processOcrText(dlText);
    expect(result.documentType).toBe("drivers_license");
  });
});

describe("processOcrText – expired documents", () => {
  it("still extracts fields from expired documents", () => {
    const expiredText = [
      "PASSPORT",
      "Name: Old Timer",
      "Date of Birth: 01/01/1950",
      "Document Number: XX0000001",
      "Exp: 01/01/2010",
    ].join("\n");
    const result = processOcrText(expiredText);
    expect(fieldValue(result, "expiry_date")).toBe("01/01/2010");
    expect(fieldValue(result, "full_name")).toContain("Old Timer");
    expect(result.fields.length).toBeGreaterThanOrEqual(3);
  });
});

describe("processOcrText – low confidence OCR / missing fields", () => {
  it("returns lower confidence for very short extracted values", () => {
    const text = "PASSPORT\nName: Jo";
    const result = processOcrText(text);
    const nameConf = fieldConfidence(result, "full_name");
    expect(nameConf).toBe(0.5);
  });

  it("returns 0.85 confidence for well-formed values", () => {
    const text = "PASSPORT\nName: Jonathan Smith\nNo: AB1234567";
    const result = processOcrText(text);
    const nameConf = fieldConfidence(result, "full_name");
    expect(nameConf).toBe(0.85);
  });

  it("handles completely empty input", () => {
    const result = processOcrText("");
    expect(result.fields).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.documentType).toBe("unknown");
  });

  it("handles garbage text with no extractable fields", () => {
    const result = processOcrText("xxx ### !!!! 000 ~~~");
    expect(result.fields).toEqual([]);
    expect(result.confidence).toBe(0);
  });

  it("computes average confidence across extracted fields", () => {
    const text = [
      "PASSPORT",
      "Name: Alexander Hamilton",
      "Date of Birth: 11/01/1757",
    ].join("\n");
    const result = processOcrText(text);
    const expectedAvg =
      result.fields.reduce((s, f) => s + f.confidence, 0) / result.fields.length;
    expect(result.confidence).toBeCloseTo(expectedAvg, 2);
  });
});

describe("processOcrText – heuristic fallback extraction", () => {
  it("falls back to heuristic for name when no label prefix present", () => {
    const text = "PASSPORT\nJohn Smith\n15/03/1990";
    const result = processOcrText(text);
    const name = fieldValue(result, "full_name");
    expect(name).toBe("John Smith");
  });

  it("assigns 0.4 confidence to heuristic extractions", () => {
    const text = "PASSPORT\nJohn Smith\n15/03/1990";
    const result = processOcrText(text);
    const nameConf = fieldConfidence(result, "full_name");
    expect(nameConf).toBe(0.4);
  });

  it("extracts document number heuristically from standalone pattern", () => {
    const text = "PASSPORT\nAB123456\nJohn Smith";
    const result = processOcrText(text);
    const docNum = fieldValue(result, "document_number");
    expect(docNum).toBeDefined();
  });
});

describe("processOcrText – multilingual label support", () => {
  it("extracts name with French label (nom)", () => {
    const text = "PASSEPORT\nNom: Jean-Pierre Dupont";
    const result = processOcrText(text);
    expect(fieldValue(result, "full_name")).toContain("Jean");
  });

  it("extracts name with Spanish-style label (nombre)", () => {
    const text = "PASAPORTE\nNombre Carlos Garcia";
    const result = processOcrText(text);
    const name = fieldValue(result, "full_name");
    expect(name).toBeDefined();
  });

  it("extracts name with Turkish label (isim)", () => {
    const text = "PASSPORT\nIsim: Mehmet Yilmaz";
    const result = processOcrText(text);
    expect(fieldValue(result, "full_name")).toContain("Mehmet");
  });

  it("extracts DOB with French label (naissance)", () => {
    const text = "PASSEPORT\nDate de naissance: 15/03/1990";
    const result = processOcrText(text);
    expect(fieldValue(result, "date_of_birth")).toBe("15/03/1990");
  });
});
