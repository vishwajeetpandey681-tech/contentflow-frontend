/**
 * PM2 ecosystem config — Charcha Express
 * Run from /opt/contentflow-frontend:  pm2 start ecosystem.config.cjs
 *
 * Frontend : Next.js  on port 3000  (/opt/contentflow-frontend)
 * Backend  : Express  on port 4500  (/opt/contentflow-backend)  — optional
 */
const frontendDir = '/opt/contentflow-frontend'
const backendDir  = '/opt/contentflow-backend'
const logsDir     = '/opt/logs'

const fs = require('fs')

const apps = [
  {
    name: 'contentflow-web',
    cwd: frontendDir,
    script: 'node_modules/next/dist/bin/next',
    args: `start -p 3000`,
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production' },
    error_file: logsDir + '/contentflow-web.err.log',
    out_file:   logsDir + '/contentflow-web.out.log',
  },
]

// Add backend only if its directory exists
if (fs.existsSync(backendDir)) {
  apps.push({
    name: 'contentflow-api',
    cwd: backendDir,
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production', PORT: '4500' },
    error_file: logsDir + '/contentflow-api.err.log',
    out_file:   logsDir + '/contentflow-api.out.log',
  })
}

module.exports = { apps }
