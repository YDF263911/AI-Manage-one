-- AI智能合同分析管理系统数据库表结构
-- 使用PostgreSQL语法

-- 用户表（使用Supabase Auth，此为扩展表）
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'legal', 'business', 'finance', 'user')),
    department VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 合同表
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('purchase', 'sales', 'service', 'employment', 'nda', 'lease', 'partnership', 'other')),
    status VARCHAR(20) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'analyzed', 'reviewed', 'approved', 'rejected')),
    
    -- 合同基本信息（AI提取）
    contract_title VARCHAR(500),
    contract_parties JSONB,
    contract_amount DECIMAL(15,2),
    effective_date DATE,
    expiration_date DATE,
    
    -- 合同内容（编辑功能）
    contract_content TEXT,
    content_edited_at TIMESTAMPTZ,
    content_edited_by UUID REFERENCES auth.users(id),
    
    -- 分析信息
    analysis_started_at TIMESTAMPTZ,
    analysis_completed_at TIMESTAMPTZ,
    confidence_score DECIMAL(3,2),
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 索引
    INDEX idx_contracts_user_id (user_id),
    INDEX idx_contracts_status (status),
    INDEX idx_contracts_category (category),
    INDEX idx_contracts_created_at (created_at)
);

-- 合同分析结果表
CREATE TABLE IF NOT EXISTS contract_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 分析结果
    analysis_result JSONB NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    analysis_time INTERVAL,
    
    -- 风险信息
    overall_risk_level VARCHAR(10) CHECK (overall_risk_level IN ('low', 'medium', 'high')),
    risk_summary TEXT,
    
    -- 合规检查结果
    compliance_status BOOLEAN DEFAULT TRUE,
    compliance_issues JSONB,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 索引
    INDEX idx_analysis_contract_id (contract_id),
    INDEX idx_analysis_user_id (user_id),
    INDEX idx_analysis_risk_level (overall_risk_level),
    UNIQUE (contract_id)
);

-- 模板表
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('purchase', 'sales', 'service', 'employment', 'nda', 'lease', 'partnership', 'other')),
    description TEXT,
    content TEXT NOT NULL,
    variables JSONB, -- 模板变量定义
    tags TEXT[],
    
    -- 模板元数据
    version VARCHAR(20) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    
    -- 创建信息
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 索引
    INDEX idx_templates_category (category),
    INDEX idx_templates_is_active (is_active),
    INDEX idx_templates_created_by (created_by)
);

-- 合同草稿表
CREATE TABLE IF NOT EXISTS contract_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 草稿内容
    draft_title VARCHAR(500),
    draft_content TEXT NOT NULL,
    variables JSONB,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'approved', 'rejected')),
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 索引
    INDEX idx_drafts_user_id (user_id),
    INDEX idx_drafts_template_id (template_id),
    INDEX idx_drafts_status (status)
);

-- 审批流程表
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    
    -- 流程信息
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected')),
    
    -- 审批人信息
    approvers JSONB NOT NULL, -- [{user_id, role, status, comments, approved_at}]
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- 索引
    INDEX idx_workflows_contract_id (contract_id),
    INDEX idx_workflows_status (status)
);

-- 风险规则表
CREATE TABLE IF NOT EXISTS risk_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 规则信息
    rule_name VARCHAR(200) NOT NULL,
    rule_description TEXT,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('keyword', 'pattern', 'ai_model')),
    
    -- 规则配置
    rule_config JSONB NOT NULL,
    risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    
    -- 激活状态
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    
    -- 创建信息
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 索引
    INDEX idx_risk_rules_type (rule_type),
    INDEX idx_risk_rules_active (is_active),
    INDEX idx_risk_rules_priority (priority)
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 配置信息
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    config_description TEXT,
    
    -- 配置类型
    config_type VARCHAR(50) DEFAULT 'general' CHECK (config_type IN ('general', 'ai', 'security', 'notification')),
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 索引
    INDEX idx_config_key (config_key),
    INDEX idx_config_type (config_type)
);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间触发器
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contract_analysis_updated_at BEFORE UPDATE ON contract_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contract_drafts_updated_at BEFORE UPDATE ON contract_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_workflows_updated_at BEFORE UPDATE ON approval_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_rules_updated_at BEFORE UPDATE ON risk_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略（RLS）
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 用户只能访问自己的数据
CREATE POLICY "用户只能访问自己的档案" ON user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "用户只能访问自己的合同" ON contracts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用户只能访问自己的分析结果" ON contract_analysis FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用户只能访问自己的草稿" ON contract_drafts FOR ALL USING (auth.uid() = user_id);

-- 模板对所有用户可见（只读）
CREATE POLICY "所有用户可查看模板" ON templates FOR SELECT USING (true);
CREATE POLICY "只有管理员可以管理模板" ON templates FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- 风险规则对所有用户可见（只读）
CREATE POLICY "所有用户可查看风险规则" ON risk_rules FOR SELECT USING (true);
CREATE POLICY "只有管理员可以管理风险规则" ON risk_rules FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- 系统配置只有管理员可访问
CREATE POLICY "只有管理员可以管理系统配置" ON system_config FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- 插入初始数据
INSERT INTO system_config (config_key, config_value, config_description, config_type) VALUES
('ai_model_settings', '{"default_model": "layoutlm", "confidence_threshold": 0.8, "max_analysis_time": 30}', 'AI模型配置', 'ai'),
('file_upload_settings', '{"max_file_size": 10485760, "allowed_types": ["pdf", "doc", "docx", "txt"]}', '文件上传配置', 'general'),
('risk_assessment_settings', '{"high_risk_threshold": 0.7, "medium_risk_threshold": 0.4}', '风险评估配置', 'security');

-- 插入示例模板
INSERT INTO templates (name, category, description, content, tags, created_by) VALUES
('标准采购合同模板', 'purchase', '适用于一般商品采购的标准合同模板', '采购合同

甲方（采购方）：{{buyer}}
乙方（供应方）：{{supplier}}

...（合同内容）...', '{"采购","标准"}', '00000000-0000-0000-0000-000000000000'),
('技术服务合同模板', 'service', '适用于技术开发、咨询等服务的合同模板', '技术服务合同

委托方：{{client}}
服务方：{{service_provider}}

...（合同内容）...', '{"技术","服务"}', '00000000-0000-0000-0000-000000000000');