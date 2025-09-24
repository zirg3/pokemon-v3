import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { projectId } from '../utils/supabase/info'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { MoreVertical, Edit, Trash2, Check, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

const RARITY_COLORS = {
  common: 'from-gray-400 to-gray-600',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500'
}

const RARITY_NAMES = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный'
}

interface UserProfileProps {
  niceId: string
  onClose: () => void
  currentUserProfile: any
}

export function UserProfile({ niceId, onClose, currentUserProfile }: UserProfileProps) {
  const [userData, setUserData] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [commentContents, setCommentContents] = useState<{[key: string]: string}>({})
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentContent, setEditCommentContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUserData()
  }, [niceId])

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-eca1b907/user/${niceId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Пользователь не найден')
      }

      const data = await response.json()
      setUserData(data.user)
      setPosts(data.posts)

    } catch (error: any) {
      console.error('Error fetching user data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
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
        fetchUserData() // Refresh to update like counts
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
        fetchUserData()
      }

    } catch (error) {
      console.error('Comment error:', error)
    }
  }

  const editComment = async (postId: string, commentId: string) => {
    if (!editCommentContent.trim()) return

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
        fetchUserData()
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
        fetchUserData()
      }

    } catch (error) {
      console.error('Delete comment error:', error)
    }
  }

  const startEditComment = (comment: any) => {
    setEditingComment(comment.id)
    setEditCommentContent(comment.content)
  }

  const cancelEdit = () => {
    setEditingComment(null)
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
    return comment.user_id === currentUserProfile?.id
  }

  const canDeleteComment = (comment: any, post: any) => {
    return comment.user_id === currentUserProfile?.id || post.user_id === currentUserProfile?.id
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-8 text-center">
            <div className="text-white text-xl">Загрузка профиля...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-white text-xl mb-2">Ошибка</h3>
            <p className="text-white/80 mb-4">{error}</p>
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
              Закрыть
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-lg border-white/20 overflow-hidden">
        <CardHeader className="border-b border-white/20">
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">👤 Профиль пользователя</CardTitle>
            <Button onClick={onClose} variant="outline" size="sm">
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <div className="overflow-y-auto max-h-[80vh]">
          <CardContent className="p-6 space-y-6">
            {/* User Info Section */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  {/* Avatar */}
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={userData?.avatar_url} alt={userData?.name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl">
                      {userData?.name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1">
                    <h2 className="text-2xl text-white font-bold">{userData?.name}</h2>
                    <p className="text-white/80">ID: {userData?.nice_id}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                        {userData?.role === 'admin' ? '👑 Администратор' : '👤 Тренер'}
                      </Badge>
                      <Badge variant="outline" className="text-blue-400 border-blue-400">
                        📅 С {new Date(userData?.created_at).toLocaleDateString('ru-RU')}
                      </Badge>
                    </div>
                  </div>

                  {/* Level Info */}
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-12 h-12 rounded-full ${getLevelColor(userData?.level || 1)} flex items-center justify-center text-white font-bold text-xl`}>
                        {userData?.level || 1}
                      </div>
                      <div>
                        <div className="text-white font-semibold">Уровень {userData?.level || 1}</div>
                        <div className="text-white/80 text-sm">{userData?.experience || 0} опыта</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts Section */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">📝 Посты пользователя</CardTitle>
                <CardDescription className="text-white/80">
                  {posts.length === 0 ? 'Пользователь еще не создавал постов' : `${posts.length} постов`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {posts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className="text-white text-xl mb-2">Нет постов</h3>
                    <p className="text-white/80">Этот пользователь еще не создавал постов</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <Card key={post.id} className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          {/* Post Header */}
                          <div className="flex items-center space-x-3 mb-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={userData?.avatar_url} alt={userData?.name} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                {userData?.name?.charAt(0)?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-white font-semibold">{userData?.name}</span>
                                <span className="text-white/60">@{userData?.nice_id}</span>
                                {post.type === 'pokemon_catch' && (
                                  <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs">
                                    🎯 Поймал покемона
                                  </Badge>
                                )}
                              </div>
                              <div className="text-white/60 text-sm">{formatDate(post.created_at)}</div>
                            </div>
                          </div>

                          {/* Post Content */}
                          <div className="mb-3">
                            <p className="text-white">{post.content}</p>
                            
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
                              className={`text-white/80 hover:text-red-400 ${post.likes?.includes(currentUserProfile?.id) ? 'text-red-400' : ''}`}
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
          </CardContent>
        </div>
      </Card>
    </div>
  )
}