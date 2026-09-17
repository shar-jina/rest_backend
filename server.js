require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 5001;

// MongoDB Database Connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB database successfully!'))
    .catch((err) => console.warn('⚠️ MongoDB Connection warning:', err.message));
}

// Cloudinary Configuration
const hasCloudinaryKeys =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

if (hasCloudinaryKeys) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('☁️ Cloudinary Cloud Storage configured successfully!');
}

// Directories
const BACKEND_DIR = __dirname;
const DATA_DIR = path.join(BACKEND_DIR, 'data');
const UPLOADS_DIR = path.join(BACKEND_DIR, 'uploads');
const MENU_JSON_PATH = path.join(DATA_DIR, 'menuData.json');

const SRC_MENU_JS_PATH = fs.existsSync(path.join(BACKEND_DIR, '..', 'restuarent_website', 'src', 'data', 'menuData.js'))
  ? path.join(BACKEND_DIR, '..', 'restuarent_website', 'src', 'data', 'menuData.js')
  : path.join(BACKEND_DIR, '..', 'src', 'data', 'menuData.js');

const PUBLIC_UPLOADS_DIR = fs.existsSync(path.join(BACKEND_DIR, '..', 'restuarent_website', 'public', 'uploads'))
  ? path.join(BACKEND_DIR, '..', 'restuarent_website', 'public', 'uploads')
  : path.join(BACKEND_DIR, '..', 'public', 'uploads');

// Ensure required directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/uploads', express.static(PUBLIC_UPLOADS_DIR));

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `dish_${Date.now()}_${cleanName}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per image
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

const Menu = require('./models/Menu');

// Helper functions to read and write menu data (MongoDB + JSON fallback)
async function readMenuData() {
  if (mongoose.connection.readyState === 1) {
    try {
      let doc = await Menu.findOne();
      if (!doc) {
        const initialData = readJsonFallback();
        doc = await Menu.create(initialData);
        console.log('🌱 Seeded MongoDB database with initial menu data!');
      }
      const raw = doc.toObject();
      delete raw._id;
      delete raw.__v;
      delete raw.createdAt;
      delete raw.updatedAt;
      return raw;
    } catch (err) {
      console.warn('MongoDB read fallback:', err.message);
    }
  }
  return readJsonFallback();
}

function readJsonFallback() {
  try {
    if (fs.existsSync(MENU_JSON_PATH)) {
      const data = fs.readFileSync(MENU_JSON_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {}

  try {
    if (fs.existsSync(SRC_MENU_JS_PATH)) {
      const content = fs.readFileSync(SRC_MENU_JS_PATH, 'utf8');
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        return JSON.parse(content.substring(start, end + 1));
      }
    }
  } catch (err) {}

  return {};
}

async function writeMenuData(menuData) {
  try {
    if (mongoose.connection.readyState === 1) {
      try {
        await Menu.deleteMany({});
        await Menu.create(menuData);
        console.log('💾 Menu data saved to MongoDB database!');
      } catch (dbErr) {
        console.warn('MongoDB save warning:', dbErr.message);
      }
    }

    // 2. Write to backend/data/menuData.json
    fs.writeFileSync(MENU_JSON_PATH, JSON.stringify(menuData, null, 2), 'utf8');

    // 3. Also write to src/data/menuData.js for codebase consistency
    try {
      const jsContent = 'export const menuData = ' + JSON.stringify(menuData, null, 2) + ';\n';
      fs.writeFileSync(SRC_MENU_JS_PATH, jsContent, 'utf8');
    } catch (e) {}

    return true;
  } catch (err) {
    console.error('Error writing menu data:', err);
    return false;
  }
}

// Routes

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'Kanary Restaurant Backend',
    database: mongoose.connection.readyState === 1 ? 'MongoDB Connected' : 'Local JSON Storage',
    cloudinary: hasCloudinaryKeys ? 'Configured' : 'Local Storage Only',
    timestamp: new Date(),
  });
});

// 2. GET Menu Data
app.get('/api/menu', async (req, res) => {
  const menuData = await readMenuData();
  res.json({ success: true, menuData });
});

// 3. POST / Full Update Menu Data
app.post('/api/menu', async (req, res) => {
  const { menuData } = req.body;
  if (!menuData) {
    return res.status(400).json({ success: false, error: 'No menuData provided' });
  }

  const success = await writeMenuData(menuData);
  if (success) {
    return res.json({ success: true, menuData, message: 'Menu data saved successfully!' });
  } else {
    return res.status(500).json({ success: false, error: 'Failed to save menu data' });
  }
});

// 4. POST Upload Menu Dish Image
app.post('/api/menu/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const localFilename = req.file.filename;
    const localImagePath = `/uploads/${localFilename}`;

    // Copy to public/uploads directory for frontend local static access
    try {
      const publicDest = path.join(PUBLIC_UPLOADS_DIR, localFilename);
      fs.copyFileSync(req.file.path, publicDest);
    } catch (copyErr) {}

    // Upload to Cloudinary CDN if credentials are provided
    if (hasCloudinaryKeys) {
      try {
        const cloudResult = await cloudinary.uploader.upload(req.file.path, {
          folder: 'kanary_restaurant_dishes',
          use_filename: true,
          unique_filename: true,
        });

        console.log(`[Cloudinary Upload] Uploaded to Cloudinary CDN: ${cloudResult.secure_url}`);
        return res.json({
          success: true,
          imagePath: cloudResult.secure_url,
          filename: cloudResult.public_id,
          source: 'cloudinary',
          message: 'Image uploaded to Cloudinary CDN successfully!',
        });
      } catch (cloudErr) {
        console.warn('Cloudinary upload error (falling back to local server storage):', cloudErr.message);
      }
    }

    // Fallback to local server disk storage
    console.log(`[Upload] Image uploaded to local storage: ${localImagePath}`);
    return res.json({
      success: true,
      imagePath: localImagePath,
      filename: localFilename,
      source: 'local',
      message: 'Image uploaded to local storage successfully!',
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 5. POST Add New Dish
app.post('/api/menu/add', async (req, res) => {
  try {
    const { category, dish } = req.body;
    if (!category || !dish || !dish.name) {
      return res.status(400).json({ success: false, error: 'Category and dish name are required' });
    }

    const menuData = await readMenuData();
    if (!menuData[category]) {
      menuData[category] = [];
    }

    const newDish = {
      name: dish.name.trim(),
      price: dish.price,
      description: dish.description ? dish.description.trim() : '',
      spicy: Boolean(dish.spicy),
      veg: Boolean(dish.veg),
      dairy: Boolean(dish.dairy),
      image: dish.image || '/menu-images/Soups/ITM0000557.jpg',
    };

    menuData[category].unshift(newDish);

    const saved = await writeMenuData(menuData);
    if (saved) {
      console.log(`[Add Dish] Added "${newDish.name}" to category "${category}"`);
      return res.json({ success: true, menuData, addedDish: newDish, message: `Dish "${newDish.name}" added successfully` });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to write dish data' });
    }
  } catch (err) {
    console.error('Add Dish Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. PUT Update Existing Dish
app.put('/api/menu/item', async (req, res) => {
  try {
    const { category, index, dish } = req.body;
    if (!category || index === undefined || !dish) {
      return res.status(400).json({ success: false, error: 'Category, index, and dish are required' });
    }

    const menuData = await readMenuData();
    if (!menuData[category] || !menuData[category][index]) {
      return res.status(404).json({ success: false, error: 'Category or dish index not found' });
    }

    menuData[category][index] = {
      ...menuData[category][index],
      ...dish,
    };

    const saved = await writeMenuData(menuData);
    if (saved) {
      return res.json({ success: true, menuData, message: 'Dish updated successfully' });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to write dish update' });
    }
  } catch (err) {
    console.error('Update Dish Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. DELETE Dish from Menu
app.delete('/api/menu/item', async (req, res) => {
  try {
    const category = req.query.category || req.body.category;
    const index = req.query.index !== undefined ? Number(req.query.index) : req.body.index;

    if (!category || index === undefined || isNaN(index)) {
      return res.status(400).json({ success: false, error: 'Category and valid index are required' });
    }

    const menuData = await readMenuData();
    if (!menuData[category]) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const deletedItem = menuData[category][index];
    menuData[category].splice(index, 1);

    const saved = await writeMenuData(menuData);
    if (saved) {
      console.log(`[Delete Dish] Deleted index ${index} from "${category}"`);
      return res.json({
        success: true,
        menuData,
        deletedItem,
        message: `Dish removed successfully from ${category}`,
      });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to delete dish from storage' });
    }
  } catch (err) {
    console.error('Delete Dish Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Restaurant Menu Backend running on http://127.0.0.1:${PORT}`);
  console.log(`📁 Static Uploads served at http://127.0.0.1:${PORT}/uploads`);
  console.log(`====================================================`);
});
