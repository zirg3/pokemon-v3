import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Alert } from './ui/alert'
import { ImageWithFallback } from './figma/ImageWithFallback'

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey)

const RARITY_COLORS = {
  common: 'bg-gray-500',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500'
}

const RARITY_NAMES = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный'
}

export function Trading() {
  const [pokemon, setPokemon] = useState<any[]>([])
  const [collection, setCollection] = useState<any>({})
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTrade, setShowCreateTrade] = useState(false)
  const [selectedOffered, setSelectedOffered] = useState('')
  const [selectedRequested, setSelectedRequested] = useState('')
  const [targetUser, setTargetUser] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch pokemon data
      const pokemonResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/pokemon`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      })
      
      if (pokemonResponse.ok) {
        const pokemonData = await pokemonResponse.json()
        setPokemon(pokemonData)
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        // Fetch user collection
        const collectionResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/collection`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (collectionResponse.ok) {
          const collectionData = await collectionResponse.json()
          setCollection(collectionData)
        }

        // Fetch trades
        const tradesResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/trades`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json()
          setTrades(tradesData)
        }
      }
    } catch (error) {
      console.error('Error fetching trading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createTrade = async () => {
    if (!selectedOffered || !selectedRequested || !targetUser) {
      setError('Заполните все поля')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/trade/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          offeredPokemonId: parseInt(selectedOffered),
          requestedPokemonId: parseInt(selectedRequested),
          targetUserId: targetUser
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setSuccess('Предложение об обмене создано!')
      setShowCreateTrade(false)
      setSelectedOffered('')
      setSelectedRequested('')
      setTargetUser('')
      fetchData()

    } catch (error: any) {
      console.error('Create trade error:', error)
      setError(error.message)
    }
  }

  const getPokemonById = (id: number) => {
    return pokemon.find(p => p.id === id)
  }

  const ownedPokemon = pokemon.filter(p => collection[p.id] > 0)

  if (loading) {
    return (
      <div className="text-center text-white">
        <div className="text-xl">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl text-white">Торговля</h2>
        <Button 
          onClick={() => setShowCreateTrade(!showCreateTrade)}
          disabled={ownedPokemon.length === 0}
        >
          {showCreateTrade ? 'Отмена' : 'Создать обмен'}
        </Button>
      </div>

      {error && (
        <Alert className="bg-red-500/20 border-red-500/50 text-red-100">
          {error}
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-500/20 border-green-500/50 text-green-100">
          {success}
        </Alert>
      )}

      {ownedPokemon.length === 0 && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🔄</div>
            <h3 className="text-white text-xl mb-2">У вас пока нет покемонов для обмена</h3>
            <p className="text-white/80">Откройте паки карточек, чтобы начать торговать!</p>
          </CardContent>
        </Card>
      )}

      {showCreateTrade && ownedPokemon.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Создать предложение об обмене</CardTitle>
            <CardDescription className="text-white/80">
              Выберите покемона для обмена и того, кого вы хотите получить
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-white text-sm mb-2 block">Предлагаю:</label>
              <Select value={selectedOffered} onValueChange={setSelectedOffered}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Выберите покемона для обмена" />
                </SelectTrigger>
                <SelectContent>
                  {ownedPokemon.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name} (x{collection[p.id]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">Хочу получить:</label>
              <Select value={selectedRequested} onValueChange={setSelectedRequested}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Выберите желаемого покемона" />
                </SelectTrigger>
                <SelectContent>
                  {pokemon.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">ID пользователя для обмена:</label>
              <Input
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                placeholder="Введите ID пользователя"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            <Button onClick={createTrade} className="w-full">
              Создать предложение
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Display selected pokemon preview */}
      {(selectedOffered || selectedRequested) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedOffered && (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center">Предлагаю</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const p = getPokemonById(parseInt(selectedOffered))
                  if (!p) return null
                  return (
                    <div className="text-center">
                      <div className="aspect-square mb-3 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                        <ImageWithFallback
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <h3 className="text-white font-semibold capitalize">{p.name}</h3>
                      <Badge className={`${RARITY_COLORS[p.rarity as keyof typeof RARITY_COLORS]} text-white mt-2`}>
                        {RARITY_NAMES[p.rarity as keyof typeof RARITY_NAMES]}
                      </Badge>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}

          {selectedRequested && (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center">Хочу получить</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const p = getPokemonById(parseInt(selectedRequested))
                  if (!p) return null
                  return (
                    <div className="text-center">
                      <div className="aspect-square mb-3 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                        <ImageWithFallback
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <h3 className="text-white font-semibold capitalize">{p.name}</h3>
                      <Badge className={`${RARITY_COLORS[p.rarity as keyof typeof RARITY_COLORS]} text-white mt-2`}>
                        {RARITY_NAMES[p.rarity as keyof typeof RARITY_NAMES]}
                      </Badge>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Active Trades */}
      {trades.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl text-white">Активные обмены</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trades.map((trade) => {
              const offeredPokemon = getPokemonById(trade.offeredPokemonId)
              const requestedPokemon = getPokemonById(trade.requestedPokemonId)
              
              return (
                <Card key={trade.id} className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">
                      Обмен #{trade.id.slice(-8)}
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      Статус: {trade.status === 'pending' ? 'Ожидание' : trade.status}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-white text-xs mb-2">Предлагаю:</div>
                        {offeredPokemon && (
                          <>
                            <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center overflow-hidden mb-2">
                              <ImageWithFallback
                                src={offeredPokemon.image}
                                alt={offeredPokemon.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="text-white text-sm capitalize">{offeredPokemon.name}</div>
                          </>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-white text-xs mb-2">Хочу:</div>
                        {requestedPokemon && (
                          <>
                            <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center overflow-hidden mb-2">
                              <ImageWithFallback
                                src={requestedPokemon.image}
                                alt={requestedPokemon.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="text-white text-sm capitalize">{requestedPokemon.name}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}