-- 其他核心业务表

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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON contract_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_template_id ON contract_drafts(template_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON contract_drafts(status);

-- 审批流程表
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    
    -- 流程信息
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected')),
    
    -- 审批人信息
    approvers JSONB NOT NULL,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_workflows_contract_id ON approval_workflows(contract_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON approval_workflows(status);

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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_risk_rules_type ON risk_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_risk_rules_active ON risk_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_risk_rules_priority ON risk_rules(priority);

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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_config_type ON system_config(config_type);