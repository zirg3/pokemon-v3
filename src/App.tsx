import React, { useState, useEffect } from 'react'
import { supabase } from './utils/supabase/client'
import { projectId, publicAnonKey } from './utils/supabase/info'
import { LoginForm } from './components/LoginForm'
import { SignupForm } from './components/SignupForm'
import { Dashboard } from './components/Dashboard'
import { Pokedex } from './components/Pokedex'
import { PackOpening } from './components/PackOpening'
import { Collection } from './components/Collection'
import { Auction } from './components/Auction'
import { Achievements } from './components/Achievements'
import { AdminPanel } from './components/AdminPanel'
import { LevelSystem } from './components/LevelSystem'
import { PokemonBattle } from './components/PokemonBattle'
import { Leaderboard } from './components/Leaderboard'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [levelData, setLevelData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showLogin, setShowLogin] = useState(true)

  // Auto-refresh profile every 30 seconds for real-time updates
  useEffect(() => {
    if (user) {
      const interval = setInterval(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await fetchUserProfile(session.access_token)
        }
      }, 30000) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchUserProfile(session.access_token)
      }
    } catch (error) {
      console.error('Session check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async (accessToken: string) => {
    try {
      const [profileResponse, levelResponse] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/profile`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/levels`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        })
      ])
      
      if (profileResponse.ok) {
        const profile = await profileResponse.json()
        setUserProfile(profile)
      }
      
      if (levelResponse.ok) {
        const levelData = await levelResponse.json()
        setLevelData(levelData.levelData)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      setUser(data.user)
      await fetchUserProfile(data.session.access_token)
      return { success: true }
    } catch (error: any) {
      console.error('Login error:', error)
      return { success: false, error: error.message }
    }
  }

  const handleSignup = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password, name }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      // After successful signup, log in
      const loginResult = await handleLogin(email, password)
      return loginResult
    } catch (error: any) {
      console.error('Signup error:', error)
      return { success: false, error: error.message }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
    setLevelData(null)
    setActiveTab('dashboard')
  }

  const refreshProfile = async () => {
    if (user) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await fetchUserProfile(session.access_token)
      }
    }
  }

  const getLevelColor = (level: number): string => {
    const colorTier = Math.floor((level - 1) / 5)
    const colors = [
      'bg-gray-500',    // 1-5
      'bg-green-500',   // 6-10  
      'bg-blue-500',    // 11-15
      'bg-purple-500',  // 16-20
      'bg-pink-500',    // 21-25
      'bg-yellow-500',  // 26-30
      'bg-orange-500',  // 31-35
      'bg-red-500',     // 36-40
      'bg-indigo-500',  // 41-45
      'bg-teal-500',    // 46-50
      'bg-cyan-500',    // 51-55
      'bg-emerald-500', // 56-60
      'bg-lime-500',    // 61-65
      'bg-amber-500',   // 66-70
      'bg-rose-500',    // 71-75
      'bg-violet-500',  // 76-80
      'bg-fuchsia-500', // 81-85
      'bg-sky-500',     // 86-90
      'bg-slate-500',   // 91-95
      'bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500' // 96-100
    ]
    return colors[Math.min(colorTier, colors.length - 1)]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <Card className="w-full max-w-md p-6 bg-white/10 backdrop-blur-lg border-white/20">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">PokéPortal</h1>
            <p className="text-white/80">Добро пожаловать в мир покемонов!</p>
          </div>
          
          <div className="space-y-4">
            <Button
              variant={showLogin ? "default" : "outline"}
              onClick={() => setShowLogin(true)}
              className="w-full"
            >
              Вход
            </Button>
            <Button
              variant={!showLogin ? "default" : "outline"}
              onClick={() => setShowLogin(false)}
              className="w-full"
            >
              Регистрация
            </Button>
          </div>

          <div className="mt-6">
            {showLogin ? (
              <LoginForm onLogin={handleLogin} />
            ) : (
              <SignupForm onSignup={handleSignup} />
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <nav className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-white">PokéPortal</h1>
            <div className="flex items-center space-x-4">
              <div className="text-white">
                <span className="text-yellow-400">⚡</span> {userProfile?.poke_coins || 0} PokéCoins
              </div>
              <div className="flex items-center space-x-2">
                {levelData && (
                  <div className={`w-8 h-8 rounded-full ${getLevelColor(levelData.level || 1)} flex items-center justify-center text-white text-sm font-bold`}>
                    {levelData.level || 1}
                  </div>
                )}
                <div className="text-white/80">
                  {userProfile?.name} {userProfile?.role === 'admin' && '👑'}
                  <div className="text-xs text-white/60">ID: {userProfile?.nice_id}</div>
                </div>
              </div>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Выход
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${userProfile?.role === 'admin' ? 'grid-cols-10' : 'grid-cols-9'} mb-8 bg-white/10 backdrop-blur-lg`}>
            <TabsTrigger value="dashboard">Главная</TabsTrigger>
            <TabsTrigger value="pokedex">Покедекс</TabsTrigger>
            <TabsTrigger value="packs">Паки</TabsTrigger>
            <TabsTrigger value="collection">Коллекция</TabsTrigger>
            <TabsTrigger value="auction">Аукцион</TabsTrigger>
            <TabsTrigger value="battle">Битвы</TabsTrigger>
            <TabsTrigger value="levels">Уровни</TabsTrigger>
            <TabsTrigger value="achievements">Достижения</TabsTrigger>
            <TabsTrigger value="leaderboard">Топ</TabsTrigger>
            {userProfile?.role === 'admin' && (
              <TabsTrigger value="admin">Админ</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard userProfile={userProfile} />
          </TabsContent>

          <TabsContent value="pokedex">
            <Pokedex />
          </TabsContent>

          <TabsContent value="packs">
            <PackOpening onPackOpened={refreshProfile} />
          </TabsContent>

          <TabsContent value="collection">
            <Collection />
          </TabsContent>

          <TabsContent value="auction">
            <Auction onPurchase={refreshProfile} />
          </TabsContent>

          <TabsContent value="battle">
            <PokemonBattle onBattleEnd={refreshProfile} />
          </TabsContent>

          <TabsContent value="levels">
            <LevelSystem userProfile={userProfile} onLevelUp={refreshProfile} />
          </TabsContent>

          <TabsContent value="achievements">
            <Achievements />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent>

          {userProfile?.role === 'admin' && (
            <TabsContent value="admin">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}