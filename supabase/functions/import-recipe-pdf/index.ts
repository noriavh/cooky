import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateRecipe, parseAIResponse } from "../_shared/recipe-schema.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

const EXTRACTION_PROMPT = `Tu es un assistant expert en extraction de recettes de cuisine.
Analyse le contenu suivant et extrais TOUTES les informations de la recette au format JSON.

RÈGLES CRITIQUES POUR LES INGRÉDIENTS:
1. Parse TOUJOURS la quantité comme un NOMBRE (pas une chaîne). Exemples:
   - "2 oignons" → quantity: 2, unit: null, name: "oignons"
   - "500g de farine" → quantity: 500, unit: "g", name: "farine"
   - "1/2 citron" → quantity: 0.5, unit: null, name: "citron"
   - "3 c.s. de sucre" → quantity: 3, unit: "c.s.", name: "sucre"
   - "1 kg de pommes de terre" → quantity: 1, unit: "kg", name: "pommes de terre"
   - "200 ml de lait" → quantity: 200, unit: "mL", name: "lait"
   - "1 boîte de tomates" → quantity: 1, unit: "boîte", name: "tomates"
   - "quelques feuilles de basilic" → quantity: null, unit: null, name: "feuilles de basilic"

2. Convertis les fractions en décimaux: 1/2=0.5, 1/4=0.25, 3/4=0.75, 1/3=0.33
3. Sépare TOUJOURS quantité, unité et nom de l'ingrédient
4. Les unités courantes: g, kg, L, mL, cL, c.s. (cuillère à soupe), c.c. (cuillère à café), pce (pièce), tr. (tranche)

AUTRES RÈGLES:
- Extrais le titre, la description, les temps de préparation et cuisson (en minutes)
- Extrais les étapes de préparation dans l'ordre
- Détermine le type: entree, plat, dessert, boisson, apero, ou soupe
- Détermine la difficulté: facile, moyen, ou difficile
- Estime le nombre de portions si non mentionné (défaut: 4)
- Si une information n'est pas disponible, utilise null

Retourne UNIQUEMENT un JSON valide avec cette structure:
{
  "title": "string",
  "description": "string ou null",
  "recipe_type": "entree|plat|dessert|boisson|apero|soupe",
  "difficulty": "facile|moyen|difficile",
  "prep_time": number ou null,
  "cook_time": number ou null,
  "servings": number ou null,
  "ingredients": [
    { "name": "string (juste le nom, sans quantité ni unité)", "quantity": number ou null, "unit": "string ou null" }
  ],
  "steps": [
    { "content": "string", "position": number (commençant à 1) }
  ]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Extract and verify JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated using getClaims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Authentication failed:', claimsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    const { fileBase64, fileName } = await req.json();

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Fichier PDF requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing PDF:', fileName, 'for user:', userId);

    // Use Gemini's native PDF vision capabilities
    // Send the PDF as base64 to the AI model which supports PDF parsing
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: `Voici un document PDF contenant une recette. Analyse le contenu et extrais toutes les informations de la recette.`
              },
              {
                type: 'file',
                file: {
                  filename: fileName || 'recipe.pdf',
                  file_data: `data:application/pdf;base64,${fileBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const aiError = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, aiError);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requêtes atteinte, réessayez plus tard' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Crédits AI insuffisants' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur lors de l\'analyse IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error('No AI response content');
      return new Response(
        JSON.stringify({ success: false, error: 'L\'IA n\'a pas pu extraire la recette' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response received');

    // Parse JSON from AI response (handle markdown code blocks)
    const recipeData = parseAIResponse(aiContent);
    
    if (!recipeData) {
      console.error('Failed to parse AI response as JSON');
      return new Response(
        JSON.stringify({ success: false, error: 'Format de réponse IA invalide' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate recipe structure with schema
    const validationResult = validateRecipe(recipeData);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: validationResult.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recipe = validationResult.data;
    console.log('Recipe extracted successfully for user:', userId, 'title:', recipe.title);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipe: recipe,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-recipe-pdf function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Une erreur est survenue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
