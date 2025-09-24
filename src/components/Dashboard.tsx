import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase/client'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Separator } from './ui/separator'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { Alert } from './ui/alert'
import { MoreVertical, Edit, Trash2, Check, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

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

interface DashboardProps {
  userProfile: any
  onAvatarUpdate?: () => void
}

export function Dashboard({ userProfile, onAvatarUpdate }: DashboardProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [levelData, setLevelData] = useState<any>(null)
  const [newPostContent, setNewPostContent] = useState('')
  const [commentContents, setCommentContents] = useState<{[key: string]: string}>({})
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editPostContent, setEditPostContent] = useState('')
  const [editCommentContent, setEditCommentContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        // Fetch posts
        const postsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/posts`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (postsResponse.ok) {
          const postsData = await postsResponse.json()
          setPosts(postsData)
        }

        // Fetch level data
        const levelResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/levels`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        if (levelResponse.ok) {
          const levelData = await levelResponse.json()
          setLevelData(levelData.levelData)
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      setError('Размер файла не должен превышать 1 МБ')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Файл должен быть изображением')
      return
    }

    setUploading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/upload-avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setSuccess('Аватар успешно обновлен!')
      
      // Call the avatar update callback instead of reloading
      if (onAvatarUpdate) {
        onAvatarUpdate()
      }

      // Also refresh the current page data
      fetchData()

    } catch (error: any) {
      console.error('Avatar upload error:', error)
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }

  const createPost = async () => {
    if (!newPostContent.trim()) {
      setError('Содержимое поста не может быть пустым')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: newPostContent,
          type: 'user_post'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setNewPostContent('')
      setSuccess('Пост создан!')
      fetchData()

    } catch (error: any) {
      console.error('Create post error:', error)
      setError(error.message)
    }
  }

  const editPost = async (postId: string) => {
    if (!editPostContent.trim()) {
      setError('Содержимое поста не может быть пустым')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: editPostContent }),
      })

      if (response.ok) {
        setEditingPost(null)
        setEditPostContent('')
        setSuccess('Пост обновлен!')
        fetchData()
      }

    } catch (error) {
      console.error('Edit post error:', error)
    }
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        setSuccess('Пост удален!')
        fetchData()
      }

    } catch (error) {
      console.error('Delete post error:', error)
    }
  }

  const editComment = async (postId: string, commentId: string) => {
    if (!editCommentContent.trim()) {
      setError('Комментарий не может быть пустым')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/posts/${postId}/comment/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: editCommentContent }),
      })

      if (response.ok) {
        setEditingComment(null)
        setEditCommentContent('')
        setSuccess('Комментарий обновлен!')
        fetchData()
      }

    } catch (error) {
      console.error('Edit comment error:', error)
    }
  }

  const deleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/posts/${postId}/comment/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        setSuccess('Комментарий удален!')
        fetchData()
      }

    } catch (error) {
      console.error('Delete comment error:', error)
    }
  }

  const toggleLike = async (postId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        fetchData()
      }

    } catch (error) {
      console.error('Like error:', error)
    }
  }

  const addComment = async (postId: string) => {
    const content = commentContents[postId]
    if (!content?.trim()) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        setCommentContents({ ...commentContents, [postId]: '' })
        fetchData()
      }

    } catch (error) {
      console.error('Comment error:', error)
    }
  }

  const startEditPost = (post: any) => {
    setEditingPost(post.id)
    setEditPostContent(post.content)
  }

  const startEditComment = (comment: any) => {
    setEditingComment(comment.id)
    setEditCommentContent(comment.content)
  }

  const cancelEdit = () => {
    setEditingPost(null)
    setEditingComment(null)
    setEditPostContent('')
    setEditCommentContent('')
  }

  const getLevelColor = (level: number): string => {
    const colorTier = Math.floor((level - 1) / 5)
    const colors = [
      'bg-gray-500',    // 1-5
      'bg-green-500',   // 6-10  
      'bg-blue-500',    // 11-15
      'bg-purple-500',  // 16-20
      'bg-pink-500',    // 21-25
      'bg-yellow-500',  // 26-30
      'bg-orange-500',  // 31-35
      'bg-red-500',     // 36-40
      'bg-indigo-500',  // 41-45
      'bg-teal-500',    // 46-50
      'bg-cyan-500',    // 51-55
      'bg-emerald-500', // 56-60
      'bg-lime-500',    // 61-65
      'bg-amber-500',   // 66-70
      'bg-rose-500',    // 71-75
      'bg-violet-500',  // 76-80
      'bg-fuchsia-500', // 81-85
      'bg-sky-500',     // 86-90
      'bg-slate-500',   // 91-95
      'bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500' // 96-100
    ]
    return colors[Math.min(colorTier, colors.length - 1)]
  }

  const getProgressPercentage = () => {
    if (!levelData) return 0
    const currentExp = levelData.experience || 0
    const expForCurrentLevel = levelData.expForCurrentLevel || 0
    const expForNextLevel = levelData.expForNextLevel || 100
    const expInThisLevel = currentExp - expForCurrentLevel
    const expNeededForThisLevel = expForNextLevel - expForCurrentLevel
    return Math.min((expInThisLevel / expNeededForThisLevel) * 100, 100)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      return `Сегодня в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays === 2) {
      return `Вчера в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays <= 7) {
      return `${diffDays - 1} дней назад`
    } else {
      return date.toLocaleDateString('ru-RU')
    }
  }

  const canEditComment = (comment: any) => {
    return comment.user_id === userProfile?.id
  }

  const canDeleteComment = (comment: any, post: any) => {
    return comment.user_id === userProfile?.id || post.user_id === userProfile?.id
  }

  const canEditPost = (post: any) => {
    return post.user_id === userProfile?.id && post.type !== 'pokemon_catch'
  }

  const canDeletePost = (post: any) => {
    return post.user_id === userProfile?.id
  }

  if (loading) {
    return (
      <div className="text-center text-white">
        <div className="text-xl">Загрузка главной страницы...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
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

      {/* User Profile Section */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="relative">
              <Avatar 
                className="w-20 h-20 cursor-pointer hover:scale-105 transition-transform" 
                onClick={handleAvatarClick}
              >
                <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl">
                  {userProfile?.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-2xl text-white font-bold">{userProfile?.name}</h2>
              <p className="text-white/80">ID: {userProfile?.nice_id}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                  {userProfile?.role === 'admin' ? '👑 Администратор' : '👤 Тренер'}
                </Badge>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  ⚡ {userProfile?.poke_coins || 0} PokéCoins
                </Badge>
              </div>
            </div>

            {/* Level Info */}
            {levelData && (
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-12 h-12 rounded-full ${getLevelColor(levelData.level || 1)} flex items-center justify-center text-white font-bold text-xl`}>
                    {levelData.level || 1}
                  </div>
                  <div>
                    <div className="text-white font-semibold">Уровень {levelData.level || 1}</div>
                    <div className="text-white/80 text-sm">{levelData.experience || 0} опыта</div>
                  </div>
                </div>
                <div className="w-32 bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {levelData.expForNextLevel ? `До ${levelData.level + 1} уровня: ${levelData.expForNextLevel - (levelData.experience || 0)} опыта` : 'Максимальный уровень!'}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Post Section */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">✏️ Создать пост</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Поделитесь своими мыслями..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
            rows={3}
            maxLength={500}
          />
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-sm">{newPostContent.length}/500</span>
            <Button 
              onClick={createPost}
              disabled={!newPostContent.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              📝 Опубликовать
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* News Feed */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">📰 Лента новостей</CardTitle>
          <CardDescription className="text-white/80">
            Последние события в мире покемонов
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📰</div>
              <h3 className="text-white text-xl mb-2">Лента пуста</h3>
              <p className="text-white/80">Будьте первым, кто создаст пост!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    {/* Post Header */}
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.user_avatar_url} alt={post.user_name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {post.user_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-semibold">{post.user_name}</span>
                          <span className="text-white/60">@{post.user_nice_id}</span>
                          {post.type === 'pokemon_catch' && (
                            <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs">
                              🎯 Поймал покемона
                            </Badge>
                          )}
                        </div>
                        <div className="text-white/60 text-sm">
                          {formatDate(post.created_at)}
                          {post.edited_at && <span className=" text-white/40"> (изменено)</span>}
                        </div>
                      </div>
                      
                      {/* Post Menu */}
                      {(canEditPost(post) || canDeletePost(post)) && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2 bg-white/10 backdrop-blur-lg border-white/20">
                            <div className="space-y-1">
                              {canEditPost(post) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditPost(post)}
                                  className="w-full justify-start text-white/80 hover:text-white"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Редактировать
                                </Button>
                              )}
                              {canDeletePost(post) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deletePost(post.id)}
                                  className="w-full justify-start text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Удалить
                                </Button>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="mb-3">
                      {editingPost === post.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editPostContent}
                            onChange={(e) => setEditPostContent(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
                            rows={3}
                            maxLength={500}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-white/60 text-sm">{editPostContent.length}/500</span>
                            <div className="space-x-2">
                              <Button
                                size="sm"
                                onClick={() => editPost(post.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                className="border-white/20"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-white">{post.content}</p>
                      )}
                      
                      {/* Pokemon Data for catches */}
                      {post.pokemon_data && (
                        <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-white/5 to-white/10">
                          <div className="flex items-center space-x-3">
                            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden">
                              <ImageWithFallback
                                src={post.pokemon_data.image}
                                alt={post.pokemon_data.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div>
                              <h4 className="text-white font-semibold capitalize">{post.pokemon_data.name}</h4>
                              <Badge className={`${RARITY_COLORS[post.pokemon_data.rarity as keyof typeof RARITY_COLORS]} text-white mt-1`}>
                                {RARITY_NAMES[post.pokemon_data.rarity as keyof typeof RARITY_NAMES]}
                              </Badge>
                              {post.pokemon_data.types && (
                                <div className="flex gap-1 mt-1">
                                  {post.pokemon_data.types.slice(0, 2).map((type: any, index: number) => (
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
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Post Actions */}
                    <div className="flex items-center space-x-4 mb-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLike(post.id)}
                        className={`text-white/80 hover:text-red-400 ${post.likes?.includes(userProfile?.id) ? 'text-red-400' : ''}`}
                      >
                        ❤️ {post.likes?.length || 0}
                      </Button>
                      <span className="text-white/60 text-sm">
                        💬 {post.comments?.length || 0} комментариев
                      </span>
                    </div>

                    {/* Comments */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-2 mb-3 pl-4 border-l-2 border-white/20">
                        {post.comments.slice(-3).map((comment: any) => (
                          <div key={comment.id} className="bg-white/5 rounded p-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-white/80 font-medium text-sm">{comment.user_name}</span>
                                <span className="text-white/60 text-xs">@{comment.user_nice_id}</span>
                                <span className="text-white/40 text-xs">
                                  {formatDate(comment.created_at)}
                                  {comment.edited_at && <span> (изменено)</span>}
                                </span>
                              </div>
                              
                              {/* Comment Menu */}
                              {(canEditComment(comment) || canDeleteComment(comment, post)) && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-white/40 hover:text-white/60 p-1">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-40 p-2 bg-white/10 backdrop-blur-lg border-white/20">
                                    <div className="space-y-1">
                                      {canEditComment(comment) && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditComment(comment)}
                                          className="w-full justify-start text-white/80 hover:text-white text-xs"
                                        >
                                          <Edit className="h-3 w-3 mr-2" />
                                          Редактировать
                                        </Button>
                                      )}
                                      {canDeleteComment(comment, post) && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => deleteComment(post.id, comment.id)}
                                          className="w-full justify-start text-red-400 hover:text-red-300 text-xs"
                                        >
                                          <Trash2 className="h-3 w-3 mr-2" />
                                          Удалить
                                        </Button>
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                            
                            {editingComment === comment.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editCommentContent}
                                  onChange={(e) => setEditCommentContent(e.target.value)}
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                                  maxLength={200}
                                />
                                <div className="flex justify-between items-center">
                                  <span className="text-white/60 text-xs">{editCommentContent.length}/200</span>
                                  <div className="space-x-1">
                                    <Button
                                      size="sm"
                                      onClick={() => editComment(post.id, comment.id)}
                                      className="bg-green-600 hover:bg-green-700 px-2 py-1 h-6"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEdit}
                                      className="border-white/20 px-2 py-1 h-6"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-white/90 text-sm">{comment.content}</p>
                            )}
                          </div>
                        ))}
                        {post.comments.length > 3 && (
                          <div className="text-white/60 text-sm">
                            и еще {post.comments.length - 3} комментариев...
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add Comment */}
                    <div className="flex space-x-2">
                      <Input
                        value={commentContents[post.id] || ''}
                        onChange={(e) => setCommentContents({
                          ...commentContents,
                          [post.id]: e.target.value
                        })}
                        placeholder="Написать комментарий..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                        maxLength={200}
                        onKeyPress={(e) => e.key === 'Enter' && addComment(post.id)}
                      />
                      <Button
                        size="sm"
                        onClick={() => addComment(post.id)}
                        disabled={!commentContents[post.id]?.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        💬
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}