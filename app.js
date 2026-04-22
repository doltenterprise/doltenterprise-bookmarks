const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getDatabase, persist } = require('./db/init');

const CONFIG_PATH = path.join(__dirname, 'config.json');
let config = { isSetup: false, siteName: 'LinkBoard', siteDescription: 'Simple, self-hosted bookmarks.', databasePath: 'bookmarks.sqlite', logoUrl: '' };

if (fs.existsSync(CONFIG_PATH)) {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    config = { ...config, ...savedConfig };
  } catch (e) {
    console.error('Error parsing config.json', e);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/docs', express.static(path.join(__dirname, 'docs/.vitepress/dist')));
app.use(express.urlencoded({ extended: true }));

// Setup Check Middleware
app.use((req, res, next) => {
  if (!config.isSetup && req.path !== '/setup' && !req.path.startsWith('/css') && !req.path.startsWith('/js')) {
    return res.redirect('/setup');
  }
  next();
});

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './' }),
  secret: process.env.SESSION_SECRET || 'dolt-secret-gold-navy',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));

let db;
const saveDb = () => persist(db, config.databasePath);

(async () => {
  if (config.isSetup) {
    db = await getDatabase(config.databasePath);
    // Migration for existing databases
    try {
      db.run("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0");
    } catch (e) {}
    try {
      db.run("ALTER TABLE users ADD COLUMN created_at DATETIME");
      db.run("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
    } catch (e) {}
    saveDb();

    // Ensure at least one admin exists (the first user)
    const adminCheck = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_admin = 1");
    if (adminCheck.step() && adminCheck.getAsObject().count === 0) {
      db.run("UPDATE users SET is_admin = 1 WHERE id = (SELECT id FROM users ORDER BY id ASC LIMIT 1)");
      saveDb();
    }
    adminCheck.free();
  }
})().catch(err => console.error('Database initialization failed:', err));

app.use((req, res, next) => {
  if (req.session.userId && req.session.isAdmin === undefined) {
    const stmt = db.prepare("SELECT is_admin FROM users WHERE id = ?");
    stmt.bind([req.session.userId]);
    if (stmt.step()) {
      req.session.isAdmin = !!stmt.getAsObject().is_admin;
    }
    stmt.free();
  }
  res.locals.user = req.session.username || null;
  res.locals.isAdmin = req.session.isAdmin || false;
  res.locals.config = config;
  next();
});

// Auth Middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) return next();
  res.redirect('/login');
};

const isAdmin = (req, res, next) => {
  if (req.session.userId && req.session.isAdmin) return next();
  res.status(403).send('Unauthorized: Admin access required');
};

// Routes
app.get('/', async (req, res) => {
  if (!req.session.userId) {
    return res.render('landing');
  }
  const userId = req.session.userId;
  const search = req.query.q || '';
  
  const categoriesStmt = db.prepare("SELECT * FROM categories WHERE user_id = ?");
  categoriesStmt.bind([userId]);
  const categories = [];
  while(categoriesStmt.step()) categories.push(categoriesStmt.getAsObject());
  categoriesStmt.free();

  let query = "SELECT b.*, c.name as category_name, c.color as category_color FROM bookmarks b LEFT JOIN categories c ON b.category_id = c.id WHERE b.user_id = ?";
  let params = [userId];
  
  if (search) {
    query += " AND (b.title LIKE ? OR b.url LIKE ? OR b.description LIKE ? OR b.tags LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  
  query += " ORDER BY b.created_at DESC";
  
  const bookmarksStmt = db.prepare(query);
  bookmarksStmt.bind(params);
  const bookmarks = [];
  while(bookmarksStmt.step()) bookmarks.push(bookmarksStmt.getAsObject());
  bookmarksStmt.free();

  // Group by category
  const grouped = categories.map(cat => ({
    ...cat,
    bookmarks: bookmarks.filter(b => b.category_id === cat.id)
  }));
  
  const uncategorized = bookmarks.filter(b => !b.category_id);

  res.render('index', { grouped, uncategorized, search });
});

app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
  stmt.bind([username]);
  const user = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();

  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.isAdmin = !!user.is_admin;
    return res.redirect('/');
  }
  res.render('login', { error: 'Invalid credentials' });
});

app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword]);
    saveDb();
    res.redirect('/login');
  } catch (e) {
    res.render('register', { error: 'Username already exists' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// User Management (Admin Only)
app.post('/users/add', isAdmin, async (req, res) => {
  const { username, password, is_admin } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    db.run("INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)", [username, hashedPassword, is_admin ? 1 : 0]);
    saveDb();
    res.redirect('/profile');
  } catch (e) {
    res.status(500).send('Error adding user: ' + e.message);
  }
});

app.post('/users/delete/:id', isAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.session.userId) {
    return res.status(400).send('You cannot delete yourself');
  }
  db.run("DELETE FROM users WHERE id = ?", [req.params.id]);
  saveDb();
  res.redirect('/profile');
});

app.post('/users/toggle-admin/:id', isAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.session.userId) {
    return res.status(400).send('You cannot change your own admin status');
  }
  db.run("UPDATE users SET is_admin = 1 - is_admin WHERE id = ?", [req.params.id]);
  saveDb();
  res.redirect('/profile');
});

app.post('/users/edit/:id', isAdmin, async (req, res) => {
  const { username, password } = req.body;
  const userId = req.params.id;

  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run("UPDATE users SET username = ?, password = ? WHERE id = ?", [username, hashedPassword, userId]);
    } else {
      db.run("UPDATE users SET username = ? WHERE id = ?", [username, userId]);
    }
    saveDb();
    res.redirect('/profile');
  } catch (e) {
    res.status(500).send('Error updating user: ' + e.message);
  }
});

app.post('/profile/update-password', isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session.userId;

  const stmt = db.prepare("SELECT password FROM users WHERE id = ?");
  stmt.bind([userId]);
  const user = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();

  if (user && await bcrypt.compare(currentPassword, user.password)) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
    saveDb();
    return res.redirect('/profile?success=password');
  }
  res.redirect('/profile?error=invalid_password');
});

app.post('/config/update', isAdmin, (req, res) => {
  const { siteName, siteDescription, logoUrl } = req.body;
  config.siteName = siteName;
  config.siteDescription = siteDescription;
  config.logoUrl = logoUrl;
  
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  res.redirect('/profile');
});

// Category Management
app.get('/categories', isAuthenticated, (req, res) => {
  const stmt = db.prepare("SELECT * FROM categories WHERE user_id = ?");
  stmt.bind([req.session.userId]);
  const categories = [];
  while(stmt.step()) categories.push(stmt.getAsObject());
  stmt.free();
  res.render('categories', { categories });
});

app.post('/categories', isAuthenticated, (req, res) => {
  const { name, icon } = req.body;
  db.run("INSERT INTO categories (user_id, name, icon) VALUES (?, ?, ?)", [req.session.userId, name, icon || 'glyphicon-folder-open']);
  saveDb();
  res.redirect('/categories');
});

app.post('/categories/delete/:id', isAuthenticated, (req, res) => {
  db.run("DELETE FROM categories WHERE id = ? AND user_id = ?", [req.params.id, req.session.userId]);
  db.run("UPDATE bookmarks SET category_id = NULL WHERE category_id = ?", [req.params.id]);
  saveDb();
  res.redirect('/categories');
});

app.post('/categories/public/:id', isAuthenticated, (req, res) => {
  const userId = req.session.userId;
  const categoryId = req.params.id;

  const stmt = db.prepare("SELECT * FROM categories WHERE id = ? AND user_id = ?");
  stmt.bind([categoryId, userId]);
  const category = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();

  if (!category) return res.redirect('/categories');

  if (category.public_slug) {
    db.run("UPDATE categories SET public_slug = NULL WHERE id = ?", [categoryId]);
  } else {
    const slug = crypto.randomBytes(4).toString('hex') + '-' + categoryId;
    db.run("UPDATE categories SET public_slug = ? WHERE id = ?", [slug, categoryId]);
  }
  saveDb();
  res.redirect('/categories');
});

// Bookmark Management
app.get('/bookmarks/new', isAuthenticated, (req, res) => {
  const stmt = db.prepare("SELECT * FROM categories WHERE user_id = ?");
  stmt.bind([req.session.userId]);
  const categories = [];
  while(stmt.step()) categories.push(stmt.getAsObject());
  stmt.free();
  res.render('bookmark_form', { bookmark: {}, categories, title: 'Add Bookmark' });
});

// Check Slug Uniqueness
app.get('/api/check-slug/:slug', isAuthenticated, (req, res) => {
  const slug = req.params.slug;
  const stmt = db.prepare("SELECT COUNT(*) as count FROM categories WHERE public_slug = ?");
  stmt.bind([slug]);
  const result = stmt.step() ? stmt.getAsObject() : { count: 0 };
  stmt.free();
  
  if (result.count === 0) {
    res.json({ unique: true, message: 'Available!', color: '#3c763d' }); // Success Green
  } else {
    res.json({ unique: false, message: 'Already in use.', color: '#a94442' }); // Error Red
  }
});

// Update Slug
app.post('/categories/slug/:id', isAuthenticated, (req, res) => {
  const { slug } = req.body;
  const categoryId = req.params.id;
  
  // Basic validation: alphanumeric and hyphens
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    return res.status(400).send('Invalid slug format');
  }

  try {
    db.run("UPDATE categories SET public_slug = ? WHERE id = ? AND user_id = ?", [slug, categoryId, req.session.userId]);
    saveDb();
    res.redirect('/categories');
  } catch (e) {
    res.status(500).send('Error updating slug. It might already be in use.');
  }
});

app.post('/bookmarks', isAuthenticated, (req, res) => {
  const { title, url, description, tags, category_id } = req.body;
  db.run("INSERT INTO bookmarks (user_id, category_id, title, url, description, tags) VALUES (?, ?, ?, ?, ?, ?)", 
    [req.session.userId, category_id || null, title, url, description, tags]);
  saveDb();
  res.redirect('/');
});

app.get('/bookmarks/edit/:id', isAuthenticated, (req, res) => {
  const bStmt = db.prepare("SELECT * FROM bookmarks WHERE id = ? AND user_id = ?");
  bStmt.bind([req.params.id, req.session.userId]);
  const bookmark = bStmt.step() ? bStmt.getAsObject() : null;
  bStmt.free();
  
  if (!bookmark) return res.redirect('/');
  
  const cStmt = db.prepare("SELECT * FROM categories WHERE user_id = ?");
  cStmt.bind([req.session.userId]);
  const categories = [];
  while(cStmt.step()) categories.push(cStmt.getAsObject());
  cStmt.free();
  
  res.render('bookmark_form', { bookmark, categories, title: 'Edit Bookmark' });
});

app.post('/bookmarks/edit/:id', isAuthenticated, (req, res) => {
  const { title, url, description, tags, category_id } = req.body;
  db.run("UPDATE bookmarks SET title=?, url=?, description=?, tags=?, category_id=? WHERE id=? AND user_id=?", 
    [title, url, description, tags, category_id || null, req.params.id, req.session.userId]);
  saveDb();
  res.redirect('/');
});

app.post('/bookmarks/delete/:id', isAuthenticated, (req, res) => {
  db.run("DELETE FROM bookmarks WHERE id = ? AND user_id = ?", [req.params.id, req.session.userId]);
  saveDb();
  res.redirect('/');
});

app.get('/profile', isAuthenticated, (req, res) => {
  const userId = req.session.userId;
  
  const bCountStmt = db.prepare("SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?");
  bCountStmt.bind([userId]);
  const bookmarkCount = bCountStmt.step() ? bCountStmt.getAsObject().count : 0;
  bCountStmt.free();

  const cCountStmt = db.prepare("SELECT COUNT(*) as count FROM categories WHERE user_id = ?");
  cCountStmt.bind([userId]);
  const categoryCount = cCountStmt.step() ? cCountStmt.getAsObject().count : 0;
  cCountStmt.free();

  let users = [];
  if (req.session.isAdmin) {
    const usersStmt = db.prepare("SELECT id, username, is_admin, created_at FROM users");
    while (usersStmt.step()) users.push(usersStmt.getAsObject());
    usersStmt.free();
  }

  res.render('profile', { 
    stats: { bookmarks: bookmarkCount, categories: categoryCount },
    users,
    query: req.query
  });
});

// Public Page
app.get('/p/:slug', async (req, res) => {
  const slug = req.params.slug;
  const cStmt = db.prepare("SELECT c.*, u.username FROM categories c JOIN users u ON c.user_id = u.id WHERE c.public_slug = ?");
  cStmt.bind([slug]);
  const category = cStmt.step() ? cStmt.getAsObject() : null;
  cStmt.free();

  if (!category) return res.status(404).send('Page not found');

  const bStmt = db.prepare("SELECT * FROM bookmarks WHERE category_id = ? ORDER BY created_at DESC");
  bStmt.bind([category.id]);
  const bookmarks = [];
  while(bStmt.step()) bookmarks.push(bStmt.getAsObject());
  bStmt.free();

  res.render('public', { category, bookmarks, hideNavbar: true });
});

app.get('/setup', (req, res) => {
  if (config.isSetup) return res.redirect('/');
  res.render('setup');
});

app.post('/setup', async (req, res) => {
  if (config.isSetup) return res.redirect('/');
  
  try {
    const { databasePath, siteName, siteDescription, adminUsername, adminPassword } = req.body;
    
    // 1. Initialize DB first to catch path errors early
    db = await getDatabase(databasePath);
    
    // 2. Create Admin Account
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [adminUsername, hashedPassword]);
    
    // 3. Update and Save Config ONLY after DB success
    config.databasePath = databasePath;
    config.siteName = siteName;
    config.siteDescription = siteDescription;
    config.isSetup = true;
    
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    saveDb();
    
    res.redirect('/login');
  } catch (e) {
    console.error('Setup failed:', e);
    res.render('setup', { error: 'Setup failed: ' + e.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404');
});

// 500 Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { error: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`LinkBoard running on http://localhost:${PORT}`));
}

module.exports = app; // For tests
