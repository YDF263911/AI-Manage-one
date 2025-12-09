-- 修复risk_rules表结构，使其与前端代码匹配

-- 首先删除现有的risk_rules表（如果存在）
DROP TABLE IF EXISTS risk_rules CASCADE;

-- 重新创建risk_rules表，使用与前端代码一致的字段名
CREATE TABLE risk_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 规则基本信息（与前端代码一致）
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('legal', 'financial', 'operational', 'format', 'custom')),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    
    -- 规则配置
    pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('keyword', 'regex', 'semantic', 'logic')),
    pattern_content TEXT,
    threshold DECIMAL(3,2) DEFAULT 0.8,
    condition JSONB,
    suggestion TEXT,
    
    -- 状态和统计
    is_active BOOLEAN DEFAULT TRUE,
    trigger_count INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_risk_rules_category ON risk_rules(category);
CREATE INDEX idx_risk_rules_severity ON risk_rules(severity);
CREATE INDEX idx_risk_rules_active ON risk_rules(is_active);
CREATE INDEX idx_risk_rules_created_at ON risk_rules(created_at DESC);

-- 添加注释
COMMENT ON TABLE risk_rules IS '风险规则表';
COMMENT ON COLUMN risk_rules.name IS '规则名称';
COMMENT ON COLUMN risk_rules.description IS '规则描述';
COMMENT ON COLUMN risk_rules.category IS '规则分类：legal(法律合规), financial(财务风险), operational(操作风险), format(格式规范), custom(自定义)';
COMMENT ON COLUMN risk_rules.severity IS '风险等级：low(低), medium(中), high(高)';
COMMENT ON COLUMN risk_rules.pattern_type IS '匹配模式：keyword(关键词), regex(正则), semantic(语义), logic(逻辑)';
COMMENT ON COLUMN risk_rules.pattern_content IS '匹配内容';
COMMENT ON COLUMN risk_rules.threshold IS '匹配阈值';
COMMENT ON COLUMN risk_rules.condition IS '匹配条件（JSON格式）';
COMMENT ON COLUMN risk_rules.suggestion IS '处理建议';
COMMENT ON COLUMN risk_rules.is_active IS '是否启用';
COMMENT ON COLUMN risk_rules.trigger_count IS '触发次数';

-- 插入示例数据（可选）
INSERT INTO risk_rules (name, description, category, severity, pattern_type, pattern_content, threshold, condition, suggestion, is_active) VALUES
('无限责任条款', '检测合同是否包含无限责任或无限期责任条款', 'legal', 'high', 'keyword', '无限责任,无限期,永久有效,终身有效', 0.8, '{"regex": "无限责任|无限期|永久有效|终身有效"}', '建议明确责任范围和期限，避免无限责任风险', true),
('单方解除权条款', '检测合同是否赋予单方无理由解除合同的权利', 'legal', 'medium', 'keyword', '单方解除,任意解除,随时终止,无需理由', 0.7, '{"keywords": ["单方解除","任意解除","随时终止","无需理由"]}', '建议明确解除条件和违约责任，保障双方权益', true),
('违约金过高', '检测违约金是否超过法定上限或显失公平', 'financial', 'high', 'regex', '违约金.*超过.*30%|违约金.*每日.*千分之', 0.9, '{"regex": "违约金.*超过.*30%|违约金.*每日.*千分之"}', '违约金不得超过实际损失的30%，建议合理设定', true),
('争议解决条款缺失', '检测合同是否缺少争议解决条款', 'legal', 'medium', 'semantic', '争议,仲裁,诉讼,法院', 0.6, '{"missing": ["争议","仲裁","诉讼","法院"]}', '建议补充争议解决条款，明确管辖法院或仲裁机构', true),
('知识产权归属不清', '检测知识产权归属是否明确约定', 'legal', 'high', 'logic', '知识产权|著作权|专利权', 0.7, '{"keywords": ["知识产权","著作权","专利权"]}', '建议明确知识产权归属和使用权限', true),
('付款条件不明确', '检测付款条件是否具体明确', 'financial', 'medium', 'regex', '付款.*[未未]明确|付款.*条件.*[不无]清', 0.8, '{"regex": "付款.*[未未]明确|付款.*条件.*[不无]清"}', '建议明确付款时间、金额和方式', true);

-- 确认表创建成功
SELECT '风险规则表创建成功' as result;