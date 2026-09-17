const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, default: '' },
  spicy: { type: Boolean, default: false },
  veg: { type: Boolean, default: false },
  dairy: { type: Boolean, default: false },
  image: { type: String, default: '' },
});

const menuSchema = new mongoose.Schema(
  {
    chefSpecials: [menuItemSchema],
    starters: [menuItemSchema],
    mains: [menuItemSchema],
    grills: [menuItemSchema],
    dosas: [menuItemSchema],
    salads: [menuItemSchema],
    burgers: [menuItemSchema],
    beverages: [menuItemSchema],
    smoothies: [menuItemSchema],
    desserts: [menuItemSchema],
    meals: [menuItemSchema],
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model('Menu', menuSchema);
