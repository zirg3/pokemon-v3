import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Alert } from './ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { AuctionTimer } from './AuctionTimer'

const RARITY_COLORS = {
  common: 'from-gray-400 to-gray-600',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500'
}

const RARITY_GLOW = {
  common: 'shadow-lg shadow-gray-500/30',
  uncommon: 'shadow-lg shadow-green-500/50',
  rare: 'shadow-lg shadow-blue-500/60',
  epic: 'shadow-xl shadow-purple-500/70',
  legendary: 'shadow-2xl shadow-yellow-500/80 animate-pulse-glow'
}

const RARITY_NAMES = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный'
}

interface AuctionProps {
  onPurchase: () => void
}

export function Auction({ onPurchase }: AuctionProps) {
  const [pokemon, setPokemon] = useState<any[]>([])
  const [collection, setCollection] = useState<any>({})
  const [auctions, setAuctions] = useState<any[]>([])
  const [myAuctions, setMyAuctions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPokemon, setSelectedPokemon] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('24')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchData()
    completeExpiredAuctions() // Check for expired auctions on load
    const interval = setInterval(() => {
      fetchData()
      completeExpiredAuctions() // Check periodically for expired auctions
    }, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
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

        // Fetch all auctions
        const auctionsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/auctions/active`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (auctionsResponse.ok) {
          const auctionsData = await auctionsResponse.json()
          setAuctions(auctionsData)
        }

        // Fetch user's auctions
        const myAuctionsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/auctions/my`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (myAuctionsResponse.ok) {
          const myAuctionsData = await myAuctionsResponse.json()
          setMyAuctions(myAuctionsData)
        }
      }
    } catch (error) {
      console.error('Error fetching auction data:', error)
    } finally {
      setLoading(false)
    }
  }

  const completeExpiredAuctions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/auctions/complete-expired`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
      }
    } catch (error) {
      console.error('Error completing expired auctions:', error)
    }
  }

  const createAuction = async () => {
    if (!selectedPokemon || !price) {
      setError('Выберите покемона и укажите цену')
      return
    }

    const priceValue = parseInt(price)
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Введите корректную цену')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/auctions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          pokemonId: parseInt(selectedPokemon),
          startingPrice: priceValue,
          duration: parseInt(duration)
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setSuccess('Аукцион создан!')
      setSelectedPokemon('')
      setPrice('')
      fetchData()

    } catch (error: any) {
      console.error('Create auction error:', error)
      setError(error.message)
    }
  }

  const buyPokemon = async (auction: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      // Make a bid on the auction
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/auctions/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          auctionId: auction.id,
          bidAmount: (auction.currentPrice || auction.startingPrice) + 10 // Bid 10 coins higher
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setSuccess('Ставка сделана!')
      fetchData()
      onPurchase()

    } catch (error: any) {
      console.error('Bid error:', error)
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
        <div className="text-xl">Загрузка аукциона...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl text-white mb-2">🏪 Аукцион покемонов</h2>
        <p className="text-white/80">Покупайте и продавайте покемонов</p>
      </div>

      {error && (
        <Alert className="bg-red-500/20 border-red-500/50 text-red-100">
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError('')}
            className="ml-auto text-red-100 hover:text-red-200"
          >
            ✕
          </Button>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-500/20 border-green-500/50 text-green-100">
          {success}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccess('')}
            className="ml-auto text-green-100 hover:text-green-200"
          >
            ✕
          </Button>
        </Alert>
      )}

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-lg">
          <TabsTrigger value="browse">Просмотр аукционов</TabsTrigger>
          <TabsTrigger value="sell">Продать покемона</TabsTrigger>
          <TabsTrigger value="my-auctions">Мои аукционы</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {auctions.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">🏪</div>
                <h3 className="text-white text-xl mb-2">Нет активных аукционов</h3>
                <p className="text-white/80">Станьте первым, кто выставит покемона на продажу!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {auctions.map((auction) => {
                const pokemonData = getPokemonById(auction.pokemonId)
                if (!pokemonData) return null

                return (
                  <Card key={auction.id} className={`bg-gradient-to-br ${RARITY_COLORS[pokemonData.rarity as keyof typeof RARITY_COLORS]} ${RARITY_GLOW[pokemonData.rarity as keyof typeof RARITY_GLOW]} backdrop-blur-lg border-white/30 hover:scale-105 transition-all duration-300`}>
                    <CardHeader>
                      <CardTitle className="text-white text-center capitalize font-bold">{pokemonData.name}</CardTitle>
                      <CardDescription className="text-white/90 text-center">
                        🏷️ {auction.sellerNiceId}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="aspect-square bg-white/20 rounded-lg flex items-center justify-center overflow-hidden relative">
                        <ImageWithFallback
                          src={pokemonData.image}
                          alt={pokemonData.name}
                          className="w-full h-full object-contain"
                        />
                        
                        {/* Types overlay */}
                        {pokemonData.types && (
                          <div className="absolute bottom-2 left-2 flex gap-1">
                            {pokemonData.types.slice(0, 2).map((type: any, index: number) => (
                              <div
                                key={index}
                                className="text-xs px-1 py-0.5 rounded text-white font-semibold"
                                style={{ backgroundColor: type.color }}
                                title={type.name}
                              >
                                {type.icon}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-center space-y-2">
                        <Badge className="bg-black/30 text-white font-bold">
                          {RARITY_NAMES[pokemonData.rarity as keyof typeof RARITY_NAMES]}
                        </Badge>
                        
                        <div className="bg-yellow-500/20 rounded-lg p-2 space-y-1">
                          <div className="text-yellow-300 text-xl font-bold">
                            ⚡ {auction.currentPrice || auction.startingPrice} PokéCoins
                          </div>
                          {auction.highestBidderNiceId && (
                            <div className="text-yellow-200 text-sm">
                              🏆 Последняя ставка: {auction.highestBidderNiceId}
                            </div>
                          )}
                          {!auction.highestBidderNiceId && (
                            <div className="text-yellow-200 text-sm">
                              💰 Стартовая цена
                            </div>
                          )}
                        </div>
                        
                        {auction.expiresAt && (
                          <div className="bg-black/20 rounded px-2 py-1">
                            <AuctionTimer 
                              expiresAt={auction.expiresAt} 
                              onExpired={() => fetchData()}
                            />
                          </div>
                        )}
                        
                        <Button 
                          onClick={() => buyPokemon(auction)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                        >
                          💰 Ставка: {(auction.currentPrice || auction.startingPrice) + 10} PokéCoins
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sell" className="space-y-4">
          {ownedPokemon.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">🎁</div>
                <h3 className="text-white text-xl mb-2">У вас нет покемонов для продажи</h3>
                <p className="text-white/80">Откройте паки карточек, чтобы получить покемонов!</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Выставить покемона на аукцион</CardTitle>
                <CardDescription className="text-white/80">
                  Выберите покемона и установите цену
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-white text-sm mb-2 block">Покемон:</label>
                  <Select value={selectedPokemon} onValueChange={setSelectedPokemon}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Выберите покемона" />
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
                  <label className="text-white text-sm mb-2 block">Цена (PokéCoins):</label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="100"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <label className="text-white text-sm mb-2 block">Продолжительность аукциона:</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Выберите время" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">⏰ 6 часов</SelectItem>
                      <SelectItem value="12">⏰ 12 часов</SelectItem>
                      <SelectItem value="24">⏰ 24 часа</SelectItem>
                      <SelectItem value="48">⏰ 48 часов</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={createAuction} className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                  🚀 Выставить на аукцион
                </Button>

                {selectedPokemon && (
                  <div className="mt-4">
                    <h4 className="text-white mb-2">Предварительный просмотр:</h4>
                    {(() => {
                      const p = getPokemonById(parseInt(selectedPokemon))
                      if (!p) return null
                      return (
                        <div className="bg-white/5 rounded-lg p-4 text-center">
                          <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center overflow-hidden mb-2 max-w-32 mx-auto">
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
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-auctions" className="space-y-4">
          {myAuctions.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-white text-xl mb-2">У вас нет активных аукционов</h3>
                <p className="text-white/80">Выставите покемона на продажу, чтобы заработать монеты!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAuctions.map((auction) => {
                const pokemonData = getPokemonById(auction.pokemonId)
                if (!pokemonData) return null

                return (
                  <Card key={auction.id} className="bg-white/10 backdrop-blur-lg border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-center capitalize">{pokemonData.name}</CardTitle>
                      <CardDescription className="text-white/80 text-center">
                        Выставлен: {new Date(auction.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                        <ImageWithFallback
                          src={pokemonData.image}
                          alt={pokemonData.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      <div className="text-center space-y-2">
                        <Badge className={`${RARITY_COLORS[pokemonData.rarity as keyof typeof RARITY_COLORS]} text-white`}>
                          {RARITY_NAMES[pokemonData.rarity as keyof typeof RARITY_NAMES]}
                        </Badge>
                        
                        <div className="bg-yellow-500/20 rounded-lg p-2 space-y-1">
                          <div className="text-yellow-300 text-lg font-bold">
                            ⚡ {auction.currentPrice || auction.startingPrice} PokéCoins
                          </div>
                          {auction.highestBidderNiceId && (
                            <div className="text-yellow-200 text-sm">
                              🏆 Лидирует: {auction.highestBidderNiceId}
                            </div>
                          )}
                          {!auction.highestBidderNiceId && (
                            <div className="text-yellow-200 text-sm">
                              💰 Ставок нет
                            </div>
                          )}
                        </div>
                        
                        <Badge 
                          variant="outline" 
                          className={`${auction.status === 'active' ? 'text-blue-400 border-blue-400' : 
                                      auction.status === 'sold' ? 'text-green-400 border-green-400' : 
                                      'text-red-400 border-red-400'}`}
                        >
                          {auction.status === 'active' ? 'Активен' : 
                           auction.status === 'sold' ? 'Продан' : 
                           auction.status === 'expired' ? 'Истек' : auction.status}
                        </Badge>
                        
                        {auction.expiresAt && auction.status === 'active' && (
                          <div className="bg-black/20 rounded px-2 py-1">
                            <AuctionTimer 
                              expiresAt={auction.expiresAt} 
                              onExpired={() => fetchData()}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}