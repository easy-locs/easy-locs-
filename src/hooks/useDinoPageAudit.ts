/**
 * useDinoPageAudit — Client-side page audit beacon hook.
 * Runs DOM checks after page load and sends results to the audit edge function.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { scorePageAudit, type PageAuditPayload } from "@/lib/dino/pageAuditScore";
import type { Json } from "@/integrations/supabase/types";

function findDottedTextNodes(): string[] {
  const matches: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim() || "";
    if (!text || /https?:\/\//i.test(text)) continue;
    if (/[A-Za-zÀ-ÿ]\.[A-Za-zÀ-ÿ]/.test(text)) {
      matches.push(text);
    }
  }
  return [...new Set(matches)].slice(0, 20);
}

function findUntranslatedKeys(): string[] {
  const texts: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim() || "";
    if (/^(page|home|orbit|food|settings)\.[a-z0-9._-]+$/i.test(text)) {
      texts.push(text);
    }
  }
  return [...new Set(texts)].slice(0, 20);
}

export function useDinoPageAudit(input: {
  actorType: "anonymous" | "user" | "pro";
  actorId?: string | null;
  country?: string | null;
  language?: string | null;
  pageKey?: string;
}) {
  const location = useLocation();

  useEffect(() => {
    const run = async () => {
      const doc = document.documentElement;
      const body = document.body;

      const hasOverflowX =
        Math.max(doc.scrollWidth, body.scrollWidth) > Math.max(doc.clientWidth, window.innerWidth);

      const buttons = Array.from(document.querySelectorAll("button, a, [role='button']"));
      const tinyTapTargets = buttons.some((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36);
      });

      const dottedLabels = findDottedTextNodes();
      const untranslatedKeys = findUntranslatedKeys();

      const images = Array.from(document.querySelectorAll("img"));
      const imageShiftDetected = images.some((img) => {
        const rect = img.getBoundingClientRect();
        return rect.width > 0 && rect.height < 40;
      });

      const audit: PageAuditPayload = {
        route: location.pathname,
        pageKey: input.pageKey,
        hasOverflowX,
        overlapDetected: false,
        flickerDetected: false,
        imageShiftDetected,
        tinyTapTargets,
        dottedLabels,
        untranslatedKeys,
        missingBackButton: false,
      };

      const score = scorePageAudit(audit);

      // Persist audit beacon
      await supabase.from("dino_page_audits").insert([{
        route: audit.route,
        page_key: audit.pageKey ?? null,
        actor_type: input.actorType,
        actor_id: input.actorId ?? null,
        country: input.country ?? null,
        language: input.language ?? null,
        audit_json: audit as unknown as Json,
      }]);

      // Persist quality score
      await supabase.from("dino_quality_scores").insert([{
        route: audit.route,
        entity_type: "route",
        entity_id: audit.route,
        ui_score: score.ui,
        ux_score: score.ux,
        stability_score: score.stability,
        media_score: score.media,
        i18n_score: score.i18n,
        category_score: score.category,
        total_score: score.total,
        score_details: audit as unknown as Json,
        updated_at: new Date().toISOString(),
      }]);

      // Enqueue label fix jobs if issues found
      if (dottedLabels.length > 0 || untranslatedKeys.length > 0) {
        await supabase.from("dino_sync_jobs").insert([{
          job_type: "sanitize_labels",
          entity_type: "route",
          entity_id: audit.route,
          payload_json: { dottedLabels, untranslatedKeys } as unknown as Json,
          priority: 10,
        }]);
      }

      // Log flicker issues
      if (audit.flickerDetected) {
        await supabase.from("dino_issues").insert([{
          severity: "major",
          issue_type: "stability",
          route: audit.route,
          summary: "Client-side flicker detected by page audit beacon",
          details_json: audit as unknown as Json,
          auto_fixable: false,
          fixability: "patch_required",
          status: "open",
        }]);
      }
    };

    const id = window.setTimeout(() => void run(), 1200);
    return () => window.clearTimeout(id);
  }, [location.pathname, input.actorType, input.actorId, input.country, input.language, input.pageKey]);
}
