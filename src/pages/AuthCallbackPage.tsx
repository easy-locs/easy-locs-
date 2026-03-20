import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Connecting…");

  useEffect(() => {
    let mounted = true;

    const finishAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;

        if (data.session?.user) {
          setMessage("Success!");
          navigate("/", { replace: true });
          return;
        }

        setMessage("Session not found");
        navigate("/login", { replace: true });
      } catch (err) {
        console.error("[auth] callback failed", err);
        if (!mounted) return;
        setMessage("Connection error");
        navigate("/login", { replace: true });
      }
    };

    finishAuth();
    return () => { mounted = false; };
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
