'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/mock-auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, CheckCircle, Clock, Users, DollarSign, Calendar, LogOut, UserCheck, UserX, UserMinus, Bell } from 'lucide-react'
import Image from 'next/image'
import { mockUsers, mockPendingRegistrations, mockEvents, mockNotifications } from '@/lib/mock-data'
import { useToast } from '@/hooks/use-toast'

interface StageManager {
  id: string
  name: string
  email: string
  eventName?: string
  accountStatus: 'pending' | 'active' | 'suspended' | 'deactivated'
  subscriptionStatus: string
  subscriptionEndDate: string
  registeredAt: string
  lastLogin?: string
  approvedAt?: string
}

export default function SuperAdminStageManagers() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [pendingRegistrations, setPendingRegistrations] = useState(mockPendingRegistrations)
  const [stageManagers, setStageManagers] = useState(mockUsers.filter(u => u.role === 'stage_manager'))
  const [events] = useState(mockEvents)
  const [notifications] = useState(mockNotifications)
  const [selectedManager, setSelectedManager] = useState<any>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showExtendDialog, setShowExtendDialog] = useState(false)
  const [approvalData, setApprovalData] = useState({
    eventId: '',
    subscriptionEndDate: ''
  })

  const activeManagers = stageManagers.filter(m => m.accountStatus === 'active')
  const suspendedManagers = stageManagers.filter(m => m.accountStatus === 'suspended')
  const unreadNotifications = notifications.filter(n => !n.read).length

  const handleApproveManager = async () => {
    if (!selectedManager || !approvalData.eventId || !approvalData.subscriptionEndDate) return

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Move from pending to approved
    const approvedManager = {
      ...selectedManager,
      accountStatus: 'active',
      isActive: true,
      eventId: approvalData.eventId,
      subscriptionEndDate: approvalData.subscriptionEndDate,
      approvedAt: new Date().toISOString(),
      role: 'stage_manager'
    }

    setStageManagers(prev => [...prev, approvedManager])
    setPendingRegistrations(prev => prev.filter(r => r.id !== selectedManager.id))
    
    setShowApprovalDialog(false)
    setSelectedManager(null)
    setApprovalData({ eventId: '', subscriptionEndDate: '' })

    toast({
      title: "Manager Approved",
      description: `${selectedManager.name} has been approved and activated.`,
    })
  }

  const handleManagerAction = async (action: string, managerId: string, subscriptionEndDate?: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    switch (action) {
      case 'reject':
        setPendingRegistrations(prev => prev.filter(r => r.id !== managerId))
        toast({
          title: "Registration Rejected",
          description: "The registration has been rejected.",
          variant: "destructive"
        })
        break
      case 'suspend':
        setStageManagers(prev => prev.map(m => 
          m.id === managerId 
            ? { ...m, accountStatus: 'suspended', isActive: false }
            : m
        ))
        toast({
          title: "Account Suspended",
          description: "The stage manager account has been suspended.",
          variant: "destructive"
        })
        break
      case 'activate':
        setStageManagers(prev => prev.map(m => 
          m.id === managerId 
            ? { ...m, accountStatus: 'active', isActive: true }
            : m
        ))
        toast({
          title: "Account Activated",
          description: "The stage manager account has been reactivated.",
        })
        break
      case 'deactivate':
        setStageManagers(prev => prev.map(m => 
          m.id === managerId 
            ? { ...m, accountStatus: 'deactivated', isActive: false }
            : m
        ))
        toast({
          title: "Account Deactivated",
          description: "The stage manager account has been deactivated.",
          variant: "destructive"
        })
        break
      case 'extend_subscription':
        if (subscriptionEndDate) {
          setStageManagers(prev => prev.map(m => 
            m.id === managerId 
              ? { ...m, subscriptionEndDate }
              : m
          ))
          toast({
            title: "Subscription Extended",
            description: "The subscription has been extended successfully.",
          })
        }
        break
    }
  }

  const getStatusColor = (status?: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      deactivated: 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getSubscriptionColor = (endDate?: string) => {
    if (!endDate) return 'bg-gray-100 text-gray-800'
    const end = new Date(endDate)
    if (isNaN(end.getTime())) return 'bg-gray-100 text-gray-800'
    const now = new Date()
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return 'bg-red-100 text-red-800'
    if (daysLeft < 7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString()
  }

  const getDaysUntilExpiry = (endDate?: string) => {
    if (!endDate) return Number.POSITIVE_INFINITY
    const end = new Date(endDate)
    if (isNaN(end.getTime())) return Number.POSITIVE_INFINITY
    const now = new Date()
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysLeft
  }

  const monthlyRevenue = activeManagers.length * 29
  const expiringCount = stageManagers.filter(m => {
    const days = getDaysUntilExpiry(m.subscriptionEndDate)
    return days < 7 && days > 0
  }).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image
                src="/fame-logo.png"
                alt="FAME Logo"
                width={40}
                height={40}
                className="mr-3"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">FAME SaaS Management</h1>
                <p className="text-sm text-gray-500">Stage Manager Control Center</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </div>
              <Button variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Frontend Demo Mode
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>This is a frontend-only demo. All data is stored locally and will reset on page refresh.</p>
                <p className="mt-1">
                  <strong>Test Accounts:</strong> admin@fame.com/admin123, sarah@fame.com/stage123, mike@fame.com/mike123
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingRegistrations.length}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Managers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeManagers.length}</div>
              <p className="text-xs text-muted-foreground">
                Paying customers
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${monthlyRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                ${activeManagers.length} × $29/month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {expiringCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Within 7 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending Approvals ({pendingRegistrations.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active Managers ({activeManagers.length})
            </TabsTrigger>
            <TabsTrigger value="suspended">
              Suspended ({suspendedManagers.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Managers ({stageManagers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Pending Stage Manager Registrations
                </CardTitle>
                <CardDescription>
                  Review and approve new stage manager applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRegistrations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No pending registrations</p>
                    <p className="text-sm">New registrations will appear here for approval</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Event/Organization</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRegistrations.map((manager) => (
                        <TableRow key={manager.id}>
                          <TableCell className="font-medium">{manager.name}</TableCell>
                          <TableCell>{manager.email}</TableCell>
                          <TableCell>{manager.eventName}</TableCell>
                          <TableCell>{formatDate(manager.registeredAt)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedManager(manager)
                                  setShowApprovalDialog(true)
                                }}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleManagerAction('reject', manager.id)}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Active Stage Managers
                </CardTitle>
                <CardDescription>
                  Manage active subscriptions and account status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeManagers.map((manager) => (
                      <TableRow key={manager.id}>
                        <TableCell className="font-medium">{manager.name}</TableCell>
                        <TableCell>{manager.email}</TableCell>
                        <TableCell className="text-sm">{manager.eventName}</TableCell>
                        <TableCell>
                          <Badge className={getSubscriptionColor(manager.subscriptionEndDate)}>
                            {manager.subscriptionStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            {formatDate(manager.subscriptionEndDate)}
                            <div className="text-xs text-gray-500">
                              {getDaysUntilExpiry(manager.subscriptionEndDate)} days left
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {manager.lastLogin ? formatDate(manager.lastLogin) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedManager(manager)
                                setShowExtendDialog(true)
                              }}
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Extend
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleManagerAction('suspend', manager.id)}
                            >
                              <UserMinus className="h-4 w-4 mr-1" />
                              Suspend
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suspended">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Suspended Stage Managers
                </CardTitle>
                <CardDescription>
                  Manage suspended accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suspendedManagers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No suspended accounts</p>
                    <p className="text-sm">Suspended accounts will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suspendedManagers.map((manager) => (
                        <TableRow key={manager.id}>
                          <TableCell className="font-medium">{manager.name}</TableCell>
                          <TableCell>{manager.email}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(manager.accountStatus)}>
                              {manager.accountStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>{manager.eventName}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleManagerAction('activate', manager.id)}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Reactivate
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleManagerAction('deactivate', manager.id)}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Deactivate
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Stage Managers</CardTitle>
                <CardDescription>
                  Complete overview of all stage manager accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stageManagers.map((manager) => (
                      <TableRow key={manager.id}>
                        <TableCell className="font-medium">{manager.name}</TableCell>
                        <TableCell>{manager.email}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(manager.accountStatus)}>
                            {manager.accountStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSubscriptionColor(manager.subscriptionEndDate)}>
                            {manager.subscriptionStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{manager.eventName}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${manager.accountStatus === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                            ${manager.accountStatus === 'active' ? '29' : '0'}/month
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Stage Manager</DialogTitle>
            <DialogDescription>
              Set up the account for {selectedManager?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="eventSelect">Assign to Event</Label>
              <Select value={approvalData.eventId} onValueChange={(value) => setApprovalData({...approvalData, eventId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} - {event.venue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subscriptionEnd">Subscription End Date</Label>
              <Input
                id="subscriptionEnd"
                type="date"
                value={approvalData.subscriptionEndDate}
                onChange={(e) => setApprovalData({...approvalData, subscriptionEndDate: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Trial Period:</strong> New users get 7 days free, then $29/month
              </p>
            </div>
            <Button onClick={handleApproveManager} className="w-full">
              Approve & Activate Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
            <DialogDescription>
              Extend subscription for {selectedManager?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentEnd">Current End Date</Label>
              <Input
                id="currentEnd"
                value={selectedManager?.subscriptionEndDate ? formatDate(selectedManager.subscriptionEndDate) : ''}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="newEndDate">New End Date</Label>
              <Input
                id="newEndDate"
                type="date"
                onChange={(e) => setApprovalData({...approvalData, subscriptionEndDate: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Billing:</strong> Extension will be charged at $29/month
              </p>
            </div>
            <Button 
              onClick={() => {
                if (selectedManager && approvalData.subscriptionEndDate) {
                  handleManagerAction('extend_subscription', selectedManager.id, approvalData.subscriptionEndDate)
                  setShowExtendDialog(false)
                  setApprovalData({ eventId: '', subscriptionEndDate: '' })
                }
              }} 
              className="w-full"
            >
              Extend Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
