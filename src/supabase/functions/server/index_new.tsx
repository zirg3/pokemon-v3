import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'

const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*'],
}))

app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Achievement definitions
const ACHIEVEMENTS = {
  welcome: { name: 'Добро пожаловать', description: 'Зарегистрируйтесь в PokéPortal', reward: 100, icon: '👋' },
  first_pack: { name: 'Первый пак', description: 'Откройте свой первый пак', reward: 50, icon: '🎁' },
  
  // Collection achievements
  collector_10: { name: 'Коллекционер I', description: 'Соберите 10 уникальных покемонов', reward: 100, icon: '🏆' },
  collector_25: { name: 'Коллекционер II', description: 'Соберите 25 уникальных покемонов', reward: 200, icon: '🏆' },
  collector_50: { name: 'Коллекционер III', description: 'Соберите 50 уникальных покемонов', reward: 500, icon: '🏆' },
  collector_100: { name: 'Мастер коллекционер', description: 'Соберите 100 уникальных покемонов', reward: 1000, icon: '🏆' },
  
  // Level achievements
  level_5: { name: 'Первые шаги', description: 'Достигните 5 уровня', reward: 150, icon: '🎯' },
  level_10: { name: 'Новичок', description: 'Достигните 10 уровня', reward: 300, icon: '🎯' },
  level_25: { name: 'Опытный тренер', description: 'Достигните 25 уровня', reward: 500, icon: '🎯' },
  level_50: { name: 'Эксперт', description: 'Достигните 50 уровня', reward: 750, icon: '🎯' },
  level_75: { name: 'Легенда', description: 'Достигните 75 уровня', reward: 1000, icon: '🎯' },
  level_100: { name: 'Чемпион', description: 'Достигните максимального уровня', reward: 2000, icon: '👑' },
  
  // Pack opening achievements
  pack_master_10: { name: 'Любитель паков', description: 'Откройте 10 паков', reward: 100, icon: '📦' },
  pack_master_50: { name: 'Знаток паков', description: 'Откройте 50 паков', reward: 300, icon: '📦' },
  pack_master_100: { name: 'Мастер паков', description: 'Откройте 100 паков', reward: 500, icon: '📦' },
  
  // Rarity achievements
  rare_collector: { name: 'Охотник за редкостью', description: 'Получите первого редкого покемона', reward: 100, icon: '💎' },
  epic_collector: { name: 'Эпический коллекционер', description: 'Получите первого эпического покемона', reward: 200, icon: '✨' },
  legendary_collector: { name: 'Ловец легенд', description: 'Получите первого легендарного покемона', reward: 500, icon: '🌟' },
  
  // Battle achievements
  first_battle: { name: 'Первая битва', description: 'Выиграйте первую битву', reward: 75, icon: '⚔️' },
  battle_winner_10: { name: 'Воин', description: 'Выиграйте 10 битв', reward: 200, icon: '⚔️' },
  battle_winner_50: { name: 'Ветеран', description: 'Выиграйте 50 битв', reward: 500, icon: '⚔️' },
  battle_winner_100: { name: 'Чемпион арены', description: 'Выиграйте 100 битв', reward: 1000, icon: '🏅' },
  
  // Trading achievements
  trader: { name: 'Торговец', description: 'Продайте первого покемона на аукционе', reward: 75, icon: '💰' },
  auction_master: { name: 'Мастер аукционов', description: 'Продайте 10 покемонов', reward: 300, icon: '💰' },
  big_seller: { name: 'Крупный продавец', description: 'Продайте покемона за 500+ монет', reward: 200, icon: '💎' },
  
  // Wealth achievements
  rich: { name: 'Богач', description: 'Накопите 1000 PokéCoins', reward: 200, icon: '💎' },
  millionaire: { name: 'Миллионер', description: 'Накопите 5000 PokéCoins', reward: 500, icon: '💰' },
  
  // Special achievements
  daily_login_7: { name: 'Верный тренер', description: 'Заходите 7 дней подряд', reward: 300, icon: '📅' },
  social_trader: { name: 'Социальный торговец', description: 'Купите покемона на аукционе', reward: 100, icon: '🤝' },
  complete_type: { name: 'Специалист типов', description: 'Соберите всех покемонов одного типа', reward: 400, icon: '🎪' }
}

// Daily quests definitions
const DAILY_QUESTS = {
  open_pack: { name: 'Открытие паков', description: 'Откройте пак карт', target: 1, reward: 50, icon: '📦' },
  collect_cards: { name: 'Коллекционирование', description: 'Получите 3 новые карты', target: 3, reward: 75, icon: '🎴' },
  trade_pokemon: { name: 'Торговля', description: 'Продайте покемона на аукционе', target: 1, reward: 100, icon: '💰' },
  win_battle: { name: 'Битвы', description: 'Выиграйте битву с покемоном', target: 1, reward: 75, icon: '⚔️' }
}

// Pack types with customizable settings
const DEFAULT_PACK_TYPES = {
  basic: { 
    name: 'Базовый пак', 
    cost: 100, 
    cards: 3,
    rarities: {
      common: { enabled: true, chance: 0.6 },
      uncommon: { enabled: true, chance: 0.3 },
      rare: { enabled: true, chance: 0.1 },
      epic: { enabled: false, chance: 0.0 },
      legendary: { enabled: false, chance: 0.0 }
    }
  },
  premium: { 
    name: 'Премиум пак', 
    cost: 250, 
    cards: 5,
    rarities: {
      common: { enabled: true, chance: 0.4 },
      uncommon: { enabled: true, chance: 0.35 },
      rare: { enabled: true, chance: 0.2 },
      epic: { enabled: true, chance: 0.05 },
      legendary: { enabled: false, chance: 0.0 }
    }
  },
  legendary: { 
    name: 'Легендарный пак', 
    cost: 500, 
    cards: 7,
    rarities: {
      common: { enabled: true, chance: 0.2 },
      uncommon: { enabled: true, chance: 0.3 },
      rare: { enabled: true, chance: 0.3 },
      epic: { enabled: true, chance: 0.15 },
      legendary: { enabled: true, chance: 0.05 }
    }
  }
}

// Initialize sample pokemon data (minimal for testing)
async function initializePokemonData() {
  try {
    const existing = await kv.get('pokemon_data')
    if (existing && existing.length > 0) return

    console.log('Initializing Pokemon data...')

    // Extended test data with more Pokemon
    const pokemonData = [
      // Common Pokemon
      {
        id: 1,
        name: 'bulbasaur',
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
        rarity: 'common',
        types: [{ name: 'grass', icon: '🌿', color: '#78C850' }],
        totalStats: 318,
        height: 7,
        weight: 69,
        stats: [
          { name: 'hp', value: 45 },
          { name: 'attack', value: 49 },
          { name: 'defense', value: 49 },
          { name: 'speed', value: 45 }
        ]
      },
      {
        id: 4,
        name: 'charmander',
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
        rarity: 'common',
        types: [{ name: 'fire', icon: '🔥', color: '#F08030' }],
        totalStats: 309,
        height: 6,
        weight: 85,
        stats: [
          { name: 'hp', value: 39 },
          { name: 'attack', value: 52 },
          { name: 'defense', value: 43 },
          { name: 'speed', value: 65 }
        ]
      },
      {
        id: 7,
        name: 'squirtle',
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png',
        rarity: 'common',
        types: [{ name: 'water', icon: '💧', color: '#6890F0' }],
        totalStats: 314,
        height: 5,
        weight: 90,
        stats: [
          { name: 'hp', value: 44 },
          { name: 'attack', value: 48 },
          { name: 'defense', value: 65 },
          { name: 'speed', value: 43 }
        ]
      },
      {
        id: 25,
        name: 'pikachu',
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        rarity: 'uncommon',
        types: [{ name: 'electric', icon: '⚡', color: '#F8D030' }],
        totalStats: 320,
        height: 4,
        weight: 60,
        stats: [
          { name: 'hp', value: 35 },
          { name: 'attack', value: 55 },
          { name: 'defense', value: 40 },
          { name: 'speed', value: 90 }
        ]
      },
      {
        id: 6,
        name: 'charizard',
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
        rarity: 'rare',
        types: [{ name: 'fire', icon: '🔥', color: '#F08030' }],
        totalStats: 534,
        height: 17,
        weight: 905,
        stats: [
          { name: 'hp', value: 78 },
          { name: 'attack', value: 84 },
          { name: 'defense', value: 78 },
          { name: 'speed', value: 100 }
        ]
      },
      {
        id: 130,
        name: 'gyarados',
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/130.png',
        rarity: 'epic',
        types: [{ name: 'water', icon: '💧', color: '#6890F0' }],
        totalStats: 540,
        height: 65,
        weight: 2350,
        stats: [
          { name: 'hp', value: 95 },
          { name: 'attack', value: 125 },
          { name: 'defense', value: 79 },
          { name: 'speed', value: 81 }
        ]
      },
      {
        id: 150,
        name: 'mewtwo',
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png',
        rarity: 'legendary',
        types: [{ name: 'psychic', icon: '🔮', color: '#F85888' }],
        totalStats: 680,
        height: 20,
        weight: 1220,
        stats: [
          { name: 'hp', value: 106 },
          { name: 'attack', value: 110 },
          { name: 'defense', value: 90 },
          { name: 'speed', value: 130 }
        ]
      }
    ]

    await kv.set('pokemon_data', pokemonData)
    await kv.set('pokemon_initialized', true)
    console.log(`Pokemon data initialized: ${pokemonData.length} Pokemon`)
  } catch (error) {
    console.log('Error initializing pokemon data:', error)
  }
}

// Get user pokemon for battle
app.get('/make-server-eca1b907/user-pokemon', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const collection = await kv.get(`collection_${user.id}`) || {}
    const pokemonData = await kv.get('pokemon_data') || []
    
    // Get pokemon from user's collection
    const userPokemon = []
    for (const [pokemonId, count] of Object.entries(collection)) {
      if (count > 0) {
        const pokemon = pokemonData.find((p: any) => p.id === parseInt(pokemonId))
        if (pokemon) {
          // Convert stats array to object format expected by battles
          const statsObj = {}
          pokemon.stats.forEach((stat: any) => {
            statsObj[stat.name] = stat.value
          })
          
          userPokemon.push({
            ...pokemon,
            base_stats: statsObj
          })
        }
      }
    }

    return c.json({ pokemon: userPokemon })
  } catch (error) {
    console.log('Get user pokemon error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Battle endpoint
app.post('/make-server-eca1b907/battle', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { playerPokemonId } = await c.req.json()
    const pokemonData = await kv.get('pokemon_data') || []
    
    // Find player's pokemon
    const playerPokemon = pokemonData.find((p: any) => p.id === playerPokemonId)
    if (!playerPokemon) {
      return c.json({ error: 'Pokemon not found' }, 400)
    }

    // Convert stats array to object
    const playerStatsObj = {}
    playerPokemon.stats.forEach((stat: any) => {
      playerStatsObj[stat.name] = stat.value
    })

    // Get random opponent pokemon
    const opponentPokemon = pokemonData[Math.floor(Math.random() * pokemonData.length)]
    const opponentStatsObj = {}
    opponentPokemon.stats.forEach((stat: any) => {
      opponentStatsObj[stat.name] = stat.value
    })

    // Calculate battle stats with rarity multipliers
    const getRarityMultiplier = (rarity: string) => ({
      common: 1,
      uncommon: 1.2,
      rare: 1.4,
      epic: 1.6,
      legendary: 2
    }[rarity] || 1)

    const playerMultiplier = getRarityMultiplier(playerPokemon.rarity)
    const opponentMultiplier = getRarityMultiplier(opponentPokemon.rarity)

    const playerStats = {
      hp: Math.floor(playerStatsObj.hp * playerMultiplier),
      attack: Math.floor(playerStatsObj.attack * playerMultiplier),
      defense: Math.floor(playerStatsObj.defense * playerMultiplier),
      speed: Math.floor(playerStatsObj.speed * playerMultiplier)
    }

    const opponentStats = {
      hp: Math.floor(opponentStatsObj.hp * opponentMultiplier),  
      attack: Math.floor(opponentStatsObj.attack * opponentMultiplier),
      defense: Math.floor(opponentStatsObj.defense * opponentMultiplier),
      speed: Math.floor(opponentStatsObj.speed * opponentMultiplier)
    }

    // Simulate battle turns
    const battleLog = []
    let playerHp = playerStats.hp
    let opponentHp = opponentStats.hp
    let turn = 1
    
    while (playerHp > 0 && opponentHp > 0 && turn <= 10) { // Max 10 turns
      // Player attacks first
      const playerDamage = Math.floor(Math.random() * playerStats.attack / 2) + Math.floor(playerStats.attack / 4)
      opponentHp = Math.max(0, opponentHp - playerDamage)
      
      battleLog.push({
        attacker: 'player',
        damage: playerDamage,
        defenderHp: opponentHp
      })
      
      if (opponentHp <= 0) break
      
      // Opponent attacks back
      const opponentDamage = Math.floor(Math.random() * opponentStats.attack / 2) + Math.floor(opponentStats.attack / 4)
      playerHp = Math.max(0, playerHp - opponentDamage)
      
      battleLog.push({
        attacker: 'opponent',
        damage: opponentDamage,
        defenderHp: playerHp
      })
      
      turn++
    }
    
    // Determine winner based on final HP
    const finalVictory = playerHp > opponentHp
    const coinsReward = finalVictory ? Math.floor(Math.random() * 21) + 10 : 0 // 10-30 coins
    const expReward = 25

    return c.json({
      victory: finalVictory,
      playerPokemon: {
        ...playerPokemon,
        base_stats: playerStatsObj,
        battleStats: playerStats
      },
      opponentPokemon: {
        ...opponentPokemon,
        base_stats: opponentStatsObj,
        battleStats: opponentStats
      },
      rewards: {
        coins: finalVictory ? coinsReward : 0,
        experience: expReward
      },
      coinsAwarded: finalVictory ? coinsReward : 0,
      winner: finalVictory ? 'player' : 'opponent',
      battleLog
    })
  } catch (error) {
    console.log('Battle error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Initialize Pokemon data and start server at the end of main file
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.text('Internal Server Error', 500)
})

// Initialize data on startup
initializePokemonData()

Deno.serve(app.fetch)