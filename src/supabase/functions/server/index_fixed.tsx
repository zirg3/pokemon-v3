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

// Pokemon rarities
const RARITIES = {
  common: { chance: 0.5, color: '#9CA3AF' },
  uncommon: { chance: 0.3, color: '#10B981' },
  rare: { chance: 0.15, color: '#3B82F6' },
  epic: { chance: 0.04, color: '#8B5CF6' },
  legendary: { chance: 0.01, color: '#F59E0B' }
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

// Generate nice user IDs
function generateNiceUserId() {
  const adjectives = ['Red', 'Blue', 'Swift', 'Brave', 'Wild', 'Fire', 'Water', 'Thunder', 'Shadow', 'Mystic', 'Royal', 'Golden', 'Silver', 'Crystal', 'Storm', 'Frost', 'Flame', 'Ocean', 'Forest', 'Sky']
  const animals = ['Pikachu', 'Charizard', 'Blastoise', 'Venusaur', 'Lucario', 'Garchomp', 'Dragonite', 'Mewtwo', 'Mew', 'Rayquaza', 'Dialga', 'Palkia', 'Giratina', 'Arceus', 'Lugia', 'Ho-oh', 'Kyogre', 'Groudon', 'Reshiram', 'Zekrom']
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const animal = animals[Math.floor(Math.random() * animals.length)]
  const number = Math.floor(Math.random() * 9999) + 1
  
  return `${adj}${animal}${number}`
}

// Expanded achievements system
const ACHIEVEMENTS = {
  // Starter achievements
  first_pack: { name: 'Первый пак', description: 'Откройте свой первый пак', reward: 50, icon: '🎁' },
  welcome: { name: 'Добро пожаловать', description: 'Зарегистрируйтесь в PokéPortal', reward: 100, icon: '👋' },
  
  // Collection achievements
  collector_10: { name: 'Коллекционер I', description: 'Соберите 10 уникальных покемонов', reward: 100, icon: '🏆' },
  collector_25: { name: 'Коллекционер II', description: 'Соберите 25 уникальных покемонов', reward: 200, icon: '🏆' },
  collector_50: { name: 'Коллекционер III', description: 'Соберите 50 уникальных покемонов', reward: 500, icon: '🏆' },
  collector_100: { name: 'Коллекционер IV', description: 'Соберите 100 уникальных покемонов', reward: 1000, icon: '🏆' },
  collector_200: { name: 'Мастер коллекционер', description: 'Соберите 200 уникальных покемонов', reward: 2000, icon: '👑' },
  
  // Rarity achievements
  common_master: { name: 'Обычный коллекционер', description: 'Получите 50 обычных покемонов', reward: 150, icon: '⚪' },
  uncommon_master: { name: 'Необычный коллекционер', description: 'Получите 25 необычных покемонов', reward: 200, icon: '🟢' },
  rare_master: { name: 'Редкий коллекционер', description: 'Получите 15 редких покемонов', reward: 300, icon: '🔵' },
  epic_master: { name: 'Эпический коллекционер', description: 'Получите 10 эпических покемонов', reward: 500, icon: '🟣' },
  legendary_master: { name: 'Легендарный коллекционер', description: 'Получите 5 легендарных покемонов', reward: 1000, icon: '🟡' },
  
  // Pack opening achievements
  pack_opener_10: { name: 'Начинающий открыватель', description: 'Откройте 10 паков', reward: 200, icon: '📦' },
  pack_opener_50: { name: 'Опытный открыватель', description: 'Откройте 50 паков', reward: 500, icon: '📦' },
  pack_opener_100: { name: 'Мастер открывания', description: 'Откройте 100 паков', reward: 1000, icon: '📦' },
  
  // Trading achievements
  trader: { name: 'Торговец', description: 'Продайте первого покемона на аукционе', reward: 75, icon: '💰' },
  successful_trader: { name: 'Успешный торговец', description: 'Продайте 10 покемонов на аукционе', reward: 300, icon: '💰' },
  trading_master: { name: 'Мастер торговли', description: 'Продайте 50 покемонов на аукционе', reward: 1000, icon: '💰' },
  
  // Wealth achievements
  rich: { name: 'Богач', description: 'Накопите 1000 PokéCoins', reward: 200, icon: '💎' },
  wealthy: { name: 'Состоятельный', description: 'Накопите 5000 PokéCoins', reward: 500, icon: '💎' },
  millionaire: { name: 'Миллионер', description: 'Накопите 10000 PokéCoins', reward: 1000, icon: '💎' },
  
  // Luck achievements
  lucky: { name: 'Везунчик', description: 'Получите легендарного покемона', reward: 300, icon: '⭐' },
  super_lucky: { name: 'Супер везунчик', description: 'Получите легендарного покемона из первых 10 паков', reward: 500, icon: '⭐' },
  
  // Type collection achievements
  fire_collector: { name: 'Огненный коллекционер', description: 'Соберите 20 огненных покемонов', reward: 250, icon: '🔥' },
  water_collector: { name: 'Водный коллекционер', description: 'Соберите 20 водных покемонов', reward: 250, icon: '💧' },
  grass_collector: { name: 'Травяной коллекционер', description: 'Соберите 20 травяных покемонов', reward: 250, icon: '🌿' },
  electric_collector: { name: 'Электрический коллекционер', description: 'Соберите 20 электрических покемонов', reward: 250, icon: '⚡' },
  
  // Level achievements
  level_10: { name: 'Новичок', description: 'Достигните 10 уровня', reward: 300, icon: '🎯' },
  level_25: { name: 'Опытный тренер', description: 'Достигните 25 уровня', reward: 500, icon: '🎯' },
  level_50: { name: 'Мастер тренер', description: 'Достигните 50 уровня', reward: 1000, icon: '🎯' },
  level_75: { name: 'Элитный тренер', description: 'Достигните 75 уровня', reward: 1500, icon: '🎯' },
  level_100: { name: 'Чемпион', description: 'Достигните максимального 100 уровня', reward: 2500, icon: '👑' },
  
  // Special achievements
  speedrun: { name: 'Спидраннер', description: 'Соберите 50 покемонов за первый день', reward: 1000, icon: '⚡' },
  patient: { name: 'Терпеливый', description: 'Играйте 30 дней подряд', reward: 1500, icon: '📅' },
  diversity: { name: 'Разнообразие', description: 'Соберите покемонов всех 18 типов', reward: 2000, icon: '🌈' }
}

// Quests system
const DAILY_QUESTS = {
  open_pack: { name: 'Открыватель', description: 'Откройте 1 пак', reward: 25, target: 1, icon: '📦' },
  collect_cards: { name: 'Собиратель', description: 'Получите 3 новые карточки', reward: 50, target: 3, icon: '🃏' },
  trade_pokemon: { name: 'Торговец дня', description: 'Продайте 1 покемона', reward: 40, target: 1, icon: '🤝' }
}

// Pokemon types with icons and colors
const POKEMON_TYPES = {
  normal: { icon: '⚪', color: '#A8A878' },
  fire: { icon: '🔥', color: '#F08030' },
  water: { icon: '💧', color: '#6890F0' },
  electric: { icon: '⚡', color: '#F8D030' },
  grass: { icon: '🌿', color: '#78C850' },
  ice: { icon: '❄️', color: '#98D8D8' },
  fighting: { icon: '👊', color: '#C03028' },
  poison: { icon: '☠️', color: '#A040A0' },
  ground: { icon: '🌍', color: '#E0C068' },
  flying: { icon: '🪶', color: '#A890F0' },
  psychic: { icon: '🔮', color: '#F85888' },
  bug: { icon: '🐛', color: '#A8B820' },
  rock: { icon: '🪨', color: '#B8A038' },
  ghost: { icon: '👻', color: '#705898' },
  dragon: { icon: '🐉', color: '#7038F8' },
  dark: { icon: '🌙', color: '#705848' },
  steel: { icon: '⚙️', color: '#B8B8D0' },
  fairy: { icon: '🧚', color: '#EE99AC' }
}

// Achievement checking function
async function checkAchievements(userId: string, trigger: string, data: any) {
  try {
    const userAchievements = await kv.get(`achievements_${userId}`) || {}
    const userProfile = await kv.get(`user_${userId}`)
    const collection = await kv.get(`collection_${userId}`) || {}
    
    let rewardCoins = 0

    // Check various achievement triggers
    if (trigger === 'signup') {
      if (!userAchievements.welcome?.completed) {
        userAchievements.welcome = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.welcome.reward
      }
    }

    if (trigger === 'pack_opened') {
      // Check first pack achievement
      if (!userAchievements.first_pack?.completed) {
        userAchievements.first_pack = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.first_pack.reward
      }
      
      // Check collection size achievements
      const uniqueCount = Object.keys(collection).length
      if (uniqueCount >= 10 && !userAchievements.collector_10?.completed) {
        userAchievements.collector_10 = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.collector_10.reward
      }
      if (uniqueCount >= 25 && !userAchievements.collector_25?.completed) {
        userAchievements.collector_25 = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.collector_25.reward
      }
      if (uniqueCount >= 50 && !userAchievements.collector_50?.completed) {
        userAchievements.collector_50 = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.collector_50.reward
      }
      if (uniqueCount >= 100 && !userAchievements.collector_100?.completed) {
        userAchievements.collector_100 = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.collector_100.reward
      }
      if (uniqueCount >= 200 && !userAchievements.collector_200?.completed) {
        userAchievements.collector_200 = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.collector_200.reward
      }

      // Check legendary achievement
      if (data.cards) {
        for (const card of data.cards) {
          if (card.rarity === 'legendary' && !userAchievements.lucky?.completed) {
            userAchievements.lucky = { completed: true, date: new Date().toISOString() }
            rewardCoins += ACHIEVEMENTS.lucky.reward
            break
          }
        }
      }
    }

    if (trigger === 'level_up') {
      const level = data.level
      if (level >= 10 && !userAchievements.level_10?.completed) {
        userAchievements.level_10 = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.level_10.reward
      }
      if (level >= 25 && !userAchievements.level_25?.completed) {
        userAchievements.level_25 = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.level_25.reward
      }
      if (level >= 50 && !userAchievements.level_50?.completed) {
        userAchievements.level_50 = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.level_50.reward
      }
      if (level >= 75 && !userAchievements.level_75?.completed) {
        userAchievements.level_75 = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.level_75.reward
      }
      if (level >= 100 && !userAchievements.level_100?.completed) {
        userAchievements.level_100 = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.level_100.reward
      }
    }

    if (trigger === 'coins_updated') {
      const coins = data.poke_coins
      if (coins >= 1000 && !userAchievements.rich?.completed) {
        userAchievements.rich = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.rich.reward
      }
      if (coins >= 5000 && !userAchievements.wealthy?.completed) {
        userAchievements.wealthy = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.wealthy.reward
      }
      if (coins >= 10000 && !userAchievements.millionaire?.completed) {
        userAchievements.millionaire = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.millionaire.reward
      }
    }

    if (trigger === 'auction_sale') {
      if (!userAchievements.trader?.completed) {
        userAchievements.trader = { completed: true, date: new Date().toISOString() }
        rewardCoins += ACHIEVEMENTS.trader.reward
      }
    }

    // Save achievements and add reward coins
    await kv.set(`achievements_${userId}`, userAchievements)
    
    if (rewardCoins > 0 && userProfile) {
      userProfile.poke_coins += rewardCoins
      await kv.set(`user_${userId}`, userProfile)
    }

    return rewardCoins
  } catch (error) {
    console.log('Check achievements error:', error)
    return 0
  }
}

// User signup
app.post('/make-server-eca1b907/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json()
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: 'user' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    })

    if (error) {
      console.log('Signup error:', error)
      return c.json({ error: error.message }, 400)
    }

    // Generate nice user ID
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
      created_at: new Date().toISOString()
    }

    await kv.set(`user_${data.user.id}`, userData)
    await kv.set(`user_by_nice_id_${niceId}`, data.user.id)
    await kv.set(`collection_${data.user.id}`, {})
    await kv.set(`achievements_${data.user.id}`, {})
    await kv.set(`quests_${data.user.id}`, {})
    await kv.set(`level_${data.user.id}`, { experience: 0, level: 1 })
    await kv.set(`level_rewards_${data.user.id}`, [])
    
    // Give welcome achievement
    await checkAchievements(data.user.id, 'signup', {})

    return c.json({ user: data.user })
  } catch (error) {
    console.log('Signup error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get user profile
app.get('/make-server-eca1b907/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userProfile = await kv.get(`user_${user.id}`)
    return c.json(userProfile)
  } catch (error) {
    console.log('Profile error:', error)
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

// Get active auctions
app.get('/make-server-eca1b907/auctions/active', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const auctions = await kv.get('auctions') || []
    const now = new Date()
    
    // Filter active auctions (not expired and not sold)
    const activeAuctions = auctions.filter((auction: any) => {
      const expiresAt = new Date(auction.expiresAt)
      return auction.status === 'active' && expiresAt > now
    })

    // Add seller nice_id to each auction
    const auctionsWithSellerInfo = await Promise.all(
      activeAuctions.map(async (auction: any) => {
        const sellerProfile = await kv.get(`user_${auction.sellerId}`)
        return {
          ...auction,
          sellerNiceId: sellerProfile?.nice_id || 'Unknown'
        }
      })
    )

    return c.json(auctionsWithSellerInfo)
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
    
    // Filter auctions by current user
    const userAuctions = auctions.filter((auction: any) => auction.sellerId === user.id)

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
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      bids: []
    }

    auctions.push(newAuction)
    await kv.set('auctions', auctions)

    // Check achievement for first auction
    await checkAchievements(user.id, 'auction_sale', {})

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

    // Check if bid is higher than current price
    if (bidAmount <= auction.currentPrice) {
      return c.json({ error: 'Bid must be higher than current price' }, 400)
    }

    // Check if user has enough coins
    const userProfile = await kv.get(`user_${user.id}`)
    if (userProfile.poke_coins < bidAmount) {
      return c.json({ error: 'Insufficient coins' }, 400)
    }

    // Return coins to previous highest bidder if exists
    if (auction.highestBidderId && auction.highestBidderId !== user.id) {
      const previousBidder = await kv.get(`user_${auction.highestBidderId}`)
      if (previousBidder) {
        previousBidder.poke_coins += auction.currentPrice
        await kv.set(`user_${auction.highestBidderId}`, previousBidder)
      }
    }

    // Deduct coins from current bidder
    userProfile.poke_coins -= bidAmount
    await kv.set(`user_${user.id}`, userProfile)

    // Update auction
    auction.currentPrice = bidAmount
    auction.highestBidderId = user.id
    auction.bids.push({
      bidderId: user.id,
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

      // Give coins to seller
      const seller = await kv.get(`user_${auction.sellerId}`)
      if (seller) {
        seller.poke_coins += bidAmount
        await kv.set(`user_${auction.sellerId}`, seller)
      }
    }

    auctions[auctionIndex] = auction
    await kv.set('auctions', auctions)

    return c.json({ success: true, auction })
  } catch (error) {
    console.log('Place bid error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

Deno.serve(app.fetch)