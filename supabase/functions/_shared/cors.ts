/**
 * CORS configuration for edge functions
 * Restricts origins to known application domains for security
 */

// Allowed origins for CORS - includes production, preview, and development URLs
const ALLOWED_ORIGINS = [
  'http://localhost:5173',                                         // Local development (Vite default)
  'http://localhost:8080',                                         // Local development (Vite alt)
  'http://localhost:3000',                                         // Alternative local port
];

/**
 * Checks if the origin is allowed
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Gets CORS headers for the given request
 * Returns origin-specific headers if origin is allowed, otherwise uses first allowed origin
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  
  // Use the request's origin if it's allowed, otherwise use the first allowed origin
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Creates a CORS preflight response
 */
export function handleCorsPreFlight(req: Request): Response {
  return new Response(null, { headers: getCorsHeaders(req) });
}
