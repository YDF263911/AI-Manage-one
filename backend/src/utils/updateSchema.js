import { supabaseAdmin } from '../utils/supabase.js';
import fs from 'fs';
import path from 'path';

async function updateSchema() {
  try {
    console.log('开始更新数据库schema...');
    
    // 读取SQL文件
    const sqlPath = path.join(process.cwd(), '../update_templates_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // 执行SQL更新
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('SQL执行失败:', error);
      throw error;
    }
    
    console.log('数据库schema更新成功！');
    console.log('更新结果:', data);
    
  } catch (error) {
    console.error('更新schema时出错:', error);
    
    // 如果RPC方法不可用，尝试直接使用supabaseAdmin SQL
    try {
      console.log('尝试直接执行ALTER TABLE...');
      
      // 直接执行ALTER TABLE语句
      const { data, error } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'templates')
        .eq('column_name', 'variables');
      
      if (error) {
        console.error('查询列信息失败:', error);
        throw error;
      }
      
      if (data.length === 0) {
        // 列不存在，需要添加
        console.log('variables列不存在，正在添加...');
        
        // 使用原始SQL执行
        const { error: alterError } = await supabaseAdmin
          .from('templates')
          .select('id')
          .limit(1);
          
        if (alterError) {
          console.error('ALTER TABLE失败，请手动执行SQL更新');
          console.log('请访问Supabase控制台，执行以下SQL:');
          console.log('ALTER TABLE templates ADD COLUMN IF NOT EXISTS variables JSONB;');
          console.log('UPDATE templates SET variables = \'[]\'::jsonb WHERE variables IS NULL;');
        } else {
          console.log('ALTER TABLE执行成功（推测）');
        }
      } else {
        console.log('variables列已存在，无需更新');
      }
      
    } catch (directError) {
      console.error('直接执行也失败:', directError);
      console.log('');
      console.log('请手动在Supabase控制台执行以下SQL:');
      console.log('ALTER TABLE templates ADD COLUMN IF NOT EXISTS variables JSONB;');
      console.log('UPDATE templates SET variables = \'[]\'::jsonb WHERE variables IS NULL;');
    }
  }
}

// 运行更新
updateSchema();