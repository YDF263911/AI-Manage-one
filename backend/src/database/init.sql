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

-- 2. 创建合同表
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    contract_type VARCHAR(100), -- 采购合同、销售合同、服务合同等
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending, approved, signed, executed, terminated
    
    -- 合同基本信息
    party_a_name VARCHAR(255),
    party_b_name VARCHAR(255),
    contract_amount DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'CNY',
    effective_date DATE,
    expiry_date DATE,
    
    -- 文件信息
    original_file_url TEXT,
    parsed_file_url TEXT,
    file_type VARCHAR(50), -- pdf, doc, docx, image
    file_size INTEGER,
    
    -- AI分析结果
    risk_level VARCHAR(20), -- low, medium, high, critical
    risk_score DECIMAL(3,2),
    compliance_status VARCHAR(50), -- compliant, non_compliant, needs_review
    
    -- 元数据
    created_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- 7. 创建分析记录表
CREATE TABLE IF NOT EXISTS analysis_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    analysis_type VARCHAR(100), -- risk, compliance, extraction
    
    -- 分析结果
    analysis_result JSONB,
    confidence_score DECIMAL(3,2),
    processing_time INTEGER, -- 处理时间(毫秒)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_by ON contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_contracts_risk_level ON contracts(risk_level);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_contract_id ON contract_clauses(contract_id);
CREATE INDEX IF NOT EXISTS idx_approval_flows_contract_id ON approval_flows(contract_id);
CREATE INDEX IF NOT EXISTS idx_analysis_records_contract_id ON analysis_records(contract_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

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