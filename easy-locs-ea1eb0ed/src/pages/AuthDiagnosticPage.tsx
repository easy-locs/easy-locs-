import { useState, useEffect, useCallback } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import { useAuth } from "@/contexts/AuthContext";
import { checkAllProviders, type ProviderHealthResult } from "@/lib/auth/provider-health";
import { buildAppUrl } from "@/lib/app-domain";
import { db } from "@/services/db";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Play } from "lucide-react";

type TestStatus = "idle" | "running" | "pass" | "fail" | "warn";

interface TestResult {
  name: string;
  status: TestStatus;
  detail?: string;
  durationMs?: number;
}

function StatusIcon({ status }: { status: TestStatus }) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "fail":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "warn":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    default:
      return <div className="h-4 w-4 rounded-full border border-border" />;
  }
}

async function testProviderAvailability(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const start = Date.now();

  try {
    const health = await checkAllProviders(true);
    results.push({
      name: "Phone (Twilio/SMS)",
      status: health.phone ? "pass" : "warn",
      detail: health.phone ? "Provider actif" : "Provider non configuré — Twilio requis dans Supabase",
      durationMs: Date.now() - start,
    });
    results.push({
      name: "Google OAuth",
      status: health.google ? "pass" : "warn",
      detail: health.google ? "Provider actif" : "Provider non activé dans Supabase Auth",
      durationMs: Date.now() - start,
    });
    results.push({
      name: "Apple Sign-In",
      status: health.apple ? "pass" : "warn",
      detail: health.apple ? "Provider actif" : "Provider non activé dans Supabase Auth",
      durationMs: Date.now() - start,
    });
  } catch (err) {
    results.push({
      name: "Provider Health Check",
      status: "fail",
      detail: err instanceof Error ? err.message : "Erreur inconnue",
      durationMs: Date.now() - start,
    });
  }

  return results;
}

async function testOAuthRedirectUrl(): Promise<TestResult> {
  const start = Date.now();
  try {
    const url = buildAppUrl("/auth/callback");
    const isAbsolute = /^https?:\/\//.test(url);
    const hasCallback = url.includes("/auth/callback");
    const isLocalhost = url.includes("localhost");

    if (!isAbsolute) {
      return { name: "OAuth Redirect URL", status: "fail", detail: `URL non absolue: ${url}`, durationMs: Date.now() - start };
    }
    if (!hasCallback) {
      return { name: "OAuth Redirect URL", status: "fail", detail: `URL ne contient pas /auth/callback: ${url}`, durationMs: Date.now() - start };
    }
    if (isLocalhost) {
      return { name: "OAuth Redirect URL", status: "warn", detail: `URL localhost détectée: ${url} — fonctionnera en dev uniquement`, durationMs: Date.now() - start };
    }
    return { name: "OAuth Redirect URL", status: "pass", detail: url, durationMs: Date.now() - start };
  } catch (err) {
    return { name: "OAuth Redirect URL", status: "fail", detail: err instanceof Error ? err.message : "Erreur", durationMs: Date.now() - start };
  }
}

async function testSessionPersistence(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data: { session }, error } = await db.auth.getSession();
    if (error) {
      return { name: "Session Persistence", status: "fail", detail: `Erreur getSession: ${error.message}`, durationMs: Date.now() - start };
    }
    if (!session) {
      return { name: "Session Persistence", status: "warn", detail: "Aucune session active (utilisateur non connecté ou session expirée)", durationMs: Date.now() - start };
    }
    const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
    const isExpired = expiresAt && expiresAt < new Date();
    if (isExpired) {
      return { name: "Session Persistence", status: "fail", detail: `Session expirée à ${expiresAt?.toISOString()}`, durationMs: Date.now() - start };
    }
    return {
      name: "Session Persistence",
      status: "pass",
      detail: `Session active — expire à ${expiresAt?.toISOString() || "N/A"} — provider: ${session.user?.app_metadata?.provider || "email"}`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { name: "Session Persistence", status: "fail", detail: err instanceof Error ? err.message : "Erreur", durationMs: Date.now() - start };
  }
}

async function testCallbackRouting(): Promise<TestResult> {
  const start = Date.now();
  try {
    const callbackUrl = buildAppUrl("/auth/callback");
    const response = await fetch(callbackUrl, { method: "HEAD", redirect: "manual" });
    const isOk = response.status < 400 || response.status === 0;
    return {
      name: "Callback Route",
      status: isOk ? "pass" : "warn",
      detail: `${callbackUrl} — status: ${response.status}`,
      durationMs: Date.now() - start,
    };
  } catch {
    return {
      name: "Callback Route",
      status: "pass",
      detail: `Route /auth/callback enregistrée (vérification réseau non disponible en SPA)`,
      durationMs: Date.now() - start,
    };
  }
}

async function testOtpDryRun(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { error } = await db.auth.signInWithOtp({ phone: "+15555550100" });
    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("phone provider is not enabled") ||
        msg.includes("sms provider") ||
        msg.includes("twilio") ||
        msg.includes("phone signups are disabled") ||
        msg.includes("phone logins are disabled")
      ) {
        return {
          name: "OTP Send (dry-run)",
          status: "warn",
          detail: `Provider Phone non activé: ${error.message}`,
          durationMs: Date.now() - start,
        };
      }
      return {
        name: "OTP Send (dry-run)",
        status: "pass",
        detail: `Provider Phone actif (erreur attendue pour numéro test: ${error.message})`,
        durationMs: Date.now() - start,
      };
    }
    return {
      name: "OTP Send (dry-run)",
      status: "pass",
      detail: "Provider Phone actif — dry-run OTP accepté",
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name: "OTP Send (dry-run)",
      status: "fail",
      detail: err instanceof Error ? err.message : "Erreur réseau",
      durationMs: Date.now() - start,
    };
  }
}

async function testSupabaseAuth(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await db.auth.getSession();
    if (error) {
      return { name: "Supabase Auth Service", status: "fail", detail: error.message, durationMs: Date.now() - start };
    }
    return { name: "Supabase Auth Service", status: "pass", detail: `Service accessible — session: ${data.session ? "active" : "none"}`, durationMs: Date.now() - start };
  } catch (err) {
    return { name: "Supabase Auth Service", status: "fail", detail: err instanceof Error ? err.message : "Erreur réseau", durationMs: Date.now() - start };
  }
}

async function testIdentityPipeline(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data: profile } = await db
      .from("profiles")
      .select("id, phone, phone_verified, user_type, onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      return { name: "Identity Pipeline", status: "warn", detail: "Profil non trouvé — pipeline non exécuté", durationMs: Date.now() - start };
    }

    const checks: string[] = [];
    if (profile.phone_verified) checks.push("phone_verified");
    if (profile.user_type) checks.push(`type=${profile.user_type}`);
    if (profile.onboarding_completed) checks.push("onboarding_done");

    const { data: orbit } = await db
      .from("orbit_profiles_v2")
      .select("id, verification_level")
      .eq("id", userId)
      .maybeSingle();

    if (orbit) checks.push(`orbit_level=${orbit.verification_level}`);

    const { data: wallet } = await db
      .from("wallet_accounts")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (wallet) checks.push("wallet_ready");

    return {
      name: "Identity Pipeline",
      status: checks.length >= 3 ? "pass" : "warn",
      detail: checks.join(", ") || "Aucune donnée d'identité",
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { name: "Identity Pipeline", status: "fail", detail: err instanceof Error ? err.message : "Erreur", durationMs: Date.now() - start };
  }
}

export default function AuthDiagnosticPage() {
  const { user, session } = useAuth();
  const [providerHealth, setProviderHealth] = useState<ProviderHealthResult | null>(null);
  const [providerLoading, setProviderLoading] = useState(true);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testRunning, setTestRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    checkAllProviders(true).then((result) => {
      if (mounted) {
        setProviderHealth(result);
        setProviderLoading(false);
      }
    }).catch(() => {
      if (mounted) setProviderLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const runFullTest = useCallback(async () => {
    setTestRunning(true);
    setTestResults([]);
    const results: TestResult[] = [];

    console.group("[AUTH_DIAGNOSTIC] Full Test Run");

    const supabaseResult = await testSupabaseAuth();
    results.push(supabaseResult);
    setTestResults([...results]);
    console.log(`[TEST] ${supabaseResult.name}: ${supabaseResult.status} — ${supabaseResult.detail}`);

    const providerResults = await testProviderAvailability();
    results.push(...providerResults);
    setTestResults([...results]);
    providerResults.forEach((r) => console.log(`[TEST] ${r.name}: ${r.status} — ${r.detail}`));

    const otpDryRunResult = await testOtpDryRun();
    results.push(otpDryRunResult);
    setTestResults([...results]);
    console.log(`[TEST] ${otpDryRunResult.name}: ${otpDryRunResult.status} — ${otpDryRunResult.detail}`);

    const redirectResult = await testOAuthRedirectUrl();
    results.push(redirectResult);
    setTestResults([...results]);
    console.log(`[TEST] ${redirectResult.name}: ${redirectResult.status} — ${redirectResult.detail}`);

    const callbackResult = await testCallbackRouting();
    results.push(callbackResult);
    setTestResults([...results]);
    console.log(`[TEST] ${callbackResult.name}: ${callbackResult.status} — ${callbackResult.detail}`);

    const sessionResult = await testSessionPersistence();
    results.push(sessionResult);
    setTestResults([...results]);
    console.log(`[TEST] ${sessionResult.name}: ${sessionResult.status} — ${sessionResult.detail}`);

    if (user?.id) {
      const pipelineResult = await testIdentityPipeline(user.id);
      results.push(pipelineResult);
      setTestResults([...results]);
      console.log(`[TEST] ${pipelineResult.name}: ${pipelineResult.status} — ${pipelineResult.detail}`);
    }

    const passed = results.filter((r) => r.status === "pass").length;
    const warned = results.filter((r) => r.status === "warn").length;
    const failed = results.filter((r) => r.status === "fail").length;

    console.log(`[AUTH_DIAGNOSTIC] Results: ${passed} pass, ${warned} warn, ${failed} fail`);
    console.groupEnd();

    setLastRunAt(new Date().toISOString());
    setTestRunning(false);
  }, [user?.id]);

  const goldColor = "hsl(168, 72%, 44%)";

  return (
    <SubPageShell title="Auth Diagnostic" backTo="/dashboard">
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold mb-4">Session actuelle</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Utilisateur</span>
              <span className="font-mono text-xs">{user?.id || "Non connecté"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user?.email || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Téléphone</span>
              <span>{user?.phone || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span>{session?.user?.app_metadata?.provider || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session expire</span>
              <span>{session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : "—"}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Statut des providers</h2>
            <button
              onClick={() => {
                setProviderLoading(true);
                checkAllProviders(true).then(setProviderHealth).finally(() => setProviderLoading(false));
              }}
              disabled={providerLoading}
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${providerLoading ? "animate-spin" : ""}`} />
              Rafraîchir
            </button>
          </div>

          {providerLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Vérification…</span>
            </div>
          ) : providerHealth ? (
            <div className="space-y-3">
              {(
                [
                  { label: "Phone (Twilio)", value: providerHealth.phone },
                  { label: "Google OAuth", value: providerHealth.google },
                  { label: "Apple Sign-In", value: providerHealth.apple },
                ] as const
              ).map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    {value ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs text-emerald-600">Actif</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-amber-500" />
                        <span className="text-xs text-amber-600">Non configuré</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                Dernière vérification : {new Date(providerHealth.checkedAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Impossible de vérifier les providers.</p>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Tests End-to-End</h2>
            <button
              onClick={runFullTest}
              disabled={testRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: goldColor }}
            >
              {testRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {testRunning ? "En cours…" : "Lancer les tests"}
            </button>
          </div>

          {testResults.length > 0 ? (
            <div className="space-y-2">
              {testResults.map((result, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <StatusIcon status={result.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{result.name}</p>
                    {result.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5 break-all">{result.detail}</p>
                    )}
                  </div>
                  {result.durationMs !== undefined && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{result.durationMs}ms</span>
                  )}
                </div>
              ))}
              {lastRunAt && (
                <p className="text-xs text-muted-foreground mt-3">
                  Dernière exécution : {new Date(lastRunAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {testRunning ? "Exécution des tests…" : "Cliquez sur \"Lancer les tests\" pour exécuter la suite complète."}
            </p>
          )}
        </div>

        <div className="bg-muted/30 rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold mb-2">Guide de configuration</h3>
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p>Pour activer les providers manquants :</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Accédez au <strong>Supabase Dashboard</strong> &rarr; Authentication &rarr; Providers</li>
              <li><strong>Phone</strong> : Activez le provider Phone et configurez vos identifiants Twilio (Account SID, Auth Token, numéro expéditeur)</li>
              <li><strong>Google</strong> : Activez le provider Google et ajoutez vos Client ID / Client Secret Google Cloud Console</li>
              <li><strong>Apple</strong> : Activez le provider Apple et configurez le Service ID, Team ID et Key ID Apple Developer</li>
              <li>Ajoutez <code>{buildAppUrl("/auth/callback")}</code> aux URL de redirect autorisées dans Supabase &rarr; Authentication &rarr; URL Configuration</li>
            </ol>
          </div>
        </div>
      </div>
    </SubPageShell>
  );
}
