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
      booking_requests: {
        Row: {
          check_in: string
          check_out: string
          created_at: string | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          guests_count: number | null
          id: string
          listing_id: string
          message: string | null
          notified_at: string | null
          org_id: string
          property_id: string
          status: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          guests_count?: number | null
          id?: string
          listing_id: string
          message?: string | null
          notified_at?: string | null
          org_id: string
          property_id: string
          status?: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          guests_count?: number | null
          id?: string
          listing_id?: string
          message?: string | null
          notified_at?: string | null
          org_id?: string
          property_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string
          building_type: string
          city: string
          created_at: string
          id: string
          name: string
          notes: string | null
          org_id: string
          postal_code: string
          total_units: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          building_type?: string
          city?: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          org_id: string
          postal_code?: string
          total_units?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          building_type?: string
          city?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          postal_code?: string
          total_units?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          applied_at: string
          created_at: string
          email: string | null
          guarantor_info: string | null
          id: string
          monthly_income: number | null
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          profession: string | null
          property_id: string | null
          score: number | null
          status: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          created_at?: string
          email?: string | null
          guarantor_info?: string | null
          id?: string
          monthly_income?: number | null
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          profession?: string | null
          property_id?: string | null
          score?: number | null
          status?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          created_at?: string
          email?: string | null
          guarantor_info?: string | null
          id?: string
          monthly_income?: number | null
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          profession?: string | null
          property_id?: string | null
          score?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          org_id: string
          period: string | null
          request_type: string
          resolved_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          org_id: string
          period?: string | null
          request_type?: string
          resolved_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          org_id?: string
          period?: string | null
          request_type?: string
          resolved_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          country: string
          created_at: string
          data_json: Json
          doc_hash: string | null
          doc_type: string
          id: string
          lease_id: string | null
          org_id: string
          pdf_url: string | null
          qr_verification_url: string | null
          sent_to_emails: Json | null
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
          doc_hash?: string | null
          doc_type: string
          id?: string
          lease_id?: string | null
          org_id: string
          pdf_url?: string | null
          qr_verification_url?: string | null
          sent_to_emails?: Json | null
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
          doc_hash?: string | null
          doc_type?: string
          id?: string
          lease_id?: string | null
          org_id?: string
          pdf_url?: string | null
          qr_verification_url?: string | null
          sent_to_emails?: Json | null
          status?: string
          template_id?: string | null
          template_version?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      dunning_letters: {
        Row: {
          amount_due: number
          created_at: string
          id: string
          level: number
          month: string
          org_id: string
          pdf_url: string | null
          property_id: string | null
          sent_at: string | null
          tenant_id: string
        }
        Insert: {
          amount_due?: number
          created_at?: string
          id?: string
          level?: number
          month: string
          org_id: string
          pdf_url?: string | null
          property_id?: string | null
          sent_at?: string | null
          tenant_id: string
        }
        Update: {
          amount_due?: number
          created_at?: string
          id?: string
          level?: number
          month?: string
          org_id?: string
          pdf_url?: string | null
          property_id?: string | null
          sent_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dunning_letters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_letters_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_letters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          invoice_url: string | null
          label: string
          notes: string | null
          org_id: string
          property_id: string | null
          supplier: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          invoice_url?: string | null
          label: string
          notes?: string | null
          org_id: string
          property_id?: string | null
          supplier?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          invoice_url?: string | null
          label?: string
          notes?: string | null
          org_id?: string
          property_id?: string | null
          supplier?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      furniture_items: {
        Row: {
          condition: string
          created_at: string
          id: string
          item_name: string
          notes: string | null
          org_id: string
          property_id: string
          quantity: number
          room_name: string
        }
        Insert: {
          condition?: string
          created_at?: string
          id?: string
          item_name: string
          notes?: string | null
          org_id: string
          property_id: string
          quantity?: number
          room_name?: string
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          item_name?: string
          notes?: string | null
          org_id?: string
          property_id?: string
          quantity?: number
          room_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "furniture_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "furniture_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      interventions: {
        Row: {
          actual_cost: number | null
          category: string
          completed_date: string | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          notes: string | null
          org_id: string
          priority: string
          property_id: string | null
          provider_name: string | null
          provider_phone: string | null
          scheduled_date: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_cost?: number | null
          category?: string
          completed_date?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          org_id: string
          priority?: string
          property_id?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_cost?: number | null
          category?: string
          completed_date?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          priority?: string
          property_id?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      landlord_profiles: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          display_name: string
          id: string
          org_id: string
          properties_count: number | null
          rating: number | null
          slug: string
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          org_id: string
          properties_count?: number | null
          rating?: number | null
          slug: string
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          org_id?: string
          properties_count?: number | null
          rating?: number | null
          slug?: string
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "landlord_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          annexes_json: Json | null
          charges_amount: number
          clauses_json: Json | null
          country: string
          created_at: string
          deposit_amount: number
          duration_months: number | null
          end_date: string | null
          id: string
          lease_type: string
          notice_period_months: number | null
          org_id: string
          owner_profile_id: string | null
          payment_day: number | null
          pdf_url: string | null
          property_id: string
          rent_amount: number
          signed_at: string | null
          signed_by_owner: boolean | null
          signed_by_tenant: boolean | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annexes_json?: Json | null
          charges_amount?: number
          clauses_json?: Json | null
          country?: string
          created_at?: string
          deposit_amount?: number
          duration_months?: number | null
          end_date?: string | null
          id?: string
          lease_type?: string
          notice_period_months?: number | null
          org_id: string
          owner_profile_id?: string | null
          payment_day?: number | null
          pdf_url?: string | null
          property_id: string
          rent_amount?: number
          signed_at?: string | null
          signed_by_owner?: boolean | null
          signed_by_tenant?: boolean | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annexes_json?: Json | null
          charges_amount?: number
          clauses_json?: Json | null
          country?: string
          created_at?: string
          deposit_amount?: number
          duration_months?: number | null
          end_date?: string | null
          id?: string
          lease_type?: string
          notice_period_months?: number | null
          org_id?: string
          owner_profile_id?: string | null
          payment_day?: number | null
          pdf_url?: string | null
          property_id?: string
          rent_amount?: number
          signed_at?: string | null
          signed_by_owner?: boolean | null
          signed_by_tenant?: boolean | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "owner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          org_id: string
          read: boolean
          sender_id: string
          tenant_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          org_id: string
          read?: boolean
          sender_id: string
          tenant_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          org_id?: string
          read?: boolean
          sender_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          org_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          org_id?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          org_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
      org_secrets: {
        Row: {
          created_at: string
          gocardless_access_token: string | null
          gocardless_environment: string | null
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gocardless_access_token?: string | null
          gocardless_environment?: string | null
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gocardless_access_token?: string | null
          gocardless_environment?: string | null
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_secrets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          address: string | null
          city: string | null
          country: string
          created_at: string
          default_payment_provider: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string
          payment_providers: Json
          paypal_email: string | null
          phone: string | null
          postal_code: string | null
          siret: string | null
          stamp_url: string | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          default_payment_provider?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id: string
          payment_providers?: Json
          paypal_email?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          stamp_url?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          default_payment_provider?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          payment_providers?: Json
          paypal_email?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          stamp_url?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
        }
        Relationships: []
      }
      ota_connections: {
        Row: {
          access_token: string | null
          created_at: string
          external_user_id: string | null
          id: string
          last_sync_at: string | null
          linked_properties: Json | null
          org_id: string
          provider: string
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          external_user_id?: string | null
          id?: string
          last_sync_at?: string | null
          linked_properties?: Json | null
          org_id: string
          provider: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          external_user_id?: string | null
          id?: string
          last_sync_at?: string | null
          linked_properties?: Json | null
          org_id?: string
          provider?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ota_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_profiles: {
        Row: {
          address: string | null
          bank_bic: string | null
          bank_iban: string | null
          bank_name: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          org_id: string
          person_type: string
          phone: string | null
          postal_code: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          org_id: string
          person_type?: string
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          org_id?: string
          person_type?: string
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_notices: {
        Row: {
          charges_amount: number
          created_at: string
          due_date: string
          id: string
          month: string
          org_id: string
          pdf_url: string | null
          property_id: string | null
          rent_amount: number
          sent: boolean | null
          tenant_id: string
          total_amount: number
        }
        Insert: {
          charges_amount?: number
          created_at?: string
          due_date: string
          id?: string
          month: string
          org_id: string
          pdf_url?: string | null
          property_id?: string | null
          rent_amount?: number
          sent?: boolean | null
          tenant_id: string
          total_amount?: number
        }
        Update: {
          charges_amount?: number
          created_at?: string
          due_date?: string
          id?: string
          month?: string
          org_id?: string
          pdf_url?: string | null
          property_id?: string | null
          rent_amount?: number
          sent?: boolean | null
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_notices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_notices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_notices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          currency: string | null
          email: string
          id: string
          locale: string | null
          name: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          referral_code: string | null
          signature_url: string | null
          updated_at: string
          user_type: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          currency?: string | null
          email: string
          id: string
          locale?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          referral_code?: string | null
          signature_url?: string | null
          updated_at?: string
          user_type?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string
          id?: string
          locale?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          referral_code?: string | null
          signature_url?: string | null
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          building_id: string | null
          building_name: string | null
          city: string
          country: string
          created_at: string
          deposit_amount: number | null
          floor: number | null
          furnished: boolean | null
          heating: string | null
          id: string
          label: string
          lot_number: string | null
          monthly_charges: number | null
          monthly_rent: number | null
          notes: string | null
          org_id: string
          photo_urls: Json | null
          postal_code: string
          property_type: string
          rental_mode: string | null
          rooms: number | null
          surface: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          building_id?: string | null
          building_name?: string | null
          city?: string
          country?: string
          created_at?: string
          deposit_amount?: number | null
          floor?: number | null
          furnished?: boolean | null
          heating?: string | null
          id?: string
          label: string
          lot_number?: string | null
          monthly_charges?: number | null
          monthly_rent?: number | null
          notes?: string | null
          org_id: string
          photo_urls?: Json | null
          postal_code?: string
          property_type?: string
          rental_mode?: string | null
          rooms?: number | null
          surface?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          building_id?: string | null
          building_name?: string | null
          city?: string
          country?: string
          created_at?: string
          deposit_amount?: number | null
          floor?: number | null
          furnished?: boolean | null
          heating?: string | null
          id?: string
          label?: string
          lot_number?: string | null
          monthly_charges?: number | null
          monthly_rent?: number | null
          notes?: string | null
          org_id?: string
          photo_urls?: Json | null
          postal_code?: string
          property_type?: string
          rental_mode?: string | null
          rooms?: number | null
          surface?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      public_listings: {
        Row: {
          active: boolean | null
          amenities: Json | null
          created_at: string | null
          description: string | null
          id: string
          max_guests: number | null
          min_nights: number | null
          org_id: string
          price_per_night: number | null
          property_id: string
          slug: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          amenities?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_guests?: number | null
          min_nights?: number | null
          org_id: string
          price_per_night?: number | null
          property_id: string
          slug: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          amenities?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_guests?: number | null
          min_nights?: number | null
          org_id?: string
          price_per_night?: number | null
          property_id?: string
          slug?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string | null
          id: string
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_org_id: string | null
          referrer_user_id: string
          reward_applied: boolean | null
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_org_id?: string | null
          referrer_user_id: string
          reward_applied?: boolean | null
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_org_id?: string | null
          referrer_user_id?: string
          reward_applied?: boolean | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_org_id_fkey"
            columns: ["referrer_org_id"]
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
          payment_method: string | null
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
          payment_method?: string | null
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
          payment_method?: string | null
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
      reservations: {
        Row: {
          amount: number
          check_in: string
          check_out: string
          cleaning_fee: number | null
          created_at: string
          currency: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          org_id: string
          ota_connection_id: string | null
          ota_listing_id: string | null
          ota_provider: string | null
          ota_reservation_id: string | null
          platform_fee: number | null
          property_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          check_in: string
          check_out: string
          cleaning_fee?: number | null
          created_at?: string
          currency?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          org_id: string
          ota_connection_id?: string | null
          ota_listing_id?: string | null
          ota_provider?: string | null
          ota_reservation_id?: string | null
          platform_fee?: number | null
          property_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          check_in?: string
          check_out?: string
          cleaning_fee?: number | null
          created_at?: string
          currency?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          ota_connection_id?: string | null
          ota_listing_id?: string | null
          ota_provider?: string | null
          ota_reservation_id?: string | null
          platform_fee?: number | null
          property_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_ota_connection_id_fkey"
            columns: ["ota_connection_id"]
            isOneToOne: false
            referencedRelation: "ota_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          landlord_reply: string | null
          org_id: string
          property_id: string | null
          rating: number
          reviewer_user_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          landlord_reply?: string | null
          org_id: string
          property_id?: string | null
          rating: number
          reviewer_user_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          landlord_reply?: string | null
          org_id?: string
          property_id?: string | null
          rating?: number
          reviewer_user_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_bookings: {
        Row: {
          check_in: string
          check_out: string
          cleaning_fee: number | null
          created_at: string
          deposit_amount: number | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          org_id: string
          property_id: string
          status: string
          total_price: number
          user_id: string
        }
        Insert: {
          check_in: string
          check_out: string
          cleaning_fee?: number | null
          created_at?: string
          deposit_amount?: number | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          org_id: string
          property_id: string
          status?: string
          total_price?: number
          user_id: string
        }
        Update: {
          check_in?: string
          check_out?: string
          cleaning_fee?: number | null
          created_at?: string
          deposit_amount?: number | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          property_id?: string
          status?: string
          total_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasonal_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          notify_participants: boolean
          org_id: string
          priority: string
          property_id: string | null
          recurrence: string
          status: string
          subject: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          notify_participants?: boolean
          org_id: string
          priority?: string
          property_id?: string | null
          recurrence?: string
          status?: string
          subject: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          notify_participants?: boolean
          org_id?: string
          priority?: string
          property_id?: string | null
          recurrence?: string
          status?: string
          subject?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          org_id: string
          status?: string
          tenant_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
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
          caf_apl_amount: number | null
          charges_amount: number | null
          co_tenants_json: Json | null
          created_at: string
          current_address: string | null
          deposit_amount: number | null
          email: string | null
          guarantor_name: string | null
          guarantor_phone: string | null
          id: string
          id_document_urls: Json | null
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
          caf_apl_amount?: number | null
          charges_amount?: number | null
          co_tenants_json?: Json | null
          created_at?: string
          current_address?: string | null
          deposit_amount?: number | null
          email?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          id_document_urls?: Json | null
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
          caf_apl_amount?: number | null
          charges_amount?: number | null
          co_tenants_json?: Json | null
          created_at?: string
          current_address?: string | null
          deposit_amount?: number | null
          email?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          id_document_urls?: Json | null
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
      accept_tenant_invitation: {
        Args: { _token: string; _user_id: string }
        Returns: Json
      }
      get_listing_property: { Args: { p_listing_id: string }; Returns: Json }
      get_ota_connections: {
        Args: { _org_id: string }
        Returns: {
          created_at: string
          external_user_id: string
          id: string
          last_sync_at: string
          linked_properties: Json
          org_id: string
          provider: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
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
      validate_tenant_invitation: { Args: { _token: string }; Returns: Json }
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
