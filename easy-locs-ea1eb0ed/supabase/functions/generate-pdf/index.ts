/**
 * generate-pdf — Server-side PDF generation Edge Function.
 * Layer 3.1: Offloads PDF generation for automated flows (receipts, invoices).
 * Accepts template data, generates PDF, uploads to storage, returns URL.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

interface PdfRequest {
  doc_type: string; // "rent-receipt" | "invoice" | "inventory"
  title: string;
  country: string;
  data: Record<string, unknown>;
  org_id: string;
  upload_path?: string; // optional custom storage path
}

// Minimal PDF builder using raw PDF spec (no jsPDF in Deno)
function buildSimplePdf(title: string, lines: string[], country: string): Uint8Array {
  const now = new Date().toISOString().slice(0, 10);
  const header = `EASY-LOCS® — ${title}`;
  const footer = `Generated on ${now} | Country: ${country}`;

  // Build text content
  const contentLines = [header, "", ...lines, "", footer];

  // Raw PDF 1.4 with text content
  const textContent = contentLines
    .map((line, i) => `BT /F1 ${i === 0 ? 14 : 10} Tf 50 ${750 - i * 16} Td (${escapePdf(line)}) Tj ET`)
    .join("\n");

  const stream = `q\n${textContent}\nQ`;
  const streamBytes = new TextEncoder().encode(stream);

  const objects: string[] = [];
  // 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  // 2: Pages
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  // 3: Page
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`
  );
  // 4: Content stream
  objects.push(
    `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream\nendobj`
  );
  // 5: Font
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj"
  );

  // Build PDF file
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }
  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += "trailer\n";
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF";

  return new TextEncoder().encode(pdf);
}

function escapePdf(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildReceiptLines(data: Record<string, unknown>): string[] {
  return [
    `Landlord: ${data.landlordName || data.ownerName || "-"}`,
    `Tenant: ${data.tenantName || "-"}`,
    `Property: ${data.propertyAddress || "-"}`,
    "",
    `Period: ${data.periodStart || data.month || "-"} to ${data.periodEnd || "-"}`,
    `Rent: ${data.rentAmount || data.rent_amount || 0}`,
    `Charges: ${data.chargesAmount || data.charges_amount || 0}`,
    `Total: ${data.totalAmount || data.total_amount || 0}`,
    `Payment date: ${data.paymentDate || data.paid_date || "-"}`,
    "",
    "This receipt certifies the payment of the above amounts.",
  ];
}

function buildInvoiceLines(data: Record<string, unknown>): string[] {
  return [
    `Provider: ${data.providerName || "-"}`,
    `Client: ${data.clientName || data.bookerName || "-"}`,
    `Service: ${data.serviceTitle || "-"}`,
    "",
    `Date: ${data.serviceDate || "-"}`,
    `Amount: ${data.totalPrice || data.amount || 0} ${data.currency || "EUR"}`,
    `Payment method: ${data.paymentMethod || "-"}`,
    "",
    `Booking ref: ${data.bookingRef || data.bookingId || "-"}`,
  ];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: PdfRequest = await req.json();
    const { doc_type, title, country, data, org_id, upload_path } = body;

    if (!doc_type || !title || !org_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build PDF content based on doc_type
    let lines: string[];
    switch (doc_type) {
      case "rent-receipt":
        lines = buildReceiptLines(data);
        break;
      case "invoice":
        lines = buildInvoiceLines(data);
        break;
      default:
        lines = Object.entries(data).map(([k, v]) => `${k}: ${v}`);
    }

    const pdfBytes = buildSimplePdf(title, lines, country || "INT");

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const filename = upload_path || `${org_id}/${doc_type}/${crypto.randomUUID()}.pdf`;

    const { error: uploadError } = await sb.storage
      .from("rental-docs")
      .upload(filename, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate-pdf] upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Upload failed", details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = sb.storage.from("rental-docs").getPublicUrl(filename);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: urlData?.publicUrl || null,
        storage_path: filename,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[generate-pdf] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
