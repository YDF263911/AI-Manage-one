<template>
  <div class="settings-container">
    <div class="settings-header">
      <h1>系统设置</h1>
      <p class="settings-description">管理系统用户、权限、AI模型和基础配置</p>
    </div>

    <el-tabs v-model="activeTab" type="card" class="settings-tabs">
      <!-- 用户管理 -->
      <el-tab-pane label="用户管理" name="users">
        <div class="user-management">
          <div class="section-header">
            <h3>用户列表</h3>
            <div class="action-buttons">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索用户名或邮箱"
                style="width: 200px; margin-right: 10px;"
                clearable
                @input="handleSearch"
                title="用户搜索框"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button type="primary" @click="showAddUserDialog = true" title="添加新用户">
                <el-icon><UserFilled /></el-icon>
                添加用户
              </el-button>
            </div>
          </div>

          <div class="filter-bar">
            <el-select v-model="filterRole" placeholder="全部角色" @change="handleFilter" title="按角色筛选">
              <el-option label="全部角色" value="" />
              <el-option label="管理员" value="admin" />
              <el-option label="法务人员" value="legal" />
              <el-option label="业务人员" value="business" />
              <el-option label="财务人员" value="finance" />
            </el-select>
            
            <el-select v-model="filterStatus" placeholder="全部状态" @change="handleFilter" title="按状态筛选">
              <el-option label="全部状态" value="" />
              <el-option label="活跃" value="active" />
              <el-option label="禁用" value="inactive" />
            </el-select>
          </div>

          <el-table :data="filteredUsers" style="width: 100%" v-loading="isLoading">
            <el-table-column prop="username" label="用户名" width="150" sortable />
            <el-table-column prop="email" label="邮箱" width="200" sortable />
            <el-table-column prop="role" label="角色" width="120" sortable>
              <template #default="{ row }">
                <el-tag :type="getRoleTag(row.role)">{{
                  getRoleText(row.role)
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" sortable>
              <template #default="{ row }">
                <el-switch
                  v-model="row.status"
                  active-value="active"
                  inactive-value="inactive"
                  @change="updateUserStatus(row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="lastLogin" label="最后登录" width="180" sortable />
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button size="small" @click="editUser(row)" title="编辑用户信息">编辑</el-button>
                <el-button
                  size="small"
                  type="warning"
                  @click="openResetPasswordDialog(row)"
                  :disabled="!canResetPassword(row)"
                  :title="!canResetPassword(row) ? '无权限重置此用户密码' : '重置用户密码'"
                  >重置密码</el-button
                >
                <el-button 
                  size="small" 
                  type="danger" 
                  @click="deleteUser(row)"
                  :disabled="row.role === 'admin'"
                  :title="row.role === 'admin' ? '管理员账户无法删除' : '删除用户账户'"
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

        <el-table :data="roles" style="width: 100%" v-loading="isLoading">
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
            <el-button @click="resetSystemConfig">重置默认</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-tab-pane>
    </el-tabs>

    <!-- 添加用户对话框 -->
    <el-dialog v-model="showAddUserDialog" title="添加用户" width="500px">
      <el-form :model="newUser" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="newUser.username" placeholder="请输入用户名" title="用户名输入框" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="newUser.email" placeholder="请输入邮箱" title="邮箱地址输入框" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="newUser.role" placeholder="请选择角色" title="用户角色选择">
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
            title="用户初始密码输入框"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddUserDialog = false" title="取消添加用户">取消</el-button>
        <el-button type="primary" @click="addUser" title="确认添加用户">添加</el-button>
      </template>
    </el-dialog>

    <!-- 编辑用户对话框 -->
    <el-dialog v-model="showEditUserDialog" title="编辑用户" width="500px">
      <el-form :model="editingUser" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="editingUser.username" placeholder="请输入用户名" title="用户名输入框" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editingUser.email" placeholder="请输入邮箱" title="邮箱地址输入框" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editingUser.role" placeholder="请选择角色" title="用户角色选择">
            <el-option label="管理员" value="admin" />
            <el-option label="法务人员" value="legal" />
            <el-option label="业务人员" value="business" />
            <el-option label="财务人员" value="finance" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="editingUser.status"
            active-value="active"
            inactive-value="inactive"
            :title="editingUser.status === 'active' ? '禁用用户' : '启用用户'"
          />
          <span class="switch-description">{{ editingUser.status === 'active' ? '活跃' : '禁用' }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditUserDialog = false" title="取消编辑用户">取消</el-button>
        <el-button type="primary" @click="saveUserEdit" title="保存用户信息">保存</el-button>
      </template>
    </el-dialog>

    <!-- 直接重置密码对话框 -->
    <el-dialog v-model="showResetPasswordDialog" title="直接重置密码" width="500px">
      <el-form :model="resetPasswordUser" label-width="120px">
        <el-form-item label="用户名">
          <el-input v-model="resetPasswordUser.username" disabled title="用户名（只读）" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="resetPasswordUser.email" disabled title="邮箱地址（只读）" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="resetPasswordUser.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
            title="新密码输入框"
          />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input
            v-model="confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            title="确认密码输入框"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showResetPasswordDialog = false" title="取消密码重置">取消</el-button>
        <el-button type="primary" @click="resetPasswordDirect" title="确认重置密码">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { UserFilled, Cpu, Search, Edit } from "@element-plus/icons-vue";
import { useSystemStore } from "@/stores/system";

// 初始化store
const systemStore = useSystemStore();
const route = useRoute();

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
const showEditUserDialog = ref(false);
const showResetPasswordDialog = ref(false);
const isLoading = ref(false);
const searchKeyword = ref("");
const filterRole = ref("");
const filterStatus = ref("");

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
  supportedFormats: ["pdf", "docx", "jpg", "png"],
  dataRetention: 365,
  autoBackup: true,
});

const newUser = reactive({
  username: "",
  email: "",
  role: "",
  password: "",
});

const editingUser = reactive({
  id: "",
  username: "",
  email: "",
  role: "",
  status: "active"
});

const resetPasswordUser = reactive({
  id: "",
  username: "",
  email: "",
  newPassword: ""
});

const confirmPassword = ref("");

// 权限检查：当前用户可以重置自己的密码，管理员可以重置所有非管理员密码
const canResetPassword = (targetUser: User) => {
  // 管理员账户不能被重置
  if (targetUser.role === 'admin') return false;
  
  // 这里需要获取当前登录用户信息进行精确权限判断
  // 暂时允许所有非管理员用户的重置操作
  return true;
};

  // 加载用户数据
  const loadUsersData = async () => {
    try {
      isLoading.value = true;
      const data = await systemStore.loadUsers();
      
      // 确保用户数据格式正确
      const formattedUsers = data.map(user => ({
        id: user.id || "",
        username: user.username || "",
        email: user.email || "",
        role: user.role || "user",
        status: user.status || "active",
        lastLogin: user.last_login || user.created_at || ""
      }));
      
      users.splice(0, users.length, ...formattedUsers);
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

// 计算属性：过滤用户列表
const filteredUsers = computed(() => {
  return users.filter(user => {
    const matchesKeyword = !searchKeyword.value || 
      user.username.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
      user.email.toLowerCase().includes(searchKeyword.value.toLowerCase());
    const matchesRole = !filterRole.value || user.role === filterRole.value;
    const matchesStatus = !filterStatus.value || user.status === filterStatus.value;
    
    return matchesKeyword && matchesRole && matchesStatus;
  });
});

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已在计算属性中实现
};

// 筛选处理
const handleFilter = () => {
  // 筛选逻辑已在计算属性中实现
};

// 组件挂载时加载数据
onMounted(() => {
  // 检查路由参数，如果有 tab 参数则切换到对应标签页
  if (route.query.tab) {
    activeTab.value = route.query.tab as string;
  }
  
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
    // 设置编辑用户数据
    Object.assign(editingUser, {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
    });
    
    showEditUserDialog.value = true;
  } catch (error) {
    console.error("编辑用户失败:", error);
    ElMessage.error("打开编辑对话框失败");
  }
};

const saveUserEdit = async () => {
  if (!editingUser.username || !editingUser.email || !editingUser.role) {
    ElMessage.error("请填写完整信息");
    return;
  }

  try {
    // 这里需要调用后端的用户更新接口
    // await systemStore.updateUser(editingUser);
    
    // 临时更新本地数据
    const userIndex = users.findIndex(u => u.id === editingUser.id);
    if (userIndex !== -1) {
      Object.assign(users[userIndex], {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        status: editingUser.status
      });
    }
    
    ElMessage.success("用户信息更新成功");
    showEditUserDialog.value = false;
  } catch (error) {
    console.error("更新用户失败:", error);
    ElMessage.error("更新用户失败");
  }
};

// 移除邮箱验证的重置功能，统一使用直接重置方式

const openResetPasswordDialog = (user: User) => {
  Object.assign(resetPasswordUser, {
    id: user.id,
    username: user.username,
    email: user.email,
    newPassword: ""
  });
  confirmPassword.value = "";
  showResetPasswordDialog.value = true;
};

const resetPasswordDirect = async () => {
  if (!resetPasswordUser.newPassword) {
    ElMessage.error("请输入新密码");
    return;
  }

  if (resetPasswordUser.newPassword.length < 6) {
    ElMessage.error("密码长度至少需要6位字符");
    return;
  }

  if (resetPasswordUser.newPassword !== confirmPassword.value) {
    ElMessage.error("两次输入的密码不一致");
    return;
  }

  try {
    await systemStore.resetPasswordDirect(resetPasswordUser.id, resetPasswordUser.newPassword);
    showResetPasswordDialog.value = false;
    ElMessage.success(`用户 ${resetPasswordUser.username} 的密码已重置`);
  } catch (error) {
    console.error("直接重置密码失败:", error);
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

const resetSystemConfig = () => {
  Object.assign(systemConfig, {
    maxFileSize: 10,
    supportedFormats: ["pdf", "docx", "jpg", "png"],
    dataRetention: 365,
    autoBackup: true,
  });
  ElMessage.info("系统配置已重置为默认值");
};

const clearCache = async () => {
  try {
    // 缓存清理功能待实现
    ElMessage.success("缓存清理功能待实现");
  } catch (error) {
    console.error("清理缓存失败:", error);
    ElMessage.error("清理缓存失败");
  }
};

const backupData = async () => {
  try {
    // 数据备份功能待实现
    ElMessage.success("数据备份功能待实现");
  } catch (error) {
    console.error("数据备份失败:", error);
    ElMessage.error("数据备份失败");
  }
};

const exportLogs = async () => {
  try {
    // 日志导出功能待实现
    ElMessage.success("日志导出功能待实现");
  } catch (error) {
    console.error("日志导出失败:", error);
    ElMessage.error("日志导出失败");
  }
};
</script>

<style scoped>
.settings-container {
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  min-height: calc(100vh - 100px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.settings-header {
  margin-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px;
}

.settings-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.settings-description {
  color: #6b7280;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.settings-tabs {
  margin-top: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 0;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-bar {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 6px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-bar .el-select {
  width: 140px;
}

.permission-tag {
  margin-right: 6px;
  margin-bottom: 4px;
}

.threshold-value {
  margin-left: 12px;
  color: #6b7280;
  font-weight: 500;
}

.switch-description {
  margin-left: 12px;
  color: #6b7280;
  font-size: 14px;
}

.unit {
  margin-left: 12px;
  color: #6b7280;
  font-size: 14px;
}

.user-management,
.permission-settings,
.ai-model-settings,
.system-settings {
  padding: 0 4px;
}

.user-management .el-table {
  margin-top: 16px;
}

.user-management .el-button + .el-button {
  margin-left: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-container {
    padding: 16px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .action-buttons {
    width: 100%;
    justify-content: space-between;
  }
  
  .filter-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filter-bar .el-select {
    width: 100%;
  }
}
</style>
