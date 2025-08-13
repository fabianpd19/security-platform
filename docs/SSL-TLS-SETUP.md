# Configuración SSL/TLS para Plataforma Web Segura

Esta guía detalla la configuración completa de SSL/TLS para asegurar las comunicaciones de la plataforma web segura en Ubuntu Server.

## 🔒 Características de Seguridad Implementadas

- **TLS 1.2 y 1.3**: Protocolos modernos de cifrado
- **HSTS**: HTTP Strict Transport Security
- **OCSP Stapling**: Verificación de estado de certificados
- **Perfect Forward Secrecy**: Cifrado con claves efímeras
- **Headers de Seguridad**: Protección contra ataques comunes
- **Certificate Transparency**: Monitoreo de certificados

## 📋 Requisitos Previos

- Ubuntu Server 20.04 LTS o superior
- Dominio configurado apuntando al servidor
- Acceso root o sudo
- Puertos 80 y 443 abiertos

## 🚀 Instalación Automática

### Paso 1: Ejecutar Script de Configuración

\`\`\`bash
# Clonar el repositorio
git clone <repository-url>
cd security-platform

# Hacer ejecutable el script
chmod +x scripts/setup-ssl-ubuntu.sh

# Ejecutar configuración
./scripts/setup-ssl-ubuntu.sh
\`\`\`

### Paso 2: Configurar Dominio

Editar la configuración de Nginx:

\`\`\`bash
sudo nano /etc/nginx/sites-available/security-platform
\`\`\`

Reemplazar `your-domain.com` con tu dominio real.

### Paso 3: Obtener Certificados SSL

\`\`\`bash
# Obtener certificados de Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Verificar configuración
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

### Paso 4: Desplegar Aplicación

\`\`\`bash
# Instalar dependencias y construir
npm install
npm run build

# Desplegar con PM2
./scripts/deploy-app.sh
\`\`\`

## 🔧 Configuración Manual

### 1. Instalar Nginx y Certbot

\`\`\`bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
\`\`\`

### 2. Configurar Nginx

Crear archivo de configuración:

\`\`\`bash
sudo nano /etc/nginx/sites-available/security-platform
\`\`\`

Contenido de configuración (ver archivo completo en `scripts/setup-ssl-ubuntu.sh`).

### 3. Configurar Firewall

\`\`\`bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
\`\`\`

### 4. Obtener Certificados

\`\`\`bash
sudo certbot --nginx -d your-domain.com
\`\`\`

### 5. Configurar Renovación Automática

\`\`\`bash
sudo crontab -e
# Agregar línea:
0 12 * * * /usr/bin/certbot renew --quiet
\`\`\`

## 🛡️ Headers de Seguridad Implementados

### HSTS (HTTP Strict Transport Security)
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
