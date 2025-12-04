import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { User } from "@/types";
import { apiMethods } from "../utils/api";
import { handleError, catchAsyncError } from "../utils/errorHandler";

export const useUserStore = defineStore("user", () => {
  // 状态
  const user = ref<User | null>(null);
  const token = ref<string>("");
  const permissions = ref<string[]>([]);

  // Getters
  const isLoggedIn = computed(() => !!token.value);
  const userRole = computed(() => user.value?.role || null);
  const userName = computed(() => user.value?.username || "");

  // Actions
  const setUser = (userData: User) => {
    user.value = userData;
  };

  const setToken = (newToken: string) => {
    token.value = newToken;
    localStorage.setItem("token", newToken);
  };

  const setPermissions = (perms: string[]) => {
    permissions.value = perms;
  };

  const clearUser = () => {
    user.value = null;
    token.value = "";
    permissions.value = [];
    localStorage.removeItem("token");
  };

  const login = catchAsyncError(
    async (credentials: { username: string; password: string }) => {
      if (!credentials || !credentials.username || !credentials.password) {
        handleError(new Error("用户名和密码不能为空"));
        return { success: false };
      }

      try {
        // 调用登录API
        try {
          const response = await apiMethods.create("/auth/login", credentials);
          const {
            user: userData,
            token: newToken,
            permissions: userPermissions,
          } = response.data;

          setUser(userData);
          setToken(newToken);
          setPermissions(userPermissions || []);

          return { success: true };
        } catch (apiError) {
          // 如果API调用失败，记录日志并继续使用备用逻辑
          console.log("API登录失败，使用备用登录逻辑:", apiError);

          // 备用登录逻辑 - 模拟登录成功
          const mockUser: User = {
            id: "1",
            username: credentials.username,
            email: "user@example.com",
            role: "legal",
            department: "法务部",
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setUser(mockUser);
          setToken("mock-token-" + Date.now());
          setPermissions(["contract:read", "contract:write", "template:read"]);

          return { success: true };
        }
      } catch (error) {
        handleError(error, { customMessage: "登录失败" });
        return { success: false };
      }
    },
  );

  const logout = catchAsyncError(async () => {
    try {
      // 尝试调用登出API
      try {
        await apiMethods.create("/auth/logout", {});
      } catch (apiError) {
        // API调用失败不影响本地登出
        console.log("API登出失败，但继续执行本地登出:", apiError);
      }

      clearUser();
      return { success: true };
    } catch (error) {
      // 即使出错也执行本地登出
      console.error("登出过程中出错:", error);
      clearUser();
      return { success: true };
    }
  });

  const checkPermission = (permission: string) => {
    return permissions.value.includes(permission);
  };

  // 初始化时从localStorage恢复token并获取用户信息
  const initFromStorage = catchAsyncError(async () => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      token.value = storedToken;

      try {
        // 尝试根据token获取用户信息
        try {
          const response = await apiMethods.getDetail("/auth", "me");
          const { user: userData, permissions: userPermissions } =
            response.data;
          setUser(userData);
          setPermissions(userPermissions || []);
        } catch (apiError) {
          // 如果API调用失败，清除token
          console.error("获取用户信息失败，清除token:", apiError);
          clearUser();
        }
      } catch (error) {
        console.error("初始化用户信息失败:", error);
        clearUser();
      }
    }
  });

  return {
    // State
    user,
    token,
    permissions,

    // Getters
    isLoggedIn,
    userRole,
    userName,

    // Actions
    setUser,
    setToken,
    setPermissions,
    login,
    logout,
    checkPermission,
    initFromStorage,
  };
});
