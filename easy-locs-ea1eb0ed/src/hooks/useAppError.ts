import { useCallback } from "react";
import { toast } from "sonner";
import { classifyError, reportError, type ClassifiedError } from "@/lib/error-handling";
import { useI18n } from "@/lib/i18n";

type ErrorAction = "toast" | "silent" | "throw";

interface UseAppErrorOptions {
  defaultAction?: ErrorAction;
  context?: string;
}

export function useAppError(options: UseAppErrorOptions = {}) {
  const { defaultAction = "toast", context } = options;
  const { t } = useI18n();

  const handleError = useCallback(
    (error: unknown, overrideAction?: ErrorAction): ClassifiedError => {
      const classified = reportError(error);
      const action = overrideAction ?? defaultAction;

      const userMsg = resolveUserMessage(classified, t, context);

      if (action === "toast") {
        if (classified.severity === "fatal") {
          toast.error(userMsg, { duration: 8000 });
        } else if (classified.severity === "transient") {
          toast.warning(userMsg, { duration: 4000 });
        } else {
          toast.error(userMsg, { duration: 5000 });
        }
      }

      if (action === "throw") {
        throw classified.original;
      }

      return classified;
    },
    [defaultAction, context, t],
  );

  const wrapAsync = useCallback(
    <T,>(fn: () => Promise<T>, fallback?: T): Promise<T | undefined> => {
      return fn().catch((err) => {
        handleError(err);
        return fallback;
      });
    },
    [handleError],
  );

  return { handleError, wrapAsync, classifyError };
}

function resolveUserMessage(
  classified: ClassifiedError,
  t: (key: string) => string,
  context?: string,
): string {
  const domainKey = `error.${classified.domain}`;
  const translated = t(domainKey);

  if (translated !== domainKey) {
    return translated;
  }

  if (context) {
    const contextKey = `error.${context}`;
    const ctxTranslated = t(contextKey);
    if (ctxTranslated !== contextKey) {
      return ctxTranslated;
    }
  }

  return classified.userMessage;
}
