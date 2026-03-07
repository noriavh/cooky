import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

async function verifyAdminToken(token: string): Promise<boolean> {
  if (!token) return false;
  
  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  if (!adminPassword) return false;

  const parts = token.split(":");
  if (parts.length !== 2) return false;

  const [timestamp, receivedHash] = parts;
  const tokenTime = parseInt(timestamp, 10);
  
  // Token expires after 24 hours
  if (Date.now() - tokenTime > 24 * 60 * 60 * 1000) {
    return false;
  }

  // Verify hash
  const encoder = new TextEncoder();
  const data = encoder.encode(`${adminPassword}:${timestamp}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return receivedHash === expectedHash;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminToken = req.headers.get("x-admin-token");
    
    if (!adminToken || !(await verifyAdminToken(adminToken))) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Handle POST for mutations
    if (req.method === "POST") {
      const body = await req.json();
      const { action, productId, name, aisle_id, unit_id, months } = body;

      if (action === "convertToGlobal" && productId) {
        // Convert product to global by setting user_id and family_id to null
        const { error } = await supabase
          .from("shopping_products")
          .update({ user_id: null, family_id: null })
          .eq("id", productId);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "updateProduct" && productId) {
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (aisle_id !== undefined) updateData.aisle_id = aisle_id;
        if (unit_id !== undefined) updateData.unit_id = unit_id;

        const { error } = await supabase
          .from("shopping_products")
          .update(updateData)
          .eq("id", productId);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "updateProductSeasons" && productId && Array.isArray(months)) {
        // Delete existing seasons for this product
        const { error: deleteError } = await supabase
          .from("product_seasons")
          .delete()
          .eq("product_id", productId);

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Insert new seasons
        if (months.length > 0) {
          const seasonsToInsert = months.map((month: number) => ({
            product_id: productId,
            month,
          }));

          const { error: insertError } = await supabase
            .from("product_seasons")
            .insert(seasonsToInsert);

          if (insertError) {
            return new Response(
              JSON.stringify({ error: insertError.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle GET for queries
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource");

    let data;
    let error;

    switch (resource) {
      case "recipes": {
        const result = await supabase
          .from("recipes")
          .select(`
            id,
            title,
            image_url,
            price_level,
            difficulty,
            diet,
            owner_id,
            family_id,
            origin:origins(id, name, emoji),
            tags:recipe_tags(tag:tags(id, name))
          `)
          .order("created_at", { ascending: false });
        data = result.data;
        error = result.error;
        break;
      }

      case "products": {
        const result = await supabase
          .from("shopping_products")
          .select(`
            id,
            name,
            user_id,
            family_id,
            aisle:aisles(id, name, icon),
            unit:units(id, name, abbreviation)
          `)
          .order("name");
        data = result.data;
        error = result.error;
        break;
      }

      case "seasonalProducts": {
        // Get products from "Fruits et légumes" aisle with their seasons
        const aisleResult = await supabase
          .from("aisles")
          .select("id")
          .ilike("name", "%fruits et légumes%")
          .single();

        if (aisleResult.error) {
          error = aisleResult.error;
          break;
        }

        const productsResult = await supabase
          .from("shopping_products")
          .select(`
            id,
            name,
            aisle:aisles(id, name, icon),
            product_seasons(month)
          `)
          .eq("aisle_id", aisleResult.data.id)
          .is("user_id", null)
          .is("family_id", null)
          .order("name");

        data = productsResult.data;
        error = productsResult.error;
        break;
      }

      case "users": {
        // Get all profiles
        const profilesResult = await supabase
          .from("profiles")
          .select("id, username, diet, avatar_url")
          .order("username");
        
        if (profilesResult.error) {
          error = profilesResult.error;
          break;
        }

        // Get family memberships
        const familyResult = await supabase
          .from("family_members")
          .select("user_id, family:families(id, name)");

        // Get auth users for emails (requires service role)
        const { data: authData } = await supabase.auth.admin.listUsers();
        
        const userEmailMap = new Map();
        authData?.users?.forEach(u => {
          userEmailMap.set(u.id, u.email);
        });

        const familyMap = new Map();
        familyResult.data?.forEach(fm => {
          familyMap.set(fm.user_id, fm.family);
        });

        data = profilesResult.data?.map(profile => ({
          ...profile,
          email: userEmailMap.get(profile.id) || null,
          family: familyMap.get(profile.id) || null,
        }));
        break;
      }

      case "profiles": {
        // Get profiles for owner lookup
        const result = await supabase
          .from("profiles")
          .select("id, username");
        data = result.data;
        error = result.error;
        break;
      }

      case "families": {
        // Get families for owner lookup
        const result = await supabase
          .from("families")
          .select("id, name");
        data = result.data;
        error = result.error;
        break;
      }

      case "origins": {
        const result = await supabase
          .from("origins")
          .select("id, name, emoji");
        data = result.data;
        error = result.error;
        break;
      }

      case "tags": {
        const result = await supabase
          .from("tags")
          .select("id, name");
        data = result.data;
        error = result.error;
        break;
      }

      case "aisles": {
        const result = await supabase
          .from("aisles")
          .select("id, name, icon")
          .order("position");
        data = result.data;
        error = result.error;
        break;
      }

      case "units": {
        const result = await supabase
          .from("units")
          .select("id, name, abbreviation");
        data = result.data;
        error = result.error;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid resource" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (error) {
      console.error(`Error fetching ${resource}:`, error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin data error:", error);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
