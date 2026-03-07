const { v4: uuidv4 } = require("uuid");

const orders = [];

class Order {
  constructor({ userId, items, subtotal, status = "PENDING" }) {
    this.id = uuidv4();
    this.userId = userId;
    this.items = items;
    this.subtotal = subtotal;
    this.status = status; // PENDING | PAID | SHIPPED | DELIVERED | CANCELLED
    this.payment = null;  // will store payment details
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static create(data) {
    const order = new Order(data);
    orders.push(order);
    return order;
  }

  static findById(id) {
    return orders.find((o) => o.id === id);
  }

  static findByUser(userId) {
    return orders.filter((o) => o.userId === userId);
  }

  static findAll() {
    return orders;
  }

  static updateStatus(orderId, status) {
    const order = Order.findById(orderId);
    if (!order) return null;
    order.status = status;
    order.updatedAt = new Date();
    return order;
  }

  static attachPayment(orderId, paymentObj) {
    const order = Order.findById(orderId);
    if (!order) return null;
    order.payment = paymentObj;
    order.updatedAt = new Date();
    return order;
  }
}

module.exports = Order;