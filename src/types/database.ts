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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          landing_page: string | null
          referrer_url: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          landing_page?: string | null
          referrer_url?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          landing_page?: string | null
          referrer_url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string | null
          commission_amount: number
          created_at: string | null
          id: string
          order_id: string | null
          status: string | null
        }
        Insert: {
          affiliate_id?: string | null
          commission_amount: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string | null
          commission_amount?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          approved_at: string | null
          approved_by: string | null
          commission_rate: number | null
          company_name: string | null
          cookie_days: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          payout_details_encrypted: string | null
          payout_method: string | null
          payout_minimum: number | null
          pending_balance: number | null
          profile_id: string | null
          total_clicks: number | null
          total_conversions: number | null
          total_earned: number | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          affiliate_code?: string
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number | null
          company_name?: string | null
          cookie_days?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payout_details_encrypted?: string | null
          payout_method?: string | null
          payout_minimum?: number | null
          pending_balance?: number | null
          profile_id?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earned?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          affiliate_code?: string
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number | null
          company_name?: string | null
          cookie_days?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payout_details_encrypted?: string | null
          payout_method?: string | null
          payout_minimum?: number | null
          pending_balance?: number | null
          profile_id?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earned?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_ranks: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_rank_permissions: {
        Row: {
          id: string
          rank_id: string
          section_key: string
        }
        Insert: {
          id?: string
          rank_id: string
          section_key: string
        }
        Update: {
          id?: string
          rank_id?: string
          section_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_rank_permissions_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "admin_ranks"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json | null
          rate_limit: number | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json | null
          rate_limit?: number | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json | null
          rate_limit?: number | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_agents: {
        Row: {
          id: string
          profile_id: string
          granted_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          granted_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          granted_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_agents_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          id: string
          customer_id: string | null
          customer_name: string
          customer_email: string
          order_id: string | null
          order_number: string | null
          game_name: string | null
          service_name: string | null
          status: string
          unread_count: number
          created_at: string
          updated_at: string
          last_message_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          customer_name?: string
          customer_email?: string
          order_id?: string | null
          order_number?: string | null
          game_name?: string | null
          service_name?: string | null
          status?: string
          unread_count?: number
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          customer_name?: string
          customer_email?: string
          order_id?: string | null
          order_number?: string | null
          game_name?: string | null
          service_name?: string | null
          status?: string
          unread_count?: number
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string | null
          sender_role: string
          sender_name: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id?: string | null
          sender_role: string
          sender_name?: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string | null
          sender_role?: string
          sender_name?: string
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_games: string[] | null
          applicable_services: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          max_uses_per_user: number | null
          min_order_amount: number | null
          starts_at: string | null
        }
        Insert: {
          applicable_games?: string[] | null
          applicable_services?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
        }
        Update: {
          applicable_games?: string[] | null
          applicable_services?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_logs: {
        Row: {
          details: Json | null
          errors: number
          id: string
          job_name: string
          message: string
          processed: number
          ran_at: string
          status: string
        }
        Insert: {
          details?: Json | null
          errors?: number
          id?: string
          job_name: string
          message?: string
          processed?: number
          ran_at?: string
          status: string
        }
        Update: {
          details?: Json | null
          errors?: number
          id?: string
          job_name?: string
          message?: string
          processed?: number
          ran_at?: string
          status?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          banner_url: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          order_code: string | null
          short_description: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          order_code?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          order_code?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          id: string
          lifetime_points: number | null
          points: number | null
          profile_id: string | null
          tier_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lifetime_points?: number | null
          points?: number | null
          profile_id?: string | null
          tier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lifetime_points?: number | null
          points?: number | null
          profile_id?: string | null
          tier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string | null
          current_redemptions: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_redemptions: number | null
          name: string
          points_cost: number
          reward_type: string
          reward_value: number
        }
        Insert: {
          created_at?: string | null
          current_redemptions?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          name: string
          points_cost: number
          reward_type: string
          reward_value: number
        }
        Update: {
          created_at?: string | null
          current_redemptions?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          name?: string
          points_cost?: number
          reward_type?: string
          reward_value?: number
        }
        Relationships: []
      }
      loyalty_tiers: {
        Row: {
          bonus_multiplier: number | null
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          min_lifetime_points: number | null
          name: string
          perks: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          bonus_multiplier?: number | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          min_lifetime_points?: number | null
          name: string
          perks?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          bonus_multiplier?: number | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          min_lifetime_points?: number | null
          name?: string
          perks?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          points: number
          profile_id: string | null
          reason: string
          reference_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          points: number
          profile_id?: string | null
          reason: string
          reference_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          points?: number
          profile_id?: string | null
          reason?: string
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          metadata: Json | null
          profile_id: string | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          profile_id?: string | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          profile_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          id: string
          is_system: boolean | null
          order_id: string | null
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          order_id?: string | null
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          order_id?: string | null
          read_at?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          note: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          account_credentials_encrypted: string | null
          admin_notes: string | null
          affiliate_commission: number | null
          affiliate_id: string | null
          cancelled_at: string | null
          claimed_at: string | null
          completed_at: string | null
          configuration: Json
          coupon_id: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_notes: string | null
          discount_amount: number | null
          estimated_completion: string | null
          expires_at: string | null
          game_id: string | null
          id: string
          ip_address: string | null
          loyalty_discount: number | null
          loyalty_points_earned: number | null
          loyalty_points_used: number | null
          order_number: string
          paid_out_at: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          payout_hold_until: string | null
          payout_id: string | null
          progress: number | null
          progress_notes: string | null
          referral_code_used: string | null
          referral_credit: number | null
          refunded_at: string | null
          service_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax_amount: number | null
          total: number
          track_token: string
          updated_at: string | null
          user_agent: string | null
          worker_commission_rate: number | null
          worker_id: string | null
          worker_payout: number | null
        }
        Insert: {
          account_credentials_encrypted?: string | null
          admin_notes?: string | null
          affiliate_commission?: number | null
          affiliate_id?: string | null
          cancelled_at?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          configuration: Json
          coupon_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_amount?: number | null
          estimated_completion?: string | null
          expires_at?: string | null
          game_id?: string | null
          id?: string
          ip_address?: string | null
          loyalty_discount?: number | null
          loyalty_points_earned?: number | null
          loyalty_points_used?: number | null
          order_number?: string
          paid_out_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payout_hold_until?: string | null
          payout_id?: string | null
          progress?: number | null
          progress_notes?: string | null
          referral_code_used?: string | null
          referral_credit?: number | null
          refunded_at?: string | null
          service_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax_amount?: number | null
          total: number
          track_token?: string
          updated_at?: string | null
          user_agent?: string | null
          worker_commission_rate?: number | null
          worker_id?: string | null
          worker_payout?: number | null
        }
        Update: {
          account_credentials_encrypted?: string | null
          admin_notes?: string | null
          affiliate_commission?: number | null
          affiliate_id?: string | null
          cancelled_at?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          configuration?: Json
          coupon_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_amount?: number | null
          estimated_completion?: string | null
          expires_at?: string | null
          game_id?: string | null
          id?: string
          ip_address?: string | null
          loyalty_discount?: number | null
          loyalty_points_earned?: number | null
          loyalty_points_used?: number | null
          order_number?: string
          paid_out_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payout_hold_until?: string | null
          payout_id?: string | null
          progress?: number | null
          progress_notes?: string | null
          referral_code_used?: string | null
          referral_credit?: number | null
          refunded_at?: string | null
          service_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          tax_amount?: number | null
          total?: number
          track_token?: string
          updated_at?: string | null
          user_agent?: string | null
          worker_commission_rate?: number | null
          worker_id?: string | null
          worker_payout?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          affiliate_id: string | null
          amount: number
          created_at: string | null
          id: string
          method: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["payout_status"] | null
          transaction_id: string | null
          worker_id: string | null
        }
        Insert: {
          affiliate_id?: string | null
          amount: number
          created_at?: string | null
          id?: string
          method: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          transaction_id?: string | null
          worker_id?: string | null
        }
        Update: {
          affiliate_id?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          method?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          transaction_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_rank_id: string | null
          avatar_url: string | null
          balance: number | null
          ban_reason: string | null
          created_at: string | null
          discord_id: string | null
          discord_linked_at: string | null
          discord_username: string | null
          display_name: string | null
          email: string
          id: string
          is_banned: boolean | null
          last_login_at: string | null
          last_login_ip: string | null
          referral_code: string | null
          referred_by: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          total_spent: number | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
        }
        Insert: {
          admin_rank_id?: string | null
          avatar_url?: string | null
          balance?: number | null
          ban_reason?: string | null
          created_at?: string | null
          discord_id?: string | null
          discord_linked_at?: string | null
          discord_username?: string | null
          display_name?: string | null
          email: string
          id: string
          is_banned?: boolean | null
          last_login_at?: string | null
          last_login_ip?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          total_spent?: number | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_rank_id?: string | null
          avatar_url?: string | null
          balance?: number | null
          ban_reason?: string | null
          created_at?: string | null
          discord_id?: string | null
          discord_linked_at?: string | null
          discord_username?: string | null
          display_name?: string | null
          email?: string
          id?: string
          is_banned?: boolean | null
          last_login_at?: string | null
          last_login_ip?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          total_spent?: number | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_admin_rank_id_fkey"
            columns: ["admin_rank_id"]
            isOneToOne: false
            referencedRelation: "admin_ranks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_banners: {
        Row: {
          bg_color: string
          created_at: string
          cta_text: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          message: string
          starts_at: string | null
          title: string
        }
        Insert: {
          bg_color?: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          message: string
          starts_at?: string | null
          title: string
        }
        Update: {
          bg_color?: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          message?: string
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string | null
          credited_at: string | null
          id: string
          order_id: string | null
          referred_id: string | null
          referred_reward: number | null
          referrer_id: string | null
          reward_amount: number
          status: string | null
        }
        Insert: {
          created_at?: string | null
          credited_at?: string | null
          id?: string
          order_id?: string | null
          referred_id?: string | null
          referred_reward?: number | null
          referrer_id?: string | null
          reward_amount: number
          status?: string | null
        }
        Update: {
          created_at?: string | null
          credited_at?: string | null
          id?: string
          order_id?: string | null
          referred_id?: string | null
          referred_reward?: number | null
          referrer_id?: string | null
          reward_amount?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          id: string
          profile_id: string
          game_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          game_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          game_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_response: string | null
          comment: string | null
          created_at: string | null
          customer_id: string | null
          game_id: string | null
          helpful_count: number | null
          id: string
          is_public: boolean | null
          is_verified: boolean | null
          order_id: string | null
          rating: number
          service_id: string | null
          title: string | null
          worker_id: string | null
        }
        Insert: {
          admin_response?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          game_id?: string | null
          helpful_count?: number | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          rating: number
          service_id?: string | null
          title?: string | null
          worker_id?: string | null
        }
        Update: {
          admin_response?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          game_id?: string | null
          helpful_count?: number | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          rating?: number
          service_id?: string | null
          title?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          form_config: Json | null
          game_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          max_quantity: number | null
          meta_description: string | null
          meta_title: string | null
          min_quantity: number | null
          min_worker_tier_id: string | null
          name: string
          order_code: string | null
          price_matrix: Json | null
          price_per_unit: number | null
          slug: string
          sort_order: number | null
          updated_at: string | null
          worker_payout_override: number | null
        }
        Insert: {
          base_price: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          form_config?: Json | null
          game_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          max_quantity?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_quantity?: number | null
          min_worker_tier_id?: string | null
          name: string
          order_code?: string | null
          price_matrix?: Json | null
          price_per_unit?: number | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
          worker_payout_override?: number | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          form_config?: Json | null
          game_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          max_quantity?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_quantity?: number | null
          min_worker_tier_id?: string | null
          name?: string
          order_code?: string | null
          price_matrix?: Json | null
          price_per_unit?: number | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
          worker_payout_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_min_worker_tier_id_fkey"
            columns: ["min_worker_tier_id"]
            isOneToOne: false
            referencedRelation: "worker_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      static_pages: {
        Row: {
          content: string
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          id: string
          is_ai_generated: boolean | null
          is_internal_note: boolean | null
          sender_id: string | null
          ticket_id: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_internal_note?: boolean | null
          sender_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_internal_note?: boolean | null
          sender_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_confidence: number | null
          assigned_to: string | null
          category: string | null
          created_at: string | null
          customer_id: string | null
          first_response_at: string | null
          id: string
          is_ai_handled: boolean | null
          order_id: string | null
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          ticket_number: string
          updated_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          customer_id?: string | null
          first_response_at?: string | null
          id?: string
          is_ai_handled?: boolean | null
          order_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          ticket_number?: string
          updated_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          customer_id?: string | null
          first_response_at?: string | null
          id?: string
          is_ai_handled?: boolean | null
          order_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_tiers: {
        Row: {
          color: string | null
          commission_rate: number | null
          created_at: string | null
          discord_role_id: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          is_invite_only: boolean | null
          max_active_orders: number | null
          min_completed_orders: number | null
          min_deposit: number | null
          min_rating: number | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          commission_rate?: number | null
          created_at?: string | null
          discord_role_id?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          is_invite_only?: boolean | null
          max_active_orders?: number | null
          min_completed_orders?: number | null
          min_deposit?: number | null
          min_rating?: number | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          commission_rate?: number | null
          created_at?: string | null
          discord_role_id?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          is_invite_only?: boolean | null
          max_active_orders?: number | null
          min_completed_orders?: number | null
          min_deposit?: number | null
          min_rating?: number | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workers: {
        Row: {
          application_text: string | null
          applied_at: string | null
          average_rating: number | null
          bio: string | null
          show_on_boosters_page: boolean | null
          commission_rate: number | null
          deposit_paid: number | null
          profile_photo_url: string | null
          created_at: string | null
          current_active_orders: number | null
          games: Json | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          max_active_orders: number | null
          notes: string | null
          payout_details_encrypted: string | null
          payout_method: string | null
          payout_minimum: number | null
          pending_balance: number | null
          profile_id: string | null
          tier_id: string | null
          total_earned: number | null
          total_orders_completed: number | null
          total_ratings: number | null
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          application_text?: string | null
          applied_at?: string | null
          average_rating?: number | null
          bio?: string | null
          show_on_boosters_page?: boolean | null
          commission_rate?: number | null
          deposit_paid?: number | null
          profile_photo_url?: string | null
          created_at?: string | null
          current_active_orders?: number | null
          games?: Json | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          max_active_orders?: number | null
          notes?: string | null
          payout_details_encrypted?: string | null
          payout_method?: string | null
          payout_minimum?: number | null
          pending_balance?: number | null
          profile_id?: string | null
          tier_id?: string | null
          total_earned?: number | null
          total_orders_completed?: number | null
          total_ratings?: number | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          application_text?: string | null
          applied_at?: string | null
          average_rating?: number | null
          bio?: string | null
          show_on_boosters_page?: boolean | null
          commission_rate?: number | null
          deposit_paid?: number | null
          profile_photo_url?: string | null
          created_at?: string | null
          current_active_orders?: number | null
          games?: Json | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          max_active_orders?: number | null
          notes?: string | null
          payout_details_encrypted?: string | null
          payout_method?: string | null
          payout_minimum?: number | null
          pending_balance?: number | null
          profile_id?: string | null
          tier_id?: string | null
          total_earned?: number | null
          total_orders_completed?: number | null
          total_ratings?: number | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "worker_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_deposit_payments: {
        Row: {
          id: string
          worker_id: string
          amount: number
          paid_at: string
          recorded_by: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          worker_id: string
          amount: number
          paid_at?: string
          recorded_by?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          worker_id?: string
          amount?: number
          paid_at?: string
          recorded_by?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_deposit_payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_deposit_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          profile_id: string
          endpoint: string
          keys: { p256dh: string; auth: string }
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          endpoint: string
          keys: { p256dh: string; auth: string }
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          endpoint?: string
          keys?: { p256dh: string; auth: string }
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhooks: {
        Row: {
          webhook_id: string
          provider: string
          event_type: string
          processed_at: string
        }
        Insert: {
          webhook_id: string
          provider: string
          event_type: string
          processed_at?: string
        }
        Update: {
          webhook_id?: string
          provider?: string
          event_type?: string
          processed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_order_number: {
        Args: { p_brand: string; p_game_code: string; p_service_code: string }
        Returns: string
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_storefront_stats: {
        Args: never
        Returns: { completed_orders: number; review_count: number; avg_rating: number }
      }
      is_admin: { Args: never; Returns: boolean }
      is_chat_agent: { Args: never; Returns: boolean }
      is_worker: { Args: never; Returns: boolean }
      nanoid: { Args: { size?: number }; Returns: string }
    }
    Enums: {
      discount_type: "percentage" | "fixed"
      order_status:
        | "pending_payment"
        | "paid"
        | "queued"
        | "claimed"
        | "in_progress"
        | "paused"
        | "completed"
        | "cancelled"
        | "refunded"
        | "disputed"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      payout_status: "pending" | "processing" | "completed" | "failed"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "awaiting_reply"
        | "in_progress"
        | "resolved"
        | "closed"
      user_role: "customer" | "worker" | "admin" | "super_admin"
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
      discount_type: ["percentage", "fixed"],
      order_status: [
        "pending_payment",
        "paid",
        "queued",
        "claimed",
        "in_progress",
        "paused",
        "completed",
        "cancelled",
        "refunded",
        "disputed",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      payout_status: ["pending", "processing", "completed", "failed"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "awaiting_reply",
        "in_progress",
        "resolved",
        "closed",
      ],
      user_role: ["customer", "worker", "admin", "super_admin"],
    },
  },
} as const