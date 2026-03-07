export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aisles: {
        Row: {
          icon: string | null
          id: string
          name: string
          position: number
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          position?: number
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      cookiers: {
        Row: {
          cookier_id: string
          cookier_shares_recipes: boolean
          created_at: string
          id: string
          status: string
          user_id: string
          user_shares_recipes: boolean
        }
        Insert: {
          cookier_id: string
          cookier_shares_recipes?: boolean
          created_at?: string
          id?: string
          status?: string
          user_id: string
          user_shares_recipes?: boolean
        }
        Update: {
          cookier_id?: string
          cookier_shares_recipes?: boolean
          created_at?: string
          id?: string
          status?: string
          user_id?: string
          user_shares_recipes?: boolean
        }
        Relationships: []
      }
      essential_products: {
        Row: {
          created_at: string
          family_id: string | null
          id: string
          product_id: string
          quantity: number | null
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id?: string | null
          id?: string
          product_id: string
          quantity?: number | null
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string | null
          id?: string
          product_id?: string
          quantity?: number | null
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "essential_products_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essential_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopping_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essential_products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_invitations: {
        Row: {
          created_at: string
          family_id: string
          id: string
          invited_by: string
          invited_user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          invited_by: string
          invited_user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          family_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          family_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          family_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          id: string
          name: string
          position: number
          product_id: string | null
          quantity: number | null
          recipe_id: string
          unit_id: string | null
        }
        Insert: {
          id?: string
          name: string
          position?: number
          product_id?: string | null
          quantity?: number | null
          recipe_id: string
          unit_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          position?: number
          product_id?: string | null
          quantity?: number | null
          recipe_id?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopping_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      list_shares: {
        Row: {
          created_at: string
          id: string
          list_id: string
          permission: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          permission?: string
          shared_by: string
          shared_with: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          permission?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_shares_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "recipe_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          custom_text: string | null
          date: string
          family_id: string | null
          id: string
          meal_type: string
          recipe_id: string | null
          servings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_text?: string | null
          date: string
          family_id?: string | null
          id?: string
          meal_type: string
          recipe_id?: string | null
          servings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_text?: string | null
          date?: string
          family_id?: string | null
          id?: string
          meal_type?: string
          recipe_id?: string | null
          servings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      origins: {
        Row: {
          emoji: string | null
          id: string
          name: string
        }
        Insert: {
          emoji?: string | null
          id?: string
          name: string
        }
        Update: {
          emoji?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_global_requests: {
        Row: {
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          product_id: string
          requested_by: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          product_id: string
          requested_by: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          product_id?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_global_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "shopping_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_seasons: {
        Row: {
          created_at: string
          id: string
          month: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_seasons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopping_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          diet: Database["public"]["Enums"]["diet_type"] | null
          id: string
          show_evening_meals: boolean
          show_morning_meals: boolean
          show_noon_meals: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          diet?: Database["public"]["Enums"]["diet_type"] | null
          id: string
          show_evening_meals?: boolean
          show_morning_meals?: boolean
          show_noon_meals?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          diet?: Database["public"]["Enums"]["diet_type"] | null
          id?: string
          show_evening_meals?: boolean
          show_morning_meals?: boolean
          show_noon_meals?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      recipe_favorites: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_favorites_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_list_items: {
        Row: {
          added_at: string
          list_id: string
          recipe_id: string
        }
        Insert: {
          added_at?: string
          list_id: string
          recipe_id: string
        }
        Update: {
          added_at?: string
          list_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "recipe_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_list_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_lists: {
        Row: {
          created_at: string
          family_id: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_lists_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_shares: {
        Row: {
          created_at: string
          id: string
          permission: string
          recipe_id: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission?: string
          recipe_id: string
          shared_by: string
          shared_with: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          recipe_id?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_shares_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_tags: {
        Row: {
          recipe_id: string
          tag_id: string
        }
        Insert: {
          recipe_id: string
          tag_id: string
        }
        Update: {
          recipe_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_tags_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cook_time: number | null
          copied_from_id: string | null
          created_at: string
          description: string | null
          diet: Database["public"]["Enums"]["diet_type"] | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          family_id: string | null
          id: string
          image_url: string | null
          origin_id: string | null
          owner_id: string
          prep_time: number | null
          price_level: Database["public"]["Enums"]["price_level"] | null
          recipe_type: Database["public"]["Enums"]["recipe_type"]
          servings: number | null
          source_url: string | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          cook_time?: number | null
          copied_from_id?: string | null
          created_at?: string
          description?: string | null
          diet?: Database["public"]["Enums"]["diet_type"] | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          family_id?: string | null
          id?: string
          image_url?: string | null
          origin_id?: string | null
          owner_id: string
          prep_time?: number | null
          price_level?: Database["public"]["Enums"]["price_level"] | null
          recipe_type?: Database["public"]["Enums"]["recipe_type"]
          servings?: number | null
          source_url?: string | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          cook_time?: number | null
          copied_from_id?: string | null
          created_at?: string
          description?: string | null
          diet?: Database["public"]["Enums"]["diet_type"] | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          family_id?: string | null
          id?: string
          image_url?: string | null
          origin_id?: string | null
          owner_id?: string
          prep_time?: number | null
          price_level?: Database["public"]["Enums"]["price_level"] | null
          recipe_type?: Database["public"]["Enums"]["recipe_type"]
          servings?: number | null
          source_url?: string | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_copied_from_id_fkey"
            columns: ["copied_from_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          aisle_id: string | null
          checked: boolean
          created_at: string
          family_id: string | null
          id: string
          name: string
          product_id: string | null
          quantity: number | null
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aisle_id?: string | null
          checked?: boolean
          created_at?: string
          family_id?: string | null
          id?: string
          name: string
          product_id?: string | null
          quantity?: number | null
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aisle_id?: string | null
          checked?: boolean
          created_at?: string
          family_id?: string | null
          id?: string
          name?: string
          product_id?: string | null
          quantity?: number | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_aisle_id_fkey"
            columns: ["aisle_id"]
            isOneToOne: false
            referencedRelation: "aisles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopping_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_products: {
        Row: {
          aisle_id: string | null
          created_at: string
          family_id: string | null
          id: string
          name: string
          unit_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aisle_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          name: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aisle_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          name?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_products_aisle_id_fkey"
            columns: ["aisle_id"]
            isOneToOne: false
            referencedRelation: "aisles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_products_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      steps: {
        Row: {
          content: string
          id: string
          position: number
          recipe_id: string
        }
        Insert: {
          content: string
          id?: string
          position: number
          recipe_id: string
        }
        Update: {
          content?: string
          id?: string
          position?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_by: string | null
          family_id: string | null
          id: string
          name: string
        }
        Insert: {
          created_by?: string | null
          family_id?: string | null
          id?: string
          name: string
        }
        Update: {
          created_by?: string | null
          family_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      typical_week_meals: {
        Row: {
          created_at: string
          day_of_week: number
          family_id: string | null
          id: string
          meal_type: string
          recipe_id: string
          servings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          family_id?: string | null
          id?: string
          meal_type: string
          recipe_id: string
          servings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          family_id?: string | null
          id?: string
          meal_type?: string
          recipe_id?: string
          servings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typical_week_meals_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typical_week_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          abbreviation: string | null
          id: string
          name: string
        }
        Insert: {
          abbreviation?: string | null
          id?: string
          name: string
        }
        Update: {
          abbreviation?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_aisle_orders: {
        Row: {
          aisle_id: string
          created_at: string
          family_id: string | null
          id: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aisle_id: string
          created_at?: string
          family_id?: string | null
          id?: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          aisle_id?: string
          created_at?: string
          family_id?: string | null
          id?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_aisle_orders_aisle_id_fkey"
            columns: ["aisle_id"]
            isOneToOne: false
            referencedRelation: "aisles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_aisle_orders_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_family_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "user"
      diet_type: "none" | "pescetarian" | "vegetarian" | "vegan"
      difficulty_level: "facile" | "moyen" | "difficile"
      price_level: "1" | "2" | "3"
      recipe_type:
        | "apero"
        | "entree"
        | "soupe"
        | "plat"
        | "dessert"
        | "boisson"
        | "petit_dejeuner"
        | "gouter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      diet_type: ["none", "pescetarian", "vegetarian", "vegan"],
      difficulty_level: ["facile", "moyen", "difficile"],
      price_level: ["1", "2", "3"],
      recipe_type: [
        "apero",
        "entree",
        "soupe",
        "plat",
        "dessert",
        "boisson",
        "petit_dejeuner",
        "gouter",
      ],
    },
  },
} as const
