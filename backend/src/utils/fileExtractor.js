import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { supabase } from './supabase.js';

/**
 * 文件内容提取工具类
 * 支持PDF、Word、TXT等格式的文件内容提取
 */
class FileExtractor {
  
  /**
   * 根据文件路径和类型提取文本内容
   * @param {string} filePath - 文件路径
   * @param {string} fileType - 文件类型
   * @returns {Promise<string>} 提取的文本内容
   */
  static async extractText(filePath, fileType) {
    try {
      if (!filePath) {
        throw new Error('文件路径不能为空');
      }

      const ext = path.extname(filePath).toLowerCase();
      
      // 从Supabase存储下载文件
      let fileBuffer;
      if (filePath.startsWith('contracts/')) {
        // Supabase存储文件
        const { data, error } = await supabase.storage
          .from('contracts')
          .download(filePath);
          
        if (error) {
          console.warn('从Supabase下载文件失败，尝试本地文件:', error.message);
          // 尝试读取本地文件
          fileBuffer = await fs.readFile(filePath);
        } else {
          const arrayBuffer = await data.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
        }
      } else {
        // 本地文件
        fileBuffer = await fs.readFile(filePath);
      }

      // 根据文件类型调用相应的提取方法
      switch (ext) {
        case '.pdf':
          return await this.extractFromPDF(fileBuffer);
        case '.docx':
          return await this.extractFromDOCX(fileBuffer);
        case '.doc':
          return await this.extractFromDOC(fileBuffer);
        case '.txt':
          return await this.extractFromTXT(fileBuffer);
        default:
          throw new Error(`不支持的文件格式: ${ext}`);
      }
    } catch (error) {
      console.error('文件内容提取失败:', error);
      throw new Error(`文件内容提取失败: ${error.message}`);
    }
  }

  /**
   * 从PDF文件中提取文本
   * @param {Buffer} buffer - PDF文件缓冲区
   * @returns {Promise<string>} 提取的文本
   */
  static async extractFromPDF(buffer) {
    try {
      const data = await pdfParse(buffer);
      let text = data.text;
      
      // 清理文本格式
      text = this.cleanText(text);
      
      console.log(`PDF文件提取成功，字符数: ${text.length}`);
      return text;
    } catch (error) {
      console.error('PDF提取失败:', error);
      throw new Error(`PDF文件提取失败: ${error.message}`);
    }
  }

  /**
   * 从DOCX文件中提取文本
   * @param {Buffer} buffer - DOCX文件缓冲区
   * @returns {Promise<string>} 提取的文本
   */
  static async extractFromDOCX(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      let text = result.value;
      
      // 清理文本格式
      text = this.cleanText(text);
      
      console.log(`DOCX文件提取成功，字符数: ${text.length}`);
      return text;
    } catch (error) {
      console.error('DOCX提取失败:', error);
      throw new Error(`DOCX文件提取失败: ${error.message}`);
    }
  }

  /**
   * 从DOC文件中提取文本（使用mammoth的兼容模式）
   * @param {Buffer} buffer - DOC文件缓冲区
   * @returns {Promise<string>} 提取的文本
   */
  static async extractFromDOC(buffer) {
    try {
      // mammoth也支持DOC文件，但效果可能不如DOCX
      const result = await mammoth.extractRawText({ buffer });
      let text = result.value;
      
      if (!text || text.trim().length === 0) {
        throw new Error('无法从DOC文件中提取文本，建议转换为DOCX格式');
      }
      
      text = this.cleanText(text);
      console.log(`DOC文件提取成功，字符数: ${text.length}`);
      return text;
    } catch (error) {
      console.error('DOC提取失败:', error);
      throw new Error(`DOC文件提取失败: ${error.message}`);
    }
  }

  /**
   * 从TXT文件中提取文本
   * @param {Buffer} buffer - TXT文件缓冲区
   * @returns {Promise<string>} 提取的文本
   */
  static async extractFromTXT(buffer) {
    try {
      let text = buffer.toString('utf8');
      
      // 清理文本格式
      text = this.cleanText(text);
      
      console.log(`TXT文件提取成功，字符数: ${text.length}`);
      return text;
    } catch (error) {
      console.error('TXT提取失败:', error);
      throw new Error(`TXT文件提取失败: ${error.message}`);
    }
  }

  /**
   * 清理和格式化提取的文本
   * @param {string} text - 原始文本
   * @returns {string} 清理后的文本
   */
  static cleanText(text) {
    if (!text) return '';
    
    // 移除多余的空格和换行
    text = text.replace(/\s+/g, ' ').trim();
    
    // 移除特殊字符但保留中文标点
    text = text.replace(/[^\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef\w\s.,!?;:()\[\]{}'"-]/g, ' ');
    
    // 标准化段落分隔
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text;
  }

  /**
   * 获取文件基本信息
   * @param {string} filePath - 文件路径
   * @param {string} filename - 文件名
   * @param {number} fileSize - 文件大小
   * @returns {Promise<Object>} 文件信息
   */
  static async getFileInfo(filePath, filename, fileSize) {
    try {
      // 对于Supabase存储的文件，无法获取本地文件状态
      if (filePath && filePath.startsWith('contracts/')) {
        return {
          filename,
          filePath,
          fileSize,
          fileType: path.extname(filename).toLowerCase(),
          createdTime: new Date(),
          modifiedTime: new Date(),
          isReadable: true
        };
      }
      
      // 本地文件
      const stats = await fs.stat(filePath);
      
      return {
        filename,
        filePath,
        fileSize,
        fileType: path.extname(filename).toLowerCase(),
        createdTime: stats.birthtime,
        modifiedTime: stats.mtime,
        isReadable: true
      };
    } catch (error) {
      console.warn('获取文件信息失败:', error.message);
      return {
        filename,
        filePath,
        fileSize,
        fileType: path.extname(filename).toLowerCase(),
        createdTime: new Date(),
        modifiedTime: new Date(),
        isReadable: false
      };
    }
  }

  /**
   * 验证文件格式是否支持
   * @param {string} filename - 文件名
   * @returns {boolean} 是否支持
   */
  static isSupportedFormat(filename) {
    const supportedFormats = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(filename).toLowerCase();
    return supportedFormats.includes(ext);
  }

  /**
   * 获取支持的格式列表
   * @returns {Array} 支持的格式列表
   */
  static getSupportedFormats() {
    return [
      { ext: '.pdf', name: 'PDF文档', mime: 'application/pdf' },
      { ext: '.docx', name: 'Word文档', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { ext: '.doc', name: 'Word文档', mime: 'application/msword' },
      { ext: '.txt', name: '文本文件', mime: 'text/plain' }
    ];
  }
}

export default FileExtractor;