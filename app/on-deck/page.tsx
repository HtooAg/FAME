'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle, Video, BrushIcon as Broom } from 'lucide-react'
import Image from 'next/image'

interface PerformanceOrder {
  id: string
  stageName: string
  style: string
  order: number
  status: 'waiting' | 'ready' | 'on-stage' | 'completed'
  specialNotes?: string
  videoRequired?: boolean
  stageCleaning?: boolean
}

interface EmergencyCode {
  code: 'red' | 'blue' | 'green'
  message: string
  active: boolean
}

export default function OnDeckDisplay() {
  const [performers, setPerformers] = useState<PerformanceOrder[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [emergencyCode, setEmergencyCode] = useState<EmergencyCode>({
    code: 'green',
    message: 'All clear - show proceeding as planned',
    active: true
  })

  useEffect(() => {
    // Load example data
    const examplePerformers: PerformanceOrder[] = [
      {
        id: '1',
        stageName: 'Bella Rose',
        style: 'Pop/R&B',
        order: 1,
        status: 'on-stage',
        specialNotes: 'Opening act - extra sound check completed'
      },
      {
        id: '2',
        stageName: 'Neon Dreams',
        style: 'Electronic/Synthwave',
        order: 2,
        status: 'ready',
        specialNotes: 'Video projection setup required',
        videoRequired: true
      },
      {
        id: '3',
        stageName: 'Thunder Storm',
        style: 'Hip-Hop/Rap',
        order: 3,
        status: 'waiting',
        specialNotes: 'Pyrotechnics - stage cleaning after',
        stageCleaning: true
      },
      {
        id: '4',
        stageName: 'Acoustic Soul',
        style: 'Folk/Acoustic',
        order: 4,
        status: 'waiting',
        specialNotes: 'Simple acoustic setup'
      },
      {
        id: '5',
        stageName: 'Electric Vibes',
        style: 'Rock/Alternative',
        order: 5,
        status: 'waiting'
      }
    ]

    setPerformers(examplePerformers)

    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const getStatusColor = (status: string) => {
    const colors = {
      'waiting': 'bg-gray-100 text-gray-800',
      'ready': 'bg-yellow-100 text-yellow-800 animate-pulse',
      'on-stage': 'bg-green-100 text-green-800 animate-pulse',
      'completed': 'bg-blue-100 text-blue-800'
    }
    return colors[status as keyof typeof colors]
  }

  const getStatusText = (status: string) => {
    const texts = {
      'waiting': 'WAITING',
      'ready': 'READY - GET IN POSITION',
      'on-stage': 'ON STAGE NOW',
      'completed': 'COMPLETED'
    }
    return texts[status as keyof typeof texts]
  }

  const getEmergencyColor = (code: string) => {
    const colors = {
      red: 'bg-red-500 text-white',
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white'
    }
    return colors[code as keyof typeof colors]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <Image
                src="/fame-logo.png"
                alt="FAME Logo"
                width={60}
                height={60}
                className="mr-4"
              />
              <div>
                <h1 className="text-3xl font-bold">ON-DECK DISPLAY</h1>
                <p className="text-lg opacity-80">Summer Music Festival 2024</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-lg opacity-80">
                {currentTime.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Emergency Alert */}
      {emergencyCode.active && (
        <div className={`${getEmergencyColor(emergencyCode.code)} py-4`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 mr-3 animate-pulse" />
              <span className="text-xl font-bold">
                {emergencyCode.code.toUpperCase()} ALERT: {emergencyCode.message}
              </span>
              <AlertTriangle className="h-6 w-6 ml-3 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Performer */}
        <Card className="mb-8 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0">
          <CardHeader>
            <CardTitle className="text-4xl text-center">🎤 NOW ON STAGE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <h2 className="text-6xl font-bold mb-4">
                {performers.find(p => p.status === 'on-stage')?.stageName || 'Sound Check'}
              </h2>
              <p className="text-2xl opacity-90">
                {performers.find(p => p.status === 'on-stage')?.style || 'Technical Setup'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Performance Queue */}
        <div className="grid gap-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-3xl text-center">🎭 PERFORMANCE QUEUE</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performers
                  .filter(p => p.status !== 'completed')
                  .sort((a, b) => a.order - b.order)
                  .map((performer, index) => (
                  <div
                    key={performer.id}
                    className={`p-6 rounded-lg border-2 ${
                      performer.status === 'on-stage'
                        ? 'bg-green-500/20 border-green-400 animate-pulse'
                        : performer.status === 'ready'
                        ? 'bg-yellow-500/20 border-yellow-400 animate-pulse'
                        : 'bg-white/5 border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                          performer.status === 'on-stage'
                            ? 'bg-green-500 text-white'
                            : performer.status === 'ready'
                            ? 'bg-yellow-500 text-black'
                            : 'bg-white/20 text-white'
                        }`}>
                          {performer.order}
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold">{performer.stageName}</h3>
                          <p className="text-xl opacity-80">{performer.style}</p>
                          {performer.specialNotes && (
                            <p className="text-lg mt-2 opacity-70">
                              📝 {performer.specialNotes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge className={`text-lg px-4 py-2 ${getStatusColor(performer.status)}`}>
                          {getStatusText(performer.status)}
                        </Badge>
                        <div className="flex space-x-2">
                          {performer.videoRequired && (
                            <Badge className="bg-purple-500 text-white">
                              <Video className="h-4 w-4 mr-1" />
                              VIDEO
                            </Badge>
                          )}
                          {performer.stageCleaning && (
                            <Badge className="bg-orange-500 text-white">
                              <Broom className="h-4 w-4 mr-1" />
                              CLEANING
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-blue-600/20 backdrop-blur-sm border-blue-400/30">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-4xl mb-2">🟢</div>
                  <h3 className="text-xl font-bold mb-2">READY</h3>
                  <p className="opacity-80">Get in position backstage</p>
                </div>
                <div>
                  <div className="text-4xl mb-2">🟡</div>
                  <h3 className="text-xl font-bold mb-2">ON DECK</h3>
                  <p className="opacity-80">You're next - final preparations</p>
                </div>
                <div>
                  <div className="text-4xl mb-2">🔴</div>
                  <h3 className="text-xl font-bold mb-2">ON STAGE</h3>
                  <p className="opacity-80">Your time to shine!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 bg-black/30 backdrop-blur-sm border-t border-white/20 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg opacity-80">
            🎵 Stay tuned to this display for real-time updates 🎵
          </p>
        </div>
      </footer>
    </div>
  )
}
