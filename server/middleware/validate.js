function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;
      next();
    } catch (error) {
      if (error.errors) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        return res.status(400).json({
          success: false,
          error: `Validation failed: ${errorMessages}`,
          details: error.errors
        });
      }
      return res.status(400).json({
        success: false,
        error: error.message || 'Invalid request payload'
      });
    }
  };
}

module.exports = validate;
