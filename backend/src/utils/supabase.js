import { createClient } from '@supabase/supabase-js';

// 直接使用硬编码的Supabase配置（从.env文件复制）
const supabaseUrl = 'https://pvknmtwkwjzibnpusfut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2a25tdHdrd2p6aWJucHVzZnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMDAyNzksImV4cCI6MjA3OTc3NjI3OX0.CBgc8F3cYkx0jNEL8FM3wjWNcKvemjbTJinMzjfOZZU';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2a25tdHdrd2p6aWJucHVzZnV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIwMDI3OSwiZXhwIjoyMDc5Nzc2Mjc5fQ.iP3KJtm5ViTBUKCmU1B5lodzzbqa8LillPJ0W0mGwHU';

// 创建Supabase客户端
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// 创建管理端客户端（使用服务角色密钥）
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// 数据库操作工具类
export class DatabaseService {
  // 插入数据
  static async insert(table, data) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();
    
    if (error) throw error;
    return result[0];
  }

  // 查询数据
  static async select(table, filters = {}, options = {}) {
    let query = supabase.from(table).select('*');
    
    // 应用过滤器
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    // 应用分页
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    }
    
    // 应用排序
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending !== false });
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }

  // 更新数据
  static async update(table, id, updates) {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  // 删除数据
  static async delete(table, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  // UPSERT操作（更新或插入）
  static async upsert(table, conflictColumn, data) {
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data, {
        onConflict: conflictColumn,
        ignoreDuplicates: false
      })
      .select();
    
    if (error) throw error;
    return result[0];
  }
}

export default supabase;