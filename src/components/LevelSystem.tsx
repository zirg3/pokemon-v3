import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { Alert } from './ui/alert'

interface LevelSystemProps {
  userProfile?: any
  onLevelUp?: () => void
}

export function LevelSystem({ userProfile, onLevelUp }: LevelSystemProps) {
  const [levelData, setLevelData] = useState<any>(null)
  const [rewardHistory, setRewardHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchLevelData()
  }, [userProfile])

  const fetchLevelData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/levels`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setLevelData(data.levelData)
          setRewardHistory(data.rewardHistory || [])
        }
      }
    } catch (error) {
      console.error('Error fetching level data:', error)
    } finally {
      setLoading(false)
    }
  }

  const claimReward = async (level: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/levels/claim-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ level }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(result.message)
        fetchLevelData()
        if (onLevelUp) onLevelUp()
      }
    } catch (error) {
      console.error('Error claiming reward:', error)
    }
  }

  const getExperienceForLevel = (level: number): number => {
    if (level <= 1) return 0
    // Exponential growth: level^2.5 * 100
    return Math.floor(Math.pow(level, 2.5) * 100)
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

  const getRewardForLevel = (level: number) => {
    if (level % 3 !== 0) return null
    
    if (level % 15 === 0) {
      return { type: 'pokemon', amount: 1, description: 'Случайный эпический покемон' }
    } else if (level % 9 === 0) {
      return { type: 'pokemon', amount: 1, description: 'Случайный редкий покемон' }
    } else {
      const coins = Math.floor(level * 25 + Math.random() * 50)
      return { type: 'coins', amount: coins, description: `${coins} PokéCoins` }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Загрузка...</div>
      </div>
    )
  }

  if (!levelData) {
    return (
      <div className="text-center p-8">
        <div className="text-white">Ошибка загрузки данных уровня</div>
      </div>
    )
  }

  const currentLevel = levelData.level || 1
  const currentExp = levelData.experience || 0
  const expForNext = getExperienceForLevel(currentLevel + 1)
  const expForCurrent = getExperienceForLevel(currentLevel)
  const progressExp = currentExp - expForCurrent
  const neededExp = expForNext - expForCurrent

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl text-white mb-2">🎯 Система уровней</h2>
        <p className="text-white/80">Получайте опыт за активность и повышайте свой уровень!</p>
      </div>

      {message && (
        <Alert className="bg-green-500/20 border-green-500/50 text-green-100">
          {message}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessage('')}
            className="ml-auto text-green-100 hover:text-green-200"
          >
            ✕
          </Button>
        </Alert>
      )}

      {/* Current Level Display */}
      <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-lg border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center justify-center">
            <div className={`w-16 h-16 rounded-full ${getLevelColor(currentLevel)} flex items-center justify-center text-white text-xl font-bold mr-4`}>
              {currentLevel}
            </div>
            <div>
              <div>Уровень {currentLevel}</div>
              <div className="text-sm text-blue-200">👤 {userProfile?.name}</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-white/80 mb-2">
                <span>Опыт: {currentExp.toLocaleString()}</span>
                <span>До {currentLevel + 1} уровня: {(neededExp - progressExp).toLocaleString()}</span>
              </div>
              <Progress 
                value={(progressExp / neededExp) * 100} 
                className="h-3 bg-white/20"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl text-yellow-400">⚡</div>
                <div className="text-white">Опыт</div>
                <div className="text-yellow-300">{currentExp.toLocaleString()}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl text-blue-400">🎯</div>
                <div className="text-white">Уровень</div>
                <div className="text-blue-300">{currentLevel}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl text-green-400">🏆</div>
                <div className="text-white">Следующий</div>
                <div className="text-green-300">{currentLevel + 1}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Experience Sources */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">📈 Источники опыта</CardTitle>
          <CardDescription className="text-white/80">
            Как получать опыт в PokéPortal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-white/80">
                <span className="text-green-400">+50</span>
                <span>Открытие пака</span>
              </div>
              <div className="flex items-center space-x-3 text-white/80">
                <span className="text-blue-400">+25</span>
                <span>Получение обычного покемона</span>
              </div>
              <div className="flex items-center space-x-3 text-white/80">
                <span className="text-purple-400">+50</span>
                <span>Получение необычного покемона</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-white/80">
                <span className="text-yellow-400">+100</span>
                <span>Получение редкого покемона</span>
              </div>
              <div className="flex items-center space-x-3 text-white/80">
                <span className="text-orange-400">+200</span>
                <span>Получение эпического покемона</span>
              </div>
              <div className="flex items-center space-x-3 text-white/80">
                <span className="text-red-400">+500</span>
                <span>Получение легендарного покемона</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Rewards */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">🎁 Награды за уровни</CardTitle>
          <CardDescription className="text-white/80">
            Получайте награды каждые 3 уровня
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(10)].map((_, index) => {
              const level = currentLevel + index * 3 + (3 - (currentLevel % 3 || 3))
              if (level > 100) return null
              
              const reward = getRewardForLevel(level)
              if (!reward) return null
              
              const canClaim = currentLevel >= level && !rewardHistory.includes(level)
              const alreadyClaimed = rewardHistory.includes(level)
              
              return (
                <div key={level} className={`flex items-center justify-between p-3 rounded-lg ${
                  canClaim ? 'bg-yellow-500/20 border border-yellow-500/50' : 
                  alreadyClaimed ? 'bg-green-500/10 border border-green-500/30' : 
                  'bg-white/5 border border-white/10'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full ${getLevelColor(level)} flex items-center justify-center text-white font-semibold`}>
                      {level}
                    </div>
                    <div>
                      <div className="text-white">Уровень {level}</div>
                      <div className="text-white/60 text-sm">{reward.description}</div>
                    </div>
                  </div>
                  <div>
                    {alreadyClaimed ? (
                      <Badge className="bg-green-500">✓ Получено</Badge>
                    ) : canClaim ? (
                      <Button 
                        onClick={() => claimReward(level)}
                        className="bg-yellow-600 hover:bg-yellow-700"
                        size="sm"
                      >
                        🎁 Забрать
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-white/50">
                        🔒 Недоступно
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Level Colors Guide */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">🎨 Цвета уровней</CardTitle>
          <CardDescription className="text-white/80">
            Каждые 5 уровней меняется цвет значка
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71, 76, 81, 86, 91, 96].map((level) => (
              <div key={level} className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full ${getLevelColor(level)} flex items-center justify-center text-white text-sm font-bold`}>
                  {level}
                </div>
                <span className="text-white/80 text-sm">{level}-{Math.min(level + 4, 100)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}