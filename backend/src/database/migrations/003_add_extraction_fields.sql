-- 添加文件提取状态字段和完成时间字段
-- 迁移编号: 003
-- 创建时间: 2024-12-05

-- 为contracts表添加文件提取相关字段
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS extraction_status VARCHAR DEFAULT 'pending' 
CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS extraction_completed_at TIMESTAMPTZ;

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS extraction_error TEXT;

-- 为contract_analysis表添加完成时间字段
ALTER TABLE contract_analysis 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 更新现有数据的默认值
UPDATE contracts 
SET extraction_status = 'completed' 
WHERE status IN ('analyzed', 'reviewed', 'approved', 'rejected') 
AND extraction_status IS NULL;

UPDATE contract_analysis 
SET completed_at = updated_at 
WHERE completed_at IS NULL AND updated_at IS NOT NULL;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_contracts_extraction_status ON contracts(extraction_status);
CREATE INDEX IF NOT EXISTS idx_contracts_extraction_completed_at ON contracts(extraction_completed_at);
CREATE INDEX IF NOT EXISTS idx_contract_analysis_completed_at ON contract_analysis(completed_at);