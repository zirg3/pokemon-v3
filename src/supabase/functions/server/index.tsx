// Pokémon Portal Server - Complete Version
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

// Default pack types
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

// Achievement definitions
const ACHIEVEMENTS = {
  welcome: { name: 'Добро пожаловать', description: 'Зарегистрируйтесь в PokéPortal', reward: 100, icon: '👋' },
  first_pack: { name: 'Первый пак', description: 'Откройте свой первый пак', reward: 50, icon: '🎁' },
  
  // Collection achievements
  collector_10: { name: 'Коллекционер I', description: 'Соберите 10 уникальных покемонов', reward: 100, icon: '🏆' },
  collector_25: { name: 'Коллекционер II', description: 'Соберите 25 уникальных покемонов', reward: 200, icon: '🏆' },
  collector_50: { name: 'Коллекционер III', description: 'Соберите 50 уникальных покемонов', reward: 500, icon: '🏆' },
  
  // Level achievements
  level_5: { name: 'Первые шаги', description: 'Достигните 5 уровня', reward: 150, icon: '🎯' },
  level_10: { name: 'Новичок', description: 'Достигните 10 уровня', reward: 300, icon: '🎯' },
  level_25: { name: 'Опытный тренер', description: 'Достигните 25 уровня', reward: 500, icon: '🎯' },
  level_50: { name: 'Эксперт', description: 'Достигните 50 уровня', reward: 750, icon: '🎯' },
  
  // Pack opening achievements
  pack_master_10: { name: 'Любитель паков', description: 'Откройте 10 паков', reward: 100, icon: '📦' },
  pack_master_50: { name: 'Знаток паков', description: 'Откройте 50 паков', reward: 300, icon: '📦' },
  
  // Rarity achievements
  rare_collector: { name: 'Охотник за редкостью', description: 'Получите первого редкого покемона', reward: 100, icon: '💎' },
  epic_collector: { name: 'Эпический коллекционер', description: 'Получите первого эпического покемона', reward: 200, icon: '✨' },
  legendary_collector: { name: 'Ловец легенд', description: 'Получите первого легендарного покемона', reward: 500, icon: '🌟' },
  
  // Battle achievements
  first_battle: { name: 'Первая битва', description: 'Выиграйте первую битву', reward: 75, icon: '⚔️' },
  battle_winner_10: { name: 'Воин', description: 'Выиграйте 10 битв', reward: 200, icon: '⚔️' },
  battle_winner_50: { name: 'Ветеран', description: 'Выиграйте 50 битв', reward: 500, icon: '⚔️' },
  
  // Trading achievements
  trader: { name: 'Торговец', description: 'Продайте первого покемона на аукционе', reward: 75, icon: '💰' },
  auction_master: { name: 'Мастер аукционов', description: 'Продайте 10 покемонов', reward: 300, icon: '💰' },
  big_seller: { name: 'Крупный продавец', description: 'Продайте покемона за 500+ монет', reward: 200, icon: '💎' },
  social_trader: { name: 'Социальный торговец', description: 'Купите покемона на аукционе', reward: 100, icon: '🤝' },
  
  // Wealth achievements
  rich: { name: 'Богач', description: 'Накопите 1000 PokéCoins', reward: 200, icon: '💎' },
  millionaire: { name: 'Миллионер', description: 'Накопите 5000 PokéCoins', reward: 500, icon: '💰' }
}

const DAILY_QUESTS = {
  open_pack: { name: 'Открыватель', description: 'Откройте 1 пак', reward: 25, target: 1, icon: '📦' },
  collect_cards: { name: 'Собиратель', description: 'Получите 3 новые карточки', reward: 50, target: 3, icon: '🃏' },
  trade_pokemon: { name: 'Торговец дня', description: 'Продайте 1 покемона', reward: 40, target: 1, icon: '🤝' }
}

// Helper functions
async function checkAchievements(userId: string, event: string, data: any = {}) {
  try {
    const userAchievements = await kv.get(`achievements_${userId}`) || {}
    let changed = false

    // Check specific achievement conditions
    switch (event) {
      case 'pack_opened':
        if (!userAchievements.first_pack?.completed) {
          userAchievements.first_pack = { completed: true, date: new Date().toISOString() }
          changed = true
        }
        break
      case 'battle_won':
        if (!userAchievements.first_battle?.completed) {
          userAchievements.first_battle = { completed: true, date: new Date().toISOString() }
          changed = true
        }
        break
      case 'auction_sale':
        if (!userAchievements.trader?.completed) {
          userAchievements.trader = { completed: true, date: new Date().toISOString() }
          changed = true
        }
        if (data.price >= 500 && !userAchievements.big_seller?.completed) {
          userAchievements.big_seller = { completed: true, date: new Date().toISOString() }
          changed = true
        }
        break
      case 'auction_purchase':
        if (!userAchievements.social_trader?.completed) {
          userAchievements.social_trader = { completed: true, date: new Date().toISOString() }
          changed = true
        }
        break
      case 'coins_updated':
        if (data.poke_coins >= 1000 && !userAchievements.rich?.completed) {
          userAchievements.rich = { completed: true, date: new Date().toISOString() }
          changed = true
        }
        if (data.poke_coins >= 5000 && !userAchievements.millionaire?.completed) {
          userAchievements.millionaire = { completed: true, date: new Date().toISOString() }
          changed = true
        }
        break
    }

    if (changed) {
      await kv.set(`achievements_${userId}`, userAchievements)
      
      // Award achievement rewards
      const userProfile = await kv.get(`user_${userId}`)
      if (userProfile) {
        for (const [key, achievement] of Object.entries(userAchievements)) {
          if (achievement.completed && !achievement.rewarded && ACHIEVEMENTS[key as keyof typeof ACHIEVEMENTS]) {
            userProfile.poke_coins += ACHIEVEMENTS[key as keyof typeof ACHIEVEMENTS].reward
            achievement.rewarded = true
          }
        }
        await kv.set(`user_${userId}`, userProfile)
      }
    }
  } catch (error) {
    console.log('Check achievements error:', error)
  }
}

async function updateQuests(userId: string, questType: string, amount: number = 1) {
  try {
    const today = new Date().toDateString()
    const userQuests = await kv.get(`quests_${userId}_${today}`) || {}
    
    if (questType === 'open_pack' && DAILY_QUESTS.open_pack) {
      if (!userQuests.open_pack) userQuests.open_pack = { progress: 0 }
      userQuests.open_pack.progress = Math.min((userQuests.open_pack.progress || 0) + amount, DAILY_QUESTS.open_pack.target)
    }
    
    if (questType === 'collect_cards' && DAILY_QUESTS.collect_cards) {
      if (!userQuests.collect_cards) userQuests.collect_cards = { progress: 0 }
      userQuests.collect_cards.progress = Math.min((userQuests.collect_cards.progress || 0) + amount, DAILY_QUESTS.collect_cards.target)
    }
    
    if (questType === 'trade_pokemon' && DAILY_QUESTS.trade_pokemon) {
      if (!userQuests.trade_pokemon) userQuests.trade_pokemon = { progress: 0 }
      userQuests.trade_pokemon.progress = Math.min((userQuests.trade_pokemon.progress || 0) + amount, DAILY_QUESTS.trade_pokemon.target)
    }
    
    await kv.set(`quests_${userId}_${today}`, userQuests)
  } catch (error) {
    console.log('Update quests error:', error)
  }
}

async function addExperience(userId: string, exp: number, source: string = 'unknown') {
  try {
    const levelData = await kv.get(`level_${userId}`) || { experience: 0, level: 1 }
    levelData.experience += exp
    
    // Check for level ups
    const getExperienceForLevel = (level: number): number => {
      if (level <= 1) return 0
      return Math.floor(Math.pow(level, 2.5) * 100)
    }
    
    let leveledUp = false
    let newLevel = levelData.level
    
    while (levelData.experience >= getExperienceForLevel(newLevel + 1) && newLevel < 100) {
      newLevel++
      leveledUp = true
    }
    
    // Update user profile with current experience
    const userProfile = await kv.get(`user_${userId}`)
    if (userProfile) {
      userProfile.experience = levelData.experience
      
      if (leveledUp) {
        levelData.level = newLevel
        userProfile.poke_coins += newLevel * 10 // 10 coins per level
      }
      
      await kv.set(`user_${userId}`, userProfile)
    }
    
    await kv.set(`level_${userId}`, levelData)
    
    return { leveledUp, newLevel: leveledUp ? newLevel : null }
  } catch (error) {
    console.log('Add experience error:', error)
    return { leveledUp: false, newLevel: null }
  }
}

// Initialize Pokemon data
async function initializePokemonData() {
  try {
    const existing = await kv.get('pokemon_data')
    // Force update if pokemon don't have types or totalStats
    if (existing && existing.length > 5 && existing[0].types && existing[0].totalStats) return

    const pokemonData = [
      { 
        id: 1, 
        name: 'bulbasaur', 
        rarity: 'common', 
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png', 
        stats: [{ name: 'hp', value: 45 }, { name: 'attack', value: 49 }, { name: 'defense', value: 49 }, { name: 'speed', value: 45 }],
        totalStats: 188,
        types: [{ name: 'grass', icon: '🌿', color: '#78C850' }, { name: 'poison', icon: '☠️', color: '#A040A0' }]
      },
      { 
        id: 4, 
        name: 'charmander', 
        rarity: 'common', 
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png', 
        stats: [{ name: 'hp', value: 39 }, { name: 'attack', value: 52 }, { name: 'defense', value: 43 }, { name: 'speed', value: 65 }],
        totalStats: 199,
        types: [{ name: 'fire', icon: '🔥', color: '#F08030' }]
      },
      { 
        id: 7, 
        name: 'squirtle', 
        rarity: 'common', 
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png', 
        stats: [{ name: 'hp', value: 44 }, { name: 'attack', value: 48 }, { name: 'defense', value: 65 }, { name: 'speed', value: 43 }],
        totalStats: 200,
        types: [{ name: 'water', icon: '💧', color: '#6890F0' }]
      },
      { 
        id: 25, 
        name: 'pikachu', 
        rarity: 'uncommon', 
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png', 
        stats: [{ name: 'hp', value: 35 }, { name: 'attack', value: 55 }, { name: 'defense', value: 40 }, { name: 'speed', value: 90 }],
        totalStats: 220,
        types: [{ name: 'electric', icon: '⚡', color: '#F8D030' }]
      },
      { 
        id: 6, 
        name: 'charizard', 
        rarity: 'epic', 
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png', 
        stats: [{ name: 'hp', value: 78 }, { name: 'attack', value: 84 }, { name: 'defense', value: 78 }, { name: 'speed', value: 100 }],
        totalStats: 340,
        types: [{ name: 'fire', icon: '🔥', color: '#F08030' }, { name: 'flying', icon: '🦅', color: '#A890F0' }]
      },
      { 
        id: 9, 
        name: 'blastoise', 
        rarity: 'rare', 
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png', 
        stats: [{ name: 'hp', value: 79 }, { name: 'attack', value: 83 }, { name: 'defense', value: 100 }, { name: 'speed', value: 78 }],
        totalStats: 340,
        types: [{ name: 'water', icon: '💧', color: '#6890F0' }]
      },
      { 
        id: 3, 
        name: 'venusaur', 
        rarity: 'rare', 
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png', 
        stats: [{ name: 'hp', value: 80 }, { name: 'attack', value: 82 }, { name: 'defense', value: 83 }, { name: 'speed', value: 80 }],
        totalStats: 325,
        types: [{ name: 'grass', icon: '🌿', color: '#78C850' }, { name: 'poison', icon: '☠️', color: '#A040A0' }]
      },
      { 
        id: 150, 
        name: 'mewtwo', 
        rarity: 'legendary', 
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png', 
        stats: [{ name: 'hp', value: 106 }, { name: 'attack', value: 110 }, { name: 'defense', value: 90 }, { name: 'speed', value: 130 }],
        totalStats: 436,
        types: [{ name: 'psychic', icon: '🔮', color: '#F85888' }]
      },
      { 
        id: 144, 
        name: 'articuno', 
        rarity: 'legendary', 
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/144.png', 
        stats: [{ name: 'hp', value: 90 }, { name: 'attack', value: 85 }, { name: 'defense', value: 100 }, { name: 'speed', value: 85 }],
        totalStats: 360,
        types: [{ name: 'ice', icon: '❄️', color: '#98D8D8' }, { name: 'flying', icon: '🦅', color: '#A890F0' }]
      },
      { 
        id: 131, 
        name: 'lapras', 
        rarity: 'epic', 
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/131.png', 
        stats: [{ name: 'hp', value: 130 }, { name: 'attack', value: 85 }, { name: 'defense', value: 80 }, { name: 'speed', value: 60 }],
        totalStats: 355,
        types: [{ name: 'water', icon: '💧', color: '#6890F0' }, { name: 'ice', icon: '❄️', color: '#98D8D8' }]
      }
    ]
    await kv.set('pokemon_data', pokemonData)
    console.log('Pokemon data initialized')
  } catch (error) {
    console.log('Init error:', error)
  }
}

// Basic profile endpoint
app.get('/make-server-eca1b907/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userProfile = await kv.get(`user_${user.id}`) || { 
      id: user.id, 
      name: 'Test User', 
      poke_coins: 500, 
      role: 'user',
      nice_id: 'TestUser123'
    }
    return c.json(userProfile)
  } catch (error) {
    console.log('Profile error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get user levels
app.get('/make-server-eca1b907/levels', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const levelData = await kv.get(`level_${user.id}`) || { experience: 0, level: 1 }
    const rewardHistory = await kv.get(`level_rewards_${user.id}`) || []
    
    return c.json({ 
      levelData,
      rewardHistory 
    })
  } catch (error) {
    console.log('Levels error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Claim level reward
app.post('/make-server-eca1b907/levels/claim-reward', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { level } = await c.req.json()
    
    if (!level || level <= 0) {
      return c.json({ error: 'Invalid level' }, 400)
    }

    const levelData = await kv.get(`level_${user.id}`) || { experience: 0, level: 1 }
    const rewardHistory = await kv.get(`level_rewards_${user.id}`) || []
    
    // Check if user has reached this level
    if (levelData.level < level) {
      return c.json({ error: 'Level not reached yet' }, 400)
    }
    
    // Check if reward already claimed
    if (rewardHistory.includes(level)) {
      return c.json({ error: 'Reward already claimed' }, 400)
    }
    
    // Check if level has a reward (every 3rd level)
    if (level % 3 !== 0) {
      return c.json({ error: 'No reward for this level' }, 400)
    }
    
    // Calculate reward
    let reward = null
    if (level % 15 === 0) {
      reward = { type: 'pokemon', amount: 1, description: 'Случайный эпический покемон' }
    } else if (level % 9 === 0) {
      reward = { type: 'pokemon', amount: 1, description: 'Случайный редкий покемон' }
    } else {
      const coins = Math.floor(level * 25 + Math.random() * 50)
      reward = { type: 'coins', amount: coins, description: `${coins} PokéCoins` }
    }
    
    // Give reward
    const userProfile = await kv.get(`user_${user.id}`)
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404)
    }
    
    if (reward.type === 'coins') {
      userProfile.poke_coins += reward.amount
      await kv.set(`user_${user.id}`, userProfile)
    } else if (reward.type === 'pokemon') {
      // Give random pokemon of specified rarity
      const pokemonData = await kv.get('pokemon_data') || []
      const rarity = level % 15 === 0 ? 'epic' : 'rare'
      const pokemonOfRarity = pokemonData.filter((p: any) => p.rarity === rarity)
      
      if (pokemonOfRarity.length > 0) {
        const randomPokemon = pokemonOfRarity[Math.floor(Math.random() * pokemonOfRarity.length)]
        const collection = await kv.get(`collection_${user.id}`) || {}
        collection[randomPokemon.id] = (collection[randomPokemon.id] || 0) + 1
        await kv.set(`collection_${user.id}`, collection)
      }
    }
    
    // Mark reward as claimed
    rewardHistory.push(level)
    await kv.set(`level_rewards_${user.id}`, rewardHistory)
    
    return c.json({ 
      message: `Награда за ${level} уровень получена! ${reward.description}`,
      reward
    })
  } catch (error) {
    console.log('Claim reward error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Basic signup 
app.post('/make-server-eca1b907/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json()
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: 'user' },
      email_confirm: true
    })

    if (error) {
      console.log('Signup error:', error)
      return c.json({ error: error.message }, 400)
    }

    // Generate nice user ID
    const generateNiceUserId = () => {
      const adjectives = ['Red', 'Blue', 'Swift', 'Brave', 'Wild', 'Fire', 'Water', 'Thunder']
      const animals = ['Pikachu', 'Charizard', 'Blastoise', 'Venusaur', 'Lucario', 'Garchomp']
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
      const animal = animals[Math.floor(Math.random() * animals.length)]
      const number = Math.floor(Math.random() * 9999) + 1
      return `${adj}${animal}${number}`
    }

    let niceId = generateNiceUserId()
    let existingUser = await kv.get(`user_by_nice_id_${niceId}`)
    while (existingUser) {
      niceId = generateNiceUserId()
      existingUser = await kv.get(`user_by_nice_id_${niceId}`)
    }

    // Initialize user data
    const userData = {
      id: data.user.id,
      nice_id: niceId,
      email,
      name,
      role: 'user',
      poke_coins: 500,
      experience: 0,
      created_at: new Date().toISOString()
    }

    await kv.set(`user_${data.user.id}`, userData)
    await kv.set(`user_by_nice_id_${niceId}`, data.user.id)
    
    // Track user in global list
    const usersList = await kv.get('all_users_list') || []
    usersList.push(data.user.id)
    await kv.set('all_users_list', usersList)
    
    // Give new users some starter pokemon
    const starterCollection = { 1: 1, 4: 1, 7: 1 }
    await kv.set(`collection_${data.user.id}`, starterCollection)
    
    // Initialize level data
    await kv.set(`level_${data.user.id}`, { experience: 0, level: 1 })
    await kv.set(`level_rewards_${data.user.id}`, [])

    return c.json({ user: data.user })
  } catch (error) {
    console.log('Signup error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get pokemon data
app.get('/make-server-eca1b907/pokemon', async (c) => {
  try {
    const pokemonData = await kv.get('pokemon_data') || []
    return c.json(pokemonData)
  } catch (error) {
    console.log('Pokemon data error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get user collection
app.get('/make-server-eca1b907/collection', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const collection = await kv.get(`collection_${user.id}`) || {}
    return c.json(collection)
  } catch (error) {
    console.log('Collection error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get pack types
app.get('/make-server-eca1b907/pack-types', async (c) => {
  try {
    const packTypes = DEFAULT_PACK_TYPES
    return c.json(packTypes)
  } catch (error) {
    console.log('Pack types error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Open pack endpoint
app.post('/make-server-eca1b907/open-pack', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { packType } = await c.req.json()
    
    const pack = DEFAULT_PACK_TYPES[packType as keyof typeof DEFAULT_PACK_TYPES]
    
    if (!pack) {
      return c.json({ error: 'Invalid pack type' }, 400)
    }

    const userProfile = await kv.get(`user_${user.id}`)
    if (!userProfile || userProfile.poke_coins < pack.cost) {
      return c.json({ error: 'Insufficient coins' }, 400)
    }

    // Deduct coins
    userProfile.poke_coins -= pack.cost
    await kv.set(`user_${user.id}`, userProfile)

    // Generate cards using pack-specific rarities
    const pokemonData = await kv.get('pokemon_data') || []
    const cards = []
    
    for (let i = 0; i < pack.cards; i++) {
      const rand = Math.random()
      let selectedRarity = 'common'
      let cumulative = 0
      
      // Use pack-specific rarity chances
      for (const [rarity, rarityData] of Object.entries(pack.rarities)) {
        if (rarityData.enabled) {
          cumulative += rarityData.chance
          if (rand <= cumulative) {
            selectedRarity = rarity
            break
          }
        }
      }
      
      const pokemonOfRarity = pokemonData.filter((p: any) => p.rarity === selectedRarity)
      const selectedPokemon = pokemonOfRarity[Math.floor(Math.random() * pokemonOfRarity.length)]
      
      if (selectedPokemon) {
        // Add card ID for pack opening animation
        cards.push({
          ...selectedPokemon,
          cardId: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      }
    }

    // Add to collection
    const collection = await kv.get(`collection_${user.id}`) || {}
    const newCards = []
    for (const card of cards) {
      const wasNew = !collection[card.id]
      collection[card.id] = (collection[card.id] || 0) + 1
      if (wasNew) newCards.push(card)
    }
    await kv.set(`collection_${user.id}`, collection)

    // Add experience for opening pack and getting cards
    let totalExp = 25 // Base exp for opening pack
    
    for (const card of cards) {
      switch (card.rarity) {
        case 'common': totalExp += 10; break
        case 'uncommon': totalExp += 20; break
        case 'rare': totalExp += 40; break
        case 'epic': totalExp += 80; break
        case 'legendary': totalExp += 200; break
      }
    }
    
    const levelResult = await addExperience(user.id, totalExp, 'pack_opening')

    // Create posts for epic and legendary pokemon
    const posts = await kv.get('posts') || []
    for (const card of cards) {
      if (card.rarity === 'epic' || card.rarity === 'legendary') {
        const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newPost = {
          id: postId,
          user_id: user.id,
          type: 'pokemon_catch',
          content: `Поймал ${card.rarity === 'legendary' ? 'легендарного' : 'эпического'} покемона ${card.name}! 🎉`,
          pokemon_data: {
            id: card.id,
            name: card.name,
            image: card.image,
            rarity: card.rarity,
            types: card.types
          },
          likes: [],
          comments: [],
          created_at: new Date().toISOString()
        }
        posts.push(newPost)
      }
    }
    await kv.set('posts', posts)

    // Check achievements and quests
    await checkAchievements(user.id, 'pack_opened', { cards, newCards, collection })
    await updateQuests(user.id, 'open_pack', 1)
    await updateQuests(user.id, 'collect_cards', newCards.length)

    return c.json({ 
      cards, 
      remainingCoins: userProfile.poke_coins,
      experienceGained: totalExp,
      levelResult
    })
  } catch (error) {
    console.log('Open pack error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get active auctions
app.get('/make-server-eca1b907/auctions/active', async (c) => {
  try {
    const auctions = await kv.get('auctions') || []
    
    // Filter only active auctions and not expired
    const now = new Date()
    const activeAuctions = auctions.filter((auction: any) => {
      if (auction.status !== 'active') return false
      
      const expiresAt = new Date(auction.expiresAt)
      return expiresAt > now
    })
    
    // Add seller nice_id and highest bidder nice_id for display
    for (const auction of activeAuctions) {
      const seller = await kv.get(`user_${auction.sellerId}`)
      auction.sellerNiceId = seller?.nice_id || 'Unknown'
      
      if (auction.highestBidderId) {
        const highestBidder = await kv.get(`user_${auction.highestBidderId}`)
        auction.highestBidderNiceId = highestBidder?.nice_id || 'Unknown'
      }
    }

    return c.json(activeAuctions)
  } catch (error) {
    console.log('Get active auctions error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get user's auctions
app.get('/make-server-eca1b907/auctions/my', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const auctions = await kv.get('auctions') || []
    
    // Filter auctions by current user and add bidder info
    const userAuctions = []
    
    for (const auction of auctions) {
      if (auction.sellerId === user.id) {
        // Add highest bidder info if exists
        if (auction.highestBidderId) {
          const highestBidder = await kv.get(`user_${auction.highestBidderId}`)
          auction.highestBidderNiceId = highestBidder?.nice_id || 'Unknown'
        }
        userAuctions.push(auction)
      }
    }

    return c.json(userAuctions)
  } catch (error) {
    console.log('Get user auctions error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create auction
app.post('/make-server-eca1b907/auctions/create', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { pokemonId, startingPrice, duration } = await c.req.json()
    
    // Validate inputs
    if (!pokemonId || !startingPrice || !duration) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    if (startingPrice <= 0) {
      return c.json({ error: 'Starting price must be positive' }, 400)
    }

    // Check if user owns this pokemon
    const collection = await kv.get(`collection_${user.id}`) || {}
    if (!collection[pokemonId] || collection[pokemonId] <= 0) {
      return c.json({ error: 'You do not own this Pokemon' }, 400)
    }

    // Remove one pokemon from collection
    collection[pokemonId] -= 1
    if (collection[pokemonId] === 0) {
      delete collection[pokemonId]
    }
    await kv.set(`collection_${user.id}`, collection)

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + duration)

    // Create auction
    const auctions = await kv.get('auctions') || []
    const auctionId = `auction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newAuction = {
      id: auctionId,
      sellerId: user.id,
      pokemonId: parseInt(pokemonId),
      startingPrice: parseInt(startingPrice),
      currentPrice: parseInt(startingPrice),
      highestBidderId: null,
      highestBidderNiceId: null,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      bids: [],
      escrowAmount: 0 // Amount held in escrow for current highest bidder
    }

    auctions.push(newAuction)
    await kv.set('auctions', auctions)

    // Check achievement for first auction and update quests
    await checkAchievements(user.id, 'auction_sale', { price: startingPrice })
    await updateQuests(user.id, 'trade_pokemon', 1)

    return c.json({ auction: newAuction })
  } catch (error) {
    console.log('Create auction error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Place bid on auction
app.post('/make-server-eca1b907/auctions/bid', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { auctionId, bidAmount } = await c.req.json()
    
    // Validate inputs
    if (!auctionId || !bidAmount || bidAmount <= 0) {
      return c.json({ error: 'Invalid bid parameters' }, 400)
    }

    // Get auctions
    const auctions = await kv.get('auctions') || []
    const auctionIndex = auctions.findIndex((a: any) => a.id === auctionId)
    
    if (auctionIndex === -1) {
      return c.json({ error: 'Auction not found' }, 404)
    }

    const auction = auctions[auctionIndex]

    // Check if auction is still active
    const now = new Date()
    const expiresAt = new Date(auction.expiresAt)
    
    if (auction.status !== 'active' || expiresAt <= now) {
      return c.json({ error: 'Auction is no longer active' }, 400)
    }

    // Check if user is not the seller
    if (auction.sellerId === user.id) {
      return c.json({ error: 'Cannot bid on own auction' }, 400)
    }

    // Check if user is not already the highest bidder
    if (auction.highestBidderId === user.id) {
      return c.json({ error: 'You are already the highest bidder' }, 400)
    }

    // Check if bid is higher than current price
    if (bidAmount <= auction.currentPrice) {
      return c.json({ error: 'Bid must be higher than current price' }, 400)
    }

    // Check if user has enough coins
    const userProfile = await kv.get(`user_${user.id}`)
    if (!userProfile || userProfile.poke_coins < bidAmount) {
      return c.json({ error: 'Insufficient coins' }, 400)
    }

    // Return coins to previous highest bidder if exists
    if (auction.highestBidderId && auction.highestBidderId !== user.id) {
      const previousBidder = await kv.get(`user_${auction.highestBidderId}`)
      if (previousBidder) {
        previousBidder.poke_coins += auction.escrowAmount
        await kv.set(`user_${auction.highestBidderId}`, previousBidder)
      }
    }

    // Deduct coins from current bidder (hold in escrow)
    userProfile.poke_coins -= bidAmount
    await kv.set(`user_${user.id}`, userProfile)

    // Get bidder's nice_id for display
    const bidderNiceId = userProfile.nice_id || 'Unknown'

    // Update auction
    auction.currentPrice = bidAmount
    auction.highestBidderId = user.id
    auction.highestBidderNiceId = bidderNiceId
    auction.escrowAmount = bidAmount
    auction.bids.push({
      bidderId: user.id,
      bidderNiceId: bidderNiceId,
      amount: bidAmount,
      timestamp: new Date().toISOString()
    })

    // If this is a "buy now" scenario (significantly higher bid), end auction immediately
    const buyNowThreshold = auction.startingPrice * 3
    if (bidAmount >= buyNowThreshold) {
      // Complete the auction immediately
      auction.status = 'sold'
      
      // Transfer pokemon to buyer
      const buyerCollection = await kv.get(`collection_${user.id}`) || {}
      buyerCollection[auction.pokemonId] = (buyerCollection[auction.pokemonId] || 0) + 1
      await kv.set(`collection_${user.id}`, buyerCollection)
      
      // Check social trader achievement
      await checkAchievements(user.id, 'auction_purchase', {})

      // Give coins to seller (from escrow)
      const seller = await kv.get(`user_${auction.sellerId}`)
      if (seller) {
        seller.poke_coins += auction.escrowAmount
        await kv.set(`user_${auction.sellerId}`, seller)
        
        // Check coins achievement for seller
        await checkAchievements(auction.sellerId, 'coins_updated', { poke_coins: seller.poke_coins })
        
        // Check big seller achievement
        await checkAchievements(auction.sellerId, 'auction_sale', { price: auction.escrowAmount })
      }
      
      // Clear escrow since auction is completed
      auction.escrowAmount = 0
    }

    auctions[auctionIndex] = auction
    await kv.set('auctions', auctions)

    return c.json({ success: true, auction })
  } catch (error) {
    console.log('Place bid error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Complete expired auctions
app.post('/make-server-eca1b907/auctions/complete-expired', async (c) => {
  try {
    const auctions = await kv.get('auctions') || []
    const now = new Date()
    let completedCount = 0
    
    for (let i = 0; i < auctions.length; i++) {
      const auction = auctions[i]
      
      if (auction.status === 'active') {
        const expiresAt = new Date(auction.expiresAt)
        
        if (expiresAt <= now) {
          // Auction has expired
          if (auction.highestBidderId && auction.escrowAmount > 0) {
            // There was a winning bid - complete the sale
            auction.status = 'sold'
            
            // Transfer pokemon to buyer
            const buyerCollection = await kv.get(`collection_${auction.highestBidderId}`) || {}
            buyerCollection[auction.pokemonId] = (buyerCollection[auction.pokemonId] || 0) + 1
            await kv.set(`collection_${auction.highestBidderId}`, buyerCollection)
            
            // Give coins to seller from escrow
            const seller = await kv.get(`user_${auction.sellerId}`)
            if (seller) {
              seller.poke_coins += auction.escrowAmount
              await kv.set(`user_${auction.sellerId}`, seller)
              
              // Check achievements
              await checkAchievements(auction.sellerId, 'coins_updated', { poke_coins: seller.poke_coins })
              await checkAchievements(auction.sellerId, 'auction_sale', { price: auction.escrowAmount })
            }
            
            // Check achievements for buyer
            await checkAchievements(auction.highestBidderId, 'auction_purchase', {})
            
            auction.escrowAmount = 0
          } else {
            // No bids - return pokemon to seller
            auction.status = 'expired'
            
            const sellerCollection = await kv.get(`collection_${auction.sellerId}`) || {}
            sellerCollection[auction.pokemonId] = (sellerCollection[auction.pokemonId] || 0) + 1
            await kv.set(`collection_${auction.sellerId}`, sellerCollection)
          }
          
          auctions[i] = auction
          completedCount++
        }
      }
    }
    
    if (completedCount > 0) {
      await kv.set('auctions', auctions)
    }
    
    return c.json({ completedCount })
  } catch (error) {
    console.log('Complete expired auctions error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

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
    
    const userPokemon = []
    for (const [pokemonId, count] of Object.entries(collection)) {
      if (count > 0) {
        const pokemon = pokemonData.find((p: any) => p.id === parseInt(pokemonId))
        if (pokemon) {
          const statsObj = {}
          pokemon.stats.forEach((stat: any) => {
            statsObj[stat.name] = stat.value
          })
          userPokemon.push({ ...pokemon, base_stats: statsObj })
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
    
    const playerPokemon = pokemonData.find((p: any) => p.id === playerPokemonId)
    if (!playerPokemon) {
      return c.json({ error: 'Pokemon not found' }, 400)
    }

    const playerStatsObj = {}
    playerPokemon.stats.forEach((stat: any) => {
      playerStatsObj[stat.name] = stat.value
    })

    const opponentPokemon = pokemonData[Math.floor(Math.random() * pokemonData.length)]
    const opponentStatsObj = {}
    opponentPokemon.stats.forEach((stat: any) => {
      opponentStatsObj[stat.name] = stat.value
    })

    const playerStats = {
      hp: playerStatsObj.hp || 50,
      attack: playerStatsObj.attack || 40,
      defense: playerStatsObj.defense || 35,
      speed: playerStatsObj.speed || 45
    }

    const opponentStats = {
      hp: opponentStatsObj.hp || 50,
      attack: opponentStatsObj.attack || 40,
      defense: opponentStatsObj.defense || 35,
      speed: opponentStatsObj.speed || 45
    }

    const battleLog = [
      { attacker: 'player', damage: 15, defenderHp: opponentStats.hp - 15 },
      { attacker: 'opponent', damage: 12, defenderHp: playerStats.hp - 12 }
    ]
    
    const finalVictory = Math.random() > 0.5
    const coinsReward = finalVictory ? 25 : 0

    // Award battle rewards if victory
    if (finalVictory) {
      const userProfile = await kv.get(`user_${user.id}`)
      if (userProfile) {
        userProfile.poke_coins += coinsReward
        await kv.set(`user_${user.id}`, userProfile)
      }
      await addExperience(user.id, 25, 'battle_victory')
      await checkAchievements(user.id, 'battle_won', {})
    }

    return c.json({
      victory: finalVictory,
      playerPokemon: { ...playerPokemon, base_stats: playerStatsObj, battleStats: playerStats },
      opponentPokemon: { ...opponentPokemon, base_stats: opponentStatsObj, battleStats: opponentStats },
      rewards: { coins: coinsReward, experience: 25 },
      coinsAwarded: coinsReward,
      winner: finalVictory ? 'player' : 'opponent',
      battleLog
    })
  } catch (error) {
    console.log('Battle error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get achievements
app.get('/make-server-eca1b907/achievements', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userAchievements = await kv.get(`achievements_${user.id}`) || {}
    
    // Convert to array format with all achievement definitions
    const achievementsArray = Object.keys(ACHIEVEMENTS).map(key => ({
      id: key,
      ...ACHIEVEMENTS[key as keyof typeof ACHIEVEMENTS],
      completed: userAchievements[key]?.completed || false,
      completedAt: userAchievements[key]?.date || null
    }))

    return c.json(achievementsArray)
  } catch (error) {
    console.log('Achievements error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get quests
app.get('/make-server-eca1b907/quests', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const today = new Date().toDateString()
    const userQuests = await kv.get(`quests_${user.id}_${today}`) || {}

    // Convert to array format
    const questsArray = Object.keys(DAILY_QUESTS).map(key => {
      const quest = DAILY_QUESTS[key as keyof typeof DAILY_QUESTS]
      const progress = userQuests[key]?.progress || 0
      const completed = progress >= quest.target
      
      return {
        id: key,
        ...quest,
        progress,
        completed
      }
    })

    return c.json(questsArray)
  } catch (error) {
    console.log('Quests error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Admin endpoints
app.get('/make-server-eca1b907/admin/users', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userProfile = await kv.get(`user_${user.id}`)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ error: 'Access denied' }, 403)
    }

    const allUsers = []
    const usersList = await kv.get('all_users_list') || []
    
    for (const userId of usersList) {
      const profile = await kv.get(`user_${userId}`)
      if (profile) {
        allUsers.push(profile)
      }
    }
    
    allUsers.push(userProfile)
    
    // Create test users if needed
    if (usersList.length === 0) {
      const testUsers = [
        { id: 'test-user-1', nice_id: 'RedPikachu123', name: 'Test User 1', email: 'test1@example.com', role: 'user', poke_coins: 150, created_at: new Date().toISOString() },
        { id: 'test-user-2', nice_id: 'BlueCharizard456', name: 'Test User 2', email: 'test2@example.com', role: 'user', poke_coins: 300, created_at: new Date().toISOString() }
      ]
      
      for (const testUser of testUsers) {
        await kv.set(`user_${testUser.id}`, testUser)
        await kv.set(`user_by_nice_id_${testUser.nice_id}`, testUser.id)
      }
      
      allUsers.push(...testUsers)
      await kv.set('all_users_list', ['test-user-1', 'test-user-2'])
    }
    
    const uniqueUsers = allUsers.filter((user, index, self) => 
      index === self.findIndex((u) => u.id === user.id)
    )
    
    return c.json({ users: uniqueUsers })
  } catch (error) {
    console.log('Admin users error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.post('/make-server-eca1b907/admin/add-coins', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userProfile = await kv.get(`user_${user.id}`)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ error: 'Access denied' }, 403)
    }

    const { targetNiceId, amount } = await c.req.json()
    
    const targetUserId = await kv.get(`user_by_nice_id_${targetNiceId}`)
    if (!targetUserId) {
      return c.json({ error: 'User not found' }, 404)
    }

    const targetUserProfile = await kv.get(`user_${targetUserId}`)
    if (!targetUserProfile) {
      return c.json({ error: 'User profile not found' }, 404)
    }

    targetUserProfile.poke_coins += amount
    await kv.set(`user_${targetUserId}`, targetUserProfile)

    return c.json({ 
      message: `Added ${amount} coins to ${targetNiceId}`,
      newBalance: targetUserProfile.poke_coins
    })
  } catch (error) {
    console.log('Add coins error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.post('/make-server-eca1b907/admin/update-role', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userProfile = await kv.get(`user_${user.id}`)
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ error: 'Access denied' }, 403)
    }

    const { targetNiceId, newRole } = await c.req.json()
    
    const targetUserId = await kv.get(`user_by_nice_id_${targetNiceId}`)
    if (!targetUserId) {
      return c.json({ error: 'User not found' }, 404)
    }

    const targetUserProfile = await kv.get(`user_${targetUserId}`)
    if (!targetUserProfile) {
      return c.json({ error: 'User profile not found' }, 404)
    }

    targetUserProfile.role = newRole
    await kv.set(`user_${targetUserId}`, targetUserProfile)

    return c.json({ 
      message: `Updated role of ${targetNiceId} to ${newRole}`
    })
  } catch (error) {
    console.log('Update role error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get leaderboard (top users by experience)
app.get('/make-server-eca1b907/leaderboard', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50')
    
    // Get all user profiles
    const allUsers = await kv.getByPrefix('user_')
    const usersWithExp = []
    
    for (const userData of allUsers) {
      // Skip invalid users or system entries
      if (!userData.name || !userData.nice_id || !userData.id) continue
      
      // Get experience from user profile or level data
      let experience = userData.experience || 0
      const levelData = await kv.get(`level_${userData.id}`)
      
      // If user profile doesn't have experience but level data exists, use level data
      if (experience === 0 && levelData?.experience) {
        experience = levelData.experience
        // Update user profile with experience for future queries
        userData.experience = experience
        await kv.set(`user_${userData.id}`, userData)
      }
      
      const currentLevel = levelData?.level || 1
      
      usersWithExp.push({
        id: userData.id,
        name: userData.name,
        nice_id: userData.nice_id,
        experience: experience,
        level: currentLevel,
        role: userData.role || 'user'
      })
    }
    
    // Sort by experience (highest first) and take top N
    const topUsers = usersWithExp
      .sort((a, b) => b.experience - a.experience)
      .slice(0, limit)
    
    return c.json({ 
      leaderboard: topUsers,
      total: topUsers.length 
    })
  } catch (error) {
    console.log('Leaderboard error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Upload avatar
app.post('/make-server-eca1b907/upload-avatar', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.formData()
    const file = body.get('avatar') as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // Check file size (max 1MB)
    if (file.size > 1024 * 1024) {
      return c.json({ error: 'File size must be less than 1MB' }, 400)
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return c.json({ error: 'File must be an image' }, 400)
    }

    const bucketName = 'make-eca1b907-avatars'
    
    // Create bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false })
    }

    // Get user profile to delete old avatar
    const userProfile = await kv.get(`user_${user.id}`)
    if (userProfile?.avatar_path) {
      await supabase.storage.from(bucketName).remove([userProfile.avatar_path])
    }

    // Upload new avatar
    const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`
    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file)

    if (uploadError) {
      console.log('Upload error:', uploadError)
      return c.json({ error: 'Upload failed' }, 500)
    }

    // Get signed URL
    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 60 * 60 * 24 * 365) // 1 year

    // Update user profile
    if (userProfile) {
      userProfile.avatar_path = fileName
      userProfile.avatar_url = signedUrlData?.signedUrl
      await kv.set(`user_${user.id}`, userProfile)
    }

    return c.json({ 
      success: true, 
      avatar_url: signedUrlData?.signedUrl,
      avatar_path: fileName
    })
  } catch (error) {
    console.log('Upload avatar error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get posts feed
app.get('/make-server-eca1b907/posts', async (c) => {
  try {
    const posts = await kv.get('posts') || []
    
    // Sort by created date (newest first)
    const sortedPosts = posts
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50) // Limit to 50 most recent posts
    
    // Add user info to posts
    for (const post of sortedPosts) {
      const userProfile = await kv.get(`user_${post.user_id}`)
      if (userProfile) {
        post.user_name = userProfile.name
        post.user_nice_id = userProfile.nice_id
        post.user_avatar_url = userProfile.avatar_url
        
        // Refresh avatar URL if needed
        if (userProfile.avatar_path && (!userProfile.avatar_url || userProfile.avatar_url.includes('expired'))) {
          const { data: signedUrlData } = await supabase.storage
            .from('make-eca1b907-avatars')
            .createSignedUrl(userProfile.avatar_path, 60 * 60 * 24 * 365)
          
          if (signedUrlData?.signedUrl) {
            userProfile.avatar_url = signedUrlData.signedUrl
            await kv.set(`user_${post.user_id}`, userProfile)
            post.user_avatar_url = signedUrlData.signedUrl
          }
        }
      }
    }

    return c.json(sortedPosts)
  } catch (error) {
    console.log('Get posts error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create post
app.post('/make-server-eca1b907/posts', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { content, type = 'user_post', pokemon_data = null } = await c.req.json()
    
    if (!content || content.trim().length === 0) {
      return c.json({ error: 'Post content cannot be empty' }, 400)
    }

    if (content.length > 500) {
      return c.json({ error: 'Post content too long (max 500 characters)' }, 400)
    }

    const posts = await kv.get('posts') || []
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newPost = {
      id: postId,
      user_id: user.id,
      type: type, // 'user_post', 'pokemon_catch', 'achievement'
      content: content.trim(),
      pokemon_data: pokemon_data,
      likes: [],
      comments: [],
      created_at: new Date().toISOString()
    }

    posts.push(newPost)
    await kv.set('posts', posts)

    return c.json({ success: true, post: newPost })
  } catch (error) {
    console.log('Create post error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Like/unlike post
app.post('/make-server-eca1b907/posts/:postId/like', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const postId = c.req.param('postId')
    const posts = await kv.get('posts') || []
    const postIndex = posts.findIndex((p: any) => p.id === postId)
    
    if (postIndex === -1) {
      return c.json({ error: 'Post not found' }, 404)
    }

    const post = posts[postIndex]
    const likeIndex = post.likes.indexOf(user.id)
    
    if (likeIndex === -1) {
      // Add like
      post.likes.push(user.id)
    } else {
      // Remove like
      post.likes.splice(likeIndex, 1)
    }

    posts[postIndex] = post
    await kv.set('posts', posts)

    return c.json({ success: true, likes_count: post.likes.length, liked: likeIndex === -1 })
  } catch (error) {
    console.log('Like post error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Add comment to post
app.post('/make-server-eca1b907/posts/:postId/comment', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const postId = c.req.param('postId')
    const { content } = await c.req.json()
    
    if (!content || content.trim().length === 0) {
      return c.json({ error: 'Comment cannot be empty' }, 400)
    }

    if (content.length > 200) {
      return c.json({ error: 'Comment too long (max 200 characters)' }, 400)
    }

    const posts = await kv.get('posts') || []
    const postIndex = posts.findIndex((p: any) => p.id === postId)
    
    if (postIndex === -1) {
      return c.json({ error: 'Post not found' }, 404)
    }

    const userProfile = await kv.get(`user_${user.id}`)
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newComment = {
      id: commentId,
      user_id: user.id,
      user_name: userProfile?.name || 'Unknown',
      user_nice_id: userProfile?.nice_id || 'Unknown',
      content: content.trim(),
      created_at: new Date().toISOString()
    }

    const post = posts[postIndex]
    post.comments.push(newComment)
    posts[postIndex] = post
    await kv.set('posts', posts)

    return c.json({ success: true, comment: newComment })
  } catch (error) {
    console.log('Add comment error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Edit post
app.put('/make-server-eca1b907/posts/:postId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const postId = c.req.param('postId')
    const { content } = await c.req.json()
    
    if (!content || content.trim().length === 0) {
      return c.json({ error: 'Post content cannot be empty' }, 400)
    }

    if (content.length > 500) {
      return c.json({ error: 'Post content too long (max 500 characters)' }, 400)
    }

    const posts = await kv.get('posts') || []
    const postIndex = posts.findIndex((p: any) => p.id === postId)
    
    if (postIndex === -1) {
      return c.json({ error: 'Post not found' }, 404)
    }

    const post = posts[postIndex]
    
    // Only post owner can edit
    if (post.user_id !== user.id) {
      return c.json({ error: 'Not authorized to edit this post' }, 403)
    }

    // Don't allow editing pokemon catch posts
    if (post.type === 'pokemon_catch') {
      return c.json({ error: 'Cannot edit pokemon catch posts' }, 400)
    }

    post.content = content.trim()
    post.edited_at = new Date().toISOString()
    
    posts[postIndex] = post
    await kv.set('posts', posts)

    return c.json({ success: true, post })
  } catch (error) {
    console.log('Edit post error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Delete post
app.delete('/make-server-eca1b907/posts/:postId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const postId = c.req.param('postId')
    const posts = await kv.get('posts') || []
    const postIndex = posts.findIndex((p: any) => p.id === postId)
    
    if (postIndex === -1) {
      return c.json({ error: 'Post not found' }, 404)
    }

    const post = posts[postIndex]
    
    // Only post owner can delete
    if (post.user_id !== user.id) {
      return c.json({ error: 'Not authorized to delete this post' }, 403)
    }

    posts.splice(postIndex, 1)
    await kv.set('posts', posts)

    return c.json({ success: true })
  } catch (error) {
    console.log('Delete post error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Edit comment
app.put('/make-server-eca1b907/posts/:postId/comment/:commentId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const postId = c.req.param('postId')
    const commentId = c.req.param('commentId')
    const { content } = await c.req.json()
    
    if (!content || content.trim().length === 0) {
      return c.json({ error: 'Comment cannot be empty' }, 400)
    }

    if (content.length > 200) {
      return c.json({ error: 'Comment too long (max 200 characters)' }, 400)
    }

    const posts = await kv.get('posts') || []
    const postIndex = posts.findIndex((p: any) => p.id === postId)
    
    if (postIndex === -1) {
      return c.json({ error: 'Post not found' }, 404)
    }

    const post = posts[postIndex]
    const commentIndex = post.comments.findIndex((c: any) => c.id === commentId)
    
    if (commentIndex === -1) {
      return c.json({ error: 'Comment not found' }, 404)
    }

    const comment = post.comments[commentIndex]
    
    // Only comment owner can edit
    if (comment.user_id !== user.id) {
      return c.json({ error: 'Not authorized to edit this comment' }, 403)
    }

    comment.content = content.trim()
    comment.edited_at = new Date().toISOString()
    
    post.comments[commentIndex] = comment
    posts[postIndex] = post
    await kv.set('posts', posts)

    return c.json({ success: true, comment })
  } catch (error) {
    console.log('Edit comment error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Delete comment
app.delete('/make-server-eca1b907/posts/:postId/comment/:commentId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const postId = c.req.param('postId')
    const commentId = c.req.param('commentId')
    const posts = await kv.get('posts') || []
    const postIndex = posts.findIndex((p: any) => p.id === postId)
    
    if (postIndex === -1) {
      return c.json({ error: 'Post not found' }, 404)
    }

    const post = posts[postIndex]
    const commentIndex = post.comments.findIndex((c: any) => c.id === commentId)
    
    if (commentIndex === -1) {
      return c.json({ error: 'Comment not found' }, 404)
    }

    const comment = post.comments[commentIndex]
    
    // Comment owner or post owner can delete
    if (comment.user_id !== user.id && post.user_id !== user.id) {
      return c.json({ error: 'Not authorized to delete this comment' }, 403)
    }

    post.comments.splice(commentIndex, 1)
    posts[postIndex] = post
    await kv.set('posts', posts)

    return c.json({ success: true })
  } catch (error) {
    console.log('Delete comment error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get user profile by nice_id (for viewing other users)
app.get('/make-server-eca1b907/user/:niceId', async (c) => {
  try {
    const niceId = c.req.param('niceId')
    const userId = await kv.get(`user_by_nice_id_${niceId}`)
    
    if (!userId) {
      return c.json({ error: 'User not found' }, 404)
    }

    const userProfile = await kv.get(`user_${userId}`)
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404)
    }

    // Get level data
    const levelData = await kv.get(`level_${userId}`)
    
    // Refresh avatar URL if needed
    if (userProfile.avatar_path && (!userProfile.avatar_url || userProfile.avatar_url.includes('expired'))) {
      const { data: signedUrlData } = await supabase.storage
        .from('make-eca1b907-avatars')
        .createSignedUrl(userProfile.avatar_path, 60 * 60 * 24 * 365)
      
      if (signedUrlData?.signedUrl) {
        userProfile.avatar_url = signedUrlData.signedUrl
        await kv.set(`user_${userId}`, userProfile)
      }
    }

    // Get user's posts
    const allPosts = await kv.get('posts') || []
    const userPosts = allPosts
      .filter((post: any) => post.user_id === userId)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20) // Latest 20 posts

    return c.json({
      user: {
        id: userProfile.id,
        name: userProfile.name,
        nice_id: userProfile.nice_id,
        role: userProfile.role,
        avatar_url: userProfile.avatar_url,
        created_at: userProfile.created_at,
        level: levelData?.level || 1,
        experience: levelData?.experience || userProfile.experience || 0
      },
      posts: userPosts
    })
  } catch (error) {
    console.log('Get user profile error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Initialize data and serve - MUST BE AT THE END
initializePokemonData()
Deno.serve(app.fetch)