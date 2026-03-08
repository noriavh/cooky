import { createClient } from "npm:@supabase/supabase-js@2";
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

Deno.serve(async (req) => {
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

    const { url, text } = await req.json();

    if (!url && !text) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL ou texte requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let pageContent: string;
    let pageTitle: string | undefined;
    let formattedUrl: string | undefined;

    // Mode URL: scrape with Firecrawl
    if (url) {
      const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

      if (!firecrawlApiKey) {
        console.error('FIRECRAWL_API_KEY not configured');
        return new Response(
          JSON.stringify({ success: false, error: 'Firecrawl non configuré' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Format URL
      let urlToScrape = url.trim();
      if (!urlToScrape.startsWith('http://') && !urlToScrape.startsWith('https://')) {
        urlToScrape = `https://${urlToScrape}`;
      }
      formattedUrl = urlToScrape;

      console.log('[import-recipe] Scraping URL for user:', userId, 'URL:', urlToScrape);
      console.log('[import-recipe] Firecrawl API key present:', !!firecrawlApiKey, 'length:', firecrawlApiKey.length);

      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: urlToScrape,
          formats: ['markdown'],
          onlyMainContent: true,
        }),
      });

      const scrapeData = await scrapeResponse.json();
      console.log('[import-recipe] Firecrawl response status:', scrapeResponse.status);

      if (!scrapeResponse.ok || !scrapeData.success) {
        console.error('[import-recipe] Firecrawl error:', JSON.stringify(scrapeData));
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: scrapeData.error || 'Impossible de récupérer le contenu de cette page' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      pageContent = scrapeData.data?.markdown || scrapeData.markdown;
      pageTitle = scrapeData.data?.metadata?.title || scrapeData.metadata?.title;

      if (!pageContent) {
        console.error('No content extracted from page');
        return new Response(
          JSON.stringify({ success: false, error: 'Aucun contenu trouvé sur cette page' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[import-recipe] Content extracted, length:', pageContent.length);
      console.log('[import-recipe] Page title:', pageTitle);
    } else {
      // Mode texte: use the provided text directly
      pageContent = text.trim();
      console.log('Using provided text for user:', userId, 'length:', pageContent.length);
    }

    // Step 2: Use AI to extract recipe information
    console.log('[import-recipe] Calling Gemini API...');
    console.log('[import-recipe] Gemini API key present:', !!geminiApiKey, 'length:', geminiApiKey.length);
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: EXTRACTION_PROMPT }] },
        contents: [{
          role: 'user',
          parts: [{ text: `Voici le contenu de la page (titre: "${pageTitle || 'Non disponible'}"):\n\n${pageContent.substring(0, 15000)}` }]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    console.log('[import-recipe] Gemini response status:', aiResponse.status);

    if (!aiResponse.ok) {
      const aiError = await aiResponse.text();
      console.error('[import-recipe] Gemini API error:', aiResponse.status, aiError);
      
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
    const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiContent) {
      console.error('No AI response content');
      return new Response(
        JSON.stringify({ success: false, error: 'L\'IA n\'a pas pu extraire la recette' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[import-recipe] Gemini response received, content length:', aiContent?.length);

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
        source_url: formattedUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-recipe function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Une erreur est survenue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
