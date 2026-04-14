module.exports = {
  setAuthHeaders: async function (requestParams, context, ee, next) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const testEmail = process.env.LOAD_TEST_EMAIL;
    const testPassword = process.env.LOAD_TEST_PASSWORD;

    if (!testEmail || !testPassword) {
      ee.emit("error", "LOAD_TEST_EMAIL and LOAD_TEST_PASSWORD required for authenticated scenarios");
      return next(new Error("Missing LOAD_TEST_EMAIL/LOAD_TEST_PASSWORD env vars"));
    }

    if (!context.vars.authToken) {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        ee.emit("error", `Auth failed: ${res.status} ${errBody}`);
        return next(new Error(`Auth login failed with ${res.status}`));
      }

      const data = await res.json();
      context.vars.authToken = data.access_token;
    }

    requestParams.headers = requestParams.headers || {};
    requestParams.headers.Authorization = `Bearer ${context.vars.authToken}`;
    return next();
  },
};
