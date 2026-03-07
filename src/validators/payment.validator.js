const Joi = require("joi");

const mpesaPaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  phone: Joi.string().min(10).max(15).required()
});

module.exports = {
  mpesaPaymentSchema
};