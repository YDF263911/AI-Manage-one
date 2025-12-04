import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据库表类型定义
export interface UserProfile {
  id: string;
  username: string;
  role: "admin" | "legal" | "business" | "finance" | "user";
  department?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  category:
    | "purchase"
    | "sales"
    | "service"
    | "employment"
    | "nda"
    | "lease"
    | "partnership"
    | "other";
  status:
    | "uploaded"
    | "processing"
    | "analyzed"
    | "reviewed"
    | "approved"
    | "rejected";
  contract_title?: string;
  contract_parties?: any;
  contract_amount?: number;
  effective_date?: string;
  expiration_date?: string;
  analysis_started_at?: string;
  analysis_completed_at?: string;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface ContractAnalysis {
  id: string;
  contract_id: string;
  user_id: string;
  analysis_result: any;
  confidence_score: number;
  analysis_time?: string;
  overall_risk_level: "low" | "medium" | "high";
  risk_summary?: string;
  compliance_status: boolean;
  compliance_issues?: any;
  created_at: string;
  updated_at: string;
}

export interface RiskRule {
  id: string;
  rule_name: string;
  rule_description?: string;
  rule_type: "keyword" | "pattern" | "ai_model";
  rule_config: any;
  risk_level: "low" | "medium" | "high";
  is_active: boolean;
  priority: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  name: string;
  category:
    | "purchase"
    | "sales"
    | "service"
    | "employment"
    | "nda"
    | "lease"
    | "partnership"
    | "other";
  description?: string;
  content: string;
  tags?: string[];
  version?: string;
  is_active: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContractDraft {
  id: string;
  template_id?: string;
  user_id: string;
  draft_title?: string;
  draft_content: string;
  variables?: any;
  status: "draft" | "reviewing" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface ApprovalWorkflow {
  id: string;
  contract_id: string;
  current_step: number;
  total_steps: number;
  status: "pending" | "in_progress" | "approved" | "rejected";
  approvers: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
