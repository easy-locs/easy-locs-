export async function getTestUserJwt(): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const email = process.env.CONTRACT_TEST_EMAIL;
  const password = process.env.CONTRACT_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "CONTRACT_TEST_EMAIL and CONTRACT_TEST_PASSWORD must be set for authenticated contract tests"
    );
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey!,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Contract test auth failed: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  return data.access_token;
}
