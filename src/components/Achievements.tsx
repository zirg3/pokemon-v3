import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

export function Achievements() {
  const [achievements, setAchievements] = useState<any[]>([])
  const [quests, setQuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        // Fetch achievements
        const achievementsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/achievements`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (achievementsResponse.ok) {
          const achievementsData = await achievementsResponse.json()
          setAchievements(achievementsData)
        }

        // Fetch quests
        const questsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/quests`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (questsResponse.ok) {
          const questsData = await questsResponse.json()
          setQuests(questsData)
        }
      }
    } catch (error) {
      console.error('Error fetching achievements data:', error)
    } finally {
      setLoading(false)
    }
  }

  const completedAchievements = achievements.filter(a => a.completed)
  const totalRewards = completedAchievements.reduce((sum, a) => sum + a.reward, 0)

  const completedQuests = quests.filter(q => q.completed)
  const totalQuestRewards = completedQuests.reduce((sum, q) => sum + q.reward, 0)

  if (loading) {
    return (
      <div className="text-center text-white">
        <div className="text-xl">Загрузка достижений...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl text-white mb-2">🏆 Достижения и квесты</h2>
        <p className="text-white/80">Выполняйте задания и получайте награды</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-white mb-2">{completedAchievements.length}/{achievements.length}</div>
            <div className="text-white/80 text-sm">Достижений</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-yellow-400 mb-2">⚡ {totalRewards}</div>
            <div className="text-white/80 text-sm">Заработано</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-white mb-2">{completedQuests.length}/{quests.length}</div>
            <div className="text-white/80 text-sm">Квестов сегодня</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-green-400 mb-2">⚡ {totalQuestRewards}</div>
            <div className="text-white/80 text-sm">За квесты</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-lg">
          <TabsTrigger value="achievements">Достижения</TabsTrigger>
          <TabsTrigger value="quests">Ежедневные квесты</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <Card 
                key={achievement.id} 
                className={`bg-white/10 backdrop-blur-lg border-white/20 ${
                  achievement.completed 
                    ? 'ring-2 ring-yellow-400 bg-gradient-to-br from-yellow-500/20 to-orange-500/20' 
                    : 'grayscale'
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">{achievement.icon}</div>
                    {achievement.completed && (
                      <Badge className="bg-yellow-500 text-white">
                        Выполнено
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-white">{achievement.name}</CardTitle>
                  <CardDescription className="text-white/80">
                    {achievement.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400">⚡ {achievement.reward} монет</span>
                    {achievement.completed && (
                      <span className="text-xs text-white/60">
                        {new Date(achievement.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {achievements.length === 0 && (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-white text-xl mb-2">Достижения загружаются</h3>
                <p className="text-white/80">Начните играть, чтобы разблокировать достижения!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="quests" className="space-y-4">
          <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-lg border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-blue-300">📅 Ежедневные квесты</CardTitle>
              <CardDescription className="text-blue-100/80">
                Обновляются каждый день. Выполните все для получения бонуса!
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quests.map((quest) => {
              const progressPercent = (quest.progress / quest.target) * 100

              return (
                <Card 
                  key={quest.id} 
                  className={`bg-white/10 backdrop-blur-lg border-white/20 ${
                    quest.completed 
                      ? 'ring-2 ring-green-400 bg-gradient-to-br from-green-500/20 to-blue-500/20' 
                      : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl">{quest.icon}</div>
                      {quest.completed && (
                        <Badge className="bg-green-500 text-white">
                          ✓ Готово
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-white">{quest.name}</CardTitle>
                    <CardDescription className="text-white/80">
                      {quest.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/80">Прогресс</span>
                        <span className="text-white">{quest.progress}/{quest.target}</span>
                      </div>
                      <Progress 
                        value={progressPercent} 
                        className="w-full bg-white/20"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-green-400">⚡ {quest.reward} монет</span>
                      {quest.completed && (
                        <span className="text-xs text-white/60">
                          Выполнено
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {quests.length === 0 && (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-white text-xl mb-2">Квесты загружаются</h3>
                <p className="text-white/80">Ежедневные квесты появятся здесь!</p>
              </CardContent>
            </Card>
          )}

          {/* Daily bonus info */}
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg border-purple-500/30">
            <CardContent className="p-6">
              <h3 className="text-purple-300 text-lg mb-2">💎 Ежедневный бонус</h3>
              <p className="text-purple-100/80 mb-4">
                Выполните все ежедневные квесты, чтобы получить дополнительный бонус!
              </p>
              <div className="flex items-center justify-between">
                <span className="text-purple-200">Статус:</span>
                <Badge 
                  className={
                    quests.length > 0 && quests.every(q => q.completed)
                      ? "bg-green-500 text-white" 
                      : "bg-gray-500 text-white"
                  }
                >
                  {quests.length > 0 && quests.every(q => q.completed) 
                    ? "🎉 Все квесты выполнены!" 
                    : `${quests.filter(q => q.completed).length}/${quests.length} выполнено`
                  }
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}