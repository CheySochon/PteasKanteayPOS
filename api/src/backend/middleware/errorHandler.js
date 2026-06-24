function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProduction = req.app.get('env') === 'production';

  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    error: isProduction && status === 500 ? undefined : err.stack,
  });
}

module.exports = errorHandler;
