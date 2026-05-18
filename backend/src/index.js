import { env } from './config/env.js';
import { connectDatabase } from './db/connect.js';
import app from './app.js';

async function start() {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
    console.log(`Test route: GET http://localhost:${env.port}/test`);
  });
}

start();
