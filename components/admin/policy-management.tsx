"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, AlertTriangle, CheckCircle, Eye } from "lucide-react"
import { policyEngine, type ABACPolicy, checkPermission } from "@/lib/abac/policy-engine"
import type { User } from "@/lib/types/security"

interface PolicyManagementProps {
  user: User
}

export function PolicyManagement({ user }: PolicyManagementProps) {
  const [policies, setPolicies] = useState<ABACPolicy[]>([])
  const [selectedPolicy, setSelectedPolicy] = useState<ABACPolicy | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  // Test policy form
  const [testUser, setTestUser] = useState({
    id: "test-user",
    email: "test@security.com",
    name: "Test User",
    role: "user",
    permissions: ["read:own"],
    mfaEnabled: false,
    lastLogin: new Date(),
    failedAttempts: 0,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  const [testResource, setTestResource] = useState({
    type: "user-data",
    classification: "internal" as const,
  })
  const [testAction, setTestAction] = useState("read")

  useEffect(() => {
    setPolicies(policyEngine.getPolicies())
  }, [])

  const handleCreatePolicy = () => {
    const newPolicy: ABACPolicy = {
      id: `policy-${Date.now()}`,
      name: "Nueva Política",
      description: "Descripción de la política",
      subject: {},
      resource: {},
      action: "read",
      environment: {},
      effect: "allow",
      priority: 50,
    }

    policyEngine.addPolicy(newPolicy)
    setPolicies(policyEngine.getPolicies())
    setSelectedPolicy(newPolicy)
    setIsEditing(true)
    setShowCreateDialog(false)
  }

  const handleUpdatePolicy = (policy: ABACPolicy) => {
    policyEngine.updatePolicy(policy.id, policy)
    setPolicies(policyEngine.getPolicies())
    setIsEditing(false)
    setSelectedPolicy(null)
  }

  const handleDeletePolicy = (policyId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta política?")) {
      policyEngine.removePolicy(policyId)
      setPolicies(policyEngine.getPolicies())
      if (selectedPolicy?.id === policyId) {
        setSelectedPolicy(null)
      }
    }
  }

  const handleTestPolicy = () => {
    const result = checkPermission(testUser, testResource, testAction)
    setTestResult(result)
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 90) return "destructive"
    if (priority >= 70) return "default"
    return "secondary"
  }

  const getEffectColor = (effect: string) => {
    return effect === "allow" ? "default" : "destructive"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Políticas ABAC</h2>
          <p className="text-muted-foreground">Administra las políticas de control de acceso basado en atributos</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Política
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Política</DialogTitle>
              <DialogDescription>
                Se creará una nueva política con valores por defecto que podrás editar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreatePolicy}>Crear Política</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
          <TabsTrigger value="test">Probar Políticas</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Policy List */}
            <Card>
              <CardHeader>
                <CardTitle>Políticas Activas</CardTitle>
                <CardDescription>{policies.length} políticas configuradas (ordenadas por prioridad)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {policies.map((policy) => (
                    <div
                      key={policy.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPolicy?.id === policy.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => setSelectedPolicy(policy)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{policy.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityColor(policy.priority)} className="text-xs">
                            P{policy.priority}
                          </Badge>
                          <Badge variant={getEffectColor(policy.effect)} className="text-xs">
                            {policy.effect.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{policy.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Policy Details/Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {selectedPolicy
                    ? isEditing
                      ? "Editar Política"
                      : "Detalles de Política"
                    : "Selecciona una Política"}
                  {selectedPolicy && (
                    <div className="flex gap-2">
                      {!isEditing && (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleDeletePolicy(selectedPolicy.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPolicy ? (
                  isEditing ? (
                    <PolicyEditor
                      policy={selectedPolicy}
                      onSave={handleUpdatePolicy}
                      onCancel={() => setIsEditing(false)}
                    />
                  ) : (
                    <PolicyViewer policy={selectedPolicy} />
                  )
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Selecciona una política de la lista para ver sus detalles
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Probar Evaluación de Políticas</CardTitle>
              <CardDescription>
                Simula diferentes escenarios para verificar el comportamiento de las políticas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Usuario de Prueba</Label>
                  <Select value={testUser.role} onValueChange={(value) => setTestUser({ ...testUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="user">Usuario</SelectItem>
                      <SelectItem value="moderator">Moderador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Recurso</Label>
                  <Select
                    value={testResource.type}
                    onValueChange={(value) => setTestResource({ ...testResource, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user-data">Datos de Usuario</SelectItem>
                      <SelectItem value="admin-panel">Panel Admin</SelectItem>
                      <SelectItem value="security-logs">Logs de Seguridad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Acción</Label>
                  <Select value={testAction} onValueChange={setTestAction}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Leer</SelectItem>
                      <SelectItem value="write">Escribir</SelectItem>
                      <SelectItem value="delete">Eliminar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleTestPolicy} className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Evaluar Políticas
              </Button>

              {testResult && (
                <Alert variant={testResult.decision === "allow" ? "default" : "destructive"}>
                  <div className="flex items-center gap-2">
                    {testResult.decision === "allow" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <strong>Decisión:</strong> {testResult.decision.toUpperCase()} - {testResult.reason}
                      <br />
                      <strong>Políticas aplicadas:</strong> {testResult.matchedPolicies.length}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PolicyViewer({ policy }: { policy: ABACPolicy }) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Nombre</Label>
        <p className="text-sm">{policy.name}</p>
      </div>
      <div>
        <Label className="text-sm font-medium">Descripción</Label>
        <p className="text-sm text-muted-foreground">{policy.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Efecto</Label>
          <Badge variant={policy.effect === "allow" ? "default" : "destructive"}>{policy.effect.toUpperCase()}</Badge>
        </div>
        <div>
          <Label className="text-sm font-medium">Prioridad</Label>
          <Badge variant="outline">{policy.priority}</Badge>
        </div>
      </div>
      <div>
        <Label className="text-sm font-medium">Sujeto (Usuario)</Label>
        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
          {JSON.stringify(policy.subject, null, 2)}
        </pre>
      </div>
      <div>
        <Label className="text-sm font-medium">Recurso</Label>
        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
          {JSON.stringify(policy.resource, null, 2)}
        </pre>
      </div>
      <div>
        <Label className="text-sm font-medium">Acción</Label>
        <p className="text-sm font-mono">{policy.action}</p>
      </div>
    </div>
  )
}

function PolicyEditor({
  policy,
  onSave,
  onCancel,
}: {
  policy: ABACPolicy
  onSave: (policy: ABACPolicy) => void
  onCancel: () => void
}) {
  const [editedPolicy, setEditedPolicy] = useState<ABACPolicy>({ ...policy })

  const handleSave = () => {
    onSave(editedPolicy)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={editedPolicy.name}
          onChange={(e) => setEditedPolicy({ ...editedPolicy, name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={editedPolicy.description}
          onChange={(e) => setEditedPolicy({ ...editedPolicy, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="effect">Efecto</Label>
          <Select
            value={editedPolicy.effect}
            onValueChange={(value: "allow" | "deny") => setEditedPolicy({ ...editedPolicy, effect: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allow">Permitir</SelectItem>
              <SelectItem value="deny">Denegar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Prioridad</Label>
          <Input
            id="priority"
            type="number"
            value={editedPolicy.priority}
            onChange={(e) => setEditedPolicy({ ...editedPolicy, priority: Number.parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="action">Acción</Label>
        <Input
          id="action"
          value={editedPolicy.action}
          onChange={(e) => setEditedPolicy({ ...editedPolicy, action: e.target.value })}
          placeholder="read, write, delete, * (usar | para múltiples: read|write)"
        />
      </div>

      <div>
        <Label htmlFor="subject">Sujeto (JSON)</Label>
        <Textarea
          id="subject"
          value={JSON.stringify(editedPolicy.subject, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              setEditedPolicy({ ...editedPolicy, subject: parsed })
            } catch (err) {
              // Invalid JSON, don't update
            }
          }}
          className="font-mono text-sm"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="resource">Recurso (JSON)</Label>
        <Textarea
          id="resource"
          value={JSON.stringify(editedPolicy.resource, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              setEditedPolicy({ ...editedPolicy, resource: parsed })
            } catch (err) {
              // Invalid JSON, don't update
            }
          }}
          className="font-mono text-sm"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave}>Guardar Política</Button>
      </div>
    </div>
  )
}
