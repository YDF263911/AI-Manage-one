-- 为模板表添加is_public和variables字段
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]';
