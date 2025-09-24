import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface DashboardProps {
  userProfile: any
}

export function Dashboard({ userProfile }: DashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Добро пожаловать!</CardTitle>
          <CardDescription className="text-white/80">
            {userProfile?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-white/80">
            <p>Статус: {userProfile?.role === 'admin' ? '👑 Администратор' : '👤 Тренер'}</p>
            <p className="mt-2">
              <span className="text-yellow-400">⚡</span> {userProfile?.poke_coins || 0} PokéCoins
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">🎒 Ваша коллекция</CardTitle>
          <CardDescription className="text-white/80">
            Собирайте редких покемонов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-white/80">
            <p>Откройте пак карточек, чтобы начать собирать коллекцию покемонов!</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">📖 Покедекс</CardTitle>
          <CardDescription className="text-white/80">
            Изучайте мир покемонов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-white/80">
            <p>Просматривайте всех доступных покемонов и узнайте, какие у вас уже есть!</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">🎁 Паки карточек</CardTitle>
          <CardDescription className="text-white/80">
            Откройте новых покемонов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-white/80">
            <p>Покупайте и открывайте паки для получения случайных покемонов разной редкости!</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">🏪 Аукцион</CardTitle>
          <CardDescription className="text-white/80">
            Покупайте и продавайте покемонов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-white/80">
            <p>Выставляйте своих покемонов на продажу или покупайте у других тренеров!</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">🏆 Достижения и квесты</CardTitle>
          <CardDescription className="text-white/80">
            Выполняйте задания и получайте награды
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-white/80">
            <p>Зарабатывайте достижения и выполняйте ежедневные квесты для получения бонусов!</p>
          </div>
        </CardContent>
      </Card>

      {userProfile?.role === 'admin' && (
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-lg border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-yellow-300">👑 Панель администратора</CardTitle>
            <CardDescription className="text-yellow-100/80">
              Управление сервером
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-yellow-100/80">
              <p>Начисляйте монеты игрокам и управляйте паками карточек!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}