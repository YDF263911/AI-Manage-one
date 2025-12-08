-- 修复合同分析表RLS策略
-- 解决前后端用户认证不一致导致的分析结果访问问题

-- 删除原有的限制性策略
DROP POLICY IF EXISTS "用户只能访问自己的分析结果" ON contract_analysis;

-- 创建新的策略：允许用户通过合同关系访问分析结果
CREATE POLICY "用户可访问自己合同的分析结果" ON contract_analysis 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM contracts 
        WHERE contracts.id = contract_analysis.contract_id 
        AND contracts.user_id = auth.uid()
    )
);

-- 为管理员添加特殊权限（基于实际user_profiles表结构）
CREATE POLICY "管理员可访问所有分析结果" ON contract_analysis 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.role = 'admin'
    )
);