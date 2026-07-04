const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`SecureFin Auth Module listening on http://localhost:${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
  if (!env.cookieSecure) {
    console.log('Note: COOKIE_SECURE=false — enable HTTPS/TLS and COOKIE_SECURE=true in production');
  }
});
