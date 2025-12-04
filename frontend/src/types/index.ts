// 通用类型定义

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  success: boolean;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface ListResponse<T> {
  list: T[];
  pagination: PaginationParams;
}

// 用户相关
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  department: string;
  phone?: string;
  avatar?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "admin" | "legal" | "business" | "finance" | "manager";

// 合同相关
export interface Contract {
  id: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  parties: {
    firstParty: string;
    secondParty: string;
  };
  amount: number;
  currency: string;
  startDate: string;
  endDate: string;
  duration: number;
  fileId: string;
  fileName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ContractType =
  | "purchase"
  | "sale"
  | "service"
  | "employment"
  | "nda"
  | "other";

export type ContractStatus =
  | "draft"
  | "pending"
  | "reviewing"
  | "approved"
  | "signed"
  | "executing"
  | "completed"
  | "terminated";

// 合同条款
export interface ContractClause {
  id: string;
  contractId: string;
  title: string;
  content: string;
  riskLevel: RiskLevel;
  complianceStatus: ComplianceStatus;
  tags: string[];
  createdAt: string;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ComplianceStatus = "compliant" | "non-compliant" | "warning";

// 审批流程
export interface ApprovalFlow {
  id: string;
  contractId: string;
  templateId?: string;
  currentNode: number;
  nodes: ApprovalNode[];
  status: FlowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalNode {
  id: string;
  name: string;
  type: NodeType;
  approvers: string[];
  status: NodeStatus;
  comments?: string;
  approvedAt?: string;
}

export type NodeType = "serial" | "parallel";
export type NodeStatus = "pending" | "approved" | "rejected" | "processing";
export type FlowStatus =
  | "pending"
  | "processing"
  | "approved"
  | "rejected"
  | "cancelled";

// 模板相关
export interface Template {
  id: string;
  name: string;
  type: ContractType;
  version: string;
  fileId: string;
  description?: string;
  tags: string[];
  createdBy: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// 文件相关
export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

// 分析结果
export interface AnalysisResult {
  contractId: string;
  riskScore: number;
  complianceScore: number;
  missingClauses: string[];
  riskClauses: RiskClause[];
  suggestions: string[];
  analyzedAt: string;
}

export interface RiskClause {
  clauseId: string;
  title: string;
  riskLevel: RiskLevel;
  reason: string;
  suggestion: string;
}

// 系统设置
export interface SystemSettings {
  aiModel: string;
  ocrService: string;
  eSignService: string;
  fileSizeLimit: number;
  allowedFileTypes: string[];
  notificationSettings: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  reminderDays: number;
}
