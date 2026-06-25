const errorHandler = (err, req, res, next) => {
  // If the status code is 200, default to 500 (Internal Server Error)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    success: false,
    message: err.message,
    // Only show stack trace in development mode
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
};

module.exports = { errorHandler };