// src/app.js
import express from 'express';
import session from 'express-session';
import FileStoreFactory from 'session-file-store';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';

import authRouter from './routes/auth.js';
import requestRouter from './routes/requests.js';
import approvalsRouter from './routes/approvals.js';
import servicesRouter from './routes/services.js';
import usersRouter from './routes/users.js';
import notificationsRouter from './routes/notifications.js';
import implementationsRouter from './routes/implementations.js';
import statsRouter from './routes/stats.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const FileStore = FileStoreFactory(session);

// CORS for Vite dev server
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.set('trust proxy', 1);
app.use(session({
  store: new FileStore({ path: path.join(__dirname, '..', '..', 'db', 'sessions') }),
  secret: process.env.SESSION_SECRET || 'change-me-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Mount routers
app.use('/api/auth', authRouter);
app.use('/api/requests', requestRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/implementations', implementationsRouter);
app.use('/api/stats', statsRouter);

export default app;
