/**
 * PM2 ecosystem config for CSR Studio deployment.
 * Run from /var/www/csr-studio: pm2 start ecosystem.config.cjs
 *
 * Expected layout:
 *   /var/www/csr-studio/
 *     backend/   (csr-studio-backend) - Express on port 3001
 *     frontend/  (csr-studio-frontend) - Next.js on port 3000
 *     logs/
 */
const root = __dirname
module.exports = {
  apps: [
    {
      name: 'csr-studio-api',
      cwd: root + '/backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: '3001' },
      error_file: root + '/logs/csr-studio-api.err.log',
      out_file: root + '/logs/csr-studio-api.out.log',
    },
    {
      name: 'csr-studio-web',
      cwd: root + '/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      error_file: root + '/logs/csr-studio-web.err.log',
      out_file: root + '/logs/csr-studio-web.out.log',
    },
  ],
}
