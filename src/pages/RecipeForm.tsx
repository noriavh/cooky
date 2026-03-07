import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, Loader2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRecipe, useCreateRecipe, useUpdateRecipe, useOrigins, useUnits, useTags } from '@/hooks/useRecipes';
import { useShoppingProducts } from '@/hooks/useShoppingProducts';
import { supabase } from '@/integrations/supabase/client';
import ImageUpload from '@/components/recipes/ImageUpload';
import RecipeListManager, { RecipeListManagerRef } from '@/components/recipes/RecipeListManager';
import RecipeImporter from '@/components/recipes/RecipeImporter';
import RecipeTagManager from '@/components/recipes/RecipeTagManager';
import IngredientProductSelect from '@/components/recipes/IngredientProductSelect';
import { calculateRecipeDiet } from '@/hooks/useProfile';
import { useQuery } from '@tanstack/react-query';
import { useNavigationBlocker } from '@/hooks/useNavigationBlocker';
import NavigationBlockerDialog from '@/components/NavigationBlockerDialog';

const ingredientSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  quantity: z.string().optional(),
  unit_id: z.string().optional(),
  product_id: z.string().optional().nullable(),
  position: z.number(),
});

const stepSchema = z.object({
  content: z.string().min(1, 'Contenu requis'),
  position: z.number(),
});

const recipeSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  description: z.string().optional(),
  recipe_type: z.enum(['entree', 'plat', 'dessert', 'boisson', 'apero', 'soupe', 'petit_dejeuner', 'gouter']),
  difficulty: z.enum(['facile', 'moyen', 'difficile']).optional(),
  price_level: z.enum(['1', '2', '3']).optional(),
  prep_time: z.string().optional(),
  cook_time: z.string().optional(),
  servings: z.string().optional(),
  origin_id: z.string().optional(),
  image_url: z.string().optional(),
  source_url: z.string().optional(),
  ingredients: z.array(ingredientSchema),
  steps: z.array(stepSchema),
  tag_ids: z.array(z.string()).optional(),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

// Sortable Ingredient Item Component
const SortableIngredientItem = ({ 
  id, 
  index, 
  form, 
  units, 
  onRemove, 
  disabled 
}: { 
  id: string; 
  index: number; 
  form: any; 
  units: any[] | undefined; 
  onRemove: () => void; 
  disabled: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1.5 sm:gap-2 bg-background"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 shrink-0 touch-none"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <Input
        placeholder="Qté"
        className="w-12 sm:w-20 text-xs sm:text-sm px-1.5 sm:px-3 h-8 sm:h-10"
        {...form.register(`ingredients.${index}.quantity`)}
      />
      <Select
        value={form.watch(`ingredients.${index}.unit_id`) || 'none'}
        onValueChange={(value) => form.setValue(`ingredients.${index}.unit_id`, value === 'none' ? '' : value)}
      >
        <SelectTrigger className="w-16 sm:w-24 text-xs sm:text-sm px-1.5 sm:px-3 h-8 sm:h-10">
          <SelectValue placeholder="Unité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unité</SelectItem>
          {units?.map((unit) => (
            <SelectItem key={unit.id} value={unit.id}>
              {unit.abbreviation || unit.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <IngredientProductSelect
        value={{
          productId: form.watch(`ingredients.${index}.product_id`) || null,
          name: form.watch(`ingredients.${index}.name`) || '',
        }}
        onChange={(value) => {
          form.setValue(`ingredients.${index}.name`, value.name);
          form.setValue(`ingredients.${index}.product_id`, value.productId);
          // Auto-select default unit if no unit is set and product has a default unit
          if (value.defaultUnitId && !form.watch(`ingredients.${index}.unit_id`)) {
            form.setValue(`ingredients.${index}.unit_id`, value.defaultUnitId);
          }
        }}
        placeholder="Ingrédient"
        inputClassName="text-xs sm:text-sm h-8 sm:h-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 sm:h-10 sm:w-10 shrink-0"
        onClick={onRemove}
        disabled={disabled}
      >
        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
      </Button>
    </div>
  );
};

// Sortable Step Item Component
const SortableStepItem = ({ 
  id, 
  index, 
  form, 
  onRemove, 
  disabled 
}: { 
  id: string; 
  index: number; 
  form: any; 
  onRemove: () => void; 
  disabled: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 bg-background"
    >
      <div className="flex flex-col items-center gap-0.5 pt-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 touch-none"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
          {index + 1}
        </span>
      </div>
      <Textarea
        placeholder="Décrivez cette étape..."
        className="flex-1 resize-none"
        rows={2}
        {...form.register(`steps.${index}.content`)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        className="mt-1"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
};

const RecipeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!id;

  const { data: existingRecipe, isLoading: loadingRecipe } = useRecipe(id);
  const { data: origins } = useOrigins();
  const { data: units } = useUnits();
  const { data: tags } = useTags();
  const { data: products } = useShoppingProducts();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();

  // Fetch aisles for diet calculation
  const { data: aisles } = useQuery({
    queryKey: ['aisles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('aisles').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const listManagerRef = useRef<RecipeListManagerRef>(null);

  // Block navigation when there are unsaved changes
  const { isBlocked, confirmNavigation, cancelNavigation } = useNavigationBlocker({
    when: hasUnsavedChanges && !isSubmitting,
    message: 'Êtes-vous sûr de vouloir quitter l\'édition de la recette ? Vos modifications seront perdues.',
  });
  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      title: '',
      description: '',
      recipe_type: 'plat',
      difficulty: 'moyen',
      price_level: '2',
      prep_time: '',
      cook_time: '',
      servings: '4',
      origin_id: '',
      image_url: '',
      source_url: '',
      ingredients: [{ name: '', quantity: '', unit_id: '', product_id: null, position: 0 }],
      steps: [{ content: '', position: 0 }],
      tag_ids: [],
    },
  });

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient, move: moveIngredient } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  });

  const { fields: stepFields, append: appendStep, remove: removeStep, move: moveStep } = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  // Track form changes to detect unsaved modifications
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Reset unsaved changes flag when recipe is loaded (editing mode)
  useEffect(() => {
    if (existingRecipe && isEditing) {
      // Small delay to let form.reset complete
      const timer = setTimeout(() => setHasUnsavedChanges(false), 100);
      return () => clearTimeout(timer);
    }
  }, [existingRecipe, isEditing]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleIngredientDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = ingredientFields.findIndex((f) => f.id === active.id);
      const newIndex = ingredientFields.findIndex((f) => f.id === over.id);
      moveIngredient(oldIndex, newIndex);
    }
  };

  const handleStepDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = stepFields.findIndex((f) => f.id === active.id);
      const newIndex = stepFields.findIndex((f) => f.id === over.id);
      moveStep(oldIndex, newIndex);
    }
  };

  // Load existing recipe data
  useEffect(() => {
    if (existingRecipe && isEditing) {
      form.reset({
        title: existingRecipe.title,
        description: existingRecipe.description || '',
        recipe_type: existingRecipe.recipe_type,
        difficulty: existingRecipe.difficulty || 'moyen',
        price_level: existingRecipe.price_level || '2',
        prep_time: existingRecipe.prep_time?.toString() || '',
        cook_time: existingRecipe.cook_time?.toString() || '',
        servings: existingRecipe.servings?.toString() || '4',
        origin_id: existingRecipe.origin_id || '',
        image_url: existingRecipe.image_url || '',
        source_url: existingRecipe.source_url || '',
        ingredients: existingRecipe.ingredients?.length 
          ? existingRecipe.ingredients.map((ing, idx) => ({
              name: ing.shopping_products?.name || ing.name,
              quantity: ing.quantity?.toString() || '',
              unit_id: ing.unit_id || '',
              product_id: ing.product_id || null,
              position: idx,
            }))
          : [{ name: '', quantity: '', unit_id: '', product_id: null, position: 0 }],
        steps: existingRecipe.steps?.length
          ? existingRecipe.steps.map((step, idx) => ({
              content: step.content,
              position: idx,
            }))
          : [{ content: '', position: 0 }],
        tag_ids: existingRecipe.recipe_tags?.map(rt => rt.tags.id) || [],
      });
    }
  }, [existingRecipe, isEditing, form]);

  const onSubmit = async (data: RecipeFormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Create or update recipe
      const recipeData = {
        title: data.title,
        description: data.description || null,
        recipe_type: data.recipe_type,
        difficulty: data.difficulty || null,
        price_level: data.price_level || null,
        prep_time: data.prep_time ? parseInt(data.prep_time) : null,
        cook_time: data.cook_time ? parseInt(data.cook_time) : null,
        servings: data.servings ? parseInt(data.servings) : null,
        origin_id: data.origin_id || null,
        image_url: data.image_url || null,
        source_url: data.source_url || null,
      };

      let recipeId: string;

      if (isEditing && id) {
        await updateRecipe.mutateAsync({ id, ...recipeData });
        recipeId = id;

        // Delete existing ingredients and steps
        await supabase.from('ingredients').delete().eq('recipe_id', id);
        await supabase.from('steps').delete().eq('recipe_id', id);
        await supabase.from('recipe_tags').delete().eq('recipe_id', id);
      } else {
        const result = await createRecipe.mutateAsync(recipeData);
        recipeId = result.id;

        // Add recipe to pending lists (from create mode)
        const pendingListIds = listManagerRef.current?.getPendingListIds() || [];
        if (pendingListIds.length > 0) {
          await supabase.from('recipe_list_items').insert(
            pendingListIds.map(listId => ({
              list_id: listId,
              recipe_id: recipeId,
            }))
          );
        }
      }

      // Insert ingredients
      const validIngredients = data.ingredients.filter(ing => ing.name.trim());
      if (validIngredients.length > 0) {
        await supabase.from('ingredients').insert(
          validIngredients.map((ing, idx) => ({
            recipe_id: recipeId,
            name: ing.name,
            quantity: ing.quantity ? parseFloat(ing.quantity) : null,
            unit_id: ing.unit_id || null,
            product_id: ing.product_id || null,
            position: idx,
          }))
        );
      }

      // Calculate and update recipe diet based on ingredients
      if (aisles && validIngredients.length > 0) {
        // Build ingredient data with product info for diet calculation
        const ingredientsWithProducts = validIngredients.map(ing => {
          const product = products?.find(p => p.id === ing.product_id);
          return {
            name: ing.name,
            product_id: ing.product_id,
            shopping_products: product ? {
              name: product.name,
              aisle_id: product.aisle_id,
            } : null,
          };
        });

        const calculatedDiet = calculateRecipeDiet(ingredientsWithProducts, aisles);
        
        await supabase
          .from('recipes')
          .update({ diet: calculatedDiet })
          .eq('id', recipeId);
      }

      // Insert steps
      const validSteps = data.steps.filter(step => step.content.trim());
      if (validSteps.length > 0) {
        await supabase.from('steps').insert(
          validSteps.map((step, idx) => ({
            recipe_id: recipeId,
            content: step.content,
            position: idx,
          }))
        );
      }

      // Insert tags
      if (data.tag_ids && data.tag_ids.length > 0) {
        await supabase.from('recipe_tags').insert(
          data.tag_ids.map(tagId => ({
            recipe_id: recipeId,
            tag_id: tagId,
          }))
        );
      }

      toast({
        title: isEditing ? 'Recette modifiée' : 'Recette créée',
        description: `"${data.title}" a été ${isEditing ? 'modifiée' : 'créée'} avec succès.`,
      });

      // Clear unsaved changes before navigating
      setHasUnsavedChanges(false);
      navigate(`/recipes/${recipeId}`, { replace: true });
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la sauvegarde.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing && loadingRecipe) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-display font-bold">
          {isEditing ? 'Modifier la recette' : 'Nouvelle recette'}
        </h1>
      </div>

      {/* Import from URL - only for new recipes */}
      {!isEditing && (
        <RecipeImporter
          onImport={(recipe, sourceUrl) => {
            // Helper function to match unit text to unit_id
            const findUnitId = (unitText: string | null): string => {
              if (!unitText || !units) return '';
              const normalizedUnit = unitText.toLowerCase().trim();
              
              // Try to match by abbreviation first, then by name
              const match = units.find(u => 
                u.abbreviation?.toLowerCase() === normalizedUnit ||
                u.name?.toLowerCase() === normalizedUnit ||
                // Handle common variations
                u.abbreviation?.toLowerCase() === normalizedUnit.replace('.', '') ||
                normalizedUnit.includes(u.abbreviation?.toLowerCase() || '')
              );
              
              return match?.id || '';
            };

            // Populate form with imported data
            form.setValue('title', recipe.title);
            form.setValue('description', recipe.description || '');
            form.setValue('recipe_type', recipe.recipe_type);
            form.setValue('difficulty', recipe.difficulty);
            form.setValue('prep_time', recipe.prep_time?.toString() || '');
            form.setValue('cook_time', recipe.cook_time?.toString() || '');
            form.setValue('servings', recipe.servings?.toString() || '4');
            
            // Set source URL if imported from a link
            if (sourceUrl) {
              form.setValue('source_url', sourceUrl);
            }
            
            // Set ingredients with unit matching and product matching
            if (recipe.ingredients?.length > 0) {
              form.setValue('ingredients', recipe.ingredients.map((ing, idx) => {
                // Try to find exact match product
                const matchedProduct = products?.find(
                  p => p.name.toLowerCase().trim() === ing.name.toLowerCase().trim()
                );
                return {
                  name: matchedProduct?.name || ing.name,
                  quantity: ing.quantity?.toString() || '',
                  unit_id: matchedProduct?.unit_id || findUnitId(ing.unit),
                  product_id: matchedProduct?.id || null,
                  position: idx,
                };
              }));
            }
            
            // Set steps
            if (recipe.steps?.length > 0) {
              form.setValue('steps', recipe.steps.map((step, idx) => ({
                content: step.content,
                position: idx,
              })));
            }
          }}
        />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Tarte aux pommes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Recipe List Manager - show always */}
              <RecipeListManager 
                ref={listManagerRef}
                recipeId={isEditing ? id : undefined} 
              />

              {/* Tags Manager */}
              <RecipeTagManager
                selectedTagIds={form.watch('tag_ids') || []}
                onTagsChange={(tagIds) => form.setValue('tag_ids', tagIds)}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Une courte description de votre recette..." 
                        className="resize-none"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="recipe_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="entree">🥗 Entrée</SelectItem>
                          <SelectItem value="plat">🍽️ Plat</SelectItem>
                          <SelectItem value="dessert">🍰 Dessert</SelectItem>
                          <SelectItem value="boisson">🥤 Boisson</SelectItem>
                          <SelectItem value="apero">🍸 Apéro</SelectItem>
                          <SelectItem value="soupe">🥣 Soupe</SelectItem>
                          <SelectItem value="petit_dejeuner">🥐 Petit-déjeuner</SelectItem>
                          <SelectItem value="gouter">🍪 Goûter</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulté</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="facile">😊 Facile</SelectItem>
                          <SelectItem value="moyen">😐 Moyen</SelectItem>
                          <SelectItem value="difficile">😓 Difficile</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">€ Économique</SelectItem>
                          <SelectItem value="2">€€ Moyen</SelectItem>
                          <SelectItem value="3">€€€ Élevé</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="prep_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Préparation (min)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cook_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuisson (min)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="45" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="servings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portions</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="4" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="origin_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origine</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {origins?.map((origin) => (
                            <SelectItem key={origin.id} value={origin.id}>
                              {origin.emoji} {origin.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo de la recette</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lien source</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://www.exemple.com/recette" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 sm:py-4">
              <CardTitle className="text-base sm:text-lg">Ingrédients</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendIngredient({ name: '', quantity: '', unit_id: '', product_id: null, position: ingredientFields.length })}
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Ajouter</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleIngredientDragEnd}>
                <SortableContext items={ingredientFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  {ingredientFields.map((field, index) => (
                    <SortableIngredientItem
                      key={field.id}
                      id={field.id}
                      index={index}
                      form={form}
                      units={units}
                      onRemove={() => removeIngredient(index)}
                      disabled={ingredientFields.length === 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>

          {/* Steps */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Étapes</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendStep({ content: '', position: stepFields.length })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStepDragEnd}>
                <SortableContext items={stepFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  {stepFields.map((field, index) => (
                    <SortableStepItem
                      key={field.id}
                      id={field.id}
                      index={index}
                      form={form}
                      onRemove={() => removeStep(index)}
                      disabled={stepFields.length === 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>


          {/* Submit */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Enregistrer' : 'Créer la recette'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>

      {/* Navigation blocker dialog */}
      <NavigationBlockerDialog
        isOpen={isBlocked}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </>
  );
};

export default RecipeForm;
