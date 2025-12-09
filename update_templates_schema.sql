-- 为templates表添加variables列
-- 这个脚本用于更新现有Supabase数据库中的templates表结构

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS variables JSONB;

-- 更新现有模板的variables列为默认值
UPDATE templates 
SET variables = '[]'::jsonb 
WHERE variables IS NULL;

-- 添加注释
COMMENT ON COLUMN templates.variables IS '模板变量定义，包含变量名、标签、默认值等信息';