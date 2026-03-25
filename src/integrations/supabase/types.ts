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
      abandoned_cart_events: {
        Row: {
          cart_id: string
          converted_at: string | null
          created_at: string | null
          customer_user_id: string | null
          guest_id: string | null
          id: string
          item_count: number | null
          status: string | null
          subtotal: number | null
          workspace_id: string | null
        }
        Insert: {
          cart_id: string
          converted_at?: string | null
          created_at?: string | null
          customer_user_id?: string | null
          guest_id?: string | null
          id?: string
          item_count?: number | null
          status?: string | null
          subtotal?: number | null
          workspace_id?: string | null
        }
        Update: {
          cart_id?: string
          converted_at?: string | null
          created_at?: string | null
          customer_user_id?: string | null
          guest_id?: string | null
          id?: string
          item_count?: number | null
          status?: string | null
          subtotal?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_cart_events_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "storefront_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_entries: {
        Row: {
          accounting_period: string
          amount: number
          country_code: string
          created_at: string | null
          currency: string
          description: string | null
          entry_type: string
          external_reference: string | null
          id: string
          lease_id: string | null
          org_id: string
          payment_method: string | null
          property_id: string | null
          rent_call_id: string | null
          tenant_id: string | null
          updated_at: string | null
          wallet_transaction_id: string | null
        }
        Insert: {
          accounting_period: string
          amount: number
          country_code: string
          created_at?: string | null
          currency?: string
          description?: string | null
          entry_type: string
          external_reference?: string | null
          id?: string
          lease_id?: string | null
          org_id: string
          payment_method?: string | null
          property_id?: string | null
          rent_call_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          wallet_transaction_id?: string | null
        }
        Update: {
          accounting_period?: string
          amount?: number
          country_code?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          entry_type?: string
          external_reference?: string | null
          id?: string
          lease_id?: string | null
          org_id?: string
          payment_method?: string | null
          property_id?: string | null
          rent_call_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_rent_call_id_fkey"
            columns: ["rent_call_id"]
            isOneToOne: false
            referencedRelation: "rent_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          orbit_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id: string
          metadata?: Json | null
          orbit_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          orbit_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ad_events: {
        Row: {
          cost_locs: number | null
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          metadata_json: Json | null
          placement: string
          referrer: string | null
          session_id: string | null
          shop_id: string | null
          target_id: string
          target_type: string
          user_id: string | null
        }
        Insert: {
          cost_locs?: number | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          metadata_json?: Json | null
          placement?: string
          referrer?: string | null
          session_id?: string | null
          shop_id?: string | null
          target_id: string
          target_type?: string
          user_id?: string | null
        }
        Update: {
          cost_locs?: number | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          metadata_json?: Json | null
          placement?: string
          referrer?: string | null
          session_id?: string | null
          shop_id?: string | null
          target_id?: string
          target_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          body: string | null
          context_id: string | null
          context_type: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          metadata_json: Json | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          workspace_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          body?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          metadata_json?: Json | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          workspace_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          body?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          metadata_json?: Json | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      ai_category_suggestions: {
        Row: {
          accepted: boolean | null
          created_at: string | null
          id: string
          input_text: string
          shop_id: string | null
          suggested_category: string | null
          suggested_subcategory: string | null
          suggested_tags: string[] | null
          suggested_vertical: string | null
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string | null
          id?: string
          input_text: string
          shop_id?: string | null
          suggested_category?: string | null
          suggested_subcategory?: string | null
          suggested_tags?: string[] | null
          suggested_vertical?: string | null
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string | null
          id?: string
          input_text?: string
          shop_id?: string | null
          suggested_category?: string | null
          suggested_subcategory?: string | null
          suggested_tags?: string[] | null
          suggested_vertical?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_category_suggestions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          thread_id: string
          token_estimate: number | null
          workspace_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          thread_id: string
          token_estimate?: number | null
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          thread_id?: string
          token_estimate?: number | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      ai_chat_threads: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string | null
          created_by: string | null
          id: string
          title: string | null
          workspace_id: string | null
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string | null
          workspace_id?: string | null
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      ai_chat_usage: {
        Row: {
          completion_tokens: number | null
          created_at: string | null
          id: string
          model: string | null
          prompt_tokens: number | null
          thread_id: string | null
          total_tokens: number | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string | null
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          thread_id?: string | null
          total_tokens?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string | null
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          thread_id?: string | null
          total_tokens?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      ai_ops_suggestions: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string | null
          id: string
          status: string | null
          suggestion_text: string
          suggestion_type: string
          title: string
          workspace_id: string | null
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          suggestion_text: string
          suggestion_type: string
          title: string
          workspace_id?: string | null
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          suggestion_text?: string
          suggestion_type?: string
          title?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      aml_events: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata_json: Json | null
          score: number | null
          severity: string | null
          shop_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata_json?: Json | null
          score?: number | null
          severity?: string | null
          shop_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata_json?: Json | null
          score?: number | null
          severity?: string | null
          shop_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      app_notifications: {
        Row: {
          body: string
          createdAt: string
          id: string
          metadata: Json | null
          orbitId: string
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body: string
          createdAt?: string
          id: string
          metadata?: Json | null
          orbitId: string
          read?: boolean
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string
          createdAt?: string
          id?: string
          metadata?: Json | null
          orbitId?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      approval_actions: {
        Row: {
          action_type: string
          actor_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          queue_id: string
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          queue_id: string
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          queue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "approval_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_queues: {
        Row: {
          approval_type: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          payload: Json | null
          priority: string | null
          queue_name: string
          requested_by: string | null
          requested_reason: string | null
          resolved_at: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          approval_type: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          payload?: Json | null
          priority?: string | null
          queue_name: string
          requested_by?: string | null
          requested_reason?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          approval_type?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          payload?: Json | null
          priority?: string | null
          queue_name?: string
          requested_by?: string | null
          requested_reason?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      audit_findings: {
        Row: {
          action_hint: string | null
          actual_state: string | null
          created_at: string | null
          details: string | null
          expected_state: string | null
          finding_group: string
          finding_key: string
          id: string
          report_id: string
          score_impact: number | null
          severity: string
          title: string
        }
        Insert: {
          action_hint?: string | null
          actual_state?: string | null
          created_at?: string | null
          details?: string | null
          expected_state?: string | null
          finding_group: string
          finding_key: string
          id?: string
          report_id: string
          score_impact?: number | null
          severity?: string
          title: string
        }
        Update: {
          action_hint?: string | null
          actual_state?: string | null
          created_at?: string | null
          details?: string | null
          expected_state?: string | null
          finding_group?: string
          finding_key?: string
          id?: string
          report_id?: string
          score_impact?: number | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "audit_reports"
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
          completed_at: string | null
          created_at: string
          created_by: string | null
          critical_count: number | null
          critical_issues: number
          global_score: number
          id: string
          info_count: number | null
          issues_json: Json
          modules_json: Json
          org_id: string | null
          report_type: string | null
          scan_type: string
          source: string
          status: string | null
          summary: string | null
          total_issues: number
          total_score: number | null
          warning_count: number | null
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          critical_count?: number | null
          critical_issues?: number
          global_score?: number
          id?: string
          info_count?: number | null
          issues_json?: Json
          modules_json?: Json
          org_id?: string | null
          report_type?: string | null
          scan_type?: string
          source?: string
          status?: string | null
          summary?: string | null
          total_issues?: number
          total_score?: number | null
          warning_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          critical_count?: number | null
          critical_issues?: number
          global_score?: number
          id?: string
          info_count?: number | null
          issues_json?: Json
          modules_json?: Json
          org_id?: string | null
          report_type?: string | null
          scan_type?: string
          source?: string
          status?: string | null
          summary?: string | null
          total_issues?: number
          total_score?: number | null
          warning_count?: number | null
          workspace_id?: string | null
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
      auto_repeat_orders: {
        Row: {
          created_at: string
          enabled: boolean
          frequency: string
          id: string
          last_triggered_at: string | null
          source_order_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_triggered_at?: string | null
          source_order_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_triggered_at?: string | null
          source_order_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_workflows: {
        Row: {
          city: string | null
          completed_at: string | null
          country_code: string | null
          created_at: string
          current_step: number
          entity_id: string
          entity_type: string
          executed_at: string | null
          failed_at: string | null
          id: string
          metadata_json: Json
          priority: number
          retry_count: number
          scheduled_at: string | null
          status: string
          steps_json: Json
          stop_reason: string | null
          trigger_source: string | null
          updated_at: string
          vertical: string | null
          workflow_type: string
        }
        Insert: {
          city?: string | null
          completed_at?: string | null
          country_code?: string | null
          created_at?: string
          current_step?: number
          entity_id: string
          entity_type: string
          executed_at?: string | null
          failed_at?: string | null
          id?: string
          metadata_json?: Json
          priority?: number
          retry_count?: number
          scheduled_at?: string | null
          status?: string
          steps_json?: Json
          stop_reason?: string | null
          trigger_source?: string | null
          updated_at?: string
          vertical?: string | null
          workflow_type: string
        }
        Update: {
          city?: string | null
          completed_at?: string | null
          country_code?: string | null
          created_at?: string
          current_step?: number
          entity_id?: string
          entity_type?: string
          executed_at?: string | null
          failed_at?: string | null
          id?: string
          metadata_json?: Json
          priority?: number
          retry_count?: number
          scheduled_at?: string | null
          status?: string
          steps_json?: Json
          stop_reason?: string | null
          trigger_source?: string | null
          updated_at?: string
          vertical?: string | null
          workflow_type?: string
        }
        Relationships: []
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
      bookings_v2: {
        Row: {
          amount: number
          buyer_orbit_id: string
          buyer_user_id: string
          check_in: string
          check_out: string
          conversation_id: string | null
          created_at: string | null
          currency: string
          guest_info: Json | null
          id: string
          listing_id: string
          owner_orbit_id: string
          owner_user_id: string
          status: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          buyer_orbit_id: string
          buyer_user_id: string
          check_in: string
          check_out: string
          conversation_id?: string | null
          created_at?: string | null
          currency?: string
          guest_info?: Json | null
          id?: string
          listing_id: string
          owner_orbit_id: string
          owner_user_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          buyer_orbit_id?: string
          buyer_user_id?: string
          check_in?: string
          check_out?: string
          conversation_id?: string | null
          created_at?: string | null
          currency?: string
          guest_info?: Json | null
          id?: string
          listing_id?: string
          owner_orbit_id?: string
          owner_user_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_v2_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "property_listings_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_analytics_daily: {
        Row: {
          campaign_id: string
          clicks: number | null
          cpl: number | null
          created_at: string | null
          ctr: number | null
          day: string
          id: string
          impressions: number | null
          leads: number | null
          roi_proxy: number | null
          spend: number | null
          top_creative_id: string | null
          top_geo: string | null
          top_slot: string | null
        }
        Insert: {
          campaign_id: string
          clicks?: number | null
          cpl?: number | null
          created_at?: string | null
          ctr?: number | null
          day: string
          id?: string
          impressions?: number | null
          leads?: number | null
          roi_proxy?: number | null
          spend?: number | null
          top_creative_id?: string | null
          top_geo?: string | null
          top_slot?: string | null
        }
        Update: {
          campaign_id?: string
          clicks?: number | null
          cpl?: number | null
          created_at?: string | null
          ctr?: number | null
          day?: string
          id?: string
          impressions?: number | null
          leads?: number | null
          roi_proxy?: number | null
          spend?: number | null
          top_creative_id?: string | null
          top_geo?: string | null
          top_slot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boost_analytics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "boost_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_campaigns: {
        Row: {
          bidding_mode: string | null
          campaign_type: string
          canonical_subcategory: string | null
          canonical_vertical: string | null
          city: string | null
          country: string | null
          created_at: string | null
          creative_set_id: string | null
          currency: string
          daily_budget: number | null
          end_at: string | null
          entity_id: string
          entity_type: string
          id: string
          lead_goal: number | null
          locale: string | null
          objective: string
          owner_user_id: string
          spent: number | null
          start_at: string | null
          status: string
          targeting_json: Json | null
          total_budget: number | null
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          bidding_mode?: string | null
          campaign_type?: string
          canonical_subcategory?: string | null
          canonical_vertical?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          creative_set_id?: string | null
          currency?: string
          daily_budget?: number | null
          end_at?: string | null
          entity_id: string
          entity_type?: string
          id?: string
          lead_goal?: number | null
          locale?: string | null
          objective?: string
          owner_user_id: string
          spent?: number | null
          start_at?: string | null
          status?: string
          targeting_json?: Json | null
          total_budget?: number | null
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          bidding_mode?: string | null
          campaign_type?: string
          canonical_subcategory?: string | null
          canonical_vertical?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          creative_set_id?: string | null
          currency?: string
          daily_budget?: number | null
          end_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          lead_goal?: number | null
          locale?: string | null
          objective?: string
          owner_user_id?: string
          spent?: number | null
          start_at?: string | null
          status?: string
          targeting_json?: Json | null
          total_budget?: number | null
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      boost_clicks: {
        Row: {
          campaign_id: string | null
          click_type: string | null
          clicked_at: string | null
          creative_id: string | null
          id: string
          session_id: string | null
          slot_id: string | null
          viewer_user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          click_type?: string | null
          clicked_at?: string | null
          creative_id?: string | null
          id?: string
          session_id?: string | null
          slot_id?: string | null
          viewer_user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          click_type?: string | null
          clicked_at?: string | null
          creative_id?: string | null
          id?: string
          session_id?: string | null
          slot_id?: string | null
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boost_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "boost_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_clicks_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "boost_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_clicks_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "boost_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_creatives: {
        Row: {
          campaign_id: string
          canonical_subcategory: string | null
          canonical_vertical: string | null
          created_at: string | null
          creative_type: string
          cta_label: string | null
          cta_target: string | null
          id: string
          image_url: string | null
          locale: string | null
          status: string
          subtitle: string | null
          theme_variant: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          campaign_id: string
          canonical_subcategory?: string | null
          canonical_vertical?: string | null
          created_at?: string | null
          creative_type?: string
          cta_label?: string | null
          cta_target?: string | null
          id?: string
          image_url?: string | null
          locale?: string | null
          status?: string
          subtitle?: string | null
          theme_variant?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          campaign_id?: string
          canonical_subcategory?: string | null
          canonical_vertical?: string | null
          created_at?: string | null
          creative_type?: string
          cta_label?: string | null
          cta_target?: string | null
          id?: string
          image_url?: string | null
          locale?: string | null
          status?: string
          subtitle?: string | null
          theme_variant?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boost_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "boost_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_impressions: {
        Row: {
          campaign_id: string | null
          city: string | null
          country: string | null
          creative_id: string | null
          entity_id: string | null
          id: string
          rendered_at: string | null
          session_id: string | null
          slot_id: string | null
          surface: string | null
          viewer_user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          creative_id?: string | null
          entity_id?: string | null
          id?: string
          rendered_at?: string | null
          session_id?: string | null
          slot_id?: string | null
          surface?: string | null
          viewer_user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          creative_id?: string | null
          entity_id?: string | null
          id?: string
          rendered_at?: string | null
          session_id?: string | null
          slot_id?: string | null
          surface?: string | null
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boost_impressions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "boost_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_impressions_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "boost_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_impressions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "boost_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_leads: {
        Row: {
          campaign_id: string | null
          canonical_subcategory: string | null
          canonical_vertical: string | null
          city: string | null
          contact_payload: Json | null
          country: string | null
          created_at: string | null
          customer_user_id: string | null
          guest_id: string | null
          id: string
          lead_type: string | null
          score: number | null
          source_slot: string | null
          source_surface: string | null
          status: string | null
          target_entity_id: string | null
          zone: string | null
        }
        Insert: {
          campaign_id?: string | null
          canonical_subcategory?: string | null
          canonical_vertical?: string | null
          city?: string | null
          contact_payload?: Json | null
          country?: string | null
          created_at?: string | null
          customer_user_id?: string | null
          guest_id?: string | null
          id?: string
          lead_type?: string | null
          score?: number | null
          source_slot?: string | null
          source_surface?: string | null
          status?: string | null
          target_entity_id?: string | null
          zone?: string | null
        }
        Update: {
          campaign_id?: string | null
          canonical_subcategory?: string | null
          canonical_vertical?: string | null
          city?: string | null
          contact_payload?: Json | null
          country?: string | null
          created_at?: string | null
          customer_user_id?: string | null
          guest_id?: string | null
          id?: string
          lead_type?: string | null
          score?: number | null
          source_slot?: string | null
          source_surface?: string | null
          status?: string | null
          target_entity_id?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boost_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "boost_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_leads_source_slot_fkey"
            columns: ["source_slot"]
            isOneToOne: false
            referencedRelation: "boost_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_purchases: {
        Row: {
          clicks: number | null
          conversions: number | null
          created_at: string
          ends_at: string
          id: string
          impressions_budget: number | null
          impressions_used: number | null
          locs_spent: number
          shop_id: string | null
          starts_at: string
          status: string
          target_id: string
          target_type: string
          tier: string
          user_id: string
        }
        Insert: {
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          ends_at: string
          id?: string
          impressions_budget?: number | null
          impressions_used?: number | null
          locs_spent?: number
          shop_id?: string | null
          starts_at?: string
          status?: string
          target_id: string
          target_type?: string
          tier?: string
          user_id: string
        }
        Update: {
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          ends_at?: string
          id?: string
          impressions_budget?: number | null
          impressions_used?: number | null
          locs_spent?: number
          shop_id?: string | null
          starts_at?: string
          status?: string
          target_id?: string
          target_type?: string
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_purchases_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_slots: {
        Row: {
          active: boolean | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          position_index: number | null
          rules_json: Json | null
          slot_key: string
          slot_type: string | null
          subcategory: string | null
          surface: string
          vertical: string | null
          zone: string | null
        }
        Insert: {
          active?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          position_index?: number | null
          rules_json?: Json | null
          slot_key: string
          slot_type?: string | null
          subcategory?: string | null
          surface: string
          vertical?: string | null
          zone?: string | null
        }
        Update: {
          active?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          position_index?: number | null
          rules_json?: Json | null
          slot_key?: string
          slot_type?: string | null
          subcategory?: string | null
          surface?: string
          vertical?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          active: boolean | null
          address: string | null
          brand_id: string
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          org_id: string
          phone: string | null
          shop_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          brand_id: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          org_id: string
          phone?: string | null
          shop_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          brand_id?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          org_id?: string
          phone?: string | null
          shop_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          org_id: string
          shop_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          org_id: string
          shop_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          org_id?: string
          shop_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
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
      business_compliance_profiles: {
        Row: {
          bank_account_last4: string | null
          bank_account_name: string | null
          beneficial_owner_id: string | null
          beneficial_owner_name: string | null
          company_type: string | null
          compliance_status: string | null
          created_at: string | null
          id: string
          incorporation_country: string | null
          legal_name: string | null
          payout_status: string | null
          pep_check_status: string | null
          risk_rating: string | null
          sanctions_check_status: string | null
          screening_last_run_at: string | null
          shop_id: string
          tax_number: string | null
          trade_license_number: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account_last4?: string | null
          bank_account_name?: string | null
          beneficial_owner_id?: string | null
          beneficial_owner_name?: string | null
          company_type?: string | null
          compliance_status?: string | null
          created_at?: string | null
          id?: string
          incorporation_country?: string | null
          legal_name?: string | null
          payout_status?: string | null
          pep_check_status?: string | null
          risk_rating?: string | null
          sanctions_check_status?: string | null
          screening_last_run_at?: string | null
          shop_id: string
          tax_number?: string | null
          trade_license_number?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_last4?: string | null
          bank_account_name?: string | null
          beneficial_owner_id?: string | null
          beneficial_owner_name?: string | null
          company_type?: string | null
          compliance_status?: string | null
          created_at?: string | null
          id?: string
          incorporation_country?: string | null
          legal_name?: string | null
          payout_status?: string | null
          pep_check_status?: string | null
          risk_rating?: string | null
          sanctions_check_status?: string | null
          screening_last_run_at?: string | null
          shop_id?: string
          tax_number?: string | null
          trade_license_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      business_videos: {
        Row: {
          area: string | null
          city: string | null
          created_at: string
          duration_sec: number | null
          ends_at: string | null
          id: string
          is_featured: boolean
          product_id: string | null
          public_url: string
          shop_id: string
          starts_at: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
          video_type: string
        }
        Insert: {
          area?: string | null
          city?: string | null
          created_at?: string
          duration_sec?: number | null
          ends_at?: string | null
          id?: string
          is_featured?: boolean
          product_id?: string | null
          public_url: string
          shop_id: string
          starts_at?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          video_type?: string
        }
        Update: {
          area?: string | null
          city?: string | null
          created_at?: string
          duration_sec?: number | null
          ends_at?: string | null
          id?: string
          is_featured?: boolean
          product_id?: string | null
          public_url?: string
          shop_id?: string
          starts_at?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          video_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_videos_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      call_auth_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          room_id: string
          scope: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          room_id: string
          scope?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          room_id?: string
          scope?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      call_device_identities: {
        Row: {
          created_at: string
          device_id: string
          id: string
          key_version: number
          last_seen_at: string | null
          public_key_jwk: Json
          trusted: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          key_version?: number
          last_seen_at?: string | null
          public_key_jwk: Json
          trusted?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          key_version?: number
          last_seen_at?: string | null
          public_key_jwk?: Json
          trusted?: boolean
          user_id?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          answered_at: string | null
          call_type: string
          caller_orbit_id: string
          conversation_id: string
          created_at: string
          direction: string
          duration_sec: number
          ended_at: string | null
          id: string
          receiver_orbit_id: string
          session_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          answered_at?: string | null
          call_type?: string
          caller_orbit_id: string
          conversation_id: string
          created_at?: string
          direction: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          receiver_orbit_id: string
          session_id?: string | null
          started_at?: string | null
          status: string
        }
        Update: {
          answered_at?: string | null
          call_type?: string
          caller_orbit_id?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          receiver_orbit_id?: string
          session_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      call_participants: {
        Row: {
          call_session_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          call_session_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          call_session_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      call_security_events: {
        Row: {
          created_at: string
          detail_minimal: string | null
          event_type: string
          id: string
          room_id: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail_minimal?: string | null
          event_type: string
          id?: string
          room_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail_minimal?: string | null
          event_type?: string
          id?: string
          room_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      call_sessions: {
        Row: {
          answered_at: string | null
          call_type: string
          caller_orbit_id: string | null
          conversation_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          initiator_id: string
          metadata_json: Json | null
          receiver_orbit_id: string | null
          recipient_id: string | null
          started_at: string | null
          status: string
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          answered_at?: string | null
          call_type?: string
          caller_orbit_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiator_id: string
          metadata_json?: Json | null
          receiver_orbit_id?: string | null
          recipient_id?: string | null
          started_at?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          answered_at?: string | null
          call_type?: string
          caller_orbit_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiator_id?: string
          metadata_json?: Json | null
          receiver_orbit_id?: string | null
          recipient_id?: string | null
          started_at?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      call_signals: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          sender_orbit_id: string
          session_id: string
          signal_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          sender_orbit_id: string
          session_id: string
          signal_type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          sender_orbit_id?: string
          session_id?: string
          signal_type?: string
        }
        Relationships: []
      }
      call_transcripts: {
        Row: {
          call_session_id: string
          created_at: string | null
          id: string
          source_locale: string | null
          speaker_user_id: string | null
          transcript_text: string
          translated_locale: string | null
          translated_text: string | null
        }
        Insert: {
          call_session_id: string
          created_at?: string | null
          id?: string
          source_locale?: string | null
          speaker_user_id?: string | null
          transcript_text: string
          translated_locale?: string | null
          translated_text?: string | null
        }
        Update: {
          call_session_id?: string
          created_at?: string | null
          id?: string
          source_locale?: string | null
          speaker_user_id?: string | null
          transcript_text?: string
          translated_locale?: string | null
          translated_text?: string | null
        }
        Relationships: []
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
      canonical_attribute_definitions: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          filterable: boolean | null
          id: string
          key: string
          label: string
          required: boolean | null
          searchable: boolean | null
          sortable: boolean | null
          subcategory: string | null
          unit_group_id: string | null
          value_type: string
          vertical: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          filterable?: boolean | null
          id?: string
          key: string
          label: string
          required?: boolean | null
          searchable?: boolean | null
          sortable?: boolean | null
          subcategory?: string | null
          unit_group_id?: string | null
          value_type?: string
          vertical?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          filterable?: boolean | null
          id?: string
          key?: string
          label?: string
          required?: boolean | null
          searchable?: boolean | null
          sortable?: boolean | null
          subcategory?: string | null
          unit_group_id?: string | null
          value_type?: string
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canonical_attribute_definitions_unit_group_id_fkey"
            columns: ["unit_group_id"]
            isOneToOne: false
            referencedRelation: "canonical_unit_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_categories: {
        Row: {
          active: boolean
          created_at: string | null
          emoji: string | null
          family_id: string
          icon: string | null
          id: string
          image_url: string | null
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          emoji?: string | null
          family_id: string
          icon?: string | null
          id?: string
          image_url?: string | null
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          emoji?: string | null
          family_id?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "canonical_categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "canonical_families"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_families: {
        Row: {
          active: boolean
          created_at: string | null
          emoji: string | null
          id: string
          key: string
          label: string
          sort_order: number
          vertical_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          emoji?: string | null
          id?: string
          key: string
          label: string
          sort_order?: number
          vertical_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          emoji?: string | null
          id?: string
          key?: string
          label?: string
          sort_order?: number
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_families_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "canonical_verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_subcategories: {
        Row: {
          active: boolean
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "canonical_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "canonical_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_synonyms: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          id: string
          language: string
          normalized_term: string
          source_term: string
          subcategory: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          language?: string
          normalized_term: string
          source_term: string
          subcategory?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          language?: string
          normalized_term?: string
          source_term?: string
          subcategory?: string | null
        }
        Relationships: []
      }
      canonical_tags: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          key: string
          label: string
          tag_type: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          key: string
          label: string
          tag_type?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          key?: string
          label?: string
          tag_type?: string
        }
        Relationships: []
      }
      canonical_taxonomy: {
        Row: {
          canonical_name: string
          created_at: string
          depth_level: number
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          parent_id: string | null
          slug: string
          vertical: string
        }
        Insert: {
          canonical_name: string
          created_at?: string
          depth_level?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          parent_id?: string | null
          slug: string
          vertical: string
        }
        Update: {
          canonical_name?: string
          created_at?: string
          depth_level?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          parent_id?: string | null
          slug?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_taxonomy_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "canonical_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_unit_groups: {
        Row: {
          created_at: string | null
          id: string
          key: string
          label: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          label: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      canonical_units: {
        Row: {
          active: boolean | null
          conversion_factor: number | null
          created_at: string | null
          group_id: string
          id: string
          key: string
          label: string
          symbol: string
        }
        Insert: {
          active?: boolean | null
          conversion_factor?: number | null
          created_at?: string | null
          group_id: string
          id?: string
          key: string
          label: string
          symbol: string
        }
        Update: {
          active?: boolean | null
          conversion_factor?: number | null
          created_at?: string | null
          group_id?: string
          id?: string
          key?: string
          label?: string
          symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_units_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "canonical_unit_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_verticals: {
        Row: {
          active: boolean
          created_at: string | null
          emoji: string | null
          id: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          emoji?: string | null
          id?: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          emoji?: string | null
          id?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      catalog_items: {
        Row: {
          available: boolean | null
          brand_name: string | null
          canonical_category: string | null
          canonical_family: string | null
          canonical_subcategory: string | null
          canonical_vertical: string | null
          category_id: string | null
          category_ref_id: string | null
          compare_at_price: number | null
          completeness_score: number | null
          conversion_score: number | null
          cover_image_url: string | null
          created_at: string | null
          created_by_test: boolean
          currency: string | null
          data_quality_score: number | null
          default_unit: string | null
          description: string | null
          dimensions_json: Json | null
          family_id: string | null
          freshness_score: number | null
          gallery_urls: Json | null
          hero_image_url: string | null
          id: string
          is_test: boolean
          item_type: string | null
          merchandising_score: number | null
          metadata_json: Json | null
          moderation_status: string | null
          origin_country: string | null
          packshot_image_url: string | null
          photo_url: string | null
          photo_urls: Json | null
          price: number | null
          product_type: string | null
          quality_score: number | null
          readiness_score: number | null
          search_quality_score: number | null
          searchable_text: unknown
          seo_description: string | null
          seo_title: string | null
          shop_id: string
          short_description: string | null
          sku: string | null
          slug: string | null
          sort_order: number | null
          specifications: Json | null
          stock_quantity: number | null
          subcategory_ref_id: string | null
          tags: string[] | null
          tax_code: string | null
          taxonomy_quality_score: number | null
          test_batch_id: string | null
          title: string
          track_inventory: boolean | null
          updated_at: string | null
          user_id: string
          vertical_id: string | null
          video_url: string | null
          visibility_score: number | null
          visual_quality_score: number | null
          warranty_info: string | null
          weight_grams: number | null
        }
        Insert: {
          available?: boolean | null
          brand_name?: string | null
          canonical_category?: string | null
          canonical_family?: string | null
          canonical_subcategory?: string | null
          canonical_vertical?: string | null
          category_id?: string | null
          category_ref_id?: string | null
          compare_at_price?: number | null
          completeness_score?: number | null
          conversion_score?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by_test?: boolean
          currency?: string | null
          data_quality_score?: number | null
          default_unit?: string | null
          description?: string | null
          dimensions_json?: Json | null
          family_id?: string | null
          freshness_score?: number | null
          gallery_urls?: Json | null
          hero_image_url?: string | null
          id?: string
          is_test?: boolean
          item_type?: string | null
          merchandising_score?: number | null
          metadata_json?: Json | null
          moderation_status?: string | null
          origin_country?: string | null
          packshot_image_url?: string | null
          photo_url?: string | null
          photo_urls?: Json | null
          price?: number | null
          product_type?: string | null
          quality_score?: number | null
          readiness_score?: number | null
          search_quality_score?: number | null
          searchable_text?: unknown
          seo_description?: string | null
          seo_title?: string | null
          shop_id: string
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          sort_order?: number | null
          specifications?: Json | null
          stock_quantity?: number | null
          subcategory_ref_id?: string | null
          tags?: string[] | null
          tax_code?: string | null
          taxonomy_quality_score?: number | null
          test_batch_id?: string | null
          title: string
          track_inventory?: boolean | null
          updated_at?: string | null
          user_id: string
          vertical_id?: string | null
          video_url?: string | null
          visibility_score?: number | null
          visual_quality_score?: number | null
          warranty_info?: string | null
          weight_grams?: number | null
        }
        Update: {
          available?: boolean | null
          brand_name?: string | null
          canonical_category?: string | null
          canonical_family?: string | null
          canonical_subcategory?: string | null
          canonical_vertical?: string | null
          category_id?: string | null
          category_ref_id?: string | null
          compare_at_price?: number | null
          completeness_score?: number | null
          conversion_score?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by_test?: boolean
          currency?: string | null
          data_quality_score?: number | null
          default_unit?: string | null
          description?: string | null
          dimensions_json?: Json | null
          family_id?: string | null
          freshness_score?: number | null
          gallery_urls?: Json | null
          hero_image_url?: string | null
          id?: string
          is_test?: boolean
          item_type?: string | null
          merchandising_score?: number | null
          metadata_json?: Json | null
          moderation_status?: string | null
          origin_country?: string | null
          packshot_image_url?: string | null
          photo_url?: string | null
          photo_urls?: Json | null
          price?: number | null
          product_type?: string | null
          quality_score?: number | null
          readiness_score?: number | null
          search_quality_score?: number | null
          searchable_text?: unknown
          seo_description?: string | null
          seo_title?: string | null
          shop_id?: string
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          sort_order?: number | null
          specifications?: Json | null
          stock_quantity?: number | null
          subcategory_ref_id?: string | null
          tags?: string[] | null
          tax_code?: string | null
          taxonomy_quality_score?: number | null
          test_batch_id?: string | null
          title?: string
          track_inventory?: boolean | null
          updated_at?: string | null
          user_id?: string
          vertical_id?: string | null
          video_url?: string | null
          visibility_score?: number | null
          visual_quality_score?: number | null
          warranty_info?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_category_ref_id_fkey"
            columns: ["category_ref_id"]
            isOneToOne: false
            referencedRelation: "canonical_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "canonical_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_subcategory_ref_id_fkey"
            columns: ["subcategory_ref_id"]
            isOneToOne: false
            referencedRelation: "canonical_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "canonical_verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_media: {
        Row: {
          active: boolean | null
          alt_text: string | null
          background_removed: boolean | null
          created_at: string | null
          entity_id: string | null
          height: number | null
          id: string
          is_primary: boolean | null
          media_type: string
          moderation_status: string | null
          product_id: string | null
          quality_score: number | null
          sort_order: number | null
          source_type: string | null
          url: string
          variant_id: string | null
          width: number | null
        }
        Insert: {
          active?: boolean | null
          alt_text?: string | null
          background_removed?: boolean | null
          created_at?: string | null
          entity_id?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean | null
          media_type?: string
          moderation_status?: string | null
          product_id?: string | null
          quality_score?: number | null
          sort_order?: number | null
          source_type?: string | null
          url: string
          variant_id?: string | null
          width?: number | null
        }
        Update: {
          active?: boolean | null
          alt_text?: string | null
          background_removed?: boolean | null
          created_at?: string | null
          entity_id?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean | null
          media_type?: string
          moderation_status?: string | null
          product_id?: string | null
          quality_score?: number | null
          sort_order?: number | null
          source_type?: string | null
          url?: string
          variant_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_media_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_product_attributes: {
        Row: {
          attribute_definition_id: string
          id: string
          product_id: string
          value_bool: boolean | null
          value_json: Json | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          attribute_definition_id: string
          id?: string
          product_id: string
          value_bool?: boolean | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          attribute_definition_id?: string
          id?: string
          product_id?: string
          value_bool?: boolean | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_product_attributes_attribute_definition_id_fkey"
            columns: ["attribute_definition_id"]
            isOneToOne: false
            referencedRelation: "canonical_attribute_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_product_tags: {
        Row: {
          id: string
          product_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          product_id: string
          tag_id: string
        }
        Update: {
          id?: string
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_product_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "canonical_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_translations: {
        Row: {
          created_at: string | null
          entity_id: string | null
          field_key: string
          id: string
          language: string
          product_id: string | null
          translated_value: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          field_key: string
          id?: string
          language: string
          product_id?: string | null
          translated_value: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          field_key?: string
          id?: string
          language?: string
          product_id?: string | null
          translated_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_variants: {
        Row: {
          available: boolean | null
          barcode: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string | null
          currency: string | null
          id: string
          in_stock: boolean | null
          item_id: string
          name: string
          pack_quantity: number | null
          price: number | null
          price_adjustment: number | null
          size: string | null
          sku: string | null
          sort_order: number | null
          stock_quantity: number | null
          unit: string | null
          variant_label: string | null
          volume: number | null
          weight: number | null
        }
        Insert: {
          available?: boolean | null
          barcode?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          in_stock?: boolean | null
          item_id: string
          name: string
          pack_quantity?: number | null
          price?: number | null
          price_adjustment?: number | null
          size?: string | null
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number | null
          unit?: string | null
          variant_label?: string | null
          volume?: number | null
          weight?: number | null
        }
        Update: {
          available?: boolean | null
          barcode?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          in_stock?: boolean | null
          item_id?: string
          name?: string
          pack_quantity?: number | null
          price?: number | null
          price_adjustment?: number | null
          size?: string | null
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number | null
          unit?: string | null
          variant_label?: string | null
          volume?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_variants_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
          vertical_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          vertical_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      category_attributes: {
        Row: {
          attribute_key: string
          attribute_label: string
          attribute_type: string | null
          category_id: string | null
          created_at: string | null
          id: string
          options: Json | null
          required: boolean | null
          sort_order: number | null
          subcategory_id: string | null
        }
        Insert: {
          attribute_key: string
          attribute_label: string
          attribute_type?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          options?: Json | null
          required?: boolean | null
          sort_order?: number | null
          subcategory_id?: string | null
        }
        Update: {
          attribute_key?: string
          attribute_label?: string
          attribute_type?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          options?: Json | null
          required?: boolean | null
          sort_order?: number | null
          subcategory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_attributes_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_cleanup_tasks: {
        Row: {
          applied: boolean | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          old_value: string
          proposed_value: string
        }
        Insert: {
          applied?: boolean | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          old_value: string
          proposed_value: string
        }
        Update: {
          applied?: boolean | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          old_value?: string
          proposed_value?: string
        }
        Relationships: []
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
      chat_attachments: {
        Row: {
          conversation_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          message_id: string | null
          sender_orbit_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id: string
          message_id?: string | null
          sender_orbit_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id?: string | null
          sender_orbit_id?: string
        }
        Relationships: []
      }
      chat_messages_v2: {
        Row: {
          body: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          receiver_orbit_id: string | null
          sender_orbit_id: string
          sender_user_id: string
          type: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          receiver_orbit_id?: string | null
          sender_orbit_id: string
          sender_user_id: string
          type?: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          receiver_orbit_id?: string | null
          sender_orbit_id?: string
          sender_user_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_v2_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_risk_profiles: {
        Row: {
          churn_score: number | null
          created_at: string | null
          drivers: Json | null
          entity_id: string
          entity_type: string
          id: string
          last_activity_at: string | null
          last_order_at: string | null
          prediction_window_days: number | null
          risk_band: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          churn_score?: number | null
          created_at?: string | null
          drivers?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          last_activity_at?: string | null
          last_order_at?: string | null
          prediction_window_days?: number | null
          risk_band?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          churn_score?: number | null
          created_at?: string | null
          drivers?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          last_activity_at?: string | null
          last_order_at?: string | null
          prediction_window_days?: number | null
          risk_band?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      city_supply_balancer_logs: {
        Row: {
          action_type: string | null
          city: string | null
          created_at: string | null
          current_driver_count: number | null
          id: string
          metadata_json: Json | null
          suggested_driver_ids: string[] | null
          target_driver_count: number | null
          zone_key: string | null
        }
        Insert: {
          action_type?: string | null
          city?: string | null
          created_at?: string | null
          current_driver_count?: number | null
          id?: string
          metadata_json?: Json | null
          suggested_driver_ids?: string[] | null
          target_driver_count?: number | null
          zone_key?: string | null
        }
        Update: {
          action_type?: string | null
          city?: string | null
          created_at?: string | null
          current_driver_count?: number | null
          id?: string
          metadata_json?: Json | null
          suggested_driver_ids?: string[] | null
          target_driver_count?: number | null
          zone_key?: string | null
        }
        Relationships: []
      }
      claim_attempts: {
        Row: {
          created_at: string | null
          flagged: boolean | null
          id: string
          ip_address: string | null
          merchant_profile_id: string | null
          status: string | null
          user_id: string | null
          verification_method: string | null
          verification_value: string | null
        }
        Insert: {
          created_at?: string | null
          flagged?: boolean | null
          id?: string
          ip_address?: string | null
          merchant_profile_id?: string | null
          status?: string | null
          user_id?: string | null
          verification_method?: string | null
          verification_value?: string | null
        }
        Update: {
          created_at?: string | null
          flagged?: boolean | null
          id?: string
          ip_address?: string | null
          merchant_profile_id?: string | null
          status?: string | null
          user_id?: string | null
          verification_method?: string | null
          verification_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_attempts_merchant_profile_id_fkey"
            columns: ["merchant_profile_id"]
            isOneToOne: false
            referencedRelation: "merchant_onboarding_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_learning: {
        Row: {
          corrected_by: string | null
          corrected_subcategory: string | null
          corrected_vertical: string
          correction_count: number | null
          created_at: string | null
          id: string
          old_vertical: string
          pattern_key: string
          source_subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          corrected_by?: string | null
          corrected_subcategory?: string | null
          corrected_vertical: string
          correction_count?: number | null
          created_at?: string | null
          id?: string
          old_vertical: string
          pattern_key: string
          source_subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          corrected_by?: string | null
          corrected_subcategory?: string | null
          corrected_vertical?: string
          correction_count?: number | null
          created_at?: string | null
          id?: string
          old_vertical?: string
          pattern_key?: string
          source_subcategory?: string | null
          updated_at?: string | null
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
      commission_rules: {
        Row: {
          active: boolean
          city: string | null
          commission_discount: number
          commission_mode: string
          commission_rate: number
          country_code: string
          created_at: string
          id: string
          updated_at: string
          vertical: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          commission_discount?: number
          commission_mode?: string
          commission_rate?: number
          country_code: string
          created_at?: string
          id?: string
          updated_at?: string
          vertical: string
        }
        Update: {
          active?: boolean
          city?: string | null
          commission_discount?: number
          commission_mode?: string
          commission_rate?: number
          country_code?: string
          created_at?: string
          id?: string
          updated_at?: string
          vertical?: string
        }
        Relationships: []
      }
      commission_splits: {
        Row: {
          created_at: string
          currency: string
          driver_amount: number
          driver_rate: number
          driver_user_id: string | null
          id: string
          order_id: string | null
          platform_amount: number
          platform_rate: number
          settled_at: string | null
          status: string
          store_amount: number
          store_rate: number
          store_user_id: string | null
          total_amount: number
          transaction_intent_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          driver_amount?: number
          driver_rate?: number
          driver_user_id?: string | null
          id?: string
          order_id?: string | null
          platform_amount?: number
          platform_rate?: number
          settled_at?: string | null
          status?: string
          store_amount?: number
          store_rate?: number
          store_user_id?: string | null
          total_amount: number
          transaction_intent_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          driver_amount?: number
          driver_rate?: number
          driver_user_id?: string | null
          id?: string
          order_id?: string | null
          platform_amount?: number
          platform_rate?: number
          settled_at?: string | null
          status?: string
          store_amount?: number
          store_rate?: number
          store_user_id?: string | null
          total_amount?: number
          transaction_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_splits_transaction_intent_id_fkey"
            columns: ["transaction_intent_id"]
            isOneToOne: false
            referencedRelation: "transaction_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          org_id: string
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          org_id: string
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          org_id?: string
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_price_snapshots: {
        Row: {
          area: string | null
          competitor_name: string
          currency: string | null
          id: string
          item_name: string
          merchant_profile_id: string | null
          metadata: Json | null
          observed_at: string | null
          observed_price: number
          workspace_id: string | null
        }
        Insert: {
          area?: string | null
          competitor_name: string
          currency?: string | null
          id?: string
          item_name: string
          merchant_profile_id?: string | null
          metadata?: Json | null
          observed_at?: string | null
          observed_price: number
          workspace_id?: string | null
        }
        Update: {
          area?: string | null
          competitor_name?: string
          currency?: string | null
          id?: string
          item_name?: string
          merchant_profile_id?: string | null
          metadata?: Json | null
          observed_at?: string | null
          observed_price?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      compliance_cases: {
        Row: {
          assigned_to: string | null
          case_type: string
          created_at: string | null
          id: string
          notes: string | null
          severity: string | null
          shop_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          case_type: string
          created_at?: string | null
          id?: string
          notes?: string | null
          severity?: string | null
          shop_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          case_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          severity?: string | null
          shop_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          anchor_lat: number | null
          anchor_lng: number | null
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
          coverage_mode: string
          coverage_radius_m: number | null
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number | null
          entity_type: string
          id: string
          lat: number | null
          live_lat: number | null
          live_lng: number | null
          live_updated_at: string | null
          lng: number | null
          location: string | null
          max_capacity: number | null
          org_id: string
          payment_methods: Json | null
          paypal_email: string | null
          photo_url: string | null
          photo_urls: Json | null
          presence_mode: string
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
          anchor_lat?: number | null
          anchor_lng?: number | null
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
          coverage_mode?: string
          coverage_radius_m?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          entity_type?: string
          id?: string
          lat?: number | null
          live_lat?: number | null
          live_lng?: number | null
          live_updated_at?: string | null
          lng?: number | null
          location?: string | null
          max_capacity?: number | null
          org_id: string
          payment_methods?: Json | null
          paypal_email?: string | null
          photo_url?: string | null
          photo_urls?: Json | null
          presence_mode?: string
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
          anchor_lat?: number | null
          anchor_lng?: number | null
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
          coverage_mode?: string
          coverage_radius_m?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          entity_type?: string
          id?: string
          lat?: number | null
          live_lat?: number | null
          live_lng?: number | null
          live_updated_at?: string | null
          lng?: number | null
          location?: string | null
          max_capacity?: number | null
          org_id?: string
          payment_methods?: Json | null
          paypal_email?: string | null
          photo_url?: string | null
          photo_urls?: Json | null
          presence_mode?: string
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
          cleared_at: string | null
          context_id: string
          created_at: string | null
          favorited: boolean | null
          id: string
          muted: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          cleared_at?: string | null
          context_id: string
          created_at?: string | null
          favorited?: boolean | null
          id?: string
          muted?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean | null
          cleared_at?: string | null
          context_id?: string
          created_at?: string | null
          favorited?: boolean | null
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
      conversations_v2: {
        Row: {
          booking_id: string | null
          created_at: string | null
          created_by_orbit_id: string | null
          id: string
          last_message_at: string | null
          lease_id: string | null
          listing_id: string | null
          participants: Json
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          created_by_orbit_id?: string | null
          id?: string
          last_message_at?: string | null
          lease_id?: string | null
          listing_id?: string | null
          participants?: Json
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          created_by_orbit_id?: string | null
          id?: string
          last_message_at?: string | null
          lease_id?: string | null
          listing_id?: string | null
          participants?: Json
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order_amount: number | null
          shop_id: string | null
          status: string
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          shop_id?: string | null
          status?: string
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          shop_id?: string | null
          status?: string
          used_count?: number | null
        }
        Relationships: []
      }
      cross_service_journeys: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string
          journey_type: string
          metadata: Json | null
          started_at: string | null
          status: string | null
          steps: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          journey_type: string
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          steps?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          journey_type?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          steps?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      current_ranking_state: {
        Row: {
          boost_ready: boolean
          claim_ready: boolean
          entity_id: string
          entity_type: string
          global_rank_score: number
          ranking_reason_json: Json | null
          updated_at: string | null
          visibility_class: string
        }
        Insert: {
          boost_ready?: boolean
          claim_ready?: boolean
          entity_id: string
          entity_type: string
          global_rank_score?: number
          ranking_reason_json?: Json | null
          updated_at?: string | null
          visibility_class?: string
        }
        Update: {
          boost_ready?: boolean
          claim_ready?: boolean
          entity_id?: string
          entity_type?: string
          global_rank_score?: number
          ranking_reason_json?: Json | null
          updated_at?: string | null
          visibility_class?: string
        }
        Relationships: []
      }
      customer_recommendations: {
        Row: {
          created_at: string | null
          guest_id: string | null
          id: string
          menu_item_id: string | null
          merchant_profile_id: string | null
          reason: string | null
          score: number | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          guest_id?: string | null
          id?: string
          menu_item_id?: string | null
          merchant_profile_id?: string | null
          reason?: string | null
          score?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          guest_id?: string | null
          id?: string
          menu_item_id?: string | null
          merchant_profile_id?: string | null
          reason?: string | null
          score?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      customer_relationships: {
        Row: {
          bookings_count: number
          churn_risk: number
          created_at: string
          currency: string
          customer_id: string
          favorite_provider_id: string | null
          favorite_store_id: string | null
          favorite_universe: string | null
          first_interaction_at: string
          first_order_at: string | null
          id: string
          is_favorite: boolean
          is_vip: boolean
          last_booking_at: string | null
          last_order_at: string | null
          last_seen_at: string | null
          lifetime_value: number
          loyalty_points: number
          loyalty_tier: string | null
          merchant_id: string
          orders_count: number
          preferred_categories: string[] | null
          preferred_payment_method: string | null
          reactivation_eligible: boolean
          reactivation_score: number
          shop_id: string | null
          total_bookings: number
          total_orders: number
          updated_at: string
        }
        Insert: {
          bookings_count?: number
          churn_risk?: number
          created_at?: string
          currency?: string
          customer_id: string
          favorite_provider_id?: string | null
          favorite_store_id?: string | null
          favorite_universe?: string | null
          first_interaction_at?: string
          first_order_at?: string | null
          id?: string
          is_favorite?: boolean
          is_vip?: boolean
          last_booking_at?: string | null
          last_order_at?: string | null
          last_seen_at?: string | null
          lifetime_value?: number
          loyalty_points?: number
          loyalty_tier?: string | null
          merchant_id: string
          orders_count?: number
          preferred_categories?: string[] | null
          preferred_payment_method?: string | null
          reactivation_eligible?: boolean
          reactivation_score?: number
          shop_id?: string | null
          total_bookings?: number
          total_orders?: number
          updated_at?: string
        }
        Update: {
          bookings_count?: number
          churn_risk?: number
          created_at?: string
          currency?: string
          customer_id?: string
          favorite_provider_id?: string | null
          favorite_store_id?: string | null
          favorite_universe?: string | null
          first_interaction_at?: string
          first_order_at?: string | null
          id?: string
          is_favorite?: boolean
          is_vip?: boolean
          last_booking_at?: string | null
          last_order_at?: string | null
          last_seen_at?: string | null
          lifetime_value?: number
          loyalty_points?: number
          loyalty_tier?: string | null
          merchant_id?: string
          orders_count?: number
          preferred_categories?: string[] | null
          preferred_payment_method?: string | null
          reactivation_eligible?: boolean
          reactivation_score?: number
          shop_id?: string | null
          total_bookings?: number
          total_orders?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_relationships_favorite_store_id_fkey"
            columns: ["favorite_store_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_relationships_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
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
          expires_at: string | null
          id: string
          round_number: number | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          data_json?: Json | null
          deal_id: string
          event_type: string
          expires_at?: string | null
          id?: string
          round_number?: number | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          data_json?: Json | null
          deal_id?: string
          event_type?: string
          expires_at?: string | null
          id?: string
          round_number?: number | null
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
          converted_delivery_job_id: string | null
          converted_invoice_id: string | null
          converted_order_id: string | null
          converted_payment_id: string | null
          counter_offer_amount: number | null
          created_at: string
          current_offer_amount: number | null
          current_offer_currency: string | null
          id: string
          metadata_json: Json | null
          negotiation_round: number | null
          notes: string | null
          offer_expires_at: string | null
          org_id: string
          seller_id: string | null
          shop_id: string | null
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
          converted_delivery_job_id?: string | null
          converted_invoice_id?: string | null
          converted_order_id?: string | null
          converted_payment_id?: string | null
          counter_offer_amount?: number | null
          created_at?: string
          current_offer_amount?: number | null
          current_offer_currency?: string | null
          id?: string
          metadata_json?: Json | null
          negotiation_round?: number | null
          notes?: string | null
          offer_expires_at?: string | null
          org_id: string
          seller_id?: string | null
          shop_id?: string | null
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
          converted_delivery_job_id?: string | null
          converted_invoice_id?: string | null
          converted_order_id?: string | null
          converted_payment_id?: string | null
          counter_offer_amount?: number | null
          created_at?: string
          current_offer_amount?: number | null
          current_offer_currency?: string | null
          id?: string
          metadata_json?: Json | null
          negotiation_round?: number | null
          notes?: string | null
          offer_expires_at?: string | null
          org_id?: string
          seller_id?: string | null
          shop_id?: string | null
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
            foreignKeyName: "deal_rooms_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
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
      delivery_disputes: {
        Row: {
          created_at: string | null
          description: string | null
          evidence_urls: Json | null
          id: string
          job_id: string
          org_id: string | null
          raised_by: string
          raised_by_role: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          evidence_urls?: Json | null
          id?: string
          job_id: string
          org_id?: string | null
          raised_by: string
          raised_by_role: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          evidence_urls?: Json | null
          id?: string
          job_id?: string
          org_id?: string | null
          raised_by?: string
          raised_by_role?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_disputes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "delivery_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_disputes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_disputes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_eta_predictions: {
        Row: {
          area: string | null
          confidence: number | null
          created_at: string | null
          dispatch_job_id: string | null
          driver_user_id: string | null
          id: string
          merchant_profile_id: string | null
          order_id: string | null
          prep_time_min: number | null
          queue_time_min: number | null
          total_eta_min: number | null
          travel_time_min: number | null
          workspace_id: string | null
        }
        Insert: {
          area?: string | null
          confidence?: number | null
          created_at?: string | null
          dispatch_job_id?: string | null
          driver_user_id?: string | null
          id?: string
          merchant_profile_id?: string | null
          order_id?: string | null
          prep_time_min?: number | null
          queue_time_min?: number | null
          total_eta_min?: number | null
          travel_time_min?: number | null
          workspace_id?: string | null
        }
        Update: {
          area?: string | null
          confidence?: number | null
          created_at?: string | null
          dispatch_job_id?: string | null
          driver_user_id?: string | null
          id?: string
          merchant_profile_id?: string | null
          order_id?: string | null
          prep_time_min?: number | null
          queue_time_min?: number | null
          total_eta_min?: number | null
          travel_time_min?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_eta_predictions_dispatch_job_id_fkey"
            columns: ["dispatch_job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_eta_predictions_merchant_profile_id_fkey"
            columns: ["merchant_profile_id"]
            isOneToOne: false
            referencedRelation: "merchant_onboarding_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_eta_predictions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_jobs: {
        Row: {
          accepted_at: string | null
          assigned_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          confirmation_code: string | null
          created_at: string | null
          currency: string | null
          delivered_at: string | null
          delivery_fee: number | null
          driver_id: string | null
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          id: string
          notes: string | null
          order_id: string | null
          org_id: string
          package_description: string | null
          package_size: string | null
          photo_proof_url: string | null
          picked_up_at: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          pricing_mode: string | null
          priority: string
          reassignment_count: number | null
          required_vehicles: string[] | null
          scheduled_at: string | null
          seller_id: string
          status: string
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          confirmation_code?: string | null
          created_at?: string | null
          currency?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          driver_id?: string | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          notes?: string | null
          order_id?: string | null
          org_id: string
          package_description?: string | null
          package_size?: string | null
          photo_proof_url?: string | null
          picked_up_at?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pricing_mode?: string | null
          priority?: string
          reassignment_count?: number | null
          required_vehicles?: string[] | null
          scheduled_at?: string | null
          seller_id: string
          status?: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          confirmation_code?: string | null
          created_at?: string | null
          currency?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          driver_id?: string | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          notes?: string | null
          order_id?: string | null
          org_id?: string
          package_description?: string | null
          package_size?: string | null
          photo_proof_url?: string | null
          picked_up_at?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pricing_mode?: string | null
          priority?: string
          reassignment_count?: number | null
          required_vehicles?: string[] | null
          scheduled_at?: string | null
          seller_id?: string
          status?: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_missions: {
        Row: {
          accepted_at: string | null
          assigned_driver_id: string | null
          broadcast_radius_km: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          drop_address: string | null
          drop_lat: number
          drop_lng: number
          id: string
          order_id: string
          picked_up_at: string | null
          pickup_address: string | null
          pickup_lat: number
          pickup_lng: number
          price: number
          retry_count: number | null
          seller_id: string
          seller_shop_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_driver_id?: string | null
          broadcast_radius_km?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          drop_address?: string | null
          drop_lat: number
          drop_lng: number
          id?: string
          order_id: string
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat: number
          pickup_lng: number
          price?: number
          retry_count?: number | null
          seller_id: string
          seller_shop_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_driver_id?: string | null
          broadcast_radius_km?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          drop_address?: string | null
          drop_lat?: number
          drop_lng?: number
          id?: string
          order_id?: string
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number
          pickup_lng?: number
          price?: number
          retry_count?: number | null
          seller_id?: string
          seller_shop_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_offers: {
        Row: {
          created_at: string | null
          distance_km: number | null
          driver_id: string
          eta_minutes: number | null
          id: string
          job_id: string
          message: string | null
          org_id: string | null
          per_km_rate: number | null
          pricing_mode: string | null
          proposed_fee: number | null
          responded_at: string | null
          score: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          distance_km?: number | null
          driver_id: string
          eta_minutes?: number | null
          id?: string
          job_id: string
          message?: string | null
          org_id?: string | null
          per_km_rate?: number | null
          pricing_mode?: string | null
          proposed_fee?: number | null
          responded_at?: string | null
          score?: number | null
          status?: string
        }
        Update: {
          created_at?: string | null
          distance_km?: number | null
          driver_id?: string
          eta_minutes?: number | null
          id?: string
          job_id?: string
          message?: string | null
          org_id?: string | null
          per_km_rate?: number | null
          pricing_mode?: string | null
          proposed_fee?: number | null
          responded_at?: string | null
          score?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_offers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "delivery_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_offers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_offers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_pricing_rules: {
        Row: {
          active: boolean
          base_fee: number
          city: string | null
          country_code: string
          created_at: string
          id: string
          max_fee: number | null
          min_fee: number
          night_multiplier: number
          peak_multiplier: number
          per_km_rate: number
          premium_zone_multiplier: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_fee?: number
          city?: string | null
          country_code: string
          created_at?: string
          id?: string
          max_fee?: number | null
          min_fee?: number
          night_multiplier?: number
          peak_multiplier?: number
          per_km_rate?: number
          premium_zone_multiplier?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_fee?: number
          city?: string | null
          country_code?: string
          created_at?: string
          id?: string
          max_fee?: number | null
          min_fee?: number
          night_multiplier?: number
          peak_multiplier?: number
          per_km_rate?: number
          premium_zone_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_proofs: {
        Row: {
          created_at: string | null
          dispatch_job_id: string | null
          driver_user_id: string | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          notes: string | null
          order_id: string | null
          photo_url: string | null
          proof_type: string | null
          signature_data: string | null
        }
        Insert: {
          created_at?: string | null
          dispatch_job_id?: string | null
          driver_user_id?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          notes?: string | null
          order_id?: string | null
          photo_url?: string | null
          proof_type?: string | null
          signature_data?: string | null
        }
        Update: {
          created_at?: string | null
          dispatch_job_id?: string | null
          driver_user_id?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          notes?: string | null
          order_id?: string | null
          photo_url?: string | null
          proof_type?: string | null
          signature_data?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_proofs_dispatch_job_id_fkey"
            columns: ["dispatch_job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_ratings: {
        Row: {
          categories: string[] | null
          comment: string | null
          created_at: string | null
          driver_id: string
          id: string
          job_id: string
          rated_by: string
          rating: number
        }
        Insert: {
          categories?: string[] | null
          comment?: string | null
          created_at?: string | null
          driver_id: string
          id?: string
          job_id: string
          rated_by: string
          rating: number
        }
        Update: {
          categories?: string[] | null
          comment?: string | null
          created_at?: string | null
          driver_id?: string
          id?: string
          job_id?: string
          rated_by?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_ratings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "delivery_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_zones: {
        Row: {
          active_drivers: number | null
          active_requests: number | null
          center_lat: number | null
          center_lng: number | null
          city: string | null
          demand_score: number | null
          id: string
          predicted_demand: number | null
          supply_score: number | null
          surge_multiplier: number | null
          updated_at: string | null
          zone_key: string
        }
        Insert: {
          active_drivers?: number | null
          active_requests?: number | null
          center_lat?: number | null
          center_lng?: number | null
          city?: string | null
          demand_score?: number | null
          id?: string
          predicted_demand?: number | null
          supply_score?: number | null
          surge_multiplier?: number | null
          updated_at?: string | null
          zone_key: string
        }
        Update: {
          active_drivers?: number | null
          active_requests?: number | null
          center_lat?: number | null
          center_lng?: number | null
          city?: string | null
          demand_score?: number | null
          id?: string
          predicted_demand?: number | null
          supply_score?: number | null
          surge_multiplier?: number | null
          updated_at?: string | null
          zone_key?: string
        }
        Relationships: []
      }
      device_attestations: {
        Row: {
          device_fingerprint: string
          device_id: string
          first_seen_at: string
          last_seen_at: string
          public_key_fingerprint: string
          revoked_at: string | null
          trust_state: string
        }
        Insert: {
          device_fingerprint: string
          device_id: string
          first_seen_at?: string
          last_seen_at?: string
          public_key_fingerprint: string
          revoked_at?: string | null
          trust_state?: string
        }
        Update: {
          device_fingerprint?: string
          device_id?: string
          first_seen_at?: string
          last_seen_at?: string
          public_key_fingerprint?: string
          revoked_at?: string | null
          trust_state?: string
        }
        Relationships: []
      }
      device_fingerprints: {
        Row: {
          created_at: string | null
          device_type: string | null
          fingerprint_hash: string
          id: string
          ip_address: string | null
          risk_score: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          fingerprint_hash: string
          id?: string
          ip_address?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          fingerprint_hash?: string
          id?: string
          ip_address?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dispatch_bids: {
        Row: {
          amount: number | null
          bid_type: string | null
          created_at: string | null
          driver_id: string
          eta_minutes: number | null
          id: string
          job_id: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          bid_type?: string | null
          created_at?: string | null
          driver_id: string
          eta_minutes?: number | null
          id?: string
          job_id: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          bid_type?: string | null
          created_at?: string | null
          driver_id?: string
          eta_minutes?: number | null
          id?: string
          job_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_bids_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_candidate_drivers: {
        Row: {
          created_at: string | null
          distance_km: number | null
          driver_id: string
          eta_minutes: number | null
          id: string
          prediction_job_id: string
          score: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          distance_km?: number | null
          driver_id: string
          eta_minutes?: number | null
          id?: string
          prediction_job_id: string
          score?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          distance_km?: number | null
          driver_id?: string
          eta_minutes?: number | null
          id?: string
          prediction_job_id?: string
          score?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_candidate_drivers_prediction_job_id_fkey"
            columns: ["prediction_job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_prediction_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_jobs: {
        Row: {
          assigned_driver_id: string | null
          assigned_driver_wallet_id: string | null
          buyer_id: string | null
          city: string | null
          completed_at: string | null
          country_code: string | null
          created_at: string | null
          currency: string | null
          distance_km: number | null
          driver_arriving_at: string | null
          dropoff_label: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_duration_min: number | null
          final_fee: number | null
          id: string
          order_id: string | null
          picked_up_at: string | null
          pickup_label: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          quoted_fee: number | null
          ranking_snapshot: Json | null
          retry_count: number | null
          seller_id: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          assigned_driver_id?: string | null
          assigned_driver_wallet_id?: string | null
          buyer_id?: string | null
          city?: string | null
          completed_at?: string | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          distance_km?: number | null
          driver_arriving_at?: string | null
          dropoff_label?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_duration_min?: number | null
          final_fee?: number | null
          id?: string
          order_id?: string | null
          picked_up_at?: string | null
          pickup_label?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          quoted_fee?: number | null
          ranking_snapshot?: Json | null
          retry_count?: number | null
          seller_id?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          assigned_driver_id?: string | null
          assigned_driver_wallet_id?: string | null
          buyer_id?: string | null
          city?: string | null
          completed_at?: string | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          distance_km?: number | null
          driver_arriving_at?: string | null
          dropoff_label?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_duration_min?: number | null
          final_fee?: number | null
          id?: string
          order_id?: string | null
          picked_up_at?: string | null
          pickup_label?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          quoted_fee?: number | null
          ranking_snapshot?: Json | null
          retry_count?: number | null
          seller_id?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      dispatch_jobs_v2: {
        Row: {
          ai_dispatch_metadata: Json
          assigned_at: string | null
          assigned_driver_id: string | null
          assigned_driver_wallet_id: string | null
          city: string | null
          country_code: string
          created_at: string
          currency: string
          customer_user_id: string | null
          delivered_at: string | null
          delivery_fee: number
          dispatch_status: string
          distance_km: number | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_duration_min: number | null
          expires_at: string | null
          id: string
          merchant_profile_id: string
          order_id: string
          picked_up_at: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pricing_snapshot: Json
          ranking_snapshot: Json
          retry_count: number
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          ai_dispatch_metadata?: Json
          assigned_at?: string | null
          assigned_driver_id?: string | null
          assigned_driver_wallet_id?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_fee?: number
          dispatch_status?: string
          distance_km?: number | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_duration_min?: number | null
          expires_at?: string | null
          id?: string
          merchant_profile_id: string
          order_id: string
          picked_up_at?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pricing_snapshot?: Json
          ranking_snapshot?: Json
          retry_count?: number
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          ai_dispatch_metadata?: Json
          assigned_at?: string | null
          assigned_driver_id?: string | null
          assigned_driver_wallet_id?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_fee?: number
          dispatch_status?: string
          distance_km?: number | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_duration_min?: number | null
          expires_at?: string | null
          id?: string
          merchant_profile_id?: string
          order_id?: string
          picked_up_at?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pricing_snapshot?: Json
          ranking_snapshot?: Json
          retry_count?: number
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: []
      }
      dispatch_offers: {
        Row: {
          created_at: string
          distance_km: number | null
          driver_profile_id: string
          driver_user_id: string
          eta_minutes: number | null
          expires_at: string | null
          id: string
          job_id: string
          offer_status: string
          score: number | null
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          driver_profile_id: string
          driver_user_id: string
          eta_minutes?: number | null
          expires_at?: string | null
          id?: string
          job_id: string
          offer_status?: string
          score?: number | null
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          driver_profile_id?: string
          driver_user_id?: string
          eta_minutes?: number | null
          expires_at?: string | null
          id?: string
          job_id?: string
          offer_status?: string
          score?: number | null
        }
        Relationships: []
      }
      dispatch_prediction_jobs: {
        Row: {
          buyer_id: string | null
          confidence: number | null
          context_id: string
          context_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          predicted_driver_count: number | null
          predicted_eta_minutes: number | null
          predicted_fee: number | null
          seller_id: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          buyer_id?: string | null
          confidence?: number | null
          context_id: string
          context_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          predicted_driver_count?: number | null
          predicted_eta_minutes?: number | null
          predicted_fee?: number | null
          seller_id?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          buyer_id?: string | null
          confidence?: number | null
          context_id?: string
          context_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          predicted_driver_count?: number | null
          predicted_eta_minutes?: number | null
          predicted_fee?: number | null
          seller_id?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
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
      driver_clusters: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          city: string | null
          cluster_score: number | null
          demand_score: number | null
          driver_count: number | null
          id: string
          updated_at: string | null
          zone_key: string
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          city?: string | null
          cluster_score?: number | null
          demand_score?: number | null
          driver_count?: number | null
          id?: string
          updated_at?: string | null
          zone_key: string
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          city?: string | null
          cluster_score?: number | null
          demand_score?: number | null
          driver_count?: number | null
          id?: string
          updated_at?: string | null
          zone_key?: string
        }
        Relationships: []
      }
      driver_earnings: {
        Row: {
          created_at: string
          currency: string
          driver_id: string
          earning_status: string
          gross_amount: number
          id: string
          net_amount: number
          platform_fee: number
          ride_request_id: string
          tip_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          driver_id: string
          earning_status?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          platform_fee?: number
          ride_request_id: string
          tip_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          driver_id?: string
          earning_status?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          platform_fee?: number
          ride_request_id?: string
          tip_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      driver_live_locations: {
        Row: {
          accuracy_m: number | null
          created_at: string
          dispatch_job_id: string | null
          driver_profile_id: string
          heading: number | null
          id: string
          lat: number
          lng: number
          order_id: string | null
          recorded_at: string
          speed_kmh: number | null
        }
        Insert: {
          accuracy_m?: number | null
          created_at?: string
          dispatch_job_id?: string | null
          driver_profile_id: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          order_id?: string | null
          recorded_at?: string
          speed_kmh?: number | null
        }
        Update: {
          accuracy_m?: number | null
          created_at?: string
          dispatch_job_id?: string | null
          driver_profile_id?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          order_id?: string | null
          recorded_at?: string
          speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_live_locations_dispatch_job_id_fkey"
            columns: ["dispatch_job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: string
          lat: number
          lng: number
          recorded_at: string | null
          service_mode: string | null
          speed_kmh: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          recorded_at?: string | null
          service_mode?: string | null
          speed_kmh?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string | null
          service_mode?: string | null
          speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_metrics: {
        Row: {
          acceptance_rate: number
          active_jobs_count: number
          avg_eta_score: number
          cancelled_jobs_count: number
          completed_jobs_count: number
          driver_profile_id: string
          id: string
          rating: number
          reliability_score: number
          updated_at: string
        }
        Insert: {
          acceptance_rate?: number
          active_jobs_count?: number
          avg_eta_score?: number
          cancelled_jobs_count?: number
          completed_jobs_count?: number
          driver_profile_id: string
          id?: string
          rating?: number
          reliability_score?: number
          updated_at?: string
        }
        Update: {
          acceptance_rate?: number
          active_jobs_count?: number
          avg_eta_score?: number
          cancelled_jobs_count?: number
          completed_jobs_count?: number
          driver_profile_id?: string
          id?: string
          rating?: number
          reliability_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      driver_mission_offers: {
        Row: {
          created_at: string
          dispatch_job_id: string
          driver_profile_id: string
          expires_at: string | null
          id: string
          offer_status: string
          ranking_reason: Json
          ranking_score: number | null
          responded_at: string | null
        }
        Insert: {
          created_at?: string
          dispatch_job_id: string
          driver_profile_id: string
          expires_at?: string | null
          id?: string
          offer_status?: string
          ranking_reason?: Json
          ranking_score?: number | null
          responded_at?: string | null
        }
        Update: {
          created_at?: string
          dispatch_job_id?: string
          driver_profile_id?: string
          expires_at?: string | null
          id?: string
          offer_status?: string
          ranking_reason?: Json
          ranking_score?: number | null
          responded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_mission_offers_dispatch_job_id_fkey"
            columns: ["dispatch_job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_payouts: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          driver_id: string
          id: string
          method: string | null
          payout_status: string | null
          processed_at: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          driver_id: string
          id?: string
          method?: string | null
          payout_status?: string | null
          processed_at?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          driver_id?: string
          id?: string
          method?: string | null
          payout_status?: string | null
          processed_at?: string | null
          reference?: string | null
        }
        Relationships: []
      }
      driver_positioning: {
        Row: {
          created_at: string | null
          demand_score: number | null
          driver_id: string | null
          id: string
          reason: string | null
          suggested_lat: number | null
          suggested_lng: number | null
        }
        Insert: {
          created_at?: string | null
          demand_score?: number | null
          driver_id?: string | null
          id?: string
          reason?: string | null
          suggested_lat?: number | null
          suggested_lng?: number | null
        }
        Update: {
          created_at?: string | null
          demand_score?: number | null
          driver_id?: string | null
          id?: string
          reason?: string | null
          suggested_lat?: number | null
          suggested_lng?: number | null
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          acceptance_rate: number | null
          active_jobs: number | null
          city: string | null
          country_code: string | null
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          current_status: string | null
          heading: number | null
          id: string
          is_available: boolean | null
          is_online: boolean | null
          is_verified: boolean | null
          jobs_completed: number | null
          last_location_at: string | null
          last_seen_at: string | null
          max_active_jobs: number | null
          plate_number: string | null
          rating: number | null
          reliability_score: number | null
          service_mode: string
          service_radius_km: number | null
          updated_at: string | null
          user_id: string
          vehicle_type: string | null
          workspace_id: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          active_jobs?: number | null
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          current_status?: string | null
          heading?: number | null
          id?: string
          is_available?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          jobs_completed?: number | null
          last_location_at?: string | null
          last_seen_at?: string | null
          max_active_jobs?: number | null
          plate_number?: string | null
          rating?: number | null
          reliability_score?: number | null
          service_mode?: string
          service_radius_km?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_type?: string | null
          workspace_id?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          active_jobs?: number | null
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          current_status?: string | null
          heading?: number | null
          id?: string
          is_available?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          jobs_completed?: number | null
          last_location_at?: string | null
          last_seen_at?: string | null
          max_active_jobs?: number | null
          plate_number?: string | null
          rating?: number | null
          reliability_score?: number | null
          service_mode?: string
          service_radius_km?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_type?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      driver_sessions: {
        Row: {
          acceptance_rate: number | null
          avg_rating: number | null
          created_at: string | null
          current_job_id: string | null
          id: string
          last_heartbeat_at: string | null
          lat: number | null
          lng: number | null
          max_distance_km: number | null
          online_since: string | null
          org_id: string | null
          status: string
          total_cancelled: number | null
          total_completed: number | null
          updated_at: string | null
          user_id: string
          vehicle_type: string
        }
        Insert: {
          acceptance_rate?: number | null
          avg_rating?: number | null
          created_at?: string | null
          current_job_id?: string | null
          id?: string
          last_heartbeat_at?: string | null
          lat?: number | null
          lng?: number | null
          max_distance_km?: number | null
          online_since?: string | null
          org_id?: string | null
          status?: string
          total_cancelled?: number | null
          total_completed?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_type?: string
        }
        Update: {
          acceptance_rate?: number | null
          avg_rating?: number | null
          created_at?: string | null
          current_job_id?: string | null
          id?: string
          last_heartbeat_at?: string | null
          lat?: number | null
          lng?: number | null
          max_distance_km?: number | null
          online_since?: string | null
          org_id?: string | null
          status?: string
          total_cancelled?: number | null
          total_completed?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers_live: {
        Row: {
          lat: number | null
          lng: number | null
          online: boolean
          orbit_id: string
          updated_at: string
        }
        Insert: {
          lat?: number | null
          lng?: number | null
          online?: boolean
          orbit_id: string
          updated_at?: string
        }
        Update: {
          lat?: number | null
          lng?: number | null
          online?: boolean
          orbit_id?: string
          updated_at?: string
        }
        Relationships: []
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
      email_queue: {
        Row: {
          created_at: string
          html: string
          id: string
          metadata: Json | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          created_at?: string
          html: string
          id: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          created_at?: string
          html?: string
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      engine_reports: {
        Row: {
          category: string
          created_at: string
          duration_ms: number | null
          engine_name: string
          id: string
          items_processed: number | null
          report_json: Json | null
          status: string
        }
        Insert: {
          category?: string
          created_at?: string
          duration_ms?: number | null
          engine_name: string
          id?: string
          items_processed?: number | null
          report_json?: Json | null
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          duration_ms?: number | null
          engine_name?: string
          id?: string
          items_processed?: number | null
          report_json?: Json | null
          status?: string
        }
        Relationships: []
      }
      engine_run_logs: {
        Row: {
          category: string
          db_rows_affected: number | null
          duration_ms: number | null
          effect_summary: string | null
          engine_name: string
          error_message: string | null
          finished_at: string | null
          id: string
          metadata_json: Json | null
          started_at: string
          status: string
        }
        Insert: {
          category?: string
          db_rows_affected?: number | null
          duration_ms?: number | null
          effect_summary?: string | null
          engine_name: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata_json?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          category?: string
          db_rows_affected?: number | null
          duration_ms?: number | null
          effect_summary?: string | null
          engine_name?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata_json?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      entities: {
        Row: {
          address: string | null
          area: string | null
          banner_url: string | null
          boost_tier: string | null
          boost_until: string | null
          cap_booking: boolean | null
          cap_call: boolean | null
          cap_chat: boolean | null
          cap_delivery: boolean | null
          cap_qr: boolean | null
          cap_subscription: boolean | null
          cap_wallet: boolean | null
          city: string | null
          city_code: string | null
          city_name: string | null
          cluster: string | null
          country_code: string | null
          country_name: string | null
          coverage_type: string | null
          created_at: string
          currency: string | null
          default_language: string | null
          district_code: string | null
          district_name: string | null
          email: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          order_count: number | null
          org_id: string | null
          owner_user_id: string | null
          parent_entity_id: string | null
          partner_network_id: string | null
          phone: string | null
          rating: number | null
          region_code: string | null
          region_name: string | null
          review_count: number | null
          seed_merchant_id: string | null
          service_modes: string[] | null
          slug: string | null
          social_links: Json | null
          status: string
          storefront_page_id: string | null
          subcategory: string | null
          tags: string[] | null
          timezone: string | null
          updated_at: string
          verified: boolean | null
          vertical: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          banner_url?: string | null
          boost_tier?: string | null
          boost_until?: string | null
          cap_booking?: boolean | null
          cap_call?: boolean | null
          cap_chat?: boolean | null
          cap_delivery?: boolean | null
          cap_qr?: boolean | null
          cap_subscription?: boolean | null
          cap_wallet?: boolean | null
          city?: string | null
          city_code?: string | null
          city_name?: string | null
          cluster?: string | null
          country_code?: string | null
          country_name?: string | null
          coverage_type?: string | null
          created_at?: string
          currency?: string | null
          default_language?: string | null
          district_code?: string | null
          district_name?: string | null
          email?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          order_count?: number | null
          org_id?: string | null
          owner_user_id?: string | null
          parent_entity_id?: string | null
          partner_network_id?: string | null
          phone?: string | null
          rating?: number | null
          region_code?: string | null
          region_name?: string | null
          review_count?: number | null
          seed_merchant_id?: string | null
          service_modes?: string[] | null
          slug?: string | null
          social_links?: Json | null
          status?: string
          storefront_page_id?: string | null
          subcategory?: string | null
          tags?: string[] | null
          timezone?: string | null
          updated_at?: string
          verified?: boolean | null
          vertical?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          banner_url?: string | null
          boost_tier?: string | null
          boost_until?: string | null
          cap_booking?: boolean | null
          cap_call?: boolean | null
          cap_chat?: boolean | null
          cap_delivery?: boolean | null
          cap_qr?: boolean | null
          cap_subscription?: boolean | null
          cap_wallet?: boolean | null
          city?: string | null
          city_code?: string | null
          city_name?: string | null
          cluster?: string | null
          country_code?: string | null
          country_name?: string | null
          coverage_type?: string | null
          created_at?: string
          currency?: string | null
          default_language?: string | null
          district_code?: string | null
          district_name?: string | null
          email?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          order_count?: number | null
          org_id?: string | null
          owner_user_id?: string | null
          parent_entity_id?: string | null
          partner_network_id?: string | null
          phone?: string | null
          rating?: number | null
          region_code?: string | null
          region_name?: string | null
          review_count?: number | null
          seed_merchant_id?: string | null
          service_modes?: string[] | null
          slug?: string | null
          social_links?: Json | null
          status?: string
          storefront_page_id?: string | null
          subcategory?: string | null
          tags?: string[] | null
          timezone?: string | null
          updated_at?: string
          verified?: boolean | null
          vertical?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_parent_entity_id_fkey"
            columns: ["parent_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_ai_scores: {
        Row: {
          conversion_score: number
          entity_id: string
          entity_type: string
          freshness_score: number
          interest_score: number
          momentum_score: number
          recommendation_score: number
          trust_score: number
          updated_at: string
        }
        Insert: {
          conversion_score?: number
          entity_id: string
          entity_type?: string
          freshness_score?: number
          interest_score?: number
          momentum_score?: number
          recommendation_score?: number
          trust_score?: number
          updated_at?: string
        }
        Update: {
          conversion_score?: number
          entity_id?: string
          entity_type?: string
          freshness_score?: number
          interest_score?: number
          momentum_score?: number
          recommendation_score?: number
          trust_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      entity_feedback_signals: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          metadata_json: Json | null
          session_id: string | null
          user_id: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type?: string
          event_type: string
          id?: string
          metadata_json?: Json | null
          session_id?: string | null
          user_id?: string | null
          weight?: number
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          metadata_json?: Json | null
          session_id?: string | null
          user_id?: string | null
          weight?: number
        }
        Relationships: []
      }
      entity_taxonomy_mapping: {
        Row: {
          canonical_id: string | null
          confidence_score: number | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          match_type: string
          needs_review: boolean | null
        }
        Insert: {
          canonical_id?: string | null
          confidence_score?: number | null
          created_at?: string
          entity_id: string
          entity_type?: string
          id?: string
          match_type?: string
          needs_review?: boolean | null
        }
        Update: {
          canonical_id?: string | null
          confidence_score?: number | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          match_type?: string
          needs_review?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_taxonomy_mapping_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "canonical_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          held_at: string | null
          id: string
          job_id: string
          metadata_json: Json | null
          org_id: string
          payee_id: string | null
          payer_id: string
          refund_reason: string | null
          refunded_at: string | null
          release_reason: string | null
          released_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          held_at?: string | null
          id?: string
          job_id: string
          metadata_json?: Json | null
          org_id: string
          payee_id?: string | null
          payer_id: string
          refund_reason?: string | null
          refunded_at?: string | null
          release_reason?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          held_at?: string | null
          id?: string
          job_id?: string
          metadata_json?: Json | null
          org_id?: string
          payee_id?: string | null
          payer_id?: string
          refund_reason?: string | null
          refunded_at?: string | null
          release_reason?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "delivery_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_connectors: {
        Row: {
          config: Json | null
          connector_name: string
          connector_type: string | null
          created_at: string | null
          id: string
          status: string | null
          supported_actions: string[] | null
          supported_pairs: string[] | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          connector_name: string
          connector_type?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          supported_actions?: string[] | null
          supported_pairs?: string[] | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          connector_name?: string
          connector_type?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          supported_actions?: string[] | null
          supported_pairs?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exchange_orders: {
        Row: {
          base_amount: number | null
          base_currency: string
          completed_at: string | null
          connector_id: string | null
          created_at: string | null
          executed_rate: number | null
          external_order_id: string | null
          fee_amount: number | null
          id: string
          metadata: Json | null
          pair_code: string
          quote_amount: number | null
          quote_currency: string
          quote_id: string | null
          side: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          wallet_account_id: string | null
          workspace_id: string | null
        }
        Insert: {
          base_amount?: number | null
          base_currency: string
          completed_at?: string | null
          connector_id?: string | null
          created_at?: string | null
          executed_rate?: number | null
          external_order_id?: string | null
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          pair_code: string
          quote_amount?: number | null
          quote_currency: string
          quote_id?: string | null
          side: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_account_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          base_amount?: number | null
          base_currency?: string
          completed_at?: string | null
          connector_id?: string | null
          created_at?: string | null
          executed_rate?: number | null
          external_order_id?: string | null
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          pair_code?: string
          quote_amount?: number | null
          quote_currency?: string
          quote_id?: string | null
          side?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_account_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_orders_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "exchange_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "exchange_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_orders_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_quotes: {
        Row: {
          base_amount: number | null
          base_currency: string
          connector_id: string | null
          created_at: string | null
          expires_at: string | null
          fee_amount: number | null
          id: string
          metadata: Json | null
          pair_code: string
          quote_amount: number | null
          quote_currency: string
          rate: number | null
          side: string
        }
        Insert: {
          base_amount?: number | null
          base_currency: string
          connector_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          pair_code: string
          quote_amount?: number | null
          quote_currency: string
          rate?: number | null
          side: string
        }
        Update: {
          base_amount?: number | null
          base_currency?: string
          connector_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          pair_code?: string
          quote_amount?: number | null
          quote_currency?: string
          rate?: number | null
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_quotes_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "exchange_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_kpi_snapshots: {
        Row: {
          active_orders: number | null
          active_rides: number | null
          conversion_rate: number | null
          created_at: string | null
          disputes_open: number | null
          gross_volume: number | null
          hot_zones: number | null
          id: string
          payouts_pending: number | null
          refunds_volume: number | null
          snapshot_date: string
        }
        Insert: {
          active_orders?: number | null
          active_rides?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          disputes_open?: number | null
          gross_volume?: number | null
          hot_zones?: number | null
          id?: string
          payouts_pending?: number | null
          refunds_volume?: number | null
          snapshot_date: string
        }
        Update: {
          active_orders?: number | null
          active_rides?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          disputes_open?: number | null
          gross_volume?: number | null
          hot_zones?: number | null
          id?: string
          payouts_pending?: number | null
          refunds_volume?: number | null
          snapshot_date?: string
        }
        Relationships: []
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
      favorite_listings: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          orbit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          listing_id: string
          orbit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          orbit_id?: string
          user_id?: string
        }
        Relationships: []
      }
      featured_shops: {
        Row: {
          created_at: string
          featured_until: string | null
          id: string
          reason: string | null
          shop_id: string
          tier: string
        }
        Insert: {
          created_at?: string
          featured_until?: string | null
          id?: string
          reason?: string | null
          shop_id: string
          tier?: string
        }
        Update: {
          created_at?: string
          featured_until?: string | null
          id?: string
          reason?: string | null
          shop_id?: string
          tier?: string
        }
        Relationships: []
      }
      financial_reconciliation: {
        Row: {
          actual_amount: number | null
          created_at: string | null
          currency: string | null
          delta: number | null
          entity_id: string | null
          entity_type: string | null
          expected_amount: number | null
          id: string
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          actual_amount?: number | null
          created_at?: string | null
          currency?: string | null
          delta?: number | null
          entity_id?: string | null
          entity_type?: string | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          actual_amount?: number | null
          created_at?: string | null
          currency?: string | null
          delta?: number | null
          entity_id?: string | null
          entity_type?: string | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      fraud_edges: {
        Row: {
          created_at: string | null
          edge_type: string
          from_entity_id: string
          id: string
          metadata: Json | null
          to_entity_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          edge_type: string
          from_entity_id: string
          id?: string
          metadata?: Json | null
          to_entity_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          edge_type?: string
          from_entity_id?: string
          id?: string
          metadata?: Json | null
          to_entity_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_edges_from_entity_id_fkey"
            columns: ["from_entity_id"]
            isOneToOne: false
            referencedRelation: "fraud_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_edges_to_entity_id_fkey"
            columns: ["to_entity_id"]
            isOneToOne: false
            referencedRelation: "fraud_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_entities: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          risk_band: string | null
          risk_score: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          risk_band?: string | null
          risk_score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          risk_band?: string | null
          risk_score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fraud_events: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          metadata: Json | null
          ride_request_id: string | null
          severity: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          ride_request_id?: string | null
          severity?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          ride_request_id?: string | null
          severity?: number | null
          user_id?: string | null
        }
        Relationships: []
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
      fx_rates_cache: {
        Row: {
          base_currency: string
          expires_at: string
          fetched_at: string
          id: string
          rates_json: Json
          source: string
        }
        Insert: {
          base_currency?: string
          expires_at?: string
          fetched_at?: string
          id?: string
          rates_json?: Json
          source?: string
        }
        Update: {
          base_currency?: string
          expires_at?: string
          fetched_at?: string
          id?: string
          rates_json?: Json
          source?: string
        }
        Relationships: []
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
          is_pinned: boolean
          pinned_at: string | null
          pinned_by: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string
          group_id: string
          id?: string
          is_pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          is_pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
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
          group_type: string
          id: string
          name: string
          org_id: string
          photo_url: string | null
          posting_permission: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_type?: string
          id?: string
          name: string
          org_id: string
          photo_url?: string | null
          posting_permission?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_type?: string
          id?: string
          name?: string
          org_id?: string
          photo_url?: string | null
          posting_permission?: string
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
      growth_city_pages: {
        Row: {
          city: string
          country_code: string
          created_at: string
          description: string | null
          h1: string | null
          id: string
          intro_text: string | null
          is_published: boolean
          locale: string
          page_type: string
          slug: string
          title: string | null
          updated_at: string
          vertical: string
        }
        Insert: {
          city: string
          country_code: string
          created_at?: string
          description?: string | null
          h1?: string | null
          id?: string
          intro_text?: string | null
          is_published?: boolean
          locale?: string
          page_type: string
          slug: string
          title?: string | null
          updated_at?: string
          vertical: string
        }
        Update: {
          city?: string
          country_code?: string
          created_at?: string
          description?: string | null
          h1?: string | null
          id?: string
          intro_text?: string | null
          is_published?: boolean
          locale?: string
          page_type?: string
          slug?: string
          title?: string | null
          updated_at?: string
          vertical?: string
        }
        Relationships: []
      }
      growth_demand_events: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          merchant_profile_id: string | null
          metadata_json: Json
          session_id: string | null
          storefront_page_id: string | null
          user_id: string | null
          vertical: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          merchant_profile_id?: string | null
          metadata_json?: Json
          session_id?: string | null
          storefront_page_id?: string | null
          user_id?: string | null
          vertical?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          merchant_profile_id?: string | null
          metadata_json?: Json
          session_id?: string | null
          storefront_page_id?: string | null
          user_id?: string | null
          vertical?: string | null
        }
        Relationships: []
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
      guest_checkout_sessions: {
        Row: {
          cart_id: string | null
          created_at: string | null
          expires_at: string | null
          guest_id: string
          id: string
          phone: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          cart_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          guest_id: string
          id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          cart_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          guest_id?: string
          id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_checkout_sessions_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "storefront_carts"
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
      import_batches: {
        Row: {
          city: string
          completed_at: string | null
          country: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          source_name: string
          source_type: string
          started_at: string
          status: string
          total_created: number
          total_duplicates: number
          total_failed: number
          total_raw: number
          total_skipped: number
          total_updated: number
        }
        Insert: {
          city?: string
          completed_at?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          source_name?: string
          source_type?: string
          started_at?: string
          status?: string
          total_created?: number
          total_duplicates?: number
          total_failed?: number
          total_raw?: number
          total_skipped?: number
          total_updated?: number
        }
        Update: {
          city?: string
          completed_at?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          source_name?: string
          source_type?: string
          started_at?: string
          status?: string
          total_created?: number
          total_duplicates?: number
          total_failed?: number
          total_raw?: number
          total_skipped?: number
          total_updated?: number
        }
        Relationships: []
      }
      import_test_batches: {
        Row: {
          batch_name: string
          batch_type: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_records: number
          id: string
          imported_records: number
          metadata_json: Json
          status: string
          total_records: number
        }
        Insert: {
          batch_name: string
          batch_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_records?: number
          id?: string
          imported_records?: number
          metadata_json?: Json
          status?: string
          total_records?: number
        }
        Update: {
          batch_name?: string
          batch_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_records?: number
          id?: string
          imported_records?: number
          metadata_json?: Json
          status?: string
          total_records?: number
        }
        Relationships: []
      }
      imported_shop_assets: {
        Row: {
          asset_source: string | null
          asset_type: string
          asset_url: string
          candidate_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          status: string | null
        }
        Insert: {
          asset_source?: string | null
          asset_type?: string
          asset_url: string
          candidate_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          status?: string | null
        }
        Update: {
          asset_source?: string | null
          asset_type?: string
          asset_url?: string
          candidate_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_shop_assets_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "onboarding_shop_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_shop_raw: {
        Row: {
          batch_id: string
          created_at: string
          error_message: string | null
          id: string
          parsed_status: string
          raw_address: string | null
          raw_area: string | null
          raw_category: string | null
          raw_city: string | null
          raw_country: string | null
          raw_hours: Json | null
          raw_images: Json | null
          raw_lat: number | null
          raw_lng: number | null
          raw_menu_json: Json | null
          raw_name: string | null
          raw_payload_json: Json | null
          raw_phone: string | null
          raw_price_level: number | null
          raw_rating: number | null
          raw_reviews_count: number | null
          raw_subcategory: string | null
          raw_website: string | null
          source_external_id: string | null
          source_type: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          parsed_status?: string
          raw_address?: string | null
          raw_area?: string | null
          raw_category?: string | null
          raw_city?: string | null
          raw_country?: string | null
          raw_hours?: Json | null
          raw_images?: Json | null
          raw_lat?: number | null
          raw_lng?: number | null
          raw_menu_json?: Json | null
          raw_name?: string | null
          raw_payload_json?: Json | null
          raw_phone?: string | null
          raw_price_level?: number | null
          raw_rating?: number | null
          raw_reviews_count?: number | null
          raw_subcategory?: string | null
          raw_website?: string | null
          source_external_id?: string | null
          source_type?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          parsed_status?: string
          raw_address?: string | null
          raw_area?: string | null
          raw_category?: string | null
          raw_city?: string | null
          raw_country?: string | null
          raw_hours?: Json | null
          raw_images?: Json | null
          raw_lat?: number | null
          raw_lng?: number | null
          raw_menu_json?: Json | null
          raw_name?: string | null
          raw_payload_json?: Json | null
          raw_phone?: string | null
          raw_price_level?: number | null
          raw_rating?: number | null
          raw_reviews_count?: number | null
          raw_subcategory?: string | null
          raw_website?: string | null
          source_external_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_shop_raw_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_case_events: {
        Row: {
          actor_user_id: string | null
          body: string | null
          created_at: string | null
          event_type: string
          id: string
          incident_id: string
          metadata_json: Json | null
        }
        Insert: {
          actor_user_id?: string | null
          body?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          incident_id: string
          metadata_json?: Json | null
        }
        Update: {
          actor_user_id?: string | null
          body?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          incident_id?: string
          metadata_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_case_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_cases: {
        Row: {
          created_at: string | null
          id: string
          incident_type: string
          owner_user_id: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          summary: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          incident_type: string
          owner_user_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          summary?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          incident_type?: string
          owner_user_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          summary?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
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
      journey_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          context_json: Json | null
          country: string | null
          created_at: string
          device_type: string | null
          event_name: string
          id: string
          language: string | null
          route: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          context_json?: Json | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_name: string
          id?: string
          language?: string | null
          route: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          context_json?: Json | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_name?: string
          id?: string
          language?: string | null
          route?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          doc_type: string
          file_back_url: string | null
          file_url: string | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          selfie_url: string | null
          status: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          doc_type: string
          file_back_url?: string | null
          file_url?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          doc_type?: string
          file_back_url?: string | null
          file_url?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      launch_gate_results: {
        Row: {
          created_at: string | null
          details: Json | null
          gate_key: string
          id: string
          report_id: string | null
          status: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          gate_key: string
          id?: string
          report_id?: string | null
          status?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          gate_key?: string
          id?: string
          report_id?: string | null
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_gate_results_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "audit_reports"
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
          unit_id: string | null
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
          unit_id?: string | null
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
          unit_id?: string | null
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
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          end_at: string | null
          id: string
          listing_id: string | null
          owner_orbit_id: string
          start_at: string | null
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          end_at?: string | null
          id: string
          listing_id?: string | null
          owner_orbit_id: string
          start_at?: string | null
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          end_at?: string | null
          id?: string
          listing_id?: string | null
          owner_orbit_id?: string
          start_at?: string | null
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      listing_reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          id: string
          listing_id: string
          owner_orbit_id: string
          rating: number
          reviewer_orbit_id: string
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id: string
          listing_id: string
          owner_orbit_id: string
          rating: number
          reviewer_orbit_id: string
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          owner_orbit_id?: string
          rating?: number
          reviewer_orbit_id?: string
        }
        Relationships: []
      }
      listing_views: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          orbit_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id: string
          listing_id: string
          orbit_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          orbit_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      live_status_snapshots: {
        Row: {
          actor_name: string | null
          context_action_url: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          eta_max: number | null
          eta_min: number | null
          id: string
          is_active: boolean | null
          live_step_index: number | null
          live_step_total: number | null
          live_visual_type: string | null
          metadata_json: Json | null
          progress_percent: number | null
          status_code: string
          status_label: string
          status_subtitle: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actor_name?: string | null
          context_action_url?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          eta_max?: number | null
          eta_min?: number | null
          id?: string
          is_active?: boolean | null
          live_step_index?: number | null
          live_step_total?: number | null
          live_visual_type?: string | null
          metadata_json?: Json | null
          progress_percent?: number | null
          status_code: string
          status_label: string
          status_subtitle?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actor_name?: string | null
          context_action_url?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          eta_max?: number | null
          eta_min?: number | null
          id?: string
          is_active?: boolean | null
          live_step_index?: number | null
          live_step_total?: number | null
          live_visual_type?: string | null
          metadata_json?: Json | null
          progress_percent?: number | null
          status_code?: string
          status_label?: string
          status_subtitle?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      live_tracking_points: {
        Row: {
          accuracy_m: number | null
          heading: number | null
          id: string
          lat: number
          lng: number
          recorded_at: string | null
          session_id: string
          source: string | null
          speed_kmh: number | null
        }
        Insert: {
          accuracy_m?: number | null
          heading?: number | null
          id?: string
          lat: number
          lng: number
          recorded_at?: string | null
          session_id: string
          source?: string | null
          speed_kmh?: number | null
        }
        Update: {
          accuracy_m?: number | null
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string | null
          session_id?: string
          source?: string | null
          speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_tracking_points_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_tracking_sessions: {
        Row: {
          context_id: string
          context_type: string
          customer_user_id: string | null
          driver_id: string | null
          ended_at: string | null
          id: string
          merchant_profile_id: string | null
          started_at: string | null
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          context_id: string
          context_type: string
          customer_user_id?: string | null
          driver_id?: string | null
          ended_at?: string | null
          id?: string
          merchant_profile_id?: string | null
          started_at?: string | null
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          context_id?: string
          context_type?: string
          customer_user_id?: string | null
          driver_id?: string | null
          ended_at?: string | null
          id?: string
          merchant_profile_id?: string | null
          started_at?: string | null
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_tracking_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_trackings: {
        Row: {
          completed_at: string | null
          context_id: string | null
          context_label: string | null
          context_type: string
          created_at: string
          current_lat: number | null
          current_lng: number | null
          destination_lat: number | null
          destination_lng: number | null
          eta_minutes: number | null
          heading: number | null
          id: string
          last_position_at: string | null
          metadata_json: Json | null
          org_id: string
          origin_lat: number | null
          origin_lng: number | null
          route_polyline: string | null
          speed_kmh: number | null
          started_at: string | null
          status: string
          tracker_user_id: string
          updated_at: string
          viewer_user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          context_id?: string | null
          context_label?: string | null
          context_type?: string
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          eta_minutes?: number | null
          heading?: number | null
          id?: string
          last_position_at?: string | null
          metadata_json?: Json | null
          org_id: string
          origin_lat?: number | null
          origin_lng?: number | null
          route_polyline?: string | null
          speed_kmh?: number | null
          started_at?: string | null
          status?: string
          tracker_user_id: string
          updated_at?: string
          viewer_user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          context_id?: string | null
          context_label?: string | null
          context_type?: string
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          eta_minutes?: number | null
          heading?: number | null
          id?: string
          last_position_at?: string | null
          metadata_json?: Json | null
          org_id?: string
          origin_lat?: number | null
          origin_lng?: number | null
          route_polyline?: string | null
          speed_kmh?: number | null
          started_at?: string | null
          status?: string
          tracker_user_id?: string
          updated_at?: string
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_trackings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_trackings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      live_translation_stream: {
        Row: {
          call_session_id: string
          confidence: number | null
          created_at: string | null
          id: string
          segment_index: number | null
          source_lang: string | null
          source_text: string | null
          speaker_id: string | null
          target_lang: string | null
          translated_text: string | null
          workspace_id: string | null
        }
        Insert: {
          call_session_id: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          segment_index?: number | null
          source_lang?: string | null
          source_text?: string | null
          speaker_id?: string | null
          target_lang?: string | null
          translated_text?: string | null
          workspace_id?: string | null
        }
        Update: {
          call_session_id?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          segment_index?: number | null
          source_lang?: string | null
          source_text?: string | null
          speaker_id?: string | null
          target_lang?: string | null
          translated_text?: string | null
          workspace_id?: string | null
        }
        Relationships: []
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
      log_export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          export_type: string
          filters: Json | null
          id: string
          output_url: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          export_type: string
          filters?: Json | null
          id?: string
          output_url?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          export_type?: string
          filters?: Json | null
          id?: string
          output_url?: string | null
          status?: string | null
        }
        Relationships: []
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
      loyalty_accounts: {
        Row: {
          created_at: string | null
          guest_id: string | null
          id: string
          lifetime_points: number | null
          points_balance: number | null
          tier: string | null
          total_cashback: number | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          guest_id?: string | null
          id?: string
          lifetime_points?: number | null
          points_balance?: number | null
          tier?: string | null
          total_cashback?: number | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          guest_id?: string | null
          id?: string
          lifetime_points?: number | null
          points_balance?: number | null
          tier?: string | null
          total_cashback?: number | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      loyalty_ledger: {
        Row: {
          cashback_amount: number | null
          created_at: string | null
          entry_type: string
          id: string
          loyalty_account_id: string
          metadata: Json | null
          points: number | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          cashback_amount?: number | null
          created_at?: string | null
          entry_type: string
          id?: string
          loyalty_account_id: string
          metadata?: Json | null
          points?: number | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          cashback_amount?: number | null
          created_at?: string | null
          entry_type?: string
          id?: string
          loyalty_account_id?: string
          metadata?: Json | null
          points?: number | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_ledger_loyalty_account_id_fkey"
            columns: ["loyalty_account_id"]
            isOneToOne: false
            referencedRelation: "loyalty_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          id: string
          points: number | null
          reference_id: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          points?: number | null
          reference_id?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number | null
          reference_id?: string | null
          type?: string | null
          user_id?: string | null
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
          {
            foreignKeyName: "marketplace_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_marketplace_listings"
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
          is_live: boolean | null
          live_since: string | null
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
          is_live?: boolean | null
          live_since?: string | null
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
          is_live?: boolean | null
          live_since?: string | null
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
          {
            foreignKeyName: "marketplace_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_services: {
        Row: {
          activated_at: string | null
          active: boolean | null
          anchor_lat: number | null
          anchor_lng: number | null
          archived_at: string | null
          auto_expire: boolean
          auto_renew_enabled: boolean
          auto_renew_plan: string | null
          badges: string[] | null
          bathrooms: number | null
          bedrooms: number | null
          blocked_dates: Json | null
          booking_slug: string
          boost_enabled: boolean
          boost_expires_at: string | null
          boost_multiplier: number
          boost_tier: string | null
          boost_until: string | null
          brand: string | null
          category: string
          city: string
          condition: string | null
          contact_email: string | null
          contact_whatsapp: string | null
          country: string
          coverage_mode: string
          coverage_radius_m: number | null
          created_at: string
          currency: string
          deposit_amount: number | null
          description: string | null
          duration_minutes: number | null
          entity_type: string
          features: Json | null
          freshness_score: number
          id: string
          is_live_online: boolean
          last_renewed_at: string | null
          lat: number | null
          listing_expires_at: string | null
          listing_type: string | null
          live_lat: number | null
          live_lng: number | null
          live_updated_at: string | null
          lng: number | null
          location: string | null
          location_source: string | null
          max_capacity: number | null
          model: string | null
          org_id: string
          payment_bank_details: Json | null
          payment_custom_url: string | null
          payment_paypal_email: string | null
          payment_stripe_link: string | null
          photo_urls: Json | null
          presence_mode: string
          price: number
          price_type: string
          provider_id: string
          published_at: string | null
          quantity: number | null
          renewal_count: number
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
          video_url: string | null
          year_built: number | null
          zone_id: string | null
        }
        Insert: {
          activated_at?: string | null
          active?: boolean | null
          anchor_lat?: number | null
          anchor_lng?: number | null
          archived_at?: string | null
          auto_expire?: boolean
          auto_renew_enabled?: boolean
          auto_renew_plan?: string | null
          badges?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          blocked_dates?: Json | null
          booking_slug: string
          boost_enabled?: boolean
          boost_expires_at?: string | null
          boost_multiplier?: number
          boost_tier?: string | null
          boost_until?: string | null
          brand?: string | null
          category?: string
          city?: string
          condition?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          country?: string
          coverage_mode?: string
          coverage_radius_m?: number | null
          created_at?: string
          currency?: string
          deposit_amount?: number | null
          description?: string | null
          duration_minutes?: number | null
          entity_type?: string
          features?: Json | null
          freshness_score?: number
          id?: string
          is_live_online?: boolean
          last_renewed_at?: string | null
          lat?: number | null
          listing_expires_at?: string | null
          listing_type?: string | null
          live_lat?: number | null
          live_lng?: number | null
          live_updated_at?: string | null
          lng?: number | null
          location?: string | null
          location_source?: string | null
          max_capacity?: number | null
          model?: string | null
          org_id: string
          payment_bank_details?: Json | null
          payment_custom_url?: string | null
          payment_paypal_email?: string | null
          payment_stripe_link?: string | null
          photo_urls?: Json | null
          presence_mode?: string
          price?: number
          price_type?: string
          provider_id: string
          published_at?: string | null
          quantity?: number | null
          renewal_count?: number
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
          video_url?: string | null
          year_built?: number | null
          zone_id?: string | null
        }
        Update: {
          activated_at?: string | null
          active?: boolean | null
          anchor_lat?: number | null
          anchor_lng?: number | null
          archived_at?: string | null
          auto_expire?: boolean
          auto_renew_enabled?: boolean
          auto_renew_plan?: string | null
          badges?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          blocked_dates?: Json | null
          booking_slug?: string
          boost_enabled?: boolean
          boost_expires_at?: string | null
          boost_multiplier?: number
          boost_tier?: string | null
          boost_until?: string | null
          brand?: string | null
          category?: string
          city?: string
          condition?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          country?: string
          coverage_mode?: string
          coverage_radius_m?: number | null
          created_at?: string
          currency?: string
          deposit_amount?: number | null
          description?: string | null
          duration_minutes?: number | null
          entity_type?: string
          features?: Json | null
          freshness_score?: number
          id?: string
          is_live_online?: boolean
          last_renewed_at?: string | null
          lat?: number | null
          listing_expires_at?: string | null
          listing_type?: string | null
          live_lat?: number | null
          live_lng?: number | null
          live_updated_at?: string | null
          lng?: number | null
          location?: string | null
          location_source?: string | null
          max_capacity?: number | null
          model?: string | null
          org_id?: string
          payment_bank_details?: Json | null
          payment_custom_url?: string | null
          payment_paypal_email?: string | null
          payment_stripe_link?: string | null
          photo_urls?: Json | null
          presence_mode?: string
          price?: number
          price_type?: string
          provider_id?: string
          published_at?: string | null
          quantity?: number | null
          renewal_count?: number
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
          video_url?: string | null
          year_built?: number | null
          zone_id?: string | null
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
          {
            foreignKeyName: "marketplace_services_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          asset_type: string
          created_at: string
          height: number | null
          id: string
          normalized_url: string | null
          original_url: string
          owner_id: string
          owner_type: string
          profile_name: string | null
          status: string
          width: number | null
        }
        Insert: {
          asset_type: string
          created_at?: string
          height?: number | null
          id?: string
          normalized_url?: string | null
          original_url: string
          owner_id: string
          owner_type: string
          profile_name?: string | null
          status?: string
          width?: number | null
        }
        Update: {
          asset_type?: string
          created_at?: string
          height?: number | null
          id?: string
          normalized_url?: string | null
          original_url?: string
          owner_id?: string
          owner_type?: string
          profile_name?: string | null
          status?: string
          width?: number | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          merchant_profile_id: string | null
          name: string
          sort_order: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_profile_id?: string | null
          name: string
          sort_order?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_profile_id?: string | null
          name?: string
          sort_order?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_merchant_profile_id_fkey"
            columns: ["merchant_profile_id"]
            isOneToOne: false
            referencedRelation: "merchant_onboarding_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by_test: boolean
          currency: string | null
          description: string | null
          description_ar: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_test: boolean
          merchant_profile_id: string | null
          name: string
          name_ar: string | null
          price: number | null
          sort_order: number | null
          test_batch_id: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by_test?: boolean
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_test?: boolean
          merchant_profile_id?: string | null
          name: string
          name_ar?: string | null
          price?: number | null
          sort_order?: number | null
          test_batch_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by_test?: boolean
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_test?: boolean
          merchant_profile_id?: string | null
          name?: string
          name_ar?: string | null
          price?: number | null
          sort_order?: number | null
          test_batch_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_merchant_profile_id_fkey"
            columns: ["merchant_profile_id"]
            isOneToOne: false
            referencedRelation: "merchant_onboarding_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_accounts: {
        Row: {
          country: string | null
          created_at: string
          currency: string | null
          id: string
          kyc_status: string
          legal_name: string | null
          payout_enabled: boolean
          payout_provider_account_id: string | null
          shop_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          kyc_status?: string
          legal_name?: string | null
          payout_enabled?: boolean
          payout_provider_account_id?: string | null
          shop_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          kyc_status?: string
          legal_name?: string | null
          payout_enabled?: boolean
          payout_provider_account_id?: string | null
          shop_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_accounts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_activation_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          profile_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_activation_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "merchant_onboarding_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_balances: {
        Row: {
          available_balance: number
          currency: string
          id: string
          locked_balance: number
          merchant_id: string
          pending_balance: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          currency?: string
          id?: string
          locked_balance?: number
          merchant_id: string
          pending_balance?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          currency?: string
          id?: string
          locked_balance?: number
          merchant_id?: string
          pending_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_balances_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchant_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_coverage_areas: {
        Row: {
          area_name: string
          city: string | null
          created_at: string | null
          delivery_fee: number | null
          estimated_eta_min: number | null
          id: string
          is_active: boolean | null
          kitchen_id: string | null
          merchant_profile_id: string
          min_order_amount: number | null
          polygon: Json | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          area_name: string
          city?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          estimated_eta_min?: number | null
          id?: string
          is_active?: boolean | null
          kitchen_id?: string | null
          merchant_profile_id: string
          min_order_amount?: number | null
          polygon?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          area_name?: string
          city?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          estimated_eta_min?: number | null
          id?: string
          is_active?: boolean | null
          kitchen_id?: string | null
          merchant_profile_id?: string
          min_order_amount?: number | null
          polygon?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_coverage_areas_merchant_profile_id_fkey"
            columns: ["merchant_profile_id"]
            isOneToOne: false
            referencedRelation: "merchant_onboarding_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_field_overrides: {
        Row: {
          auto_source: string | null
          auto_value_json: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          field_key: string
          id: string
          is_auto_generated: boolean
          is_merchant_locked: boolean
          last_auto_update_at: string | null
          last_merchant_update_at: string | null
          merchant_value_json: Json | null
          override_source: string | null
          suggested_value_json: Json | null
          suggestion_available: boolean
          updated_at: string | null
        }
        Insert: {
          auto_source?: string | null
          auto_value_json?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type?: string
          field_key: string
          id?: string
          is_auto_generated?: boolean
          is_merchant_locked?: boolean
          last_auto_update_at?: string | null
          last_merchant_update_at?: string | null
          merchant_value_json?: Json | null
          override_source?: string | null
          suggested_value_json?: Json | null
          suggestion_available?: boolean
          updated_at?: string | null
        }
        Update: {
          auto_source?: string | null
          auto_value_json?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          field_key?: string
          id?: string
          is_auto_generated?: boolean
          is_merchant_locked?: boolean
          last_auto_update_at?: string | null
          last_merchant_update_at?: string | null
          merchant_value_json?: Json | null
          override_source?: string | null
          suggested_value_json?: Json | null
          suggestion_available?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      merchant_menu_import_items: {
        Row: {
          category_name: string | null
          created_at: string | null
          currency: string | null
          id: string
          image_url: string | null
          item_description: string | null
          item_name: string
          normalized: boolean | null
          price: number | null
          profile_id: string
          published: boolean | null
        }
        Insert: {
          category_name?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          image_url?: string | null
          item_description?: string | null
          item_name: string
          normalized?: boolean | null
          price?: number | null
          profile_id: string
          published?: boolean | null
        }
        Update: {
          category_name?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          image_url?: string | null
          item_description?: string | null
          item_name?: string
          normalized?: boolean | null
          price?: number | null
          profile_id?: string
          published?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_menu_import_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "merchant_onboarding_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_onboarding_profiles: {
        Row: {
          activation_band: string | null
          activation_mode: string | null
          activation_reasons: Json
          activation_score: number | null
          area: string | null
          city: string | null
          claim_verification_method: string | null
          claimed_at: string | null
          claimed_by: string | null
          contact_name: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by_test: boolean
          cuisine_type: string | null
          dedupe_key: string | null
          delivery_radius_km: number | null
          description: string | null
          description_ar: string | null
          email: string | null
          id: string
          is_test: boolean
          latitude: number | null
          legal_name: string | null
          logo_image_url: string | null
          longitude: number | null
          merchant_name: string
          metadata: Json | null
          name_ar: string | null
          onboarding_status: string | null
          phone: string | null
          rating: number | null
          review_count: number | null
          source_id: string | null
          source_status: string | null
          tags: string[] | null
          test_batch_id: string | null
          updated_at: string | null
          verification_status: string | null
          verified_at: string | null
          vertical: string | null
          website: string | null
          workspace_id: string | null
        }
        Insert: {
          activation_band?: string | null
          activation_mode?: string | null
          activation_reasons?: Json
          activation_score?: number | null
          area?: string | null
          city?: string | null
          claim_verification_method?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_name?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by_test?: boolean
          cuisine_type?: string | null
          dedupe_key?: string | null
          delivery_radius_km?: number | null
          description?: string | null
          description_ar?: string | null
          email?: string | null
          id?: string
          is_test?: boolean
          latitude?: number | null
          legal_name?: string | null
          logo_image_url?: string | null
          longitude?: number | null
          merchant_name: string
          metadata?: Json | null
          name_ar?: string | null
          onboarding_status?: string | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          source_id?: string | null
          source_status?: string | null
          tags?: string[] | null
          test_batch_id?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          vertical?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Update: {
          activation_band?: string | null
          activation_mode?: string | null
          activation_reasons?: Json
          activation_score?: number | null
          area?: string | null
          city?: string | null
          claim_verification_method?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_name?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by_test?: boolean
          cuisine_type?: string | null
          dedupe_key?: string | null
          delivery_radius_km?: number | null
          description?: string | null
          description_ar?: string | null
          email?: string | null
          id?: string
          is_test?: boolean
          latitude?: number | null
          legal_name?: string | null
          logo_image_url?: string | null
          longitude?: number | null
          merchant_name?: string
          metadata?: Json | null
          name_ar?: string | null
          onboarding_status?: string | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          source_id?: string | null
          source_status?: string | null
          tags?: string[] | null
          test_batch_id?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          vertical?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_onboarding_profiles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "merchant_onboarding_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_onboarding_sources: {
        Row: {
          created_at: string | null
          id: string
          payload: Json | null
          source_external_id: string | null
          source_name: string | null
          source_type: string
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          source_external_id?: string | null
          source_name?: string | null
          source_type: string
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          source_external_id?: string | null
          source_name?: string | null
          source_type?: string
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      merchant_onboarding_state: {
        Row: {
          activation_status: string
          claim_status: string
          coherence_quarantined: boolean | null
          coherence_score: number | null
          coherence_status: string | null
          contact_status: string
          created_at: string
          entity_id: string
          geo_status: string
          id: string
          import_source: string | null
          last_checked_at: string | null
          menu_display_score: number | null
          menu_status: string
          menu_visual_status: string | null
          onboarding_mode: string
          review_status: string
          seo_status: string
          storefront_readiness_score: number | null
          storefront_ready_status: string | null
          taxonomy_status: string
          ui_quality_status: string | null
          updated_at: string
          visibility_status: string
          visual_completeness_score: number | null
          visual_flags_json: Json | null
        }
        Insert: {
          activation_status?: string
          claim_status?: string
          coherence_quarantined?: boolean | null
          coherence_score?: number | null
          coherence_status?: string | null
          contact_status?: string
          created_at?: string
          entity_id: string
          geo_status?: string
          id?: string
          import_source?: string | null
          last_checked_at?: string | null
          menu_display_score?: number | null
          menu_status?: string
          menu_visual_status?: string | null
          onboarding_mode?: string
          review_status?: string
          seo_status?: string
          storefront_readiness_score?: number | null
          storefront_ready_status?: string | null
          taxonomy_status?: string
          ui_quality_status?: string | null
          updated_at?: string
          visibility_status?: string
          visual_completeness_score?: number | null
          visual_flags_json?: Json | null
        }
        Update: {
          activation_status?: string
          claim_status?: string
          coherence_quarantined?: boolean | null
          coherence_score?: number | null
          coherence_status?: string | null
          contact_status?: string
          created_at?: string
          entity_id?: string
          geo_status?: string
          id?: string
          import_source?: string | null
          last_checked_at?: string | null
          menu_display_score?: number | null
          menu_status?: string
          menu_visual_status?: string | null
          onboarding_mode?: string
          review_status?: string
          seo_status?: string
          storefront_readiness_score?: number | null
          storefront_ready_status?: string | null
          taxonomy_status?: string
          ui_quality_status?: string | null
          updated_at?: string
          visibility_status?: string
          visual_completeness_score?: number | null
          visual_flags_json?: Json | null
        }
        Relationships: []
      }
      merchant_outreach_campaigns: {
        Row: {
          activated_at: string | null
          activation_link: string | null
          activation_token: string
          channel: string
          claimed_at: string | null
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          id: string
          merchant_profile_id: string
          metadata: Json | null
          opened_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activation_link?: string | null
          activation_token?: string
          channel?: string
          claimed_at?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          merchant_profile_id: string
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activation_link?: string | null
          activation_token?: string
          channel?: string
          claimed_at?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          merchant_profile_id?: string
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_outreach_campaigns_merchant_profile_id_fkey"
            columns: ["merchant_profile_id"]
            isOneToOne: false
            referencedRelation: "merchant_onboarding_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_override_history: {
        Row: {
          change_reason: string | null
          change_source: string
          changed_by: string | null
          created_at: string | null
          entity_id: string
          field_key: string
          id: string
          new_value_json: Json | null
          override_id: string | null
          previous_value_json: Json | null
        }
        Insert: {
          change_reason?: string | null
          change_source: string
          changed_by?: string | null
          created_at?: string | null
          entity_id: string
          field_key: string
          id?: string
          new_value_json?: Json | null
          override_id?: string | null
          previous_value_json?: Json | null
        }
        Update: {
          change_reason?: string | null
          change_source?: string
          changed_by?: string | null
          created_at?: string | null
          entity_id?: string
          field_key?: string
          id?: string
          new_value_json?: Json | null
          override_id?: string | null
          previous_value_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_override_history_override_id_fkey"
            columns: ["override_id"]
            isOneToOne: false
            referencedRelation: "merchant_field_overrides"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_staff: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          merchant_id: string
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          merchant_id: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          merchant_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      message_translations: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          provider: string | null
          source_locale: string | null
          target_locale: string
          translated_text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          provider?: string | null
          source_locale?: string | null
          target_locale: string
          translated_text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          provider?: string | null
          source_locale?: string | null
          target_locale?: string
          translated_text?: string
        }
        Relationships: []
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
      moderation_events: {
        Row: {
          action_taken: string | null
          created_at: string | null
          event_type: string
          id: string
          message_id: string | null
          metadata_json: Json | null
          severity: string | null
          thread_id: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          message_id?: string | null
          metadata_json?: Json | null
          severity?: string | null
          thread_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          message_id?: string | null
          metadata_json?: Json | null
          severity?: string | null
          thread_id?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      notification_deliveries: {
        Row: {
          channel: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          notification_id: string
          provider_ref: string | null
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id: string
          notification_id: string
          provider_ref?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string
          provider_ref?: string | null
          status?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          email_bookings: boolean
          email_deals: boolean
          email_digest_day: string
          email_digest_frequency: string
          email_digest_hour: number
          email_documents: boolean
          email_maintenance: boolean
          email_messages: boolean
          email_payments: boolean
          email_urgent_only: boolean
          id: string
          in_app_bookings: boolean
          in_app_deals: boolean
          in_app_documents: boolean
          in_app_maintenance: boolean
          in_app_messages: boolean
          in_app_payments: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          email_bookings?: boolean
          email_deals?: boolean
          email_digest_day?: string
          email_digest_frequency?: string
          email_digest_hour?: number
          email_documents?: boolean
          email_maintenance?: boolean
          email_messages?: boolean
          email_payments?: boolean
          email_urgent_only?: boolean
          id?: string
          in_app_bookings?: boolean
          in_app_deals?: boolean
          in_app_documents?: boolean
          in_app_maintenance?: boolean
          in_app_messages?: boolean
          in_app_payments?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          email_bookings?: boolean
          email_deals?: boolean
          email_digest_day?: string
          email_digest_frequency?: string
          email_digest_hour?: number
          email_documents?: boolean
          email_maintenance?: boolean
          email_messages?: boolean
          email_payments?: boolean
          email_urgent_only?: boolean
          id?: string
          in_app_bookings?: boolean
          in_app_deals?: boolean
          in_app_documents?: boolean
          in_app_maintenance?: boolean
          in_app_messages?: boolean
          in_app_payments?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          active: boolean | null
          body_template: string | null
          cooldown_seconds: number | null
          created_at: string | null
          cta_label_template: string | null
          cta_url_template: string | null
          default_channel: string
          event_type: string
          group_key_template: string | null
          groupable: boolean | null
          icon_key: string | null
          id: string
          notification_type: string
          priority: string
          subtitle_template: string | null
          template_key: string
          title_template: string
        }
        Insert: {
          active?: boolean | null
          body_template?: string | null
          cooldown_seconds?: number | null
          created_at?: string | null
          cta_label_template?: string | null
          cta_url_template?: string | null
          default_channel?: string
          event_type: string
          group_key_template?: string | null
          groupable?: boolean | null
          icon_key?: string | null
          id?: string
          notification_type?: string
          priority?: string
          subtitle_template?: string | null
          template_key: string
          title_template: string
        }
        Update: {
          active?: boolean | null
          body_template?: string | null
          cooldown_seconds?: number | null
          created_at?: string | null
          cta_label_template?: string | null
          cta_url_template?: string | null
          default_channel?: string
          event_type?: string
          group_key_template?: string | null
          groupable?: boolean | null
          icon_key?: string | null
          id?: string
          notification_type?: string
          priority?: string
          subtitle_template?: string | null
          template_key?: string
          title_template?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          channel: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          dedup_key: string | null
          entity_id: string | null
          entity_type: string | null
          eta_max: number | null
          eta_min: number | null
          event_type: string | null
          expires_at: string | null
          group_key: string | null
          icon_key: string | null
          id: string
          image_url: string | null
          is_actioned: boolean | null
          is_archived: boolean | null
          is_seen: boolean | null
          link: string | null
          message: string
          metadata_json: Json | null
          notification_type: string | null
          org_id: string | null
          priority: string | null
          progress_percent: number | null
          read: boolean
          read_at: string | null
          resolved: boolean
          resolved_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          status_code: string | null
          subtitle: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          dedup_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          eta_max?: number | null
          eta_min?: number | null
          event_type?: string | null
          expires_at?: string | null
          group_key?: string | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          is_actioned?: boolean | null
          is_archived?: boolean | null
          is_seen?: boolean | null
          link?: string | null
          message?: string
          metadata_json?: Json | null
          notification_type?: string | null
          org_id?: string | null
          priority?: string | null
          progress_percent?: number | null
          read?: boolean
          read_at?: string | null
          resolved?: boolean
          resolved_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status_code?: string | null
          subtitle?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          dedup_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          eta_max?: number | null
          eta_min?: number | null
          event_type?: string | null
          expires_at?: string | null
          group_key?: string | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          is_actioned?: boolean | null
          is_archived?: boolean | null
          is_seen?: boolean | null
          link?: string | null
          message?: string
          metadata_json?: Json | null
          notification_type?: string | null
          org_id?: string | null
          priority?: string | null
          progress_percent?: number | null
          read?: boolean
          read_at?: string | null
          resolved?: boolean
          resolved_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status_code?: string | null
          subtitle?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_audit: {
        Row: {
          flow_key: string
          id: string
          issue_count: number | null
          notes_json: Json | null
          recoverable: boolean | null
          status: string
          step_key: string | null
          updated_at: string
        }
        Insert: {
          flow_key: string
          id?: string
          issue_count?: number | null
          notes_json?: Json | null
          recoverable?: boolean | null
          status?: string
          step_key?: string | null
          updated_at?: string
        }
        Update: {
          flow_key?: string
          id?: string
          issue_count?: number | null
          notes_json?: Json | null
          recoverable?: boolean | null
          status?: string
          step_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_shop_candidates: {
        Row: {
          address: string | null
          batch_id: string | null
          candidate_status: string
          canonical_name: string
          canonical_slug: string | null
          canonical_subcategory: string | null
          canonical_vertical: string
          city: string
          coherence_checked_at: string | null
          coherence_conflicts_json: Json | null
          coherence_quarantine_reason: string | null
          coherence_quarantined: boolean | null
          coherence_score: number | null
          coherence_status: string | null
          country: string
          created_at: string
          duplicate_group_id: string | null
          entity_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          phone: string | null
          price_tier: number | null
          quality_score: number | null
          rating: number | null
          raw_id: string | null
          reason_json: Json | null
          reviews_count: number | null
          source_external_id: string | null
          source_type: string
          updated_at: string
          website: string | null
          zone: string | null
        }
        Insert: {
          address?: string | null
          batch_id?: string | null
          candidate_status?: string
          canonical_name: string
          canonical_slug?: string | null
          canonical_subcategory?: string | null
          canonical_vertical?: string
          city?: string
          coherence_checked_at?: string | null
          coherence_conflicts_json?: Json | null
          coherence_quarantine_reason?: string | null
          coherence_quarantined?: boolean | null
          coherence_score?: number | null
          coherence_status?: string | null
          country?: string
          created_at?: string
          duplicate_group_id?: string | null
          entity_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          price_tier?: number | null
          quality_score?: number | null
          rating?: number | null
          raw_id?: string | null
          reason_json?: Json | null
          reviews_count?: number | null
          source_external_id?: string | null
          source_type?: string
          updated_at?: string
          website?: string | null
          zone?: string | null
        }
        Update: {
          address?: string | null
          batch_id?: string | null
          candidate_status?: string
          canonical_name?: string
          canonical_slug?: string | null
          canonical_subcategory?: string | null
          canonical_vertical?: string
          city?: string
          coherence_checked_at?: string | null
          coherence_conflicts_json?: Json | null
          coherence_quarantine_reason?: string | null
          coherence_quarantined?: boolean | null
          coherence_score?: number | null
          coherence_status?: string | null
          country?: string
          created_at?: string
          duplicate_group_id?: string | null
          entity_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          price_tier?: number | null
          quality_score?: number | null
          rating?: number | null
          raw_id?: string | null
          reason_json?: Json | null
          reviews_count?: number | null
          source_external_id?: string | null
          source_type?: string
          updated_at?: string
          website?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_shop_candidates_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_shop_candidates_raw_id_fkey"
            columns: ["raw_id"]
            isOneToOne: false
            referencedRelation: "imported_shop_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_live_metrics: {
        Row: {
          context: Json | null
          id: string
          metric_key: string
          metric_value: number | null
          recorded_at: string | null
        }
        Insert: {
          context?: Json | null
          id?: string
          metric_key: string
          metric_value?: number | null
          recorded_at?: string | null
        }
        Update: {
          context?: Json | null
          id?: string
          metric_key?: string
          metric_value?: number | null
          recorded_at?: string | null
        }
        Relationships: []
      }
      ops_sla_events: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string | null
          elapsed_seconds: number | null
          id: string
          sla_status: string
          sla_type: string
          target_seconds: number
          updated_at: string | null
        }
        Insert: {
          context_id?: string | null
          context_type: string
          created_at?: string | null
          elapsed_seconds?: number | null
          id?: string
          sla_status?: string
          sla_type: string
          target_seconds: number
          updated_at?: string | null
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string | null
          elapsed_seconds?: number | null
          id?: string
          sla_status?: string
          sla_type?: string
          target_seconds?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      orbit_call_presence: {
        Row: {
          call_session_id: string
          connection_state: string | null
          device_type: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          metadata_json: Json | null
          user_id: string
        }
        Insert: {
          call_session_id: string
          connection_state?: string | null
          device_type?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          metadata_json?: Json | null
          user_id: string
        }
        Update: {
          call_session_id?: string
          connection_state?: string | null
          device_type?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          metadata_json?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      orbit_call_sessions: {
        Row: {
          answered_at: string | null
          auth_context_hash: string | null
          call_scope: string
          call_type: string
          callee_user_id: string
          caller_user_id: string
          created_at: string
          e2ee_key_hint: string | null
          ended_at: string | null
          expires_at: string | null
          id: string
          metadata_json: Json
          room_id: string
          security_tier: string | null
          started_at: string | null
          status: string
          timeout_at: string
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          auth_context_hash?: string | null
          call_scope?: string
          call_type: string
          callee_user_id: string
          caller_user_id: string
          created_at?: string
          e2ee_key_hint?: string | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          metadata_json?: Json
          room_id: string
          security_tier?: string | null
          started_at?: string | null
          status?: string
          timeout_at?: string
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          auth_context_hash?: string | null
          call_scope?: string
          call_type?: string
          callee_user_id?: string
          caller_user_id?: string
          created_at?: string
          e2ee_key_hint?: string | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          metadata_json?: Json
          room_id?: string
          security_tier?: string | null
          started_at?: string | null
          status?: string
          timeout_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      orbit_call_sessions_v2: {
        Row: {
          callee_orbit_id: string
          caller_orbit_id: string
          caller_user_id: string
          created_at: string
          id: string
          mode: string
          status: string
          updated_at: string
        }
        Insert: {
          callee_orbit_id: string
          caller_orbit_id: string
          caller_user_id: string
          created_at?: string
          id?: string
          mode?: string
          status?: string
          updated_at?: string
        }
        Update: {
          callee_orbit_id?: string
          caller_orbit_id?: string
          caller_user_id?: string
          created_at?: string
          id?: string
          mode?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      orbit_call_signals: {
        Row: {
          consumed: boolean
          created_at: string
          expires_at: string | null
          id: string
          nonce: string | null
          payload: Json
          receiver_user_id: string
          replay_guard_hash: string | null
          sender_user_id: string
          session_id: string
          signal_type: string
        }
        Insert: {
          consumed?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          nonce?: string | null
          payload?: Json
          receiver_user_id: string
          replay_guard_hash?: string | null
          sender_user_id: string
          session_id: string
          signal_type: string
        }
        Update: {
          consumed?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          nonce?: string | null
          payload?: Json
          receiver_user_id?: string
          replay_guard_hash?: string | null
          sender_user_id?: string
          session_id?: string
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_call_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "orbit_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_call_signals_v2: {
        Row: {
          created_at: string
          id: number
          payload: Json
          sender_orbit_id: string
          sender_user_id: string
          session_id: string
          signal_type: string
          target_orbit_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          payload: Json
          sender_orbit_id: string
          sender_user_id: string
          session_id: string
          signal_type: string
          target_orbit_id: string
        }
        Update: {
          created_at?: string
          id?: number
          payload?: Json
          sender_orbit_id?: string
          sender_user_id?: string
          session_id?: string
          signal_type?: string
          target_orbit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_call_signals_v2_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "orbit_call_sessions_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_device_keys: {
        Row: {
          created_at: string | null
          device_label: string | null
          id: string
          identity_id: string
          is_active: boolean | null
          key_algo: string | null
          public_key: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_label?: string | null
          id?: string
          identity_id: string
          is_active?: boolean | null
          key_algo?: string | null
          public_key: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_label?: string | null
          id?: string
          identity_id?: string
          is_active?: boolean | null
          key_algo?: string | null
          public_key?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orbit_device_keys_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "orbit_identity_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_identity_profiles: {
        Row: {
          anonymity_mode: boolean | null
          avatar_url: string | null
          created_at: string | null
          discoverable: boolean | null
          display_name: string | null
          id: string
          public_handle: string | null
          updated_at: string | null
          user_id: string | null
          verification_level: string | null
          workspace_id: string | null
        }
        Insert: {
          anonymity_mode?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          discoverable?: boolean | null
          display_name?: string | null
          id?: string
          public_handle?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_level?: string | null
          workspace_id?: string | null
        }
        Update: {
          anonymity_mode?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          discoverable?: boolean | null
          display_name?: string | null
          id?: string
          public_handle?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_level?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      orbit_launch_audits: {
        Row: {
          analytics_ready: boolean | null
          catalog_ready: boolean | null
          checked_at: string | null
          checkout_ready: boolean | null
          geo_configured: boolean | null
          id: string
          overall_score: number | null
          share_ready: boolean | null
          shop_id: string
          translation_ready: boolean | null
          user_id: string
        }
        Insert: {
          analytics_ready?: boolean | null
          catalog_ready?: boolean | null
          checked_at?: string | null
          checkout_ready?: boolean | null
          geo_configured?: boolean | null
          id?: string
          overall_score?: number | null
          share_ready?: boolean | null
          shop_id: string
          translation_ready?: boolean | null
          user_id: string
        }
        Update: {
          analytics_ready?: boolean | null
          catalog_ready?: boolean | null
          checked_at?: string | null
          checkout_ready?: boolean | null
          geo_configured?: boolean | null
          id?: string
          overall_score?: number | null
          share_ready?: boolean | null
          shop_id?: string
          translation_ready?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_launch_audits_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_profiles_v2: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          device_id: string | null
          display_name: string | null
          email: string | null
          id: string
          orbit_id: string
          permissions: Json | null
          role: string
          service_links: Json | null
          updated_at: string | null
          verification_level: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          device_id?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          orbit_id: string
          permissions?: Json | null
          role?: string
          service_links?: Json | null
          updated_at?: string | null
          verification_level?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          device_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          orbit_id?: string
          permissions?: Json | null
          role?: string
          service_links?: Json | null
          updated_at?: string | null
          verification_level?: number | null
        }
        Relationships: []
      }
      orbit_session_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          identity_id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          identity_id: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          identity_id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_session_tokens_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "orbit_identity_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          item_name: string
          menu_item_id: string | null
          notes: string | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_name: string
          menu_item_id?: string | null
          notes?: string | null
          order_id: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_name?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string
          quantity?: number
          total_price?: number
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
      order_payout_locks: {
        Row: {
          beneficiary_type: string
          id: string
          locked_at: string | null
          notes: string | null
          order_id: string
        }
        Insert: {
          beneficiary_type: string
          id?: string
          locked_at?: string | null
          notes?: string | null
          order_id: string
        }
        Update: {
          beneficiary_type?: string
          id?: string
          locked_at?: string | null
          notes?: string | null
          order_id?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          assigned_driver_user_id: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          customer_user_id: string
          customer_wallet_id: string | null
          delivery_fee: number | null
          delivery_status: string | null
          delivery_validated_at: string | null
          delivery_validation_method: string | null
          dispatch_job_id: string | null
          driver_amount: number | null
          driver_wallet_id: string | null
          dropoff_address_id: string | null
          gross_amount: number | null
          id: string
          merchant_net_amount: number | null
          merchant_profile_id: string | null
          merchant_wallet_id: string | null
          notes: string | null
          order_mode: string | null
          order_type: string
          payment_mode: string | null
          payment_status: string | null
          pickup_address_id: string | null
          platform_commission_amount: number | null
          service_fee: number | null
          service_mode: string
          settlement_status: string | null
          status: string | null
          subtotal: number | null
          total_amount: number | null
          updated_at: string | null
          wallet_status: string | null
          workspace_id: string | null
        }
        Insert: {
          assigned_driver_user_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_user_id: string
          customer_wallet_id?: string | null
          delivery_fee?: number | null
          delivery_status?: string | null
          delivery_validated_at?: string | null
          delivery_validation_method?: string | null
          dispatch_job_id?: string | null
          driver_amount?: number | null
          driver_wallet_id?: string | null
          dropoff_address_id?: string | null
          gross_amount?: number | null
          id?: string
          merchant_net_amount?: number | null
          merchant_profile_id?: string | null
          merchant_wallet_id?: string | null
          notes?: string | null
          order_mode?: string | null
          order_type?: string
          payment_mode?: string | null
          payment_status?: string | null
          pickup_address_id?: string | null
          platform_commission_amount?: number | null
          service_fee?: number | null
          service_mode?: string
          settlement_status?: string | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string | null
          wallet_status?: string | null
          workspace_id?: string | null
        }
        Update: {
          assigned_driver_user_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_user_id?: string
          customer_wallet_id?: string | null
          delivery_fee?: number | null
          delivery_status?: string | null
          delivery_validated_at?: string | null
          delivery_validation_method?: string | null
          dispatch_job_id?: string | null
          driver_amount?: number | null
          driver_wallet_id?: string | null
          dropoff_address_id?: string | null
          gross_amount?: number | null
          id?: string
          merchant_net_amount?: number | null
          merchant_profile_id?: string | null
          merchant_wallet_id?: string | null
          notes?: string | null
          order_mode?: string | null
          order_type?: string
          payment_mode?: string | null
          payment_status?: string | null
          pickup_address_id?: string | null
          platform_commission_amount?: number | null
          service_fee?: number | null
          service_mode?: string
          settlement_status?: string | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string | null
          wallet_status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_wallet_id_fkey"
            columns: ["customer_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_wallet_id_fkey"
            columns: ["driver_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_dropoff_address_id_fkey"
            columns: ["dropoff_address_id"]
            isOneToOne: false
            referencedRelation: "saved_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_merchant_wallet_id_fkey"
            columns: ["merchant_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pickup_address_id_fkey"
            columns: ["pickup_address_id"]
            isOneToOne: false
            referencedRelation: "saved_addresses"
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
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          external_id: string
          id: string
          metadata: Json | null
          processed: boolean
          provider: string
        }
        Insert: {
          created_at?: string
          event_type: string
          external_id: string
          id: string
          metadata?: Json | null
          processed?: boolean
          provider?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          external_id?: string
          id?: string
          metadata?: Json | null
          processed?: boolean
          provider?: string
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          amount: number
          cart_id: string | null
          created_at: string | null
          currency: string | null
          external_intent_id: string | null
          guest_id: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          paid_at: string | null
          payment_method_type: string | null
          provider: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          amount?: number
          cart_id?: string | null
          created_at?: string | null
          currency?: string | null
          external_intent_id?: string | null
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_method_type?: string | null
          provider?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          cart_id?: string | null
          created_at?: string | null
          currency?: string | null
          external_intent_id?: string | null
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_method_type?: string | null
          provider?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "storefront_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_links: {
        Row: {
          brand: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_default: boolean
          label: string | null
          last4: string | null
          method_type: string
          provider: string
          provider_method_id: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          last4?: string | null
          method_type?: string
          provider?: string
          provider_method_id: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          last4?: string | null
          method_type?: string
          provider?: string
          provider_method_id?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_nonces: {
        Row: {
          nonce: string
          payload_json: Json | null
          used_at: string
          user_id: string
        }
        Insert: {
          nonce: string
          payload_json?: Json | null
          used_at?: string
          user_id: string
        }
        Update: {
          nonce?: string
          payload_json?: Json | null
          used_at?: string
          user_id?: string
        }
        Relationships: []
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
      payment_provider_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload_json: Json
          processed: boolean
          processed_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload_json?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload_json?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
        }
        Relationships: []
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
          metadata: Json
          org_id: string
          paid_at: string | null
          paid_by: string | null
          payment_tx_id: string | null
          recipient_email: string | null
          recipient_id: string | null
          recipient_name: string | null
          requester_id: string | null
          sender_id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_payment_link: string | null
          subtitle: string | null
          thread_id: string | null
          title: string | null
          transaction_id: string | null
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
          metadata?: Json
          org_id: string
          paid_at?: string | null
          paid_by?: string | null
          payment_tx_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          requester_id?: string | null
          sender_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_link?: string | null
          subtitle?: string | null
          thread_id?: string | null
          title?: string | null
          transaction_id?: string | null
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
          metadata?: Json
          org_id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_tx_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          requester_id?: string | null
          sender_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_link?: string | null
          subtitle?: string | null
          thread_id?: string | null
          title?: string | null
          transaction_id?: string | null
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
      payment_sessions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string | null
          expires_at: string | null
          id: string
          metadata_json: Json | null
          order_id: string | null
          payer_id: string | null
          payment_method: string | null
          qr_target_id: string | null
          shop_id: string
          status: string | null
          terminal_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          metadata_json?: Json | null
          order_id?: string | null
          payer_id?: string | null
          payment_method?: string | null
          qr_target_id?: string | null
          shop_id: string
          status?: string | null
          terminal_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          metadata_json?: Json | null
          order_id?: string | null
          payer_id?: string | null
          payment_method?: string | null
          qr_target_id?: string | null
          shop_id?: string
          status?: string | null
          terminal_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "storefront_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_qr_target_id_fkey"
            columns: ["qr_target_id"]
            isOneToOne: false
            referencedRelation: "qr_order_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "shop_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          merchant_id: string | null
          metadata_json: Json | null
          payment_type: string
          provider: string
          provider_payment_id: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          merchant_id?: string | null
          metadata_json?: Json | null
          payment_type?: string
          provider?: string
          provider_payment_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          merchant_id?: string | null
          metadata_json?: Json | null
          payment_type?: string
          provider?: string
          provider_payment_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_profiles: {
        Row: {
          created_at: string
          id: string
          owner_profile_id: string
          owner_type: string
          payout_mode: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_profile_id: string
          owner_type: string
          payout_mode?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_profile_id?: string
          owner_type?: string
          payout_mode?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          currency: string
          destination_ref: string | null
          destination_type: string | null
          id: string
          note: string | null
          owner_orbit_id: string
          provider: string | null
          provider_payout_id: string | null
          rejected_reason: string | null
          status: string
          updated_at: string
          user_id: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          currency: string
          destination_ref?: string | null
          destination_type?: string | null
          id: string
          note?: string | null
          owner_orbit_id: string
          provider?: string | null
          provider_payout_id?: string | null
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          destination_ref?: string | null
          destination_type?: string | null
          id?: string
          note?: string | null
          owner_orbit_id?: string
          provider?: string | null
          provider_payout_id?: string | null
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          wallet_id?: string
        }
        Relationships: []
      }
      permission_templates: {
        Row: {
          created_at: string | null
          id: string
          label: string
          permissions: Json | null
          template_key: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          permissions?: Json | null
          template_key: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          permissions?: Json | null
          template_key?: string
        }
        Relationships: []
      }
      phone_otp_sessions: {
        Row: {
          attempt_count: number | null
          attempts: number | null
          channel: string | null
          created_at: string | null
          expires_at: string
          guest_id: string | null
          id: string
          otp_code: string
          phone: string
          status: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          attempts?: number | null
          channel?: string | null
          created_at?: string | null
          expires_at: string
          guest_id?: string | null
          id?: string
          otp_code: string
          phone: string
          status?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          attempts?: number | null
          channel?: string | null
          created_at?: string | null
          expires_at?: string
          guest_id?: string | null
          id?: string
          otp_code?: string
          phone?: string
          status?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      platform_actions_log: {
        Row: {
          action_type: string
          auto_applied: boolean
          created_at: string
          decision: string
          description: string
          engine_source: string
          id: string
          metadata_json: Json | null
          result: string | null
          severity: string
          target_path: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          auto_applied?: boolean
          created_at?: string
          decision: string
          description: string
          engine_source: string
          id?: string
          metadata_json?: Json | null
          result?: string | null
          severity?: string
          target_path?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          auto_applied?: boolean
          created_at?: string
          decision?: string
          description?: string
          engine_source?: string
          id?: string
          metadata_json?: Json | null
          result?: string | null
          severity?: string
          target_path?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      platform_health_scores: {
        Row: {
          cleanup_score: number
          coherence_score: number
          created_at: string
          details_json: Json | null
          global_score: number
          i18n_score: number
          id: string
          performance_score: number
          routing_score: number
        }
        Insert: {
          cleanup_score?: number
          coherence_score?: number
          created_at?: string
          details_json?: Json | null
          global_score?: number
          i18n_score?: number
          id?: string
          performance_score?: number
          routing_score?: number
        }
        Update: {
          cleanup_score?: number
          coherence_score?: number
          created_at?: string
          details_json?: Json | null
          global_score?: number
          i18n_score?: number
          id?: string
          performance_score?: number
          routing_score?: number
        }
        Relationships: []
      }
      platform_policy_rules: {
        Row: {
          action_type: string
          auto_fix_allowed: boolean
          condition_type: string
          condition_value: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          priority: number
          risk_level: string
          rule_name: string
          updated_at: string
          vertical: string | null
        }
        Insert: {
          action_type: string
          auto_fix_allowed?: boolean
          condition_type: string
          condition_value: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          priority?: number
          risk_level?: string
          rule_name: string
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          action_type?: string
          auto_fix_allowed?: boolean
          condition_type?: string
          condition_value?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          priority?: number
          risk_level?: string
          rule_name?: string
          updated_at?: string
          vertical?: string | null
        }
        Relationships: []
      }
      platform_recovery_runs: {
        Row: {
          auto_fixes_count: number | null
          completed_at: string | null
          errors_count: number | null
          id: string
          modules_json: Json | null
          report_json: Json | null
          started_at: string
          status: string
          summary_json: Json | null
          total_ms: number | null
          trigger_type: string
        }
        Insert: {
          auto_fixes_count?: number | null
          completed_at?: string | null
          errors_count?: number | null
          id?: string
          modules_json?: Json | null
          report_json?: Json | null
          started_at?: string
          status?: string
          summary_json?: Json | null
          total_ms?: number | null
          trigger_type?: string
        }
        Update: {
          auto_fixes_count?: number | null
          completed_at?: string | null
          errors_count?: number | null
          id?: string
          modules_json?: Json | null
          report_json?: Json | null
          started_at?: string
          status?: string
          summary_json?: Json | null
          total_ms?: number | null
          trigger_type?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      pos_orders: {
        Row: {
          created_at: string
          id: string
          kitchen_status: string
          notes: string | null
          order_id: string
          order_type: string
          source_type: string
          table_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kitchen_status?: string
          notes?: string | null
          order_id: string
          order_type: string
          source_type: string
          table_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kitchen_status?: string
          notes?: string | null
          order_id?: string
          order_type?: string
          source_type?: string
          table_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
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
      product_search_index: {
        Row: {
          availability_score: number | null
          brand: string | null
          category: string | null
          city: string | null
          country: string | null
          entity_id: string | null
          family: string | null
          final_rank_score: number | null
          freshness_score: number | null
          language: string | null
          popularity_score: number | null
          product_id: string
          quality_score: number | null
          searchable_plain: string | null
          searchable_text: unknown
          subcategory: string | null
          synonyms_json: Json | null
          tags_json: Json | null
          updated_at: string | null
          vertical: string | null
        }
        Insert: {
          availability_score?: number | null
          brand?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          entity_id?: string | null
          family?: string | null
          final_rank_score?: number | null
          freshness_score?: number | null
          language?: string | null
          popularity_score?: number | null
          product_id: string
          quality_score?: number | null
          searchable_plain?: string | null
          searchable_text?: unknown
          subcategory?: string | null
          synonyms_json?: Json | null
          tags_json?: Json | null
          updated_at?: string | null
          vertical?: string | null
        }
        Update: {
          availability_score?: number | null
          brand?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          entity_id?: string | null
          family?: string | null
          final_rank_score?: number | null
          freshness_score?: number | null
          language?: string | null
          popularity_score?: number | null
          product_id?: string
          quality_score?: number | null
          searchable_plain?: string | null
          searchable_text?: unknown
          subcategory?: string | null
          synonyms_json?: Json | null
          tags_json?: Json | null
          updated_at?: string | null
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_search_index_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          shop_id: string
          sort_order: number
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price?: number
          shop_id: string
          sort_order?: number
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          shop_id?: string
          sort_order?: number
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
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
          orbit_media_auto_download: boolean | null
          orbit_message_preview: boolean | null
          orbit_notifications: boolean | null
          phone: string | null
          postal_code: string | null
          preferred_currency: string | null
          preferred_locale: string | null
          privacy_last_seen: boolean | null
          privacy_link_previews: boolean | null
          privacy_online_status: boolean | null
          privacy_profile_photo: boolean | null
          privacy_read_receipts: boolean
          privacy_typing_indicators: boolean
          referral_code: string | null
          signature_url: string | null
          tax_id: string | null
          telegram_username: string | null
          updated_at: string
          user_type: string
          username: string | null
          wallet_pin_failed_attempts: number
          wallet_pin_hash: string | null
          wallet_pin_locked_until: string | null
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
          orbit_media_auto_download?: boolean | null
          orbit_message_preview?: boolean | null
          orbit_notifications?: boolean | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          privacy_last_seen?: boolean | null
          privacy_link_previews?: boolean | null
          privacy_online_status?: boolean | null
          privacy_profile_photo?: boolean | null
          privacy_read_receipts?: boolean
          privacy_typing_indicators?: boolean
          referral_code?: string | null
          signature_url?: string | null
          tax_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_type?: string
          username?: string | null
          wallet_pin_failed_attempts?: number
          wallet_pin_hash?: string | null
          wallet_pin_locked_until?: string | null
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
          orbit_media_auto_download?: boolean | null
          orbit_message_preview?: boolean | null
          orbit_notifications?: boolean | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          privacy_last_seen?: boolean | null
          privacy_link_previews?: boolean | null
          privacy_online_status?: boolean | null
          privacy_profile_photo?: boolean | null
          privacy_read_receipts?: boolean
          privacy_typing_indicators?: boolean
          referral_code?: string | null
          signature_url?: string | null
          tax_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_type?: string
          username?: string | null
          wallet_pin_failed_attempts?: number
          wallet_pin_hash?: string | null
          wallet_pin_locked_until?: string | null
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
      property_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_url: string
          id: string
          lease_id: string | null
          org_id: string | null
          property_id: string | null
          tenant_id: string | null
          title: string | null
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_url: string
          id?: string
          lease_id?: string | null
          org_id?: string | null
          property_id?: string | null
          tenant_id?: string | null
          title?: string | null
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_url?: string
          id?: string
          lease_id?: string | null
          org_id?: string | null
          property_id?: string | null
          tenant_id?: string | null
          title?: string | null
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      property_listings_v2: {
        Row: {
          amenities: Json | null
          availability: Json | null
          capacity: Json | null
          created_at: string | null
          description: string | null
          flow_mode: string
          id: string
          location: Json
          owner_orbit_id: string
          photos: Json | null
          pricing: Json
          status: string
          title: string
          updated_at: string | null
          user_id: string
          zone_id: string | null
        }
        Insert: {
          amenities?: Json | null
          availability?: Json | null
          capacity?: Json | null
          created_at?: string | null
          description?: string | null
          flow_mode?: string
          id?: string
          location?: Json
          owner_orbit_id: string
          photos?: Json | null
          pricing?: Json
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
          zone_id?: string | null
        }
        Update: {
          amenities?: Json | null
          availability?: Json | null
          capacity?: Json | null
          created_at?: string | null
          description?: string | null
          flow_mode?: string
          id?: string
          location?: Json
          owner_orbit_id?: string
          photos?: Json | null
          pricing?: Json
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_listings_v2_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      property_units: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          currency: string | null
          floor: number | null
          id: string
          notes: string | null
          property_id: string
          rent_amount: number | null
          size_sqm: number | null
          status: string | null
          unit_number: string
          updated_at: string
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string | null
          floor?: number | null
          id?: string
          notes?: string | null
          property_id: string
          rent_amount?: number | null
          size_sqm?: number | null
          status?: string | null
          unit_number?: string
          updated_at?: string
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string | null
          floor?: number | null
          id?: string
          notes?: string | null
          property_id?: string
          rent_amount?: number | null
          size_sqm?: number | null
          status?: string | null
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_units_property_id_fkey"
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
          listing_type: Database["public"]["Enums"]["listing_type"]
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
          listing_type?: Database["public"]["Enums"]["listing_type"]
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
          listing_type?: Database["public"]["Enums"]["listing_type"]
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
      public_storefront_settings: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          id: string
          is_public: boolean | null
          logo_url: string | null
          merchant_profile_id: string
          public_slug: string | null
          seo_description: string | null
          seo_title: string | null
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          merchant_profile_id: string
          public_slug?: string | null
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          merchant_profile_id?: string
          public_slug?: string | null
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_storefront_settings_merchant_profile_id_fkey"
            columns: ["merchant_profile_id"]
            isOneToOne: true
            referencedRelation: "merchant_onboarding_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_device_tokens: {
        Row: {
          created_at: string | null
          device_token: string
          guest_id: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          platform: string
          provider: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_token: string
          guest_id?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          platform: string
          provider?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_token?: string
          guest_id?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          platform?: string
          provider?: string
          user_id?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          active: boolean
          created_at: string
          id: string
          orbit_id: string | null
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id: string
          orbit_id?: string | null
          platform?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          orbit_id?: string | null
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qr_order_targets: {
        Row: {
          active: boolean
          created_at: string
          expires_at: string | null
          id: string
          last_scanned_at: string | null
          merchant_profile_id: string | null
          payload_json: Json | null
          qr_purpose: string | null
          scan_count: number | null
          shop_table_id: string | null
          storefront_page_id: string
          table_number: string | null
          target_code: string
          target_label: string
          target_type: string
          terminal_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          last_scanned_at?: string | null
          merchant_profile_id?: string | null
          payload_json?: Json | null
          qr_purpose?: string | null
          scan_count?: number | null
          shop_table_id?: string | null
          storefront_page_id: string
          table_number?: string | null
          target_code: string
          target_label: string
          target_type: string
          terminal_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          last_scanned_at?: string | null
          merchant_profile_id?: string | null
          payload_json?: Json | null
          qr_purpose?: string | null
          scan_count?: number | null
          shop_table_id?: string | null
          storefront_page_id?: string
          table_number?: string | null
          target_code?: string
          target_label?: string
          target_type?: string
          terminal_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_order_targets_merchant_profile_id_fkey"
            columns: ["merchant_profile_id"]
            isOneToOne: false
            referencedRelation: "merchant_onboarding_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_order_targets_shop_table_id_fkey"
            columns: ["shop_table_id"]
            isOneToOne: false
            referencedRelation: "shop_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_order_targets_storefront_page_id_fkey"
            columns: ["storefront_page_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_order_targets_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "shop_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_payment_sessions: {
        Row: {
          amount: number | null
          completed_at: string | null
          context_id: string | null
          context_type: string
          created_at: string
          creator_user_id: string
          currency: string
          expires_at: string
          id: string
          nonce: string
          order_id: string | null
          payer_user_id: string | null
          scanned_at: string | null
          session_token: string
          status: string
          store_id: string | null
          table_number: string | null
          terminal_id: string | null
          transaction_intent_id: string | null
        }
        Insert: {
          amount?: number | null
          completed_at?: string | null
          context_id?: string | null
          context_type?: string
          created_at?: string
          creator_user_id: string
          currency?: string
          expires_at: string
          id?: string
          nonce: string
          order_id?: string | null
          payer_user_id?: string | null
          scanned_at?: string | null
          session_token: string
          status?: string
          store_id?: string | null
          table_number?: string | null
          terminal_id?: string | null
          transaction_intent_id?: string | null
        }
        Update: {
          amount?: number | null
          completed_at?: string | null
          context_id?: string | null
          context_type?: string
          created_at?: string
          creator_user_id?: string
          currency?: string
          expires_at?: string
          id?: string
          nonce?: string
          order_id?: string | null
          payer_user_id?: string | null
          scanned_at?: string | null
          session_token?: string
          status?: string
          store_id?: string | null
          table_number?: string | null
          terminal_id?: string | null
          transaction_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_payment_sessions_transaction_intent_id_fkey"
            columns: ["transaction_intent_id"]
            isOneToOne: false
            referencedRelation: "transaction_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_targets: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          type?: string
        }
        Relationships: []
      }
      ranking_snapshots: {
        Row: {
          boost_readiness_score: number
          claim_readiness_score: number
          conversion_score: number
          created_at: string | null
          data_quality_score: number
          dedup_risk_score: number
          entity_id: string
          entity_type: string
          freshness_score: number
          geo_confidence_score: number
          global_rank_score: number
          id: string
          menu_quality_score: number
          ranking_reason_json: Json | null
          reputation_score: number
          taxonomy_confidence_score: number
          visibility_class: string
          visual_quality_score: number
        }
        Insert: {
          boost_readiness_score?: number
          claim_readiness_score?: number
          conversion_score?: number
          created_at?: string | null
          data_quality_score?: number
          dedup_risk_score?: number
          entity_id: string
          entity_type: string
          freshness_score?: number
          geo_confidence_score?: number
          global_rank_score?: number
          id?: string
          menu_quality_score?: number
          ranking_reason_json?: Json | null
          reputation_score?: number
          taxonomy_confidence_score?: number
          visibility_class?: string
          visual_quality_score?: number
        }
        Update: {
          boost_readiness_score?: number
          claim_readiness_score?: number
          conversion_score?: number
          created_at?: string | null
          data_quality_score?: number
          dedup_risk_score?: number
          entity_id?: string
          entity_type?: string
          freshness_score?: number
          geo_confidence_score?: number
          global_rank_score?: number
          id?: string
          menu_quality_score?: number
          ranking_reason_json?: Json | null
          reputation_score?: number
          taxonomy_confidence_score?: number
          visibility_class?: string
          visual_quality_score?: number
        }
        Relationships: []
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
      recommendation_signals: {
        Row: {
          context: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          service_vertical: string
          signal_type: string
          user_id: string
          weight: number | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          service_vertical: string
          signal_type: string
          user_id: string
          weight?: number | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          service_vertical?: string
          signal_type?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      recon_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          body: string | null
          created_at: string | null
          id: string
          recon_id: string
          severity: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          recon_id: string
          severity?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          recon_id?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recon_alerts_recon_id_fkey"
            columns: ["recon_id"]
            isOneToOne: false
            referencedRelation: "financial_reconciliation"
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
      refund_requests: {
        Row: {
          amount: number
          auto_approved: boolean | null
          booking_id: string | null
          buyer_or_tenant_orbit_id: string | null
          context_id: string | null
          context_type: string
          created_at: string | null
          currency: string | null
          id: string
          owner_orbit_id: string | null
          processed_at: string | null
          reason: string | null
          refund_status: string
          rent_payment_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          auto_approved?: boolean | null
          booking_id?: string | null
          buyer_or_tenant_orbit_id?: string | null
          context_id?: string | null
          context_type: string
          created_at?: string | null
          currency?: string | null
          id?: string
          owner_orbit_id?: string | null
          processed_at?: string | null
          reason?: string | null
          refund_status?: string
          rent_payment_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          auto_approved?: boolean | null
          booking_id?: string | null
          buyer_or_tenant_orbit_id?: string | null
          context_id?: string | null
          context_type?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          owner_orbit_id?: string | null
          processed_at?: string | null
          reason?: string | null
          refund_status?: string
          rent_payment_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          lease_id: string | null
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
          wallet_transaction_id: string | null
        }
        Insert: {
          charges_amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          last_reminder_at?: string | null
          lease_id?: string | null
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
          wallet_transaction_id?: string | null
        }
        Update: {
          charges_amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          last_reminder_at?: string | null
          lease_id?: string | null
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
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_calls_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
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
      rent_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          due_date: string
          id: string
          lease_id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          property_id: string | null
          reference: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string | null
          due_date: string
          id?: string
          lease_id: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          property_id?: string | null
          reference?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          due_date?: string
          id?: string
          lease_id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          property_id?: string | null
          reference?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_tenant_id_fkey"
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
      ride_dispatch_logs: {
        Row: {
          created_at: string | null
          dispatch_reason: string | null
          driver_id: string | null
          id: string
          response_status: string | null
          ride_request_id: string
          score: number | null
          wave_index: number | null
        }
        Insert: {
          created_at?: string | null
          dispatch_reason?: string | null
          driver_id?: string | null
          id?: string
          response_status?: string | null
          ride_request_id: string
          score?: number | null
          wave_index?: number | null
        }
        Update: {
          created_at?: string | null
          dispatch_reason?: string | null
          driver_id?: string | null
          id?: string
          response_status?: string | null
          ride_request_id?: string
          score?: number | null
          wave_index?: number | null
        }
        Relationships: []
      }
      ride_disputes: {
        Row: {
          admin_note: string | null
          against_user_id: string | null
          created_at: string
          dispute_type: string
          id: string
          opened_by: string
          reason: string | null
          refund_amount: number | null
          resolution: string | null
          ride_request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          against_user_id?: string | null
          created_at?: string
          dispute_type: string
          id?: string
          opened_by: string
          reason?: string | null
          refund_amount?: number | null
          resolution?: string | null
          ride_request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          against_user_id?: string | null
          created_at?: string
          dispute_type?: string
          id?: string
          opened_by?: string
          reason?: string | null
          refund_amount?: number | null
          resolution?: string | null
          ride_request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ride_eta_snapshots: {
        Row: {
          distance_km: number | null
          driver_id: string | null
          eta_minutes: number | null
          id: string
          recorded_at: string | null
          ride_request_id: string
          traffic_factor: number | null
        }
        Insert: {
          distance_km?: number | null
          driver_id?: string | null
          eta_minutes?: number | null
          id?: string
          recorded_at?: string | null
          ride_request_id: string
          traffic_factor?: number | null
        }
        Update: {
          distance_km?: number | null
          driver_id?: string | null
          eta_minutes?: number | null
          id?: string
          recorded_at?: string | null
          ride_request_id?: string
          traffic_factor?: number | null
        }
        Relationships: []
      }
      ride_offers: {
        Row: {
          driver_id: string
          id: string
          offer_status: string
          responded_at: string | null
          ride_request_id: string
          score: number | null
          sent_at: string
        }
        Insert: {
          driver_id: string
          id?: string
          offer_status?: string
          responded_at?: string | null
          ride_request_id: string
          score?: number | null
          sent_at?: string
        }
        Update: {
          driver_id?: string
          id?: string
          offer_status?: string
          responded_at?: string | null
          ride_request_id?: string
          score?: number | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_offers_ride_request_id_fkey"
            columns: ["ride_request_id"]
            isOneToOne: false
            referencedRelation: "ride_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_requests: {
        Row: {
          ai_dispatch_version: string | null
          assigned_at: string | null
          assigned_ride_type: string | null
          cancellation_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          current_wave: number | null
          dispute_status: string | null
          driver_arrived_at: string | null
          driver_net_amount: number | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          expires_at: string
          final_amount: number | null
          gross_amount: number | null
          id: string
          offered_driver_ids: string[] | null
          pickup_confirmed_at: string | null
          pickup_lat: number
          pickup_lng: number
          platform_fee: number | null
          predicted_wait_minutes: number | null
          requested_ride_type: string | null
          rider_id: string
          rider_priority: string | null
          rider_rating: number | null
          rider_review: string | null
          search_radius_km: number | null
          selected_driver_id: string | null
          settlement_status: string | null
          status: string
          thread_id: string | null
          tip_amount: number | null
          tip_settled: boolean | null
          trip_ended_at: string | null
          trip_started_at: string | null
          updated_at: string
          zone_key: string | null
        }
        Insert: {
          ai_dispatch_version?: string | null
          assigned_at?: string | null
          assigned_ride_type?: string | null
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          current_wave?: number | null
          dispute_status?: string | null
          driver_arrived_at?: string | null
          driver_net_amount?: number | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          expires_at?: string
          final_amount?: number | null
          gross_amount?: number | null
          id?: string
          offered_driver_ids?: string[] | null
          pickup_confirmed_at?: string | null
          pickup_lat: number
          pickup_lng: number
          platform_fee?: number | null
          predicted_wait_minutes?: number | null
          requested_ride_type?: string | null
          rider_id: string
          rider_priority?: string | null
          rider_rating?: number | null
          rider_review?: string | null
          search_radius_km?: number | null
          selected_driver_id?: string | null
          settlement_status?: string | null
          status?: string
          thread_id?: string | null
          tip_amount?: number | null
          tip_settled?: boolean | null
          trip_ended_at?: string | null
          trip_started_at?: string | null
          updated_at?: string
          zone_key?: string | null
        }
        Update: {
          ai_dispatch_version?: string | null
          assigned_at?: string | null
          assigned_ride_type?: string | null
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          current_wave?: number | null
          dispute_status?: string | null
          driver_arrived_at?: string | null
          driver_net_amount?: number | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          expires_at?: string
          final_amount?: number | null
          gross_amount?: number | null
          id?: string
          offered_driver_ids?: string[] | null
          pickup_confirmed_at?: string | null
          pickup_lat?: number
          pickup_lng?: number
          platform_fee?: number | null
          predicted_wait_minutes?: number | null
          requested_ride_type?: string | null
          rider_id?: string
          rider_priority?: string | null
          rider_rating?: number | null
          rider_review?: string | null
          search_radius_km?: number | null
          selected_driver_id?: string | null
          settlement_status?: string | null
          status?: string
          thread_id?: string | null
          tip_amount?: number | null
          tip_settled?: boolean | null
          trip_ended_at?: string | null
          trip_started_at?: string | null
          updated_at?: string
          zone_key?: string | null
        }
        Relationships: []
      }
      rtc_config: {
        Row: {
          active: boolean
          config: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          provider: string | null
          stun_urls: string[] | null
          turn_password: string | null
          turn_urls: string[] | null
          turn_username: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          provider?: string | null
          stun_urls?: string[] | null
          turn_password?: string | null
          turn_urls?: string[] | null
          turn_username?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          provider?: string | null
          stun_urls?: string[] | null
          turn_password?: string | null
          turn_urls?: string[] | null
          turn_username?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rtc_signaling_messages: {
        Row: {
          call_session_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          message_type: string
          payload: Json
          sender_id: string | null
          workspace_id: string | null
        }
        Insert: {
          call_session_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message_type: string
          payload: Json
          sender_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          call_session_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message_type?: string
          payload?: Json
          sender_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      sales_ai_activities: {
        Row: {
          activity_type: string
          content: string | null
          created_at: string | null
          direction: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          outcome: string | null
        }
        Insert: {
          activity_type: string
          content?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          outcome?: string | null
        }
        Update: {
          activity_type?: string
          content?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_ai_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_ai_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_ai_leads: {
        Row: {
          area: string | null
          city: string | null
          company_name: string | null
          contact_name: string | null
          created_at: string | null
          cuisine_type: string | null
          email: string | null
          id: string
          metadata: Json | null
          phone: string | null
          score: number | null
          source: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          area?: string | null
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          created_at?: string | null
          cuisine_type?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          phone?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          area?: string | null
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          created_at?: string | null
          cuisine_type?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          phone?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      sales_ai_sequence_runs: {
        Row: {
          created_at: string | null
          current_step_order: number | null
          id: string
          last_output: string | null
          lead_id: string
          metadata: Json | null
          next_run_at: string | null
          sequence_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_step_order?: number | null
          id?: string
          last_output?: string | null
          lead_id: string
          metadata?: Json | null
          next_run_at?: string | null
          sequence_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_step_order?: number | null
          id?: string
          last_output?: string | null
          lead_id?: string
          metadata?: Json | null
          next_run_at?: string | null
          sequence_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_ai_sequence_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_ai_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_ai_sequence_runs_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sales_ai_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_ai_sequence_steps: {
        Row: {
          created_at: string | null
          delay_hours: number | null
          id: string
          metadata: Json | null
          sequence_id: string
          step_order: number
          step_type: string
          template: string | null
        }
        Insert: {
          created_at?: string | null
          delay_hours?: number | null
          id?: string
          metadata?: Json | null
          sequence_id: string
          step_order: number
          step_type: string
          template?: string | null
        }
        Update: {
          created_at?: string | null
          delay_hours?: number | null
          id?: string
          metadata?: Json | null
          sequence_id?: string
          step_order?: number
          step_type?: string
          template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_ai_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sales_ai_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_ai_sequences: {
        Row: {
          audience_type: string | null
          channel: string
          created_at: string | null
          id: string
          is_personalized: boolean | null
          sequence_name: string
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          audience_type?: string | null
          channel: string
          created_at?: string | null
          id?: string
          is_personalized?: boolean | null
          sequence_name: string
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          audience_type?: string | null
          channel?: string
          created_at?: string | null
          id?: string
          is_personalized?: boolean | null
          sequence_name?: string
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      saved_addresses: {
        Row: {
          area: string | null
          building: string | null
          city: string | null
          country_code: string | null
          created_at: string | null
          delivery_notes: string | null
          floor: string | null
          full_address: string
          id: string
          is_default: boolean | null
          label: string
          landmark: string | null
          last_used_at: string | null
          lat: number | null
          lng: number | null
          street_name: string | null
          street_number: string | null
          title: string | null
          unit_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          area?: string | null
          building?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          floor?: string | null
          full_address: string
          id?: string
          is_default?: boolean | null
          label: string
          landmark?: string | null
          last_used_at?: string | null
          lat?: number | null
          lng?: number | null
          street_name?: string | null
          street_number?: string | null
          title?: string | null
          unit_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          area?: string | null
          building?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          floor?: string | null
          full_address?: string
          id?: string
          is_default?: boolean | null
          label?: string
          landmark?: string | null
          last_used_at?: string | null
          lat?: number | null
          lng?: number | null
          street_name?: string | null
          street_number?: string | null
          title?: string | null
          unit_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_carts: {
        Row: {
          created_at: string
          id: string
          items_json: Json
          label: string | null
          merchant_id: string | null
          merchant_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items_json?: Json
          label?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items_json?: Json
          label?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          orbit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters: Json
          id: string
          name: string
          orbit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          orbit_id?: string
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
      security_nonces: {
        Row: {
          created_at: string
          domain: string
          expires_at: string
          id: string
          nonce: string
        }
        Insert: {
          created_at?: string
          domain: string
          expires_at: string
          id?: string
          nonce: string
        }
        Update: {
          created_at?: string
          domain?: string
          expires_at?: string
          id?: string
          nonce?: string
        }
        Relationships: []
      }
      security_reviews: {
        Row: {
          audit_level: string
          created_at: string
          created_by: string
          findings: Json | null
          id: string
          scope: string
          status: string
        }
        Insert: {
          audit_level?: string
          created_at?: string
          created_by: string
          findings?: Json | null
          id?: string
          scope: string
          status?: string
        }
        Update: {
          audit_level?: string
          created_at?: string
          created_by?: string
          findings?: Json | null
          id?: string
          scope?: string
          status?: string
        }
        Relationships: []
      }
      seed_merchant_promos: {
        Row: {
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          merchant_id: string
          minimum_order_amount: number | null
          starts_at: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          merchant_id: string
          minimum_order_amount?: number | null
          starts_at?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          merchant_id?: string
          minimum_order_amount?: number | null
          starts_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "seed_merchant_promos_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seed_merchant_promos_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "seed_merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_merchants: {
        Row: {
          area: string
          auto_published_at: string | null
          backend_repaired_at: string | null
          blocking_reason: string | null
          branch_label: string | null
          brand_name: string | null
          category: string
          category_mapped_at: string | null
          city: string
          coherence_score: number | null
          coherence_status: string | null
          country: string | null
          cover_image: string | null
          created_at: string
          cuisine_tags: string[] | null
          dedup_status: string | null
          delivery_available: boolean | null
          delivery_radius_km: number | null
          delivery_time_max: number
          delivery_time_min: number
          delivery_zones: Json | null
          description: string | null
          display_priority: number | null
          duplicate_confidence: number | null
          duplicate_of: string | null
          field_sources_json: Json | null
          freshness_score: number | null
          grocery_catalog_at: string | null
          grocery_catalog_json: Json | null
          halal: boolean | null
          hotel_inventory_at: string | null
          hotel_inventory_json: Json | null
          id: string
          images: string[] | null
          ingestion_warnings: string[] | null
          integrity_score: number | null
          is_active: boolean
          is_featured: boolean
          is_flagged: boolean | null
          is_open: boolean
          last_publish_check_at: string | null
          last_seen_at: string | null
          last_verified_at: string | null
          latitude: number | null
          logo_image: string | null
          longitude: number | null
          manual_lock: boolean | null
          menu_items_json: Json | null
          menu_normalized_at: string | null
          menu_quality_flag: string | null
          menu_sections_json: Json | null
          minimum_order_amount: number | null
          name: string
          needs_rescrape: boolean | null
          opening_hours: Json | null
          owner_claimed: boolean | null
          owner_controlled: boolean | null
          phone: string | null
          pipeline_last_run_at: string | null
          pipeline_stage: string | null
          pipeline_status: string | null
          price_level: number
          promo_active: boolean | null
          promo_text: string | null
          publish_gate_status: string | null
          publish_source: string | null
          published_at: string | null
          rating: number
          raw_hotel_inventory_json: Json | null
          raw_menu_json: Json | null
          raw_service_catalog_json: Json | null
          review_count: number
          review_required: boolean | null
          route_status: string | null
          seo_issues: string[] | null
          seo_status: string | null
          service_catalog_at: string | null
          service_catalog_json: Json | null
          source_confidence: number | null
          source_key: string | null
          source_snapshot_at: string | null
          source_snapshot_json: Json | null
          source_updated_at: string | null
          source_url: string | null
          subcategory: string
          support_email: string | null
          support_phone: string | null
          tier: string
          unpublish_reason: string | null
          unpublished_at: string | null
          vertical: string | null
          vertical_confidence: number | null
          vertical_locked: boolean | null
          visibility_decision_reason: string | null
          visibility_mode: string | null
          visibility_score: number
          website: string | null
        }
        Insert: {
          area: string
          auto_published_at?: string | null
          backend_repaired_at?: string | null
          blocking_reason?: string | null
          branch_label?: string | null
          brand_name?: string | null
          category: string
          category_mapped_at?: string | null
          city?: string
          coherence_score?: number | null
          coherence_status?: string | null
          country?: string | null
          cover_image?: string | null
          created_at?: string
          cuisine_tags?: string[] | null
          dedup_status?: string | null
          delivery_available?: boolean | null
          delivery_radius_km?: number | null
          delivery_time_max?: number
          delivery_time_min?: number
          delivery_zones?: Json | null
          description?: string | null
          display_priority?: number | null
          duplicate_confidence?: number | null
          duplicate_of?: string | null
          field_sources_json?: Json | null
          freshness_score?: number | null
          grocery_catalog_at?: string | null
          grocery_catalog_json?: Json | null
          halal?: boolean | null
          hotel_inventory_at?: string | null
          hotel_inventory_json?: Json | null
          id?: string
          images?: string[] | null
          ingestion_warnings?: string[] | null
          integrity_score?: number | null
          is_active?: boolean
          is_featured?: boolean
          is_flagged?: boolean | null
          is_open?: boolean
          last_publish_check_at?: string | null
          last_seen_at?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          logo_image?: string | null
          longitude?: number | null
          manual_lock?: boolean | null
          menu_items_json?: Json | null
          menu_normalized_at?: string | null
          menu_quality_flag?: string | null
          menu_sections_json?: Json | null
          minimum_order_amount?: number | null
          name: string
          needs_rescrape?: boolean | null
          opening_hours?: Json | null
          owner_claimed?: boolean | null
          owner_controlled?: boolean | null
          phone?: string | null
          pipeline_last_run_at?: string | null
          pipeline_stage?: string | null
          pipeline_status?: string | null
          price_level?: number
          promo_active?: boolean | null
          promo_text?: string | null
          publish_gate_status?: string | null
          publish_source?: string | null
          published_at?: string | null
          rating?: number
          raw_hotel_inventory_json?: Json | null
          raw_menu_json?: Json | null
          raw_service_catalog_json?: Json | null
          review_count?: number
          review_required?: boolean | null
          route_status?: string | null
          seo_issues?: string[] | null
          seo_status?: string | null
          service_catalog_at?: string | null
          service_catalog_json?: Json | null
          source_confidence?: number | null
          source_key?: string | null
          source_snapshot_at?: string | null
          source_snapshot_json?: Json | null
          source_updated_at?: string | null
          source_url?: string | null
          subcategory: string
          support_email?: string | null
          support_phone?: string | null
          tier?: string
          unpublish_reason?: string | null
          unpublished_at?: string | null
          vertical?: string | null
          vertical_confidence?: number | null
          vertical_locked?: boolean | null
          visibility_decision_reason?: string | null
          visibility_mode?: string | null
          visibility_score?: number
          website?: string | null
        }
        Update: {
          area?: string
          auto_published_at?: string | null
          backend_repaired_at?: string | null
          blocking_reason?: string | null
          branch_label?: string | null
          brand_name?: string | null
          category?: string
          category_mapped_at?: string | null
          city?: string
          coherence_score?: number | null
          coherence_status?: string | null
          country?: string | null
          cover_image?: string | null
          created_at?: string
          cuisine_tags?: string[] | null
          dedup_status?: string | null
          delivery_available?: boolean | null
          delivery_radius_km?: number | null
          delivery_time_max?: number
          delivery_time_min?: number
          delivery_zones?: Json | null
          description?: string | null
          display_priority?: number | null
          duplicate_confidence?: number | null
          duplicate_of?: string | null
          field_sources_json?: Json | null
          freshness_score?: number | null
          grocery_catalog_at?: string | null
          grocery_catalog_json?: Json | null
          halal?: boolean | null
          hotel_inventory_at?: string | null
          hotel_inventory_json?: Json | null
          id?: string
          images?: string[] | null
          ingestion_warnings?: string[] | null
          integrity_score?: number | null
          is_active?: boolean
          is_featured?: boolean
          is_flagged?: boolean | null
          is_open?: boolean
          last_publish_check_at?: string | null
          last_seen_at?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          logo_image?: string | null
          longitude?: number | null
          manual_lock?: boolean | null
          menu_items_json?: Json | null
          menu_normalized_at?: string | null
          menu_quality_flag?: string | null
          menu_sections_json?: Json | null
          minimum_order_amount?: number | null
          name?: string
          needs_rescrape?: boolean | null
          opening_hours?: Json | null
          owner_claimed?: boolean | null
          owner_controlled?: boolean | null
          phone?: string | null
          pipeline_last_run_at?: string | null
          pipeline_stage?: string | null
          pipeline_status?: string | null
          price_level?: number
          promo_active?: boolean | null
          promo_text?: string | null
          publish_gate_status?: string | null
          publish_source?: string | null
          published_at?: string | null
          rating?: number
          raw_hotel_inventory_json?: Json | null
          raw_menu_json?: Json | null
          raw_service_catalog_json?: Json | null
          review_count?: number
          review_required?: boolean | null
          route_status?: string | null
          seo_issues?: string[] | null
          seo_status?: string | null
          service_catalog_at?: string | null
          service_catalog_json?: Json | null
          source_confidence?: number | null
          source_key?: string | null
          source_snapshot_at?: string | null
          source_snapshot_json?: Json | null
          source_updated_at?: string | null
          source_url?: string | null
          subcategory?: string
          support_email?: string | null
          support_phone?: string | null
          tier?: string
          unpublish_reason?: string | null
          unpublished_at?: string | null
          vertical?: string | null
          vertical_confidence?: number | null
          vertical_locked?: boolean | null
          visibility_decision_reason?: string | null
          visibility_mode?: string | null
          visibility_score?: number
          website?: string | null
        }
        Relationships: []
      }
      seed_products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_available: boolean
          merchant_id: string
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_available?: boolean
          merchant_id: string
          name: string
          price: number
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_available?: boolean
          merchant_id?: string
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "seed_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seed_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "seed_merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_kpi_snapshots: {
        Row: {
          completed_bookings: number
          confirmed_bookings: number
          created_at: string
          gross_revenue: number
          id: string
          owner_orbit_id: string
          paid_rent_amount: number
          pending_rent_amount: number
          published_listings: number
          total_bookings: number
          total_listings: number
        }
        Insert: {
          completed_bookings?: number
          confirmed_bookings?: number
          created_at?: string
          gross_revenue?: number
          id: string
          owner_orbit_id: string
          paid_rent_amount?: number
          pending_rent_amount?: number
          published_listings?: number
          total_bookings?: number
          total_listings?: number
        }
        Update: {
          completed_bookings?: number
          confirmed_bookings?: number
          created_at?: string
          gross_revenue?: number
          id?: string
          owner_orbit_id?: string
          paid_rent_amount?: number
          pending_rent_amount?: number
          published_listings?: number
          total_bookings?: number
          total_listings?: number
        }
        Relationships: []
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
      service_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          profile_type: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          profile_type: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          profile_type?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          category: string
          city: string | null
          country: string
          created_at: string
          created_by_org_id: string | null
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
          created_by_org_id?: string | null
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
          created_by_org_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "service_providers_created_by_org_id_fkey"
            columns: ["created_by_org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_created_by_org_id_fkey"
            columns: ["created_by_org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_ledger: {
        Row: {
          booking_id: string | null
          created_at: string
          currency: string
          gross_amount: number
          id: string
          merchant_id: string
          net_amount: number
          order_id: string | null
          payment_id: string | null
          platform_fee: number
          processing_fee: number
          status: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          currency?: string
          gross_amount: number
          id?: string
          merchant_id: string
          net_amount: number
          order_id?: string | null
          payment_id?: string | null
          platform_fee?: number
          processing_fee?: number
          status?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          merchant_id?: string
          net_amount?: number
          order_id?: string | null
          payment_id?: string | null
          platform_fee?: number
          processing_fee?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_ledger_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchant_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_records: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata_json: Json | null
          period_end: string
          period_start: string
          provider: string
          provider_payout_id: string | null
          recipient_type: string
          recipient_user_id: string
          settled_at: string | null
          status: string
          transaction_count: number
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata_json?: Json | null
          period_end: string
          period_start: string
          provider?: string
          provider_payout_id?: string | null
          recipient_type?: string
          recipient_user_id: string
          settled_at?: string | null
          status?: string
          transaction_count?: number
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata_json?: Json | null
          period_end?: string
          period_start?: string
          provider?: string
          provider_payout_id?: string | null
          recipient_type?: string
          recipient_user_id?: string
          settled_at?: string | null
          status?: string
          transaction_count?: number
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
      shop_follows: {
        Row: {
          created_at: string
          id: string
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_follows_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_tables: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          qr_target_id: string | null
          seats: number | null
          shop_id: string
          status: string | null
          table_number: number | null
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          qr_target_id?: string | null
          seats?: number | null
          shop_id: string
          status?: string | null
          table_number?: number | null
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          qr_target_id?: string | null
          seats?: number | null
          shop_id?: string
          status?: string | null
          table_number?: number | null
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_tables_qr_target_id_fkey"
            columns: ["qr_target_id"]
            isOneToOne: false
            referencedRelation: "qr_order_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_tables_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_terminals: {
        Row: {
          created_at: string | null
          device_info: Json | null
          id: string
          is_active: boolean | null
          label: string | null
          last_seen_at: string | null
          shop_id: string
          terminal_code: string
          terminal_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_seen_at?: string | null
          shop_id: string
          terminal_code: string
          terminal_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_seen_at?: string | null
          shop_id?: string
          terminal_code?: string
          terminal_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_terminals_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_availability: {
        Row: {
          available: boolean
          blackout: boolean
          created_at: string | null
          currency: string
          date: string
          id: string
          max_guests: number
          merchant_id: string
          min_nights: number
          notes: string | null
          price_per_night: number | null
          room_type: string
          rooms_booked: number
          rooms_total: number
          updated_at: string | null
        }
        Insert: {
          available?: boolean
          blackout?: boolean
          created_at?: string | null
          currency?: string
          date: string
          id?: string
          max_guests?: number
          merchant_id: string
          min_nights?: number
          notes?: string | null
          price_per_night?: number | null
          room_type?: string
          rooms_booked?: number
          rooms_total?: number
          updated_at?: string | null
        }
        Update: {
          available?: boolean
          blackout?: boolean
          created_at?: string | null
          currency?: string
          date?: string
          id?: string
          max_guests?: number
          merchant_id?: string
          min_nights?: number
          notes?: string | null
          price_per_night?: number | null
          room_type?: string
          rooms_booked?: number
          rooms_total?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      stay_bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string | null
          currency: string
          guest_email: string
          guest_name: string
          guest_phone: string | null
          guest_user_id: string | null
          guests_count: number
          id: string
          merchant_id: string
          nights: number
          payment_intent_id: string | null
          price_per_night: number
          room_type: string
          rooms_count: number
          special_requests: string | null
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string | null
          currency?: string
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          guest_user_id?: string | null
          guests_count?: number
          id?: string
          merchant_id: string
          nights: number
          payment_intent_id?: string | null
          price_per_night: number
          room_type?: string
          rooms_count?: number
          special_requests?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string | null
          currency?: string
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          guest_user_id?: string | null
          guests_count?: number
          id?: string
          merchant_id?: string
          nights?: number
          payment_intent_id?: string | null
          price_per_night?: number
          room_type?: string
          rooms_count?: number
          special_requests?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      stealth_notification_routes: {
        Row: {
          created_at: string | null
          endpoint: string | null
          endpoint_hash: string | null
          id: string
          identity_id: string | null
          is_active: boolean | null
          last_used_at: string | null
          metadata: Json | null
          route_type: string
          stealth_level: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          endpoint_hash?: string | null
          id?: string
          identity_id?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          route_type: string
          stealth_level?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          endpoint_hash?: string | null
          id?: string
          identity_id?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          route_type?: string
          stealth_level?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stealth_notification_routes_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "orbit_identity_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stealth_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_status: string | null
          id: string
          identity_id: string | null
          masked_preview: string | null
          metadata: Json | null
          notification_type: string
          opened_at: string | null
          route_id: string | null
          stealth_mode: string | null
          title: string | null
          workspace_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          id?: string
          identity_id?: string | null
          masked_preview?: string | null
          metadata?: Json | null
          notification_type: string
          opened_at?: string | null
          route_id?: string | null
          stealth_mode?: string | null
          title?: string | null
          workspace_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          id?: string
          identity_id?: string | null
          masked_preview?: string | null
          metadata?: Json | null
          notification_type?: string
          opened_at?: string | null
          route_id?: string | null
          stealth_mode?: string | null
          title?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stealth_notifications_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "orbit_identity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stealth_notifications_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "stealth_notification_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_assets: {
        Row: {
          asset_type: string
          bucket: string
          created_at: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          owner_user_id: string | null
          path: string
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          asset_type: string
          bucket: string
          created_at?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          owner_user_id?: string | null
          path: string
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          asset_type?: string
          bucket?: string
          created_at?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          owner_user_id?: string | null
          path?: string
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      storefront_access_invites: {
        Row: {
          accepted: boolean | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string
          invite_token: string
          shop_id: string
          user_id: string | null
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_token?: string
          shop_id: string
          user_id?: string | null
        }
        Update: {
          accepted?: boolean | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_token?: string
          shop_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_access_invites_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          full_name: string | null
          id: string
          is_default: boolean
          label: string
          phone: string | null
          postal_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_default?: boolean
          label?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_default?: boolean
          label?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      storefront_affiliate_clicks: {
        Row: {
          affiliate_id: string
          commission_amount: number | null
          converted: boolean
          created_at: string
          id: string
          item_id: string | null
          order_id: string | null
          referrer: string | null
        }
        Insert: {
          affiliate_id: string
          commission_amount?: number | null
          converted?: boolean
          created_at?: string
          id?: string
          item_id?: string | null
          order_id?: string | null
          referrer?: string | null
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number | null
          converted?: boolean
          created_at?: string
          id?: string
          item_id?: string | null
          order_id?: string | null
          referrer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "storefront_affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_affiliate_conversions: {
        Row: {
          affiliate_id: string
          commission_amount: number | null
          created_at: string | null
          id: string
          order_amount: number | null
          order_id: string | null
          status: string | null
        }
        Insert: {
          affiliate_id: string
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          order_amount?: number | null
          order_id?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          order_amount?: number | null
          order_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "storefront_affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_affiliate_programs: {
        Row: {
          cookie_days: number | null
          created_at: string | null
          default_commission_rate: number | null
          enabled: boolean | null
          id: string
          min_payout: number | null
          shop_id: string
        }
        Insert: {
          cookie_days?: number | null
          created_at?: string | null
          default_commission_rate?: number | null
          enabled?: boolean | null
          id?: string
          min_payout?: number | null
          shop_id: string
        }
        Update: {
          cookie_days?: number | null
          created_at?: string | null
          default_commission_rate?: number | null
          enabled?: boolean | null
          id?: string
          min_payout?: number | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_affiliate_programs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_affiliates: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          referral_code: string
          shop_id: string
          status: string
          total_clicks: number
          total_conversions: number
          total_earned: number
          total_paid: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          referral_code: string
          shop_id: string
          status?: string
          total_clicks?: number
          total_conversions?: number
          total_earned?: number
          total_paid?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          referral_code?: string
          shop_id?: string
          status?: string
          total_clicks?: number
          total_conversions?: number
          total_earned?: number
          total_paid?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      storefront_ai_chats: {
        Row: {
          created_at: string
          id: string
          messages: Json
          session_id: string
          shop_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          session_id: string
          shop_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          session_id?: string
          shop_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      storefront_analytics_daily: {
        Row: {
          conversion_rate: number | null
          created_at: string | null
          currency: string | null
          date: string
          id: string
          orders: number | null
          revenue: number | null
          shop_id: string
          views: number | null
          visitors: number | null
        }
        Insert: {
          conversion_rate?: number | null
          created_at?: string | null
          currency?: string | null
          date?: string
          id?: string
          orders?: number | null
          revenue?: number | null
          shop_id: string
          views?: number | null
          visitors?: number | null
        }
        Update: {
          conversion_rate?: number | null
          created_at?: string | null
          currency?: string | null
          date?: string
          id?: string
          orders?: number | null
          revenue?: number | null
          shop_id?: string
          views?: number | null
          visitors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_analytics_daily_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_analytics_events: {
        Row: {
          country: string | null
          created_at: string | null
          currency: string | null
          device_type: string | null
          event_type: string
          id: string
          item_id: string | null
          metadata_json: Json | null
          referrer: string | null
          revenue: number | null
          session_id: string | null
          shop_id: string
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          device_type?: string | null
          event_type: string
          id?: string
          item_id?: string | null
          metadata_json?: Json | null
          referrer?: string | null
          revenue?: number | null
          session_id?: string | null
          shop_id: string
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          device_type?: string | null
          event_type?: string
          id?: string
          item_id?: string | null
          metadata_json?: Json | null
          referrer?: string | null
          revenue?: number | null
          session_id?: string | null
          shop_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_analytics_events_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_auction_bids: {
        Row: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at: string
          id: string
          is_winning: boolean
        }
        Insert: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at?: string
          id?: string
          is_winning?: boolean
        }
        Update: {
          amount?: number
          auction_id?: string
          bidder_id?: string
          created_at?: string
          id?: string
          is_winning?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "storefront_auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "storefront_auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_auctions: {
        Row: {
          auto_extend_minutes: number
          bid_count: number
          created_at: string
          currency: string
          current_bid: number | null
          current_bidder_id: string | null
          description: string | null
          ends_at: string
          id: string
          item_id: string
          photo_url: string | null
          reserve_price: number | null
          seller_id: string
          shop_id: string
          starting_price: number
          starts_at: string
          status: string
          title: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          auto_extend_minutes?: number
          bid_count?: number
          created_at?: string
          currency?: string
          current_bid?: number | null
          current_bidder_id?: string | null
          description?: string | null
          ends_at: string
          id?: string
          item_id: string
          photo_url?: string | null
          reserve_price?: number | null
          seller_id: string
          shop_id: string
          starting_price?: number
          starts_at?: string
          status?: string
          title: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          auto_extend_minutes?: number
          bid_count?: number
          created_at?: string
          currency?: string
          current_bid?: number | null
          current_bidder_id?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          item_id?: string
          photo_url?: string | null
          reserve_price?: number | null
          seller_id?: string
          shop_id?: string
          starting_price?: number
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      storefront_auto_notifications: {
        Row: {
          actioned: boolean | null
          buyer_email: string | null
          buyer_id: string | null
          created_at: string | null
          id: string
          notification_type: string
          opened: boolean | null
          payload_json: Json | null
          sent_at: string | null
          shop_id: string
        }
        Insert: {
          actioned?: boolean | null
          buyer_email?: string | null
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          notification_type: string
          opened?: boolean | null
          payload_json?: Json | null
          sent_at?: string | null
          shop_id: string
        }
        Update: {
          actioned?: boolean | null
          buyer_email?: string | null
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          notification_type?: string
          opened?: boolean | null
          payload_json?: Json | null
          sent_at?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_auto_notifications_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_badges: {
        Row: {
          badge_type: string
          created_at: string
          criteria_json: Json | null
          description: string | null
          icon_url: string | null
          id: string
          name: string
          shop_id: string
          user_id: string
        }
        Insert: {
          badge_type?: string
          created_at?: string
          criteria_json?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          shop_id: string
          user_id: string
        }
        Update: {
          badge_type?: string
          created_at?: string
          criteria_json?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_badges_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_bundle_items: {
        Row: {
          bundle_id: string
          created_at: string | null
          id: string
          item_id: string
          quantity: number | null
        }
        Insert: {
          bundle_id: string
          created_at?: string | null
          id?: string
          item_id: string
          quantity?: number | null
        }
        Update: {
          bundle_id?: string
          created_at?: string | null
          id?: string
          item_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "storefront_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_bundle_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_bundles: {
        Row: {
          active: boolean | null
          bundle_price: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          photo_url: string | null
          shop_id: string
          sort_order: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          bundle_price?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          photo_url?: string | null
          shop_id: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          bundle_price?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          photo_url?: string | null
          shop_id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_bundles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: string
          item_id: string
          quantity: number | null
          unit_price: number | null
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: string
          item_id: string
          quantity?: number | null
          unit_price?: number | null
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: string
          item_id?: string
          quantity?: number | null
          unit_price?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "storefront_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_cart_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_carts: {
        Row: {
          created_at: string | null
          currency: string | null
          guest_id: string | null
          id: string
          session_id: string | null
          shop_id: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          guest_id?: string | null
          id?: string
          session_id?: string | null
          shop_id: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          guest_id?: string | null
          id?: string
          session_id?: string | null
          shop_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_carts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_catalog_categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          shop_id: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          shop_id: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          shop_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_catalog_categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "storefront_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_challenges: {
        Row: {
          active: boolean
          challenge_type: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          reward_badge: string | null
          reward_points: number
          shop_id: string
          starts_at: string
          target_value: number
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          challenge_type?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          reward_badge?: string | null
          reward_points?: number
          shop_id: string
          starts_at?: string
          target_value?: number
          title: string
          user_id: string
        }
        Update: {
          active?: boolean
          challenge_type?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          reward_badge?: string | null
          reward_points?: number
          shop_id?: string
          starts_at?: string
          target_value?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_challenges_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_comparisons: {
        Row: {
          created_at: string
          id: string
          item_ids: string[]
          shop_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_ids?: string[]
          shop_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_ids?: string[]
          shop_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      storefront_coupon_usage: {
        Row: {
          coupon_id: string
          created_at: string | null
          discount_amount: number
          id: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string | null
          discount_amount?: number
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string | null
          discount_amount?: number
          id?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "storefront_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_coupons: {
        Row: {
          active: boolean | null
          categories: string[] | null
          code: string
          created_at: string | null
          currency: string | null
          id: string
          max_discount: number | null
          min_order: number | null
          per_user_limit: number | null
          shop_id: string
          type: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          user_id: string
          valid_from: string | null
          valid_to: string | null
          value: number
        }
        Insert: {
          active?: boolean | null
          categories?: string[] | null
          code: string
          created_at?: string | null
          currency?: string | null
          id?: string
          max_discount?: number | null
          min_order?: number | null
          per_user_limit?: number | null
          shop_id: string
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          user_id: string
          valid_from?: string | null
          valid_to?: string | null
          value?: number
        }
        Update: {
          active?: boolean | null
          categories?: string[] | null
          code?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          max_discount?: number | null
          min_order?: number | null
          per_user_limit?: number | null
          shop_id?: string
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          user_id?: string
          valid_from?: string | null
          valid_to?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "storefront_coupons_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_crm_customers: {
        Row: {
          avg_order_value: number | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string | null
          first_order_at: string | null
          id: string
          last_order_at: string | null
          loyalty_points: number | null
          notes: string | null
          segment: string
          shop_id: string
          tags: string[] | null
          total_orders: number
          total_spent: number
          updated_at: string | null
        }
        Insert: {
          avg_order_value?: number | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string | null
          first_order_at?: string | null
          id?: string
          last_order_at?: string | null
          loyalty_points?: number | null
          notes?: string | null
          segment?: string
          shop_id: string
          tags?: string[] | null
          total_orders?: number
          total_spent?: number
          updated_at?: string | null
        }
        Update: {
          avg_order_value?: number | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string | null
          first_order_at?: string | null
          id?: string
          last_order_at?: string | null
          loyalty_points?: number | null
          notes?: string | null
          segment?: string
          shop_id?: string
          tags?: string[] | null
          total_orders?: number
          total_spent?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_crm_customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_deal_subscribers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          notify_daily: boolean | null
          notify_flash: boolean | null
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          notify_daily?: boolean | null
          notify_flash?: boolean | null
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          notify_daily?: boolean | null
          notify_flash?: boolean | null
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_deal_subscribers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_digital_products: {
        Row: {
          active: boolean | null
          created_at: string | null
          currency: string | null
          description: string | null
          download_limit: number | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          license_type: string | null
          photo_url: string | null
          preview_url: string | null
          price: number
          product_type: string | null
          shop_id: string
          title: string
          total_sales: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          download_limit?: number | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          license_type?: string | null
          photo_url?: string | null
          preview_url?: string | null
          price?: number
          product_type?: string | null
          shop_id: string
          title: string
          total_sales?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          download_limit?: number | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          license_type?: string | null
          photo_url?: string | null
          preview_url?: string | null
          price?: number
          product_type?: string | null
          shop_id?: string
          title?: string
          total_sales?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_digital_products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_digital_purchases: {
        Row: {
          buyer_id: string
          created_at: string | null
          download_count: number | null
          expires_at: string | null
          id: string
          license_key: string | null
          max_downloads: number | null
          product_id: string
          shop_id: string
          status: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          id?: string
          license_key?: string | null
          max_downloads?: number | null
          product_id: string
          shop_id: string
          status?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          id?: string
          license_key?: string | null
          max_downloads?: number | null
          product_id?: string
          shop_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_digital_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_digital_purchases_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_faq: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          helpful_count: number | null
          id: string
          published: boolean
          question: string
          shop_id: string
          sort_order: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          published?: boolean
          question: string
          shop_id: string
          sort_order?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          published?: boolean
          question?: string
          shop_id?: string
          sort_order?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_faq_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_flash_sales: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          ends_at: string
          id: string
          item_id: string | null
          notify_subscribers: boolean | null
          original_price: number | null
          sale_price: number | null
          sale_type: string
          shop_id: string
          sold_count: number | null
          starts_at: string
          status: string
          stock_limit: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          ends_at: string
          id?: string
          item_id?: string | null
          notify_subscribers?: boolean | null
          original_price?: number | null
          sale_price?: number | null
          sale_type?: string
          shop_id: string
          sold_count?: number | null
          starts_at: string
          status?: string
          stock_limit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          ends_at?: string
          id?: string
          item_id?: string | null
          notify_subscribers?: boolean | null
          original_price?: number | null
          sale_price?: number | null
          sale_type?: string
          shop_id?: string
          sold_count?: number | null
          starts_at?: string
          status?: string
          stock_limit?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_flash_sales_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_flash_sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_gift_card_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          gift_card_id: string
          id: string
          order_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          gift_card_id: string
          id?: string
          order_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          gift_card_id?: string
          id?: string
          order_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_gift_card_transactions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "storefront_gift_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_gift_cards: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          currency: string | null
          expires_at: string | null
          id: string
          initial_amount: number
          personal_message: string | null
          recipient_email: string | null
          recipient_name: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          remaining_amount: number
          sender_name: string | null
          shop_id: string
          status: string | null
        }
        Insert: {
          code?: string
          created_at?: string | null
          created_by: string
          currency?: string | null
          expires_at?: string | null
          id?: string
          initial_amount: number
          personal_message?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          remaining_amount: number
          sender_name?: string | null
          shop_id: string
          status?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          currency?: string | null
          expires_at?: string | null
          id?: string
          initial_amount?: number
          personal_message?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          remaining_amount?: number
          sender_name?: string | null
          shop_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_gift_cards_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_growth_metrics: {
        Row: {
          avg_order_value: number | null
          created_at: string | null
          id: string
          metric_date: string
          new_customers: number | null
          organic_orders: number | null
          referral_orders: number | null
          returning_customers: number | null
          shop_id: string
          total_revenue: number | null
        }
        Insert: {
          avg_order_value?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          new_customers?: number | null
          organic_orders?: number | null
          referral_orders?: number | null
          returning_customers?: number | null
          shop_id: string
          total_revenue?: number | null
        }
        Update: {
          avg_order_value?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          new_customers?: number | null
          organic_orders?: number | null
          referral_orders?: number | null
          returning_customers?: number | null
          shop_id?: string
          total_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_growth_metrics_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_rows: number | null
          errors_json: Json | null
          file_url: string | null
          id: string
          processed_rows: number | null
          shop_id: string
          source_type: string | null
          status: string | null
          total_rows: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_rows?: number | null
          errors_json?: Json | null
          file_url?: string | null
          id?: string
          processed_rows?: number | null
          shop_id: string
          source_type?: string | null
          status?: string | null
          total_rows?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_rows?: number | null
          errors_json?: Json | null
          file_url?: string | null
          id?: string
          processed_rows?: number | null
          shop_id?: string
          source_type?: string | null
          status?: string | null
          total_rows?: number | null
          user_id?: string
        }
        Relationships: []
      }
      storefront_influencer_collabs: {
        Row: {
          commission_percent: number | null
          created_at: string
          id: string
          influencer_id: string
          notes: string | null
          promo_code: string | null
          shop_id: string
          status: string
          total_commission: number | null
          total_sales: number | null
          updated_at: string
        }
        Insert: {
          commission_percent?: number | null
          created_at?: string
          id?: string
          influencer_id: string
          notes?: string | null
          promo_code?: string | null
          shop_id: string
          status?: string
          total_commission?: number | null
          total_sales?: number | null
          updated_at?: string
        }
        Update: {
          commission_percent?: number | null
          created_at?: string
          id?: string
          influencer_id?: string
          notes?: string | null
          promo_code?: string | null
          shop_id?: string
          status?: string
          total_commission?: number | null
          total_sales?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_influencer_collabs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_inventory_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          current_stock: number | null
          id: string
          item_id: string
          resolved: boolean | null
          resolved_at: string | null
          shop_id: string
          threshold: number | null
        }
        Insert: {
          alert_type?: string
          created_at?: string | null
          current_stock?: number | null
          id?: string
          item_id: string
          resolved?: boolean | null
          resolved_at?: string | null
          shop_id: string
          threshold?: number | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          current_stock?: number | null
          id?: string
          item_id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          shop_id?: string
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_inventory_alerts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_inventory_alerts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_invoices: {
        Row: {
          buyer_address: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_tax_id: string | null
          created_at: string | null
          currency: string | null
          discount_amount: number | null
          display_currency: string | null
          due_at: string | null
          exchange_rate: number | null
          id: string
          invoice_number: string
          issued_at: string | null
          notes: string | null
          order_id: string
          paid_at: string | null
          shipping_amount: number | null
          shop_id: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_name: string | null
          tax_rate: number | null
          total: number | null
        }
        Insert: {
          buyer_address?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_tax_id?: string | null
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          display_currency?: string | null
          due_at?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          notes?: string | null
          order_id: string
          paid_at?: string | null
          shipping_amount?: number | null
          shop_id: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_name?: string | null
          tax_rate?: number | null
          total?: number | null
        }
        Update: {
          buyer_address?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_tax_id?: string | null
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          display_currency?: string | null
          due_at?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          notes?: string | null
          order_id?: string
          paid_at?: string | null
          shipping_amount?: number | null
          shop_id?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_name?: string | null
          tax_rate?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "storefront_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_invoices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_leaderboard: {
        Row: {
          id: string
          period: string
          points: number
          rank: number | null
          shop_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          period?: string
          points?: number
          rank?: number | null
          shop_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          period?: string
          points?: number
          rank?: number | null
          shop_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_leaderboard_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_live_chat: {
        Row: {
          created_at: string | null
          id: string
          message: string
          session_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          session_id: string
          user_id: string
          user_name?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          session_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_live_chat_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "storefront_live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_live_sessions: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          featured_items: Json | null
          host_id: string
          id: string
          peak_viewers: number | null
          scheduled_at: string | null
          shop_id: string
          started_at: string | null
          status: string
          stream_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          viewer_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          featured_items?: Json | null
          host_id: string
          id?: string
          peak_viewers?: number | null
          scheduled_at?: string | null
          shop_id: string
          started_at?: string | null
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          viewer_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          featured_items?: Json | null
          host_id?: string
          id?: string
          peak_viewers?: number | null
          scheduled_at?: string | null
          shop_id?: string
          started_at?: string | null
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_live_sessions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_loyalty_history: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          points_change: number
          program_id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          points_change: number
          program_id: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          points_change?: number
          program_id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_loyalty_history_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "storefront_loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_loyalty_members: {
        Row: {
          birthday: string | null
          birthday_bonus_claimed_at: string | null
          id: string
          joined_at: string
          lifetime_points: number
          points: number
          shop_id: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday?: string | null
          birthday_bonus_claimed_at?: string | null
          id?: string
          joined_at?: string
          lifetime_points?: number
          points?: number
          shop_id: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday?: string | null
          birthday_bonus_claimed_at?: string | null
          id?: string
          joined_at?: string
          lifetime_points?: number
          points?: number
          shop_id?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_loyalty_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_loyalty_points: {
        Row: {
          id: string
          lifetime_points: number
          points: number
          program_id: string
          tier_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          lifetime_points?: number
          points?: number
          program_id: string
          tier_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          lifetime_points?: number
          points?: number
          program_id?: string
          tier_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_loyalty_points_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "storefront_loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_loyalty_points_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "storefront_loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_loyalty_programs: {
        Row: {
          active: boolean | null
          created_at: string | null
          currency: string | null
          id: string
          name: string
          points_per_currency: number | null
          shop_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name?: string
          points_per_currency?: number | null
          shop_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name?: string
          points_per_currency?: number | null
          shop_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_loyalty_programs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_loyalty_rewards: {
        Row: {
          active: boolean
          created_at: string
          currency: string | null
          current_redemptions: number | null
          description: string | null
          id: string
          max_redemptions: number | null
          min_tier: string | null
          points_required: number
          reward_type: string
          reward_value: number | null
          shop_id: string
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string | null
          current_redemptions?: number | null
          description?: string | null
          id?: string
          max_redemptions?: number | null
          min_tier?: string | null
          points_required?: number
          reward_type?: string
          reward_value?: number | null
          shop_id: string
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string | null
          current_redemptions?: number | null
          description?: string | null
          id?: string
          max_redemptions?: number | null
          min_tier?: string | null
          points_required?: number
          reward_type?: string
          reward_value?: number | null
          shop_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_loyalty_rewards_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_loyalty_tiers: {
        Row: {
          badge_emoji: string | null
          created_at: string | null
          discount_percent: number | null
          id: string
          min_points: number
          name: string
          program_id: string
          sort_order: number | null
        }
        Insert: {
          badge_emoji?: string | null
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          min_points?: number
          name: string
          program_id: string
          sort_order?: number | null
        }
        Update: {
          badge_emoji?: string | null
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          min_points?: number
          name?: string
          program_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_loyalty_tiers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "storefront_loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          member_id: string
          order_id: string | null
          points: number
          shop_id: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          member_id: string
          order_id?: string | null
          points: number
          shop_id: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string
          order_id?: string | null
          points?: number
          shop_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_loyalty_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "storefront_loyalty_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_loyalty_transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_notification_log: {
        Row: {
          body: string | null
          channel: string
          clicked_at: string | null
          event_type: string
          id: string
          metadata_json: Json | null
          read_at: string | null
          sent_at: string
          shop_id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: string
          clicked_at?: string | null
          event_type: string
          id?: string
          metadata_json?: Json | null
          read_at?: string | null
          sent_at?: string
          shop_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: string
          clicked_at?: string | null
          event_type?: string
          id?: string
          metadata_json?: Json | null
          read_at?: string | null
          sent_at?: string
          shop_id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      storefront_notification_preferences: {
        Row: {
          channel_email: boolean
          channel_push: boolean
          channel_sms: boolean
          created_at: string
          digest_frequency: string
          id: string
          notify_deals: boolean
          notify_live: boolean
          notify_orders: boolean
          notify_promotions: boolean
          notify_reviews: boolean
          notify_shipping: boolean
          shop_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_email?: boolean
          channel_push?: boolean
          channel_sms?: boolean
          created_at?: string
          digest_frequency?: string
          id?: string
          notify_deals?: boolean
          notify_live?: boolean
          notify_orders?: boolean
          notify_promotions?: boolean
          notify_reviews?: boolean
          notify_shipping?: boolean
          shop_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_email?: boolean
          channel_push?: boolean
          channel_sms?: boolean
          created_at?: string
          digest_frequency?: string
          id?: string
          notify_deals?: boolean
          notify_live?: boolean
          notify_orders?: boolean
          notify_promotions?: boolean
          notify_reviews?: boolean
          notify_shipping?: boolean
          shop_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_notification_preferences_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_order_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          order_id: string
          quantity: number | null
          title: string
          total_price: number | null
          unit_price: number | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          order_id: string
          quantity?: number | null
          title: string
          total_price?: number | null
          unit_price?: number | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          order_id?: string
          quantity?: number | null
          title?: string
          total_price?: number | null
          unit_price?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "storefront_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_orders: {
        Row: {
          accepted_at: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_phone: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          deal_id: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_job_id: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_requested: boolean | null
          delivery_source: string | null
          delivery_status: string | null
          estimated_ready_at: string | null
          fulfillment_type: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          preparing_at: string | null
          ready_at: string | null
          requires_delivery: boolean | null
          seller_id: string
          shipped_at: string | null
          shipping_address: string | null
          shipping_address_id: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_fee: number | null
          shipping_name: string | null
          shipping_phone: string | null
          shipping_zone_id: string | null
          shop_id: string
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal: number | null
          table_code: string | null
          total: number | null
          tracking_number: string | null
          updated_at: string | null
          wallet_reference_code: string | null
        }
        Insert: {
          accepted_at?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          deal_id?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_job_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_requested?: boolean | null
          delivery_source?: string | null
          delivery_status?: string | null
          estimated_ready_at?: string | null
          fulfillment_type?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          preparing_at?: string | null
          ready_at?: string | null
          requires_delivery?: boolean | null
          seller_id: string
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_address_id?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_fee?: number | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_zone_id?: string | null
          shop_id: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number | null
          table_code?: string | null
          total?: number | null
          tracking_number?: string | null
          updated_at?: string | null
          wallet_reference_code?: string | null
        }
        Update: {
          accepted_at?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          deal_id?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_job_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_requested?: boolean | null
          delivery_source?: string | null
          delivery_status?: string | null
          estimated_ready_at?: string | null
          fulfillment_type?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          preparing_at?: string | null
          ready_at?: string | null
          requires_delivery?: boolean | null
          seller_id?: string
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_address_id?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_fee?: number | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_zone_id?: string | null
          shop_id?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number | null
          table_code?: string | null
          total?: number | null
          tracking_number?: string | null
          updated_at?: string | null
          wallet_reference_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_orders_delivery_job_id_fkey"
            columns: ["delivery_job_id"]
            isOneToOne: false
            referencedRelation: "delivery_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_orders_shipping_zone_id_fkey"
            columns: ["shipping_zone_id"]
            isOneToOne: false
            referencedRelation: "storefront_shipping_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_p2p_listings: {
        Row: {
          category: string | null
          condition: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          escrow_enabled: boolean | null
          id: string
          location_city: string | null
          location_country: string | null
          photo_urls: Json | null
          price: number
          seller_id: string
          shop_id: string
          status: string | null
          title: string
          updated_at: string | null
          verified_seller: boolean | null
          views_count: number | null
        }
        Insert: {
          category?: string | null
          condition?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          escrow_enabled?: boolean | null
          id?: string
          location_city?: string | null
          location_country?: string | null
          photo_urls?: Json | null
          price: number
          seller_id: string
          shop_id: string
          status?: string | null
          title: string
          updated_at?: string | null
          verified_seller?: boolean | null
          views_count?: number | null
        }
        Update: {
          category?: string | null
          condition?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          escrow_enabled?: boolean | null
          id?: string
          location_city?: string | null
          location_country?: string | null
          photo_urls?: Json | null
          price?: number
          seller_id?: string
          shop_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          verified_seller?: boolean | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_p2p_listings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_p2p_transactions: {
        Row: {
          amount: number
          buyer_confirmed: boolean | null
          buyer_id: string
          completed_at: string | null
          created_at: string | null
          currency: string | null
          dispute_reason: string | null
          escrow_status: string | null
          id: string
          listing_id: string
          seller_id: string
          seller_shipped: boolean | null
          status: string | null
          tracking_number: string | null
        }
        Insert: {
          amount: number
          buyer_confirmed?: boolean | null
          buyer_id: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          dispute_reason?: string | null
          escrow_status?: string | null
          id?: string
          listing_id: string
          seller_id: string
          seller_shipped?: boolean | null
          status?: string | null
          tracking_number?: string | null
        }
        Update: {
          amount?: number
          buyer_confirmed?: boolean | null
          buyer_id?: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          dispute_reason?: string | null
          escrow_status?: string | null
          id?: string
          listing_id?: string
          seller_id?: string
          seller_shipped?: boolean | null
          status?: string | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_p2p_transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "storefront_p2p_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_pages: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          activation_channel: string | null
          activation_notes: string | null
          activation_status: string | null
          active: boolean | null
          address: string | null
          anchor_lat: number | null
          anchor_lng: number | null
          audit_score: number | null
          audit_status: string | null
          banner_url: string | null
          blocking_reason: string | null
          boost_expiry: string | null
          boost_multiplier: number
          branch_label: string | null
          brand_name: string | null
          category: string | null
          city: string | null
          claimed_by_owner: boolean | null
          classification_confidence: number | null
          classification_reason: string | null
          classification_signals: string[] | null
          classification_version: string | null
          coherence_score: number | null
          coherence_status: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_telegram: string | null
          contact_whatsapp: string | null
          corrected_by_human: boolean | null
          correction_count: number | null
          country: string | null
          cover_auto_url: string | null
          cover_owner_url: string | null
          cover_source: string | null
          coverage_mode: string
          coverage_radius_m: number | null
          created_at: string | null
          created_by_test: boolean
          currency: string | null
          data_freshness_at: string | null
          default_currency: string | null
          description: string | null
          display_priority: number | null
          duplicate_confidence: number | null
          duplicate_of: string | null
          entity_type: string
          geo_scope: string | null
          has_menu: boolean | null
          has_photo: boolean | null
          id: string
          invoice_next_number: number | null
          invoice_prefix: string | null
          is_auto_generated: boolean | null
          is_claimed: boolean
          is_flagged: boolean | null
          is_order_enabled: boolean
          is_payment_enabled: boolean
          is_qr_enabled: boolean
          is_test: boolean
          is_verified: boolean | null
          last_classified_at: string | null
          last_reviewed_at: string | null
          latitude: number | null
          launch_status: string
          live_lat: number | null
          live_lng: number | null
          live_updated_at: string | null
          logo_auto_url: string | null
          logo_owner_url: string | null
          logo_url: string | null
          longitude: number | null
          menu_quality_score: number | null
          merchant_profile_id: string | null
          name: string
          og_image_url: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          org_id: string
          presence_mode: string
          products_count: number | null
          provenance_json: Json | null
          radius_km: number | null
          ranking_score: number
          rating: number | null
          readiness_status: string | null
          region: string | null
          requires_review: boolean | null
          review_required: boolean | null
          reviews_count: number | null
          route_status: string | null
          scheduled_publish_at: string | null
          seo_description: string | null
          seo_title: string | null
          shop_visibility: string | null
          slug: string
          source_confidence: number | null
          source_external_id: string | null
          source_name: string | null
          source_type: string | null
          subcategory: string | null
          tagline: string | null
          tags: string[] | null
          tax_name: string | null
          tax_rate: number | null
          test_batch_id: string | null
          theme_color: string | null
          updated_at: string | null
          user_id: string
          vertical: string | null
          views_count: number | null
          visibility_mode: string | null
          zone_id: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          activation_channel?: string | null
          activation_notes?: string | null
          activation_status?: string | null
          active?: boolean | null
          address?: string | null
          anchor_lat?: number | null
          anchor_lng?: number | null
          audit_score?: number | null
          audit_status?: string | null
          banner_url?: string | null
          blocking_reason?: string | null
          boost_expiry?: string | null
          boost_multiplier?: number
          branch_label?: string | null
          brand_name?: string | null
          category?: string | null
          city?: string | null
          claimed_by_owner?: boolean | null
          classification_confidence?: number | null
          classification_reason?: string | null
          classification_signals?: string[] | null
          classification_version?: string | null
          coherence_score?: number | null
          coherence_status?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          contact_whatsapp?: string | null
          corrected_by_human?: boolean | null
          correction_count?: number | null
          country?: string | null
          cover_auto_url?: string | null
          cover_owner_url?: string | null
          cover_source?: string | null
          coverage_mode?: string
          coverage_radius_m?: number | null
          created_at?: string | null
          created_by_test?: boolean
          currency?: string | null
          data_freshness_at?: string | null
          default_currency?: string | null
          description?: string | null
          display_priority?: number | null
          duplicate_confidence?: number | null
          duplicate_of?: string | null
          entity_type?: string
          geo_scope?: string | null
          has_menu?: boolean | null
          has_photo?: boolean | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          is_auto_generated?: boolean | null
          is_claimed?: boolean
          is_flagged?: boolean | null
          is_order_enabled?: boolean
          is_payment_enabled?: boolean
          is_qr_enabled?: boolean
          is_test?: boolean
          is_verified?: boolean | null
          last_classified_at?: string | null
          last_reviewed_at?: string | null
          latitude?: number | null
          launch_status?: string
          live_lat?: number | null
          live_lng?: number | null
          live_updated_at?: string | null
          logo_auto_url?: string | null
          logo_owner_url?: string | null
          logo_url?: string | null
          longitude?: number | null
          menu_quality_score?: number | null
          merchant_profile_id?: string | null
          name: string
          og_image_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          org_id: string
          presence_mode?: string
          products_count?: number | null
          provenance_json?: Json | null
          radius_km?: number | null
          ranking_score?: number
          rating?: number | null
          readiness_status?: string | null
          region?: string | null
          requires_review?: boolean | null
          review_required?: boolean | null
          reviews_count?: number | null
          route_status?: string | null
          scheduled_publish_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shop_visibility?: string | null
          slug: string
          source_confidence?: number | null
          source_external_id?: string | null
          source_name?: string | null
          source_type?: string | null
          subcategory?: string | null
          tagline?: string | null
          tags?: string[] | null
          tax_name?: string | null
          tax_rate?: number | null
          test_batch_id?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id: string
          vertical?: string | null
          views_count?: number | null
          visibility_mode?: string | null
          zone_id?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          activation_channel?: string | null
          activation_notes?: string | null
          activation_status?: string | null
          active?: boolean | null
          address?: string | null
          anchor_lat?: number | null
          anchor_lng?: number | null
          audit_score?: number | null
          audit_status?: string | null
          banner_url?: string | null
          blocking_reason?: string | null
          boost_expiry?: string | null
          boost_multiplier?: number
          branch_label?: string | null
          brand_name?: string | null
          category?: string | null
          city?: string | null
          claimed_by_owner?: boolean | null
          classification_confidence?: number | null
          classification_reason?: string | null
          classification_signals?: string[] | null
          classification_version?: string | null
          coherence_score?: number | null
          coherence_status?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          contact_whatsapp?: string | null
          corrected_by_human?: boolean | null
          correction_count?: number | null
          country?: string | null
          cover_auto_url?: string | null
          cover_owner_url?: string | null
          cover_source?: string | null
          coverage_mode?: string
          coverage_radius_m?: number | null
          created_at?: string | null
          created_by_test?: boolean
          currency?: string | null
          data_freshness_at?: string | null
          default_currency?: string | null
          description?: string | null
          display_priority?: number | null
          duplicate_confidence?: number | null
          duplicate_of?: string | null
          entity_type?: string
          geo_scope?: string | null
          has_menu?: boolean | null
          has_photo?: boolean | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          is_auto_generated?: boolean | null
          is_claimed?: boolean
          is_flagged?: boolean | null
          is_order_enabled?: boolean
          is_payment_enabled?: boolean
          is_qr_enabled?: boolean
          is_test?: boolean
          is_verified?: boolean | null
          last_classified_at?: string | null
          last_reviewed_at?: string | null
          latitude?: number | null
          launch_status?: string
          live_lat?: number | null
          live_lng?: number | null
          live_updated_at?: string | null
          logo_auto_url?: string | null
          logo_owner_url?: string | null
          logo_url?: string | null
          longitude?: number | null
          menu_quality_score?: number | null
          merchant_profile_id?: string | null
          name?: string
          og_image_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          org_id?: string
          presence_mode?: string
          products_count?: number | null
          provenance_json?: Json | null
          radius_km?: number | null
          ranking_score?: number
          rating?: number | null
          readiness_status?: string | null
          region?: string | null
          requires_review?: boolean | null
          review_required?: boolean | null
          reviews_count?: number | null
          route_status?: string | null
          scheduled_publish_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shop_visibility?: string | null
          slug?: string
          source_confidence?: number | null
          source_external_id?: string | null
          source_name?: string | null
          source_type?: string | null
          subcategory?: string | null
          tagline?: string | null
          tags?: string[] | null
          tax_name?: string | null
          tax_rate?: number | null
          test_batch_id?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id?: string
          vertical?: string | null
          views_count?: number | null
          visibility_mode?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_pages_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_pages_merchant_profile_id_fkey"
            columns: ["merchant_profile_id"]
            isOneToOne: false
            referencedRelation: "merchant_onboarding_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_pages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_pages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_pages_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          helpful_count: number | null
          id: string
          item_id: string
          question: string
          shop_id: string
          status: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          item_id: string
          question: string
          shop_id: string
          status?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          item_id?: string
          question?: string
          shop_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_product_questions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_product_questions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_referral_conversions: {
        Row: {
          buyer_id: string | null
          commission_amount: number | null
          created_at: string | null
          id: string
          link_id: string
          order_amount: number | null
          order_id: string | null
          status: string | null
        }
        Insert: {
          buyer_id?: string | null
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          link_id: string
          order_amount?: number | null
          order_id?: string | null
          status?: string | null
        }
        Update: {
          buyer_id?: string | null
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          link_id?: string
          order_amount?: number | null
          order_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_referral_conversions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "storefront_referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_referral_links: {
        Row: {
          active: boolean | null
          clicks: number | null
          code: string
          commission_percent: number | null
          conversions: number | null
          created_at: string | null
          id: string
          parent_referrer_id: string | null
          referrer_id: string
          shop_id: string
          tier: number | null
          total_earned: number | null
        }
        Insert: {
          active?: boolean | null
          clicks?: number | null
          code?: string
          commission_percent?: number | null
          conversions?: number | null
          created_at?: string | null
          id?: string
          parent_referrer_id?: string | null
          referrer_id: string
          shop_id: string
          tier?: number | null
          total_earned?: number | null
        }
        Update: {
          active?: boolean | null
          clicks?: number | null
          code?: string
          commission_percent?: number | null
          conversions?: number | null
          created_at?: string | null
          id?: string
          parent_referrer_id?: string | null
          referrer_id?: string
          shop_id?: string
          tier?: number | null
          total_earned?: number | null
        }
        Relationships: []
      }
      storefront_refund_policies: {
        Row: {
          accepts_used: boolean | null
          created_at: string | null
          free_returns: boolean | null
          id: string
          notes: string | null
          return_window_days: number | null
          shop_id: string
        }
        Insert: {
          accepts_used?: boolean | null
          created_at?: string | null
          free_returns?: boolean | null
          id?: string
          notes?: string | null
          return_window_days?: number | null
          shop_id: string
        }
        Update: {
          accepts_used?: boolean | null
          created_at?: string | null
          free_returns?: boolean | null
          id?: string
          notes?: string | null
          return_window_days?: number | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_refund_policies_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_return_requests: {
        Row: {
          buyer_id: string
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          preferred_resolution: string | null
          reason: string
          resolved_at: string | null
          shop_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          preferred_resolution?: string | null
          reason?: string
          resolved_at?: string | null
          shop_id: string
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          preferred_resolution?: string | null
          reason?: string
          resolved_at?: string | null
          shop_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_return_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_returns: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          buyer_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          item_ids: Json | null
          order_id: string
          photo_urls: Json | null
          reason: string
          received_at: string | null
          refund_amount: number | null
          refund_type: string | null
          refunded_at: string | null
          resolution: string | null
          resolved_at: string | null
          rma_code: string | null
          seller_notes: string | null
          shipped_at: string | null
          shop_id: string
          status: string
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          buyer_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          item_ids?: Json | null
          order_id: string
          photo_urls?: Json | null
          reason?: string
          received_at?: string | null
          refund_amount?: number | null
          refund_type?: string | null
          refunded_at?: string | null
          resolution?: string | null
          resolved_at?: string | null
          rma_code?: string | null
          seller_notes?: string | null
          shipped_at?: string | null
          shop_id: string
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          buyer_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          item_ids?: Json | null
          order_id?: string
          photo_urls?: Json | null
          reason?: string
          received_at?: string | null
          refund_amount?: number | null
          refund_type?: string | null
          refunded_at?: string | null
          resolution?: string | null
          resolved_at?: string | null
          rma_code?: string | null
          seller_notes?: string | null
          shipped_at?: string | null
          shop_id?: string
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "storefront_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_returns_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_review_votes: {
        Row: {
          created_at: string
          helpful: boolean
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          helpful?: boolean
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          helpful?: boolean
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "storefront_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          item_id: string | null
          order_id: string | null
          photo_urls: Json | null
          rating: number
          responded_at: string | null
          response: string | null
          reviewer_id: string
          reviewer_name: string | null
          seller_responded_at: string | null
          seller_response: string | null
          shop_id: string
          status: string | null
          title: string | null
          updated_at: string | null
          verified_purchase: boolean | null
          video_url: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          item_id?: string | null
          order_id?: string | null
          photo_urls?: Json | null
          rating: number
          responded_at?: string | null
          response?: string | null
          reviewer_id: string
          reviewer_name?: string | null
          seller_responded_at?: string | null
          seller_response?: string | null
          shop_id: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          verified_purchase?: boolean | null
          video_url?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          item_id?: string | null
          order_id?: string | null
          photo_urls?: Json | null
          rating?: number
          responded_at?: string | null
          response?: string | null
          reviewer_id?: string
          reviewer_name?: string | null
          seller_responded_at?: string | null
          seller_response?: string | null
          shop_id?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          verified_purchase?: boolean | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "storefront_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_rfq_quotes: {
        Row: {
          created_at: string | null
          currency: string | null
          delivery_days: number | null
          id: string
          message: string | null
          price: number
          rfq_id: string
          selected: boolean | null
          status: string | null
          vendor_id: string
          vendor_name: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          delivery_days?: number | null
          id?: string
          message?: string | null
          price: number
          rfq_id: string
          selected?: boolean | null
          status?: string | null
          vendor_id: string
          vendor_name?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          delivery_days?: number | null
          id?: string
          message?: string | null
          price?: number
          rfq_id?: string
          selected?: boolean | null
          status?: string | null
          vendor_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_rfq_quotes_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "storefront_rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_rfqs: {
        Row: {
          budget_max: number | null
          buyer_id: string
          category: string | null
          created_at: string | null
          currency: string | null
          deadline: string | null
          description: string | null
          id: string
          quantity: number | null
          shop_id: string
          status: string
          title: string
          updated_at: string | null
          winning_quote_id: string | null
        }
        Insert: {
          budget_max?: number | null
          buyer_id: string
          category?: string | null
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          quantity?: number | null
          shop_id: string
          status?: string
          title: string
          updated_at?: string | null
          winning_quote_id?: string | null
        }
        Update: {
          budget_max?: number | null
          buyer_id?: string
          category?: string | null
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          quantity?: number | null
          shop_id?: string
          status?: string
          title?: string
          updated_at?: string | null
          winning_quote_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_rfqs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_risk_flags: {
        Row: {
          created_at: string | null
          flag_type: string
          id: string
          metadata_json: Json | null
          order_id: string | null
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          shop_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          flag_type?: string
          id?: string
          metadata_json?: Json | null
          order_id?: string | null
          reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shop_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          flag_type?: string
          id?: string
          metadata_json?: Json | null
          order_id?: string | null
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shop_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_risk_flags_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_shipments: {
        Row: {
          buyer_id: string | null
          carrier: string | null
          created_at: string | null
          currency: string | null
          delivered_at: string | null
          destination_country: string | null
          estimated_delivery: string | null
          events_json: Json | null
          id: string
          notes: string | null
          order_id: string
          shipped_at: string | null
          shipping_fee: number | null
          shop_id: string
          status: string | null
          tracking_events: Json | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          buyer_id?: string | null
          carrier?: string | null
          created_at?: string | null
          currency?: string | null
          delivered_at?: string | null
          destination_country?: string | null
          estimated_delivery?: string | null
          events_json?: Json | null
          id?: string
          notes?: string | null
          order_id: string
          shipped_at?: string | null
          shipping_fee?: number | null
          shop_id: string
          status?: string | null
          tracking_events?: Json | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          buyer_id?: string | null
          carrier?: string | null
          created_at?: string | null
          currency?: string | null
          delivered_at?: string | null
          destination_country?: string | null
          estimated_delivery?: string | null
          events_json?: Json | null
          id?: string
          notes?: string | null
          order_id?: string
          shipped_at?: string | null
          shipping_fee?: number | null
          shop_id?: string
          status?: string | null
          tracking_events?: Json | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "storefront_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_shipments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_shipping_zones: {
        Row: {
          active: boolean
          countries: string[] | null
          created_at: string
          currency: string
          delivery_days_max: number | null
          delivery_days_min: number | null
          fee: number
          free_above: number | null
          id: string
          name: string
          shop_id: string
        }
        Insert: {
          active?: boolean
          countries?: string[] | null
          created_at?: string
          currency?: string
          delivery_days_max?: number | null
          delivery_days_min?: number | null
          fee?: number
          free_above?: number | null
          id?: string
          name?: string
          shop_id: string
        }
        Update: {
          active?: boolean
          countries?: string[] | null
          created_at?: string
          currency?: string
          delivery_days_max?: number | null
          delivery_days_min?: number | null
          fee?: number
          free_above?: number | null
          id?: string
          name?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_shipping_zones_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_social_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "storefront_social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_social_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_social_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "storefront_social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_social_posts: {
        Row: {
          caption: string | null
          comments_count: number
          content: string | null
          created_at: string
          id: string
          is_featured: boolean | null
          item_id: string | null
          likes_count: number
          media_urls: Json | null
          photo_url: string | null
          post_type: string
          shop_id: string
          status: string
          tagged_items: Json | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean | null
          item_id?: string | null
          likes_count?: number
          media_urls?: Json | null
          photo_url?: string | null
          post_type?: string
          shop_id: string
          status?: string
          tagged_items?: Json | null
          user_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean | null
          item_id?: string | null
          likes_count?: number
          media_urls?: Json | null
          photo_url?: string | null
          post_type?: string
          shop_id?: string
          status?: string
          tagged_items?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      storefront_stock_movements: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          movement_type: string
          new_stock: number | null
          notes: string | null
          previous_stock: number | null
          quantity: number
          reference_id: string | null
          shop_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          movement_type: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity: number
          reference_id?: string | null
          shop_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          movement_type?: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity?: number
          reference_id?: string | null
          shop_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_stock_movements_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_store_credits: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          shop_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          shop_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          shop_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_store_credits_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_store_group_members: {
        Row: {
          added_at: string
          group_id: string
          id: string
          role: string
          shop_id: string
        }
        Insert: {
          added_at?: string
          group_id: string
          id?: string
          role?: string
          shop_id: string
        }
        Update: {
          added_at?: string
          group_id?: string
          id?: string
          role?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_store_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "storefront_store_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_store_group_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_store_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      storefront_sub_box_enrollments: {
        Row: {
          box_id: string
          cancelled_at: string | null
          created_at: string | null
          delivery_count: number | null
          id: string
          last_delivery_at: string | null
          next_delivery_at: string | null
          paused_at: string | null
          shipping_address: string | null
          shop_id: string
          status: string
          subscriber_id: string
        }
        Insert: {
          box_id: string
          cancelled_at?: string | null
          created_at?: string | null
          delivery_count?: number | null
          id?: string
          last_delivery_at?: string | null
          next_delivery_at?: string | null
          paused_at?: string | null
          shipping_address?: string | null
          shop_id: string
          status?: string
          subscriber_id: string
        }
        Update: {
          box_id?: string
          cancelled_at?: string | null
          created_at?: string | null
          delivery_count?: number | null
          id?: string
          last_delivery_at?: string | null
          next_delivery_at?: string | null
          paused_at?: string | null
          shipping_address?: string | null
          shop_id?: string
          status?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_sub_box_enrollments_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "storefront_sub_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_sub_box_enrollments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_sub_boxes: {
        Row: {
          active: boolean | null
          created_at: string | null
          currency: string | null
          description: string | null
          frequency: string
          id: string
          item_count: number | null
          name: string
          photo_url: string | null
          price: number
          shop_id: string
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          frequency?: string
          id?: string
          item_count?: number | null
          name: string
          photo_url?: string | null
          price?: number
          shop_id: string
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          frequency?: string
          id?: string
          item_count?: number | null
          name?: string
          photo_url?: string | null
          price?: number
          shop_id?: string
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_sub_boxes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_subscription_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string | null
          period_end: string
          period_start: string
          shop_id: string
          status: string
          subscription_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          period_end: string
          period_start: string
          shop_id: string
          status?: string
          subscription_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          period_end?: string
          period_start?: string
          shop_id?: string
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_subscription_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "storefront_subscriptions_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_subscription_plans: {
        Row: {
          active: boolean
          billing_interval: string
          created_at: string
          currency: string
          description: string | null
          id: string
          item_ids: Json | null
          max_subscribers: number | null
          name: string
          photo_url: string | null
          price: number
          shop_id: string
          trial_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          item_ids?: Json | null
          max_subscribers?: number | null
          name: string
          photo_url?: string | null
          price: number
          shop_id: string
          trial_days?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          item_ids?: Json | null
          max_subscribers?: number | null
          name?: string
          photo_url?: string | null
          price?: number
          shop_id?: string
          trial_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_subscription_plans_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_subscriptions: {
        Row: {
          buyer_email: string
          buyer_id: string
          cancelled_at: string | null
          created_at: string
          currency: string
          frequency: string
          id: string
          item_id: string | null
          last_order_at: string | null
          max_cycles: number | null
          metadata_json: Json | null
          next_order_at: string
          paused_at: string | null
          quantity: number
          shop_id: string
          status: string
          total_cycles: number | null
          total_orders: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          buyer_email?: string
          buyer_id: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          frequency?: string
          id?: string
          item_id?: string | null
          last_order_at?: string | null
          max_cycles?: number | null
          metadata_json?: Json | null
          next_order_at?: string
          paused_at?: string | null
          quantity?: number
          shop_id: string
          status?: string
          total_cycles?: number | null
          total_orders?: number
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          buyer_email?: string
          buyer_id?: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          frequency?: string
          id?: string
          item_id?: string | null
          last_order_at?: string | null
          max_cycles?: number | null
          metadata_json?: Json | null
          next_order_at?: string
          paused_at?: string | null
          quantity?: number
          shop_id?: string
          status?: string
          total_cycles?: number | null
          total_orders?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_subscriptions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_subscriptions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_subscriptions_v2: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string
          id: string
          next_billing_at: string | null
          orders_count: number | null
          pause_until: string | null
          plan_id: string
          shipping_address: Json | null
          shop_id: string
          status: string
          subscriber_id: string
          total_paid: number | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          next_billing_at?: string | null
          orders_count?: number | null
          pause_until?: string | null
          plan_id: string
          shipping_address?: Json | null
          shop_id: string
          status?: string
          subscriber_id: string
          total_paid?: number | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          next_billing_at?: string | null
          orders_count?: number | null
          pause_until?: string | null
          plan_id?: string
          shipping_address?: Json | null
          shop_id?: string
          status?: string
          subscriber_id?: string
          total_paid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_subscriptions_v2_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "storefront_subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_subscriptions_v2_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_support_messages: {
        Row: {
          created_at: string | null
          id: string
          is_bot: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_bot?: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_bot?: boolean | null
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "storefront_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          priority: string
          resolved_at: string | null
          satisfaction_rating: number | null
          shop_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          resolved_at?: string | null
          satisfaction_rating?: number | null
          shop_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          resolved_at?: string | null
          satisfaction_rating?: number | null
          shop_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_support_tickets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_tax_rules: {
        Row: {
          active: boolean | null
          applies_to: string | null
          country: string
          created_at: string | null
          id: string
          region: string | null
          shop_id: string
          tax_exempt_categories: string[] | null
          tax_inclusive: boolean | null
          tax_name: string | null
          tax_rate: number
          user_id: string
        }
        Insert: {
          active?: boolean | null
          applies_to?: string | null
          country: string
          created_at?: string | null
          id?: string
          region?: string | null
          shop_id: string
          tax_exempt_categories?: string[] | null
          tax_inclusive?: boolean | null
          tax_name?: string | null
          tax_rate?: number
          user_id: string
        }
        Update: {
          active?: boolean | null
          applies_to?: string | null
          country?: string
          created_at?: string | null
          id?: string
          region?: string | null
          shop_id?: string
          tax_exempt_categories?: string[] | null
          tax_inclusive?: boolean | null
          tax_name?: string | null
          tax_rate?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_tax_rules_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_ticket_messages: {
        Row: {
          attachment_urls: Json | null
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_role: string
          ticket_id: string
        }
        Insert: {
          attachment_urls?: Json | null
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_role?: string
          ticket_id: string
        }
        Update: {
          attachment_urls?: Json | null
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "storefront_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_translations: {
        Row: {
          created_at: string | null
          field_name: string
          field_value: string
          id: string
          locale: string
          shop_id: string
        }
        Insert: {
          created_at?: string | null
          field_name: string
          field_value: string
          id?: string
          locale?: string
          shop_id: string
        }
        Update: {
          created_at?: string | null
          field_name?: string
          field_value?: string
          id?: string
          locale?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_translations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_trust_scores: {
        Row: {
          account_age_days: number | null
          avg_rating: number | null
          avg_response_minutes: number | null
          badges: string[] | null
          completed_orders: number | null
          created_at: string | null
          id: string
          last_computed_at: string | null
          response_rate: number | null
          shop_id: string
          total_orders: number | null
          total_reviews: number | null
          trust_score: number | null
          updated_at: string | null
          user_id: string
          verified_email: boolean | null
          verified_identity: boolean | null
        }
        Insert: {
          account_age_days?: number | null
          avg_rating?: number | null
          avg_response_minutes?: number | null
          badges?: string[] | null
          completed_orders?: number | null
          created_at?: string | null
          id?: string
          last_computed_at?: string | null
          response_rate?: number | null
          shop_id: string
          total_orders?: number | null
          total_reviews?: number | null
          trust_score?: number | null
          updated_at?: string | null
          user_id: string
          verified_email?: boolean | null
          verified_identity?: boolean | null
        }
        Update: {
          account_age_days?: number | null
          avg_rating?: number | null
          avg_response_minutes?: number | null
          badges?: string[] | null
          completed_orders?: number | null
          created_at?: string | null
          id?: string
          last_computed_at?: string | null
          response_rate?: number | null
          shop_id?: string
          total_orders?: number | null
          total_reviews?: number | null
          trust_score?: number | null
          updated_at?: string | null
          user_id?: string
          verified_email?: boolean | null
          verified_identity?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_trust_scores_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "storefront_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_vendor_payouts: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          method: string | null
          paid_at: string | null
          reference: string | null
          shop_id: string
          status: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          reference?: string | null
          shop_id: string
          status?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          reference?: string | null
          shop_id?: string
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_vendor_payouts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_vendor_payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "storefront_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_vendors: {
        Row: {
          approved_at: string | null
          bio: string | null
          commission_rate: number | null
          created_at: string | null
          display_name: string
          email: string | null
          id: string
          logo_url: string | null
          payout_balance: number | null
          phone: string | null
          shop_id: string
          status: string
          total_commission: number | null
          total_sales: number | null
          updated_at: string | null
          vendor_user_id: string
        }
        Insert: {
          approved_at?: string | null
          bio?: string | null
          commission_rate?: number | null
          created_at?: string | null
          display_name: string
          email?: string | null
          id?: string
          logo_url?: string | null
          payout_balance?: number | null
          phone?: string | null
          shop_id: string
          status?: string
          total_commission?: number | null
          total_sales?: number | null
          updated_at?: string | null
          vendor_user_id: string
        }
        Update: {
          approved_at?: string | null
          bio?: string | null
          commission_rate?: number | null
          created_at?: string | null
          display_name?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          payout_balance?: number | null
          phone?: string | null
          shop_id?: string
          status?: string
          total_commission?: number | null
          total_sales?: number | null
          updated_at?: string | null
          vendor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_vendors_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_warehouse_stock: {
        Row: {
          id: string
          item_id: string
          quantity: number
          reorder_point: number
          reserved: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          item_id: string
          quantity?: number
          reorder_point?: number
          reserved?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          item_id?: string
          quantity?: number
          reorder_point?: number
          reserved?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_warehouse_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "storefront_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_warehouse_transfers: {
        Row: {
          completed_at: string | null
          created_at: string
          from_warehouse_id: string
          id: string
          item_id: string
          notes: string | null
          quantity: number
          shop_id: string
          status: string
          to_warehouse_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          from_warehouse_id: string
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          shop_id: string
          status?: string
          to_warehouse_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          from_warehouse_id?: string
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          shop_id?: string
          status?: string
          to_warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "storefront_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "storefront_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_warehouses: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          country: string
          created_at: string
          id: string
          is_default: boolean
          latitude: number | null
          longitude: number | null
          name: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      storefront_wishlist: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_wishlist_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_wishlist_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_wishlist_shares: {
        Row: {
          created_at: string
          id: string
          item_ids: string[]
          share_token: string
          shop_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_ids?: string[]
          share_token?: string
          shop_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_ids?: string[]
          share_token?: string
          shop_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_wishlist_shares_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_wishlists: {
        Row: {
          created_at: string
          id: string
          item_id: string
          notify_back_in_stock: boolean
          notify_price_drop: boolean
          price_at_add: number | null
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          notify_back_in_stock?: boolean
          notify_price_drop?: boolean
          price_at_add?: number | null
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          notify_back_in_stock?: boolean
          notify_price_drop?: boolean
          price_at_add?: number | null
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_wishlists_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "storefront_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          active: boolean | null
          category_id: string
          created_at: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          category_id: string
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          category_id?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
      support_ticket_messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          metadata: Json | null
          sender_role: string | null
          sender_user_id: string | null
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_role?: string | null
          sender_user_id?: string | null
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_role?: string | null
          sender_user_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          context_id: string | null
          context_type: string | null
          created_at: string | null
          escalated_at: string | null
          id: string
          priority: string | null
          reporter_user_id: string | null
          requester_user_id: string | null
          resolved_at: string | null
          sla_deadline: string | null
          status: string | null
          subject: string
          ticket_type: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          escalated_at?: string | null
          id?: string
          priority?: string | null
          reporter_user_id?: string | null
          requester_user_id?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string | null
          subject: string
          ticket_type: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          escalated_at?: string | null
          id?: string
          priority?: string | null
          reporter_user_id?: string | null
          requester_user_id?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string | null
          subject?: string
          ticket_type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      surge_pricing_events: {
        Row: {
          applied_multiplier: number | null
          area: string | null
          base_fee: number | null
          city: string | null
          context_type: string | null
          created_at: string | null
          demand_score: number | null
          final_fee: number | null
          id: string
          reference_id: string | null
          reference_type: string | null
          rule_id: string | null
          status: string | null
          supply_score: number | null
        }
        Insert: {
          applied_multiplier?: number | null
          area?: string | null
          base_fee?: number | null
          city?: string | null
          context_type?: string | null
          created_at?: string | null
          demand_score?: number | null
          final_fee?: number | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          rule_id?: string | null
          status?: string | null
          supply_score?: number | null
        }
        Update: {
          applied_multiplier?: number | null
          area?: string | null
          base_fee?: number | null
          city?: string | null
          context_type?: string | null
          created_at?: string | null
          demand_score?: number | null
          final_fee?: number | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          rule_id?: string | null
          status?: string | null
          supply_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "surge_pricing_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "surge_pricing_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      surge_pricing_rules: {
        Row: {
          area: string | null
          city: string | null
          context_type: string | null
          created_at: string | null
          ends_at: string | null
          id: string
          max_fee: number | null
          metadata: Json | null
          min_fee: number | null
          multiplier: number | null
          rule_name: string
          starts_at: string | null
          status: string | null
          trigger_type: string
          trigger_value: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          area?: string | null
          city?: string | null
          context_type?: string | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          max_fee?: number | null
          metadata?: Json | null
          min_fee?: number | null
          multiplier?: number | null
          rule_name: string
          starts_at?: string | null
          status?: string | null
          trigger_type: string
          trigger_value?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          area?: string | null
          city?: string | null
          context_type?: string | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          max_fee?: number | null
          metadata?: Json | null
          min_fee?: number | null
          multiplier?: number | null
          rule_name?: string
          starts_at?: string | null
          status?: string | null
          trigger_type?: string
          trigger_value?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      system_feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          flag_key: string
          flag_value: Json | null
          id: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          flag_key: string
          flag_value?: Json | null
          id?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          flag_key?: string
          flag_value?: Json | null
          id?: string
          updated_at?: string | null
          workspace_id?: string | null
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
      taxi_ride_requests: {
        Row: {
          created_at: string | null
          dropoff_label: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_distance_km: number | null
          estimated_duration_min: number | null
          id: string
          order_id: string
          pickup_label: string
          pickup_lat: number | null
          pickup_lng: number | null
          rider_user_id: string
          status: string | null
          updated_at: string | null
          vehicle_preference: string | null
        }
        Insert: {
          created_at?: string | null
          dropoff_label: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_distance_km?: number | null
          estimated_duration_min?: number | null
          id?: string
          order_id: string
          pickup_label: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          rider_user_id: string
          status?: string | null
          updated_at?: string | null
          vehicle_preference?: string | null
        }
        Update: {
          created_at?: string | null
          dropoff_label?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_distance_km?: number | null
          estimated_duration_min?: number | null
          id?: string
          order_id?: string
          pickup_label?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          rider_user_id?: string
          status?: string | null
          updated_at?: string | null
          vehicle_preference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxi_ride_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_aliases: {
        Row: {
          alias: string
          canonical_id: string
          confidence: number | null
          country_scope: string | null
          created_at: string
          id: string
          language: string | null
        }
        Insert: {
          alias: string
          canonical_id: string
          confidence?: number | null
          country_scope?: string | null
          created_at?: string
          id?: string
          language?: string | null
        }
        Update: {
          alias?: string
          canonical_id?: string
          confidence?: number | null
          country_scope?: string | null
          created_at?: string
          id?: string
          language?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_aliases_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "canonical_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_gap_candidates: {
        Row: {
          city_count: number | null
          confidence_score: number | null
          country_count: number | null
          created_at: string
          entity_count: number | null
          id: string
          proposed_name: string
          proposed_parent_id: string | null
          proposed_slug: string
          source_keywords_json: Json | null
          source_vertical: string
          status: string
        }
        Insert: {
          city_count?: number | null
          confidence_score?: number | null
          country_count?: number | null
          created_at?: string
          entity_count?: number | null
          id?: string
          proposed_name: string
          proposed_parent_id?: string | null
          proposed_slug: string
          source_keywords_json?: Json | null
          source_vertical: string
          status?: string
        }
        Update: {
          city_count?: number | null
          confidence_score?: number | null
          country_count?: number | null
          created_at?: string
          entity_count?: number | null
          id?: string
          proposed_name?: string
          proposed_parent_id?: string | null
          proposed_slug?: string
          source_keywords_json?: Json | null
          source_vertical?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_gap_candidates_proposed_parent_id_fkey"
            columns: ["proposed_parent_id"]
            isOneToOne: false
            referencedRelation: "canonical_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      team_tasks: {
        Row: {
          assigned_to: string | null
          context_id: string | null
          context_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          priority: string | null
          status: string | null
          task_type: string
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          task_type: string
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          task_type?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "team_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_workspace_members: {
        Row: {
          created_at: string | null
          id: string
          permissions: Json | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permissions?: Json | null
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permissions?: Json | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "team_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_workspaces: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          org_id: string
          workspace_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          org_id: string
          workspace_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          org_id?: string
          workspace_type?: string | null
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
      topup_requests: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          error_message: string | null
          id: string
          method: string | null
          provider: string
          provider_intent_id: string | null
          provider_session_id: string | null
          status: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          method?: string | null
          provider?: string
          provider_intent_id?: string | null
          provider_session_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          method?: string | null
          provider?: string
          provider_intent_id?: string | null
          provider_session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: []
      }
      tracking_positions: {
        Row: {
          accuracy_m: number | null
          heading: number | null
          id: string
          lat: number
          lng: number
          recorded_at: string
          session_id: string
          speed_kmh: number | null
        }
        Insert: {
          accuracy_m?: number | null
          heading?: number | null
          id?: string
          lat: number
          lng: number
          recorded_at?: string
          session_id: string
          speed_kmh?: number | null
        }
        Update: {
          accuracy_m?: number | null
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
          session_id?: string
          speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_positions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_sessions: {
        Row: {
          arrived_at: string | null
          completed_at: string | null
          context_id: string | null
          context_label: string | null
          context_type: string
          created_at: string
          current_lat: number | null
          current_lng: number | null
          destination_label: string | null
          destination_lat: number | null
          destination_lng: number | null
          eta_minutes: number | null
          id: string
          metadata_json: Json | null
          org_id: string
          route_polyline: string | null
          started_at: string | null
          status: string
          tracker_user_id: string
          updated_at: string
        }
        Insert: {
          arrived_at?: string | null
          completed_at?: string | null
          context_id?: string | null
          context_label?: string | null
          context_type?: string
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          destination_label?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          eta_minutes?: number | null
          id?: string
          metadata_json?: Json | null
          org_id: string
          route_polyline?: string | null
          started_at?: string | null
          status?: string
          tracker_user_id: string
          updated_at?: string
        }
        Update: {
          arrived_at?: string | null
          completed_at?: string | null
          context_id?: string | null
          context_label?: string | null
          context_type?: string
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          destination_label?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          eta_minutes?: number | null
          id?: string
          metadata_json?: Json | null
          org_id?: string
          route_polyline?: string | null
          started_at?: string | null
          status?: string
          tracker_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_tenant_view"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_intents: {
        Row: {
          amount: number
          context_id: string | null
          context_type: string | null
          created_at: string
          currency: string
          error_message: string | null
          expires_at: string | null
          id: string
          idempotency_key: string
          intent_type: string
          metadata_json: Json | null
          provider: string
          provider_intent_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key: string
          intent_type?: string
          metadata_json?: Json | null
          provider?: string
          provider_intent_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string
          intent_type?: string
          metadata_json?: Json | null
          provider?: string
          provider_intent_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      unified_wallet_transactions: {
        Row: {
          amount: number
          context_id: string | null
          context_type: string
          created_at: string
          currency: string
          id: string
          metadata: Json
          recipient_id: string | null
          sender_id: string | null
          status: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          context_id?: string | null
          context_type?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          recipient_id?: string | null
          sender_id?: string | null
          status?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          context_id?: string | null
          context_type?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          recipient_id?: string | null
          sender_id?: string | null
          status?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      universal_reputation_scores: {
        Row: {
          consistency: number | null
          created_at: string | null
          dispute_rate: number | null
          feedback_score: number | null
          fulfillment_quality: number | null
          id: string
          last_computed_at: string | null
          overall_score: number | null
          response_speed: number | null
          service_breakdown: Json | null
          total_interactions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consistency?: number | null
          created_at?: string | null
          dispute_rate?: number | null
          feedback_score?: number | null
          fulfillment_quality?: number | null
          id?: string
          last_computed_at?: string | null
          overall_score?: number | null
          response_speed?: number | null
          service_breakdown?: Json | null
          total_interactions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consistency?: number | null
          created_at?: string | null
          dispute_rate?: number | null
          feedback_score?: number | null
          fulfillment_quality?: number | null
          id?: string
          last_computed_at?: string | null
          overall_score?: number | null
          response_speed?: number | null
          service_breakdown?: Json | null
          total_interactions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          city: string
          country: string
          country_code: string | null
          created_at: string
          delivery_notes: string | null
          icon: string
          id: string
          is_default: boolean
          label: string
          lat: number | null
          line1: string
          line2: string | null
          lng: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string
          country?: string
          country_code?: string | null
          created_at?: string
          delivery_notes?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          label?: string
          lat?: number | null
          line1?: string
          line2?: string | null
          lng?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          country_code?: string | null
          created_at?: string
          delivery_notes?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          label?: string
          lat?: number | null
          line1?: string
          line2?: string | null
          lng?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ai_profiles: {
        Row: {
          activity_score: number | null
          engagement_score: number | null
          last_active_at: string | null
          preferred_categories: Json | null
          preferred_locations: Json | null
          preferred_price_range: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_score?: number | null
          engagement_score?: number | null
          last_active_at?: string | null
          preferred_categories?: Json | null
          preferred_locations?: Json | null
          preferred_price_range?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_score?: number | null
          engagement_score?: number | null
          last_active_at?: string | null
          preferred_categories?: Json | null
          preferred_locations?: Json | null
          preferred_price_range?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      user_kyc_profiles: {
        Row: {
          address_line_1: string | null
          city: string | null
          country: string | null
          country_of_residence: string | null
          created_at: string | null
          date_of_birth: string | null
          document_expiry: string | null
          first_name: string | null
          id: string
          id_document_number: string | null
          id_document_type: string | null
          kyc_level: string
          last_name: string | null
          nationality: string | null
          pep_check_status: string | null
          risk_rating: string | null
          sanctions_check_status: string | null
          screening_last_run_at: string | null
          status: string
          updated_at: string | null
          user_id: string
          verification_provider: string | null
          verification_reference: string | null
        }
        Insert: {
          address_line_1?: string | null
          city?: string | null
          country?: string | null
          country_of_residence?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          document_expiry?: string | null
          first_name?: string | null
          id?: string
          id_document_number?: string | null
          id_document_type?: string | null
          kyc_level?: string
          last_name?: string | null
          nationality?: string | null
          pep_check_status?: string | null
          risk_rating?: string | null
          sanctions_check_status?: string | null
          screening_last_run_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          verification_provider?: string | null
          verification_reference?: string | null
        }
        Update: {
          address_line_1?: string | null
          city?: string | null
          country?: string | null
          country_of_residence?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          document_expiry?: string | null
          first_name?: string | null
          id?: string
          id_document_number?: string | null
          id_document_type?: string | null
          kyc_level?: string
          last_name?: string | null
          nationality?: string | null
          pep_check_status?: string | null
          risk_rating?: string | null
          sanctions_check_status?: string | null
          screening_last_run_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          verification_provider?: string | null
          verification_reference?: string | null
        }
        Relationships: []
      }
      user_loyalty: {
        Row: {
          points: number | null
          tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          points?: number | null
          tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          points?: number | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_payment_preferences: {
        Row: {
          created_at: string
          default_method: string
          id: string
          saved_methods_json: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_method?: string
          id?: string
          saved_methods_json?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_method?: string
          id?: string
          saved_methods_json?: Json | null
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
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_workspace_id: string | null
          full_name: string | null
          id: string
          locale: string | null
          phone: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_workspace_id?: string | null
          full_name?: string | null
          id: string
          locale?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_workspace_id?: string | null
          full_name?: string | null
          id?: string
          locale?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_default_workspace_id_fkey"
            columns: ["default_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          created_at: string
          device_name: string | null
          id: string
          platform: string
          push_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          id?: string
          platform?: string
          push_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          id?: string
          platform?: string
          push_token?: string
          updated_at?: string
          user_id?: string
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
      user_risk_profiles: {
        Row: {
          fraud_flags: Json | null
          last_updated: string | null
          risk_score: number | null
          user_id: string
        }
        Insert: {
          fraud_flags?: Json | null
          last_updated?: string | null
          risk_score?: number | null
          user_id: string
        }
        Update: {
          fraud_flags?: Json | null
          last_updated?: string | null
          risk_score?: number | null
          user_id?: string
        }
        Relationships: []
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
      user_subscriptions: {
        Row: {
          expires_at: string | null
          plan: string | null
          started_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          plan?: string | null
          started_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          plan?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_trust_graph: {
        Row: {
          cancellations_count: number | null
          completed_orders_count: number | null
          completed_rides_count: number | null
          disputes_count: number | null
          reliability_score: number | null
          safety_score: number | null
          successful_payments_count: number | null
          trust_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancellations_count?: number | null
          completed_orders_count?: number | null
          completed_rides_count?: number | null
          disputes_count?: number | null
          reliability_score?: number | null
          safety_score?: number | null
          successful_payments_count?: number | null
          trust_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancellations_count?: number | null
          completed_orders_count?: number | null
          completed_rides_count?: number | null
          disputes_count?: number | null
          reliability_score?: number | null
          safety_score?: number | null
          successful_payments_count?: number | null
          trust_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_wallet_credits: {
        Row: {
          credits_amount: number | null
          currency: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          credits_amount?: number | null
          currency?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          credits_amount?: number | null
          currency?: string | null
          updated_at?: string | null
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
      vendor_commissions: {
        Row: {
          created_at: string
          currency: string
          id: string
          last_payout_at: string | null
          payout_method: string | null
          pending_payout: number
          platform_rate: number
          shop_id: string
          total_earned: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          last_payout_at?: string | null
          payout_method?: string | null
          pending_payout?: number
          platform_rate?: number
          shop_id: string
          total_earned?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          last_payout_at?: string | null
          payout_method?: string | null
          pending_payout?: number
          platform_rate?: number
          shop_id?: string
          total_earned?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: []
      }
      verified_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          merchant_id: string
          order_id: string
          rating: number
          user_id: string
          verified: boolean
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          order_id: string
          rating: number
          user_id: string
          verified?: boolean
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          order_id?: string
          rating?: number
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      verticals: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      visual_audit_reports: {
        Row: {
          category_breakdown: Json | null
          created_at: string | null
          engine_type: string
          entity_id: string | null
          entity_type: string | null
          fixed_count: number | null
          id: string
          issues_json: Json | null
          page_route: string | null
          score: number | null
        }
        Insert: {
          category_breakdown?: Json | null
          created_at?: string | null
          engine_type: string
          entity_id?: string | null
          entity_type?: string | null
          fixed_count?: number | null
          id?: string
          issues_json?: Json | null
          page_route?: string | null
          score?: number | null
        }
        Update: {
          category_breakdown?: Json | null
          created_at?: string | null
          engine_type?: string
          entity_id?: string | null
          entity_type?: string | null
          fixed_count?: number | null
          id?: string
          issues_json?: Json | null
          page_route?: string | null
          score?: number | null
        }
        Relationships: []
      }
      wallet_accounts: {
        Row: {
          account_type: string | null
          available_balance: number | null
          balance: number | null
          balance_bonus: number
          balance_cash: number
          balance_locked: number
          created_at: string | null
          currency: string
          external_ref: string | null
          id: string
          owner_profile_id: string | null
          owner_type: string | null
          owner_user_id: string | null
          pending_balance: number | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          account_type?: string | null
          available_balance?: number | null
          balance?: number | null
          balance_bonus?: number
          balance_cash?: number
          balance_locked?: number
          created_at?: string | null
          currency: string
          external_ref?: string | null
          id?: string
          owner_profile_id?: string | null
          owner_type?: string | null
          owner_user_id?: string | null
          pending_balance?: number | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          account_type?: string | null
          available_balance?: number | null
          balance?: number | null
          balance_bonus?: number
          balance_cash?: number
          balance_locked?: number
          created_at?: string | null
          currency?: string
          external_ref?: string | null
          id?: string
          owner_profile_id?: string | null
          owner_type?: string | null
          owner_user_id?: string | null
          pending_balance?: number | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      wallet_balances: {
        Row: {
          balance: number
          created_at: string
          currency: string
          frozen_balance: number
          id: string
          total_purchased: number | null
          total_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          frozen_balance?: number
          id?: string
          total_purchased?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          frozen_balance?: number
          id?: string
          total_purchased?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_balances_v2: {
        Row: {
          balance: number
          currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          currency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          currency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_credit_transactions: {
        Row: {
          amount: number
          context_id: string | null
          context_type: string | null
          created_at: string | null
          direction: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          amount: number
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          direction: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          reference_id: string | null
          source: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reference_id?: string | null
          source?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reference_id?: string | null
          source?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_ledger_entries: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          direction: string
          entry_type: string
          external_txn_id: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          wallet_account_id: string
          workspace_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          direction: string
          entry_type: string
          external_txn_id?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          wallet_account_id: string
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          direction?: string
          entry_type?: string
          external_txn_id?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          wallet_account_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_entries_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_limit_profiles: {
        Row: {
          cashout_limit: number | null
          daily_receive_limit: number | null
          daily_send_limit: number | null
          id: string
          kyc_level: string | null
          monthly_receive_limit: number | null
          monthly_send_limit: number | null
          p2p_limit: number | null
          qr_pay_limit: number | null
          single_tx_limit: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cashout_limit?: number | null
          daily_receive_limit?: number | null
          daily_send_limit?: number | null
          id?: string
          kyc_level?: string | null
          monthly_receive_limit?: number | null
          monthly_send_limit?: number | null
          p2p_limit?: number | null
          qr_pay_limit?: number | null
          single_tx_limit?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cashout_limit?: number | null
          daily_receive_limit?: number | null
          daily_send_limit?: number | null
          id?: string
          kyc_level?: string | null
          monthly_receive_limit?: number | null
          monthly_send_limit?: number | null
          p2p_limit?: number | null
          qr_pay_limit?: number | null
          single_tx_limit?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_order_splits: {
        Row: {
          created_at: string
          gross_amount: number
          id: string
          metadata: Json
          net_amount: number
          order_id: string
          split_party_type: string
          split_status: string
          updated_at: string
          wallet_account_id: string
        }
        Insert: {
          created_at?: string
          gross_amount?: number
          id?: string
          metadata?: Json
          net_amount?: number
          order_id: string
          split_party_type: string
          split_status?: string
          updated_at?: string
          wallet_account_id: string
        }
        Update: {
          created_at?: string
          gross_amount?: number
          id?: string
          metadata?: Json
          net_amount?: number
          order_id?: string
          split_party_type?: string
          split_status?: string
          updated_at?: string
          wallet_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_order_splits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_order_splits_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_payment_intents: {
        Row: {
          amount: number
          country_code: string | null
          created_at: string
          currency: string
          expires_at: string
          id: string
          merchant_id: string | null
          metadata_json: Json | null
          nonce: string
          recipient_user_id: string | null
          risk_level: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          country_code?: string | null
          created_at?: string
          currency?: string
          expires_at: string
          id?: string
          merchant_id?: string | null
          metadata_json?: Json | null
          nonce: string
          recipient_user_id?: string | null
          risk_level?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          country_code?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          merchant_id?: string | null
          metadata_json?: Json | null
          nonce?: string
          recipient_user_id?: string | null
          risk_level?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_pins: {
        Row: {
          created_at: string
          failed_attempts: number
          id: string
          last_verified_at: string | null
          locked_until: string | null
          pin_hash: string
          updated_at: string
          wallet_account_id: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          id?: string
          last_verified_at?: string | null
          locked_until?: string | null
          pin_hash: string
          updated_at?: string
          wallet_account_id: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          id?: string
          last_verified_at?: string | null
          locked_until?: string | null
          pin_hash?: string
          updated_at?: string
          wallet_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_pins_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: true
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_security_events: {
        Row: {
          created_at: string
          device_id: string | null
          event_type: string
          id: string
          ip_hint: string | null
          metadata_json: Json | null
          owner_user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_type: string
          id?: string
          ip_hint?: string | null
          metadata_json?: Json | null
          owner_user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_type?: string
          id?: string
          ip_hint?: string | null
          metadata_json?: Json | null
          owner_user_id?: string
        }
        Relationships: []
      }
      wallet_transaction_challenges: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expires_at: string
          id: string
          nonce: string
          owner_user_id: string
          receiver_user_id: string
          status: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          expires_at: string
          id: string
          nonce: string
          owner_user_id: string
          receiver_user_id: string
          status?: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          nonce?: string
          owner_user_id?: string
          receiver_user_id?: string
          status?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          counterpart_user_id: string | null
          created_at: string
          crypto_id: string | null
          currency: string
          description: string | null
          direction: string
          fx_rate_used: number | null
          fx_source: string | null
          fx_timestamp: string | null
          id: string
          margin_applied: number | null
          metadata_json: Json | null
          original_amount: number | null
          original_currency: string | null
          reference_code: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          thread_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          counterpart_user_id?: string | null
          created_at?: string
          crypto_id?: string | null
          currency?: string
          description?: string | null
          direction?: string
          fx_rate_used?: number | null
          fx_source?: string | null
          fx_timestamp?: string | null
          id?: string
          margin_applied?: number | null
          metadata_json?: Json | null
          original_amount?: number | null
          original_currency?: string | null
          reference_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          thread_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          counterpart_user_id?: string | null
          created_at?: string
          crypto_id?: string | null
          currency?: string
          description?: string | null
          direction?: string
          fx_rate_used?: number | null
          fx_source?: string | null
          fx_timestamp?: string | null
          id?: string
          margin_applied?: number | null
          metadata_json?: Json | null
          original_amount?: number | null
          original_currency?: string | null
          reference_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          thread_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transfers: {
        Row: {
          amount: number
          challenge_id: string | null
          completed_at: string | null
          created_at: string | null
          currency: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          note: string | null
          receiver_user_id: string | null
          reference_id: string | null
          reference_type: string | null
          risk_score: number | null
          sender_user_id: string | null
          source: string | null
          status: string | null
          to_wallet_id: string | null
          transfer_type: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          amount: number
          challenge_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency: string
          from_wallet_id?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          note?: string | null
          receiver_user_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          risk_score?: number | null
          sender_user_id?: string | null
          source?: string | null
          status?: string | null
          to_wallet_id?: string | null
          transfer_type?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          challenge_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          from_wallet_id?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          note?: string | null
          receiver_user_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          risk_score?: number | null
          sender_user_id?: string | null
          source?: string | null
          status?: string | null
          to_wallet_id?: string | null
          transfer_type?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transfers_from_wallet_id_fkey"
            columns: ["from_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transfers_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_trusted_devices: {
        Row: {
          device_id: string
          device_name: string | null
          id: string
          last_seen_at: string | null
          owner_user_id: string
          revoked_at: string | null
          trusted_at: string
        }
        Insert: {
          device_id: string
          device_name?: string | null
          id?: string
          last_seen_at?: string | null
          owner_user_id: string
          revoked_at?: string | null
          trusted_at?: string
        }
        Update: {
          device_id?: string
          device_name?: string | null
          id?: string
          last_seen_at?: string | null
          owner_user_id?: string
          revoked_at?: string | null
          trusted_at?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets_v2: {
        Row: {
          available_balance: number
          created_at: string | null
          currency: string
          id: string
          locked_balance: number
          orbit_id: string
          pending_balance: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          locked_balance?: number
          orbit_id: string
          pending_balance?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          locked_balance?: number
          orbit_id?: string
          pending_balance?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      workspace_members: {
        Row: {
          created_at: string | null
          id: string
          role: string
          status: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string | null
          currency: string | null
          id: string
          order_fee_pct: number | null
          payout_cycle: string | null
          support_email: string | null
          support_phone: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          order_fee_pct?: number | null
          payout_cycle?: string | null
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          order_fee_pct?: number | null
          payout_cycle?: string | null
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_user_id: string | null
          slug: string | null
          status: string | null
          updated_at: string | null
          workspace_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_type?: string | null
        }
        Relationships: []
      }
      zones: {
        Row: {
          center_lat: number
          center_lng: number
          city: string
          country: string
          country_code: string | null
          country_name: string | null
          coverage_radius_m: number | null
          created_at: string
          currency: string | null
          default_language: string | null
          delivery_supported: boolean
          display_order: number
          id: string
          is_active: boolean
          is_launched: boolean
          launch_priority: number | null
          level: string
          name: string
          parent_id: string | null
          radius_m: number
          region_name: string | null
          slug: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          center_lat: number
          center_lng: number
          city?: string
          country?: string
          country_code?: string | null
          country_name?: string | null
          coverage_radius_m?: number | null
          created_at?: string
          currency?: string | null
          default_language?: string | null
          delivery_supported?: boolean
          display_order?: number
          id?: string
          is_active?: boolean
          is_launched?: boolean
          launch_priority?: number | null
          level?: string
          name: string
          parent_id?: string | null
          radius_m?: number
          region_name?: string | null
          slug?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          center_lat?: number
          center_lng?: number
          city?: string
          country?: string
          country_code?: string | null
          country_name?: string | null
          coverage_radius_m?: number | null
          created_at?: string
          currency?: string | null
          default_language?: string | null
          delivery_supported?: boolean
          display_order?: number
          id?: string
          is_active?: boolean
          is_launched?: boolean
          launch_priority?: number | null
          level?: string
          name?: string
          parent_id?: string | null
          radius_m?: number
          region_name?: string | null
          slug?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "zones"
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
      marketplace_listings: {
        Row: {
          area: string | null
          category: string | null
          city: string | null
          cover_image: string | null
          created_at: string | null
          delivery_time_max: number | null
          delivery_time_min: number | null
          id: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_open: boolean | null
          logo_image: string | null
          name: string | null
          price_level: number | null
          rating: number | null
          review_count: number | null
          subcategory: string | null
          tier: string | null
          visibility_score: number | null
        }
        Insert: {
          area?: string | null
          category?: string | null
          city?: string | null
          cover_image?: string | null
          created_at?: string | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          id?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_open?: boolean | null
          logo_image?: string | null
          name?: string | null
          price_level?: number | null
          rating?: number | null
          review_count?: number | null
          subcategory?: string | null
          tier?: string | null
          visibility_score?: number | null
        }
        Update: {
          area?: string | null
          category?: string | null
          city?: string | null
          cover_image?: string | null
          created_at?: string | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          id?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_open?: boolean | null
          logo_image?: string | null
          name?: string | null
          price_level?: number | null
          rating?: number | null
          review_count?: number | null
          subcategory?: string | null
          tier?: string | null
          visibility_score?: number | null
        }
        Relationships: []
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
          {
            foreignKeyName: "marketplace_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_marketplace_listings"
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
      public_marketplace_listings: {
        Row: {
          active: boolean | null
          auto_expire: boolean | null
          badges: string[] | null
          booking_slug: string | null
          boost_enabled: boolean | null
          boost_expires_at: string | null
          boost_multiplier: number | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          freshness_score: number | null
          id: string | null
          lat: number | null
          listing_expires_at: string | null
          listing_type: string | null
          lng: number | null
          org_id: string | null
          photo_urls: Json | null
          price: number | null
          provider_id: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          title: string | null
        }
        Insert: {
          active?: boolean | null
          auto_expire?: boolean | null
          badges?: string[] | null
          booking_slug?: string | null
          boost_enabled?: boolean | null
          boost_expires_at?: string | null
          boost_multiplier?: number | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          freshness_score?: number | null
          id?: string | null
          lat?: number | null
          listing_expires_at?: string | null
          listing_type?: string | null
          lng?: number | null
          org_id?: string | null
          photo_urls?: Json | null
          price?: number | null
          provider_id?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          title?: string | null
        }
        Update: {
          active?: boolean | null
          auto_expire?: boolean | null
          badges?: string[] | null
          booking_slug?: string | null
          boost_enabled?: boolean | null
          boost_expires_at?: string | null
          boost_multiplier?: number | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          freshness_score?: number | null
          id?: string | null
          lat?: number | null
          listing_expires_at?: string | null
          listing_type?: string | null
          lng?: number | null
          org_id?: string | null
          photo_urls?: Json | null
          price?: number | null
          provider_id?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          title?: string | null
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
    }
    Functions: {
      accept_collaboration_invitation: {
        Args: { _token: string; _user_id: string }
        Returns: Json
      }
      accept_ride_offer: {
        Args: { p_driver_id: string; p_ride_request_id: string }
        Returns: Json
      }
      accept_tenant_invitation: {
        Args: { _token: string; _user_id: string }
        Returns: Json
      }
      add_workspace_member: {
        Args: { _role: string; _user_id: string; _workspace_id: string }
        Returns: undefined
      }
      aggregate_storefront_analytics_daily: { Args: never; Returns: number }
      atomic_wallet_transfer: {
        Args: {
          p_amount: number
          p_currency?: string
          p_idempotency_key?: string
          p_note?: string
          p_receiver_user_id: string
          p_sender_user_id: string
          p_source?: string
        }
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
      cleanup_expired_nonces: { Args: never; Returns: number }
      compute_product_quality_scores: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      compute_trust_score: { Args: { p_shop_id: string }; Returns: number }
      create_api_key: {
        Args: { _name: string; _org_id: string; _scopes: string[] }
        Returns: Json
      }
      create_call_idempotent:
        | {
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
        | {
            Args: {
              _caller_orbit_id: string
              _context_id?: string
              _context_label?: string
              _context_type?: string
              _is_video?: boolean
              _receiver_orbit_id: string
              _thread_id?: string
            }
            Returns: string
          }
      create_storefront_order_atomic: {
        Args: { p_items: Json; p_order: Json }
        Returns: Json
      }
      ensure_wallet_account: {
        Args: { target_currency?: string; target_user_id: string }
        Returns: Json
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
      get_smart_picks: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          banner_url: string
          city: string
          description: string
          id: string
          logo_url: string
          name: string
          order_count: number
          shop_visibility: string
          slug: string
          vertical: string
        }[]
      }
      get_top_rated_shops: {
        Args: { _limit?: number }
        Returns: {
          avg_rating: number
          banner_url: string
          city: string
          description: string
          id: string
          logo_url: string
          name: string
          review_count: number
          shop_visibility: string
          slug: string
          vertical: string
        }[]
      }
      get_trending_shops: {
        Args: { _limit?: number }
        Returns: {
          banner_url: string
          city: string
          description: string
          id: string
          logo_url: string
          name: string
          order_count: number
          shop_visibility: string
          slug: string
          vertical: string
        }[]
      }
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
      has_workspace_role: {
        Args: { _roles: string[]; _workspace_id: string }
        Returns: boolean
      }
      increment_listing_renewal_count: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      increment_listing_views: { Args: { p_slug: string }; Returns: undefined }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_merchant_owner: { Args: { _merchant_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_workspace_admin_direct: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
      is_workspace_member_direct: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      purchase_boost: {
        Args: {
          _duration_days?: number
          _impressions_budget?: number
          _label?: string
          _locs_cost?: number
          _shop_id?: string
          _target_id: string
          _target_type: string
          _tier?: string
          _user_id: string
        }
        Returns: Json
      }
      purge_expired_sessions: { Args: never; Returns: undefined }
      purge_old_login_events: { Args: never; Returns: undefined }
      rebuild_product_search_index: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      ride_complete: {
        Args: {
          p_driver_id: string
          p_final_amount: number
          p_ride_request_id: string
        }
        Returns: Json
      }
      ride_confirm_pickup: {
        Args: { p_driver_id: string; p_ride_request_id: string }
        Returns: Json
      }
      ride_mark_arrived: {
        Args: { p_driver_id: string; p_ride_request_id: string }
        Returns: Json
      }
      search_global_products_v2: {
        Args: {
          limit_count?: number
          p_category?: string
          p_city?: string
          p_country?: string
          p_vertical?: string
          q: string
        }
        Returns: {
          brand: string
          category: string
          currency: string
          description: string
          entity_id: string
          photo_url: string
          price: number
          product_id: string
          rank_score: number
          subcategory: string
          title: string
          vertical: string
        }[]
      }
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
      search_nearby_shops: {
        Args: {
          _lat: number
          _limit?: number
          _lng: number
          _query?: string
          _radius_km?: number
          _vertical?: string
        }
        Returns: {
          banner_url: string
          city: string
          country: string
          description: string
          distance_km: number
          id: string
          is_verified: boolean
          latitude: number
          logo_url: string
          longitude: number
          name: string
          slug: string
          tagline: string
          vertical: string
        }[]
      }
      suggest_onboarding_template: {
        Args: { p_city?: string; p_subcategory?: string; p_vertical: string }
        Returns: {
          priority: number
          template_id: string
          template_name: string
        }[]
      }
      transfer_locs: {
        Args: {
          _amount: number
          _description?: string
          _metadata?: Json
          _qr_nonce?: string
          _recipient_id: string
          _reference_id?: string
          _reference_type?: string
          _sender_id: string
          _thread_id?: string
        }
        Returns: Json
      }
      update_listing_freshness_scores: { Args: never; Returns: number }
      update_wallet_balance: {
        Args: { p_amount: number; p_type: string; p_wallet_id: string }
        Returns: undefined
      }
      validate_tenant_invitation: { Args: { _token: string }; Returns: Json }
      wallet_transfer: {
        Args: {
          p_amount: number
          p_context_id: string
          p_context_type: string
          p_currency: string
          p_metadata: Json
          p_recipient: string
          p_sender: string
          p_subtitle: string
          p_title: string
        }
        Returns: string
      }
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
      entity_type:
        | "business"
        | "brand"
        | "driver"
        | "partner_network"
        | "individual"
      listing_status:
        | "draft"
        | "pending_review"
        | "published"
        | "paused"
        | "sold"
        | "rented"
        | "archived"
        | "deleted"
      listing_type: "short_term_stay" | "long_term_rental" | "hotel" | "sale"
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
      entity_type: [
        "business",
        "brand",
        "driver",
        "partner_network",
        "individual",
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
      listing_type: ["short_term_stay", "long_term_rental", "hotel", "sale"],
    },
  },
} as const
