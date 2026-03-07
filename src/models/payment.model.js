const { v4: uuidv4 } = require("uuid");

const payments = [];

class Payment {
  constructor({ orderId, userId, amount, method, phone, status = "INITIATED" }) {
    this.id = uuidv4();
    this.orderId = orderId;
    this.userId = userId;
    this.amount = amount;
    this.method = method; // "MPESA"
    this.phone = phone || null;

    // INITIATED | SUCCESS | FAILED
    this.status = status;

    // gateway refs (for real mpesa later)
    this.gatewayReference = null;
    this.receiptNumber = null;

    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static create(data) {
    const p = new Payment(data);
    payments.push(p);
    return p;
  }

  static findById(id) {
    return payments.find((p) => p.id === id);
  }

  static findByOrderId(orderId) {
    return payments.filter((p) => p.orderId === orderId);
  }

  static updateStatus(paymentId, status, extras = {}) {
    const p = Payment.findById(paymentId);
    if (!p) return null;
    p.status = status;
    p.updatedAt = new Date();

    if (extras.gatewayReference) p.gatewayReference = extras.gatewayReference;
    if (extras.receiptNumber) p.receiptNumber = extras.receiptNumber;

    return p;
  }
}

module.exports = Payment;