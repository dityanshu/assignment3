function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  let status = err.statusCode || res.statusCode;
  if (!status || status === 200) status = 500;

  if (err.name === "ValidationError") {
    status = 400;
    return res.status(status).json({
      message: "Validation failed",
      errors: Object.values(err.errors).map((item) => item.message)
    });
  }

  if (err.code === 11000) {
    status = 400;
    return res.status(status).json({ message: "SKU already exists" });
  }

  if (err.name === "CastError") status = 400;

  res.status(status).json({
    message: err.message || "Server error"
  });
}

module.exports = { notFound, errorHandler };
