import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert } from './ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Checkbox } from './ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

export function AdminPanel() {
  const [targetNiceId, setTargetNiceId] = useState('')
  const [coinAmount, setCoinAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [packSettings, setPackSettings] = useState<any>({})
  const [auctions, setAuctions] = useState<any[]>([])
  const [selectedUserRole, setSelectedUserRole] = useState('')
  const [roleTargetId, setRoleTargetId] = useState('')
  const [newPackId, setNewPackId] = useState('')
  const [newPackName, setNewPackName] = useState('')
  const [newPackCost, setNewPackCost] = useState('')
  const [newPackCards, setNewPackCards] = useState('')
  const [newPackImage, setNewPackImage] = useState<File | null>(null)
  const [creatingPack, setCreatingPack] = useState(false)
  const [updatingPokemon, setUpdatingPokemon] = useState(false)
  const [pokemonStats, setPokemonStats] = useState<any>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        // Fetch users
        const usersResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/admin/users`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData.users || [])
        }

        // Fetch pack settings
        const packResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/pack-types`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        })
        
        if (packResponse.ok) {
          const packData = await packResponse.json()
          setPackSettings(packData)
        }

        // Fetch auctions for moderation
        const auctionsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/auction/active`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (auctionsResponse.ok) {
          const auctionsData = await auctionsResponse.json()
          setAuctions(auctionsData)
        }

        // Fetch pokemon stats
        const pokemonResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/pokemon`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (pokemonResponse.ok) {
          const pokemonData = await pokemonResponse.json()
          const stats = {
            total: pokemonData.length,
            common: pokemonData.filter((p: any) => p.rarity === 'common').length,
            uncommon: pokemonData.filter((p: any) => p.rarity === 'uncommon').length,
            rare: pokemonData.filter((p: any) => p.rarity === 'rare').length,
            epic: pokemonData.filter((p: any) => p.rarity === 'epic').length,
            legendary: pokemonData.filter((p: any) => p.rarity === 'legendary').length,
          }
          setPokemonStats(stats)
        }
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
    }
  }

  const addCoins = async () => {
    if (!targetNiceId || !coinAmount) {
      setError('Заполните все поля')
      return
    }

    const amount = parseInt(coinAmount)
    if (isNaN(amount)) {
      setError('Введите корректное количество монет')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/admin/add-coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetNiceId,
          amount
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setMessage(`Успешно добавлено ${amount} монет пользователю ${targetNiceId}. Новый баланс: ${result.newBalance}`)
      setTargetNiceId('')
      setCoinAmount('')
      fetchData()

    } catch (error: any) {
      console.error('Add coins error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateRole = async () => {
    if (!roleTargetId || !selectedUserRole) {
      setError('Заполните все поля для изменения роли')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/admin/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetNiceId: roleTargetId,
          newRole: selectedUserRole
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setMessage(`Роль пользователя ${roleTargetId} изменена на ${selectedUserRole}`)
      setRoleTargetId('')
      setSelectedUserRole('')
      fetchData()

    } catch (error: any) {
      console.error('Update role error:', error)
      setError(error.message)
    }
  }

  const updatePackSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/admin/update-pack-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ packSettings }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setMessage('Настройки паков обновлены!')

    } catch (error: any) {
      console.error('Update packs error:', error)
      setError(error.message)
    }
  }

  const deleteAuction = async (auctionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/admin/auction/${auctionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setMessage('Аукцион удален')
      fetchData()

    } catch (error: any) {
      console.error('Delete auction error:', error)
      setError(error.message)
    }
  }

  const updatePackRarity = (packType: string, rarity: string, field: string, value: any) => {
    setPackSettings((prev: any) => ({
      ...prev,
      [packType]: {
        ...prev[packType],
        rarities: {
          ...prev[packType].rarities,
          [rarity]: {
            ...prev[packType].rarities[rarity],
            [field]: value
          }
        }
      }
    }))
  }

  const updatePackBasic = (packType: string, field: string, value: any) => {
    setPackSettings((prev: any) => ({
      ...prev,
      [packType]: {
        ...prev[packType],
        [field]: value
      }
    }))
  }

  const uploadPackImage = async (file: File): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return null

      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/admin/upload-pack-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        return result.imageUrl
      }
    } catch (error) {
      console.error('Upload error:', error)
    }
    return null
  }

  const createNewPack = async () => {
    if (!newPackId || !newPackName || !newPackCost || !newPackCards) {
      setError('Заполните все поля для создания пака')
      return
    }

    setCreatingPack(true)
    setError('')

    try {
      let imageUrl = ''
      
      // Upload image if selected
      if (newPackImage) {
        imageUrl = await uploadPackImage(newPackImage) || ''
      }

      const newPackData = {
        name: newPackName,
        cost: parseInt(newPackCost),
        cards: parseInt(newPackCards),
        image: imageUrl,
        rarities: {
          common: { enabled: true, chance: 0.5 },
          uncommon: { enabled: true, chance: 0.3 },
          rare: { enabled: true, chance: 0.15 },
          epic: { enabled: true, chance: 0.04 },
          legendary: { enabled: true, chance: 0.01 }
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/admin/create-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          packId: newPackId,
          packData: newPackData
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setMessage(`Пак "${newPackName}" успешно создан!`)
      setNewPackId('')
      setNewPackName('')
      setNewPackCost('')
      setNewPackCards('')
      setNewPackImage(null)
      fetchData()

    } catch (error: any) {
      console.error('Create pack error:', error)
      setError(error.message)
    } finally {
      setCreatingPack(false)
    }
  }

  const deletePack = async (packId: string) => {
    if (['basic', 'premium', 'legendary'].includes(packId)) {
      setError('Нельзя удалить базовые паки')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/admin/pack/${packId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setMessage(`Пак удален`)
      fetchData()

    } catch (error: any) {
      console.error('Delete pack error:', error)
      setError(error.message)
    }
  }

  const updatePokemonDatabase = async () => {
    setUpdatingPokemon(true)
    setError('')
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      console.log('Starting Pokemon database update...')

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/admin/update-pokemon`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
      })

      console.log('Response status:', response.status)
      
      let result
      try {
        result = await response.json()
        console.log('Response data:', result)
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        throw new Error('Ошибка обработки ответа сервера')
      }

      if (!response.ok) {
        console.error('Server error response:', result)
        throw new Error(result.error || `Ошибка сервера: ${response.status}`)
      }

      setMessage(result.message || 'База покемонов успешно обновлена!')
      fetchData()

    } catch (error: any) {
      console.error('Update pokemon error:', error)
      const errorMessage = error.message || 'Неизвестная ошибка при обновлении базы покемонов'
      setError(`Ошибка обновления: ${errorMessage}`)
    } finally {
      setUpdatingPokemon(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl text-white mb-2">👑 Панель администратора</h2>
        <p className="text-white/80">Управление пользователями и экономикой</p>
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

      {message && (
        <Alert className="bg-green-500/20 border-green-500/50 text-green-100">
          {message}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessage('')}
            className="ml-auto text-green-100 hover:text-green-200"
          >
            ✕
          </Button>
        </Alert>
      )}

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-lg">
          <TabsTrigger value="users">👥 Пользователи</TabsTrigger>
          <TabsTrigger value="packs">🎁 Паки</TabsTrigger>
          <TabsTrigger value="pokemon">🐾 Покемоны</TabsTrigger>
          <TabsTrigger value="coins">💰 Монеты</TabsTrigger>
          <TabsTrigger value="moderation">🛡️ Модерация</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="bg-gradient-to-br from-green-500/20 to-teal-500/20 backdrop-blur-lg border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-300">👥 Управление пользователями</CardTitle>
              <CardDescription className="text-green-100/80">
                Просмотр пользователей и назначение ролей
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Role Assignment */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Назначение ролей</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-white">ID пользователя</Label>
                  <Input
                    value={roleTargetId}
                    onChange={(e) => setRoleTargetId(e.target.value)}
                    placeholder="RedPikachu123"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                <div>
                  <Label className="text-white">Новая роль</Label>
                  <Select value={selectedUserRole} onValueChange={setSelectedUserRole}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Выберите роль" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">👤 Пользователь</SelectItem>
                      <SelectItem value="admin">👑 Администратор</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={updateRole} className="w-full">
                    Изменить роль
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Список пользовател��й ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-white">Имя</TableHead>
                      <TableHead className="text-white">ID</TableHead>
                      <TableHead className="text-white">Email</TableHead>
                      <TableHead className="text-white">Роль</TableHead>
                      <TableHead className="text-white">Монеты</TableHead>
                      <TableHead className="text-white">Дата регистрации</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="border-white/20">
                        <TableCell className="text-white">{user.name}</TableCell>
                        <TableCell className="text-white/80">{user.nice_id}</TableCell>
                        <TableCell className="text-white/80">{user.email}</TableCell>
                        <TableCell>
                          <Badge 
                            className={user.role === 'admin' ? 'bg-yellow-500' : 'bg-blue-500'}
                          >
                            {user.role === 'admin' ? '👑 Админ' : '👤 Пользователь'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-yellow-400">⚡ {user.poke_coins}</TableCell>
                        <TableCell className="text-white/80">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packs" className="space-y-4">
          <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-lg border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-300">🎁 Управление паками</CardTitle>
              <CardDescription className="text-purple-100/80">
                Создание новых паков и настройка содержимого
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Create New Pack */}
          <Card className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-lg border-emerald-500/30">
            <CardHeader>
              <CardTitle className="text-emerald-300">✨ Создать новый пак</CardTitle>
              <CardDescription className="text-emerald-100/80">
                Добавьте новый тип пака с уникальными настройками
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-white">ID пака (латиница)</Label>
                  <Input
                    value={newPackId}
                    onChange={(e) => setNewPackId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="super_pack"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                <div>
                  <Label className="text-white">Название пака</Label>
                  <Input
                    value={newPackName}
                    onChange={(e) => setNewPackName(e.target.value)}
                    placeholder="Супер пак"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                <div>
                  <Label className="text-white">Стоимость</Label>
                  <Input
                    type="number"
                    value={newPackCost}
                    onChange={(e) => setNewPackCost(e.target.value)}
                    placeholder="300"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                <div>
                  <Label className="text-white">Карт в паке</Label>
                  <Input
                    type="number"
                    value={newPackCards}
                    onChange={(e) => setNewPackCards(e.target.value)}
                    placeholder="5"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Изображение пака (необязательно)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewPackImage(e.target.files?.[0] || null)}
                  className="bg-white/10 border-white/20 text-white"
                />
                <p className="text-white/60 text-sm mt-1">
                  Загрузите изображение для предпросмотра пака (PNG, JPG, WEBP)
                </p>
              </div>

              <Button 
                onClick={createNewPack} 
                disabled={creatingPack || !newPackId || !newPackName}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {creatingPack ? '🔄 Создание...' : '🚀 Создать пак'}
              </Button>
            </CardContent>
          </Card>

          {Object.entries(packSettings).map(([packType, settings]: [string, any]) => (
            <Card key={packType} className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">{settings.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-white">Название</Label>
                    <Input
                      value={settings.name}
                      onChange={(e) => updatePackBasic(packType, 'name', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Стоимость</Label>
                    <Input
                      type="number"
                      value={settings.cost}
                      onChange={(e) => updatePackBasic(packType, 'cost', parseInt(e.target.value))}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Количество карт</Label>
                    <Input
                      type="number"
                      value={settings.cards}
                      onChange={(e) => updatePackBasic(packType, 'cards', parseInt(e.target.value))}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                {/* Pack Image Section */}
                <div className="space-y-2">
                  <Label className="text-white">Изображение пака</Label>
                  {settings.image && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <img 
                        src={settings.image} 
                        alt={settings.name}
                        className="w-32 h-20 object-cover rounded"
                      />
                      <p className="text-white/60 text-sm mt-1">Текущее изображение</p>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const imageUrl = await uploadPackImage(file)
                        if (imageUrl) {
                          updatePackBasic(packType, 'image', imageUrl)
                          setMessage('Изображение загружено!')
                        }
                      }
                    }}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                {/* Delete Pack Button for custom packs */}
                {!['basic', 'premium', 'legendary'].includes(packType) && (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => deletePack(packType)}
                      variant="destructive"
                      size="sm"
                    >
                      🗑️ Удалить пак
                    </Button>
                  </div>
                )}

                <div>
                  <Label className="text-white mb-4 block">Настройка редкостей и шансов</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(settings.rarities).map(([rarity, rarityData]: [string, any]) => (
                      <div key={rarity} className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            checked={rarityData.enabled}
                            onCheckedChange={(checked) => 
                              updatePackRarity(packType, rarity, 'enabled', checked)
                            }
                          />
                          <Label className="text-white capitalize">{rarity}</Label>
                        </div>
                        <div>
                          <Label className="text-white/80 text-sm">Шанс (0.0 - 1.0)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={rarityData.chance}
                            onChange={(e) => 
                              updatePackRarity(packType, rarity, 'chance', parseFloat(e.target.value))
                            }
                            disabled={!rarityData.enabled}
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center">
            <Button onClick={updatePackSettings} className="bg-purple-600 hover:bg-purple-700">
              Сохранить настройки паков
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="pokemon" className="space-y-4">
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-300">🐾 Управление покемонами</CardTitle>
              <CardDescription className="text-green-100/80">
                Обновление базы данных покемонов
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Pokemon Statistics */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">📊 Статистика покемонов</CardTitle>
              <CardDescription className="text-white/80">
                Текущее состояние базы данных
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{pokemonStats.total || 0}</div>
                  <div className="text-white/80 text-sm">Всего</div>
                </div>
                <div className="bg-gray-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-300">{pokemonStats.common || 0}</div>
                  <div className="text-gray-300 text-sm">Обычные</div>
                </div>
                <div className="bg-green-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-300">{pokemonStats.uncommon || 0}</div>
                  <div className="text-green-300 text-sm">Необычные</div>
                </div>
                <div className="bg-blue-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-300">{pokemonStats.rare || 0}</div>
                  <div className="text-blue-300 text-sm">Редкие</div>
                </div>
                <div className="bg-purple-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-300">{pokemonStats.epic || 0}</div>
                  <div className="text-purple-300 text-sm">Эпические</div>
                </div>
                <div className="bg-yellow-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-300">{pokemonStats.legendary || 0}</div>
                  <div className="text-yellow-300 text-sm">Легендарные</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-blue-300 font-semibold mb-2">🔄 Обновление базы покемонов</h4>
                  <p className="text-blue-100/80 text-sm mb-4">
                    Загрузить покемонов (1-300) из PokéAPI. Это займет около 1-2 минут.
                    {pokemonStats.total < 280 && (
                      <span className="block mt-2 text-yellow-300 font-semibold">
                        ⚠️ У вас загружено только {pokemonStats.total} покемонов из 300. Рекомендуется обновление!
                      </span>
                    )}
                  </p>
                  <Button 
                    onClick={updatePokemonDatabase}
                    disabled={updatingPokemon}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updatingPokemon ? '🔄 Обновление...' : '🚀 Обновить базу покемонов'}
                  </Button>
                </div>

                {updatingPokemon && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin text-yellow-300">⚡</div>
                        <span className="text-yellow-300">Загрузка покемонов из PokéAPI...</span>
                      </div>
                      <div className="text-yellow-200/80 text-sm">
                        <div>• Загружается ~300 покемонов (первые 3 поколения)</div>
                        <div>• Обработка по 10 покемонов в батче</div>
                        <div>• Это займет 1-2 минуты, пожалуйста подождите</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coins" className="space-y-4">
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-lg border-yellow-500/30">
            <CardHeader>
              <CardTitle className="text-yellow-300">💰 Управление монетами</CardTitle>
              <CardDescription className="text-yellow-100/80">
                Начисление PokéCoins пользователям
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="niceId" className="text-yellow-200">ID пользователя</Label>
                  <Input
                    id="niceId"
                    value={targetNiceId}
                    onChange={(e) => setTargetNiceId(e.target.value)}
                    placeholder="RedPikachu123"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                
                <div>
                  <Label htmlFor="amount" className="text-yellow-200">Количество монет</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={coinAmount}
                    onChange={(e) => setCoinAmount(e.target.value)}
                    placeholder="100"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={addCoins} 
                    disabled={loading}
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                  >
                    {loading ? 'Начисление...' : 'Начислить'}
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-500/10 rounded-lg p-4">
                <h4 className="text-yellow-300 font-semibold mb-2">💡 Подсказка</h4>
                <p className="text-yellow-100/80 text-sm">
                  Используйте симпатичный ID пользователя (например: RedPikachu123) для начисления монет. 
                  Можете использовать отрицательные значения для списания монет.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-4">
          <Card className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-lg border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-300">🛡️ Модерация аукционов</CardTitle>
              <CardDescription className="text-red-100/80">
                Удаление неподходящих аукционов
              </CardDescription>
            </CardHeader>
          </Card>

          {auctions.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">🏪</div>
                <h3 className="text-white text-xl mb-2">Нет активных аукционов</h3>
                <p className="text-white/80">Все чисто! Никто сейчас не продает покемонов.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {auctions.map((auction) => (
                <Card key={auction.id} className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Аукцион #{auction.id.slice(-8)}</CardTitle>
                    <CardDescription className="text-white/80">
                      Продавец: {auction.sellerNiceId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-white/80">
                      <p>Покемон ID: {auction.pokemonId}</p>
                      <p>Цена: ⚡ {auction.price} монет</p>
                      <p>Создан: {new Date(auction.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    <Button 
                      onClick={() => deleteAuction(auction.id)}
                      variant="destructive"
                      className="w-full"
                    >
                      🗑️ Удалить аукцион
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardContent className="p-6">
          <h3 className="text-white text-lg mb-4">📋 Инструкции для администратора</h3>
          <div className="text-white/80 space-y-2">
            <p>• <strong>Пользователи:</strong> Просматривайте список всех пользователей и назначайте роли</p>
            <p>• <strong>Паки:</strong> Настраивайте содержимое паков, шансы выпадения редкостей и цены</p>
            <p>• <strong>Монеты:</strong> Начисляйте или списывайте PokéCoins у пользователей по их симпатичному ID</p>
            <p>• <strong>Модерация:</strong> Удаляйте неподходящие аукционы и следите за торговлей</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}