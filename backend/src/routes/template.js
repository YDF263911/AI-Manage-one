import express from 'express';
import { DatabaseService } from '../utils/supabase.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 获取模板列表
router.get('/', protect, async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let filters = {};
    if (category) filters.category = category;

    const templates = await DatabaseService.select('templates', filters, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy: 'created_at',
      ascending: false,
    });

    // 获取总数
    let countQuery = DatabaseService.select('templates', filters);
    const total = (await countQuery).length;

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取模板列表失败',
    });
  }
});

// 获取单个模板详情
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const templates = await DatabaseService.select('templates', { id });

    if (!templates.length) {
      return res.status(404).json({
        success: false,
        message: '模板不存在',
      });
    }

    res.json({
      success: true,
      data: templates[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取模板详情失败',
    });
  }
});

// 获取模板使用统计
router.get('/stats/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 这里可以查询合同表来统计使用次数
    // 目前返回模拟数据
    const stats = {
      template_id: id,
      recent_usage: Math.floor(Math.random() * 50), // 模拟最近使用次数
      total_usage: Math.floor(Math.random() * 200),  // 模拟总使用次数
      last_used: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取使用统计失败',
    });
  }
});

// 创建新模板
router.post('/', protect, async (req, res) => {
  try {
    console.log('收到模板创建请求:', req.body);
    const { name, category, content, description, tags, is_public, variables, status } = req.body;

    const templateData = {
      name,
      category,
      content,
      description,
      tags: tags || [],
      is_public: is_public || false,
      variables: variables || [],
      is_active: status === 'active' || true,
      created_by: req.user.id,
      created_at: new Date().toISOString(),
    };

    console.log('准备插入的模板数据:', templateData);
    const template = await DatabaseService.insert('templates', templateData);

    console.log('模板创建成功:', template);
    res.status(201).json({
      success: true,
      message: '模板创建成功',
      data: template,
    });
  } catch (error) {
    console.error('创建模板失败:', error);
    console.error('错误详情:', error.stack);
    res.status(500).json({
      success: false,
      message: '模板创建失败',
      error: error.message,
      stack: error.stack,
    });
  }
});

// 更新模板
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, content, description, tags, is_active } = req.body;

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (name) updates.name = name;
    if (category) updates.category = category;
    if (content) updates.content = content;
    if (description) updates.description = description;
    if (tags) updates.tags = tags;
    if (is_active !== undefined) updates.is_active = is_active;

    const updatedTemplate = await DatabaseService.update('templates', id, updates);

    res.json({
      success: true,
      message: '模板更新成功',
      data: updatedTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '模板更新失败',
    });
  }
});

// 删除模板
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    await DatabaseService.delete('templates', id);

    res.json({
      success: true,
      message: '模板删除成功',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '模板删除失败',
    });
  }
});

// 使用模板生成合同草稿
router.post('/:id/generate-draft', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { variables = {} } = req.body;

    const templates = await DatabaseService.select('templates', { id });

    if (!templates.length) {
      return res.status(404).json({
        success: false,
        message: '模板不存在',
      });
    }

    const template = templates[0];
    
    // TODO: 实现变量替换逻辑
    let draftContent = template.content;
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      draftContent = draftContent.replace(new RegExp(placeholder, 'g'), value);
    });

    const draftData = {
      template_id: id,
      user_id: req.user.id,
      draft_content: draftContent,
      variables,
      created_at: new Date().toISOString(),
    };

    const draft = await DatabaseService.insert('contract_drafts', draftData);

    res.json({
      success: true,
      message: '合同草稿生成成功',
      data: draft,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '生成合同草稿失败',
    });
  }
});

// 增加模板使用次数
router.post('/:id/increment', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 先获取当前模板的使用次数
    const templates = await DatabaseService.select('templates', { id });
    
    if (!templates.length) {
      return res.status(404).json({
        success: false,
        message: '模板不存在',
      });
    }

    const currentTemplate = templates[0];
    const currentUsage = currentTemplate.usage_count || 0;
    
    // 更新使用次数
    const updatedTemplate = await DatabaseService.update('templates', id, {
      usage_count: currentUsage + 1,
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: '使用次数增加成功',
      data: updatedTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '增加使用次数失败',
    });
  }
});

// 获取模板分类
router.get('/categories/list', protect, async (req, res) => {
  try {
    const categories = [
      { value: 'purchase', label: '采购合同' },
      { value: 'sales', label: '销售合同' },
      { value: 'service', label: '服务合同' },
      { value: 'employment', label: '劳动合同' },
      { value: 'nda', label: '保密协议' },
      { value: 'lease', label: '租赁合同' },
      { value: 'partnership', label: '合作协议' },
      { value: 'other', label: '其他' },
    ];

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取分类失败',
    });
  }
});

export default router;