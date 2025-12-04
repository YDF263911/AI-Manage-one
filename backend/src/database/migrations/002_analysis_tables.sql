-- 合同分析相关表结构

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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_analysis_contract_id ON contract_analysis(contract_id);
CREATE INDEX IF NOT EXISTS idx_analysis_user_id ON contract_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_risk_level ON contract_analysis(overall_risk_level);

-- 添加唯一约束
ALTER TABLE contract_analysis ADD CONSTRAINT unique_contract_analysis UNIQUE (contract_id);

-- 模板表
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('purchase', 'sales', 'service', 'employment', 'nda', 'lease', 'partnership', 'other')),
    description TEXT,
    content TEXT NOT NULL,
    tags TEXT[],
    is_public BOOLEAN DEFAULT FALSE,
    variables JSONB DEFAULT '[]',
    
    -- 模板元数据
    version VARCHAR(20) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    
    -- 创建信息
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);