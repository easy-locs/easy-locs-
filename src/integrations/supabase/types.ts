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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata_json: Json | null
          org_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          org_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          org_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          country: string
          created_at: string
          data_json: Json
          doc_type: string
          id: string
          org_id: string
          pdf_url: string | null
          status: string
          template_id: string | null
          template_version: string | null
          title: string
          user_id: string
        }
        Insert: {
          country?: string
          created_at?: string
          data_json?: Json
          doc_type: string
          id?: string
          org_id: string
          pdf_url?: string | null
          status?: string
          template_id?: string | null
          template_version?: string | null
          title: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          data_json?: Json
          doc_type?: string
          id?: string
          org_id?: string
          pdf_url?: string | null
          status?: string
          template_id?: string | null
          template_version?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          condition: string
          created_at: string
          element_name: string
          id: string
          notes: string | null
          photo_urls: Json | null
          room_id: string
          sort_order: number | null
        }
        Insert: {
          condition?: string
          created_at?: string
          element_name: string
          id?: string
          notes?: string | null
          photo_urls?: Json | null
          room_id: string
          sort_order?: number | null
        }
        Update: {
          condition?: string
          created_at?: string
          element_name?: string
          id?: string
          notes?: string | null
          photo_urls?: Json | null
          room_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "inventory_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reports: {
        Row: {
          created_at: string
          general_notes: string | null
          id: string
          keys_count: number | null
          keys_details: string | null
          meter_electricity: string | null
          meter_gas: string | null
          meter_water: string | null
          org_id: string
          property_id: string
          report_date: string
          report_type: string
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          general_notes?: string | null
          id?: string
          keys_count?: number | null
          keys_details?: string | null
          meter_electricity?: string | null
          meter_gas?: string | null
          meter_water?: string | null
          org_id: string
          property_id: string
          report_date?: string
          report_type?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          general_notes?: string | null
          id?: string
          keys_count?: number | null
          keys_details?: string | null
          meter_electricity?: string | null
          meter_gas?: string | null
          meter_water?: string | null
          org_id?: string
          property_id?: string
          report_date?: string
          report_type?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_rooms: {
        Row: {
          created_at: string
          id: string
          report_id: string
          room_name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          report_id: string
          room_name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          report_id?: string
          room_name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_rooms_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "inventory_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
          owner_user_id: string
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          name?: string
          owner_user_id: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          email: string
          id: string
          locale: string | null
          name: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          id: string
          locale?: string | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          locale?: string | null
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          city: string
          created_at: string
          deposit_amount: number | null
          floor: number | null
          furnished: boolean | null
          heating: string | null
          id: string
          label: string
          monthly_charges: number | null
          monthly_rent: number | null
          notes: string | null
          org_id: string
          postal_code: string
          property_type: string
          rooms: number | null
          surface: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          city?: string
          created_at?: string
          deposit_amount?: number | null
          floor?: number | null
          furnished?: boolean | null
          heating?: string | null
          id?: string
          label: string
          monthly_charges?: number | null
          monthly_rent?: number | null
          notes?: string | null
          org_id: string
          postal_code?: string
          property_type?: string
          rooms?: number | null
          surface?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          deposit_amount?: number | null
          floor?: number | null
          furnished?: boolean | null
          heating?: string | null
          id?: string
          label?: string
          monthly_charges?: number | null
          monthly_rent?: number | null
          notes?: string | null
          org_id?: string
          postal_code?: string
          property_type?: string
          rooms?: number | null
          surface?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          next_run_at: string | null
          org_id: string
          schedule_json: Json | null
          type: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          next_run_at?: string | null
          org_id: string
          schedule_json?: Json | null
          type: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          next_run_at?: string | null
          org_id?: string
          schedule_json?: Json | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_calls: {
        Row: {
          charges_amount: number
          created_at: string
          id: string
          month: string
          org_id: string
          paid: boolean | null
          paid_date: string | null
          property_id: string | null
          receipt_pdf_url: string | null
          receipt_validated: boolean | null
          rent_amount: number
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          charges_amount?: number
          created_at?: string
          id?: string
          month: string
          org_id: string
          paid?: boolean | null
          paid_date?: string | null
          property_id?: string | null
          receipt_pdf_url?: string | null
          receipt_validated?: boolean | null
          rent_amount?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          charges_amount?: number
          created_at?: string
          id?: string
          month?: string
          org_id?: string
          paid?: boolean | null
          paid_date?: string | null
          property_id?: string | null
          receipt_pdf_url?: string | null
          receipt_validated?: boolean | null
          rent_amount?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_calls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_calls_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_revisions: {
        Row: {
          applied: boolean | null
          created_at: string
          id: string
          irl_index_value: number | null
          irl_reference_quarter: string | null
          method: string | null
          new_rent: number
          org_id: string
          previous_rent: number
          property_id: string | null
          revision_date: string
          tenant_id: string
        }
        Insert: {
          applied?: boolean | null
          created_at?: string
          id?: string
          irl_index_value?: number | null
          irl_reference_quarter?: string | null
          method?: string | null
          new_rent: number
          org_id: string
          previous_rent: number
          property_id?: string | null
          revision_date: string
          tenant_id: string
        }
        Update: {
          applied?: boolean | null
          created_at?: string
          id?: string
          irl_index_value?: number | null
          irl_reference_quarter?: string | null
          method?: string | null
          new_rent?: number
          org_id?: string
          previous_rent?: number
          property_id?: string | null
          revision_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_revisions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_revisions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_revisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          org_id: string
          target_id: string
          target_type: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          org_id: string
          target_id: string
          target_type: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          org_id?: string
          target_id?: string
          target_type?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_url: string
          filename: string
          id: string
          label: string
          org_id: string
          status: string
          tenant_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_url: string
          filename: string
          id?: string
          label: string
          org_id: string
          status?: string
          tenant_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_url?: string
          filename?: string
          id?: string
          label?: string
          org_id?: string
          status?: string
          tenant_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          birth_date: string | null
          birth_place: string | null
          charges_amount: number | null
          created_at: string
          deposit_amount: number | null
          email: string | null
          guarantor_name: string | null
          guarantor_phone: string | null
          id: string
          lease_end: string | null
          lease_start: string | null
          lease_type: string | null
          name: string
          nationality: string | null
          notes: string | null
          org_id: string
          phone: string | null
          profession: string | null
          property_id: string | null
          rent_amount: number | null
          tenant_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          birth_place?: string | null
          charges_amount?: number | null
          created_at?: string
          deposit_amount?: number | null
          email?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          lease_end?: string | null
          lease_start?: string | null
          lease_type?: string | null
          name: string
          nationality?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          profession?: string | null
          property_id?: string | null
          rent_amount?: number | null
          tenant_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          birth_place?: string | null
          charges_amount?: number | null
          created_at?: string
          deposit_amount?: number | null
          email?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          lease_end?: string | null
          lease_start?: string | null
          lease_type?: string | null
          name?: string
          nationality?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          profession?: string | null
          property_id?: string | null
          rent_amount?: number | null
          tenant_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_files: {
        Row: {
          created_at: string
          file_url: string
          filename: string
          id: string
          org_id: string
          size: number | null
          tags_json: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          filename: string
          id?: string
          org_id: string
          size?: number | null
          tags_json?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          filename?: string
          id?: string
          org_id?: string
          size?: number | null
          tags_json?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member"
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
      app_role: ["owner", "admin", "member"],
    },
  },
} as const
