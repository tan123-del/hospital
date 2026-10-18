// Backend URL. Set VITE_API_URL in Vercel/.env to override (no trailing slash).
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://hospital-backend-iota.vercel.app"
).replace(/\/+$/, "");
