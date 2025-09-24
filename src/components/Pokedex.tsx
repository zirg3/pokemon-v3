import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ImageWithFallback } from './figma/ImageWithFallback'

const RARITY_COLORS = {
  common: 'from-gray-400 to-gray-600',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500'
}

const RARITY_GLOW = {
  common: 'shadow-lg shadow-gray-500/30',
  uncommon: 'shadow-lg shadow-green-500/50 animate-pulse-glow-uncommon',
  rare: 'shadow-xl shadow-blue-500/60 animate-pulse-glow-rare',
  epic: 'shadow-xl shadow-purple-500/70 animate-pulse-glow-epic',
  legendary: 'shadow-2xl shadow-yellow-500/80 animate-pulse-glow animate-floating'
}

const RARITY_NAMES = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный'
}

export function Pokedex() {
  const [pokemon, setPokemon] = useState<any[]>([])
  const [collection, setCollection] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [rarityFilter, setRarityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('id')
  const [showOnlyOwned, setShowOnlyOwned] = useState(false)

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
      console.error('Error fetching pokedex data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique types from all pokemon
  const allTypes = Array.from(new Set(
    pokemon.flatMap(p => p.types?.map((t: any) => t.name) || [])
  )).sort()

  const filteredPokemon = pokemon.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRarity = rarityFilter === 'all' || p.rarity === rarityFilter
    const matchesType = typeFilter === 'all' || p.types?.some((t: any) => t.name === typeFilter)
    const matchesOwned = !showOnlyOwned || collection[p.id] > 0
    return matchesSearch && matchesRarity && matchesType && matchesOwned
  })

  // Sort pokemon
  const sortedPokemon = [...filteredPokemon].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'rarity':
        const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 }
        return (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0)
      case 'stats':
        return (b.totalStats || 0) - (a.totalStats || 0)
      default:
        return a.id - b.id
    }
  })

  if (loading) {
    return (
      <div className="text-center text-white">
        <div className="text-xl">Загрузка покедекса...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl text-white mb-2 font-bold">📚 Покедекс</h2>
        <p className="text-white/80">
          Найдено: {sortedPokemon.length} / {pokemon.length} покемонов
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Input
          placeholder="🔍 Поиск покемонов..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
        />
        
        <Select value={rarityFilter} onValueChange={setRarityFilter}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Редкость" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все редкости</SelectItem>
            <SelectItem value="common">Обычные</SelectItem>
            <SelectItem value="uncommon">Необычные</SelectItem>
            <SelectItem value="rare">Редкие</SelectItem>
            <SelectItem value="epic">Эпические</SelectItem>
            <SelectItem value="legendary">Легендарные</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {allTypes.map(type => (
              <SelectItem key={type} value={type}>
                {pokemon.find(p => p.types?.some((t: any) => t.name === type))?.types?.find((t: any) => t.name === type)?.icon || '❓'} {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="id">По номеру</SelectItem>
            <SelectItem value="name">По имени</SelectItem>
            <SelectItem value="rarity">По редкости</SelectItem>
            <SelectItem value="stats">По силе</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showOnlyOwned ? "default" : "outline"}
          onClick={() => setShowOnlyOwned(!showOnlyOwned)}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          {showOnlyOwned ? '📋 Все' : '✅ Мои'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(RARITY_NAMES).map(([rarity, name]) => {
          const ownedCount = sortedPokemon.filter(p => p.rarity === rarity && collection[p.id] > 0).length
          const totalCount = pokemon.filter(p => p.rarity === rarity).length
          
          return (
            <Card key={rarity} className={`bg-gradient-to-br ${RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]} border-white/20 ${RARITY_GLOW[rarity as keyof typeof RARITY_GLOW]}`}>
              <CardContent className="p-4 text-center">
                <div className="text-white font-bold text-lg">{ownedCount}/{totalCount}</div>
                <div className="text-white/90 text-sm">{name}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pokemon Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {sortedPokemon.map((p) => {
          const owned = collection[p.id] || 0
          const isOwned = owned > 0
          
          return (
            <Card 
              key={p.id} 
              className={`
                ${isOwned 
                  ? `bg-gradient-to-br ${RARITY_COLORS[p.rarity as keyof typeof RARITY_COLORS]} ${RARITY_GLOW[p.rarity as keyof typeof RARITY_GLOW]} border-white/30 hover:scale-105` 
                  : 'bg-black/30 border-white/10 grayscale opacity-60'
                } 
                backdrop-blur-lg transition-all duration-300 hover:shadow-lg cursor-pointer
              `}
            >
              <CardContent className="p-3">
                <div className="aspect-square bg-white/10 rounded-lg flex items-center justify-center overflow-hidden mb-2 relative">
                  {isOwned ? (
                    <ImageWithFallback
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-6xl text-white/30">???</div>
                  )}
                  
                  {owned > 1 && (
                    <div className="absolute top-1 right-1 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {owned}
                    </div>
                  )}
                </div>
                
                <div className="text-center space-y-1">
                  <div className="text-xs text-white/60">
                    #{p.id.toString().padStart(3, '0')}
                  </div>
                  
                  <h3 className={`font-semibold capitalize text-sm ${isOwned ? 'text-white' : 'text-white/40'}`}>
                    {isOwned ? p.name : '???'}
                  </h3>
                  
                  {isOwned && p.types && (
                    <div className="flex justify-center gap-1 flex-wrap">
                      {p.types.slice(0, 2).map((type: any, index: number) => (
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
                  
                  <Badge 
                    className={`text-xs ${
                      isOwned 
                        ? 'bg-black/30 text-white' 
                        : 'bg-black/50 text-white/40'
                    }`}
                  >
                    {isOwned ? RARITY_NAMES[p.rarity as keyof typeof RARITY_NAMES] : '???'}
                  </Badge>
                  
                  {isOwned && p.totalStats && (
                    <div className="text-xs text-white/80">
                      💪 {p.totalStats}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {sortedPokemon.length === 0 && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-white text-xl mb-2">Покемоны не найдены</h3>
            <p className="text-white/80">Попробуйте изменить фильтры поиска</p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardContent className="p-4">
          <h4 className="text-white font-semibold mb-2">Легенда:</h4>
          <div className="text-white/80 text-sm space-y-1">
            <p>✨ Свечение карточек зависит от редкости покемона</p>
            <p>🔢 Цифра в углу показывает количество копий</p>
            <p>❓ Неизвестные покемоны отображаются как "???"</p>
            <p>🎨 Значки показывают типы покемонов</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}