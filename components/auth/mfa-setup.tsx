"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Smartphone, Key, CheckCircle, Copy, RefreshCw } from "lucide-react"
import { generateSecret, generateQRCodeURL, formatSecret, verifyTOTP } from "@/lib/crypto/totp"

interface MFASetupProps {
  userEmail: string
  onSetupComplete: (secret: string) => void
  onCancel: () => void
}

export function MFASetup({ userEmail, onSetupComplete, onCancel }: MFASetupProps) {
  const [secret, setSecret] = useState("")
  const [qrCodeURL, setQrCodeURL] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"generate" | "verify">("generate")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    generateNewSecret()
  }, [])

  const generateNewSecret = () => {
    const newSecret = generateSecret()
    setSecret(newSecret)

    const qrURL = generateQRCodeURL(newSecret, userEmail, "Plataforma Segura")
    setQrCodeURL(qrURL)
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy secret:", err)
    }
  }

  const handleVerification = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Por favor ingresa un código de 6 dígitos")
      return
    }

    setIsVerifying(true)
    setError("")

    try {
      const isValid = await verifyTOTP(secret, verificationCode)

      if (isValid) {
        onSetupComplete(secret)
      } else {
        setError("Código inválido. Verifica que tu aplicación esté sincronizada.")
      }
    } catch (err) {
      setError("Error al verificar el código. Inténtalo de nuevo.")
    } finally {
      setIsVerifying(false)
    }
  }

  const recommendedApps = [
    { name: "Google Authenticator", platforms: "iOS, Android" },
    { name: "Microsoft Authenticator", platforms: "iOS, Android" },
    { name: "Authy", platforms: "iOS, Android, Desktop" },
    { name: "1Password", platforms: "iOS, Android, Desktop" },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit">
            <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Configurar Autenticación de Dos Factores</CardTitle>
          <CardDescription>Protege tu cuenta con un segundo factor de autenticación</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={step} onValueChange={(value) => setStep(value as "generate" | "verify")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Configurar
              </TabsTrigger>
              <TabsTrigger value="verify" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Verificar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Paso 1: Instala una aplicación de autenticación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendedApps.map((app) => (
                    <div key={app.name} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">{app.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{app.platforms}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Paso 2: Escanea el código QR</h3>
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-white rounded-lg border">
                    {qrCodeURL ? (
                      <img
                        src={qrCodeURL || "/placeholder.svg"}
                        alt="QR Code para 2FA"
                        className="w-48 h-48"
                        onError={(e) => {
                          // Fallback to text-based QR if image fails
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          target.parentElement!.innerHTML = `
                            <div class="w-48 h-48 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded">
                              <div class="text-center p-4">
                                <p class="text-sm text-gray-600 mb-2">Código QR no disponible</p>
                                <p class="text-xs text-gray-500">Usa el código manual abajo</p>
                              </div>
                            </div>
                          `
                        }}
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded">
                        <div className="text-center p-4">
                          <p className="text-sm text-gray-600 mb-2">Generando código QR...</p>
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      ¿No puedes escanear? Ingresa este código manualmente:
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <code className="text-sm font-mono">{formatSecret(secret)}</code>
                      <Button variant="ghost" size="sm" onClick={copySecret} className="h-8 w-8 p-0">
                        {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={generateNewSecret}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Generar Nuevo Código
                  </Button>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
                <Button onClick={() => setStep("verify")}>Continuar a Verificación</Button>
              </div>
            </TabsContent>

            <TabsContent value="verify" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Paso 3: Verifica tu configuración</h3>
                <p className="text-sm text-muted-foreground">
                  Ingresa el código de 6 dígitos que aparece en tu aplicación de autenticación:
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="verification-code">Código de Verificación</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="text-center text-lg font-mono tracking-widest"
                      maxLength={6}
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Importante</p>
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          Guarda tu código de respaldo en un lugar seguro. Lo necesitarás si pierdes acceso a tu
                          dispositivo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("generate")}>
                  Volver
                </Button>
                <Button onClick={handleVerification} disabled={isVerifying || verificationCode.length !== 6}>
                  {isVerifying ? "Verificando..." : "Completar Configuración"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
