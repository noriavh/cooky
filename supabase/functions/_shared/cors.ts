/**
 * CORS configuration for edge functions
 * Restricts origins to known application domains for security
 */

// Allowed origins for CORS - includes production, preview, and development URLs
const ALLOWED_ORIGINS = [
  'https://cooky-recipe.lovable.app',                              // Published URL
  'https://id-preview--ccb3b1cf-84db-4835-8c28-a6cbfdfe959b.lovable.app', // Preview URL
  'http://localhost:5173',                                         // Local development
  'http://localhost:3000',                                         // Alternative local port
];

// Also allow any Lovable preview/project subdomain pattern
const LOVABLE_PREVIEW_PATTERN = /^https:\/\/[a-zA-Z0-9-]+\.(lovable\.app|lovableproject\.com)$/;

/**
 * Checks if the origin is allowed
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Check exact match first
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  
  // Check Lovable preview pattern
  if (LOVABLE_PREVIEW_PATTERN.test(origin)) {
    return true;
  }
  
  return false;
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
