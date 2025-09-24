// Battle endpoints to add to the main server file

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

    // Only give rewards if player wins
    if (finalVictory) {
      const userProfile = await kv.get(`user_${user.id}`)
      if (userProfile) {
        userProfile.poke_coins += coinsReward
        userProfile.experience += expReward
        await kv.set(`user_${user.id}`, userProfile)
        
        // Check level up
        await addExperience(user.id, expReward, 'battle')
        
        // Check coins achievement
        await checkAchievements(user.id, 'coins_updated', { poke_coins: userProfile.poke_coins })
        
        // Track battle result for achievements
        await checkAchievements(user.id, 'battle_won', {})
      }
    }

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