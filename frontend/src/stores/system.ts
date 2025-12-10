import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "@/utils/supabase";
import { apiMethods } from "@/utils/api";
import { ElMessage } from "element-plus";
import { handleError, catchAsyncError } from "@/utils/errorHandler";
import type { SystemSettings, NotificationSettings } from "@/types";

export const useSystemStore = defineStore("system", () => {
  // 状态
  const settings = ref<SystemSettings>({
    aiModel: "layoutlm",
    ocrService: "paddle",
    eSignService: "docusign",
    fileSizeLimit: 10,
    allowedFileTypes: ["pdf", "doc", "docx", "jpg", "png"],
    notificationSettings: {
      email: true,
      sms: false,
      push: true,
      reminderDays: 3,
    },
  });
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 配置项映射
  const configKeys = {
    aiModel: "ai_model_settings",
    fileSizeLimit: "file_upload_settings",
    notificationSettings: "notification_settings",
    systemGeneral: "system_general_settings",
  };

  // 获取器
  const aiConfig = computed(() => ({
    ocrModel: settings.value.ocrService,
    nlpModel: settings.value.aiModel,
    riskThreshold: 0.8,
    autoAnalysis: true,
  }));

  const systemConfig = computed(() => ({
    maxFileSize: settings.value.fileSizeLimit,
    supportedFormats: settings.value.allowedFileTypes,
    dataRetention: 365,
    autoBackup: true,
  }));

  // 从Supabase加载系统配置
  const loadSettings = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      const { data, error: fetchError } = await supabase
        .from("system_config")
        .select("config_key, config_value");

      if (fetchError) {
        throw fetchError;
      }

      // 解析配置数据（config_value 已经是 JSONB 对象）
      if (data && data.length > 0) {
        data.forEach((item: any) => {
          try {
            const configData = item.config_value;

            // 根据配置键更新不同的设置部分
            switch (item.config_key) {
              case configKeys.aiModel:
                settings.value.aiModel = configData.default_model || "layoutlm";
                settings.value.ocrService = configData.ocr_model || "paddle";
                break;
              case configKeys.fileSizeLimit:
                settings.value.fileSizeLimit = configData.max_size || (configData.max_file_size ? configData.max_file_size / 1024 / 1024 : 10); // 转换为MB
                settings.value.allowedFileTypes = configData.allowed_types || [
                  "pdf",
                  "doc",
                  "docx",
                  "jpg",
                  "png",
                ];
                break;
              case configKeys.notificationSettings:
                settings.value.notificationSettings = configData;
                break;
              case configKeys.systemGeneral:
                // 处理通用系统设置
                break;
            }
          } catch (parseError) {
            console.warn(`处理配置 ${item.config_key} 失败:`, parseError);
          }
        });
      }
    } catch (err: any) {
      error.value = `加载系统配置失败: ${err.message}`;
      console.error("加载系统配置失败:", err);
      // 使用默认值
    } finally {
      isLoading.value = false;
    }
  };

  // 保存AI配置
  const saveAIConfig = async (aiConfig: any) => {
    isLoading.value = true;
    error.value = null;

    try {
      const configData = {
        default_model: aiConfig.nlpModel || "layoutlm",
        ocr_model: aiConfig.ocrModel || "paddle",
        confidence_threshold: aiConfig.riskThreshold || 0.8,
        auto_analysis:
          aiConfig.autoAnalysis !== undefined ? aiConfig.autoAnalysis : true,
      };

      // 尝试通过API保存配置
      try {
        await apiMethods.create("/system/settings/ai", {
          aiConfig: configData,
        });
      } catch (apiError) {
        console.warn("API调用失败，回退到直接Supabase操作:", apiError);
        // 回退到直接Supabase操作
        const { error: updateError } = await supabase
          .from("system_config")
          .upsert([
            {
              config_key: configKeys.aiModel,
              config_value: JSON.stringify(configData),
              config_description: "AI模型配置",
              config_type: "ai",
            },
          ]);

        if (updateError) {
          throw updateError;
        }
      }

      // 更新本地状态
      settings.value.aiModel = configData.default_model;
      settings.value.ocrService = configData.ocr_model;

      ElMessage.success("AI配置保存成功");
      return true;
    } catch (err) {
      handleError(err, {
        customMessage: "保存AI配置失败",
        logError: true,
      });
      error.value = "保存AI配置失败";
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // 保存系统配置
  const saveSystemConfig = async (systemConfig: any) => {
    try {
      isLoading.value = true;
      error.value = null;

      // 更新文件上传设置
      const fileUploadData = {
        max_size: systemConfig.maxFileSize || 10,
        allowed_types: systemConfig.supportedFormats || [
          "pdf",
          "doc",
          "docx",
          "jpg",
          "png",
        ],
      };

      // 更新系统通用设置
      const systemGeneralData = {
        data_retention_days: systemConfig.dataRetention || 365,
        auto_backup:
          systemConfig.autoBackup !== undefined
            ? systemConfig.autoBackup
            : true,
      };

      // 批量更新配置
      await supabase.from("system_config").upsert([
        {
          config_key: configKeys.fileSizeLimit,
          config_value: JSON.stringify(fileUploadData),
          config_description: "文件上传设置",
          config_type: "file",
        },
        {
          config_key: configKeys.systemGeneral,
          config_value: JSON.stringify(systemGeneralData),
          config_description: "系统通用设置",
          config_type: "system",
        },
      ]);

      // 更新本地状态
      settings.value.fileSizeLimit = fileUploadData.max_size;
      settings.value.allowedFileTypes = fileUploadData.allowed_types;

      ElMessage.success("系统配置保存成功");
      return true;
    } catch (err: any) {
      error.value = `保存系统配置失败: ${err.message}`;
      ElMessage.error(error.value);
      console.error("保存系统配置失败:", err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // 加载用户管理数据
  const loadUsers = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      const { data, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*");

      if (fetchError) {
        throw fetchError;
      }

      return data || [];
    } catch (err: any) {
      error.value = `加载用户数据失败: ${err.message}`;
      console.error("加载用户数据失败:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  // 加载角色数据
  const loadRoles = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      const { data, error: fetchError } = await supabase
        .from("roles")
        .select("*");

      if (fetchError) {
        // 如果角色表不存在或查询失败，返回默认角色
        return [
          {
            id: "1",
            name: "admin",
            description: "系统管理员，拥有所有权限",
            permissions: [
              "用户管理",
              "权限设置",
              "系统配置",
              "合同管理",
              "模板管理",
            ],
          },
          {
            id: "2",
            name: "editor",
            description: "编辑人员，可编辑合同和模板",
            permissions: ["合同管理", "模板管理"],
          },
          {
            id: "3",
            name: "user",
            description: "普通用户，只能查看",
            permissions: ["查看合同", "查看模板"],
          },
        ];
      }

      return data || [];
    } catch (err: any) {
      error.value = `加载角色数据失败: ${err.message}`;
      console.error("加载角色数据失败:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  // 测试AI模型
  const testAIModel = async (modelType?: "ocr" | "nlp") => {
    isLoading.value = true;
    error.value = null;

    try {
      // 尝试通过API测试模型
      try {
        const result = await apiMethods.create("/ai/test", {
          modelType: modelType || "nlp",
          modelName: settings.value.aiModel || "layoutlm",
        });

        ElMessage.success("AI模型测试成功");
        return result;
      } catch (apiError) {
        console.warn("API调用失败，回退到Supabase RPC:", apiError);
        // 回退到Supabase RPC
        const { data, error: testError } = await supabase.rpc("test_ai_model", {
          model_name: settings.value.aiModel || "layoutlm",
        });

        if (testError) {
          throw testError;
        }

        ElMessage.success("AI模型测试成功");
        return data;
      }
    } catch (err) {
      handleError(err, {
        customMessage: "测试AI模型失败",
        logError: true,
      });
      error.value = "测试AI模型失败";
      throw err; // 重新抛出以便上层组件处理
    } finally {
      isLoading.value = false;
    }
  };

  // 添加用户
  const addUser = async (userData: any) => {
    isLoading.value = true;
    error.value = null;

    try {
      // 验证必要参数
      if (!userData.email || !userData.username) {
        throw new Error("邮箱和用户名是必填项");
      }

      // 尝试通过API添加用户
      try {
        await apiMethods.create("/system/users", userData);
      } catch (apiError) {
        console.warn("API调用失败，回退到直接Supabase操作:", apiError);
        // 回退到直接Supabase操作
        // 先创建Auth用户
        const { data, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password || "123456", // 设置默认密码
        });

        if (authError || !data.user) {
          throw authError || new Error("创建用户失败");
        }

        // 然后创建用户档案
        const { error: profileError } = await supabase
          .from("user_profiles")
          .insert([
            {
              id: data.user.id,
              username: userData.username,
              email: userData.email,
              role: userData.role || "user",
              department: userData.department || "未设置",
              status: "active",
            },
          ]);

        if (profileError) {
          throw profileError;
        }
      }

      ElMessage.success("用户添加成功");
      return true;
    } catch (err) {
      handleError(err, {
        customMessage: "添加用户失败",
        logError: true,
      });
      error.value = "添加用户失败";
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // 更新用户状态
  const updateUserStatus = async (userId: string, status: string) => {
    try {
      isLoading.value = true;
      error.value = null;

      // 检查当前用户权限
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error("用户未登录");
      }

      // 检查当前用户是否为管理员（开发阶段放宽权限）
      const { data: currentProfile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", currentUser.user.id)
        .single();

      // 开发阶段：允许所有用户修改自己的状态，管理员可以修改所有用户
      const canModify = currentProfile && 
        (currentProfile.role === 'admin' || currentUser.user.id === userId);
      
      if (!canModify) {
        throw new Error("权限不足：只能修改自己的状态或需要管理员权限");
      }

      // 验证用户ID格式（UUID）
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        // 如果是数字ID，尝试查找对应的UUID
        const { data: userData } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("username", userId)
          .single();
        
        if (!userData) {
          throw new Error(`未找到用户ID: ${userId}`);
        }
        
        userId = userData.id;
      }

      // 更新用户状态
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (updateError) {
        // 处理RLS权限错误
        if (updateError.code === '42501') {
          throw new Error("权限不足：只有管理员才能修改其他用户状态");
        }
        throw updateError;
      }

      ElMessage.success("用户状态更新成功");
      return true;
    } catch (err: any) {
      const errorMessage = err.message || "更新用户状态失败";
      error.value = errorMessage;
      ElMessage.error(errorMessage);
      console.error("更新用户状态失败:", err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // 删除用户
  const deleteUser = async (userId: string) => {
    try {
      isLoading.value = true;
      error.value = null;

      // 先删除用户档案
      const { error: profileError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", userId);

      if (profileError) {
        throw profileError;
      }

      // 然后删除Auth用户
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        throw authError;
      }

      ElMessage.success("用户删除成功");
      return true;
    } catch (err: any) {
      error.value = `删除用户失败: ${err.message}`;
      ElMessage.error(error.value);
      console.error("删除用户失败:", err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // 密码强度验证
  const validatePasswordStrength = (password: string): string | null => {
    if (!password || password.length < 8) {
      return "密码长度至少需要8位字符";
    }
    if (!/[A-Z]/.test(password)) {
      return "密码必须包含至少一个大写字母";
    }
    if (!/[a-z]/.test(password)) {
      return "密码必须包含至少一个小写字母";
    }
    if (!/[0-9]/.test(password)) {
      return "密码必须包含至少一个数字";
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return "密码必须包含至少一个特殊字符";
    }
    return null;
  };

  // 记录密码重置审计日志
  const logPasswordReset = async (targetUserId: string) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      await supabase.from('audit_logs').insert({
        action: 'password_reset',
        operator_id: currentUser.user.id,
        target_user_id: targetUserId,
        timestamp: new Date().toISOString(),
        details: '密码被管理员重置'
      });
    } catch (error) {
      console.warn("记录审计日志失败:", error);
    }
  };

  // 检查用户重置密码权限
  const checkResetPermission = async (targetUserId: string): Promise<boolean> => {
    try {
      // 获取当前用户信息
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error("用户未登录");
      }

      // 如果是重置自己的密码，直接允许
      if (targetUserId === currentUser.user.id) {
        return true;
      }

      // 检查当前用户是否为管理员
      const { data: currentProfile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", currentUser.user.id)
        .single();

      // 管理员可以重置非管理员用户的密码
      if (currentProfile && currentProfile.role === 'admin') {
        // 检查目标用户是否为管理员（管理员不能重置其他管理员的密码）
        const { data: targetProfile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", targetUserId)
          .single();

        return !targetProfile || targetProfile.role !== 'admin';
      }

      return false;
    } catch (error) {
      console.error("检查重置权限失败:", error);
      return false;
    }
  };

  // 直接重置密码（支持分级权限）
  const resetPasswordDirect = async (userId: string, newPassword: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      // 验证新密码强度
      const passwordError = validatePasswordStrength(newPassword);
      if (passwordError) {
        throw new Error(passwordError);
      }

      // 检查重置权限
      const hasPermission = await checkResetPermission(userId);
      if (!hasPermission) {
        throw new Error("权限不足：无法重置该用户的密码");
      }

      // 验证用户ID格式（UUID）
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        // 如果是数字ID，尝试查找对应的UUID
        const { data: userData } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("username", userId)
          .single();
        
        if (!userData) {
          throw new Error(`未找到用户ID: ${userId}`);
        }
        
        userId = userData.id;
      }

      // 使用Supabase Admin API直接重置密码
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        throw updateError;
      }

      // 记录审计日志
      await logPasswordReset(userId);

      ElMessage.success("密码已成功重置");
      return true;
    } catch (err: any) {
      const errorMessage = err.message || "重置密码失败";
      error.value = errorMessage;
      ElMessage.error(errorMessage);
      console.error("重置密码失败:", err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    settings,
    isLoading,
    error,
    aiConfig,
    systemConfig,
    loadSettings,
    saveAIConfig,
    saveSystemConfig,
    loadUsers,
    loadRoles,
    testAIModel,
    addUser,
    updateUserStatus,
    deleteUser,
    resetPasswordDirect,
  };
});
