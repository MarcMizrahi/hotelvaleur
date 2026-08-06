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
      analytics_event: {
        Row: {
          created_at: string
          id: string
          name: string
          path: string | null
          properties: Json | null
          referrer: string | null
          session_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          path?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          path?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string
          error_message: string | null
          estimation_id: string | null
          id: string
          provider_id: string | null
          status: string
          template: string
          to_email: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          estimation_id?: string | null
          id?: string
          provider_id?: string | null
          status: string
          template: string
          to_email: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          estimation_id?: string | null
          id?: string
          provider_id?: string | null
          status?: string
          template?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_estimation_id_fkey"
            columns: ["estimation_id"]
            isOneToOne: false
            referencedRelation: "estimation"
            referencedColumns: ["id"]
          },
        ]
      }
      estimation: {
        Row: {
          annual_revenue_cents: number | null
          calculation_detail: Json | null
          city: string | null
          consent_contact: boolean
          consent_marketing: boolean
          created_at: string
          department_code: string
          ebitda_cents: number | null
          email: string
          first_name: string | null
          has_licence_4: boolean
          has_restaurant: boolean
          hotel_name: string | null
          id: string
          internal_notes: string | null
          is_independent: boolean
          landing_page: string | null
          last_name: string | null
          method_used: string
          occupancy_rate: number | null
          phone: string | null
          referrer: string | null
          region_slug: string
          report_sent_at: string | null
          room_count: number
          sale_intent: string
          star_rating: number
          status: string
          transaction_type: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          value_high_cents: number
          value_low_cents: number
          works_needed: string | null
        }
        Insert: {
          annual_revenue_cents?: number | null
          calculation_detail?: Json | null
          city?: string | null
          consent_contact?: boolean
          consent_marketing?: boolean
          created_at?: string
          department_code: string
          ebitda_cents?: number | null
          email: string
          first_name?: string | null
          has_licence_4?: boolean
          has_restaurant?: boolean
          hotel_name?: string | null
          id?: string
          internal_notes?: string | null
          is_independent?: boolean
          landing_page?: string | null
          last_name?: string | null
          method_used: string
          occupancy_rate?: number | null
          phone?: string | null
          referrer?: string | null
          region_slug: string
          report_sent_at?: string | null
          room_count: number
          sale_intent: string
          star_rating: number
          status?: string
          transaction_type: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value_high_cents: number
          value_low_cents: number
          works_needed?: string | null
        }
        Update: {
          annual_revenue_cents?: number | null
          calculation_detail?: Json | null
          city?: string | null
          consent_contact?: boolean
          consent_marketing?: boolean
          created_at?: string
          department_code?: string
          ebitda_cents?: number | null
          email?: string
          first_name?: string | null
          has_licence_4?: boolean
          has_restaurant?: boolean
          hotel_name?: string | null
          id?: string
          internal_notes?: string | null
          is_independent?: boolean
          landing_page?: string | null
          last_name?: string | null
          method_used?: string
          occupancy_rate?: number | null
          phone?: string | null
          referrer?: string | null
          region_slug?: string
          report_sent_at?: string | null
          room_count?: number
          sale_intent?: string
          star_rating?: number
          status?: string
          transaction_type?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value_high_cents?: number
          value_low_cents?: number
          works_needed?: string | null
        }
        Relationships: []
      }
      market_transaction: {
        Row: {
          buyer: string | null
          city: string | null
          confidence: number
          created_at: string
          dedup_key: string | null
          department_code: string | null
          excerpt: string | null
          hotel_name: string | null
          id: string
          price_cents: number | null
          price_per_room_cents: number | null
          published_at: string | null
          region_slug: string | null
          room_count: number | null
          seller: string | null
          source_name: string
          source_url: string
          star_rating: number | null
          status: string
          title: string | null
          transaction_type: string | null
        }
        Insert: {
          buyer?: string | null
          city?: string | null
          confidence?: number
          created_at?: string
          dedup_key?: string | null
          department_code?: string | null
          excerpt?: string | null
          hotel_name?: string | null
          id?: string
          price_cents?: number | null
          price_per_room_cents?: number | null
          published_at?: string | null
          region_slug?: string | null
          room_count?: number | null
          seller?: string | null
          source_name: string
          source_url: string
          star_rating?: number | null
          status?: string
          title?: string | null
          transaction_type?: string | null
        }
        Update: {
          buyer?: string | null
          city?: string | null
          confidence?: number
          created_at?: string
          dedup_key?: string | null
          department_code?: string | null
          excerpt?: string | null
          hotel_name?: string | null
          id?: string
          price_cents?: number | null
          price_per_room_cents?: number | null
          published_at?: string | null
          region_slug?: string | null
          room_count?: number | null
          seller?: string | null
          source_name?: string
          source_url?: string
          star_rating?: number | null
          status?: string
          title?: string | null
          transaction_type?: string | null
        }
        Relationships: []
      }
      market_transaction_dedup_log: {
        Row: {
          city: string | null
          created_at: string
          dedup_key: string | null
          detail: string | null
          hotel_name: string | null
          id: string
          kept_transaction_id: string | null
          price_cents: number | null
          published_at: string | null
          reason: string
          room_count: number | null
          run_id: string | null
          source_name: string | null
          source_url: string | null
          title: string | null
          transaction_type: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          dedup_key?: string | null
          detail?: string | null
          hotel_name?: string | null
          id?: string
          kept_transaction_id?: string | null
          price_cents?: number | null
          published_at?: string | null
          reason: string
          room_count?: number | null
          run_id?: string | null
          source_name?: string | null
          source_url?: string | null
          title?: string | null
          transaction_type?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          dedup_key?: string | null
          detail?: string | null
          hotel_name?: string | null
          id?: string
          kept_transaction_id?: string | null
          price_cents?: number | null
          published_at?: string | null
          reason?: string
          room_count?: number | null
          run_id?: string | null
          source_name?: string | null
          source_url?: string | null
          title?: string | null
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_transaction_dedup_log_kept_transaction_id_fkey"
            columns: ["kept_transaction_id"]
            isOneToOne: false
            referencedRelation: "market_transaction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_transaction_dedup_log_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_run"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          created_at: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      scrape_run: {
        Row: {
          articles_found: number
          error_message: string | null
          finished_at: string | null
          id: string
          sources_count: number
          started_at: string
          status: string
          transactions_inserted: number
        }
        Insert: {
          articles_found?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          sources_count?: number
          started_at?: string
          status?: string
          transactions_inserted?: number
        }
        Update: {
          articles_found?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          sources_count?: number
          started_at?: string
          status?: string
          transactions_inserted?: number
        }
        Relationships: []
      }
      unsubscribe: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      valuation_coefficient: {
        Row: {
          ebitda_multiple_high: number
          ebitda_multiple_low: number
          id: string
          price_per_room_high_cents: number
          price_per_room_low_cents: number
          region_slug: string
          star_rating: number
          updated_at: string
        }
        Insert: {
          ebitda_multiple_high: number
          ebitda_multiple_low: number
          id?: string
          price_per_room_high_cents: number
          price_per_room_low_cents: number
          region_slug: string
          star_rating: number
          updated_at?: string
        }
        Update: {
          ebitda_multiple_high?: number
          ebitda_multiple_low?: number
          id?: string
          price_per_room_high_cents?: number
          price_per_room_low_cents?: number
          region_slug?: string
          star_rating?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
