import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { projectId } from '../utils/supabase/info'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { motion, AnimatePresence } from 'motion/react'
import { Zap, Heart, Shield, Star, Trophy, Coins } from 'lucide-react'

interface Pokemon {
  id: number
  name: string
  image: string
  rarity: string
  base_stats: {
    hp: number
    attack: number
    defense: number
    speed: number
  }
}

interface BattlePokemon extends Pokemon {
  currentHp: number
  maxHp: number
  attackPower: number
  isAttacking: boolean
  isDamaged: boolean
}

export function PokemonBattle({ onBattleEnd }: { onBattleEnd: () => void }) {
  const [userPokemon, setUserPokemon] = useState<Pokemon[]>([])
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null)
  const [opponentPokemon, setOpponentPokemon] = useState<Pokemon | null>(null)
  const [playerBattlePokemon, setPlayerBattlePokemon] = useState<BattlePokemon | null>(null)
  const [enemyBattlePokemon, setEnemyBattlePokemon] = useState<BattlePokemon | null>(null)
  const [battleState, setBattleState] = useState<'selecting' | 'battling' | 'finished'>('selecting')
  const [battleLog, setBattleLog] = useState<string[]>([])
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null)
  const [reward, setReward] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserPokemon()
  }, [])

  const fetchUserPokemon = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/user-pokemon`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setUserPokemon(data.pokemon || [])
      }
    } catch (error) {
      console.error('Error fetching user pokemon:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRandomOpponent = () => {
    if (userPokemon.length === 0) return null
    const randomIndex = Math.floor(Math.random() * userPokemon.length)
    return userPokemon[randomIndex]
  }

  const calculateBattleStats = (pokemon: Pokemon): BattlePokemon => {
    const baseHp = pokemon.base_stats.hp || 100
    const baseAttack = pokemon.base_stats.attack || 50
    
    // Add some variation based on rarity
    const rarityMultiplier = {
      common: 1,
      uncommon: 1.2,
      rare: 1.4,
      epic: 1.6,
      legendary: 2
    }[pokemon.rarity] || 1

    const maxHp = Math.floor(baseHp * rarityMultiplier)
    const attackPower = Math.floor(baseAttack * rarityMultiplier)

    return {
      ...pokemon,
      currentHp: maxHp,
      maxHp,
      attackPower,
      isAttacking: false,
      isDamaged: false
    }
  }

  const startBattle = async () => {
    if (!selectedPokemon) return

    setBattleState('battling')
    setBattleLog([`${selectedPokemon.name} готовится к битве...`])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/battle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ playerPokemonId: selectedPokemon.id }),
      })

      if (response.ok) {
        const battleResult = await response.json()
        
        // Set up battle pokemon with server data
        setPlayerBattlePokemon({
          ...battleResult.playerPokemon,
          currentHp: battleResult.playerPokemon.battleStats.hp,
          maxHp: battleResult.playerPokemon.battleStats.hp,
          attackPower: battleResult.playerPokemon.battleStats.attack,
          isAttacking: false,
          isDamaged: false
        })

        setEnemyBattlePokemon({
          ...battleResult.opponentPokemon,
          currentHp: battleResult.opponentPokemon.battleStats.hp,
          maxHp: battleResult.opponentPokemon.battleStats.hp,
          attackPower: battleResult.opponentPokemon.battleStats.attack,
          isAttacking: false,
          isDamaged: false
        })

        setOpponentPokemon(battleResult.opponentPokemon)
        
        // Animate the battle
        await animateBattle(
          battleResult.battleLog, 
          battleResult.winner, 
          battleResult.coinsAwarded,
          selectedPokemon,
          battleResult.opponentPokemon
        )
        
      } else {
        const error = await response.json()
        setBattleLog(['Ошибка при запуске битвы: ' + error.error])
        setBattleState('finished')
      }
    } catch (error) {
      console.error('Battle error:', error)
      setBattleLog(['Произошла ошибка при битве'])
      setBattleState('finished')
    }
  }

  const animateBattle = async (
    battleLogFromServer: any[], 
    battleWinner: string, 
    coinsAwarded: number,
    playerPokemon: Pokemon,
    enemyPokemon: Pokemon
  ) => {
    const log: string[] = [`${playerPokemon.name} против ${enemyPokemon.name}!`]
    setBattleLog(log)

    // Animate each turn from the server battle log
    for (let i = 0; i < battleLogFromServer.length; i++) {
      const turn = battleLogFromServer[i]
      
      // Show attack animation
      if (turn.attacker === 'player') {
        setPlayerBattlePokemon(prev => prev ? { ...prev, isAttacking: true } : null)
        log.push(`${playerPokemon.name} атакует и наносит ${turn.damage} урона!`)
      } else {
        setEnemyBattlePokemon(prev => prev ? { ...prev, isAttacking: true } : null)
        log.push(`${enemyPokemon.name} атакует и наносит ${turn.damage} урона!`)
      }
      
      setBattleLog([...log])
      await new Promise(resolve => setTimeout(resolve, 800))

      // Show damage and update HP
      if (turn.attacker === 'player') {
        setPlayerBattlePokemon(prev => prev ? { ...prev, isAttacking: false } : null)
        setEnemyBattlePokemon(prev => prev ? { 
          ...prev, 
          isDamaged: true, 
          currentHp: turn.defenderHp 
        } : null)
      } else {
        setEnemyBattlePokemon(prev => prev ? { ...prev, isAttacking: false } : null)
        setPlayerBattlePokemon(prev => prev ? { 
          ...prev, 
          isDamaged: true, 
          currentHp: turn.defenderHp 
        } : null)
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      // Reset damage animation
      if (turn.attacker === 'player') {
        setEnemyBattlePokemon(prev => prev ? { ...prev, isDamaged: false } : null)
      } else {
        setPlayerBattlePokemon(prev => prev ? { ...prev, isDamaged: false } : null)
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Show final result
    setWinner(battleWinner)
    if (battleWinner === 'player') {
      setReward(coinsAwarded)
      log.push(`🎉 Победа! Вы получили ${coinsAwarded} PokéCoins!`)
    } else {
      log.push(`💔 Поражение... Ваш покемон потерпел неудачу.`)
    }
    
    setBattleLog([...log])
    setBattleState('finished')
    onBattleEnd() // Refresh user profile to show new coin balance
  }



  const resetBattle = () => {
    setSelectedPokemon(null)
    setOpponentPokemon(null)
    setPlayerBattlePokemon(null)
    setEnemyBattlePokemon(null)
    setBattleState('selecting')
    setBattleLog([])
    setWinner(null)
    setReward(0)
    onBattleEnd()
  }

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'bg-gray-500',
      uncommon: 'bg-green-500',
      rare: 'bg-blue-500',
      epic: 'bg-purple-500',
      legendary: 'bg-yellow-500'
    }
    return colors[rarity as keyof typeof colors] || 'bg-gray-500'
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-6">
          <div className="text-center text-white">Загрузка...</div>
        </CardContent>
      </Card>
    )
  }

  if (battleState === 'selecting') {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-center flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Битва Покемонов
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <p className="text-white/80 mb-4">Выберите покемона для битвы!</p>
            <p className="text-white/60 text-sm">Победитель получает 10-30 PokéCoins</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {userPokemon.map((pokemon) => (
              <motion.div
                key={`${pokemon.id}-${pokemon.name}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedPokemon?.id === pokemon.id 
                      ? 'ring-2 ring-yellow-400 bg-yellow-400/20' 
                      : 'bg-white/5 hover:bg-white/10'
                  } border-white/20`}
                  onClick={() => setSelectedPokemon(pokemon)}
                >
                  <CardContent className="p-3">
                    <img
                      src={pokemon.image}
                      alt={pokemon.name}
                      className="w-full h-20 object-contain mb-2"
                    />
                    <div className="text-center">
                      <p className="text-white text-sm font-medium truncate">{pokemon.name}</p>
                      <Badge className={`${getRarityColor(pokemon.rarity)} text-white text-xs mt-1`}>
                        {pokemon.rarity}
                      </Badge>
                      <div className="flex justify-center gap-2 mt-2 text-xs">
                        <div className="flex items-center gap-1 text-red-400">
                          <Heart className="w-3 h-3" />
                          {pokemon.base_stats?.hp || 100}
                        </div>
                        <div className="flex items-center gap-1 text-orange-400">
                          <Zap className="w-3 h-3" />
                          {pokemon.base_stats?.attack || 50}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {selectedPokemon && (
            <div className="text-center mt-6">
              <Button 
                onClick={startBattle}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                Начать битву с {selectedPokemon.name}!
              </Button>
            </div>
          )}

          {userPokemon.length === 0 && (
            <div className="text-center text-white/60">
              У вас пока нет покемонов для битвы. Откройте паки, чтобы получить покемонов!
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (battleState === 'battling' || battleState === 'finished') {
    return (
      <Card className="w-full max-w-6xl mx-auto bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-center flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Арена Битв
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Battle Arena */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Player Pokemon */}
            <div className="text-center">
              <h3 className="text-white mb-4 flex items-center justify-center gap-2">
                <Star className="w-5 h-5 text-blue-400" />
                Ваш покемон
              </h3>
              {playerBattlePokemon && (
                <motion.div
                  animate={{
                    scale: playerBattlePokemon.isAttacking ? 1.2 : 1,
                    x: playerBattlePokemon.isAttacking ? 20 : 0,
                    rotateZ: playerBattlePokemon.isDamaged ? [-5, 5, -5, 5, 0] : 0
                  }}
                  transition={{ duration: 0.5 }}
                  className="relative"
                >
                  <Card className={`bg-blue-500/20 border-blue-400/50 ${playerBattlePokemon.isDamaged ? 'animate-pulse' : ''}`}>
                    <CardContent className="p-4">
                      <img
                        src={playerBattlePokemon.image}
                        alt={playerBattlePokemon.name}
                        className="w-32 h-32 object-contain mx-auto mb-2"
                      />
                      <p className="text-white font-medium">{playerBattlePokemon.name}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm text-white/80 mb-1">
                          <span>HP</span>
                          <span>{playerBattlePokemon.currentHp}/{playerBattlePokemon.maxHp}</span>
                        </div>
                        <Progress 
                          value={(playerBattlePokemon.currentHp / playerBattlePokemon.maxHp) * 100} 
                          className="h-3"
                        />
                      </div>
                      <div className="flex justify-center gap-2 mt-2 text-xs">
                        <div className="flex items-center gap-1 text-orange-400">
                          <Zap className="w-3 h-3" />
                          {playerBattlePokemon.attackPower}
                        </div>
                        <div className="flex items-center gap-1 text-blue-400">
                          <Shield className="w-3 h-3" />
                          {playerBattlePokemon.base_stats?.defense || 30}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  animate={{ rotateY: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-4xl font-bold text-yellow-400 mb-2"
                >
                  VS
                </motion.div>
                {battleState === 'finished' && winner && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-center"
                  >
                    {winner === 'player' ? (
                      <div className="text-green-400 font-bold">
                        🎉 ПОБЕДА!
                        <div className="flex items-center justify-center gap-1 mt-1 text-yellow-400">
                          <Coins className="w-4 h-4" />
                          +{reward} монет
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-400 font-bold">💔 ПОРАЖЕНИЕ</div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Enemy Pokemon */}
            <div className="text-center">
              <h3 className="text-white mb-4 flex items-center justify-center gap-2">
                <Star className="w-5 h-5 text-red-400" />
                Противник
              </h3>
              {enemyBattlePokemon && (
                <motion.div
                  animate={{
                    scale: enemyBattlePokemon.isAttacking ? 1.2 : 1,
                    x: enemyBattlePokemon.isAttacking ? -20 : 0,
                    rotateZ: enemyBattlePokemon.isDamaged ? [-5, 5, -5, 5, 0] : 0
                  }}
                  transition={{ duration: 0.5 }}
                  className="relative"
                >
                  <Card className={`bg-red-500/20 border-red-400/50 ${enemyBattlePokemon.isDamaged ? 'animate-pulse' : ''}`}>
                    <CardContent className="p-4">
                      <img
                        src={enemyBattlePokemon.image}
                        alt={enemyBattlePokemon.name}
                        className="w-32 h-32 object-contain mx-auto mb-2 transform scale-x-[-1]"
                      />
                      <p className="text-white font-medium">{enemyBattlePokemon.name}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm text-white/80 mb-1">
                          <span>HP</span>
                          <span>{enemyBattlePokemon.currentHp}/{enemyBattlePokemon.maxHp}</span>
                        </div>
                        <Progress 
                          value={(enemyBattlePokemon.currentHp / enemyBattlePokemon.maxHp) * 100} 
                          className="h-3"
                        />
                      </div>
                      <div className="flex justify-center gap-2 mt-2 text-xs">
                        <div className="flex items-center gap-1 text-orange-400">
                          <Zap className="w-3 h-3" />
                          {enemyBattlePokemon.attackPower}
                        </div>
                        <div className="flex items-center gap-1 text-blue-400">
                          <Shield className="w-3 h-3" />
                          {enemyBattlePokemon.base_stats?.defense || 30}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>

          <Separator className="bg-white/20 mb-6" />

          {/* Battle Log */}
          <div className="mb-6">
            <h3 className="text-white mb-3 font-medium">Журнал битвы:</h3>
            <Card className="bg-black/30 border-white/20 max-h-40 overflow-y-auto">
              <CardContent className="p-4">
                <AnimatePresence>
                  {battleLog.map((log, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-white/80 text-sm mb-1"
                    >
                      {log}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="text-center">
            {battleState === 'finished' ? (
              <Button 
                onClick={resetBattle}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                Новая битва
              </Button>
            ) : (
              <div className="text-white/60">
                Битва в процессе...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}