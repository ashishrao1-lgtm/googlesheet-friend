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
      feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          page: string | null
          reporter_name: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          page?: string | null
          reporter_name: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          page?: string | null
          reporter_name?: string
        }
        Relationships: []
      }
      fleet_actions: {
        Row: {
          action: string
          center: string
          created_at: string
          dri: string
          id: string
          kind: string
          label: string
          note: string | null
          ref: string
        }
        Insert: {
          action: string
          center?: string
          created_at?: string
          dri: string
          id?: string
          kind: string
          label?: string
          note?: string | null
          ref: string
        }
        Update: {
          action?: string
          center?: string
          created_at?: string
          dri?: string
          id?: string
          kind?: string
          label?: string
          note?: string | null
          ref?: string
        }
        Relationships: []
      }
      fleet_adhoc_current: {
        Row: {
          attendance_in_time: string
          bid_amount: string
          bid_origin: string
          center: string
          city: string
          created_at: string
          creation_bucket: string
          creation_time: string
          dr: string
          driver_phone: string
          duration: string
          facility_type: string
          fleet_dri: string
          indent_id: string
          lob: string
          ontime_placement: string
          reason: string
          removed_at: string | null
          reporting_time: string
          row_key: string
          sdr: string
          sp_phone: string
          state: string
          synced_at: string
          target_price: string
          ticket_no: string
          ticket_status: string
          vehicle: string
          vehicle_type: string
          vendor: string
          zone: string
        }
        Insert: {
          attendance_in_time?: string
          bid_amount?: string
          bid_origin?: string
          center?: string
          city?: string
          created_at?: string
          creation_bucket?: string
          creation_time?: string
          dr?: string
          driver_phone?: string
          duration?: string
          facility_type?: string
          fleet_dri?: string
          indent_id?: string
          lob?: string
          ontime_placement?: string
          reason?: string
          removed_at?: string | null
          reporting_time?: string
          row_key: string
          sdr?: string
          sp_phone?: string
          state?: string
          synced_at?: string
          target_price?: string
          ticket_no?: string
          ticket_status?: string
          vehicle?: string
          vehicle_type?: string
          vendor?: string
          zone?: string
        }
        Update: {
          attendance_in_time?: string
          bid_amount?: string
          bid_origin?: string
          center?: string
          city?: string
          created_at?: string
          creation_bucket?: string
          creation_time?: string
          dr?: string
          driver_phone?: string
          duration?: string
          facility_type?: string
          fleet_dri?: string
          indent_id?: string
          lob?: string
          ontime_placement?: string
          reason?: string
          removed_at?: string | null
          reporting_time?: string
          row_key?: string
          sdr?: string
          sp_phone?: string
          state?: string
          synced_at?: string
          target_price?: string
          ticket_no?: string
          ticket_status?: string
          vehicle?: string
          vehicle_type?: string
          vendor?: string
          zone?: string
        }
        Relationships: []
      }
      fleet_fixed_current: {
        Row: {
          attendance_date: string
          attendance_status: string
          center: string
          city: string
          contract_code: string
          contract_days: string
          contract_hrs: string
          contract_number: string
          created_at: string
          facility_type: string
          fleet_dri: string
          removed_at: string | null
          reported_at: string
          reporting_time: string
          row_key: string
          start_date: string
          state: string
          status: string
          synced_at: string
          vehicle: string
          vendor: string
          zone: string
        }
        Insert: {
          attendance_date?: string
          attendance_status?: string
          center?: string
          city?: string
          contract_code?: string
          contract_days?: string
          contract_hrs?: string
          contract_number?: string
          created_at?: string
          facility_type?: string
          fleet_dri?: string
          removed_at?: string | null
          reported_at?: string
          reporting_time?: string
          row_key: string
          start_date?: string
          state?: string
          status?: string
          synced_at?: string
          vehicle?: string
          vendor?: string
          zone?: string
        }
        Update: {
          attendance_date?: string
          attendance_status?: string
          center?: string
          city?: string
          contract_code?: string
          contract_days?: string
          contract_hrs?: string
          contract_number?: string
          created_at?: string
          facility_type?: string
          fleet_dri?: string
          removed_at?: string | null
          reported_at?: string
          reporting_time?: string
          row_key?: string
          start_date?: string
          state?: string
          status?: string
          synced_at?: string
          vehicle?: string
          vendor?: string
          zone?: string
        }
        Relationships: []
      }
      fleet_snapshots: {
        Row: {
          attendance_status: string
          center: string
          created_at: string
          dri: string
          id: string
          kind: string
          ref: string
          reported_at: string
          reporting_time: string
          status: string
          synced_at: string
          vendor: string
        }
        Insert: {
          attendance_status?: string
          center?: string
          created_at?: string
          dri?: string
          id?: string
          kind: string
          ref: string
          reported_at?: string
          reporting_time?: string
          status?: string
          synced_at?: string
          vendor?: string
        }
        Update: {
          attendance_status?: string
          center?: string
          created_at?: string
          dri?: string
          id?: string
          kind?: string
          ref?: string
          reported_at?: string
          reporting_time?: string
          status?: string
          synced_at?: string
          vendor?: string
        }
        Relationships: []
      }
      fleet_sync_runs: {
        Row: {
          adhoc_rows: number
          created_at: string
          error: string | null
          finished_at: string | null
          fixed_rows: number
          id: string
          started_at: string
          status: string
        }
        Insert: {
          adhoc_rows?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          fixed_rows?: number
          id?: string
          started_at?: string
          status?: string
        }
        Update: {
          adhoc_rows?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          fixed_rows?: number
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
