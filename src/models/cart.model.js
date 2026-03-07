const carts = new Map(); // key: userId, value: [{ productId, quantity }]

class Cart {
  static getCart(userId) {
    if (!carts.has(userId)) carts.set(userId, []);
    return carts.get(userId);
  }

  static addItem(userId, productId, quantity) {
    const cart = Cart.getCart(userId);
    const existing = cart.find((i) => i.productId === productId);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ productId, quantity });
    }
    return cart;
  }

  static updateItem(userId, productId, quantity) {
    const cart = Cart.getCart(userId);
    const item = cart.find((i) => i.productId === productId);
    if (!item) return null;
    item.quantity = quantity;
    return cart;
  }

  static removeItem(userId, productId) {
    const cart = Cart.getCart(userId);
    const next = cart.filter((i) => i.productId !== productId);
    carts.set(userId, next);
    return next;
  }

  static clear(userId) {
    carts.set(userId, []);
  }
}

module.exports = Cart;