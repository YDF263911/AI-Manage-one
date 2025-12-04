import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase, type Template } from "../utils/supabase";
import { useAuthStore } from "./auth";
import { apiMethods } from "../utils/api";
import { handleError, catchAsyncError } from "../utils/errorHandler";

export const useTemplateStore = defineStore("template", () => {
  const authStore = useAuthStore();

  const templates = ref<Template[]>([]);
  const currentTemplate = ref<Template | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 上传模板文件到Supabase存储桶
  const uploadTemplateFile = catchAsyncError(
    async (file: File): Promise<string | null> => {
      if (!file) {
        handleError(new Error("请选择要上传的文件"));
        return null;
      }

      isLoading.value = true;
      error.value = null;

      try {
        // 生成唯一文件名
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const filePath = `templates/${fileName}`;

        // 上传文件到Supabase存储桶
        const { data, error: uploadError } = await supabase.storage
          .from("template_files")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // 获取文件的公共URL
        const { data: urlData } = await supabase.storage
          .from("template_files")
          .getPublicUrl(filePath);

        return urlData.publicUrl;
      } catch (err) {
        handleError(err, { customMessage: "文件上传失败" });
        error.value = "文件上传失败";
        return null;
      } finally {
        isLoading.value = false;
      }
    },
  );

  // 计算属性
  const totalTemplates = computed(() => templates.value.length);

  // 按分类筛选模板
  const templatesByCategory = (category: string) => {
    if (category === "all") {
      return templates.value;
    }
    return templates.value.filter((t) => t.category === category);
  };

  // 加载模板列表
  const loadTemplates = catchAsyncError(
    async (params?: {
      category?: string;
      keyword?: string;
      status?: string;
      sortBy?: string;
      page?: number;
      pageSize?: number;
    }) => {
      isLoading.value = true;
      error.value = null;

      try {
        // 优先使用API
        try {
          const response = await apiMethods.getList("/templates", {
            ...params,
            pageSize: params?.pageSize || 100,
          });
          templates.value = response.data || [];
          return;
        } catch (apiError) {
          console.log("使用API失败，尝试使用Supabase直接访问");
          // 如果API失败，回退到Supabase直接访问
        }

        // 提取参数，设置默认值
        const {
          category = "all",
          keyword = "",
          sortBy = "created_at",
          page = 1,
          pageSize = 100, // 默认加载全部，前端可以做客户端分页
        } = params || {};

        let query = supabase.from("templates").select("*", { count: "exact" });

        // 添加筛选条件
        if (category && category !== "all") {
          query = query.eq("category", category);
        }

        // 添加搜索条件
        if (keyword.trim()) {
          query = query.or(
            `name.ilike.%${keyword}%,description.ilike.%${keyword}%`,
          );
        }

        // 排序
        query = query.order(sortBy, { ascending: false });

        // 分页
        if (pageSize > 0) {
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;
          query = query.range(from, to);
        }

        const { data, error: sbError } = await query;

        if (sbError) {
          throw new Error(sbError.message);
        }

        templates.value = data || [];
      } catch (err) {
        handleError(err, { customMessage: "加载模板失败" });
        error.value = "加载模板失败";
      } finally {
        isLoading.value = false;
      }
    },
  );

  // 获取单个模板
  const getTemplate = catchAsyncError(async (templateId: string) => {
    if (!templateId) {
      handleError(new Error("模板ID不能为空"));
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // 优先使用API
      try {
        const response = await apiMethods.getDetail("/templates", templateId);
        currentTemplate.value = response.data;
        return response.data;
      } catch (apiError) {
        console.log("使用API失败，尝试使用Supabase直接访问");
        // 如果API失败，回退到Supabase直接访问
      }

      const { data, error: sbError } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (sbError) {
        throw new Error(sbError.message);
      }

      currentTemplate.value = data;
      return data;
    } catch (err) {
        handleError(err, { customMessage: "获取模板详情失败" });
        error.value = "获取模板详情失败";
      throw err;
    } finally {
      isLoading.value = false;
    }
  });

  // 创建模板
  const createTemplate = catchAsyncError(
    async (
      templateData: Omit<
        Template,
        "id" | "usage_count" | "created_at" | "updated_at"
      >,
    ) => {
      if (!templateData || !templateData.name) {
        handleError(new Error("模板名称不能为空"));
        return null;
      }

      isLoading.value = true;
      error.value = null;

      try {
        // 优先使用API
        try {
          const response = await apiMethods.create("/templates", {
            ...templateData,
            created_by: authStore.user?.id,
            usage_count: 0,
          });
          const newTemplate = response.data;
          templates.value.unshift(newTemplate);
          currentTemplate.value = newTemplate;
          return newTemplate;
        } catch (apiError) {
          console.log("使用API失败，尝试使用Supabase直接访问");
          // 如果API失败，回退到Supabase直接访问
        }

        const { data, error: sbError } = await supabase
          .from("templates")
          .insert({
            ...templateData,
            created_by: authStore.user?.id,
            usage_count: 0,
            // file_url已包含在templateData中
          })
          .select("*")
          .single();

        if (sbError) {
          throw new Error(sbError.message);
        }

        templates.value.unshift(data);
        currentTemplate.value = data;
        return data;
      } catch (err) {
        handleError(err, { customMessage: "创建模板失败" });
        error.value = "创建模板失败";
        throw err;
      } finally {
        isLoading.value = false;
      }
    },
  );

  // 更新模板
  const updateTemplate = catchAsyncError(
    async (templateId: string, templateData: Partial<Template>) => {
      if (!templateId) {
        handleError(new Error("模板ID不能为空"));
        return null;
      }

      isLoading.value = true;
      error.value = null;

      try {
        // 优先使用API
        try {
          const response = await apiMethods.update(
            "/templates",
            templateId,
            templateData,
          );
          const updatedTemplate = response.data;

          // 更新本地状态
          const index = templates.value.findIndex((t) => t.id === templateId);
          if (index !== -1) {
            templates.value[index] = updatedTemplate;
          }

          if (currentTemplate.value?.id === templateId) {
            currentTemplate.value = updatedTemplate;
          }

          return updatedTemplate;
        } catch (apiError) {
          console.log("使用API失败，尝试使用Supabase直接访问");
          // 如果API失败，回退到Supabase直接访问
        }

        const { data, error: sbError } = await supabase
          .from("templates")
          .update(templateData)
          .eq("id", templateId)
          .select("*")
          .single();

        if (sbError) {
          throw new Error(sbError.message);
        }

        // 更新本地状态
        const index = templates.value.findIndex((t) => t.id === templateId);
        if (index !== -1) {
          templates.value[index] = data;
        }

        if (currentTemplate.value?.id === templateId) {
          currentTemplate.value = data;
        }

        return data;
      } catch (err) {
        handleError(err, { customMessage: "更新模板失败" });
        error.value = "更新模板失败";
        throw err;
      } finally {
        isLoading.value = false;
      }
    },
  );

  // 删除模板
  const deleteTemplate = catchAsyncError(async (templateId: string) => {
    if (!templateId) {
      handleError(new Error("模板ID不能为空"));
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // 优先使用API
      try {
        await apiMethods.delete("/templates", templateId);

        // 更新本地状态
        templates.value = templates.value.filter((t) => t.id !== templateId);
        if (currentTemplate.value?.id === templateId) {
          currentTemplate.value = null;
        }
        return;
      } catch (apiError) {
        console.log("使用API失败，尝试使用Supabase直接访问");
        // 如果API失败，回退到Supabase直接访问
      }

      const { error: sbError } = await supabase
        .from("templates")
        .delete()
        .eq("id", templateId);

      if (sbError) {
        throw new Error(sbError.message);
      }

      // 更新本地状态
      templates.value = templates.value.filter((t) => t.id !== templateId);
      if (currentTemplate.value?.id === templateId) {
        currentTemplate.value = null;
      }
    } catch (err) {
        handleError(err, { customMessage: "删除模板失败" });
        error.value = "删除模板失败";
      throw err;
    } finally {
      isLoading.value = false;
    }
  });

  // 增加模板使用次数
  const incrementUsageCount = catchAsyncError(async (templateId: string) => {
    if (!templateId) return;

    try {
      // 优先使用API
      try {
        await apiMethods.create(`/templates/${templateId}/increment`, {});

        // 更新本地状态
        const index = templates.value.findIndex((t) => t.id === templateId);
        if (index !== -1) {
          templates.value[index].usage_count += 1;
        }
        return;
      } catch (apiError) {
        // 如果API失败，继续使用Supabase直接访问
      }

      // 先获取当前使用次数
      const { data } = await supabase
          .from("templates")
          .select("usage_count")
          .eq("id", templateId)
          .single();
      
      // 然后更新使用次数
      await supabase
          .from("templates")
          .update({ usage_count: (data?.usage_count || 0) + 1 })
          .eq("id", templateId);

      // 更新本地状态
      const index = templates.value.findIndex((t) => t.id === templateId);
      if (index !== -1) {
        templates.value[index].usage_count += 1;
      }
    } catch (err) {
      console.error("更新使用次数失败:", err);
      // 这里不显示错误提示，因为这是非关键操作
    }
  });

  // 重置当前模板
  const resetCurrentTemplate = () => {
    currentTemplate.value = null;
  };

  // 清空错误
  const clearError = () => {
    error.value = null;
  };

  // 重置store状态
  const reset = () => {
    templates.value = [];
    currentTemplate.value = null;
    error.value = null;
    isLoading.value = false;
  };

  return {
    // 状态
    templates,
    currentTemplate,
    isLoading,
    error,

    // 计算属性
    totalTemplates,
    templatesByCategory,

    // 方法
    loadTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsageCount,
    resetCurrentTemplate,
    clearError,
  };
});
