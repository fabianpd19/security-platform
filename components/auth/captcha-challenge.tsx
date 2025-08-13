"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"

interface CaptchaChallengeProps {
  onSuccess: () => void
}

export function CaptchaChallenge({ onSuccess }: CaptchaChallengeProps) {
  const [challenge, setChallenge] = useState("")
  const [userInput, setUserInput] = useState("")
  const [error, setError] = useState("")

  const generateChallenge = () => {
    // Generate simple math captcha
    const num1 = Math.floor(Math.random() * 10) + 1
    const num2 = Math.floor(Math.random() * 10) + 1
    const operation = Math.random() > 0.5 ? "+" : "-"

    if (operation === "+") {
      setChallenge(`${num1} + ${num2} = ?`)
    } else {
      // Ensure positive result
      const larger = Math.max(num1, num2)
      const smaller = Math.min(num1, num2)
      setChallenge(`${larger} - ${smaller} = ?`)
    }
  }

  useEffect(() => {
    generateChallenge()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Calculate expected answer
    const parts = challenge.split(" ")
    const num1 = Number.parseInt(parts[0])
    const operation = parts[1]
    const num2 = Number.parseInt(parts[2])

    const expectedAnswer = operation === "+" ? num1 + num2 : num1 - num2

    if (Number.parseInt(userInput) === expectedAnswer) {
      onSuccess()
    } else {
      setError("Respuesta incorrecta. Inténtalo de nuevo.")
      generateChallenge()
      setUserInput("")
    }
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-orange-800">Verificación Anti-Bot</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-white p-3 rounded border font-mono text-lg font-bold text-center min-w-[120px]">
              {challenge}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={generateChallenge}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="captcha-input">Tu respuesta:</Label>
            <Input
              id="captcha-input"
              type="number"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ingresa el resultado"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" size="sm" className="w-full">
            Verificar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
