// Updated admin allowlist logic to merge fallback email with VITE_ADMIN_ALLOWLIST.

const VITE_ADMIN_ALLOWLIST = import.meta.env.VITE_ADMIN_ALLOWLIST ? import.meta.env.VITE_ADMIN_ALLOWLIST.split(',') : [];

// Fallback owner email
const FALLBACK_OWNER_EMAIL = 'habboujabir@gmail.com';

// Merging fallback owner email with the allowlist
const adminAllowlist = Array.from(new Set([...VITE_ADMIN_ALLOWLIST, FALLBACK_OWNER_EMAIL]));

export function useIsAdmin(email) {
    return adminAllowlist.includes(email);
}