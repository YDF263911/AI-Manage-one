-- 初始数据库迁移文件
-- 创建所有核心表结构

-- 用户档案表
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
    category VARCHAR(50) DEFAULT 'other',
    status VARCHAR(20) DEFAULT 'uploaded',
    
    contract_title VARCHAR(500),
    contract_parties JSONB,
    contract_amount DECIMAL(15,2),
    effective_date DATE,
    expiration_date DATE,
    
    analysis_started_at TIMESTAMPTZ,
    analysis_completed_at TIMESTAMPTZ,
    confidence_score DECIMAL(3,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_category ON contracts(category);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);

-- 添加约束
ALTER TABLE contracts ADD CONSTRAINT chk_contracts_category 
CHECK (category IN ('purchase', 'sales', 'service', 'employment', 'nda', 'lease', 'partnership', 'other'));

ALTER TABLE contracts ADD CONSTRAINT chk_contracts_status 
CHECK (status IN ('uploaded', 'processing', 'analyzed', 'reviewed', 'approved', 'rejected'));