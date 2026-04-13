export interface SignatureInput {
  type: string;
  pattern: string;
  domain: string;
  category?: string;
}

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function generateIssueSignature(input: SignatureInput): string {
  const normType = input.type.toLowerCase().trim();
  const normPattern = input.pattern.toLowerCase().trim();
  const normDomain = input.domain.toLowerCase().trim();
  const normCategory = (input.category ?? "unknown").toLowerCase().trim();

  const normalized = [normType, normPattern, normDomain, normCategory].join("|");

  const hash = djb2Hash(normalized);
  return `sig-${normType}-${normDomain}-${hash.toString(36)}`;
}

export function signatureFromProof(
  engineId: string,
  domain: string,
  issueSignature: string,
  category: string,
): string {
  return generateIssueSignature({
    type: category,
    pattern: issueSignature,
    domain,
    category,
  });
}

export function signaturesAreSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  const partsA = a.split("-");
  const partsB = b.split("-");
  if (partsA.length < 3 || partsB.length < 3) return false;
  return partsA[1] === partsB[1] && partsA[2] === partsB[2];
}
