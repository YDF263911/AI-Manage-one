import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase, type UserProfile } from "../utils/supabase";
import { apiMethods } from "../utils/api";
import { handleError, catchAsyncError } from "../utils/errorHandler";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<any>(null);
  const profile = ref<UserProfile | null>(null);
  const isLoading = ref(false);

  // 计算属性
  const isAuthenticated = computed(() => !!user.value);
  const userRole = computed(() => profile.value?.role || "user");
  const userName = computed(
    () => profile.value?.username || user.value?.email?.split("@")[0] || "用户",
  );

  // 初始化认证状态
  const initAuth = catchAsyncError(
    async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;

      if (session?.user && session?.access_token) {
        user.value = session.user;
        localStorage.setItem("token", session.access_token);
        
        // 检查是否为首次登录
        const isFirstTime = localStorage.getItem(`first_login_${user.value.id}`);
        
        if (isFirstTime === "completed") {
          // 非首次登录，自动恢复状态
          await loadUserProfile();
          console.log("自动登录：用户历史记录存在");
        } else if (isFirstTime === "pending") {
          // 首次注册完成，自动登录
          await loadUserProfile();
          localStorage.setItem(`first_login_${user.value.id}`, "completed");
          console.log("用户首次注册并自动登录成功");
        } else {
          // 全新用户，需要手动登录
          localStorage.setItem(`first_login_${user.value.id}`, "pending");
          console.log("新用户：需要手动登录确认");
          return;
        }
      }
    },
    (error) => {
      handleError(error, { customMessage: "初始化认证失败" });
      user.value = null;
      profile.value = null;
      localStorage.removeItem("token");
    },
  );

  // 加载用户资料
  const loadUserProfile = catchAsyncError(
    async () => {
      if (!user.value) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.value.id)
        .single();

      if (error) {
        // 如果没有用户资料，创建一个默认的
        await createUserProfile();
        throw error;
      }
      profile.value = data;
    },
    (error) => {
      handleError(error, { customMessage: "加载用户资料失败", showMessage: false });
    },
  );

  // 创建用户资料
  const createUserProfile = catchAsyncError(
    async () => {
      if (!user.value) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .insert([
          {
            id: user.value.id,
            username: user.value.email?.split("@")[0] || "用户",
            role: "user",
            department: "未设置",
          },
        ])
        .select()
        .single();

      if (error) throw error;
      profile.value = data;
    },
    (error) => {
      handleError(error, { customMessage: "创建用户资料失败", showMessage: false });
    },
  );

  // 登录
  const signIn = catchAsyncError(
    async (email: string, password: string) => {
      isLoading.value = true;

      // 参数验证
      if (!email || !password) {
        throw new Error("请输入邮箱和密码");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      user.value = data.user;
      if (data.session?.access_token) {
        localStorage.setItem("token", data.session.access_token);
      }
      await loadUserProfile();

      return { success: true };
    },
    (error: any) => {
      handleError(error, { customMessage: "登录失败" });
      localStorage.removeItem("token");
      return { success: false, error: error.message };
    },
    () => {
      isLoading.value = false;
    },
  );

  // 注册
  const signUp = catchAsyncError(
    async (
      email: string,
      password: string,
      profileData: Partial<UserProfile>,
    ) => {
      isLoading.value = true;

      // 参数验证
      if (!email || !password) {
        throw new Error("请输入邮箱和密码");
      }

      // 使用apiMethods进行注册
      const result = await apiMethods.create("/auth/register", {
        email,
        password,
        username: profileData.username || email.split("@")[0],
        role: "user",
        department: profileData.department || "未设置",
      });

      // 响应拦截器已经处理了错误情况，这里假设result是成功响应的数据
      const apiUser = result;

      // 注册成功后，标记为首次登录并自动登录
      if (apiUser) {
        // 标记用户ID为首次注册
        localStorage.setItem(`first_login_${apiUser.id}`, "pending");
        
        try {
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (authError) {
            // 如果登录失败，可能是需要邮箱验证
            return {
              success: true,
              user: apiUser,
              requiresEmailVerification: true,
              isFirstTime: true,
            };
          }

          if (authData.user) {
            user.value = authData.user;
            if (authData.session?.access_token) {
              localStorage.setItem("token", authData.session.access_token);
            }
            
            // 首次登录标记完成
            localStorage.setItem(`first_login_${apiUser.id}`, "completed");
            
            await loadUserProfile();
            console.log("用户首次注册并自动登录成功");
          }
        } catch (loginError) {
          // 登录失败不影响注册成功的结果
          return {
            success: true,
            user: apiUser,
            requiresEmailVerification: true,
            isFirstTime: true,
          };
        }
      }

      return { success: true, user: apiUser };
    },
    (error: any) => {
      handleError(error, { customMessage: "注册失败" });
      return { success: false, error: error.message };
    },
    () => {
      isLoading.value = false;
    },
  );

  // 登出
  const signOut = catchAsyncError(
    async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      user.value = null;
      profile.value = null;
      localStorage.removeItem("token");

      return { success: true };
    },
    (error: any) => {
      handleError(error, { customMessage: "登出失败" });
      localStorage.removeItem("token");
      return { success: false, error: error.message };
    },
  );

  // 更新用户资料
  const updateProfile = catchAsyncError(
    async (profileData: Partial<UserProfile>) => {
      if (!user.value) {
        throw new Error("用户未登录");
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .update(profileData)
        .eq("id", user.value.id)
        .select()
        .single();

      if (error) throw error;

      profile.value = data;
      return { success: true };
    },
    (error: any) => {
      handleError(error, { customMessage: "更新用户资料失败" });
      return { success: false, error: error.message };
    },
  );

  // 监听认证状态变化
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      user.value = session.user;
      if (session.access_token) {
        localStorage.setItem("token", session.access_token);
      }
      loadUserProfile();
    } else if (event === "SIGNED_OUT") {
      user.value = null;
      profile.value = null;
      localStorage.removeItem("token");
    }
  });

  return {
    user,
    profile,
    isLoading,
    isAuthenticated,
    userRole,
    userName,
    initAuth,
    signIn,
    signUp,
    signOut,
    updateProfile,
    loadUserProfile,
  };
});
