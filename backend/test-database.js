import { DatabaseService } from './src/utils/supabase.js';

async function testDatabase() {
  console.log('测试数据库连接...');
  
  try {
    // 测试合同查询
    const contracts = await DatabaseService.select('contracts', {
      id: '9b8a0176-859a-4a0f-b735-dafde2d48fc2'
    });
    
    console.log('合同查询结果:', contracts.length);
    
    if (contracts.length > 0) {
      console.log('找到合同:', contracts[0].filename);
    }
    
    // 测试插入
    const testInsert = {
      test_field: 'test_value',
      created_at: new Date().toISOString()
    };
    
    console.log('数据库测试完成');
    
  } catch (error) {
    console.error('数据库测试失败:', error);
  }
  
  process.exit(0);
}

testDatabase();