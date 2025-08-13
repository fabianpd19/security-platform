#!/bin/bash

# Application Deployment Script
# Deploys the security platform with PM2 and proper configuration

set -e

echo "🚀 Desplegando Plataforma Web Segura"
echo "===================================="

# Check if Node.js and PM2 are installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Ejecuta setup-ssl-ubuntu.sh primero."
    exit 1
fi

if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 no está instalado. Ejecuta setup-ssl-ubuntu.sh primero."
    exit 1
fi

# Install dependencies
echo "📦 Instalando dependencias..."
npm install

# Build the application
echo "🔨 Construyendo aplicación..."
npm run build

# Create PM2 ecosystem file
echo "⚙️ Configurando PM2..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'security-platform',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // Add your environment variables here
      // DATABASE_URL: 'your-database-url',
      // JWT_SECRET: 'your-jwt-secret',
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto-restart configuration
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_memory_restart: '1G',
    
    // Health monitoring
    min_uptime: '10s',
    max_restarts: 10,
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Stop existing PM2 processes
echo "🛑 Deteniendo procesos existentes..."
pm2 delete security-platform 2>/dev/null || true

# Start the application
echo "▶️ Iniciando aplicación..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo ""
echo "✅ ¡Aplicación desplegada exitosamente!"
echo ""
echo "📊 Comandos útiles de PM2:"
echo "  pm2 status              - Ver estado de procesos"
echo "  pm2 logs security-platform - Ver logs en tiempo real"
echo "  pm2 restart security-platform - Reiniciar aplicación"
echo "  pm2 reload security-platform  - Recarga sin downtime"
echo "  pm2 monit               - Monitor en tiempo real"
echo ""
echo "🌐 Tu aplicación está corriendo en: http://localhost:3000"
echo "🔒 Acceso HTTPS: https://your-domain.com (después de configurar SSL)"
