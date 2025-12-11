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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      alert_history: {
        Row: {
          alert_id: string
          id: string
          matched_logs_count: number
          notification_error: string | null
          notification_sent: boolean
          sample_logs: Json | null
          triggered_at: string
        }
        Insert: {
          alert_id: string
          id?: string
          matched_logs_count?: number
          notification_error?: string | null
          notification_sent?: boolean
          sample_logs?: Json | null
          triggered_at?: string
        }
        Update: {
          alert_id?: string
          id?: string
          matched_logs_count?: number
          notification_error?: string | null
          notification_sent?: boolean
          sample_logs?: Json | null
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          condition_query: string
          created_at: string
          custom_message: string | null
          description: string | null
          email_recipients: string[] | null
          id: string
          last_triggered_at: string | null
          name: string
          notify_email: boolean
          notify_internal: boolean
          status: Database["public"]["Enums"]["alert_status"]
          threshold: number
          time_window_minutes: number
          trigger_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          condition_query: string
          created_at?: string
          custom_message?: string | null
          description?: string | null
          email_recipients?: string[] | null
          id?: string
          last_triggered_at?: string | null
          name: string
          notify_email?: boolean
          notify_internal?: boolean
          status?: Database["public"]["Enums"]["alert_status"]
          threshold?: number
          time_window_minutes?: number
          trigger_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          condition_query?: string
          created_at?: string
          custom_message?: string | null
          description?: string | null
          email_recipients?: string[] | null
          id?: string
          last_triggered_at?: string | null
          name?: string
          notify_email?: boolean
          notify_internal?: boolean
          status?: Database["public"]["Enums"]["alert_status"]
          threshold?: number
          time_window_minutes?: number
          trigger_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chamados: {
        Row: {
          acompanhamento: string
          classificacao: string | null
          data_atualizacao: string
          data_criacao: string
          data_limite: string | null
          estruturante: string
          id: string
          links: string[] | null
          nivel: string
          status: string
          titulo: string
          user_id: string
        }
        Insert: {
          acompanhamento: string
          classificacao?: string | null
          data_atualizacao?: string
          data_criacao?: string
          data_limite?: string | null
          estruturante: string
          id?: string
          links?: string[] | null
          nivel: string
          status: string
          titulo: string
          user_id: string
        }
        Update: {
          acompanhamento?: string
          classificacao?: string | null
          data_atualizacao?: string
          data_criacao?: string
          data_limite?: string | null
          estruturante?: string
          id?: string
          links?: string[] | null
          nivel?: string
          status?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      dismissed_alerts: {
        Row: {
          alert_id: string
          dismissed_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          alert_id: string
          dismissed_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          dismissed_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      dismissed_notifications: {
        Row: {
          dismissed_at: string | null
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string | null
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          dismissed_at?: string | null
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_vectors: {
        Row: {
          content_preview: string | null
          created_at: string | null
          id: string
          keywords: string[] | null
          source_id: string
          source_type: string
          title: string | null
          tokens: Json | null
          updated_at: string | null
        }
        Insert: {
          content_preview?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          source_id: string
          source_type: string
          title?: string | null
          tokens?: Json | null
          updated_at?: string | null
        }
        Update: {
          content_preview?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          source_id?: string
          source_type?: string
          title?: string | null
          tokens?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ticket_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ticket_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ticket_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cargo: string | null
          created_at: string
          empresa: string | null
          nome: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          empresa?: string | null
          nome?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          empresa?: string | null
          nome?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_queries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean
          name: string
          query: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          name: string
          query: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          name?: string
          query?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          created_at: string
          estruturante: string
          id: string
          modelo: string
          nivel: string
          nome: string
          situacao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estruturante: string
          id?: string
          modelo: string
          nivel: string
          nome: string
          situacao: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estruturante?: string
          id?: string
          modelo?: string
          nivel?: string
          nome?: string
          situacao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scripts_library: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          pre_condicoes: string | null
          scripts_relacionados: string[] | null
          sistema: string | null
          success_rate: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
          versao: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          pre_condicoes?: string | null
          scripts_relacionados?: string[] | null
          sistema?: string | null
          success_rate?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
          versao?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          pre_condicoes?: string | null
          scripts_relacionados?: string[] | null
          sistema?: string | null
          success_rate?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          versao?: string | null
        }
        Relationships: []
      }
      supervisor_health: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          last_check: string | null
          status: string
          subsystem: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          last_check?: string | null
          status?: string
          subsystem: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          last_check?: string | null
          status?: string
          subsystem?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          event_type: Database["public"]["Enums"]["log_event_type"]
          id: string
          ip_address: string | null
          message: string
          origin: string
          payload: Json | null
          severity: Database["public"]["Enums"]["log_severity"]
          timestamp: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          entity_id?: string | null
          entity_type?: string | null
          event_type: Database["public"]["Enums"]["log_event_type"]
          id?: string
          ip_address?: string | null
          message: string
          origin?: string
          payload?: Json | null
          severity?: Database["public"]["Enums"]["log_severity"]
          timestamp?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          entity_id?: string | null
          entity_type?: string | null
          event_type?: Database["public"]["Enums"]["log_event_type"]
          id?: string
          ip_address?: string | null
          message?: string
          origin?: string
          payload?: Json | null
          severity?: Database["public"]["Enums"]["log_severity"]
          timestamp?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ticket_followups: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          ticket_id: string
          type: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          ticket_id: string
          type: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          ticket_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_followups_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_suggestions: {
        Row: {
          applied: boolean | null
          created_at: string | null
          feedback: string | null
          feedback_at: string | null
          id: string
          score: number
          script_id: string | null
          suggested_ticket_id: string | null
          ticket_id: string
        }
        Insert: {
          applied?: boolean | null
          created_at?: string | null
          feedback?: string | null
          feedback_at?: string | null
          id?: string
          score: number
          script_id?: string | null
          suggested_ticket_id?: string | null
          ticket_id: string
        }
        Update: {
          applied?: boolean | null
          created_at?: string | null
          feedback?: string | null
          feedback_at?: string | null
          id?: string
          score?: number
          script_id?: string | null
          suggested_ticket_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_suggestions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_suggestions_suggested_ticket_id_fkey"
            columns: ["suggested_ticket_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_suggestions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_status: "active" | "paused" | "triggered"
      log_event_type:
        | "chamado_created"
        | "chamado_updated"
        | "chamado_deleted"
        | "chamado_status_changed"
        | "script_created"
        | "script_updated"
        | "script_deleted"
        | "script_executed"
        | "user_login"
        | "user_logout"
        | "user_signup"
        | "error"
        | "system"
        | "custom"
      log_severity: "info" | "warning" | "error" | "critical"
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
      alert_status: ["active", "paused", "triggered"],
      log_event_type: [
        "chamado_created",
        "chamado_updated",
        "chamado_deleted",
        "chamado_status_changed",
        "script_created",
        "script_updated",
        "script_deleted",
        "script_executed",
        "user_login",
        "user_logout",
        "user_signup",
        "error",
        "system",
        "custom",
      ],
      log_severity: ["info", "warning", "error", "critical"],
    },
  },
} as const
