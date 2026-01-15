const { v4: uuidv4 } = require("uuid");

const users = [];

class User {
  constructor({ name, email, password, role = "customer" }) {
    this.id = uuidv4();
    this.name = name;
    this.email = email;
    this.password = password;
    this.role = role;
    this.createdAt = new Date();
  }

  static create(userData) {
    const user = new User(userData);
    users.push(user);
    return user;
  }

  static findByEmail(email) {
    return users.find((u) => u.email === email);
  }

  static findById(id) {
    return users.find((u) => u.id === id);
  }
}

module.exports = User;
