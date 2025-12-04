import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  supabase,
  type Contract,
  type ContractAnalysis,
} from "../utils/supabase";
import { useAuthStore } from "./auth";
import { apiMethods } from "../utils/api";
import { handleError, catchAsyncError } from "../utils/errorHandler";

export const useContractStore = defineStore("contract", () => {
  const authStore = useAuthStore();

  const contracts = ref<Contract[]>([]);
  const currentContract = ref<Contract | null>(null);
  const contractAnalyses = ref<ContractAnalysis[]>([]);
  const isLoading = ref(false);

  // 计算属性
  const totalContracts = computed(() => contracts.value.length);
  const pendingContracts = computed(() =>
    contracts.value.filter(
      (c) => c.status === "uploaded" || c.status === "processing",
    ),
  );
  const analyzedContracts = computed(() =>
    contracts.value.filter(
      (c) => c.status === "analyzed" || c.status === "reviewed",
    ),
  );
  const completedContracts = computed(() =>
    contracts.value.filter(
      (c) => c.status === "approved" || c.status === "rejected",
    ),
  );

  // 加载用户的所有合同
  const loadContracts = catchAsyncError(
    async () => {
      if (!authStore.isAuthenticated) return;

      isLoading.value = true;
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("user_id", authStore.user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      contracts.value = data || [];
    },
    (error) => {
      handleError(error, { customMessage: "加载合同失败" });
      contracts.value = [];
    },
    () => {
      isLoading.value = false;
    },
  );

  // 上传合同
  const uploadContract = catchAsyncError(
    async (file: File, category: Contract["category"]) => {
      if (!authStore.isAuthenticated) {
        throw new Error("用户未登录");
      }

      isLoading.value = true;

      // 参数验证
      if (!file || !category) {
        throw new Error("文件和合同类别不能为空");
      }

      // 上传文件到存储
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `contracts/${authStore.user!.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 创建合同记录
      const { data, error } = await supabase
        .from("contracts")
        .insert([
          {
            user_id: authStore.user!.id,
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            category,
            status: "uploaded",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      contracts.value.unshift(data);
      return { success: true, contract: data };
    },
    (error: any) => {
      handleError(error, { customMessage: "上传合同失败" });
      return { success: false, error: error.message };
    },
    () => {
      isLoading.value = false;
    },
  );

  // 获取合同详情
  const getContract = catchAsyncError(
    async (contractId: string) => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contractId)
        .single();

      if (error) throw error;

      currentContract.value = data;
      await loadContractAnalyses(contractId);

      return data;
    },
    (error) => {
      handleError(error, { customMessage: "获取合同详情失败" });
      currentContract.value = null;
      throw error;
    },
  );

  // 加载合同分析结果
  const loadContractAnalyses = catchAsyncError(
    async (contractId: string) => {
      const { data, error } = await supabase
        .from("contract_analysis")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      contractAnalyses.value = data || [];
    },
    (error) => {
      handleError(error, { customMessage: "加载分析结果失败", showMessage: false });
      contractAnalyses.value = [];
    },
  );

  // 更新合同状态
  const updateContractStatus = catchAsyncError(
    async (contractId: string, status: Contract["status"]) => {
      const { data, error } = await supabase
        .from("contracts")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", contractId)
        .select()
        .single();

      if (error) throw error;

      // 更新本地状态
      const index = contracts.value.findIndex((c) => c.id === contractId);
      if (index !== -1) {
        contracts.value[index] = data;
      }

      if (currentContract.value?.id === contractId) {
        currentContract.value = data;
      }

      return { success: true, contract: data };
    },
    (error: any) => {
      handleError(error, { customMessage: "更新合同状态失败" });
      return { success: false, error: error.message };
    },
  );

  // 删除合同
  const deleteContract = catchAsyncError(
    async (contractId: string) => {
      // 先获取合同信息
      const contract = contracts.value.find((c) => c.id === contractId);
      if (!contract) throw new Error("合同不存在");

      // 删除存储中的文件
      const { error: storageError } = await supabase.storage
        .from("contracts")
        .remove([contract.file_path]);

      if (storageError) throw storageError;

      // 删除数据库记录
      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", contractId);

      if (error) throw error;

      // 更新本地状态
      contracts.value = contracts.value.filter((c) => c.id !== contractId);
      if (currentContract.value?.id === contractId) {
        currentContract.value = null;
      }

      return { success: true };
    },
    (error: any) => {
      handleError(error, { customMessage: "删除合同失败" });
      return { success: false, error: error.message };
    },
  );

  // 开始分析合同
  const analyzeContract = catchAsyncError(
    async (contractId: string) => {
      // 更新合同状态为处理中
      await updateContractStatus(contractId, "processing");

      // 获取合同详情
      const contract = contracts.value.find((c) => c.id === contractId);
      if (!contract) throw new Error("合同不存在");

      // 使用apiMethods调用后端AI分析服务（正确的端点）
      const result = await apiMethods.create(`/analysis/analyze/${contractId}`, {});

      // 由于分析是异步的，这里只是启动分析流程
      // 实际结果会通过其他方式（如轮询或WebSocket）获取

      // 模拟分析过程 - 生产环境应该通过轮询或WebSocket获取结果
      setTimeout(async () => {
        try {
          // 创建分析记录（模拟数据，实际应该从API获取）
          const { data: analysisData, error: analysisError } = await supabase
            .from("contract_analysis")
            .insert([
              {
                contract_id: contractId,
                user_id: authStore.user!.id,
                analysis_result: {
                  risk_level: "medium",
                  compliance_score: 85,
                  risks: [
                    {
                      id: "1",
                      title: "付款条款不明确",
                      severity: "medium",
                      description: "合同中未明确具体的付款时间和方式",
                      suggestion: "建议明确付款时间节点和支付方式",
                    },
                    {
                      id: "2",
                      title: "违约责任条款缺失",
                      severity: "high",
                      description: "合同中缺少具体的违约责任条款",
                      suggestion: "建议补充违约责任条款",
                    },
                  ],
                  compliance_checks: [
                    {
                      item: "主体资格",
                      status: "pass",
                      description: "合同签署方具备合法主体资格",
                    },
                    {
                      item: "合同形式",
                      status: "pass",
                      description: "合同形式符合法律规定",
                    },
                  ],
                  key_info: {
                    amount: "¥500,000",
                    duration: "1年",
                    parties: "甲方 vs 乙方",
                    effectiveDate: "2024-01-01",
                    expiryDate: "2025-01-01",
                    liability: "合同金额的20%",
                  },
                },
                confidence_score: 0.92,
                overall_risk_level: "medium",
                risk_summary: "合同风险中等，主要关注条款细节",
                compliance_status: true,
                completed_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (!analysisError) {
            // 更新合同状态为已分析
            await updateContractStatus(contractId, "analyzed");
            await loadContractAnalyses(contractId);
          }
        } catch (simulationError) {
          console.error("模拟分析过程失败:", simulationError);
        }
      }, 3000);

      return { success: true };
    },
    (error: any) => {
      handleError(error, { customMessage: "开始分析合同失败" });
      // 由于catchAsyncError不直接传递contractId参数，我们需要调整错误处理策略
      // 在生产环境中，可以考虑在抛出错误时包含contractId信息
      return { success: false, error: error.message };
    },
  );

  // 批量分析合同
  const batchAnalyzeContracts = catchAsyncError(
    async () => {
      const pendingContracts = contracts.value.filter(
        (c) => c.status === "uploaded",
      );

      if (pendingContracts.length === 0) {
        return { success: true, message: "没有待分析的合同" };
      }

      // 逐个分析合同
      for (const contract of pendingContracts) {
        await analyzeContract(contract.id);
      }

      return { success: true };
    },
    (error: any) => {
      handleError(error, { customMessage: "批量分析合同失败" });
      return { success: false, error: error.message };
    },
  );

  // 导出合同分析结果
  const exportContractAnalysis = catchAsyncError(
    async (contractId: string) => {
      // 获取合同和分析结果
      const contract = contracts.value.find((c) => c.id === contractId);
      const analysis = contractAnalyses.value.find(
        (a) => a.contract_id === contractId,
      );

      if (!contract || !analysis) {
        throw new Error("未找到合同或分析结果");
      }

      // 使用apiMethods调用导出API
      const response = await apiMethods.create(
        "/analysis/export",
        {
          contract_id: contractId,
          analysis_id: analysis.id,
        },
      );

      // 处理文件下载 - 正确处理响应数据
      // 先转换为unknown类型，再安全地转换为Blob
      const blob = response.data as unknown as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contract.filename.replace(/\.[^/.]+$/, "")}_分析报告.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return { success: true };
    },
    (error: any) => {
      handleError(error, { customMessage: "导出分析结果失败" });
      return { success: false, error: error.message };
    },
  );

  return {
    contracts,
    currentContract,
    contractAnalyses,
    isLoading,
    totalContracts,
    pendingContracts,
    analyzedContracts,
    completedContracts,
    loadContracts,
    uploadContract,
    getContract,
    loadContractAnalyses,
    updateContractStatus,
    deleteContract,
    analyzeContract,
    batchAnalyzeContracts,
    exportContractAnalysis,
  };
});
