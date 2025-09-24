import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Trophy, Medal, Award, Crown, Star, RefreshCw } from 'lucide-react'

interface LeaderboardUser {
  id: string
  name: string
  nice_id: string
  experience: number
  level: number
  role: string
}

interface LeaderboardResponse {
  leaderboard: LeaderboardUser[]
  total: number
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/leaderboard?limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: LeaderboardResponse = await response.json()
      setLeaderboard(data.leaderboard)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
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

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Trophy className="w-6 h-6 text-gray-400" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />
      default:
        if (position <= 10) {
          return <Award className="w-5 h-5 text-blue-500" />
        } else if (position <= 25) {
          return <Star className="w-5 h-5 text-green-500" />
        }
        return null
    }
  }

  const getRankColor = (position: number): string => {
    if (position === 1) return 'border-yellow-500 bg-yellow-500/10'
    if (position === 2) return 'border-gray-400 bg-gray-400/10'
    if (position === 3) return 'border-amber-600 bg-amber-600/10'
    if (position <= 10) return 'border-blue-500/50 bg-blue-500/5'
    if (position <= 25) return 'border-green-500/30 bg-green-500/5'
    return 'border-white/20 bg-white/5'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Топ игроков
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-white/80 text-center py-8">
              Загрузка рейтинга...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Топ игроков
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-400 text-center py-8">
              Ошибка загрузки: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Топ игроков по опыту
            </div>
            <Button
              onClick={fetchLeaderboard}
              disabled={loading}
              variant="outline"
              size="sm"
              className="text-white border-white/20 hover:bg-white/10"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <p className="text-white/60">
            Рейтинг всех игроков портала по количеству опыта
          </p>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <div className="text-white/60 text-center py-8">
              Пока нет данных о игроках
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((user, index) => {
                const position = index + 1
                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 hover:scale-[1.02] ${getRankColor(position)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-white/80 min-w-[2rem]">
                            #{position}
                          </span>
                          {getRankIcon(position)}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full ${getLevelColor(user.level)} flex items-center justify-center text-white font-bold`}>
                            {user.level}
                          </div>
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium">
                                {user.name}
                              </span>
                              {user.role === 'admin' && (
                                <Crown className="w-4 h-4 text-yellow-400" />
                              )}
                            </div>
                            <div className="text-white/60 text-sm">
                              ID: {user.nice_id}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-white font-bold">
                          Уровень {user.level}
                        </div>
                        <div className="text-white/80">
                          {user.experience.toLocaleString()} опыта
                        </div>
                        {user.role === 'admin' && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Админ
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="pt-6">
          <div className="text-center text-white/60">
            <div className="mb-2">
              📊 Всего игроков в рейтинге: {leaderboard.length}
            </div>
            <div className="text-sm mb-2">
              Рейтинг обновляется в реальном времени на основе опыта, полученного за открытие паков и другие активности
            </div>
            {leaderboard.length === 0 && (
              <div className="text-yellow-400 text-sm">
                Если вы недавно создали аккаунт и не видите себя в рейтинге, попробуйте открыть пак или нажмите кнопку обновления
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}