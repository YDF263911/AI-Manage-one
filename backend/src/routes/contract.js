import express from 'express';
import multer from 'multer';
import path from 'path';
import { supabase, DatabaseService } from '../utils/supabase.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/contracts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  },
});

// 上传合同文件
router.post('/upload', protect, upload.single('contractFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件',
      });
    }

    const contractData = {
      user_id: req.user.id,
      filename: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      file_type: path.extname(req.file.originalname),
      status: 'uploaded',
      created_at: new Date().toISOString(),
    };

    const contract = await DatabaseService.insert('contracts', contractData);

    res.json({
      success: true,
      message: '文件上传成功',
      contract,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '文件上传失败',
    });
  }
});

// 获取合同列表
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let filters = { user_id: req.user.id };
    if (status) filters.status = status;

    const contracts = await DatabaseService.select('contracts', filters, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy: 'created_at',
      ascending: false,
    });

    // 获取总数
    let countQuery = supabase.from('contracts').select('*', { count: 'exact', head: true });
    Object.entries(filters).forEach(([key, value]) => {
      countQuery = countQuery.eq(key, value);
    });
    
    const { count } = await countQuery;

    res.json({
      success: true,
      data: contracts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取合同列表失败',
    });
  }
});

// 获取单个合同详情
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const contracts = await DatabaseService.select('contracts', {
      id,
      user_id: req.user.id,
    });

    if (!contracts.length) {
      return res.status(404).json({
        success: false,
        message: '合同不存在',
      });
    }

    res.json({
      success: true,
      data: contracts[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取合同详情失败',
    });
  }
});

// 更新合同状态
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['uploaded', 'processing', 'analyzed', 'reviewed', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值',
      });
    }

    const updatedContract = await DatabaseService.update('contracts', id, {
      status,
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: '合同状态更新成功',
      data: updatedContract,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新合同状态失败',
    });
  }
});

// 删除合同
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    await DatabaseService.delete('contracts', id);

    res.json({
      success: true,
      message: '合同删除成功',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除合同失败',
    });
  }
});

// 获取合同内容
router.get('/:id/content', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const contracts = await DatabaseService.select('contracts', {
      id,
      user_id: req.user.id,
    }, {
      select: 'contract_content, content_edited_at, content_edited_by, filename, file_type'
    });

    if (!contracts.length) {
      return res.status(404).json({
        success: false,
        message: '合同不存在',
      });
    }

    const contract = contracts[0];
    
    res.json({
      success: true,
      data: {
        content: contract.contract_content || '',
        edited_at: contract.content_edited_at,
        edited_by: contract.content_edited_by,
        filename: contract.filename,
        file_type: contract.file_type
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取合同内容失败',
    });
  }
});

// 更新合同内容
router.put('/:id/content', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, edited_by, edit_time } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '合同内容不能为空',
      });
    }

    // 验证合同存在且属于当前用户
    const existingContracts = await DatabaseService.select('contracts', {
      id,
      user_id: req.user.id,
    });

    if (!existingContracts.length) {
      return res.status(404).json({
        success: false,
        message: '合同不存在',
      });
    }

    // 更新合同内容
    const updateData = {
      contract_content: content,
      content_edited_at: edit_time || new Date().toISOString(),
      content_edited_by: edited_by || req.user.id,
      updated_at: new Date().toISOString()
    };

    const updatedContract = await DatabaseService.update('contracts', id, updateData);

    res.json({
      success: true,
      message: '合同内容保存成功',
      data: {
        content: updatedContract.contract_content,
        edited_at: updatedContract.content_edited_at,
        edited_by: updatedContract.content_edited_by
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '保存合同内容失败',
    });
  }
});

export default router;