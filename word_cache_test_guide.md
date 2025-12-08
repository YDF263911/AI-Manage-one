# Word文件缓存功能测试指南

## 🧪 测试步骤

### 1. 选择一个Word文件进行测试
使用以下合同ID之一：
- `ab917c4e-f57e-47b5-acac-6cdfa7b94b83` (简易劳务合同（通用版）.docx)
- `0156bb0b-e68c-43f4-9792-2f5ea4f0007b` (农副产品买卖合同（示范文本）.docx)

### 2. 首次提取测试
**API调用**：
```
POST http://localhost:5001/api/extract/text/ab917c4e-f57e-47b5-acac-6cdfa7b94b83
Headers: X-User-ID: 6ab5abfd-1339-4875-9c5a-d2a1d398b1a3
Body: {}
```

**预期结果**：
```json
{
  "success": true,
  "message": "文件内容提取完成",
  "data": {
    "fromCache": false,
    "extractedText": "..."
  }
}
```

### 3. 缓存验证
**数据库查询**：
```sql
SELECT * FROM contract_text_cache WHERE contract_id = 'ab917c4e-f57e-47b5-acac-6cdfa7b94b83'
```

**预期结果**：应该有1条记录

### 4. 第二次访问测试
**API调用**：
```
POST http://localhost:5001/api/extract/text/ab917c4e-f57e-47b5-acac-6cdfa7b94b83
Headers: X-User-ID: 6ab5abfd-1339-4875-9c5a-d2a1d398b1a3
Body: {}
```

**预期结果**：
```json
{
  "success": true,
  "message": "已加载缓存的文本内容",
  "data": {
    "fromCache": true,
    "extractedText": "..."
  }
}
```

### 5. 强制重新提取测试
**API调用**：
```
POST http://localhost:5001/api/extract/text/ab917c4e-f57e-47b5-acac-6cdfa7b94b83
Headers: X-User-ID: 6ab5abfd-1339-4875-9c5a-d2a1d398b1a3
Body: {"force": true}
```

**预期结果**：
```json
{
  "success": true,
  "message": "文件内容提取完成",
  "data": {
    "fromCache": false,
    "extractedText": "..."
  }
}
```

## 🔧 故障排除

### 如果Word文件没有创建缓存：

1. **检查用户ID**：确保使用正确的用户ID `6ab5abfd-1339-4875-9c5a-d2a1d398b1a3`

2. **检查合同归属**：确保Word文件的user_id与传递的用户ID匹配

3. **检查文件路径**：确保合同记录中有有效的file_path

4. **检查后端日志**：查看console.log输出，确认没有错误

### 前端检查：

1. **清除浏览器缓存**：按F12 → Network → Disable cache
2. **检查用户认证**：确保用户已登录，token有效
3. **检查API调用**：查看Network标签，确认API请求头正确

## 📊 当前状态

根据后端测试，Word文件缓存功能**完全正常**：
- ✅ 首次提取：创建缓存记录
- ✅ 再次访问：从缓存加载
- ✅ 强制重提：绕过缓存重新提取

如果仍有问题，请提供具体的：
1. 合同ID
2. 前端控制台日志
3. 后端控制台日志
4. 具体的错误信息