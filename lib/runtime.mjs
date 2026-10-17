import path from 'node:path';
import {openStorage} from './storage.mjs';
export const storage=openStorage(path.join(process.env.DATA_DIR||'data','biomed.sqlite'));
