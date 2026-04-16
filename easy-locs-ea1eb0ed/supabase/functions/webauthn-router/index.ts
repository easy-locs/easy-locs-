import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const router = new EdgeRouter("webauthn-router", { requireAuth: false, tierAwareRateLimit: true });

router.post("/registration/begin", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "webauthn-begin-registration", cors);
});

router.post("/registration/finish", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "webauthn-finish-registration", cors);
});

router.post("/registration/challenge", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "webauthn-registration-challenge", cors);
});

router.post("/registration/verify", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "webauthn-registration-verify", cors);
});

router.post("/authentication/challenge", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "webauthn-authentication-challenge", cors);
});

router.post("/authentication/verify", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "webauthn-authentication-verify", cors);
});

router.post("/login/challenge", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "webauthn-login-challenge", cors);
});

router.post("/login/verify", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "webauthn-login-verify", cors);
});

Deno.serve(router.serve());
