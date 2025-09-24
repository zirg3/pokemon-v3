import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert } from './ui/alert'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { motion } from 'motion/react'

const RARITY_COLORS = {
  common: 'from-gray-400 to-gray-600',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500'
}

const RARITY_GLOW = {
  common: 'shadow-lg shadow-gray-500/50',
  uncommon: 'shadow-lg shadow-green-500/50',
  rare: 'shadow-lg shadow-blue-500/50',
  epic: 'shadow-lg shadow-purple-500/50',
  legendary: 'shadow- shadow-yellow-500/80 animate-pulse'
}

const RARITY_NAMES = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный'
}

interface PackOpeningProps {
  onPackOpened: () => void
}

export function PackOpening({ onPackOpened }: PackOpeningProps) {
  const [packTypes, setPackTypes] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [openedCards, setOpenedCards] = useState<any[]>([])
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [showCards, setShowCards] = useState(false)
  const [experienceGained, setExperienceGained] = useState(0)
  const [levelResult, setLevelResult] = useState<any>(null)
  const [userCoins, setUserCoins] = useState(0)

  useEffect(() => {
    fetchPackTypes()
    fetchUserProfile()
  }, [])

  const fetchPackTypes = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/pack-types`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setPackTypes(data)
      }
    } catch (error) {
      console.error('Error fetching pack types:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/profile`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      if (response.ok) {
        const profile = await response.json()
        setUserCoins(profile.poke_coins || 0)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const openPack = async (packType: string) => {
    const pack = packTypes[packType]
    if (!pack) return

    // Check if user has enough coins
    if (userCoins < pack.cost) {
      setError(`Недостаточно монет! Нужно ${pack.cost} PokéCoins, у вас ${userCoins}`)
      return
    }

    setOpening(true)
    setError('')
    setOpenedCards([])
    setFlippedCards(new Set())
    setShowCards(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/open-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ packType }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      // Update user coins
      setUserCoins(result.remainingCoins || 0)

      // Store experience data
      setExperienceGained(result.experienceGained || 0)
      setLevelResult(result.levelResult || null)

      // Simulate pack opening animation
      setTimeout(() => {
        setOpenedCards(result.cards)
        setShowCards(true)
        onPackOpened()
      }, 2000)

    } catch (error: any) {
      console.error('Pack opening error:', error)
      setError(error.message)
    } finally {
      setOpening(false)
    }
  }

  const flipCard = (cardId: string) => {
    setFlippedCards(prev => new Set([...prev, cardId]))
  }

  const closeCardView = () => {
    setShowCards(false)
    setOpenedCards([])
    setFlippedCards(new Set())
    setExperienceGained(0)
    setLevelResult(null)
  }

  if (loading) {
    return (
      <div className="text-center text-white">
        <div className="text-xl">Загрузка...</div>
      </div>
    )
  }

  if (showCards) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl text-white mb-4 font-bold">✨ Ваши новые покемоны! ✨</h2>
          <p className="text-white/80 mb-4">Нажмите на карты, чтобы перевернуть их</p>
          
          {/* Experience gained display */}
          {experienceGained > 0 && (
            <div className="mb-4 space-y-2">
              <div className="inline-block bg-blue-500/20 border border-blue-500/50 rounded-lg px-4 py-2">
                <span className="text-blue-300">⚡ +{experienceGained} опыта</span>
              </div>
              {levelResult?.leveledUp && (
                <div className="inline-block bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-4 py-2 ml-2">
                  <span className="text-yellow-300">🎉 Новый уровень: {levelResult.newLevel}!</span>
                </div>
              )}
            </div>
          )}
          
          <Button onClick={closeCardView} variant="outline">
            Закрыть
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {openedCards.map((card, index) => {
            const isFlipped = flippedCards.has(card.cardId)
            
            return (
              <motion.div
                key={card.cardId}
                initial={{ scale: 0, y: -100 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.6, type: 'spring' }}
                className="perspective-1000"
              >
                <motion.div
                  className={`relative w-full aspect-[3/4] cursor-pointer transform-style-preserve-3d transition-transform duration-700`}
                  style={{
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                  onClick={() => !isFlipped && flipCard(card.cardId)}
                >
                  {/* Card Back */}
                  <div className="absolute inset-0 backface-hidden">
                    <Card className="w-full h-full bg-gradient-to-br from-red-600 via-white to-red-600 border-4 border-yellow-400 hover:scale-105 transition-transform">
                      <CardContent className="p-4 h-full flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-red-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                          <div className="text-white text-2xl">⚡</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-800 mb-2">POKÉMON</div>
                          <div className="text-sm text-gray-600">Нажмите для открытия</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Card Front */}
                  <div 
                    className="absolute inset-0 backface-hidden"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    <Card className={`w-full h-full bg-gradient-to-br ${RARITY_COLORS[card.rarity as keyof typeof RARITY_COLORS]} border-2 border-white/30 ${RARITY_GLOW[card.rarity as keyof typeof RARITY_GLOW]} hover:scale-105 transition-all`}>
                      <CardContent className="p-4 h-full flex flex-col">
                        <div className="flex-1 bg-white/90 rounded-lg p-3 mb-3">
                          <div className="aspect-square bg-gradient-to-br from-blue-50 to-yellow-50 rounded-lg flex items-center justify-center overflow-hidden mb-2">
                            <ImageWithFallback
                              src={card.image}
                              alt={card.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          
                          <div className="text-center">
                            <h3 className="text-gray-800 font-bold capitalize text-lg mb-1">{card.name}</h3>
                            <div className="text-xs text-gray-600 mb-2">
                              #{card.id.toString().padStart(3, '0')}
                            </div>
                            
                            {/* Type badges */}
                            {card.types && (
                              <div className="flex justify-center gap-1 mb-2">
                                {card.types.map((type: any, typeIndex: number) => (
                                  <div
                                    key={typeIndex}
                                    className="px-2 py-1 rounded-full text-xs text-white font-semibold"
                                    style={{ backgroundColor: type.color }}
                                  >
                                    {type.icon} {type.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <Badge className="text-white font-bold px-3 py-1 text-sm bg-black/30">
                            {RARITY_NAMES[card.rarity as keyof typeof RARITY_NAMES]}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </div>

        {flippedCards.size < openedCards.length && (
          <div className="text-center">
            <p className="text-white/80 text-sm">
              Открыто карт: {flippedCards.size} / {openedCards.length}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl text-white mb-2 font-bold">🏪 Магазин паков</h2>
        <p className="text-white/80">Выберите пак для открытия новых покемонов</p>
      </div>

      {error && (
        <Alert className="bg-red-500/20 border-red-500/50 text-red-100">
          {error}
        </Alert>
      )}

      {opening && (
        <div className="text-center py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-6"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 rounded-full flex items-center justify-center text-white text-3xl shadow-lg">
              ⚡
            </div>
          </motion.div>
          <motion.p 
            className="text-white text-2xl font-bold"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            Открываем пак...
          </motion.p>
        </div>
      )}

      {!opening && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(packTypes).map(([key, pack]: [string, any]) => (
            <motion.div
              key={key}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Card className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-lg border-2 border-purple-500/30 hover:border-purple-400/50 transition-all h-full">
                <CardHeader className="text-center pb-4">
                  <motion.div 
                    className="text-6xl mb-2"
                    animate={{ 
                      rotateY: [0, 180, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  >
                    {key === 'basic' && '📦'}
                    {key === 'premium' && '🎁'}
                    {key === 'legendary' && '💎'}
                    {!['basic', 'premium', 'legendary'].includes(key) && '🌟'}
                  </motion.div>
                  <CardTitle className="text-white text-xl font-bold">
                    {pack.name}
                  </CardTitle>
                  <CardDescription className="text-purple-200">
                    {pack.cards} карточек в паке
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="text-center space-y-4">
                  {/* Pack image/preview */}
                  {pack.image && (
                    <div className="aspect-video bg-white/10 rounded-lg overflow-hidden">
                      <ImageWithFallback
                        src={pack.image}
                        alt={pack.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Rarity indicators */}
                  <div className="space-y-2">
                    <div className="text-white/80 text-sm font-semibold">Содержимое:</div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {Object.entries(pack.rarities || {}).map(([rarity, data]: [string, any]) => 
                        data.enabled && (
                          <Badge
                            key={rarity}
                            className={`text-xs bg-gradient-to-r ${RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]} text-white`}
                          >
                            {Math.round(data.chance * 100)}%
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-yellow-500/20 rounded-lg p-3">
                    <div className="text-yellow-300 text-2xl font-bold">
                      ⚡ {pack.cost} PokéCoins
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => openPack(key)}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 transform transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    disabled={opening || userCoins < pack.cost}
                  >
                    {opening ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          ⚡
                        </motion.div>
                        Открывается...
                      </span>
                    ) : userCoins < pack.cost ? (
                      <>🚫 Недостаточно монет</>
                    ) : (
                      <>🎯 Открыть пак</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info section */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardContent className="p-6">
          <h3 className="text-white text-lg mb-4 font-bold">📊 Система редкости</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(RARITY_NAMES).map(([key, name]) => (
              <div key={key} className="text-center">
                <div className={`w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br ${RARITY_COLORS[key as keyof typeof RARITY_COLORS]} ${RARITY_GLOW[key as keyof typeof RARITY_GLOW]} flex items-center justify-center`}>
                  <span className="text-white font-bold text-sm">{name[0]}</span>
                </div>
                <div className="text-white text-sm font-semibold">{name}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-white/80 text-sm text-center">
            Чем реже покемон, тем больше он светится и тем красивее его карточка! ✨
          </div>
        </CardContent>
      </Card>
    </div>
  )
}