// TypeScript types for Supabase database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_plans: {
        Row: {
          id: string;
          user_id: string;
          plan_type: 'free' | 'academic' | 'pro';
          monthly_limit: number;
          monthly_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_type?: 'free' | 'academic' | 'pro';
          monthly_limit?: number;
          monthly_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_type?: 'free' | 'academic' | 'pro';
          monthly_limit?: number;
          monthly_used?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          title: string | null;
          status: 'uploaded' | 'processing' | 'completed' | 'failed';
          overall_integrity_score: number | null;
          ai_review_report: string | null;
          total_references: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          title?: string | null;
          status?: 'uploaded' | 'processing' | 'completed' | 'failed';
          overall_integrity_score?: number | null;
          ai_review_report?: string | null;
          total_references?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          title?: string | null;
          status?: 'uploaded' | 'processing' | 'completed' | 'failed';
          overall_integrity_score?: number | null;
          ai_review_report?: string | null;
          total_references?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      canonical_references: {
        Row: {
          id: string;
          doi: string | null;
          pmid: string | null;
          external_id: string | null;
          title: string;
          authors: string[];
          publication_year: number | null;
          journal: string | null;
          abstract: string | null;
          full_text_hash: string | null;
          source_api: string | null;
          last_verified: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          doi?: string | null;
          pmid?: string | null;
          external_id?: string | null;
          title: string;
          authors?: string[];
          publication_year?: number | null;
          journal?: string | null;
          abstract?: string | null;
          full_text_hash?: string | null;
          source_api?: string | null;
          last_verified?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          doi?: string | null;
          pmid?: string | null;
          external_id?: string | null;
          title?: string;
          authors?: string[];
          publication_year?: number | null;
          journal?: string | null;
          abstract?: string | null;
          full_text_hash?: string | null;
          source_api?: string | null;
          last_verified?: string;
          created_at?: string;
        };
      };
      document_references: {
        Row: {
          id: string;
          document_id: string;
          raw_citation_text: string;
          first_author: string | null;
          second_author: string | null;
          last_author: string | null;
          year: number | null;
          publication: string | null;
          context_before: string | null;
          context_after: string | null;
          position_in_doc: number | null;
          integrity_score: number | null;
          ai_review: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          raw_citation_text: string;
          first_author?: string | null;
          second_author?: string | null;
          last_author?: string | null;
          year?: number | null;
          publication?: string | null;
          context_before?: string | null;
          context_after?: string | null;
          position_in_doc?: number | null;
          integrity_score?: number | null;
          ai_review?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          raw_citation_text?: string;
          first_author?: string | null;
          second_author?: string | null;
          last_author?: string | null;
          year?: number | null;
          publication?: string | null;
          context_before?: string | null;
          context_after?: string | null;
          position_in_doc?: number | null;
          integrity_score?: number | null;
          ai_review?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      processing_jobs: {
        Row: {
          id: string;
          document_id: string;
          job_type: 'parse_references' | 'match_canonical' | 'verify_integrity';
          status: 'queued' | 'running' | 'completed' | 'failed';
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          job_type: 'parse_references' | 'match_canonical' | 'verify_integrity';
          status?: 'queued' | 'running' | 'completed' | 'failed';
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          job_type?: 'parse_references' | 'match_canonical' | 'verify_integrity';
          status?: 'queued' | 'running' | 'completed' | 'failed';
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      user_usage: {
        Row: {
          id: string;
          user_id: string | null;
          anon_session_id: string | null;
          document_id: string;
          action_type: 'upload' | 'view_report' | 'export_pdf';
          timestamp: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          anon_session_id?: string | null;
          document_id: string;
          action_type: 'upload' | 'view_report' | 'export_pdf';
          timestamp?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          anon_session_id?: string | null;
          document_id?: string;
          action_type?: 'upload' | 'view_report' | 'export_pdf';
          timestamp?: string;
        };
      };
      audit_feedback: {
        Row: {
          id: string;
          document_reference_id: string;
          user_id: string | null;
          anon_session_id: string | null;
          feedback_type: 'accurate' | 'inaccurate' | 'misleading' | 'missing_context';
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_reference_id: string;
          user_id?: string | null;
          anon_session_id?: string | null;
          feedback_type: 'accurate' | 'inaccurate' | 'misleading' | 'missing_context';
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_reference_id?: string;
          user_id?: string | null;
          anon_session_id?: string | null;
          feedback_type?: 'accurate' | 'inaccurate' | 'misleading' | 'missing_context';
          comment?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      plan_type: 'free' | 'academic' | 'pro';
      document_status: 'uploaded' | 'processing' | 'completed' | 'failed';
      match_status: 'pending' | 'matched' | 'not_found' | 'ambiguous' | 'error';
      job_type: 'parse_references' | 'match_canonical' | 'verify_integrity';
      job_status: 'queued' | 'running' | 'completed' | 'failed';
      action_type: 'upload' | 'view_report' | 'export_pdf';
      feedback_type: 'accurate' | 'inaccurate' | 'misleading' | 'missing_context';
    };
  };
}

// Convenience types for rows
export type UserPlan = Database['public']['Tables']['user_plans']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type AnonSession = Database['public']['Tables']['anon_sessions']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type CanonicalReference = Database['public']['Tables']['canonical_references']['Row'];
export type DocumentReference = Database['public']['Tables']['document_references']['Row'];
export type ProcessingJob = Database['public']['Tables']['processing_jobs']['Row'];
export type UserUsage = Database['public']['Tables']['user_usage']['Row'];
export type AuditFeedback = Database['public']['Tables']['audit_feedback']['Row'];

// Convenience types for inserts
export type UserPlanInsert = Database['public']['Tables']['user_plans']['Insert'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type AnonSessionInsert = Database['public']['Tables']['anon_sessions']['Insert'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
export type CanonicalReferenceInsert = Database['public']['Tables']['canonical_references']['Insert'];
export type DocumentReferenceInsert = Database['public']['Tables']['document_references']['Insert'];
export type ProcessingJobInsert = Database['public']['Tables']['processing_jobs']['Insert'];
export type UserUsageInsert = Database['public']['Tables']['user_usage']['Insert'];
export type AuditFeedbackInsert = Database['public']['Tables']['audit_feedback']['Insert'];

// Convenience types for updates
export type UserPlanUpdate = Database['public']['Tables']['user_plans']['Update'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type AnonSessionUpdate = Database['public']['Tables']['anon_sessions']['Update'];
export type DocumentUpdate = Database['public']['Tables']['documents']['Update'];
export type CanonicalReferenceUpdate = Database['public']['Tables']['canonical_references']['Update'];
export type DocumentReferenceUpdate = Database['public']['Tables']['document_references']['Update'];
export type ProcessingJobUpdate = Database['public']['Tables']['processing_jobs']['Update'];
export type UserUsageUpdate = Database['public']['Tables']['user_usage']['Update'];
export type AuditFeedbackUpdate = Database['public']['Tables']['audit_feedback']['Update'];

// Enhanced types for queries with joins
export type DocumentReferenceWithFeedback = DocumentReference & {
  feedback: AuditFeedback[];
  canonical_reference?: CanonicalReference | null;
};

export type DocumentWithReferences = Document & {
  document_references: DocumentReferenceWithFeedback[];
};
