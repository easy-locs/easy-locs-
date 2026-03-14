/**
 * voice-transcribe — Transcribes voice messages using Lovable AI (Gemini multimodal)
 * and optionally translates the transcript to the user's language.
 * 
 * Triggered after a voice message is uploaded.
 * Updates the message row with transcript_text, transcript_language, etc.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message_id, audio_url, target_locale } = await req.json();

    if (!message_id || !audio_url) {
      return new Response(JSON.stringify({ error: "Missing message_id or audio_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Mark as processing
    await supabase.from("messages").update({
      transcript_status: "processing",
    }).eq("id", message_id);

    // Step 1: Download the audio file
    let audioBase64: string;
    let audioMimeType = "audio/webm";
    
    try {
      const audioResponse = await fetch(audio_url);
      if (!audioResponse.ok) throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
      
      const contentType = audioResponse.headers.get("content-type");
      if (contentType) audioMimeType = contentType;
      
      const audioBuffer = await audioResponse.arrayBuffer();
      // Convert to base64
      const bytes = new Uint8Array(audioBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      audioBase64 = btoa(binary);
    } catch (err) {
      console.error("Audio download failed:", err);
      await supabase.from("messages").update({
        transcript_status: "error",
        transcript_error: "Failed to download audio file",
      }).eq("id", message_id);
      return new Response(JSON.stringify({ error: "Audio download failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Transcribe using Gemini (multimodal - supports audio)
    let transcriptText = "";
    let detectedLanguage = "unknown";

    try {
      const transcribeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a speech-to-text transcription engine. Transcribe the audio accurately. Return ONLY a JSON object with two fields: "text" (the transcription) and "language" (ISO 639-1 two-letter code of the detected language). No markdown, no explanation, no extra text. Example: {"text":"Hello, how are you?","language":"en"}`,
            },
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: {
                    data: audioBase64,
                    format: audioMimeType.includes("mp4") || audioMimeType.includes("m4a") ? "mp4" : 
                           audioMimeType.includes("wav") ? "wav" : 
                           audioMimeType.includes("ogg") ? "ogg" :
                           "webm",
                  },
                },
                {
                  type: "text",
                  text: "Transcribe this audio. Return JSON only.",
                },
              ],
            },
          ],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      if (!transcribeResponse.ok) {
        const errText = await transcribeResponse.text();
        console.error("Transcription API error:", transcribeResponse.status, errText);
        
        if (transcribeResponse.status === 429) {
          await supabase.from("messages").update({
            transcript_status: "error",
            transcript_error: "Rate limited. Will retry later.",
          }).eq("id", message_id);
          return new Response(JSON.stringify({ error: "Rate limited" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        throw new Error(`Transcription failed: ${transcribeResponse.status}`);
      }

      const transcribeData = await transcribeResponse.json();
      const rawContent = transcribeData.choices?.[0]?.message?.content?.trim() || "";
      
      // Parse JSON response
      try {
        const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        transcriptText = parsed.text || rawContent;
        detectedLanguage = parsed.language || "unknown";
      } catch {
        // Fallback: use raw content as transcript
        transcriptText = rawContent;
      }
    } catch (err) {
      console.error("Transcription failed:", err);
      await supabase.from("messages").update({
        transcript_status: "error",
        transcript_error: (err as Error).message || "Transcription failed",
      }).eq("id", message_id);
      return new Response(JSON.stringify({ error: "Transcription failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update message with transcript
    await supabase.from("messages").update({
      transcript_text: transcriptText,
      transcript_language: detectedLanguage,
      transcript_status: "completed",
      transcript_generated_at: new Date().toISOString(),
    }).eq("id", message_id);

    // Step 3: Translate if target_locale differs from detected language
    let translatedText: string | null = null;
    let translationLang: string | null = null;

    if (target_locale && target_locale !== detectedLanguage && transcriptText) {
      try {
        await supabase.from("messages").update({
          translation_status: "processing",
        }).eq("id", message_id);

        const translateResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Translate the following text to ${target_locale}. Return ONLY the translated text, nothing else.`,
              },
              { role: "user", content: transcriptText },
            ],
            max_tokens: 2000,
            temperature: 0.1,
          }),
        });

        if (translateResponse.ok) {
          const translateData = await translateResponse.json();
          translatedText = translateData.choices?.[0]?.message?.content?.trim() || null;
          translationLang = target_locale;
        } else {
          const errText = await translateResponse.text();
          console.error("Translation API error:", translateResponse.status, errText);
        }
      } catch (err) {
        console.error("Translation failed:", err);
      }

      if (translatedText) {
        await supabase.from("messages").update({
          translated_transcript_text: translatedText,
          translated_transcript_language: translationLang,
          translation_status: "completed",
          translation_generated_at: new Date().toISOString(),
        }).eq("id", message_id);
      } else {
        await supabase.from("messages").update({
          translation_status: "error",
          translation_error: "Translation failed",
        }).eq("id", message_id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      transcript: transcriptText,
      language: detectedLanguage,
      translated: translatedText,
      translated_language: translationLang,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("voice-transcribe error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
