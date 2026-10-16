require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initStore, getStorageMode } = require('./services/store');
const { ensureInitialAdmin } = require('./services/auth');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const publicDir = path.join(__dirname, '..', 'public');

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  if (isProduction) throw new Error('SESSION_SECRET must be set to a random value of at least 32 characters in production.');
  process.env.SESSION_SECRET = 'local-development-secret-change-before-deploy-2026';
  console.warn('[security] Using a development session secret. Set SESSION_SECRET in .env before deployment.');
}
if (isProduction && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production for persistent PostgreSQL-backed sessions. See README.md.');

app.disable('x-powered-by');
app.set('trust proxy', isProduction ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"]
  } }, crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(session({
  name: 'zynocta.sid', secret: process.env.SESSION_SECRET,
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, secure: isProduction, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
  ...(process.env.DATABASE_URL ? { store: createPgStore() } : {})
}));
function createPgStore(){ const PgSession=require('connect-pg-simple')(session); return new PgSession({conString:process.env.DATABASE_URL,createTableIfMissing:true,tableName:'user_sessions',ttl:8*60*60}); }
app.use('/api/admin/login', rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:true,legacyHeaders:false,message:{error:'Too many sign-in attempts. Please wait and try again.'}}));
app.use('/api/admin', rateLimit({windowMs:60*1000,limit:120,standardHeaders:true,legacyHeaders:false}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');next();});
app.use('/api', (req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
app.use('/vendor', express.static(path.join(__dirname,'..','node_modules','pdfjs-dist','build'),{fallthrough:false,immutable:true,maxAge:'7d'}));
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.get('/read/:id', (req,res)=>res.sendFile(path.join(publicDir,'reader.html')));
app.use(express.static(publicDir,{index:'index.html',fallthrough:true,etag:true,maxAge:isProduction?'1h':0}));
app.use((req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'API endpoint not found.'});res.status(404).sendFile(path.join(publicDir,'index.html'));});
app.use((err,req,res,next)=>{console.error('[error]',err.message);if(res.headersSent)return next(err);const status=err.status||err.statusCode||500;res.status(status).json({error:status>=500?'Something went wrong. Please try again.':err.message});});
(async()=>{try{await initStore();await ensureInitialAdmin();app.listen(PORT,()=>console.log(`Zynocta Cyber Academy running at http://localhost:${PORT} (${getStorageMode()} mode)`));}catch(err){console.error('Startup failed:',err);process.exit(1);}})();
