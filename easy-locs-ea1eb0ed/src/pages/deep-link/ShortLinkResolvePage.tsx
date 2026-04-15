import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { resolveShortLink, shortLinkPayloadToQrPayload } from "@/lib/short-links";
import { resolveRoute } from "@/lib/qr-engine";
import SubPageShell from "@/components/layout/SubPageShell";
import SEOHead from "@/components/SEOHead";
import { Link2Off, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShortLinkResolvePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) {
      setError(true);
      return;
    }

    let cancelled = false;

    (async () => {
      const result = await resolveShortLink(code);

      if (cancelled) return;

      if (!result) {
        setError(true);
        return;
      }

      const qrPayload = shortLinkPayloadToQrPayload(result.action, result.payload);

      if (qrPayload) {
        const route = resolveRoute(qrPayload);
        if (route) {
          navigate(route, { replace: true });
          return;
        }
      }

      const { payload } = result;
      switch (result.action) {
        case "pay_user":
          navigate(`/wallet/transfer?to=${payload.userId}${payload.amount ? `&amount=${payload.amount}` : ""}${payload.currency ? `&currency=${payload.currency}` : ""}`, { replace: true });
          break;
        case "profile":
          navigate(`/u/${payload.userId}`, { replace: true });
          break;
        case "shop":
          navigate(`/s/${payload.shopSlug}`, { replace: true });
          break;
        case "product":
          navigate(`/p/${payload.productId}`, { replace: true });
          break;
        case "service":
          navigate(payload.slug ? `/book/${payload.slug}` : "/discover", { replace: true });
          break;
        case "order":
          navigate(`/my-orders?id=${payload.orderId}`, { replace: true });
          break;
        default:
          setError(true);
      }
    })();

    return () => { cancelled = true; };
  }, [code, navigate]);

  if (error) {
    return (
      <>
        <SEOHead title="Link Not Found — Easy-Locs" description="This link is no longer valid" />
        <SubPageShell noContentPad>
          <div className="max-w-md mx-auto px-4 pt-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
              <Link2Off className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-semibold text-foreground">Link not found</p>
            <p className="text-sm text-muted-foreground">This link may have expired or is no longer valid.</p>
            <Link to="/discover"><Button variant="outline" size="sm">Go to Discover</Button></Link>
          </div>
        </SubPageShell>
      </>
    );
  }

  return (
    <SubPageShell noContentPad className="flex items-center justify-center h-[60dvh]">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Opening link…</p>
      </div>
    </SubPageShell>
  );
}
