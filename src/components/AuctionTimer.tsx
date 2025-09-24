import React, { useState, useEffect } from 'react'

interface AuctionTimerProps {
  expiresAt: string
  onExpired?: () => void
}

export function AuctionTimer({ expiresAt, onExpired }: AuctionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const remaining = expiry - now
      
      if (remaining <= 0) {
        setTimeRemaining(0)
        if (onExpired) {
          onExpired()
        }
        return
      }
      
      setTimeRemaining(remaining)
    }

    // Initial calculation
    calculateTimeRemaining()

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, onExpired])

  const formatTime = (ms: number) => {
    if (ms <= 0) return 'Истекло'
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (days > 0) {
      return `${days}д ${hours}ч`
    } else if (hours > 0) {
      return `${hours}ч ${minutes}м`
    } else if (minutes > 0) {
      return `${minutes}м ${seconds}с`
    } else {
      return `${seconds}с`
    }
  }

  const getUrgencyColor = () => {
    const hoursRemaining = timeRemaining / (1000 * 60 * 60)
    
    if (hoursRemaining < 1) return 'text-red-400'
    if (hoursRemaining < 6) return 'text-orange-400'
    if (hoursRemaining < 24) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className={`text-sm font-medium ${getUrgencyColor()}`}>
      ⏰ {formatTime(timeRemaining)}
    </div>
  )
}