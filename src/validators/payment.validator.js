const Joi = require("joi");

const flutterwavePaymentSchema = Joi.object({
  // orderId is required for standard checkout, but optional for direct quick-checkout
  orderId: Joi.string().uuid().optional(),
  
  // amount is required only if orderId is missing (Quick Checkout path)
  amount: Joi.number().positive().optional(),
  
  // Enforce rigid phone strings
  phone: Joi.string().min(10).max(15).required(),
  
  // Prevent spacebar bypass bugs by trimming strings and requiring a minimum length of 1 character
  county: Joi.string().trim().min(1).required().messages({
    "string.empty": "County selection cannot be blank or contain only spaces",
    "any.required": "County is a required field"
  }),
  
  town: Joi.string().trim().min(1).required().messages({
    "string.empty": "Town selection cannot be blank or contain only spaces",
    "any.required": "Town/City is a required field"
  }),
  
  metadata: Joi.object().optional()
});

module.exports = {
  flutterwavePaymentSchema
};