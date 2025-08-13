#!/bin/bash

# Security Audit Script for the Security Platform
# Performs comprehensive security checks and generates reports

set -e

echo "🔍 Iniciando Auditoría de Seguridad"
echo "=================================="

AUDIT_DATE=$(date +"%Y-%m-%d_%H-%M-%S")
AUDIT_DIR="./security-audits/$AUDIT_DATE"
mkdir -p "$AUDIT_DIR"

# Function to log results
log_result() {
    echo "$1" | tee -a "$AUDIT_DIR/audit-summary.txt"
}

log_result "Auditoría de Seguridad - $(date)"
log_result "=================================="

# 1. Check for security updates
echo "📦 Verificando actualizaciones de seguridad..."
if command -v npm &> /dev/null; then
    npm audit --audit-level=moderate > "$AUDIT_DIR/npm-audit.json" 2>&1 || true
    VULNERABILITIES=$(npm audit --audit-level=moderate --json 2>/dev/null | jq -r '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "0")
    log_result "Vulnerabilidades en dependencias: $VULNERABILITIES"
fi

# 2. Check SSL/TLS configuration
echo "🔒 Verificando configuración SSL/TLS..."
if command -v openssl &> /dev/null; then
    # Check if nginx is running and configured
    if systemctl is-active --quiet nginx 2>/dev/null; then
        log_result "✅ Nginx está activo"
        
        # Check SSL certificate (if domain is configured)
        if [ -f "/etc/nginx/sites-enabled/security-platform" ]; then
            DOMAIN=$(grep -o "server_name [^;]*" /etc/nginx/sites-enabled/security-platform | head -1 | cut -d' ' -f2 | tr -d ';')
            if [ "$DOMAIN" != "your-domain.com" ] && [ -n "$DOMAIN" ]; then
                echo "Verificando certificado SSL para $DOMAIN..."
                openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | openssl x509 -noout -dates > "$AUDIT_DIR/ssl-cert-info.txt" 2>&1 || true
                log_result "✅ Información de certificado SSL guardada"
            else
                log_result "⚠️ Dominio no configurado en Nginx"
            fi
        fi
    else
        log_result "❌ Nginx no está activo"
    fi
fi

# 3. Check firewall status
echo "🔥 Verificando configuración del firewall..."
if command -v ufw &> /dev/null; then
    ufw status > "$AUDIT_DIR/firewall-status.txt" 2>&1
    if ufw status | grep -q "Status: active"; then
        log_result "✅ UFW firewall está activo"
    else
        log_result "❌ UFW firewall está inactivo"
    fi
fi

# 4. Check for failed login attempts
echo "🚨 Verificando intentos de login fallidos..."
if [ -f "/var/log/auth.log" ]; then
    FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | wc -l 2>/dev/null || echo "0")
    log_result "Intentos de login fallidos (auth.log): $FAILED_LOGINS"
    
    # Get recent failed attempts
    grep "Failed password" /var/log/auth.log | tail -10 > "$AUDIT_DIR/recent-failed-logins.txt" 2>/dev/null || true
fi

# 5. Check system updates
echo "🔄 Verificando actualizaciones del sistema..."
if command -v apt &> /dev/null; then
    apt list --upgradable 2>/dev/null | wc -l > "$AUDIT_DIR/system-updates-count.txt"
    UPDATES=$(cat "$AUDIT_DIR/system-updates-count.txt")
    log_result "Actualizaciones de sistema disponibles: $UPDATES"
fi

# 6. Check running services
echo "🔧 Verificando servicios en ejecución..."
systemctl list-units --type=service --state=running > "$AUDIT_DIR/running-services.txt" 2>&1
RUNNING_SERVICES=$(systemctl list-units --type=service --state=running --no-pager | grep -c "loaded active running" || echo "0")
log_result "Servicios en ejecución: $RUNNING_SERVICES"

# 7. Check disk usage
echo "💾 Verificando uso de disco..."
df -h > "$AUDIT_DIR/disk-usage.txt"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 80 ]; then
    log_result "⚠️ Uso de disco alto: ${DISK_USAGE}%"
else
    log_result "✅ Uso de disco normal: ${DISK_USAGE}%"
fi

# 8. Check memory usage
echo "🧠 Verificando uso de memoria..."
free -h > "$AUDIT_DIR/memory-usage.txt"
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -gt 80 ]; then
    log_result "⚠️ Uso de memoria alto: ${MEMORY_USAGE}%"
else
    log_result "✅ Uso de memoria normal: ${MEMORY_USAGE}%"
fi

# 9. Check application status
echo "🚀 Verificando estado de la aplicación..."
if command -v pm2 &> /dev/null; then
    pm2 status > "$AUDIT_DIR/pm2-status.txt" 2>&1 || true
    if pm2 status | grep -q "security-platform"; then
        log_result "✅ Aplicación security-platform está ejecutándose"
    else
        log_result "❌ Aplicación security-platform no está ejecutándose"
    fi
fi

# 10. Generate security recommendations
echo "📋 Generando recomendaciones de seguridad..."
cat > "$AUDIT_DIR/security-recommendations.txt" << EOF
RECOMENDACIONES DE SEGURIDAD
============================

Basado en la auditoría realizada el $(date):

1. ACTUALIZACIONES:
   - Revisar y aplicar $VULNERABILITIES vulnerabilidades en dependencias
   - Aplicar $UPDATES actualizaciones de sistema disponibles

2. MONITOREO:
   - Revisar $FAILED_LOGINS intentos de login fallidos
   - Monitorear uso de recursos (Disco: ${DISK_USAGE}%, Memoria: ${MEMORY_USAGE}%)

3. CONFIGURACIÓN:
   - Verificar configuración SSL/TLS
   - Revisar reglas de firewall
   - Validar servicios en ejecución

4. MEJORES PRÁCTICAS:
   - Realizar auditorías regulares
   - Mantener logs de seguridad
   - Implementar monitoreo continuo
   - Backup regular de configuraciones

Para más detalles, revisar los archivos en: $AUDIT_DIR
EOF

# 11. Create summary report
echo "📊 Creando reporte resumen..."
cat > "$AUDIT_DIR/audit-report.json" << EOF
{
  "audit_date": "$(date --iso-8601=seconds)",
  "summary": {
    "vulnerabilities": $VULNERABILITIES,
    "system_updates": $UPDATES,
    "failed_logins": $FAILED_LOGINS,
    "disk_usage_percent": $DISK_USAGE,
    "memory_usage_percent": $MEMORY_USAGE,
    "running_services": $RUNNING_SERVICES
  },
  "status": {
    "nginx_active": $(systemctl is-active --quiet nginx && echo "true" || echo "false"),
    "firewall_active": $(ufw status | grep -q "Status: active" && echo "true" || echo "false"),
    "app_running": $(pm2 status | grep -q "security-platform" && echo "true" || echo "false")
  },
  "audit_files": {
    "npm_audit": "npm-audit.json",
    "ssl_cert": "ssl-cert-info.txt",
    "firewall_status": "firewall-status.txt",
    "failed_logins": "recent-failed-logins.txt",
    "disk_usage": "disk-usage.txt",
    "memory_usage": "memory-usage.txt",
    "running_services": "running-services.txt",
    "recommendations": "security-recommendations.txt"
  }
}
EOF

log_result ""
log_result "✅ Auditoría completada"
log_result "📁 Resultados guardados en: $AUDIT_DIR"
log_result ""

# Display summary
echo ""
echo "📊 RESUMEN DE AUDITORÍA"
echo "======================"
cat "$AUDIT_DIR/audit-summary.txt"

echo ""
echo "📋 Para ver recomendaciones detalladas:"
echo "   cat $AUDIT_DIR/security-recommendations.txt"
echo ""
echo "📊 Para ver el reporte JSON:"
echo "   cat $AUDIT_DIR/audit-report.json"

# Set up cron job for regular audits (optional)
if [ "$1" = "--setup-cron" ]; then
    echo ""
    echo "⏰ Configurando auditoría automática..."
    (crontab -l 2>/dev/null; echo "0 2 * * 0 $(pwd)/scripts/security-audit.sh") | crontab -
    echo "✅ Auditoría programada para ejecutarse semanalmente (Domingos a las 2:00 AM)"
fi

echo ""
echo "🔒 Auditoría de seguridad completada exitosamente"
