<template>
  <div class="demo-rules-page">
    <div class="page-header">
      <el-page-header @back="goBack">
        <template #content>
          <div class="header-content">
            <h2>添加示例风险规则</h2>
            <p>为系统添加实用的风险规则示例</p>
          </div>
        </template>
      </el-page-header>
    </div>

    <div class="rules-preview">
      <h3>将添加的风险规则</h3>
      <el-card v-for="rule in demoRules" :key="rule.name" class="rule-card">
        <div class="rule-info">
          <div class="rule-header">
            <span class="rule-name">{{ rule.name }}</span>
            <el-tag :type="getSeverityTag(rule.severity)">{{ getSeverityText(rule.severity) }}</el-tag>
            <el-tag :type="getCategoryTag(rule.category)">{{ getCategoryText(rule.category) }}</el-tag>
          </div>
          <p class="rule-description">{{ rule.description }}</p>
          <p class="rule-suggestion"><strong>处理建议:</strong> {{ rule.suggestion }}</p>
        </div>
      </el-card>
    </div>

    <div class="action-section">
      <el-button 
        type="primary" 
        size="large" 
        :loading="loading" 
        @click="addDemoRules"
      >
        {{ loading ? '正在添加...' : '添加示例规则' }}
      </el-button>
      <el-button @click="goBack">返回</el-button>
    </div>

    <div v-if="resultMessage" class="result-section">
      <el-alert 
        :title="resultMessage" 
        :type="resultType" 
        :closable="false"
        show-icon
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { supabase } from '@/utils/supabase';

const router = useRouter();
const loading = ref(false);
const resultMessage = ref('');
const resultType = ref<'success' | 'error' | 'warning' | 'info'>('info');

// 示例风险规则数据
const demoRules = [
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
  }
];

const goBack = () => {
  router.push('/risk-rules');
};

const addDemoRules = async () => {
  loading.value = true;
  resultMessage.value = '';

  try {
    // 首先检查表结构是否正确
    const { data: testData, error: testError } = await supabase
      .from('risk_rules')
      .select('category')
      .limit(1);

    if (testError) {
      if (testError.code === 'PGRST204' || testError.message.includes('category')) {
        // 表结构问题，显示修复指导
        resultMessage.value = `数据库表结构不匹配。请执行以下SQL语句修复：`;
        resultType.value = 'error';
        
        // 显示修复SQL
        setTimeout(() => {
          showFixInstructions();
        }, 1000);
        return;
      }
      throw testError;
    }

    // 检查是否已有规则，避免重复添加
    const { data: currentRules } = await supabase
      .from('risk_rules')
      .select('name');

    const existingRuleNames = currentRules?.map(rule => rule.name) || [];
    const newRules = demoRules.filter(rule => !existingRuleNames.includes(rule.name));

    if (newRules.length === 0) {
      resultMessage.value = '所有示例规则已存在，无需重复添加';
      resultType.value = 'warning';
      return;
    }

    // 插入风险规则
    const { data, error } = await supabase
      .from('risk_rules')
      .insert(newRules)
      .select();

    if (error) throw error;

    resultMessage.value = `成功添加 ${data.length} 条风险规则`;
    resultType.value = 'success';
    
    ElMessage.success(`成功添加 ${data.length} 条风险规则示例`);

    // 3秒后返回规则列表
    setTimeout(() => {
      router.push('/risk-rules');
    }, 3000);

  } catch (error: any) {
    console.error('添加规则失败:', error);
    resultMessage.value = `添加失败: ${error.message}`;
    resultType.value = 'error';
    ElMessage.error(`添加失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

const showFixInstructions = () => {
  const fixSQL = `
-- 🔧 修复风险规则表结构SQL语句
-- 请在Supabase控制台的SQL编辑器中执行以下语句：

-- 1. 首先删除旧表（如果存在）
DROP TABLE IF EXISTS risk_rules CASCADE;

-- 2. 创建新表
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

-- 3. 创建索引
CREATE INDEX idx_risk_rules_category ON risk_rules(category);
CREATE INDEX idx_risk_rules_severity ON risk_rules(severity);
CREATE INDEX idx_risk_rules_active ON risk_rules(is_active);
CREATE INDEX idx_risk_rules_created_at ON risk_rules(created_at DESC);

-- 4. 执行完成后，刷新页面重新尝试添加规则
`;
  
  ElMessageBox.alert(fixSQL, '数据库表结构修复指导', {
    confirmButtonText: '复制SQL语句',
    customClass: 'sql-fix-dialog',
    dangerouslyUseHTMLString: true,
    beforeClose: (action, instance, done) => {
      if (action === 'confirm') {
        // 复制SQL到剪贴板
        navigator.clipboard.writeText(fixSQL).then(() => {
          ElMessage.success('SQL语句已复制到剪贴板');
        });
      }
      done();
    }
  });
};

// 工具函数
const getCategoryTag = (category: string) => {
  const categoryMap: any = {
    legal: 'success',
    financial: 'warning',
    operational: 'danger',
    format: 'info',
    custom: 'primary',
  };
  return categoryMap[category] || 'info';
};

const getCategoryText = (category: string) => {
  const categoryMap: any = {
    legal: '法律合规',
    financial: '财务风险',
    operational: '操作风险',
    format: '格式规范',
    custom: '自定义规则',
  };
  return categoryMap[category] || category;
};

const getSeverityTag = (severity: string) => {
  const severityMap: any = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
  };
  return severityMap[severity] || 'info';
};

const getSeverityText = (severity: string) => {
  const severityMap: any = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };
  return severityMap[severity] || severity;
};
</script>

<style scoped>
.demo-rules-page {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.header-content h2 {
  margin: 0;
  margin-bottom: 5px;
}

.header-content p {
  margin: 0;
  color: #606266;
}

.rules-preview {
  margin-bottom: 30px;
}

.rules-preview h3 {
  margin-bottom: 15px;
  color: #303133;
}

.rule-card {
  margin-bottom: 15px;
}

.rule-info {
  padding: 10px 0;
}

.rule-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.rule-name {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.rule-description {
  color: #606266;
  margin-bottom: 8px;
  line-height: 1.5;
}

.rule-suggestion {
  color: #909399;
  font-size: 14px;
  line-height: 1.4;
}

.action-section {
  text-align: center;
  margin-bottom: 20px;
}

.action-section .el-button {
  margin: 0 10px;
}

.result-section {
  margin-top: 20px;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-tag) {
  font-size: 12px;
}
</style>