// 检查并修复风险规则表结构
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// 使用前端项目的Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置，请检查.env文件');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixTable() {
  try {
    console.log('🔍 检查风险规则表结构...');
    
    // 首先检查表是否存在
    const { data: tableExists, error: checkError } = await supabase
      .from('risk_rules')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code === 'PGRST204') {
      console.log('⚠️  风险规则表不存在，需要创建...');
      await createRiskRulesTable();
    } else if (checkError) {
      console.error('❌ 检查表失败:', checkError);
      return;
    } else {
      console.log('✅ 风险规则表存在，检查字段结构...');
      await checkAndFixColumns();
    }
    
  } catch (error) {
    console.error('❌ 检查表结构失败:', error);
  }
}

async function createRiskRulesTable() {
  try {
    console.log('🔄 创建风险规则表...');
    
    // 通过SQL执行创建表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS risk_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL CHECK (category IN ('legal', 'financial', 'operational', 'format', 'custom')),
        severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
        pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('keyword', 'regex', 'semantic', 'logic')),
        pattern_content TEXT,
        threshold DECIMAL(3,2) DEFAULT 0.8,
        condition JSONB,
        suggestion TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        trigger_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    // 由于Supabase JS客户端不支持直接执行SQL，我们需要通过其他方式
    // 这里先尝试插入一条测试数据来触发表创建
    console.log('尝试通过插入数据来触发表创建...');
    
    const testRule = {
      name: '测试规则',
      description: '用于测试表结构的规则',
      category: 'legal',
      severity: 'low',
      pattern_type: 'keyword',
      pattern_content: '测试',
      threshold: 0.5,
      condition: '{"test": true}',
      suggestion: '测试建议',
      is_active: true
    };
    
    const { data, error } = await supabase
      .from('risk_rules')
      .insert([testRule])
      .select();
    
    if (error) {
      console.error('❌ 插入测试数据失败:', error);
      console.log('\n💡 请通过Supabase控制台手动执行以下SQL语句:');
      console.log(createTableSQL);
      console.log('\n然后重新运行此脚本。');
    } else {
      console.log('✅ 风险规则表创建成功！');
      
      // 删除测试数据
      await supabase
        .from('risk_rules')
        .delete()
        .eq('id', data[0].id);
      
      console.log('✅ 测试数据已清理');
    }
    
  } catch (error) {
    console.error('❌ 创建表失败:', error);
  }
}

async function checkAndFixColumns() {
  try {
    console.log('🔍 检查字段结构...');
    
    // 尝试查询所有字段来检测缺失的字段
    const testData = {
      name: '测试字段检查',
      description: '检查字段完整性',
      category: 'legal',
      severity: 'medium',
      pattern_type: 'keyword',
      pattern_content: '测试',
      threshold: 0.7,
      condition: '{"check": true}',
      suggestion: '测试建议',
      is_active: true
    };
    
    const { data, error } = await supabase
      .from('risk_rules')
      .insert([testData])
      .select();
    
    if (error) {
      if (error.message.includes('category')) {
        console.log('⚠️  category字段缺失，需要修复表结构...');
        await recreateTableWithCorrectStructure();
      } else {
        console.error('❌ 检查字段失败:', error);
      }
    } else {
      console.log('✅ 所有必需字段都存在！');
      
      // 删除测试数据
      await supabase
        .from('risk_rules')
        .delete()
        .eq('id', data[0].id);
    }
    
  } catch (error) {
    console.error('❌ 检查字段失败:', error);
  }
}

async function recreateTableWithCorrectStructure() {
  try {
    console.log('🔄 重新创建表结构...');
    
    // 由于Supabase JS客户端不支持直接执行DDL，我们需要通过其他方式
    // 这里提供手动修复的SQL语句
    console.log('\n💡 请通过Supabase控制台手动执行以下SQL语句:');
    
    const fixSQL = `
-- 首先备份现有数据（如果有）
CREATE TABLE IF NOT EXISTS risk_rules_backup AS SELECT * FROM risk_rules;

-- 删除旧表
DROP TABLE IF EXISTS risk_rules CASCADE;

-- 创建新表
CREATE TABLE risk_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('legal', 'financial', 'operational', 'format', 'custom')),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('keyword', 'regex', 'semantic', 'logic')),
    pattern_content TEXT,
    threshold DECIMAL(3,2) DEFAULT 0.8,
    condition JSONB,
    suggestion TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_risk_rules_category ON risk_rules(category);
CREATE INDEX idx_risk_rules_severity ON risk_rules(severity);
CREATE INDEX idx_risk_rules_active ON risk_rules(is_active);

-- 恢复数据（如果需要）
-- INSERT INTO risk_rules (name, description, category, severity, pattern_type, pattern_content, threshold, condition, suggestion, is_active)
-- SELECT rule_name, rule_description, 'legal', risk_level, rule_type, '{}', 0.8, rule_config, '自动迁移', is_active
-- FROM risk_rules_backup;

-- 删除备份表
-- DROP TABLE risk_rules_backup;
`;
    
    console.log(fixSQL);
    console.log('\n📋 执行步骤:');
    console.log('1. 登录Supabase控制台');
    console.log('2. 进入SQL编辑器');
    console.log('3. 复制上面的SQL语句并执行');
    console.log('4. 完成后重新运行添加示例规则功能');
    
  } catch (error) {
    console.error('❌ 重新创建表失败:', error);
  }
}

// 执行检查
checkAndFixTable();