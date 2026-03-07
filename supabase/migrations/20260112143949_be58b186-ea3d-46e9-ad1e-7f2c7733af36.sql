-- Migration: Match existing ingredients to products or create new ones using similarity
DO $$
DECLARE
    ing RECORD;
    matched_product_id uuid;
    new_product_id uuid;
    autres_aisle_id uuid;
BEGIN
    -- Get the "Autres" aisle id
    SELECT id INTO autres_aisle_id FROM public.aisles WHERE name = 'Autres' LIMIT 1;
    
    -- Loop through all distinct ingredient names that don't have a product_id
    FOR ing IN SELECT DISTINCT ON (lower(trim(name))) id, name, unit_id 
               FROM public.ingredients 
               WHERE product_id IS NULL 
               ORDER BY lower(trim(name)), id
    LOOP
        -- Try to find a matching product using similarity (threshold 0.7 ~ allows ~2 char diff on typical names)
        SELECT sp.id INTO matched_product_id
        FROM public.shopping_products sp
        WHERE similarity(lower(trim(sp.name)), lower(trim(ing.name))) > 0.7
           OR lower(trim(sp.name)) = lower(trim(ing.name))
        ORDER BY similarity(lower(trim(sp.name)), lower(trim(ing.name))) DESC
        LIMIT 1;
        
        IF matched_product_id IS NOT NULL THEN
            -- Update all ingredients with this name to use the matched product
            UPDATE public.ingredients
            SET product_id = matched_product_id
            WHERE lower(trim(name)) = lower(trim(ing.name)) AND product_id IS NULL;
        ELSE
            -- Create a new global product (user_id = NULL)
            INSERT INTO public.shopping_products (name, unit_id, aisle_id, user_id)
            VALUES (trim(ing.name), ing.unit_id, autres_aisle_id, NULL)
            RETURNING id INTO new_product_id;
            
            -- Update all ingredients with this name to use the new product
            UPDATE public.ingredients
            SET product_id = new_product_id
            WHERE lower(trim(name)) = lower(trim(ing.name)) AND product_id IS NULL;
        END IF;
    END LOOP;
END;
$$;