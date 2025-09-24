import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { ImageWithFallback } from './figma/ImageWithFallback'

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

export function Collection() {
  const [pokemon, setPokemon] = useState<any[]>([])
  const [collection, setCollection] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [rarityFilter, setRarityFilter] = useState('all')

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

      // Fetch user collection
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const collectionResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/collection`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (collectionResponse.ok) {
          const collectionData = await collectionResponse.json()
          setCollection(collectionData)
        }
      }
    } catch (error) {
      console.error('Error fetching collection data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter to only show owned pokemon
  const ownedPokemon = pokemon.filter(p => collection[p.id] > 0)
  
  const filteredPokemon = ownedPokemon.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRarity = rarityFilter === 'all' || p.rarity === rarityFilter
    return matchesSearch && matchesRarity
  })

  // Calculate collection stats
  const totalOwned = ownedPokemon.length
  const totalPossible = pokemon.length
  const totalCards = Object.values(collection).reduce((sum: number, count: any) => sum + count, 0)

  const rarityStats = {
    common: ownedPokemon.filter(p => p.rarity === 'common').length,
    uncommon: ownedPokemon.filter(p => p.rarity === 'uncommon').length,
    rare: ownedPokemon.filter(p => p.rarity === 'rare').length,
    epic: ownedPokemon.filter(p => p.rarity === 'epic').length,
    legendary: ownedPokemon.filter(p => p.rarity === 'legendary').length,
  }

  if (loading) {
    return (
      <div className="text-center text-white">
        <div className="text-xl">Загрузка коллекции...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Collection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-white mb-2">{totalOwned}/{totalPossible}</div>
            <div className="text-white/80">Уникальных покемонов</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-white mb-2">{totalCards}</div>
            <div className="text-white/80">Всего карточек</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-white mb-2">{Math.round((totalOwned / totalPossible) * 100)}%</div>
            <div className="text-white/80">Прогресс</div>
          </CardContent>
        </Card>
      </div>

      {/* Rarity Stats */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-4">
          <h3 className="text-white text-lg mb-4">Статистика по редкостям</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(rarityStats).map(([rarity, count]) => (
              <div key={rarity} className="text-center">
                <Badge className={`${RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]} text-white mb-2`}>
                  {RARITY_NAMES[rarity as keyof typeof RARITY_NAMES]}
                </Badge>
                <div className="text-white text-xl">{count}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Поиск в коллекции..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
        />
        <Select value={rarityFilter} onValueChange={setRarityFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Фильтр по редкости" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все редкости</SelectItem>
            <SelectItem value="common">Обычный</SelectItem>
            <SelectItem value="uncommon">Необычный</SelectItem>
            <SelectItem value="rare">Редкий</SelectItem>
            <SelectItem value="epic">Эпический</SelectItem>
            <SelectItem value="legendary">Легендарный</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Collection Grid */}
      {totalOwned === 0 ? (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-white text-xl mb-2">Ваша коллекция пуста</h3>
            <p className="text-white/80">Откройте пак карточек, чтобы начать собирать покемонов!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredPokemon.map((p) => {
            const count = collection[p.id] || 0
            
            // Get rarity styling
            const getRarityGlow = (rarity: string) => {
              switch (rarity) {
                case 'legendary': return 'animate-pulse-glow animate-floating'
                case 'epic': return 'animate-pulse-glow-epic'
                case 'rare': return 'animate-pulse-glow-rare'
                case 'uncommon': return 'animate-pulse-glow-uncommon'
                default: return ''
              }
            }
            
            const getRarityGradient = (rarity: string) => {
              switch (rarity) {
                case 'legendary': return 'bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-yellow-500/20'
                case 'epic': return 'bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-500/20'
                case 'rare': return 'bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-blue-500/20'
                case 'uncommon': return 'bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-green-500/20'
                default: return 'bg-white/10'
              }
            }

            return (
              <Card 
                key={p.id} 
                className={`${getRarityGradient(p.rarity)} ${getRarityGlow(p.rarity)} backdrop-blur-lg border-white/20 hover:scale-105 transition-all relative`}
              >
                <CardContent className="p-4">
                  <div className="aspect-square mb-3 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                    <ImageWithFallback
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-white font-semibold text-center capitalize">{p.name}</h3>
                    
                    <div className="flex justify-center">
                      <Badge className={`${RARITY_COLORS[p.rarity as keyof typeof RARITY_COLORS]} text-white`}>
                        {RARITY_NAMES[p.rarity as keyof typeof RARITY_NAMES]}
                      </Badge>
                    </div>
                    
                    <div className="text-center">
                      <span className="text-white/80 text-sm">
                        Копий: {count}
                      </span>
                    </div>
                    
                    <div className="text-center text-xs text-white/60">
                      #{p.id.toString().padStart(3, '0')}
                    </div>
                  </div>
                  
                  {count > 1 && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {count}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {filteredPokemon.length === 0 && totalOwned > 0 && (
        <div className="text-center text-white/80 py-8">
          Покемоны не найдены в вашей коллекции
        </div>
      )}
    </div>
  )
}