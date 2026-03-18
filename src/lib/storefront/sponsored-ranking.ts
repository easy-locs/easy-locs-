export async function getRankedStorefrontMerchants(params: {
  organicRows: any[];
}) {
  // Sponsored rows would be fetched from merchant_ads table
  // For now, just return organic rows with rank scores
  const organicRowsMapped = params.organicRows.map((row: any, idx: number) => ({
    ...row,
    __sponsored: false,
    __rankScore: 100 - idx,
  }));

  return organicRowsMapped
    .sort((a: any, b: any) => Number(b.__rankScore) - Number(a.__rankScore))
    .slice(0, 50);
}
