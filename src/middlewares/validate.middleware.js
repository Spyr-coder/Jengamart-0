const validate = (schema) => {
  return (req, res, next) => {
    // allowUnknown: allows extra fields like 'role' or 'hardwareName' without throwing 400
    // stripUnknown: cleans req.body so only valid schema keys are passed downstream
    const { error, value } = schema.validate(req.body, { 
      allowUnknown: true, 
      stripUnknown: false 
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
};

module.exports = validate;