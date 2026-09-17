require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const BACKEND_DIR = path.join(__dirname, '..');
const MENU_JSON_PATH = path.join(BACKEND_DIR, 'data', 'menuData.json');
const FRONTEND_DIR = path.join(BACKEND_DIR, '..', 'restuarent_website');
const SRC_MENU_JS_PATH = path.join(FRONTEND_DIR, 'src', 'data', 'menuData.js');
const ALL_IMAGES_JS_PATH = path.join(FRONTEND_DIR, 'src', 'data', 'allImagesData.js');

const Menu = require('../models/Menu');

async function syncCloudinary() {
  console.log('Fetching all uploaded Cloudinary images...');
  
  // Fetch up to 500 images from Cloudinary
  const response = await cloudinary.api.resources({
    type: 'upload',
    prefix: 'kanary_restaurant_dishes',
    max_results: 500,
  });

  console.log(`Found ${response.resources.length} images on Cloudinary.`);

  // Build filename map: e.g. "ITM0000541" or "ITM0000541.jpg" -> secure_url
  const filenameToUrl = {};
  response.resources.forEach((item) => {
    const publicId = item.public_id; // e.g. "kanary_restaurant_dishes/ITM0000541_xyz"
    const baseName = path.basename(publicId); // "ITM0000541_xyz"
    // Extract original item code like "ITM0000541"
    const itemCodeMatch = baseName.match(/ITM\d+/i);
    if (itemCodeMatch) {
      const code = itemCodeMatch[0].toUpperCase();
      filenameToUrl[code] = item.secure_url;
      filenameToUrl[`${code}.jpg`] = item.secure_url;
      filenameToUrl[`${code}.png`] = item.secure_url;
    }
  });

  // Default fallback Cloudinary URL if dish has no image
  const defaultCloudinaryUrl = response.resources[0]?.secure_url || '';

  // 1. Update allImagesData.js so every item in allImagesByFolder uses Cloudinary URLs
  if (fs.existsSync(ALL_IMAGES_JS_PATH)) {
    const rawAllImages = fs.readFileSync(ALL_IMAGES_JS_PATH, 'utf8');
    const jsonMatch = rawAllImages.match(/export const allImagesByFolder = ({[\s\S]*});/);
    if (jsonMatch) {
      let foldersObj = eval('(' + jsonMatch[1] + ')');
      let updatedImagesCount = 0;

      Object.keys(foldersObj).forEach((folder) => {
        foldersObj[folder] = foldersObj[folder].map((imgObj) => {
          const fileBase = path.basename(imgObj.filename, path.extname(imgObj.filename)).toUpperCase();
          const itemCodeMatch = fileBase.match(/ITM\d+/i);
          const code = itemCodeMatch ? itemCodeMatch[0] : fileBase;
          const cloudUrl = filenameToUrl[code] || filenameToUrl[`${code}.jpg`] || imgObj.path;
          if (cloudUrl.startsWith('http')) {
            updatedImagesCount++;
          }
          return {
            filename: imgObj.filename,
            path: cloudUrl,
          };
        });
      });

      const newContent = `export const allImagesByFolder = ${JSON.stringify(foldersObj, null, 2)};\n`;
      fs.writeFileSync(ALL_IMAGES_JS_PATH, newContent, 'utf8');
      console.log(`✅ Updated src/data/allImagesData.js! (${updatedImagesCount} Cloudinary URLs mapped)`);
    }
  }

  // 2. Connect to MongoDB Atlas and update all menu items
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB Atlas.');
    } catch (err) {
      console.warn('MongoDB warning:', err.message);
    }
  }

  let menuData = {};
  if (fs.existsSync(MENU_JSON_PATH)) {
    menuData = JSON.parse(fs.readFileSync(MENU_JSON_PATH, 'utf8'));
  }

  let dishesUpdated = 0;
  Object.keys(menuData).forEach((cat) => {
    if (Array.isArray(menuData[cat])) {
      menuData[cat].forEach((dish) => {
        if (!dish.image || dish.image.startsWith('/menu-images') || dish.image.startsWith('/uploads')) {
          const itemCodeMatch = (dish.image || dish.name || '').match(/ITM\d+/i);
          if (itemCodeMatch && filenameToUrl[itemCodeMatch[0].toUpperCase()]) {
            dish.image = filenameToUrl[itemCodeMatch[0].toUpperCase()];
            dishesUpdated++;
          } else if (!dish.image || dish.image.startsWith('/menu-images')) {
            dish.image = defaultCloudinaryUrl;
            dishesUpdated++;
          }
        }
      });
    }
  });

  console.log(`✅ Updated ${dishesUpdated} dish image paths in menu dataset to Cloudinary CDN URLs.`);

  // 3. Save to MongoDB, menuData.json, and menuData.js
  if (mongoose.connection.readyState === 1) {
    await Menu.deleteMany({});
    await Menu.create(menuData);
    console.log('💾 Saved synced menu to MongoDB Atlas!');
  }

  fs.writeFileSync(MENU_JSON_PATH, JSON.stringify(menuData, null, 2), 'utf8');
  console.log('📄 Saved to backend/data/menuData.json');

  const jsContent = 'export const menuData = ' + JSON.stringify(menuData, null, 2) + ';\n';
  fs.writeFileSync(SRC_MENU_JS_PATH, jsContent, 'utf8');
  console.log('📄 Saved to src/data/menuData.js');

  process.exit(0);
}

syncCloudinary().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
