// 为AI合同管理系统添加实用风险规则
// 通过Supabase客户端直接添加数据

import { createClient } from '@supabase/supabase-js';

// 从环境变量获取配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置，请检查.env文件');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 实用的风险规则数据
const riskRules = [
  {
    name: '无限责任条款',
    category: 'legal',
    severity: 'high',
    description: '检测合同是否包含无限责任或无限期责任条款',
    condition: '{"regex": "无限责任|无限期|永久有效|终身有效"}',
    pattern_type: 'keyword',
    pattern_content: '无限责任,无限期,永久有效,终身有效',
    threshold: 0.8,
    suggestion: '建议明确责任范围和期限，避免无限责任风险',
    is_active: true
  },
  {
    name: '单方解除权条款',
    category: 'legal',
    severity: 'medium',
    description: '检测合同是否赋予单方无理由解除合同的权利',
    condition: '{"keywords": ["单方解除","任意解除","随时终止","无需理由"]}',
    pattern_type: 'keyword',
    pattern_content: '单方解除,任意解除,随时终止,无需理由',
    threshold: 0.7,
    suggestion: '建议明确解除条件和违约责任，保障双方权益',
    is_active: true
  },
  {
    name: '违约金过高',
    category: 'financial',
    severity: 'high',
    description: '检测违约金是否超过法定上限或显失公平',
    condition: '{"regex": "违约金.*超过.*30%|违约金.*每日.*千分之"}',
    pattern_type: 'regex',
    pattern_content: '违约金.*超过.*30%|违约金.*每日.*千分之',
    threshold: 0.9,
    suggestion: '违约金不得超过实际损失的30%，建议合理设定',
    is_active: true
  },
  {
    name: '争议解决条款缺失',
    category: 'legal',
    severity: 'medium',
    description: '检测合同是否缺少争议解决条款',
    condition: '{"missing": ["争议","仲裁","诉讼","法院"]}',
    pattern_type: 'semantic',
    pattern_content: '争议,仲裁,诉讼,法院',
    threshold: 0.6,
    suggestion: '建议补充争议解决条款，明确管辖法院或仲裁机构',
    is_active: true
  },
  {
    name: '知识产权归属不清',
    category: 'legal',
    severity: 'high',
    description: '检测知识产权归属是否明确约定',
    condition: '{"keywords": ["知识产权","著作权","专利权"]}',
    pattern_type: 'logic',
    pattern_content: '知识产权|著作权|专利权',
    threshold: 0.7,
    suggestion: '建议明确知识产权归属和使用权限',
    is_active: true
  },
  {
    name: '付款条件不明确',
    category: 'financial',
    severity: 'medium',
    description: '检测付款条件是否具体明确',
    condition: '{"regex": "付款.*[未未]明确|付款.*条件.*[不无]清"}',
    pattern_type: 'regex',
    pattern_content: '付款.*[未未]明确|付款.*条件.*[不无]清',
    threshold: 0.8,
    suggestion: '建议明确付款时间、金额和方式',
    is_active: true
  },
  {
    name: '保密条款缺失',
    category: 'legal',
    severity: 'medium',
    description: '检测涉及商业秘密的合同是否缺少保密条款',
    condition: '{"missing": ["保密","商业秘密","保密义务"]}',
    pattern_type: 'semantic',
    pattern_content: '保密,商业秘密,保密义务',
    threshold: 0.6,
    suggestion: '建议添加保密条款，保护商业秘密',
    is_active: true
  },
  {
    name: '格式条款不公平',
    category: 'legal',
    severity: 'high',
    description: '检测格式条款是否显失公平',
    condition: '{"keywords": ["格式条款","免除责任","加重责任"]}',
    pattern_type: 'keyword',
    pattern_content: '格式条款,免除责任,加重责任',
    threshold: 0.8,
    suggestion: '格式条款应当公平合理，不得排除对方主要权利',
    is_active: true
  }
];

async function addRiskRules() {
  console.log('🚀 开始添加风险规则到数据库...');
  
  try {
    // 首先检查风险规则表是否存在
    const { data: existingRules, error: checkError } = await supabase
      .from('risk_rules')
      .select('id, name')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      console.error('❌ 风险规则表不存在，请先创建数据库表');
      return;
    }

    // 检查是否已有规则，避免重复添加
    const { data: currentRules } = await supabase
      .from('risk_rules')
      .select('name');

    const existingRuleNames = currentRules?.map(rule => rule.name) || [];
    const newRules = riskRules.filter(rule => !existingRuleNames.includes(rule.name));

    if (newRules.length === 0) {
      console.log('✅ 所有风险规则已存在，无需重复添加');
      return;
    }

    // 插入风险规则
    const { data, error } = await supabase
      .from('risk_rules')
      .insert(newRules)
      .select();

    if (error) {
      console.error('❌ 添加风险规则失败:', error.message);
      return;
    }

    console.log(`✅ 成功添加 ${data.length} 条风险规则`);
    console.log('📊 添加的规则列表:');
    data.forEach(rule => {
      console.log(`  • ${rule.name} (${rule.category} - ${rule.severity})`);
    });

  } catch (error) {
    console.error('❌ 执行过程中出错:', error.message);
  }
}

// 导出函数供其他模块使用
export { addRiskRules };