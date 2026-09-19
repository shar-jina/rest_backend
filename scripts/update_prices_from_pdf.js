require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BACKEND_DIR = path.join(__dirname, '..');
const MENU_JSON_PATH = path.join(BACKEND_DIR, 'data', 'menuData.json');
const FRONTEND_DIR = path.join(BACKEND_DIR, '..', 'restuarent_website');
const SRC_MENU_JS_PATH = path.join(FRONTEND_DIR, 'src', 'data', 'menuData.js');

const Menu = require('../models/Menu');

// Price map directly extracted from src/menu.pdf (9-page menu PDF with latest tax-inclusive rates)
const pdfPrices = {
  // CHEF SPECIALS
  'Kanary Smoked Beef Brisket': 723,
  'Cheese Infused Chicken': '575 / 967',
  'Beef Tenderloin': 556,
  'Slow Cooked Beef Ribs': 723,
  'Smoked Barbeque Ribs': 725,
  'Japanese Wagyu (Pre-Booked)': 'As Per Size',
  'Grilled Chicken Breast': 543,

  // SOUPS
  'Cream of Mushroom (Veg/Chicken)': '198 / 219',
  'Cream of Chicken': 219,
  'Cream of Tomato': 188,
  'Sweet Corn Veg Soup': 196,
  'Sweet Corn Chicken Soup': 219,
  'Hot & Sour Veg Soup': 196,
  'Hot & Sour Chicken Soup': 219,
  'Chicken Manchow Soup': 219,
  'Seafood Soup': 251,
  'Lemon Coriander (Veg/Chicken)': '178 / 199',

  // STARTERS & MOMOS
  'Shrimp Cocktail': 339,
  'Finger Fish': 314,
  'Dynamite Shrimp': 311,
  'Dynamite Paneer': 254,
  'French Fries / Peri Peri Fries': '165 / 181',
  'Honey Chilli Potato': 183,
  'Honey Chilli Chicken': 277,
  'Spicy Chicken Strips': 311,
  'Tender Chicken': 288,
  'Buffalo Chicken Wings': 288,
  'Prawns Tempura': 311,
  'Chicken Momos (Schezwan)': 254,
  'Veg Momos (Schezwan)': 219,
  'Chicken Momos (Saffron Cream)': 265,
  'Veg Momos (Saffron Cream)': 242,

  // MAINS
  'new1': 300,
  'new2': 200,
  'Veg Fried Rice / Schezwan': '207 / 219',
  'Chicken Fried Rice / Schezwan': '241 / 242',
  'Egg Fried Rice / Schezwan': 230,
  'Mixed Fried Rice / Schezwan': 300,
  'Chicken Hakka Noodles / Schezwan': '278 / 294',
  'Veg Hakka Noodles / Schezwan': 254,
  'Biriyani Rice': 157,
  'Malabar Chicken Dum Biriyani': 230,
  'White Chana Masala': 203,
  'Veg Kuruma': 115,
  'Chicken Tikka Masala': 288,
  'Paneer Butter Masala': 277,
  'Butter Chicken Gravy': 288,
  'Chicken Roast': 277,
  'Chicken Curry': 265,
  'Chicken Mappas': 288,
  'Chicken Stew': 208,
  'Chicken Ghee Roast': 347,
  'Chicken Perattu': 300,
  'Chicken Kondattam': 300,
  'Beef Curry': 329,
  'Beef Coconut Fry': 322,
  'BDF (Kanary Special)': 370,
  'Beef Roast': 276,
  'Fish N Chips': 546,
  'Fish Curry (Neymeen)': 370,
  'Neymeen Tawa Fry': 'As Per Season',
  'Neymeen Mulakittathu': 341,
  'Prawn Roast': 403,
  'Chilly Gobi': 219,
  'Chilly Paneer': 277,
  'Chilly Mushroom': 265,
  'Gobi Manchurian': 219,
  'Paneer Manchurian': 277,
  'Mushroom Manchurian': 265,
  'Chilly Chicken / Manchurian': 300,
  'Schezwan Chicken': 347,
  'Dragon Chicken': 300,
  'Thai Green Chicken Curry': 311,

  // GRILLS
  'Green Pepper Alfaham': '261 / 447 / 811',
  'Honey Chilli Alfaham': '241 / 422 / 810',
  'Peri Peri Chicken': '241 / 422 / 810',
  'Masala Alfaham': '241 / 422 / 810',
  'Lebanese Alfaham': '242 / 422 / 810',
  'Shish Tawook': 471,
  'Mexican Chicken Shawarma': 229,
  'Shawarma Plate': 422,
  'Turkish Shawaya': '254 / 508 / 807',
  'Masala Shawaya': '241 / 484 / 785',
  'Peri Peri Shawaya': '248 / 496 / 798',
  'Shawaya Platter': 1209,

  // DOSAS & BREADS
  'A2 Ghee Roast Dosa': 140,
  'A2 Ghee Tattu Dosa': 116,
  'A2 Ghee Masala Dosa': 161,
  'A2 Ghee Podi Dosa': 161,
  'Plain Dosa': 105,
  'A2 Ghee Onion Uthappam': 140,
  'A2 Ghee Beef Dosa': 287,
  'Butter Chicken Dosa': 287,
  'A2 Ghee Schezwan Chicken Dosa': 287,
  'A2 Ghee Spring Chicken Dosa': 316,
  'A2 Ghee Paneer Masala Dosa': 219,
  'A2 Ghee Kanary Porotta': 39,
  'A2 Ghee Chappatti': 29,
  'Beef Lappa Porotta': 265,
  'Chicken Lappa Porotta': 242,
  'A2 Ghee Nool Porotta': 29,

  // SALADS
  'Hummus Platter': 327,
  'Fattoush Salad': 326,
  'Greek Salad': 398,
  'Chicken Caesar Salad': 398,
  'Veg Caesar Salad': 301,
  'Maryland Chicken Salad': 326,
  '3 Bean Salad': 277,
  'Quinoa Salad': 304,

  // BURGERS
  'Southern Fried Chicken Burger': 391,
  'Gone Black (Beef Burger)': 422,
  'Schezwan Chicken Burger': 391,
  'Double Stack Club Sandwich': 370,
  'Peri Peri Chicken Sandwich': 345,
  'Grilled Cheese Sandwich': 264,
  'Chicken Mayo Club Sandwich': 277,
  'Grilled Veg Cheese Sandwich': 300,
  'Classic Margherita Pizza': 460,
  'Tender Chicken Fajitas Pizza': 518,
  'Roasted Veg Pizza': 460,
  'BBQ Chicken Pizza': 529,
  'Four Season Pizza': 564,

  // BEVERAGES
  'Avocado Shake': 230,
  'Ice Coffee': 169,
  'Sharjah Delight': 169,
  'Dates Delight': 166,
  'Pinacolada': 219,
  'Pina Blue': 219,
  'Red Velvet Shake': 230,
  'Nutella Surprise': 250,
  'Spanish Delight Shake': 184,
  'Lotus Biscoff Shake': 241,
  'Butterscotch Shake': 196,
  'Jack Fruit Shake (Seasonal)': 218,
  'Oreo Shake': 184,
  'Kitkat Shake': 184,
  'Mango Shake': 169,
  'Chikoo Shake': 169,
  'Peanut Caramel Delight': 196,
  'Tender Coconut Shake': 195,
  'Passion Fruit Mojito': 183,
  'Lemon Mint Mojito': 183,
  'Green Apple Mojito': 183,
  'Peach Mojito': 183,
  'Mango Mojito': 183,
  'Classic Mojito': 195,
  'Watermelon Mojito': 195,
  'Blue Curacao Mojito': 195,
  'Blueberry Mojito': 195,
  'Strawberry Mojito': 195,
  'Red Diamond Mojito': 195,
  'Passion Fruit Ice Tea': 195,
  'Classic Ice Tea': 195,
  'Watermelon Ice Tea': 195,
  'Mango Ice Tea': 195,
  'Blue Diamond Ice Tea': 195,
  'Blueberry Ice Tea': 195,
  'Strawberry Ice Tea': 195,
  'Peach Ice Tea': 195,
  'Red Diamond Ice Tea': 195,
  'Lemon Mint Ice Tea': 183,
  'Green Apple Ice Tea': 183,

  // SMOOTHIES
  'Fruit Cocktail Juice': 199,
  'Apple Carrots Juice': 178,
  'Red Apple Juice': 188,
  'Orange / Sweet Lime Juice': 173,
  'Watermelon Juice': 143,
  'Pomegranate Juice': 194,
  'Pineapple Juice': 154,
  'Lime Juice': 55,
  'Mint Lime Juice': 66,
  'Strawberry Banana Smoothie': 248,
  'Berry Mix Smoothie': 276,
  'Kanary Special Smoothie': 230,
  'Mixed Nuts Smoothie': 230,
  'Royal Cream Smoothie': 230,

  // DESSERTS
  'Cassatta Ice Cream': 315,
  'Banana Split': 230,
  'Kanary Special Falooda': 315,
  'Strawberry Scoop': 113,
  'Vanilla Scoop': 113,
  'Chocolate Scoop': 140,
  'Butterscotch Scoop': 160,
  'Spanish Delight Scoop': 149,
  'Mango Scoop': 125,
  'Red Velvet Scoop': 173,
  'Black Coffee': 24,
  'Biriyani Tea (A2 Milk)': 33,
  'Black Tea': 14,
  'Coffee (A2 Milk)': 43,
  'Pure A2 Milk': 38,
  'Pineapple Lemon Tea': 38,
  'Ginger Lemon Tea': 29,
  'Mint Tea': 19,
  'Boost (A2 Milk)': 45,
  'Horlicks (A2 Milk)': 45,
  'Lemon Tea': 19,
  'Green Tea': 24,
  'Green Apple Tea': 43,
  'Sulaimani': 24,
  'Chukku Kappi': 38,
  'Masala Tea (A2 Milk)': 45,
  'Tea (A2 Milk)': 19,
  'Badam Milk (A2 Milk)': 67,
  'Ginger Black Tea': 19,

  // MEALS
  'Traditional Veg Meals': 143,
  'Chicken Curry Meals': 253,
  'Beef Curry Meals': 297
};

async function updateMenuPrices() {
  console.log('Reading current menu dataset...');
  let menuData = JSON.parse(fs.readFileSync(MENU_JSON_PATH, 'utf8'));

  let updatedCount = 0;
  Object.keys(menuData).forEach((cat) => {
    if (Array.isArray(menuData[cat])) {
      menuData[cat].forEach((dish) => {
        const dishName = dish.name || dish.title;
        if (pdfPrices[dishName] !== undefined) {
          dish.price = pdfPrices[dishName];
          updatedCount++;
        }
      });
    }
  });

  console.log(`✅ Updated ${updatedCount} dish prices to match src/menu.pdf!`);

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

  const jsContent = 'export const menuData = ' + JSON.stringify(menuData, null, 2) + ';\nexport default menuData;\n';
  fs.writeFileSync(SRC_MENU_JS_PATH, jsContent, 'utf8');
  console.log('📄 Saved updated menu to src/data/menuData.js');

  process.exit(0);
}

updateMenuPrices().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
