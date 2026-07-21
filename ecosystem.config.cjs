module.exports = {
  apps: [{
    name: 'clawthon',
    script: 'dist/src/index.js',
    cwd: '/home/adm-bot/clawthon',
    autorestart: true,
    max_restarts: 5,
    restart_delay: 5000,
    max_memory_restart: '300M',
    env_file: '/home/adm-bot/clawthon/.env',
  }]
};
