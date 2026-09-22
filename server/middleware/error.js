export const notFound = (req, res, next) => next(Object.assign(new Error(`Not found: ${req.originalUrl}`), { status: 404 }));

export const errorHandler = (err, req, res, next) => {
  let status = err.status || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Server error';
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  } else if (err.code === 11000) {
    status = 400;
    message = `${Object.keys(err.keyValue || {}).join(', ') || 'Value'} already exists`;
  } else if (err.name === 'MulterError') {
    status = 400;
  }
  if (status >= 500) console.error(err);
  res.status(status).json({ message, ...(process.env.NODE_ENV === 'production' ? {} : { stack: err.stack }) });
};
