import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
// LB1 Track 1 (#841) — generate-cv now goes through the platform agent
// registry. Direct `openaiChat` is no longer permitted on this surface.
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
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

    const outcome = await dispatchAiCompletion(
      {
        feature: "generate-cv",
        messages: [
          { role: "system", content: "You are a professional CV/resume writer. Generate clean, elegant HTML CVs with inline CSS styling. Output only HTML, no markdown." },
          { role: "user", content: prompt },
        ],
        purpose: "general",
      },
      { feature: "generate-cv" },
    );

    if (outcome.status === "succeeded" && outcome.output) {
      let cv = outcome.output.text ?? "";
      cv = cv.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();
      return new Response(JSON.stringify({ cv, task_id: outcome.taskId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (outcome.status === "pending_review") {
      return new Response(
        JSON.stringify({
          status: "pending_review",
          task_id: outcome.taskId,
          reason: outcome.blockedReason,
        }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const httpStatus =
      outcome.status === "timeout" ? 504 :
      outcome.errorCode === "AI_QUOTA_EXCEEDED" ? 429 :
      (outcome.status === "blocked" || outcome.status === "rejected") ? 403 :
      500;

    console.error(
      "[generate-cv] dispatch outcome:",
      outcome.status,
      outcome.errorCode,
      outcome.errorMessage ?? outcome.blockedReason,
    );
    return new Response(
      JSON.stringify({
        error: outcome.errorMessage ?? outcome.blockedReason ?? "AI dispatch failed",
        error_code: outcome.errorCode,
        task_id: outcome.taskId,
      }),
      { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-cv error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
