const Joi = require("joi");

const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  price: Joi.number().positive().required(),
  unit: Joi.string().min(1).max(50).required(),
  stock: Joi.number().integer().min(0).required(),
  category: Joi.string().min(1).max(100).optional(),
  description: Joi.string().allow("").optional()
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional(),
  price: Joi.number().positive().optional(),
  unit: Joi.string().min(1).max(50).optional(),
  stock: Joi.number().integer().min(0).optional(),
  category: Joi.string().min(1).max(100).optional(),
  description: Joi.string().allow("").optional()
}).min(1);

module.exports = {
  createProductSchema,
  updateProductSchema
};