export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      fitness_forge_user_data: {
        Row: {
          user_id: string;
          schema_version: number;
          build_profile: Json | null;
          active_build_workout: Json | null;
          current_forge_workout: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          schema_version?: number;
          build_profile?: Json | null;
          active_build_workout?: Json | null;
          current_forge_workout?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          schema_version?: number;
          build_profile?: Json | null;
          active_build_workout?: Json | null;
          current_forge_workout?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      fitness_forge_workout_sessions: {
        Row: {
          user_id: string;
          id: string;
          source: 'BUILD' | 'FORGE';
          completed_at: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          id: string;
          source: 'BUILD' | 'FORGE';
          completed_at: string;
          data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source?: 'BUILD' | 'FORGE';
          completed_at?: string;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
