"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Shield, LogOut, Activity, Lock, AlertTriangle, CheckCircle, Clock, Users, Bug } from "lucide-react"
import { MFASetup } from "@/components/auth/mfa-setup"
import { PolicyManagement } from "@/components/admin/policy-management"
import { VulnerabilityDashboard } from "@/components/admin/vulnerability-dashboard"
import { checkPermission } from "@/lib/abac/policy-engine"

interface SecurityDashboardProps {
  user: {
    id: string
    email: string
    name: string
    role: string
    permissions: string[]
    mfaEnabled: boolean
    lastLogin: Date
  }
  onLogout: () => void
  enableMFA: (secret: string) => void
  disableMFA: () => void
}

export function SecurityDashboard({ user, onLogout, enableMFA, disableMFA }: SecurityDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [showMFASetup, setShowMFASetup] = useState(false)

  const [securityMetrics, setSecurityMetrics] = useState({
    totalUsers: 0,
    activeSessions: 0,
    failedLogins: 0,
    securityAlerts: 0,
  })

  const [recentActivity, setRecentActivity] = useState<
    Array<{
      action: string
      timestamp: Date
      ip: string
    }>
  >([])

  // Load real metrics on component mount
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        // This would call real API endpoints
        const response = await fetch("/api/security/metrics")
        if (response.ok) {
          const data = await response.json()
          setSecurityMetrics(data.metrics)
          setRecentActivity(data.recentActivity)
        }
      } catch (error) {
        console.error("Failed to load security metrics:", error)
        // Fallback to basic metrics
        setSecurityMetrics({
          totalUsers: 1,
          activeSessions: 1,
          failedLogins: 0,
          securityAlerts: 0,
        })
        setRecentActivity([{ action: "Login exitoso", timestamp: new Date(), ip: "Sistema" }])
      }
    }

    loadMetrics()
  }, [])

  const handleMFASetupComplete = (secret: string) => {
    enableMFA(secret)
    setShowMFASetup(false)
  }

  const handleDisableMFA = () => {
    if (
      confirm(
        "¿Estás seguro de que quieres desactivar la autenticación de dos factores? Esto reducirá la seguridad de tu cuenta.",
      )
    ) {
      disableMFA()
    }
  }

  // Check ABAC permissions for admin features
  const canManagePolicies =
    checkPermission(user, { type: "admin-panel", classification: "confidential" }, "manage").decision === "allow"

  // Added vulnerability monitoring permission check
  const canViewVulnerabilities =
    checkPermission(user, { type: "security-monitoring", classification: "internal" }, "read").decision === "allow"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Panel de Seguridad</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Bienvenido, {user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role.toUpperCase()}</Badge>
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Added vulnerability monitoring tab */}
          <TabsList
            className={`grid w-full ${canManagePolicies && canViewVulnerabilities ? "grid-cols-6" : canManagePolicies || canViewVulnerabilities ? "grid-cols-5" : "grid-cols-4"}`}
          >
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="activity">Actividad</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
            {canManagePolicies && (
              <TabsTrigger value="policies">
                <Users className="h-4 w-4 mr-2" />
                Políticas ABAC
              </TabsTrigger>
            )}
            {canViewVulnerabilities && (
              <TabsTrigger value="vulnerabilities">
                <Bug className="h-4 w-4 mr-2" />
                Vulnerabilidades
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{securityMetrics.totalUsers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sesiones Activas</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{securityMetrics.activeSessions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Intentos Fallidos</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{securityMetrics.failedLogins}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Alertas de Seguridad</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{securityMetrics.securityAlerts}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Estado del Usuario</CardTitle>
                <CardDescription>Información de tu cuenta y permisos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Último Acceso</p>
                    <p className="text-sm">{user.lastLogin.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">MFA Habilitado</p>
                    <Badge variant={user.mfaEnabled ? "default" : "destructive"}>{user.mfaEnabled ? "Sí" : "No"}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Permisos</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Seguridad</CardTitle>
                <CardDescription>Gestiona las características de seguridad de tu cuenta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Autenticación de Dos Factores</p>
                      <p className="text-sm text-muted-foreground">
                        Protege tu cuenta con TOTP (Time-based One-Time Password)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.mfaEnabled ? "default" : "destructive"}>
                      {user.mfaEnabled ? "Habilitado" : "Deshabilitado"}
                    </Badge>
                    {user.mfaEnabled ? (
                      <Button variant="outline" size="sm" onClick={handleDisableMFA}>
                        Desactivar
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setShowMFASetup(true)}>
                        Configurar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Control de Acceso ABAC</p>
                      <p className="text-sm text-muted-foreground">Sistema de políticas basado en atributos activo</p>
                    </div>
                  </div>
                  <Badge variant="default">Activo</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Protección Anti-Bot</p>
                      <p className="text-sm text-muted-foreground">
                        CAPTCHA matemático activado después de intentos fallidos
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">Activo</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium">Bloqueo por Intentos Fallidos</p>
                      <p className="text-sm text-muted-foreground">Cuenta bloqueada después de 3 intentos fallidos</p>
                    </div>
                  </div>
                  <Badge variant="default">Activo</Badge>
                </div>

                {/* Added vulnerability monitoring status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bug className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Monitoreo de Vulnerabilidades</p>
                      <p className="text-sm text-muted-foreground">Escaneo automático y detección de amenazas</p>
                    </div>
                  </div>
                  <Badge variant="default">Activo</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Registro de actividades de seguridad</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.timestamp.toLocaleString()} - IP: {activity.ip}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Sistema</CardTitle>
                <CardDescription>Ajustes de seguridad y administración</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Las configuraciones avanzadas estarán disponibles en las próximas actualizaciones.
                  </p>
                  {user.role === "admin" && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Panel de Administrador</p>
                      <p className="text-sm text-blue-600 dark:text-blue-300">
                        Como administrador, tienes acceso a la gestión de políticas ABAC, monitoreo de vulnerabilidades
                        y funciones avanzadas de seguridad.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canManagePolicies && (
            <TabsContent value="policies" className="space-y-6">
              <PolicyManagement user={user} />
            </TabsContent>
          )}

          {/* Added vulnerability monitoring tab content */}
          {canViewVulnerabilities && (
            <TabsContent value="vulnerabilities" className="space-y-6">
              <VulnerabilityDashboard user={user} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Dialog open={showMFASetup} onOpenChange={setShowMFASetup}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Autenticación de Dos Factores</DialogTitle>
            <DialogDescription>Sigue los pasos para configurar TOTP en tu cuenta</DialogDescription>
          </DialogHeader>
          <MFASetup
            userEmail={user.email}
            onSetupComplete={handleMFASetupComplete}
            onCancel={() => setShowMFASetup(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
