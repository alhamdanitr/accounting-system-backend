const net = require('net');
const { URL } = require('url');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const url = new URL(dbUrl);
const port = url.port || 5432;
const host = url.hostname;

function checkConnection() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 2000;

    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function start() {
  console.log(`Checking database connectivity at ${host}:${port}...`);
  for (let i = 0; i < 30; i++) {
    const isReady = await checkConnection();
    if (isReady) {
      console.log('Database is reachable!');
      process.exit(0);
    }
    console.log(`Database not reachable (attempt ${i + 1}/30). Retrying in 3 seconds...`);
    await new Promise(r => setTimeout(resolve, 3000));
  }
  console.error('Database connection timed out.');
  process.exit(1);
}

// Fix typo in start function: resolve -> r
async function startFixed() {
  console.log(`Checking database connectivity at ${host}:${port}...`);
  for (let i = 0; i < 30; i++) {
    const isReady = await checkConnection();
    if (isReady) {
      console.log('Database is reachable!');
      process.exit(0);
    }
    console.log(`Database not reachable (attempt ${i + 1}/30). Retrying in 3 seconds...`);
    await new Promise(r => setTimeout(r, 3000));
  }
  console.error('Database connection timed out.');
  process.exit(1);
}

startFixed();
