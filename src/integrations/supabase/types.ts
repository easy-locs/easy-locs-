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
      activities: {
        Row: {
          active: boolean
          badges: string[] | null
          category: string
          city: string
          commission_percent: number | null
          country: string
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number | null
          id: string
          org_id: string
          photo_url: string | null
          price: number
          property_id: string | null
          provider_name: string | null
          provider_type: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          badges?: string[] | null
          category?: string
          city?: string
          commission_percent?: number | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          org_id: string
          photo_url?: string | null
          price?: number
          property_id?: string | null
          provider_name?: string | null
          provider_type?: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          badges?: string[] | null
          category?: string
          city?: string
          commission_percent?: number | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          org_id?: string
          photo_url?: string | null
          price?: number
          property_id?: string | null
          provider_name?: string | null
          provider_type?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          active: boolean
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          org_id: string
          scopes: string[]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          org_id: string
          scopes?: string[]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          org_id?: string
          scopes?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
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
      audit_reports: {
        Row: {
          created_at: string
          critical_issues: number
          global_score: number
          id: string
          issues_json: Json
          modules_json: Json
          org_id: string | null
          scan_type: string
          source: string
          total_issues: number
        }
        Insert: {
          created_at?: string
          critical_issues?: number
          global_score?: number
          id?: string
          issues_json?: Json
          modules_json?: Json
          org_id?: string | null
          scan_type?: string
          source?: string
          total_issues?: number
        }
        Update: {
          created_at?: string
          critical_issues?: number
          global_score?: number
          id?: string
          issues_json?: Json
          modules_json?: Json
          org_id?: string | null
          scan_type?: string
          source?: string
          total_issues?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          check_in: string
          check_out: string
          created_at: string | null
          customer_currency: string | null
          document_urls: Json | null
          exchange_rate: number | null
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
          customer_currency?: string | null
          document_urls?: Json | null
          exchange_rate?: number | null
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
          customer_currency?: string | null
          document_urls?: Json | null
          exchange_rate?: number | null
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
            foreignKeyName: "booking_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
      booking_tasks: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          org_id: string
          priority: string
          proof_photo_urls: Json | null
          property_id: string | null
          scheduled_at: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          org_id: string
          priority?: string
          proof_photo_urls?: Json | null
          property_id?: string | null
          scheduled_at?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          priority?: string
          proof_photo_urls?: Json | null
          property_id?: string | null
          scheduled_at?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tasks_property_id_fkey"
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
          {
            foreignKeyName: "buildings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          callee_org_id: string
          caller_id: string
          context_id: string | null
          context_label: string | null
          context_type: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          ended_by: string | null
          id: string
          is_video: boolean
          started_at: string | null
          status: string
          thread_id: string | null
        }
        Insert: {
          callee_org_id: string
          caller_id: string
          context_id?: string | null
          context_label?: string | null
          context_type?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          is_video?: boolean
          started_at?: string | null
          status?: string
          thread_id?: string | null
        }
        Update: {
          callee_org_id?: string
          caller_id?: string
          context_id?: string | null
          context_label?: string | null
          context_type?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          is_video?: boolean
          started_at?: string | null
          status?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_callee_org_id_fkey"
            columns: ["callee_org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_callee_org_id_fkey"
            columns: ["callee_org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
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
            foreignKeyName: "candidates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
      category_subscriptions: {
        Row: {
          category: string
          created_at: string
          id: string
          notify_email: boolean | null
          notify_push: boolean | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          notify_email?: boolean | null
          notify_push?: boolean | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          notify_email?: boolean | null
          notify_push?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      collaboration_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          role: string
          status: string
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
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_orders: {
        Row: {
          bank_transfer_reference: string | null
          booking_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          commission_amount: number | null
          commission_rate: number | null
          commission_type: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          customer_currency: string | null
          document_urls: Json | null
          end_time: string | null
          exchange_rate: number | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          org_id: string
          payment_link_url: string | null
          payment_method: string | null
          payment_proof_url: string | null
          payment_status: string
          property_id: string | null
          property_label: string | null
          quantity: number
          refunded_at: string | null
          scheduled_at: string | null
          service_date: string | null
          service_id: string
          service_time: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          bank_transfer_reference?: string | null
          booking_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          commission_type?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_currency?: string | null
          document_urls?: Json | null
          end_time?: string | null
          exchange_rate?: number | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          org_id: string
          payment_link_url?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          property_id?: string | null
          property_label?: string | null
          quantity?: number
          refunded_at?: string | null
          scheduled_at?: string | null
          service_date?: string | null
          service_id: string
          service_time?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          bank_transfer_reference?: string | null
          booking_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          commission_type?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_currency?: string | null
          document_urls?: Json | null
          end_time?: string | null
          exchange_rate?: number | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          payment_link_url?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          property_id?: string | null
          property_label?: string | null
          quantity?: number
          refunded_at?: string | null
          scheduled_at?: string | null
          service_date?: string | null
          service_id?: string
          service_time?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_orders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "concierge_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "concierge_services_public"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_services: {
        Row: {
          active: boolean
          bank_details: Json | null
          blocked_dates: Json | null
          booking_slug: string | null
          booking_type: string
          boost_tier: string | null
          boost_until: string | null
          category: string
          city: string
          commission_amount: number
          commission_type: string
          conditions: string | null
          country: string
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number | null
          id: string
          lat: number | null
          lng: number | null
          location: string | null
          max_capacity: number | null
          org_id: string
          payment_methods: Json | null
          paypal_email: string | null
          photo_url: string | null
          photo_urls: Json | null
          price: number
          property_id: string | null
          provider_name: string | null
          provider_phone: string | null
          requires_id_document: boolean
          sort_order: number
          time_slots: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          bank_details?: Json | null
          blocked_dates?: Json | null
          booking_slug?: string | null
          booking_type?: string
          boost_tier?: string | null
          boost_until?: string | null
          category?: string
          city?: string
          commission_amount?: number
          commission_type?: string
          conditions?: string | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          max_capacity?: number | null
          org_id: string
          payment_methods?: Json | null
          paypal_email?: string | null
          photo_url?: string | null
          photo_urls?: Json | null
          price?: number
          property_id?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          requires_id_document?: boolean
          sort_order?: number
          time_slots?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          bank_details?: Json | null
          blocked_dates?: Json | null
          booking_slug?: string | null
          booking_type?: string
          boost_tier?: string | null
          boost_until?: string | null
          category?: string
          city?: string
          commission_amount?: number
          commission_type?: string
          conditions?: string | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          max_capacity?: number | null
          org_id?: string
          payment_methods?: Json | null
          paypal_email?: string | null
          photo_url?: string | null
          photo_urls?: Json | null
          price?: number
          property_id?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          requires_id_document?: boolean
          sort_order?: number
          time_slots?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_services_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_clicks: {
        Row: {
          channel: string
          created_at: string
          id: string
          listing_id: string | null
          org_id: string | null
          referrer: string | null
          service_id: string | null
          visitor_fingerprint: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          listing_id?: string | null
          org_id?: string | null
          referrer?: string | null
          service_id?: string | null
          visitor_fingerprint?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          org_id?: string | null
          referrer?: string | null
          service_id?: string | null
          visitor_fingerprint?: string | null
        }
        Relationships: []
      }
      contact_reveals: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          org_id: string | null
          reveal_type: string
          service_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          org_id?: string | null
          reveal_type?: string
          service_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          org_id?: string | null
          reveal_type?: string
          service_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          avatar_url: string | null
          category: string
          company: string | null
          contact_user_id: string | null
          created_at: string
          email: string | null
          id: string
          is_favorite: boolean
          last_contacted_at: string | null
          name: string
          notes: string | null
          org_id: string | null
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          category?: string
          company?: string | null
          contact_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_favorite?: boolean
          last_contacted_at?: string | null
          name: string
          notes?: string | null
          org_id?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          category?: string
          company?: string | null
          contact_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_favorite?: boolean
          last_contacted_at?: string | null
          name?: string
          notes?: string | null
          org_id?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_preferences: {
        Row: {
          archived: boolean | null
          context_id: string
          created_at: string | null
          id: string
          muted: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          context_id: string
          created_at?: string | null
          id?: string
          muted?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean | null
          context_id?: string
          created_at?: string | null
          id?: string
          muted?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_threads: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string
          id: string
          initiator_id: string
          last_message_at: string | null
          listing_title: string | null
          listing_url: string | null
          org_id: string
          participant_ids: string[]
          provider_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          initiator_id: string
          last_message_at?: string | null
          listing_title?: string | null
          listing_url?: string | null
          org_id: string
          participant_ids?: string[]
          provider_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          initiator_id?: string
          last_message_at?: string | null
          listing_title?: string | null
          listing_url?: string | null
          org_id?: string
          participant_ids?: string[]
          provider_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string
          data_json: Json | null
          deal_id: string
          event_type: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          data_json?: Json | null
          deal_id: string
          event_type: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          data_json?: Json | null
          deal_id?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_rooms: {
        Row: {
          accepted_amount: number | null
          booking_id: string | null
          buyer_id: string | null
          context_id: string | null
          context_title: string | null
          context_type: string
          counter_offer_amount: number | null
          created_at: string
          current_offer_amount: number | null
          current_offer_currency: string | null
          id: string
          metadata_json: Json | null
          notes: string | null
          org_id: string
          seller_id: string | null
          status: Database["public"]["Enums"]["deal_status"]
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_amount?: number | null
          booking_id?: string | null
          buyer_id?: string | null
          context_id?: string | null
          context_title?: string | null
          context_type?: string
          counter_offer_amount?: number | null
          created_at?: string
          current_offer_amount?: number | null
          current_offer_currency?: string | null
          id?: string
          metadata_json?: Json | null
          notes?: string | null
          org_id: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_amount?: number | null
          booking_id?: string | null
          buyer_id?: string | null
          context_id?: string | null
          context_title?: string | null
          context_type?: string
          counter_offer_amount?: number | null
          created_at?: string
          current_offer_amount?: number | null
          current_offer_currency?: string | null
          id?: string
          metadata_json?: Json | null
          notes?: string | null
          org_id?: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_rooms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rooms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rooms_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
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
            foreignKeyName: "document_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
          emailed_at: string | null
          id: string
          lease_id: string | null
          org_id: string
          owner_signature_url: string | null
          pdf_url: string | null
          property_id: string | null
          qr_verification_url: string | null
          requires_signature: boolean | null
          routed_to: Json | null
          routing_status: string
          sent_to_emails: Json | null
          signed_by_owner_at: string | null
          signed_by_tenant_at: string | null
          status: string
          template_id: string | null
          template_version: string | null
          tenant_id: string | null
          tenant_signature_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          country?: string
          created_at?: string
          data_json?: Json
          doc_hash?: string | null
          doc_type: string
          emailed_at?: string | null
          id?: string
          lease_id?: string | null
          org_id: string
          owner_signature_url?: string | null
          pdf_url?: string | null
          property_id?: string | null
          qr_verification_url?: string | null
          requires_signature?: boolean | null
          routed_to?: Json | null
          routing_status?: string
          sent_to_emails?: Json | null
          signed_by_owner_at?: string | null
          signed_by_tenant_at?: string | null
          status?: string
          template_id?: string | null
          template_version?: string | null
          tenant_id?: string | null
          tenant_signature_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          data_json?: Json
          doc_hash?: string | null
          doc_type?: string
          emailed_at?: string | null
          id?: string
          lease_id?: string | null
          org_id?: string
          owner_signature_url?: string | null
          pdf_url?: string | null
          property_id?: string | null
          qr_verification_url?: string | null
          requires_signature?: boolean | null
          routed_to?: Json | null
          routing_status?: string
          sent_to_emails?: Json | null
          signed_by_owner_at?: string | null
          signed_by_tenant_at?: string | null
          status?: string
          template_id?: string | null
          template_version?: string | null
          tenant_id?: string | null
          tenant_signature_url?: string | null
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
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
            foreignKeyName: "dunning_letters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
          photo_url: string | null
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
          photo_url?: string | null
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
          photo_url?: string | null
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
            foreignKeyName: "furniture_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          org_id: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_call_signals: {
        Row: {
          call_id: string
          context_id: string | null
          context_label: string | null
          context_type: string | null
          created_at: string
          expires_at: string
          from_role: string | null
          guest_name: string | null
          guest_session_id: string | null
          id: string
          is_video: boolean
          org_id: string | null
          processed_by_callee: boolean | null
          processed_by_caller: boolean | null
          signal_data: string | null
          signal_type: string | null
          status: string
        }
        Insert: {
          call_id: string
          context_id?: string | null
          context_label?: string | null
          context_type?: string | null
          created_at?: string
          expires_at?: string
          from_role?: string | null
          guest_name?: string | null
          guest_session_id?: string | null
          id?: string
          is_video?: boolean
          org_id?: string | null
          processed_by_callee?: boolean | null
          processed_by_caller?: boolean | null
          signal_data?: string | null
          signal_type?: string | null
          status?: string
        }
        Update: {
          call_id?: string
          context_id?: string | null
          context_label?: string | null
          context_type?: string | null
          created_at?: string
          expires_at?: string
          from_role?: string | null
          guest_name?: string | null
          guest_session_id?: string | null
          id?: string
          is_video?: boolean
          org_id?: string | null
          processed_by_callee?: boolean | null
          processed_by_caller?: boolean | null
          signal_data?: string | null
          signal_type?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_call_signals_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_call_signals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_call_signals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          blocked: boolean
          context_id: string | null
          context_type: string
          created_at: string
          display_name: string
          email: string | null
          expires_at: string
          fingerprint: string | null
          id: string
          last_activity_at: string
          media_sent: number
          messages_sent: number
          org_id: string | null
          token: string
        }
        Insert: {
          blocked?: boolean
          context_id?: string | null
          context_type?: string
          created_at?: string
          display_name?: string
          email?: string | null
          expires_at?: string
          fingerprint?: string | null
          id?: string
          last_activity_at?: string
          media_sent?: number
          messages_sent?: number
          org_id?: string | null
          token?: string
        }
        Update: {
          blocked?: boolean
          context_id?: string | null
          context_type?: string
          created_at?: string
          display_name?: string
          email?: string | null
          expires_at?: string
          fingerprint?: string | null
          id?: string
          last_activity_at?: string
          media_sent?: number
          messages_sent?: number
          org_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
            foreignKeyName: "interventions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
            foreignKeyName: "inventory_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
          showcase_enabled: boolean
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
          showcase_enabled?: boolean
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
          showcase_enabled?: boolean
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
          {
            foreignKeyName: "landlord_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
          owner_signed_at: string | null
          payment_day: number | null
          pdf_url: string | null
          property_id: string
          rent_amount: number
          rent_schedule_generated: boolean
          signed_at: string | null
          signed_by_owner: boolean | null
          signed_by_tenant: boolean | null
          start_date: string
          status: string
          tenant_id: string
          tenant_signed_at: string | null
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
          owner_signed_at?: string | null
          payment_day?: number | null
          pdf_url?: string | null
          property_id: string
          rent_amount?: number
          rent_schedule_generated?: boolean
          signed_at?: string | null
          signed_by_owner?: boolean | null
          signed_by_tenant?: boolean | null
          start_date: string
          status?: string
          tenant_id: string
          tenant_signed_at?: string | null
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
          owner_signed_at?: string | null
          payment_day?: number | null
          pdf_url?: string | null
          property_id?: string
          rent_amount?: number
          rent_schedule_generated?: boolean
          signed_at?: string | null
          signed_by_owner?: boolean | null
          signed_by_tenant?: boolean | null
          start_date?: string
          status?: string
          tenant_id?: string
          tenant_signed_at?: string | null
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
            foreignKeyName: "leases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
      local_services: {
        Row: {
          active: boolean
          availability_note: string | null
          category: string
          city: string
          country: string
          created_at: string
          description: string | null
          id: string
          org_id: string
          photo_url: string | null
          price_indication: string | null
          property_id: string | null
          sort_order: number
          title: string
          updated_at: string
          user_id: string
          website_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          active?: boolean
          availability_note?: string | null
          category?: string
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          org_id: string
          photo_url?: string | null
          price_indication?: string | null
          property_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          active?: boolean
          availability_note?: string | null
          category?: string
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          org_id?: string
          photo_url?: string | null
          price_indication?: string | null
          property_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "local_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_services_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      login_events: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_label: string
          event_type: string
          id: string
          is_new_device: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_label?: string
          event_type?: string
          id?: string
          is_new_device?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_label?: string
          event_type?: string
          id?: string
          is_new_device?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      marketplace_bookings: {
        Row: {
          booker_email: string
          booker_name: string
          booker_phone: string | null
          booker_user_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_currency: string | null
          date_from: string | null
          date_to: string | null
          exchange_rate: number | null
          id: string
          notes: string | null
          org_id: string
          payment_confirmed: boolean | null
          payment_confirmed_at: string | null
          payment_link_sent: boolean | null
          payment_method: string | null
          property_id: string | null
          provider_id: string
          quantity: number | null
          refunded_at: string | null
          service_date: string | null
          service_id: string
          service_time: string | null
          status: string
          stripe_payment_intent_id: string | null
          total_price: number | null
          updated_at: string
        }
        Insert: {
          booker_email?: string
          booker_name?: string
          booker_phone?: string | null
          booker_user_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_currency?: string | null
          date_from?: string | null
          date_to?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          org_id: string
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          payment_link_sent?: boolean | null
          payment_method?: string | null
          property_id?: string | null
          provider_id: string
          quantity?: number | null
          refunded_at?: string | null
          service_date?: string | null
          service_id: string
          service_time?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          booker_email?: string
          booker_name?: string
          booker_phone?: string | null
          booker_user_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_currency?: string | null
          date_from?: string | null
          date_to?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          payment_link_sent?: boolean | null
          payment_method?: string | null
          property_id?: string | null
          provider_id?: string
          quantity?: number | null
          refunded_at?: string | null
          service_date?: string | null
          service_id?: string
          service_time?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "marketplace_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "marketplace_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "marketplace_services_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_providers: {
        Row: {
          active: boolean | null
          address: string | null
          avatar_url: string | null
          bank_bic: string | null
          bank_holder: string | null
          bank_iban: string | null
          bank_name: string | null
          bio: string | null
          categories: string[]
          city: string
          company_name: string | null
          completed_jobs: number
          country: string
          cover_photo_url: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          invoice_address: string | null
          invoice_company_name: string | null
          invoice_next_number: number | null
          invoice_prefix: string | null
          invoice_tax_id: string | null
          invoicing_enabled: boolean | null
          org_id: string
          payment_bank_details: Json | null
          payment_custom_url: string | null
          payment_paypal_email: string | null
          payment_stripe_link: string | null
          phone: string | null
          provider_type: string
          rating: number | null
          response_rate: number
          response_time: string | null
          reviews_count: number | null
          slug: string
          tax_label: string | null
          tax_rate: number | null
          updated_at: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
          website_url: string | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          avatar_url?: string | null
          bank_bic?: string | null
          bank_holder?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          bio?: string | null
          categories?: string[]
          city?: string
          company_name?: string | null
          completed_jobs?: number
          country?: string
          cover_photo_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          invoice_address?: string | null
          invoice_company_name?: string | null
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          invoice_tax_id?: string | null
          invoicing_enabled?: boolean | null
          org_id: string
          payment_bank_details?: Json | null
          payment_custom_url?: string | null
          payment_paypal_email?: string | null
          payment_stripe_link?: string | null
          phone?: string | null
          provider_type?: string
          rating?: number | null
          response_rate?: number
          response_time?: string | null
          reviews_count?: number | null
          slug: string
          tax_label?: string | null
          tax_rate?: number | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
          website_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          avatar_url?: string | null
          bank_bic?: string | null
          bank_holder?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          bio?: string | null
          categories?: string[]
          city?: string
          company_name?: string | null
          completed_jobs?: number
          country?: string
          cover_photo_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          invoice_address?: string | null
          invoice_company_name?: string | null
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          invoice_tax_id?: string | null
          invoicing_enabled?: boolean | null
          org_id?: string
          payment_bank_details?: Json | null
          payment_custom_url?: string | null
          payment_paypal_email?: string | null
          payment_stripe_link?: string | null
          phone?: string | null
          provider_type?: string
          rating?: number | null
          response_rate?: number
          response_time?: string | null
          reviews_count?: number | null
          slug?: string
          tax_label?: string | null
          tax_rate?: number | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
          website_url?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_providers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_providers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reviews: {
        Row: {
          booking_id: string | null
          comment: string
          created_at: string
          id: string
          provider_id: string
          rating: number
          responded_at: string | null
          response: string | null
          reviewer_email: string | null
          reviewer_name: string
          reviewer_user_id: string | null
          service_id: string | null
          status: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          booking_id?: string | null
          comment?: string
          created_at?: string
          id?: string
          provider_id: string
          rating?: number
          responded_at?: string | null
          response?: string | null
          reviewer_email?: string | null
          reviewer_name: string
          reviewer_user_id?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          booking_id?: string | null
          comment?: string
          created_at?: string
          id?: string
          provider_id?: string
          rating?: number
          responded_at?: string | null
          response?: string | null
          reviewer_email?: string | null
          reviewer_name?: string
          reviewer_user_id?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "marketplace_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "marketplace_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "marketplace_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "marketplace_services_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_services: {
        Row: {
          active: boolean | null
          badges: string[] | null
          bathrooms: number | null
          bedrooms: number | null
          blocked_dates: Json | null
          booking_slug: string
          boost_tier: string | null
          boost_until: string | null
          brand: string | null
          category: string
          city: string
          condition: string | null
          contact_email: string | null
          contact_whatsapp: string | null
          country: string
          created_at: string
          currency: string
          deposit_amount: number | null
          description: string | null
          duration_minutes: number | null
          features: Json | null
          id: string
          lat: number | null
          listing_expires_at: string | null
          listing_type: string | null
          lng: number | null
          location: string | null
          max_capacity: number | null
          model: string | null
          org_id: string
          payment_bank_details: Json | null
          payment_custom_url: string | null
          payment_paypal_email: string | null
          payment_stripe_link: string | null
          photo_urls: Json | null
          price: number
          price_type: string
          provider_id: string
          quantity: number | null
          requires_id_document: boolean
          rooms: number | null
          sort_order: number | null
          source_contact_email: string | null
          source_contact_name: string | null
          source_contact_notes: string | null
          source_contact_phone: string | null
          status: Database["public"]["Enums"]["listing_status"]
          surface_sqm: number | null
          time_slots: Json | null
          title: string
          updated_at: string
          user_id: string
          verification_types: Json | null
          year_built: number | null
        }
        Insert: {
          active?: boolean | null
          badges?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          blocked_dates?: Json | null
          booking_slug: string
          boost_tier?: string | null
          boost_until?: string | null
          brand?: string | null
          category?: string
          city?: string
          condition?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          country?: string
          created_at?: string
          currency?: string
          deposit_amount?: number | null
          description?: string | null
          duration_minutes?: number | null
          features?: Json | null
          id?: string
          lat?: number | null
          listing_expires_at?: string | null
          listing_type?: string | null
          lng?: number | null
          location?: string | null
          max_capacity?: number | null
          model?: string | null
          org_id: string
          payment_bank_details?: Json | null
          payment_custom_url?: string | null
          payment_paypal_email?: string | null
          payment_stripe_link?: string | null
          photo_urls?: Json | null
          price?: number
          price_type?: string
          provider_id: string
          quantity?: number | null
          requires_id_document?: boolean
          rooms?: number | null
          sort_order?: number | null
          source_contact_email?: string | null
          source_contact_name?: string | null
          source_contact_notes?: string | null
          source_contact_phone?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          surface_sqm?: number | null
          time_slots?: Json | null
          title: string
          updated_at?: string
          user_id: string
          verification_types?: Json | null
          year_built?: number | null
        }
        Update: {
          active?: boolean | null
          badges?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          blocked_dates?: Json | null
          booking_slug?: string
          boost_tier?: string | null
          boost_until?: string | null
          brand?: string | null
          category?: string
          city?: string
          condition?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          country?: string
          created_at?: string
          currency?: string
          deposit_amount?: number | null
          description?: string | null
          duration_minutes?: number | null
          features?: Json | null
          id?: string
          lat?: number | null
          listing_expires_at?: string | null
          listing_type?: string | null
          lng?: number | null
          location?: string | null
          max_capacity?: number | null
          model?: string | null
          org_id?: string
          payment_bank_details?: Json | null
          payment_custom_url?: string | null
          payment_paypal_email?: string | null
          payment_stripe_link?: string | null
          photo_urls?: Json | null
          price?: number
          price_type?: string
          provider_id?: string
          quantity?: number | null
          requires_id_document?: boolean
          rooms?: number | null
          sort_order?: number | null
          source_contact_email?: string | null
          source_contact_name?: string | null
          source_contact_notes?: string | null
          source_contact_phone?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          surface_sqm?: number | null
          time_slots?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
          verification_types?: Json | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "marketplace_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          allow_copy: boolean
          allow_forward: boolean
          anti_screen_record: boolean
          anti_screenshot: boolean
          assigned_to: string | null
          attachment_url: string | null
          attachment_urls: Json | null
          audio_duration_seconds: number | null
          audio_url: string | null
          booking_id: string | null
          booking_type: string | null
          category: string
          contact_email: string | null
          contact_name: string | null
          content: string
          context_id: string | null
          context_type: string | null
          conversation_status: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_for_all: boolean | null
          deleted_for_sender: boolean | null
          deleted_for_user_ids: string[] | null
          deletion_reason: string | null
          delivered: boolean | null
          destroyed_at: string | null
          destroyed_reason: string | null
          disappear_at: string | null
          edit_history: Json | null
          edited_at: string | null
          encrypted: boolean | null
          forwarded_at: string | null
          forwarded_from: string | null
          guest_session_id: string | null
          id: string
          inbound_message_id: string | null
          language_detected: string | null
          message_type: string | null
          opened_at: string | null
          opened_by: string | null
          org_id: string
          property_id: string | null
          read: boolean
          reply_chain_id: string | null
          reply_to_content: string | null
          reply_to_id: string | null
          security_level: string
          security_policy_version: number
          self_destruct_on_forward: boolean
          sender_id: string
          sender_locale: string | null
          starred: boolean | null
          tenant_id: string | null
          thread_id: string | null
          transcript_error: string | null
          transcript_generated_at: string | null
          transcript_language: string | null
          transcript_status: string | null
          transcript_text: string | null
          translated_content: string | null
          translated_locale: string | null
          translated_transcript_language: string | null
          translated_transcript_text: string | null
          translation_error: string | null
          translation_generated_at: string | null
          translation_status: string | null
          view_once: boolean | null
          view_once_opened_at: string | null
          view_once_opened_by: string | null
        }
        Insert: {
          allow_copy?: boolean
          allow_forward?: boolean
          anti_screen_record?: boolean
          anti_screenshot?: boolean
          assigned_to?: string | null
          attachment_url?: string | null
          attachment_urls?: Json | null
          audio_duration_seconds?: number | null
          audio_url?: string | null
          booking_id?: string | null
          booking_type?: string | null
          category?: string
          contact_email?: string | null
          contact_name?: string | null
          content: string
          context_id?: string | null
          context_type?: string | null
          conversation_status?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_for_all?: boolean | null
          deleted_for_sender?: boolean | null
          deleted_for_user_ids?: string[] | null
          deletion_reason?: string | null
          delivered?: boolean | null
          destroyed_at?: string | null
          destroyed_reason?: string | null
          disappear_at?: string | null
          edit_history?: Json | null
          edited_at?: string | null
          encrypted?: boolean | null
          forwarded_at?: string | null
          forwarded_from?: string | null
          guest_session_id?: string | null
          id?: string
          inbound_message_id?: string | null
          language_detected?: string | null
          message_type?: string | null
          opened_at?: string | null
          opened_by?: string | null
          org_id: string
          property_id?: string | null
          read?: boolean
          reply_chain_id?: string | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          security_level?: string
          security_policy_version?: number
          self_destruct_on_forward?: boolean
          sender_id: string
          sender_locale?: string | null
          starred?: boolean | null
          tenant_id?: string | null
          thread_id?: string | null
          transcript_error?: string | null
          transcript_generated_at?: string | null
          transcript_language?: string | null
          transcript_status?: string | null
          transcript_text?: string | null
          translated_content?: string | null
          translated_locale?: string | null
          translated_transcript_language?: string | null
          translated_transcript_text?: string | null
          translation_error?: string | null
          translation_generated_at?: string | null
          translation_status?: string | null
          view_once?: boolean | null
          view_once_opened_at?: string | null
          view_once_opened_by?: string | null
        }
        Update: {
          allow_copy?: boolean
          allow_forward?: boolean
          anti_screen_record?: boolean
          anti_screenshot?: boolean
          assigned_to?: string | null
          attachment_url?: string | null
          attachment_urls?: Json | null
          audio_duration_seconds?: number | null
          audio_url?: string | null
          booking_id?: string | null
          booking_type?: string | null
          category?: string
          contact_email?: string | null
          contact_name?: string | null
          content?: string
          context_id?: string | null
          context_type?: string | null
          conversation_status?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_for_all?: boolean | null
          deleted_for_sender?: boolean | null
          deleted_for_user_ids?: string[] | null
          deletion_reason?: string | null
          delivered?: boolean | null
          destroyed_at?: string | null
          destroyed_reason?: string | null
          disappear_at?: string | null
          edit_history?: Json | null
          edited_at?: string | null
          encrypted?: boolean | null
          forwarded_at?: string | null
          forwarded_from?: string | null
          guest_session_id?: string | null
          id?: string
          inbound_message_id?: string | null
          language_detected?: string | null
          message_type?: string | null
          opened_at?: string | null
          opened_by?: string | null
          org_id?: string
          property_id?: string | null
          read?: boolean
          reply_chain_id?: string | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          security_level?: string
          security_policy_version?: number
          self_destruct_on_forward?: boolean
          sender_id?: string
          sender_locale?: string | null
          starred?: boolean | null
          tenant_id?: string | null
          thread_id?: string | null
          transcript_error?: string | null
          transcript_generated_at?: string | null
          transcript_language?: string | null
          transcript_status?: string | null
          transcript_text?: string | null
          translated_content?: string | null
          translated_locale?: string | null
          translated_transcript_language?: string | null
          translated_transcript_text?: string | null
          translation_error?: string | null
          translation_generated_at?: string | null
          translation_status?: string | null
          view_once?: boolean | null
          view_once_opened_at?: string | null
          view_once_opened_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_forwarded_from_fkey"
            columns: ["forwarded_from"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
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
      notification_preferences: {
        Row: {
          email_documents: boolean
          email_maintenance: boolean
          email_messages: boolean
          email_payments: boolean
          email_urgent_only: boolean
          id: string
          in_app_documents: boolean
          in_app_maintenance: boolean
          in_app_messages: boolean
          in_app_payments: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_documents?: boolean
          email_maintenance?: boolean
          email_messages?: boolean
          email_payments?: boolean
          email_urgent_only?: boolean
          id?: string
          in_app_documents?: boolean
          in_app_maintenance?: boolean
          in_app_messages?: boolean
          in_app_payments?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_documents?: boolean
          email_maintenance?: boolean
          email_messages?: boolean
          email_payments?: boolean
          email_urgent_only?: boolean
          id?: string
          in_app_documents?: boolean
          in_app_maintenance?: boolean
          in_app_messages?: boolean
          in_app_payments?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          metadata_json: Json | null
          org_id: string | null
          read: boolean
          resolved: boolean
          resolved_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata_json?: Json | null
          org_id?: string | null
          read?: boolean
          resolved?: boolean
          resolved_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata_json?: Json | null
          org_id?: string | null
          read?: boolean
          resolved?: boolean
          resolved_at?: string | null
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
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
          {
            foreignKeyName: "org_secrets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          address: string | null
          bank_bic: string | null
          bank_holder_name: string | null
          bank_iban: string | null
          bank_name: string | null
          brand_accent_color: string | null
          brand_favicon_url: string | null
          brand_name: string | null
          brand_primary_color: string | null
          city: string | null
          country: string
          created_at: string
          custom_domain: string | null
          default_payment_provider: string | null
          email: string | null
          id: string
          local_services_enabled: boolean
          logo_url: string | null
          name: string
          owner_user_id: string
          payment_link_url: string | null
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
          bank_bic?: string | null
          bank_holder_name?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          brand_accent_color?: string | null
          brand_favicon_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          city?: string | null
          country?: string
          created_at?: string
          custom_domain?: string | null
          default_payment_provider?: string | null
          email?: string | null
          id?: string
          local_services_enabled?: boolean
          logo_url?: string | null
          name?: string
          owner_user_id: string
          payment_link_url?: string | null
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
          bank_bic?: string | null
          bank_holder_name?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          brand_accent_color?: string | null
          brand_favicon_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          city?: string | null
          country?: string
          created_at?: string
          custom_domain?: string | null
          default_payment_provider?: string | null
          email?: string | null
          id?: string
          local_services_enabled?: boolean
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          payment_link_url?: string | null
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
          {
            foreignKeyName: "ota_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
          {
            foreignKeyName: "owner_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
            foreignKeyName: "payment_notices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
      payment_requests: {
        Row: {
          amount: number
          context_id: string | null
          context_type: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          org_id: string
          paid_at: string | null
          recipient_email: string | null
          recipient_name: string | null
          sender_id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_payment_link: string | null
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          org_id: string
          paid_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          sender_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_link?: string | null
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          org_id?: string
          paid_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          sender_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_link?: string | null
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          active: boolean | null
          adjustment_type: string
          adjustment_value: number
          created_at: string
          days_of_week: number[] | null
          end_date: string | null
          id: string
          max_occupancy: number | null
          min_occupancy: number | null
          name: string
          org_id: string
          priority: number
          property_id: string
          rule_type: string
          start_date: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          adjustment_type?: string
          adjustment_value?: number
          created_at?: string
          days_of_week?: number[] | null
          end_date?: string | null
          id?: string
          max_occupancy?: number | null
          min_occupancy?: number | null
          name: string
          org_id: string
          priority?: number
          property_id: string
          rule_type?: string
          start_date?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          adjustment_type?: string
          adjustment_value?: number
          created_at?: string
          days_of_week?: number[] | null
          end_date?: string | null
          id?: string
          max_occupancy?: number | null
          min_occupancy?: number | null
          name?: string
          org_id?: string
          priority?: number
          property_id?: string
          rule_type?: string
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_tier: string
          address: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          currency: string | null
          custom_display_name: string | null
          date_of_birth: string | null
          default_disappear_ttl: string
          display_name_mode: string
          email: string
          first_name: string | null
          id: string
          id_number: string | null
          last_name: string | null
          locale: string | null
          name: string | null
          nationality: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone: string | null
          postal_code: string | null
          preferred_currency: string | null
          preferred_locale: string | null
          privacy_read_receipts: boolean
          privacy_typing_indicators: boolean
          referral_code: string | null
          signature_url: string | null
          tax_id: string | null
          telegram_username: string | null
          updated_at: string
          user_type: string
          username: string | null
          whatsapp_number: string | null
        }
        Insert: {
          access_tier?: string
          address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          custom_display_name?: string | null
          date_of_birth?: string | null
          default_disappear_ttl?: string
          display_name_mode?: string
          email: string
          first_name?: string | null
          id: string
          id_number?: string | null
          last_name?: string | null
          locale?: string | null
          name?: string | null
          nationality?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          privacy_read_receipts?: boolean
          privacy_typing_indicators?: boolean
          referral_code?: string | null
          signature_url?: string | null
          tax_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_type?: string
          username?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          access_tier?: string
          address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          custom_display_name?: string | null
          date_of_birth?: string | null
          default_disappear_ttl?: string
          display_name_mode?: string
          email?: string
          first_name?: string | null
          id?: string
          id_number?: string | null
          last_name?: string | null
          locale?: string | null
          name?: string | null
          nationality?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          privacy_read_receipts?: boolean
          privacy_typing_indicators?: boolean
          referral_code?: string | null
          signature_url?: string | null
          tax_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_type?: string
          username?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          balcony: boolean | null
          bathrooms: number | null
          bedrooms: number | null
          building_id: string | null
          building_name: string | null
          city: string
          country: string
          created_at: string
          deposit_amount: number | null
          description: string | null
          elevator: boolean | null
          energy_class: string | null
          floor: number | null
          furnished: boolean | null
          garden: boolean | null
          heating: string | null
          id: string
          label: string
          listing_purpose: string | null
          lot_number: string | null
          monthly_charges: number | null
          monthly_rent: number | null
          notes: string | null
          org_id: string
          parking: boolean | null
          photo_urls: Json | null
          pool: boolean | null
          postal_code: string
          property_type: string
          rental_mode: string | null
          rooms: number | null
          surface: number | null
          surface_unit: string | null
          terrace: boolean | null
          updated_at: string
          user_id: string
          year_built: number | null
        }
        Insert: {
          address?: string
          balcony?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_id?: string | null
          building_name?: string | null
          city?: string
          country?: string
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          elevator?: boolean | null
          energy_class?: string | null
          floor?: number | null
          furnished?: boolean | null
          garden?: boolean | null
          heating?: string | null
          id?: string
          label: string
          listing_purpose?: string | null
          lot_number?: string | null
          monthly_charges?: number | null
          monthly_rent?: number | null
          notes?: string | null
          org_id: string
          parking?: boolean | null
          photo_urls?: Json | null
          pool?: boolean | null
          postal_code?: string
          property_type?: string
          rental_mode?: string | null
          rooms?: number | null
          surface?: number | null
          surface_unit?: string | null
          terrace?: boolean | null
          updated_at?: string
          user_id: string
          year_built?: number | null
        }
        Update: {
          address?: string
          balcony?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_id?: string | null
          building_name?: string | null
          city?: string
          country?: string
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          elevator?: boolean | null
          energy_class?: string | null
          floor?: number | null
          furnished?: boolean | null
          garden?: boolean | null
          heating?: string | null
          id?: string
          label?: string
          listing_purpose?: string | null
          lot_number?: string | null
          monthly_charges?: number | null
          monthly_rent?: number | null
          notes?: string | null
          org_id?: string
          parking?: boolean | null
          photo_urls?: Json | null
          pool?: boolean | null
          postal_code?: string
          property_type?: string
          rental_mode?: string | null
          rooms?: number | null
          surface?: number | null
          surface_unit?: string | null
          terrace?: boolean | null
          updated_at?: string
          user_id?: string
          year_built?: number | null
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
          {
            foreignKeyName: "properties_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      property_blocked_dates: {
        Row: {
          created_at: string
          date_from: string
          date_to: string
          id: string
          org_id: string
          property_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          date_from: string
          date_to: string
          id?: string
          org_id: string
          property_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          date_from?: string
          date_to?: string
          id?: string
          org_id?: string
          property_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_blocked_dates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_blocked_dates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_blocked_dates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      public_listings: {
        Row: {
          active: boolean | null
          amenities: Json | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          lat: number | null
          lng: number | null
          max_guests: number | null
          min_nights: number | null
          org_id: string
          price_per_night: number | null
          property_id: string
          slug: string
          telegram_username: string | null
          title: string
          updated_at: string | null
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          active?: boolean | null
          amenities?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          max_guests?: number | null
          min_nights?: number | null
          org_id: string
          price_per_night?: number | null
          property_id: string
          slug: string
          telegram_username?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          active?: boolean | null
          amenities?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          max_guests?: number | null
          min_nights?: number | null
          org_id?: string
          price_per_night?: number | null
          property_id?: string
          slug?: string
          telegram_username?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          whatsapp_number?: string | null
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
            foreignKeyName: "public_listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
      real_estate_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          listing_id: string
          message: string | null
          name: string
          org_id: string
          phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          listing_id: string
          message?: string | null
          name: string
          org_id: string
          phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          listing_id?: string
          message?: string | null
          name?: string
          org_id?: string
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_estate_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "real_estate_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_estate_leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_estate_leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      real_estate_listings: {
        Row: {
          address: string | null
          agency_email: string | null
          agency_logo_url: string | null
          agency_name: string | null
          agency_phone: string | null
          agent_name: string | null
          bathrooms: number | null
          bedrooms: number | null
          boost_tier: string | null
          boost_until: string | null
          city: string
          company_registration: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          currency: string
          description: string | null
          elevator: boolean | null
          energy_class: string | null
          features: Json | null
          floor_number: number | null
          furnished: boolean | null
          garden: boolean | null
          heating_type: string | null
          id: string
          lat: number | null
          latitude: number | null
          license_number: string | null
          listing_type: string
          lng: number | null
          longitude: number | null
          org_id: string
          parking: boolean | null
          photo_urls: Json | null
          postal_code: string | null
          price: number
          property_id: string | null
          property_type: string | null
          rooms: number | null
          slug: string | null
          status: string
          surface_sqm: number | null
          terrace: boolean | null
          title: string
          total_floors: number | null
          updated_at: string
          user_id: string
          views_count: number | null
          visibility: string
          year_built: number | null
        }
        Insert: {
          address?: string | null
          agency_email?: string | null
          agency_logo_url?: string | null
          agency_name?: string | null
          agency_phone?: string | null
          agent_name?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          boost_tier?: string | null
          boost_until?: string | null
          city?: string
          company_registration?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          elevator?: boolean | null
          energy_class?: string | null
          features?: Json | null
          floor_number?: number | null
          furnished?: boolean | null
          garden?: boolean | null
          heating_type?: string | null
          id?: string
          lat?: number | null
          latitude?: number | null
          license_number?: string | null
          listing_type?: string
          lng?: number | null
          longitude?: number | null
          org_id: string
          parking?: boolean | null
          photo_urls?: Json | null
          postal_code?: string | null
          price?: number
          property_id?: string | null
          property_type?: string | null
          rooms?: number | null
          slug?: string | null
          status?: string
          surface_sqm?: number | null
          terrace?: boolean | null
          title: string
          total_floors?: number | null
          updated_at?: string
          user_id: string
          views_count?: number | null
          visibility?: string
          year_built?: number | null
        }
        Update: {
          address?: string | null
          agency_email?: string | null
          agency_logo_url?: string | null
          agency_name?: string | null
          agency_phone?: string | null
          agent_name?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          boost_tier?: string | null
          boost_until?: string | null
          city?: string
          company_registration?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          elevator?: boolean | null
          energy_class?: string | null
          features?: Json | null
          floor_number?: number | null
          furnished?: boolean | null
          garden?: boolean | null
          heating_type?: string | null
          id?: string
          lat?: number | null
          latitude?: number | null
          license_number?: string | null
          listing_type?: string
          lng?: number | null
          longitude?: number | null
          org_id?: string
          parking?: boolean | null
          photo_urls?: Json | null
          postal_code?: string | null
          price?: number
          property_id?: string | null
          property_type?: string | null
          rooms?: number | null
          slug?: string | null
          status?: string
          surface_sqm?: number | null
          terrace?: boolean | null
          title?: string
          total_floors?: number | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
          visibility?: string
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "real_estate_listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_estate_listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_estate_listings_property_id_fkey"
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
          {
            foreignKeyName: "referrals_referrer_org_id_fkey"
            columns: ["referrer_org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
          {
            foreignKeyName: "reminders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_calls: {
        Row: {
          charges_amount: number
          created_at: string
          due_date: string | null
          id: string
          last_reminder_at: string | null
          month: string
          org_id: string
          paid: boolean | null
          paid_amount: number
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          property_id: string | null
          receipt_pdf_url: string | null
          receipt_validated: boolean | null
          reminder_level: number | null
          rent_amount: number
          stripe_payment_intent_id: string | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          charges_amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          last_reminder_at?: string | null
          month: string
          org_id: string
          paid?: boolean | null
          paid_amount?: number
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          property_id?: string | null
          receipt_pdf_url?: string | null
          receipt_validated?: boolean | null
          reminder_level?: number | null
          rent_amount?: number
          stripe_payment_intent_id?: string | null
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          charges_amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          last_reminder_at?: string | null
          month?: string
          org_id?: string
          paid?: boolean | null
          paid_amount?: number
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          property_id?: string | null
          receipt_pdf_url?: string | null
          receipt_validated?: boolean | null
          reminder_level?: number | null
          rent_amount?: number
          stripe_payment_intent_id?: string | null
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
            foreignKeyName: "rent_calls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
            foreignKeyName: "rent_revisions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
            foreignKeyName: "reservations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
            foreignKeyName: "reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
      saved_listings: {
        Row: {
          created_at: string
          id: string
          listing_city: string | null
          listing_country: string | null
          listing_currency: string | null
          listing_id: string
          listing_image: string | null
          listing_price: number | null
          listing_title: string | null
          listing_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_city?: string | null
          listing_country?: string | null
          listing_currency?: string | null
          listing_id: string
          listing_image?: string | null
          listing_price?: number | null
          listing_title?: string | null
          listing_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_city?: string | null
          listing_country?: string | null
          listing_currency?: string | null
          listing_id?: string
          listing_image?: string | null
          listing_price?: number | null
          listing_title?: string | null
          listing_type?: string
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "seasonal_bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
      service_bookings: {
        Row: {
          amount: number
          commission_rate: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          org_id: string
          property_id: string | null
          provider_id: string
          rating: number | null
          review_text: string | null
          service_date: string
          service_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          org_id: string
          property_id?: string | null
          provider_id: string
          rating?: number | null
          review_text?: string | null
          service_date: string
          service_type?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          org_id?: string
          property_id?: string | null
          provider_id?: string
          rating?: number | null
          review_text?: string | null
          service_date?: string
          service_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          category: string
          city: string | null
          country: string
          created_at: string
          currency: string
          description: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          name: string
          phone: string | null
          rating: number | null
          reviews_count: number | null
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          category?: string
          city?: string | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          category?: string
          city?: string | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
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
          {
            foreignKeyName: "share_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
            foreignKeyName: "tenant_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
            foreignKeyName: "tenant_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
          preferred_locale: string | null
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
          preferred_locale?: string | null
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
          preferred_locale?: string | null
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
            foreignKeyName: "tenants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
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
      transaction_journal: {
        Row: {
          category: string
          created_at: string
          credit: number
          currency: string
          debit: number
          id: string
          label: string
          notes: string | null
          org_id: string
          property_id: string | null
          source_id: string | null
          source_type: string | null
          tenant_id: string | null
          transaction_date: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          credit?: number
          currency?: string
          debit?: number
          id?: string
          label: string
          notes?: string | null
          org_id: string
          property_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant_id?: string | null
          transaction_date?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          credit?: number
          currency?: string
          debit?: number
          id?: string
          label?: string
          notes?: string | null
          org_id?: string
          property_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant_id?: string | null
          transaction_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_journal_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_journal_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_journal_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_journal_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_key_bundles: {
        Row: {
          created_at: string
          id: string
          identity_public_key: string
          one_time_pre_keys: Json | null
          signed_pre_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          identity_public_key: string
          one_time_pre_keys?: Json | null
          signed_pre_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          identity_public_key?: string
          one_time_pre_keys?: Json | null
          signed_pre_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          avatar_url: string | null
          custom_status: string | null
          device_type: string | null
          display_name: string | null
          last_seen_at: string
          lat: number | null
          lng: number | null
          location_label: string | null
          location_shared: boolean
          location_sharing: boolean
          professional_category: string | null
          sharing_expires_at: string | null
          status: string
          updated_at: string
          user_id: string
          verified: boolean
          visible_on_nearby: boolean
          who_can_see: string
        }
        Insert: {
          avatar_url?: string | null
          custom_status?: string | null
          device_type?: string | null
          display_name?: string | null
          last_seen_at?: string
          lat?: number | null
          lng?: number | null
          location_label?: string | null
          location_shared?: boolean
          location_sharing?: boolean
          professional_category?: string | null
          sharing_expires_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verified?: boolean
          visible_on_nearby?: boolean
          who_can_see?: string
        }
        Update: {
          avatar_url?: string | null
          custom_status?: string | null
          device_type?: string | null
          display_name?: string | null
          last_seen_at?: string
          lat?: number | null
          lng?: number | null
          location_label?: string | null
          location_shared?: boolean
          location_sharing?: boolean
          professional_category?: string | null
          sharing_expires_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
          visible_on_nearby?: boolean
          who_can_see?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          context_id: string | null
          created_at: string | null
          id: string
          message_id: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string | null
        }
        Insert: {
          context_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string | null
        }
        Update: {
          context_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_fingerprint: string
          device_label: string
          id: string
          is_current: boolean | null
          last_active_at: string
          os: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_fingerprint: string
          device_label?: string
          id?: string
          is_current?: boolean | null
          last_active_at?: string
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_fingerprint?: string
          device_label?: string
          id?: string
          is_current?: boolean | null
          last_active_at?: string
          os?: string | null
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
          {
            foreignKeyName: "vault_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          delivered_at: string
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          success: boolean
          webhook_id: string
        }
        Insert: {
          delivered_at?: string
          event_type: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id: string
        }
        Update: {
          delivered_at?: string
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean
          created_at: string
          events: string[]
          failure_count: number
          id: string
          last_triggered_at: string | null
          org_id: string
          secret: string
          url: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          last_triggered_at?: string | null
          org_id: string
          secret?: string
          url: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          last_triggered_at?: string | null
          org_id?: string
          secret?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      activities_public: {
        Row: {
          active: boolean | null
          badges: string[] | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          duration_minutes: number | null
          id: string | null
          org_id: string | null
          photo_url: string | null
          price: number | null
          property_id: string | null
          provider_name: string | null
          provider_type: string | null
          sort_order: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          badges?: string[] | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          org_id?: string | null
          photo_url?: string | null
          price?: number | null
          property_id?: string | null
          provider_name?: string | null
          provider_type?: string | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          badges?: string[] | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          org_id?: string | null
          photo_url?: string | null
          price?: number | null
          property_id?: string | null
          provider_name?: string | null
          provider_type?: string | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_services_public: {
        Row: {
          active: boolean | null
          blocked_dates: Json | null
          booking_slug: string | null
          booking_type: string | null
          category: string | null
          city: string | null
          conditions: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          duration_minutes: number | null
          id: string | null
          location: string | null
          max_capacity: number | null
          org_id: string | null
          payment_methods: Json | null
          photo_url: string | null
          photo_urls: Json | null
          price: number | null
          property_id: string | null
          provider_name: string | null
          requires_id_document: boolean | null
          sort_order: number | null
          time_slots: Json | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          blocked_dates?: Json | null
          booking_slug?: string | null
          booking_type?: string | null
          category?: string | null
          city?: string | null
          conditions?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          location?: string | null
          max_capacity?: number | null
          org_id?: string | null
          payment_methods?: Json | null
          photo_url?: string | null
          photo_urls?: Json | null
          price?: number | null
          property_id?: string | null
          provider_name?: string | null
          requires_id_document?: boolean | null
          sort_order?: number | null
          time_slots?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          blocked_dates?: Json | null
          booking_slug?: string | null
          booking_type?: string | null
          category?: string | null
          city?: string | null
          conditions?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          location?: string | null
          max_capacity?: number | null
          org_id?: string | null
          payment_methods?: Json | null
          photo_url?: string | null
          photo_urls?: Json | null
          price?: number | null
          property_id?: string | null
          provider_name?: string | null
          requires_id_document?: boolean | null
          sort_order?: number | null
          time_slots?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_services_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reviews_public: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string | null
          id: string | null
          provider_id: string | null
          rating: number | null
          responded_at: string | null
          response: string | null
          reviewer_name: string | null
          reviewer_user_id: string | null
          service_id: string | null
          status: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string | null
          provider_id?: string | null
          rating?: number | null
          responded_at?: string | null
          response?: string | null
          reviewer_name?: string | null
          reviewer_user_id?: string | null
          service_id?: string | null
          status?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string | null
          provider_id?: string | null
          rating?: number | null
          responded_at?: string | null
          response?: string | null
          reviewer_name?: string | null
          reviewer_user_id?: string | null
          service_id?: string | null
          status?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "marketplace_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "marketplace_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "marketplace_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "marketplace_services_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_services_public: {
        Row: {
          active: boolean | null
          badges: string[] | null
          bathrooms: number | null
          bedrooms: number | null
          blocked_dates: Json | null
          booking_slug: string | null
          brand: string | null
          category: string | null
          city: string | null
          condition: string | null
          contact_email: string | null
          contact_whatsapp: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          deposit_amount: number | null
          description: string | null
          duration_minutes: number | null
          features: Json | null
          id: string | null
          listing_expires_at: string | null
          listing_type: string | null
          location: string | null
          max_capacity: number | null
          model: string | null
          org_id: string | null
          photo_urls: Json | null
          price: number | null
          price_type: string | null
          provider_id: string | null
          quantity: number | null
          requires_id_document: boolean | null
          rooms: number | null
          sort_order: number | null
          source_contact_email: string | null
          source_contact_phone: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          surface_sqm: number | null
          time_slots: Json | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          year_built: number | null
        }
        Insert: {
          active?: boolean | null
          badges?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          blocked_dates?: Json | null
          booking_slug?: string | null
          brand?: string | null
          category?: string | null
          city?: string | null
          condition?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_amount?: number | null
          description?: string | null
          duration_minutes?: number | null
          features?: Json | null
          id?: string | null
          listing_expires_at?: string | null
          listing_type?: string | null
          location?: string | null
          max_capacity?: number | null
          model?: string | null
          org_id?: string | null
          photo_urls?: Json | null
          price?: number | null
          price_type?: string | null
          provider_id?: string | null
          quantity?: number | null
          requires_id_document?: boolean | null
          rooms?: number | null
          sort_order?: number | null
          source_contact_email?: string | null
          source_contact_phone?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          surface_sqm?: number | null
          time_slots?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          year_built?: number | null
        }
        Update: {
          active?: boolean | null
          badges?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          blocked_dates?: Json | null
          booking_slug?: string | null
          brand?: string | null
          category?: string | null
          city?: string | null
          condition?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_amount?: number | null
          description?: string | null
          duration_minutes?: number | null
          features?: Json | null
          id?: string | null
          listing_expires_at?: string | null
          listing_type?: string | null
          location?: string | null
          max_capacity?: number | null
          model?: string | null
          org_id?: string | null
          photo_urls?: Json | null
          price?: number | null
          price_type?: string | null
          provider_id?: string | null
          quantity?: number | null
          requires_id_document?: boolean | null
          rooms?: number | null
          sort_order?: number | null
          source_contact_email?: string | null
          source_contact_phone?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          surface_sqm?: number | null
          time_slots?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "marketplace_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs_tenant_view: {
        Row: {
          address: string | null
          brand_accent_color: string | null
          brand_favicon_url: string | null
          brand_name: string | null
          brand_primary_color: string | null
          city: string | null
          country: string | null
          email: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          phone: string | null
          postal_code: string | null
        }
        Insert: {
          address?: string | null
          brand_accent_color?: string | null
          brand_favicon_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          city?: string | null
          country?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
        }
        Update: {
          address?: string | null
          brand_accent_color?: string | null
          brand_favicon_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          city?: string | null
          country?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_collaboration_invitation: {
        Args: { _token: string; _user_id: string }
        Returns: Json
      }
      accept_tenant_invitation: {
        Args: { _token: string; _user_id: string }
        Returns: Json
      }
      check_inquiry_quota:
        | { Args: { _user_id: string }; Returns: Json }
        | { Args: { _hourly_limit?: number; _user_id: string }; Returns: Json }
      check_reveal_quota: {
        Args: { _daily_limit?: number; _reveal_type: string; _user_id: string }
        Returns: Json
      }
      check_service_availability: {
        Args: { p_date_from: string; p_date_to?: string; p_service_id: string }
        Returns: boolean
      }
      cleanup_expired_messages: { Args: never; Returns: number }
      create_api_key: {
        Args: { _name: string; _org_id: string; _scopes: string[] }
        Returns: Json
      }
      create_call_idempotent: {
        Args: {
          _callee_org_id: string
          _caller_id: string
          _context_id?: string
          _context_label?: string
          _context_type?: string
          _is_video?: boolean
          _thread_id?: string
        }
        Returns: string
      }
      geocode_city_approx: {
        Args: { _city: string }
        Returns: {
          lat: number
          lng: number
        }[]
      }
      get_listing_property: { Args: { p_listing_id: string }; Returns: Json }
      get_order_by_session: { Args: { _session_id: string }; Returns: Json }
      get_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: string
      }
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
      get_owner_bank_for_tenant: {
        Args: { _org_id: string }
        Returns: {
          bank_bic: string
          bank_iban: string
          bank_name: string
          full_name: string
        }[]
      }
      get_owner_profile_for_tenant: {
        Args: { _org_id: string }
        Returns: {
          address: string
          city: string
          company_name: string
          country: string
          email: string
          full_name: string
          id: string
          person_type: string
          phone: string
          postal_code: string
        }[]
      }
      get_provider_reviews: {
        Args: { p_limit?: number; p_offset?: number; p_provider_id: string }
        Returns: {
          comment: string
          created_at: string
          id: string
          rating: number
          response: string
          reviewer_name: string
          service_title: string
          verified: boolean
        }[]
      }
      get_public_listing_properties: {
        Args: { p_property_ids: string[] }
        Returns: {
          city: string
          country: string
          id: string
          photo_urls: Json
        }[]
      }
      get_public_marketplace_providers: {
        Args: { p_active_only?: boolean; p_slug?: string }
        Returns: {
          active: boolean
          avatar_url: string
          bio: string
          categories: string[]
          city: string
          company_name: string
          completed_jobs: number
          country: string
          cover_photo_url: string
          created_at: string
          display_name: string
          email: string
          id: string
          phone: string
          provider_type: string
          rating: number
          response_rate: number
          response_time: string
          reviews_count: number
          slug: string
          verified: boolean
          verified_at: string
          website_url: string
          whatsapp: string
        }[]
      }
      get_public_marketplace_services: {
        Args: { _category?: string; _city?: string; _country?: string }
        Returns: {
          active: boolean
          badges: string[]
          bathrooms: number
          bedrooms: number
          blocked_dates: Json
          booking_slug: string
          brand: string
          category: string
          city: string
          condition: string
          contact_email: string
          contact_whatsapp: string
          country: string
          currency: string
          deposit_amount: number
          description: string
          duration_minutes: number
          features: Json
          id: string
          listing_type: string
          location: string
          max_capacity: number
          model: string
          org_id: string
          photo_urls: Json
          price: number
          price_type: string
          provider_id: string
          quantity: number
          requires_id_document: boolean
          rooms: number
          sort_order: number
          source_contact_email: string
          source_contact_phone: string
          surface_sqm: number
          time_slots: Json
          title: string
          year_built: number
        }[]
      }
      get_public_real_estate_listing: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_public_real_estate_listings: {
        Args: {
          p_city?: string
          p_country?: string
          p_limit?: number
          p_listing_type?: string
          p_max_price?: number
          p_min_price?: number
          p_offset?: number
          p_property_type?: string
        }
        Returns: {
          address: string
          bathrooms: number
          bedrooms: number
          city: string
          country: string
          created_at: string
          currency: string
          description: string
          elevator: boolean
          energy_class: string
          features: Json
          furnished: boolean
          garden: boolean
          id: string
          listing_type: string
          parking: boolean
          photo_urls: Json
          price: number
          property_type: string
          rooms: number
          slug: string
          surface_sqm: number
          terrace: boolean
          title: string
          views_count: number
        }[]
      }
      get_public_service_availability: {
        Args: { p_service_id: string }
        Returns: {
          end_time: string
          quantity: number
          service_date: string
          service_time: string
          status: string
        }[]
      }
      get_real_estate_showcase: { Args: { p_slug: string }; Returns: Json }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_min_role: {
        Args: { _min_role: string; _org_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_listing_views: { Args: { p_slug: string }; Returns: undefined }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      purge_expired_sessions: { Args: never; Returns: undefined }
      purge_old_login_events: { Args: never; Returns: undefined }
      search_nearby_items: {
        Args: {
          _category?: string
          _item_type?: string
          _lat: number
          _lng: number
          _radius_km?: number
        }
        Returns: {
          category: string
          city: string
          country: string
          currency: string
          distance_km: number
          item_id: string
          item_type: string
          lat: number
          lng: number
          photo_url: string
          price: number
          provider_name: string
          status: string
          title: string
        }[]
      }
      validate_tenant_invitation: { Args: { _token: string }; Returns: Json }
    }
    Enums: {
      app_role: "owner" | "admin" | "member" | "agent" | "staff" | "accountant"
      deal_status:
        | "inquiry"
        | "negotiation"
        | "offer_sent"
        | "counter_offer"
        | "accepted"
        | "payment_pending"
        | "confirmed"
        | "completed"
        | "cancelled"
      listing_status:
        | "draft"
        | "pending_review"
        | "published"
        | "paused"
        | "sold"
        | "rented"
        | "archived"
        | "deleted"
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
      app_role: ["owner", "admin", "member", "agent", "staff", "accountant"],
      deal_status: [
        "inquiry",
        "negotiation",
        "offer_sent",
        "counter_offer",
        "accepted",
        "payment_pending",
        "confirmed",
        "completed",
        "cancelled",
      ],
      listing_status: [
        "draft",
        "pending_review",
        "published",
        "paused",
        "sold",
        "rented",
        "archived",
        "deleted",
      ],
    },
  },
} as const
