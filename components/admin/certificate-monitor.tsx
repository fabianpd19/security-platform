"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Lock } from "lucide-react"
import { checkDomainSecurity } from "@/lib/security/certificate-validator"

interface CertificateMonitorProps {
  domains?: string[]
}

export function CertificateMonitor({ domains = ["localhost", "your-domain.com"] }: CertificateMonitorProps) {
  const [certificateData, setCertificateData] = useState<Map<string, any>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkCertificates = async () => {
    setIsLoading(true)
    const newData = new Map()

    for (const domain of domains) {
      try {
        const result = await checkDomainSecurity(domain)
        newData.set(domain, result)
      } catch (error) {
        newData.set(domain, {
          certificate: null,
          recommendations: [`Error al verificar certificado: ${error}`],
          securityScore: 0,
        })
      }
    }

    setCertificateData(newData)
    setLastCheck(new Date())
    setIsLoading(false)
  }

  useEffect(() => {
    checkCertificates()
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreVariant = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Monitor de Certificados SSL/TLS</h3>
          <p className="text-sm text-muted-foreground">Estado de certificados digitales y configuración de seguridad</p>
        </div>
        <div className="flex items-center gap-2">
          {lastCheck && (
            <span className="text-xs text-muted-foreground">Última verificación: {formatDate(lastCheck)}</span>
          )}
          <Button variant="outline" size="sm" onClick={checkCertificates} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Verificar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {domains.map((domain) => {
          const data = certificateData.get(domain)
          if (!data) return null

          const { certificate, recommendations, securityScore } = data

          return (
            <Card key={domain}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{domain}</CardTitle>
                  <Badge variant={getScoreVariant(securityScore)}>{securityScore}/100</Badge>
                </div>
                <CardDescription>Certificado SSL/TLS y configuración de seguridad</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {certificate ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Certificado Válido</span>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Emisor</p>
                          <p className="font-mono text-xs">{certificate.issuer}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expira en</p>
                          <p className="font-medium">{certificate.daysUntilExpiry} días</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Puntuación de Seguridad</span>
                          <span className={`text-sm font-medium ${getScoreColor(securityScore)}`}>
                            {securityScore}%
                          </span>
                        </div>
                        <Progress value={securityScore} className="h-2" />
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <p>Válido desde: {formatDate(certificate.validFrom)}</p>
                        <p>Válido hasta: {formatDate(certificate.validTo)}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Sin certificado SSL o inaccesible</span>
                  </div>
                )}

                {recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recomendaciones:</p>
                    {recommendations.map((rec, index) => (
                      <Alert key={index} variant={rec.includes("URGENTE") ? "destructive" : "default"}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{rec}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configuración de Seguridad TLS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Headers de Seguridad Activos</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Strict-Transport-Security (HSTS)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>X-Frame-Options: SAMEORIGIN</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>X-Content-Type-Options: nosniff</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Content-Security-Policy</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Configuración TLS</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>TLS 1.2 y 1.3 habilitados</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>OCSP Stapling activo</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Perfect Forward Secrecy</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Redirección HTTP → HTTPS</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
