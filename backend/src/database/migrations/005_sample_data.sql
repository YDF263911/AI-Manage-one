-- 插入示例数据

-- 插入初始系统配置
INSERT INTO system_config (config_key, config_value, config_description, config_type) VALUES
('ai_model_settings', '{"default_model": "layoutlm", "confidence_threshold": 0.8, "max_analysis_time": 30}', 'AI模型配置', 'ai'),
('file_upload_settings', '{"max_file_size": 10485760, "allowed_types": ["pdf", "doc", "docx", "txt"]}', '文件上传配置', 'general'),
('risk_assessment_settings', '{"high_risk_threshold": 0.7, "medium_risk_threshold": 0.4}', '风险评估配置', 'security'),
('notification_settings', '{"email_notifications": true, "risk_alerts": true}', '通知配置', 'notification');

-- 插入示例模板
INSERT INTO templates (name, category, description, content, tags, created_by) VALUES
('标准采购合同模板', 'purchase', '适用于一般商品采购的标准合同模板', '采购合同

甲方（采购方）：{{buyer}}
乙方（供应方）：{{supplier}}

鉴于甲方有意向采购乙方提供的商品/服务，双方经友好协商，达成如下协议：

第一条 商品/服务内容
1.1 商品名称：{{product_name}}
1.2 规格型号：{{specifications}}
1.3 数量：{{quantity}}
1.4 单价：{{unit_price}}元
1.5 总价：{{total_amount}}元

第二条 交付方式
2.1 交付时间：{{delivery_date}}
2.2 交付地点：{{delivery_location}}
2.3 运输方式：{{transport_method}}

第三条 付款方式
3.1 付款期限：{{payment_terms}}
3.2 付款方式：{{payment_method}}

第四条 质量保证
4.1 质量标准：{{quality_standard}}
4.2 质保期：{{warranty_period}}

第五条 违约责任
5.1 任何一方违反本合同约定，应承担违约责任。
5.2 违约方应赔偿守约方因此遭受的全部损失。

第六条 争议解决
6.1 本合同适用中华人民共和国法律。
6.2 双方因本合同发生的争议，应友好协商解决；协商不成的，提交有管辖权的人民法院诉讼解决。

第七条 其他约定
7.1 本合同一式两份，甲乙双方各执一份，具有同等法律效力。
7.2 本合同自双方签字盖章之日起生效。

甲方（盖章）：
代表人：
日期：

乙方（盖章）：
代表人：
日期：', '{"采购","标准","商品"}', '00000000-0000-0000-0000-000000000000'),

('技术服务合同模板', 'service', '适用于技术开发、咨询等服务的合同模板', '技术服务合同

委托方（甲方）：{{client}}
服务方（乙方）：{{service_provider}}

鉴于甲方需要乙方提供技术服务，双方经友好协商，达成如下协议：

第一条 服务内容
1.1 服务项目：{{service_project}}
1.2 服务范围：{{service_scope}}
1.3 交付成果：{{deliverables}}

第二条 服务期限
2.1 开始日期：{{start_date}}
2.2 结束日期：{{end_date}}
2.3 服务周期：{{service_period}}

第三条 服务费用
3.1 服务总费用：{{total_fee}}元
3.2 付款方式：{{payment_schedule}}
3.3 发票要求：{{invoice_requirements}}

第四条 双方权利义务
4.1 甲方权利义务：{{client_rights_obligations}}
4.2 乙方权利义务：{{provider_rights_obligations}}

第五条 知识产权
5.1 知识产权归属：{{ip_ownership}}
5.2 使用权许可：{{usage_license}}

第六条 保密条款
6.1 保密信息范围：{{confidential_info}}
6.2 保密期限：{{confidential_period}}
6.3 保密义务：{{confidential_obligations}}

第七条 违约责任
7.1 违约情形：{{breach_conditions}}
7.2 违约责任：{{breach_liabilities}}

第八条 争议解决
8.1 适用法律：中华人民共和国法律
8.2 争议解决方式：协商、调解、仲裁或诉讼

第九条 其他约定
9.1 合同生效：双方签字盖章后生效
9.2 合同份数：一式两份，双方各执一份

甲方（盖章）：
代表人：
日期：

乙方（盖章）：
代表人：
日期：', '{"技术","服务","开发"}', '00000000-0000-0000-0000-000000000000'),

('劳动合同模板', 'employment', '标准劳动合同模板', '劳动合同

用人单位（甲方）：{{employer}}
劳动者（乙方）：{{employee}}

根据《中华人民共和国劳动法》等相关法律法规，双方签订本合同：

第一条 合同期限
1.1 合同期限：{{contract_period}}
1.2 试用期：{{probation_period}}

第二条 工作内容
2.1 工作岗位：{{job_position}}
2.2 工作地点：{{work_location}}
2.3 工作职责：{{job_responsibilities}}

第三条 劳动报酬
3.1 基本工资：{{base_salary}}元/月
3.2 绩效奖金：{{performance_bonus}}
3.3 发放时间：{{salary_payment_date}}

第四条 工作时间
4.1 工作制度：{{work_system}}
4.2 休息休假：按照国家规定执行

第五条 社会保险
5.1 社会保险：依法为乙方缴纳社会保险
5.2 住房公积金：依法为乙方缴纳住房公积金

第六条 劳动保护
6.1 劳动条件：提供符合国家标准的劳动条件
6.2 劳动保护：提供必要的劳动保护用品

第七条 合同变更
7.1 变更条件：双方协商一致可以变更合同
7.2 变更程序：书面形式变更

第八条 合同终止
8.1 终止条件：按法律规定执行
8.2 终止程序：按规定程序办理

第九条 争议解决
9.1 争议解决：协商、调解、仲裁

第十条 其他约定
10.1 本合同未尽事宜，按国家有关规定执行
10.2 本合同一式两份，双方各执一份

甲方（盖章）：
代表人：
日期：

乙方（签字）：
日期：', '{"劳动","雇佣","人事"}', '00000000-0000-0000-0000-000000000000');

-- 插入示例风险规则
INSERT INTO risk_rules (rule_name, rule_description, rule_type, rule_config, risk_level, created_by) VALUES
('无限责任条款检测', '检测合同中是否存在无限责任条款', 'keyword', '{"keywords": ["无限责任", "无限连带责任"], "case_sensitive": false}', 'high', '00000000-0000-0000-0000-000000000000'),
('单方面解除权检测', '检测单方面解除合同的条款', 'keyword', '{"keywords": ["单方面解除", "单方解除", "任意解除"], "case_sensitive": false}', 'high', '00000000-0000-0000-0000-000000000000'),
('过高违约金检测', '检测违约金是否过高', 'pattern', '{"patterns": ["违约金.*超过.*[0-9]+%", "赔偿金.*超过.*损失"], "regex": true}', 'medium', '00000000-0000-0000-0000-000000000000'),
('付款条款模糊检测', '检测付款条款是否明确', 'keyword', '{"keywords": ["另行约定", "待定", "协商确定"], "context": "付款"}', 'medium', '00000000-0000-0000-0000-000000000000'),
('交付时间模糊检测', '检测交付时间是否明确', 'keyword', '{"keywords": ["尽快", "适时", "合理时间"], "context": "交付"}', 'medium', '00000000-0000-0000-0000-000000000000');

-- 创建默认管理员用户配置文件（需要在Supabase Auth中创建用户后运行）
-- INSERT INTO user_profiles (id, username, role, department, created_at) 
-- VALUES ('admin-user-id', '系统管理员', 'admin', 'IT部门', NOW());