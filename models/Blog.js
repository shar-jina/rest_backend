const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: "CHEF'S SECRETS",
  },
  categoryColor: {
    type: String,
    default: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  date: {
    type: String,
    default: () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  },
  readTime: {
    type: String,
    default: '4 min read',
  },
  author: {
    type: String,
    default: 'Chef Rahil Varma',
  },
  authorRole: {
    type: String,
    default: 'Head Culinary Director',
  },
  image: {
    type: String,
    required: true,
  },
  excerpt: {
    type: String,
    default: '',
  },
  content: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Blog', BlogSchema);
