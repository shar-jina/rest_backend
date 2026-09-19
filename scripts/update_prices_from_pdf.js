require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BACKEND_DIR = path.join(__dirname, '..');
const MENU_JSON_PATH = path.join(BACKEND_DIR, 'data', 'menuData.json');
const FRONTEND_DIR = path.join(BACKEND_DIR, '..', 'restuarent_website');
const SRC_MENU_JS_PATH = path.join(FRONTEND_DIR, 'src', 'data', 'menuData.js');

const Menu = require('../models/Menu');

// Price map directly extracted from 12-page KANARY MENU.pdf
const pdfPrices = {
  // CHEF SPECIALS
  "Kanary Smoked Beef Brisket": 659,
  "Cheese Infused Chicken": "529 / 879",
  "Beef Tenderloin": 505,
  "Slow Cooked Beef Ribs": 659,
  "Smoked Barbeque Ribs": 659,
  "Smoked Barbecue Ribs": 659,
  "Japanese Wagyu (Pre Booked)": "As Per Size",
  "Grilled Chicken Breast": 494,

  // STARTERS & SOUPS
  "Chicken Manchow Soup": 199,
  "Hot & Sour Veg Soup": 178,
  "Hot & Sour Chicken Soup": 199,
  "Sweet Corn Veg Soup": 178,
  "Sweet Corn Chicken Soup": 199,
  "Chicken Momos (Schezwan)": 251,
  "Veg Momos (Schezwan)": 199,
  "Chicken Momos (Saffron Cream)": 251,
  "Veg Momos (Saffron Cream)": 220,
  "Honey Chilli Potato": 167,
  "Dynamite Paneer": 231,
  "Dynamite Shrimp": 283,
  "Honey Chilli Chicken": 252,
  "Tender Chicken": 262,
  "Buffalo Chicken Wings": 262,
  "Fried Chicken Wings": 262,
  "Prawns Tempura": 283,
  "Shrimp Cocktail": 283,
  "Finger Fish": 167,

  // MAINS
  "Veg Fried Rice / Schezwan": "188 / 199",
  "Chicken Fried Rice / Schezwan": "219 / 220",
  "Egg Fried Rice / Schezwan": 209,
  "Mixed Fried Rice / Schezwan": 273,
  "Chicken Hakka Noodles / Schezwan": "253 / 267",
  "Veg Hakka Noodles / Schezwan": 231,
  "Biriyani Rice": 143,
  "Malabar Chicken Dum Biriyani": 209,
  "White Chana Masala": 185,
  "Veg Kuruma": 105,
  "Chicken Tikka Masala": 262,
  "Paneer Butter Masala": 252,
  "Butter Chicken Gravy": 262,
  "Chicken Roast": 252,
  "Chicken Curry": 241,
  "Chicken Mappas": 262,
  "Chicken Stew": 189,
  "Chicken 65": 315,
  "Chicken Perattu": 273,
  "Chicken Kondattam": 273,
  "Beef Curry": 299,
  "Beef Coconut Fry": 293,
  "BDF (Kanary Special)": 336,
  "Beef Roast": 251,
  "Fish N Chips": 496,
  "Fish Curry (Neymeen)": 336,
  "Neymeen Tawa Fry": "As Per Size",
  "Neymeen Mulakittath": 310,
  "Prawn Roast": 366,
  "Chilly Gobi": 199,
  "Chilly Paneer": 252,
  "Chilly Mushroom": 241,
  "Gobi Manchurian": 199,
  "Paneer Manchurian": 252,
  "Mushroom Manchurian": 241,
  "Chilly Chicken / Manchurian": 273,
  "Schezwan Chicken": 315,
  "Dragon Chicken": 273,
  "Thai Green Chicken Curry": 283,

  // ITALIAN PASTA
  "Penne Alfredo Chicken / Veg": 303,
  "Penne Mama Rosa Pasta": 273,
  "Penne Arabiata Di Pollo / Veg Pasta": 273,
  "Spicy Mexican Fettuccine": 318,
  "Chicken Lasagna / Meat": 417,
  "Spaghetti & Meatballs": 417,

  // DOSAS & BREADS
  "A2 Ghee Spring Chicken Dosa": 261,
  "A2 Ghee Paneer Masala Dosa": 199,
  "A2 Ghee Kanary Porotta": 26,
  "A2 Ghee Chappatti": 27,
  "Beef Lappa Porotta": 241,
  "Chicken Lappa Porotta": 220,
  "A2 Ghee Nool Porotta": 26,
  "A2 Ghee Cheese Dosa": 167,
  "A2 Ghee Masala Dosa": 146,
  "Plain Dosa": 95,
  "A2 Ghee Onion Uthappam": 127,
  "A2 Ghee Beef Dosa": 261,
  "Butter Chicken Dosa": 261,
  "A2 Ghee Schezwan Chicken Dosa": 261,
  "A2 Ghee Podi Dosa": 146,
  "Butter Garlic Naan": 48,
  "Plain Naan": 38,
  "Butter Naan": 43,
  "Tandoori Roti": 28,
  "Butter Roti": 33,
  "Rumali Roti": 28,
  "Kuboos": 15,

  // GRILLS & SHAWAYA
  "Green Pepper Alfaham": "237 / 406 / 737",
  "Honey Chilli Alfaham": "219 / 384 / 736",
  "Peri Peri Chicken": "219 / 384 / 736",
  "Masala Alfaham": "219 / 384 / 736",
  "Lebanese Alfaham": "220 / 384 / 736",
  "Shish Tawook": 428,
  "Mexican Chicken Shawarma": 208,
  "Shawarma Plate": 384,
  "Turkish Shawaya": "231 / 462 / 734",
  "Masala Shawaya": "219 / 440 / 714",
  "Peri Peri Shawaya": "225 / 451 / 725",
  "Shawaya Platter": 1099,

  // SALADS
  "Hummus Platter": 296,
  "Fattoush Salad": 296,
  "Greek Salad": 362,
  "Chicken Caesar Salad": 362,
  "Veg Caesar Salad": 274,
  "Maryland Chicken Salad": 296,
  "3 Bean Salad": 252,
  "Quinoa Salad": 276,

  // BURGERS & PIZZA
  "Southern Fried Chicken Burger": 356,
  "Gone Black (Beef Burger)": 384,
  "Schezwan Chicken Burger": 356,
  "Double Stack Club Sandwich": 336,
  "Peri Peri Chicken Sandwich": 314,
  "Grilled Cheese Sandwich": 240,
  "Chicken Mayo Club Sandwich": 252,
  "Grilled Veg Cheese Sandwich": 273,
  "Classic Margherita Pizza": 418,
  "Tender Chicken Fajitas Pizza": 471,
  "Roasted Veg Pizza": 418,
  "BBQ Chicken Pizza": 481,
  "Four Season Pizza": 513,

  // BEVERAGES & SHAKES
  "Avocado Shake": 209,
  "Ice Coffee": 177,
  "Sharia Delight": 154,
  "Dates Delight": 151,
  "Pina Colada": 199,
  "Pina Blue": 199,
  "Red Velvet Shake": 209,
  "Nutella Surprise": 209,
  "Spanish Delight Shake": 167,
  "Lotus Biscoff Shake": 219,
  "Butterscotch Shake": 178,
  "Jackfruit Shake": 198,
  "Oreo Shake": 167,
  "KitKat Shake": 167,
  "Mango Shake": 153,
  "Chikoo Shake": 153,
  "Peanut Caramel Delight": 178,
  "Tender Coconut Shake": 177,
  "Passion Fruit Mojito": 166,
  "Lemon Mint Mojito": 166,
  "Green Apple Mojito": 166,
  "Peach Mojito": 166,
  "Mango Mojito": 166,
  "Passion Fruit Ice Tea": 177,
  "Classic Ice Tea": 177,
  "Watermelon Ice Tea": 177,
  "Mango Ice Tea": 177,
  "Blue Diamond Ice Tea": 177,
  "Blueberry Ice Tea": 177,
  "Strawberry Ice Tea": 177,
  "Peach Ice Tea": 177,
  "Red Diamond Ice Tea": 177,

  // JUICES & SMOOTHIES
  "Fruit Cocktail": 181,
  "Apple & Carrot Juice": 162,
  "Red Apple Juice": 171,
  "Strawberry Banana Smoothie": 225,
  "Berry Mix Smoothie": 251,
  "Fruit Punch Falooda": 209,
  "Mixed Nuts Falooda": 209,
  "Royal Cream Falooda": 209,
  "Watermelon Juice": 130,
  "Pineapple Juice": 140,
  "Kanary Special Smoothie": 209,

  // DESSERTS & HOT BEVERAGES
  "Strawberry Roll Ice Cream": 198,
  "White Chocolate Roll Ice Cream": 198,
  "Nutella Mania Roll Ice Cream": 219,
  "Lotus Biscoff Roll Ice Cream": 230,
  "KitKat Roll Ice Cream": 198,
  "Oreo Magic Roll Ice Cream": 198,
  "Jackfruit Roll Ice Cream": 209,
  "Peanut Delight Roll Ice Cream": 200,
  "Mango Roll Ice Cream": 200,
  "Banana Split": 209,
  "Cassatta": 286,
  "Fruit Salad with Ice Cream": 184,
  "Strawberry Scoop": 103,
  "Vanilla Scoop": 108,
  "Chocolate Scoop": 127,
  "Butterscotch Scoop": 145,
  "Spanish Delight Scoop": 135,
  "Mango Scoop": 114,
  "Red Velvet Scoop": 157,
  "Black Coffee": 24,
  "Biriyani Tea (A2 Milk)": 33,
  "Black Tea": 14,
  "Coffee (A2 Milk)": 43,
  "A2 Milk": 38,
  "Pineapple Lemon Tea": 38,
  "Ginger Lemon Tea": 38,
  "Mint Tea": 38,
  "Boost (A2 Milk)": 48,
  "Horlicks (A2 Milk)": 48,
  "Lemon Tea": 28,
  "Green Tea": 33,
  "Green Apple Tea": 38,
  "Sulaimani": 19,
  "Chuku Kapi": 24,
  "Hot Chocolate (A2 Milk)": 115,
  "Masala Tea": 38,
  "Mint Lemon Tea": 38,
  "Tea (A2 Milk)": 28,
  "Badaam Milk (A2 Milk)": 57,
  "Ginger Black Tea": 19,
};

async function updateMenuPrices() {
  console.log('Reading current menu dataset...');
  let menuData = JSON.parse(fs.readFileSync(MENU_JSON_PATH, 'utf8'));

  let updatedCount = 0;
  Object.keys(menuData).forEach((cat) => {
    if (Array.isArray(menuData[cat])) {
      menuData[cat].forEach((dish) => {
        const dishName = dish.name;
        if (pdfPrices[dishName] !== undefined) {
          dish.price = pdfPrices[dishName];
          updatedCount++;
        }
      });
    }
  });

  console.log(`✅ Updated ${updatedCount} dish prices to match KANARY MENU.pdf!`);

  // Connect to MongoDB Atlas & Save
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB Atlas.');
      await Menu.deleteMany({});
      await Menu.create(menuData);
      console.log('💾 Saved updated PDF menu prices to MongoDB Atlas database!');
    } catch (err) {
      console.warn('MongoDB save warning:', err.message);
    }
  }

  // Save to menuData.json & menuData.js
  fs.writeFileSync(MENU_JSON_PATH, JSON.stringify(menuData, null, 2), 'utf8');
  console.log('📄 Saved updated menu to backend/data/menuData.json');

  const jsContent = 'export const menuData = ' + JSON.stringify(menuData, null, 2) + ';\n';
  fs.writeFileSync(SRC_MENU_JS_PATH, jsContent, 'utf8');
  console.log('📄 Saved updated menu to src/data/menuData.js');

  process.exit(0);
}

updateMenuPrices().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
