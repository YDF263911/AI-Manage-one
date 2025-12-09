<template>
  <div class="settings-container">
    <h1>系统设置</h1>

    <el-tabs v-model="activeTab" type="card">
      <!-- 用户管理 -->
      <el-tab-pane label="用户管理" name="users">
        <div class="user-management">
          <div class="section-header">
            <h3>用户列表</h3>
            <el-button type="primary" @click="showAddUserDialog = true">
              <el-icon><UserPlus /></el-icon>
              添加用户
            </el-button>
          </div>

          <el-table :data="users" style="width: 100%">
            <el-table-column prop="username" label="用户名" width="150" />
            <el-table-column prop="email" label="邮箱" width="200" />
            <el-table-column prop="role" label="角色" width="120">
              <template #default="{ row }">
                <el-tag :type="getRoleTag(row.role)">{{
                  getRoleText(row.role)
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-switch
                  v-model="row.status"
                  active-value="active"
                  inactive-value="inactive"
                  @change="updateUserStatus(row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="lastLogin" label="最后登录" width="180" />
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button size="small" @click="editUser(row)">编辑</el-button>
                <el-button
                  size="small"
                  type="warning"
                  @click="resetPassword(row)"
                  >重置密码</el-button
                >
                <el-button size="small" type="danger" @click="deleteUser(row)"
                  >删除</el-button
                >
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 权限设置 -->
      <el-tab-pane label="权限设置" name="permissions">
        <div class="permission-settings">
          <div class="section-header">
            <h3>角色权限配置</h3>
          </div>

          <el-table :data="roles" style="width: 100%">
            <el-table-column prop="name" label="角色名称" width="150" />
            <el-table-column prop="description" label="描述" />
            <el-table-column label="权限" width="300">
              <template #default="{ row }">
                <el-tag
                  v-for="permission in row.permissions"
                  :key="permission"
                  size="small"
                  class="permission-tag"
                >
                  {{ permission }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button size="small" @click="editRole(row)"
                  >编辑权限</el-button
                >
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- AI模型配置 -->
      <el-tab-pane label="AI模型配置" name="aiModels">
        <div class="ai-model-settings">
          <div class="section-header">
            <h3>AI模型管理</h3>
            <el-button type="primary" @click="testAIModel">
              <el-icon><Cpu /></el-icon>
              测试模型
            </el-button>
          </div>

          <el-form :model="aiConfig" label-width="120px">
            <el-form-item label="OCR识别模型">
              <el-select
                v-model="aiConfig.ocrModel"
                placeholder="请选择OCR模型"
              >
                <el-option label="PaddleOCR" value="paddle" />
                <el-option label="Tesseract" value="tesseract" />
                <el-option label="百度OCR" value="baidu" />
              </el-select>
            </el-form-item>

            <el-form-item label="NLP分析模型">
              <el-select
                v-model="aiConfig.nlpModel"
                placeholder="请选择NLP模型"
              >
                <el-option label="BERT" value="bert" />
                <el-option label="LayoutLM" value="layoutlm" />
                <el-option label="ChatGLM" value="chatglm" />
              </el-select>
            </el-form-item>

            <el-form-item label="风险识别精度">
              <el-slider
                v-model="aiConfig.riskThreshold"
                :min="0.5"
                :max="1"
                :step="0.05"
                show-stops
              />
              <span class="threshold-value">{{ aiConfig.riskThreshold }}</span>
            </el-form-item>

            <el-form-item label="自动分析">
              <el-switch v-model="aiConfig.autoAnalysis" />
              <span class="switch-description">上传合同后自动进行智能分析</span>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveAIConfig"
                >保存配置</el-button
              >
              <el-button @click="resetAIConfig">重置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- 系统配置 -->
      <el-tab-pane label="系统配置" name="system">
        <div class="system-settings">
          <div class="section-header">
            <h3>系统参数配置</h3>
          </div>

          <el-form :model="systemConfig" label-width="150px">
            <el-form-item label="文件上传大小限制">
              <el-input-number
                v-model="systemConfig.maxFileSize"
                :min="1"
                :max="100"
              />
              <span class="unit">MB</span>
            </el-form-item>

            <el-form-item label="支持的文件格式">
              <el-checkbox-group v-model="systemConfig.supportedFormats">
                <el-checkbox label="pdf">PDF</el-checkbox>
                <el-checkbox label="doc">Word (.doc)</el-checkbox>
                <el-checkbox label="docx">Word (.docx)</el-checkbox>
                <el-checkbox label="jpg">JPG</el-checkbox>
                <el-checkbox label="png">PNG</el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <el-form-item label="数据保留期限">
              <el-input-number
                v-model="systemConfig.dataRetention"
                :min="1"
                :max="365"
              />
              <span class="unit">天</span>
            </el-form-item>

            <el-form-item label="自动备份">
              <el-switch v-model="systemConfig.autoBackup" />
              <span class="switch-description">每天自动备份系统数据</span>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveSystemConfig"
                >保存配置</el-button
              >
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加用户对话框 -->
    <el-dialog v-model="showAddUserDialog" title="添加用户" width="500px">
      <el-form :model="newUser" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="newUser.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="newUser.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="newUser.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="法务人员" value="legal" />
            <el-option label="业务人员" value="business" />
            <el-option label="财务人员" value="finance" />
          </el-select>
        </el-form-item>
        <el-form-item label="初始密码">
          <el-input
            v-model="newUser.password"
            type="password"
            placeholder="请输入初始密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddUserDialog = false">取消</el-button>
        <el-button type="primary" @click="addUser">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
// 图标已在main.ts中全局注册，无需单独导入
import { useSystemStore } from "@/stores/system";

// 初始化store
const systemStore = useSystemStore();

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface AIConfig {
  ocrModel: string;
  nlpModel: string;
  riskThreshold: number;
  autoAnalysis: boolean;
}

interface SystemConfig {
  maxFileSize: number;
  supportedFormats: string[];
  dataRetention: number;
  autoBackup: boolean;
}

const activeTab = ref("users");
const showAddUserDialog = ref(false);
const isLoading = ref(false);

// 使用reactive替代ref以便直接修改数据
const users = reactive<User[]>([]);
const roles = reactive<Role[]>([]);

const aiConfig = reactive<AIConfig>({
  ocrModel: "paddle",
  nlpModel: "bert",
  riskThreshold: 0.8,
  autoAnalysis: true,
});

const systemConfig = reactive<SystemConfig>({
  maxFileSize: 10,
  supportedFormats: ["pdf", "doc", "docx", "jpg", "png"],
  dataRetention: 365,
  autoBackup: true,
});

const newUser = reactive({
  username: "",
  email: "",
  role: "",
  password: "",
});

// 加载用户数据
const loadUsersData = async () => {
  try {
    isLoading.value = true;
    const data = await systemStore.loadUsers();
    users.splice(0, users.length, ...data);
  } catch (error) {
    console.error("加载用户数据失败:", error);
    ElMessage.error("加载用户数据失败");
  } finally {
    isLoading.value = false;
  }
};

// 加载角色数据
const loadRolesData = async () => {
  try {
    const data = await systemStore.loadRoles();
    roles.splice(0, roles.length, ...data);
  } catch (error) {
    console.error("加载角色数据失败:", error);
    ElMessage.error("加载角色数据失败");
  }
};

// 加载系统配置
const loadSystemConfig = async () => {
  try {
    await systemStore.loadSettings();
    // 更新本地配置状态
    aiConfig.ocrModel = systemStore.settings.ocrService || "paddle";
    aiConfig.nlpModel = systemStore.settings.aiModel || "bert";
    aiConfig.riskThreshold = (systemStore.settings as any).riskThreshold || 0.8;
    aiConfig.autoAnalysis = (systemStore.settings as any).autoAnalysis !== false;

    systemConfig.maxFileSize = systemStore.settings.fileSizeLimit || 10;
    systemConfig.supportedFormats = systemStore.settings.allowedFileTypes || [
      "pdf",
      "doc",
      "docx",
      "jpg",
      "png",
    ];
    systemConfig.dataRetention = (systemStore.settings as any).dataRetentionDays || 365;
    systemConfig.autoBackup = (systemStore.settings as any).autoBackup !== false;
  } catch (error) {
    console.error("加载系统配置失败:", error);
  }
};

// 组件挂载时加载数据
onMounted(() => {
  loadUsersData();
  loadRolesData();
  loadSystemConfig();
});

const getRoleTag = (role: string) => {
  const roleMap: { [key: string]: string } = {
    admin: "danger",
    legal: "warning",
    business: "success",
    finance: "primary",
  };
  return roleMap[role] || "info";
};

const getRoleText = (role: string) => {
  const roleMap: { [key: string]: string } = {
    admin: "管理员",
    legal: "法务人员",
    business: "业务人员",
    finance: "财务人员",
  };
  return roleMap[role] || role;
};

const updateUserStatus = async (user: User) => {
  try {
    await systemStore.updateUserStatus(user.id, user.status);
    ElMessage.success(`用户 ${user.username} 状态已更新`);
  } catch (error) {
    console.error("更新用户状态失败:", error);
    ElMessage.error("更新用户状态失败");
  }
};

const editUser = async (user: User) => {
  try {
    // 打开编辑用户对话框的逻辑
    ElMessage.info(`编辑用户: ${user.username}`);
    // 实际实现应打开编辑对话框并设置表单数据
  } catch (error) {
    console.error("编辑用户失败:", error);
  }
};

const resetPassword = async (user: User) => {
  try {
    await systemStore.resetPassword(user.email);
    ElMessage.success(`重置密码邮件已发送至 ${user.email}`);
  } catch (error) {
    console.error("重置用户密码失败:", error);
    ElMessage.error("重置密码失败");
  }
};

const deleteUser = async (user: User) => {
  try {
    ElMessageBox.confirm("确定要删除该用户吗？", "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    })
      .then(async () => {
        await systemStore.deleteUser(user.id);
        await loadUsersData();
        ElMessage.success(`用户 ${user.username} 已删除`);
      })
      .catch(() => {
        // 用户取消删除
      });
  } catch (error) {
    console.error("删除用户失败:", error);
    ElMessage.error("删除用户失败");
  }
};

const addUser = async () => {
  if (!newUser.username || !newUser.email || !newUser.role) {
    ElMessage.error("请填写完整信息");
    return;
  }

  try {
    await systemStore.addUser({
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      password: newUser.password,
    });

    await loadUsersData();
    ElMessage.success("用户添加成功");
    showAddUserDialog.value = false;
    resetNewUser();
  } catch (error) {
    console.error("添加用户失败:", error);
    ElMessage.error("添加用户失败");
  }
};

const resetNewUser = () => {
  Object.assign(newUser, {
    username: "",
    email: "",
    role: "",
    password: "",
  });
};

const editRole = async (role: Role) => {
  try {
    // 打开编辑角色权限对话框的逻辑
    ElMessage.info(`编辑角色权限: ${role.name}`);
    // 实际实现应打开编辑对话框并设置表单数据
  } catch (error) {
    console.error("编辑角色权限失败:", error);
  }
};

const testAIModel = async () => {
  try {
    isLoading.value = true;
    await systemStore.testAIModel();
    ElMessage.success("AI模型测试成功");
  } catch (error) {
    console.error("测试AI模型失败:", error);
    ElMessage.error("AI模型测试失败");
  } finally {
    isLoading.value = false;
  }
};

const saveAIConfig = async () => {
  try {
    await systemStore.saveAIConfig(aiConfig);
    ElMessage.success("AI配置保存成功");
  } catch (error) {
    console.error("保存AI配置失败:", error);
    ElMessage.error("保存AI配置失败");
  }
};

const resetAIConfig = () => {
  Object.assign(aiConfig, {
    ocrModel: "paddle",
    nlpModel: "bert",
    riskThreshold: 0.8,
    autoAnalysis: true,
  });
  ElMessage.info("AI配置已重置");
};

const saveSystemConfig = async () => {
  try {
    await systemStore.saveSystemConfig(systemConfig);
    ElMessage.success("系统配置保存成功");
  } catch (error) {
    console.error("保存系统配置失败:", error);
    ElMessage.error("保存系统配置失败");
  }
};
</script>

<style scoped>
.settings-container {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  min-height: calc(100vh - 100px);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.permission-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

.threshold-value {
  margin-left: 10px;
  color: #666;
}

.switch-description {
  margin-left: 10px;
  color: #666;
  font-size: 14px;
}

.unit {
  margin-left: 10px;
  color: #666;
}

.user-management,
.permission-settings,
.ai-model-settings,
.system-settings {
  padding: 0 10px;
}
</style>
