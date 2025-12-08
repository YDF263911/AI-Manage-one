# 缓存表创建说明

## 问题说明
由于项目使用了Supabase托管，数据库迁移文件无法自动执行。需要手动在Supabase控制台创建缓存表。

## 需要执行的SQL

```sql
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
    
    -- 文件版本控制（基于文件修改时间）
    file_modified_at TIMESTAMPTZ,
    
    -- 质量指标
    extraction_quality VARCHAR(20) DEFAULT 'unknown' CHECK (extraction_quality IN ('excellent', 'good', 'fair', 'poor', 'unknown')),
    confidence_score DECIMAL(3,2),
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_text_cache_contract_id ON contract_text_cache(contract_id);
CREATE INDEX IF NOT EXISTS idx_text_cache_file_modified_at ON contract_text_cache(file_modified_at);
CREATE INDEX IF NOT EXISTS idx_text_cache_quality ON contract_text_cache(extraction_quality);
CREATE INDEX IF NOT EXISTS idx_text_cache_created_at ON contract_text_cache(created_at);

-- 为contracts表添加缺失的字段（如果还没有）
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS extraction_status VARCHAR DEFAULT 'pending' 
CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS extraction_completed_at TIMESTAMPTZ;

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS extraction_error TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_contracts_extraction_status ON contracts(extraction_status);
CREATE INDEX IF NOT EXISTS idx_contracts_extraction_completed_at ON contracts(extraction_completed_at);
```

## 执行步骤

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 进入项目：AI智能合同分析管理系统  
3. 点击左侧 "SQL Editor"
4. 复制上面的SQL代码粘贴
5. 点击 "Run" 执行

## 验证方法

执行完成后，可以通过以下SQL验证：

```sql
-- 检查表是否创建成功
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contract_text_cache'
ORDER BY ordinal_position;

-- 检查索引是否创建成功  
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'contract_text_cache';
```

## 临时解决方案

在缓存表创建之前，系统会降级为每次都重新提取的工作模式，但提取功能仍然正常。