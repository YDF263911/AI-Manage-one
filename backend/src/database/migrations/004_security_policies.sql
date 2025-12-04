-- 安全策略和RLS配置

-- 启用行级安全策略（RLS）
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略

-- 用户只能访问自己的档案
CREATE POLICY "用户只能访问自己的档案" ON user_profiles 
FOR ALL USING (auth.uid() = id);

-- 用户只能访问自己的合同
CREATE POLICY "用户只能访问自己的合同" ON contracts 
FOR ALL USING (auth.uid() = user_id);

-- 用户只能访问自己的分析结果
CREATE POLICY "用户只能访问自己的分析结果" ON contract_analysis 
FOR ALL USING (auth.uid() = user_id);

-- 用户只能访问自己的草稿
CREATE POLICY "用户只能访问自己的草稿" ON contract_drafts 
FOR ALL USING (auth.uid() = user_id);

-- 模板对所有用户可见（只读）
CREATE POLICY "所有用户可查看模板" ON templates 
FOR SELECT USING (true);

-- 只有管理员可以管理模板
CREATE POLICY "只有管理员可以管理模板" ON templates 
FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- 风险规则对所有用户可见（只读）
CREATE POLICY "所有用户可查看风险规则" ON risk_rules 
FOR SELECT USING (true);

-- 只有管理员可以管理风险规则
CREATE POLICY "只有管理员可以管理风险规则" ON risk_rules 
FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- 系统配置只有管理员可访问
CREATE POLICY "只有管理员可以管理系统配置" ON system_config 
FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- 审批流程策略
CREATE POLICY "用户可查看相关审批流程" ON approval_workflows 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM contracts 
        WHERE contracts.id = approval_workflows.contract_id 
        AND contracts.user_id = auth.uid()
    ) OR 
    auth.jwt() ->> 'role' IN ('admin', 'legal')
);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间触发器
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at 
    BEFORE UPDATE ON contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_analysis_updated_at 
    BEFORE UPDATE ON contract_analysis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_drafts_updated_at 
    BEFORE UPDATE ON contract_drafts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflows_updated_at 
    BEFORE UPDATE ON approval_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_rules_updated_at 
    BEFORE UPDATE ON risk_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at 
    BEFORE UPDATE ON system_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();