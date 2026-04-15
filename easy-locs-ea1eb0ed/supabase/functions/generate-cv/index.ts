import { openaiChat } from "../_shared/openai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fullName, email, phone, city, country, summary, skills, languages, experiences, education } = await req.json();

    const prompt = `Generate a professional, polished HTML CV for the following person. Output ONLY valid HTML (no markdown, no code fences). Use clean, modern styling with inline CSS. Include sections for Contact, Summary, Experience, Education, Skills, and Languages. Make it print-friendly.

Personal Info:
- Name: ${fullName}
- Email: ${email || "N/A"}
- Phone: ${phone || "N/A"}
- Location: ${[city, country].filter(Boolean).join(", ") || "N/A"}

Professional Summary:
${summary || "No summary provided - generate a brief professional summary based on the experience below."}

Work Experience:
${(experiences || []).filter((e: any) => e.title).map((e: any) => `- ${e.title} at ${e.company} (${e.period}): ${e.description}`).join("\n") || "No experience listed"}

Education:
${(education || []).filter((e: any) => e.degree).map((e: any) => `- ${e.degree} from ${e.school} (${e.year})`).join("\n") || "No education listed"}

Skills: ${skills || "Not specified"}
Languages: ${languages || "Not specified"}

IMPORTANT: Generate clean, professional HTML with modern styling. Use a clean font stack. Make the layout elegant and ATS-friendly. Output only the HTML body content, no <html> or <head> tags.`;

    const response = await openaiChat({
      messages: [
        { role: "system", content: "You are a professional CV/resume writer. Generate clean, elegant HTML CVs with inline CSS styling. Output only HTML, no markdown." },
        { role: "user", content: prompt },
      ],
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    let cv = data.choices?.[0]?.message?.content || "";
    
    // Clean up any markdown code fences
    cv = cv.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();

    return new Response(JSON.stringify({ cv }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cv error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
