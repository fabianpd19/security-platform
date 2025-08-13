#!/bin/bash

# SSL/TLS Setup Script for Ubuntu Server
# This script sets up SSL certificates and HTTPS configuration

set -e

echo "🔒 Configurando SSL/TLS para Plataforma Web Segura"
echo "=================================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ No ejecutes este script como root. Usa un usuario con sudo."
   exit 1
fi

# Update system
echo "📦 Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "📦 Instalando paquetes necesarios..."
sudo apt install -y nginx certbot python3-certbot-nginx ufw nodejs npm

# Install PM2 for process management
echo "📦 Instalando PM2..."
sudo npm install -g pm2

# Configure firewall
echo "🔥 Configurando firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create nginx configuration
echo "🌐 Configurando Nginx..."
sudo tee /etc/nginx/sites-available/security-platform > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:;" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/your-domain.com/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # Proxy to Next.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Security headers for proxied content
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Server \$host;
    }
    
    # Security.txt file
    location /.well-known/security.txt {
        alias /var/www/html/security.txt;
    }
    
    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|log|config)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/security-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "🧪 Probando configuración de Nginx..."
sudo nginx -t

# Create security.txt file
echo "📄 Creando archivo security.txt..."
sudo mkdir -p /var/www/html
sudo tee /var/www/html/security.txt > /dev/null <<EOF
Contact: security@your-domain.com
Expires: $(date -d '+1 year' --iso-8601)
Encryption: https://your-domain.com/pgp-key.txt
Preferred-Languages: es, en
Canonical: https://your-domain.com/.well-known/security.txt
Policy: https://your-domain.com/security-policy
EOF

# Restart nginx
echo "🔄 Reiniciando Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "✅ Configuración básica completada!"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Reemplaza 'your-domain.com' con tu dominio real en:"
echo "   - /etc/nginx/sites-available/security-platform"
echo "   - /var/www/html/security.txt"
echo ""
echo "2. Obtén certificados SSL con Let's Encrypt:"
echo "   sudo certbot --nginx -d your-domain.com -d www.your-domain.com"
echo ""
echo "3. Configura renovación automática:"
echo "   sudo crontab -e"
echo "   Agrega: 0 12 * * * /usr/bin/certbot renew --quiet"
echo ""
echo "4. Instala y configura tu aplicación Next.js"
echo "5. Inicia la aplicación con PM2"
echo ""
echo "🔒 ¡Tu servidor estará listo para HTTPS!"
EOF

chmod +x scripts/setup-ssl-ubuntu.sh
