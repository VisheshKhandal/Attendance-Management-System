import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

function assertRequiredEnv(name, value) {
  if (value === undefined || value === '') {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '30m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
};

assertRequiredEnv('MONGODB_URI', env.mongoUri);
assertRequiredEnv('ACCESS_TOKEN_SECRET', env.accessTokenSecret);
assertRequiredEnv('REFRESH_TOKEN_SECRET', env.refreshTokenSecret);

export { env };
