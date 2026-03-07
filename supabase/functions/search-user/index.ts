import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

interface SearchRequest {
  query: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Extract and verify JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT for authentication verification
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated using getClaims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Authentication failed:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentUserId = claimsData.claims.sub;

    const { query }: SearchRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ user: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchQuery = query.toLowerCase().trim();

    // Validate search query length to prevent abuse
    if (searchQuery.length < 2 || searchQuery.length > 255) {
      return new Response(
        JSON.stringify({ user: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for profile search
    // This bypasses RLS to allow searching all profiles by username
    // Authentication is verified above, so this is safe
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Search profiles using service role - only return username and avatar
    // No email or diet exposure - only basic profile info for friend discovery
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_url")
      .neq("id", currentUserId)
      .ilike("username", searchQuery);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }

    // Find exact username match (case insensitive)
    const exactMatch = profiles?.find(
      (p) => p.username?.toLowerCase() === searchQuery
    );

    if (exactMatch) {
      return new Response(
        JSON.stringify({
          user: {
            id: exactMatch.id,
            username: exactMatch.username,
            avatar_url: exactMatch.avatar_url,
            // No email in response - security improvement
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No exact match found
    return new Response(
      JSON.stringify({ user: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Search error:", errorMessage);
    // Return generic error message - don't expose internal details
    return new Response(
      JSON.stringify({ error: "Search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
