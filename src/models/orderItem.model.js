class OrderItem {
  constructor({ productId, name, unitPrice, unit, quantity, lineTotal }) {
    this.productId = productId;
    this.name = name;
    this.unitPrice = unitPrice;
    this.unit = unit;
    this.quantity = quantity;
    this.lineTotal = lineTotal;
  }
}

module.exports = OrderItem;