// 404 错误处理
export const notFound = (req, res, next) => {
  const error = new Error(`未找到 - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// 全局错误处理
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // 如果是验证错误
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败';
  }

  // 如果是JWT错误
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的令牌';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};