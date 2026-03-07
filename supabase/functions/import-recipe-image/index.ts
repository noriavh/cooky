import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateRecipe, parseAIResponse } from "../_shared/recipe-schema.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

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

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image requise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing image for recipe extraction...');

    // Use Gemini 2.5 Flash with vision capabilities to extract and structure the recipe
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant spécialisé dans l'extraction de recettes de cuisine à partir d'images.
Analyse l'image fournie (photo d'un livre de cuisine, page de magazine, etc.) et extrais toutes les informations de la recette.

Tu DOIS retourner un objet JSON valide avec cette structure exacte:
{
  "title": "Titre de la recette",
  "description": "Description courte de la recette (optionnel, peut être null)",
  "recipe_type": "plat" | "entree" | "dessert" | "boisson" | "apero" | "soupe",
  "difficulty": "facile" | "moyen" | "difficile",
  "prep_time": nombre en minutes ou null,
  "cook_time": nombre en minutes ou null,
  "servings": nombre de portions ou null,
  "ingredients": [
    {"name": "nom de l'ingrédient", "quantity": nombre ou null, "unit": "unité" ou null}
  ],
  "steps": [
    {"content": "Description de l'étape", "position": 1}
  ]
}

Règles importantes:
- Extrais TOUT le texte visible lié à la recette
- Interprète intelligemment les quantités (ex: "1/2" devient 0.5)
- Traduis en français si nécessaire
- Si une information n'est pas visible, utilise null
- Les étapes doivent être numérotées séquentiellement (position: 1, 2, 3...)
- Retourne UNIQUEMENT le JSON, pas de texte avant ou après`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyse cette image de recette et extrais toutes les informations au format JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Crédits insuffisants. Veuillez recharger votre compte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Pas de réponse de l\'IA');
    }

    console.log('AI response received');

    // Parse the JSON response
    const recipeData = parseAIResponse(content);
    
    if (!recipeData) {
      console.error('Failed to parse AI response as JSON');
      return new Response(
        JSON.stringify({ success: false, error: 'Impossible d\'extraire la recette de l\'image. Veuillez réessayer avec une photo plus nette.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate recipe structure with schema
    const validationResult = validateRecipe(recipeData);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'La recette extraite est incomplète. Veuillez réessayer avec une photo plus lisible.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recipe = validationResult.data;
    console.log('Recipe extracted successfully:', recipe.title);

    return new Response(
      JSON.stringify({ success: true, recipe }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de l\'extraction de la recette' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
