const Joi = require("joi");

const flutterwavePaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  phone: Joi.string().min(10).max(15).required()
});

module.exports = {
  flutterwavePaymentSchema
};