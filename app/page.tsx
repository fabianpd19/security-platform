import { LoginForm } from "@/components/auth/login-form"
import { AuthProvider } from "@/components/auth/auth-provider"

export default function HomePage() {
  return (
    <AuthProvider>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Plataforma Web Segura</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Sistema de autenticación robusta con protección avanzada
            </p>
          </header>

          <div className="max-w-md mx-auto">
            <LoginForm />
          </div>
        </div>
      </main>
    </AuthProvider>
  )
}
