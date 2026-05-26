// Auto-generated types mirroring schema.sql.
// Regenerate with: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Gender = "male" | "female" | "other";
export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";
export type ReportType = "weekly" | "monthly" | "custom";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          height_cm: number | null;
          age: number | null;
          gender: Gender | null;
          activity_level: ActivityLevel | null;
          target_weight_kg: number | null;
          target_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          height_cm?: number | null;
          age?: number | null;
          gender?: Gender | null;
          activity_level?: ActivityLevel | null;
          target_weight_kg?: number | null;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          height_cm?: number | null;
          age?: number | null;
          gender?: Gender | null;
          activity_level?: ActivityLevel | null;
          target_weight_kg?: number | null;
          target_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          weight_kg: number | null;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fats_g: number | null;
          water_ml: number | null;
          sleep_hours: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_date: string;
          weight_kg?: number | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fats_g?: number | null;
          water_ml?: number | null;
          sleep_hours?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          log_date?: string;
          weight_kg?: number | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fats_g?: number | null;
          water_ml?: number | null;
          sleep_hours?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      milestones: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          target_weight_kg: number;
          achieved: boolean;
          achieved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          target_weight_kg: number;
          achieved?: boolean;
          achieved_at?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          target_weight_kg?: number;
          achieved?: boolean;
          achieved_at?: string | null;
        };
        Relationships: [];
      };
      ai_reports: {
        Row: {
          id: string;
          user_id: string;
          report_type: ReportType;
          content: string;
          data_snapshot: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_type: ReportType;
          content: string;
          data_snapshot?: Json | null;
          created_at?: string;
        };
        Update: {
          report_type?: ReportType;
          content?: string;
          data_snapshot?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_weight_trend: {
        Args: { p_user_id: string; p_days?: number };
        Returns: { log_date: string; weight_kg: number; moving_avg_7d: number }[];
      };
      get_daily_summary: {
        Args: { p_user_id: string; p_start: string; p_end: string };
        Returns: {
          total_days: number;
          avg_calories: number;
          avg_protein_g: number;
          avg_carbs_g: number;
          avg_fats_g: number;
          avg_water_ml: number;
          avg_sleep_hours: number;
          min_weight_kg: number;
          max_weight_kg: number;
          latest_weight_kg: number;
        }[];
      };
    };
  };
}

// Convenience row-type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type DailyLog = Database["public"]["Tables"]["daily_logs"]["Row"];
export type Milestone = Database["public"]["Tables"]["milestones"]["Row"];
export type AiReport = Database["public"]["Tables"]["ai_reports"]["Row"];
