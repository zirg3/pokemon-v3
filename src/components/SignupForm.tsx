import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert } from './ui/alert'

interface SignupFormProps {
  onSignup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
}

export function SignupForm({ onSignup }: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      setLoading(false)
      return
    }

    const result = await onSignup(email, password, name)
    if (!result.success) {
      setError(result.error || 'Ошибка регистрации')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-white">Имя</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
          placeholder="Ваше имя"
        />
      </div>
      
      <div>
        <Label htmlFor="signup-email" className="text-white">Email</Label>
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
          placeholder="your@email.com"
        />
      </div>
      
      <div>
        <Label htmlFor="signup-password" className="text-white">Пароль</Label>
        <Input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <Alert className="bg-red-500/20 border-red-500/50 text-red-100">
          {error}
        </Alert>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
      </Button>
    </form>
  )
}