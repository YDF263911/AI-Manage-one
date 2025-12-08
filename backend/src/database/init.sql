-- AI智能合同分析管理系统数据库初始化脚本
-- 创建数据库表结构和基础数据

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user', -- admin, manager, user, finance, legal
    department VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建合同表（与schema.sql保持一致）
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

-- 3. 创建合同条款表
CREATE TABLE IF NOT EXISTS contract_clauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    clause_number VARCHAR(20),
    clause_title VARCHAR(500),
    clause_content TEXT,
    clause_type VARCHAR(100), -- 付款条款、违约责任、保密条款等
    
    -- AI分析结果
    risk_flag BOOLEAN DEFAULT false,
    risk_description TEXT,
    compliance_issue BOOLEAN DEFAULT false,
    compliance_description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建模板表
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(100), -- 合同模板、条款模板
    category VARCHAR(100), -- 采购、销售、服务等
    
    -- 模板内容
    template_content TEXT,
    variables JSONB, -- 模板变量定义
    
    -- 权限控制
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 创建审批流程表
CREATE TABLE IF NOT EXISTS approval_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 创建审批步骤表
CREATE TABLE IF NOT EXISTS approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID REFERENCES approval_flows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    approver_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    comments TEXT,
    
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 创建合同分析结果表（与schema.sql保持一致）
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

-- 8. 创建系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    
    -- 日志详情
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_category ON contracts(category);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_contract_id ON contract_analysis(contract_id);
CREATE INDEX IF NOT EXISTS idx_analysis_user_id ON contract_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_risk_level ON contract_analysis(overall_risk_level);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新时间的表创建触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_flows_updated_at BEFORE UPDATE ON approval_flows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认管理员用户（密码为admin123，实际使用时需要加密）
INSERT INTO users (email, password_hash, full_name, role, department, is_active) 
VALUES ('admin@aicontract.com', '$2b$10$examplehash', '系统管理员', 'admin', 'IT部门', true)
ON CONFLICT (email) DO NOTHING;

-- 插入默认模板数据
INSERT INTO templates (name, description, template_type, category, is_public, created_by) 
VALUES 
    ('标准采购合同模板', '适用于一般商品采购的标准合同模板', '合同模板', '采购', true, (SELECT id FROM users WHERE email = 'admin@aicontract.com')),
    ('服务合同模板', '适用于技术服务、咨询服务的合同模板', '合同模板', '服务', true, (SELECT id FROM users WHERE email = 'admin@aicontract.com')),
    ('保密条款模板', '标准保密条款模板', '条款模板', '通用', true, (SELECT id FROM users WHERE email = 'admin@aicontract.com'))
ON CONFLICT DO NOTHING;

-- 创建视图用于报表查询
CREATE VIEW contract_summary_view AS
SELECT 
    c.id,
    c.contract_number,
    c.title,
    c.contract_type,
    c.status,
    c.party_a_name,
    c.party_b_name,
    c.contract_amount,
    c.risk_level,
    c.compliance_status,
    u.full_name as created_by_name,
    c.created_at,
    c.updated_at
FROM contracts c
LEFT JOIN users u ON c.created_by = u.id;

-- 打印初始化完成信息
SELECT '数据库初始化完成！AI智能合同分析管理系统数据库表结构已创建。' as message;