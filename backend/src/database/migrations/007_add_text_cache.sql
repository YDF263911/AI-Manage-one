-- 添加文本提取结果缓存表
-- 迁移编号: 007
-- 创建时间: 2024-12-05

-- 创建文本提取缓存表
CREATE TABLE IF NOT EXISTS contract_text_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE UNIQUE,
    
    -- 提取的文本内容
    extracted_text TEXT NOT NULL,
    
    -- 元数据
    word_count INTEGER,
    character_count INTEGER,
    extraction_method VARCHAR(50) DEFAULT 'auto', -- 'auto', 'pdfjs', 'mammoth', 'binary'
    
    -- 文件版本控制（基于文件修改时间或哈希值）
    file_hash VARCHAR(64), -- SHA-256 哈希值
    file_modified_at TIMESTAMPTZ,
    
    -- 质量指标
    extraction_quality VARCHAR(20) DEFAULT 'unknown' CHECK (extraction_quality IN ('excellent', 'good', 'fair', 'poor', 'unknown')),
    confidence_score DECIMAL(3,2),
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 索引
    INDEX idx_text_cache_contract_id (contract_id),
    INDEX idx_text_cache_file_hash (file_hash),
    INDEX idx_text_cache_quality (extraction_quality),
    INDEX idx_text_cache_created_at (created_at)
);

-- 添加注释
COMMENT ON TABLE contract_text_cache IS '合同文本提取结果缓存表，避免重复提取相同文件';
COMMENT ON COLUMN contract_text_cache.extracted_text IS '提取的完整文本内容';
COMMENT ON COLUMN contract_text_cache.file_hash IS '文件SHA-256哈希值，用于检测文件变更';
COMMENT ON COLUMN contract_text_cache.extraction_quality IS '提取质量评估：excellent(优秀), good(良好), fair(一般), poor(较差)';
COMMENT ON COLUMN contract_text_cache.extraction_method IS '提取方法：auto(自动), pdfjs(PDF.js), mammoth(Word), binary(二进制)';

-- 创建缓存清理函数（可选）
CREATE OR REPLACE FUNCTION cleanup_old_text_cache()
RETURNS void AS $$
BEGIN
    -- 删除超过30天且对应的合同已被删除的缓存记录
    DELETE FROM contract_text_cache 
    WHERE contract_id NOT IN (SELECT id FROM contracts)
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- 删除超过90天的所有缓存记录（可选）
    -- DELETE FROM contract_text_cache WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_text_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_text_cache_updated_at
    BEFORE UPDATE ON contract_text_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_text_cache_updated_at();