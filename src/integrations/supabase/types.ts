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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cheese_lists: {
        Row: {
          cheese_id: string
          cheese_name: string | null
          created_at: string
          list_type: string
          position: number
        }
        Insert: {
          cheese_id: string
          cheese_name?: string | null
          created_at?: string
          list_type: string
          position?: number
        }
        Update: {
          cheese_id?: string
          cheese_name?: string | null
          created_at?: string
          list_type?: string
          position?: number
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          activated: boolean
          activated_at: string | null
          activation_key: string
          company: string | null
          created_at: string
          delivery_address: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          activated?: boolean
          activated_at?: string | null
          activation_key: string
          company?: string | null
          created_at?: string
          delivery_address?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          activated?: boolean
          activated_at?: string | null
          activation_key?: string
          company?: string | null
          created_at?: string
          delivery_address?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          cheese_id: string
          cheese_name: string
          created_at: string
          id: string
          line_total: number
          order_id: string
          quantity: number
          unit_label: string | null
          unit_price: number
        }
        Insert: {
          cheese_id: string
          cheese_name: string
          created_at?: string
          id?: string
          line_total?: number
          order_id: string
          quantity: number
          unit_label?: string | null
          unit_price?: number
        }
        Update: {
          cheese_id?: string
          cheese_name?: string
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          quantity?: number
          unit_label?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_company: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          customer_website: string | null
          id: string
          notes: string | null
          pickup_date: string | null
          status: string
          total_estimate: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          customer_website?: string | null
          id?: string
          notes?: string | null
          pickup_date?: string | null
          status?: string
          total_estimate?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          customer_website?: string | null
          id?: string
          notes?: string | null
          pickup_date?: string | null
          status?: string
          total_estimate?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          age: string | null
          category: string | null
          colissage: number | null
          conseils: string | null
          created_at: string
          department: string | null
          fabrication: string | null
          fabriquant: string | null
          id: string
          image_url: string | null
          list_type: Database["public"]["Enums"]["product_list"]
          matiere_grasse: string | null
          milk: string | null
          name: string
          nombre_poids_reel: number | null
          packaging_unit: string | null
          position: number
          price_label: string | null
          price_per_kg: number
          producer: string | null
          ref: number | null
          region: string | null
          saveur: string | null
          season: string | null
          stock: number | null
          type_desc: string | null
          unit: string | null
          updated_at: string
          ville: string | null
          weight: string | null
        }
        Insert: {
          age?: string | null
          category?: string | null
          colissage?: number | null
          conseils?: string | null
          created_at?: string
          department?: string | null
          fabrication?: string | null
          fabriquant?: string | null
          id?: string
          image_url?: string | null
          list_type: Database["public"]["Enums"]["product_list"]
          matiere_grasse?: string | null
          milk?: string | null
          name: string
          nombre_poids_reel?: number | null
          packaging_unit?: string | null
          position?: number
          price_label?: string | null
          price_per_kg?: number
          producer?: string | null
          ref?: number | null
          region?: string | null
          saveur?: string | null
          season?: string | null
          stock?: number | null
          type_desc?: string | null
          unit?: string | null
          updated_at?: string
          ville?: string | null
          weight?: string | null
        }
        Update: {
          age?: string | null
          category?: string | null
          colissage?: number | null
          conseils?: string | null
          created_at?: string
          department?: string | null
          fabrication?: string | null
          fabriquant?: string | null
          id?: string
          image_url?: string | null
          list_type?: Database["public"]["Enums"]["product_list"]
          matiere_grasse?: string | null
          milk?: string | null
          name?: string
          nombre_poids_reel?: number | null
          packaging_unit?: string | null
          position?: number
          price_label?: string | null
          price_per_kg?: number
          producer?: string | null
          ref?: number | null
          region?: string | null
          saveur?: string | null
          season?: string | null
          stock?: number | null
          type_desc?: string | null
          unit?: string | null
          updated_at?: string
          ville?: string | null
          weight?: string | null
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      product_list: "all" | "curated" | "promotions"
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
      product_list: ["all", "curated", "promotions"],
    },
  },
} as const
