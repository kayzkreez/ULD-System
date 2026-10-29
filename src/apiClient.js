import { db } from './mongo-compat/firestore';
import { auth } from './mongo-compat/auth';
import { storage } from './mongo-compat/storage';
import { functions } from './mongo-compat/functions';
export { auth, db, storage, functions };
export const apiConfigured = true;
