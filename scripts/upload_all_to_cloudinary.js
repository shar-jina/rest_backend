require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');

const hasCloudinaryKeys =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

if (!hasCloudinaryKeys) {
  console.error('❌ Error: Cloudinary credentials missing in backend/.env');
  console.error('Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to backend/.env first.');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const BACKEND_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(BACKEND_DIR, 'data');
const MENU_JSON_PATH = path.join(DATA_DIR, 'menuData.json');

const FRONTEND_DIR = fs.existsSync(path.join(BACKEND_DIR, '..', 'restuarent_website'))
  ? path.join(BACKEND_DIR, '..', 'restuarent_website')
  : path.join(BACKEND_DIR, '..');

const potentialPublicDirs = [
  path.join(BACKEND_DIR, '..', 'public'),
  path.join(FRONTEND_DIR, 'public'),
];

const PUBLIC_DIR = potentialPublicDirs.find(d => fs.existsSync(path.join(d, 'menu-images'))) || potentialPublicDirs[0];
const SRC_MENU_JS_PATH = path.join(FRONTEND_DIR, 'src', 'data', 'menuData.js');

const Menu = require('../models/Menu');

// Helper to get all image files recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (/\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

async function runMigration() {
  console.log('====================================================');
  console.log('🚀 Starting Automatic Cloudinary Migration for Menu Images');
  console.log('====================================================');

  // Connect to MongoDB if available
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB Atlas successfully.');
    } catch (err) {
      console.warn('⚠️ MongoDB connection warning:', err.message);
    }
  }

  // 1. Read current menu data
  let menuData = {};
  if (fs.existsSync(MENU_JSON_PATH)) {
    menuData = JSON.parse(fs.readFileSync(MENU_JSON_PATH, 'utf8'));
  } else if (fs.existsSync(SRC_MENU_JS_PATH)) {
    const content = fs.readFileSync(SRC_MENU_JS_PATH, 'utf8');
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      menuData = JSON.parse(content.substring(start, end + 1));
    }
  }

  // 2. Find local menu images folder
  const menuImagesDir = path.join(PUBLIC_DIR, 'menu-images');
  const allImageFiles = getAllFiles(menuImagesDir);
  console.log(`📸 Found ${allImageFiles.length} local dish images in public/menu-images`);

  if (allImageFiles.length === 0) {
    console.log('No local images found to upload.');
    process.exit(0);
  }

  // Map of local relative path -> Cloudinary CDN URL
  const pathToCloudUrlMap = {};

  // 3. Upload images to Cloudinary
  let count = 0;
  for (const filePath of allImageFiles) {
    count++;
    // Get relative path like '/menu-images/grilled/ITM0001361.jpg'
    const relativePath = '/' + path.relative(PUBLIC_DIR, filePath).replace(/\\/g, '/');

    try {
      console.log(`[${count}/${allImageFiles.length}] Uploading ${relativePath} to Cloudinary...`);
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'kanary_restaurant_dishes',
        use_filename: true,
        unique_filename: true,
      });

      pathToCloudUrlMap[relativePath] = result.secure_url;
      // Also map encoded or decoded variations if needed
      pathToCloudUrlMap[decodeURIComponent(relativePath)] = result.secure_url;
      pathToCloudUrlMap[encodeURI(relativePath)] = result.secure_url;
    } catch (err) {
      console.error(`❌ Failed to upload ${relativePath}:`, err.message);
    }
  }

  console.log('\n🔄 Updating menu data with Cloudinary URLs...');

  // 4. Update menuData object with Cloudinary URLs
  let updatedCount = 0;
  Object.keys(menuData).forEach((category) => {
    if (Array.isArray(menuData[category])) {
      menuData[category].forEach((dish) => {
        if (dish.image) {
          const cloudUrl = pathToCloudUrlMap[dish.image] || pathToCloudUrlMap[decodeURIComponent(dish.image)];
          if (cloudUrl) {
            dish.image = cloudUrl;
            updatedCount++;
          }
        }
      });
    }
  });

  console.log(`✨ Replaced ${updatedCount} dish images with Cloudinary CDN URLs!`);

  // 5. Save updated menu data to MongoDB Atlas, menuData.json, and menuData.js
  if (mongoose.connection.readyState === 1) {
    try {
      await Menu.deleteMany({});
      await Menu.create(menuData);
      console.log('💾 Saved updated menu data to MongoDB Atlas database!');
    } catch (dbErr) {
      console.warn('MongoDB save warning:', dbErr.message);
    }
  }

  fs.writeFileSync(MENU_JSON_PATH, JSON.stringify(menuData, null, 2), 'utf8');
  console.log('📄 Saved updated menu data to backend/data/menuData.json');

  try {
    const jsContent = 'export const menuData = ' + JSON.stringify(menuData, null, 2) + ';\n';
    fs.writeFileSync(SRC_MENU_JS_PATH, jsContent, 'utf8');
    console.log('📄 Saved updated menu data to src/data/menuData.js');
  } catch (e) {}

  console.log('\n🎉 ALL DONE! All menu images are now stored on Cloudinary & synced to MongoDB Atlas.');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
