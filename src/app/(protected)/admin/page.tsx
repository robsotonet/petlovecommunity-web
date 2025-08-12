'use client';

import { ProtectedRoute } from '@/components/enterprise/ProtectedRoute';
import { usePetLoveCommunitySession } from '@/components/providers/SessionProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { correlationService } from '@/lib/services/CorrelationService';
import { useEffect, useState } from 'react';

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}

function AdminDashboardContent() {
  const { user } = usePetLoveCommunitySession();
  const [correlationId, setCorrelationId] = useState<string>('');

  useEffect(() => {
    const correlationContext = correlationService.createContext(user?.id, undefined);
    setCorrelationId(correlationContext.correlationId);

    console.log('[AdminDashboard] Admin dashboard accessed', {
      correlationId: correlationContext.correlationId,
      userId: user?.id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
    });
  }, [user]);

  const systemStats = [
    {
      title: 'Total Users',
      value: 1247,
      change: '+23',
      changeType: 'increase',
      subtitle: 'This month',
      icon: '👥',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Active Pets',
      value: 89,
      change: '-5',
      changeType: 'decrease',
      subtitle: 'Available for adoption',
      icon: '🐾',
      color: 'bg-coral/10 text-coral',
    },
    {
      title: 'Adoptions',
      value: 34,
      change: '+12',
      changeType: 'increase',
      subtitle: 'This month',
      icon: '❤️',
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Revenue',
      value: '$12,450',
      change: '+8%',
      changeType: 'increase',
      subtitle: 'Monthly donations',
      icon: '💰',
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  const recentActivities = [
    {
      title: 'New User Registration',
      description: 'Sarah Johnson joined as volunteer',
      time: '5 minutes ago',
      type: 'user',
      icon: '👤',
    },
    {
      title: 'Pet Adoption Completed',
      description: 'Max (German Shepherd) adopted by the Smith family',
      time: '2 hours ago',
      type: 'adoption',
      icon: '🏠',
    },
    {
      title: 'Event Scheduled',
      description: 'Pet Adoption Fair scheduled for next weekend',
      time: '4 hours ago',
      type: 'event',
      icon: '📅',
    },
    {
      title: 'System Alert',
      description: 'Backup completed successfully',
      time: '6 hours ago',
      type: 'system',
      icon: '⚙️',
    },
  ];

  const pendingApprovals = [
    {
      title: 'Volunteer Application',
      description: 'Michael Chen - experienced with animal care',
      priority: 'high',
      type: 'volunteer',
    },
    {
      title: 'Pet Listing',
      description: 'Bella - 2yr old Golden Retriever needs medical review',
      priority: 'medium',
      type: 'pet',
    },
    {
      title: 'Event Proposal',
      description: 'Community Pet Training Workshop',
      priority: 'low',
      type: 'event',
    },
    {
      title: 'Adoption Application',
      description: 'Johnson family - requires background check verification',
      priority: 'high',
      type: 'adoption',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return '👤';
      case 'adoption': return '🏠';
      case 'event': return '📅';
      case 'system': return '⚙️';
      default: return '📝';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-coral/10 border-coral text-coral';
      case 'medium': return 'bg-amber-50 border-amber-500 text-amber-700';
      case 'low': return 'bg-teal/10 border-teal text-teal';
      default: return 'bg-gray-50 border-gray-300 text-gray-700';
    }
  };

  return (
    <div className="min-h-[80vh] px-4 sm:px-6 lg:px-8 py-8" data-correlation-id={correlationId}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-midnight mb-2">
            Admin Dashboard 🛡️
          </h1>
          <p className="text-text-secondary">
            System overview and management tools for {user?.name}
          </p>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {systemStats.map((stat, index) => (
            <Card key={index} variant="default" className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">{stat.title}</p>
                    <p className="text-2xl font-bold text-midnight">{stat.value}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className={`text-xs font-medium ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-coral'
                      }`}>
                        {stat.change}
                      </span>
                      <span className="text-xs text-text-tertiary">{stat.subtitle}</span>
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Admin Tools */}
          <div className="lg:col-span-2 space-y-6">
            {/* Management Tools */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={2} className="text-xl text-midnight">
                  System Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    variant="adoption"
                    size="lg"
                    onClick={() => console.log('User management clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    👥 User Management
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => console.log('Pet management clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    🐕 Pet Database
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => console.log('System settings clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    ⚙️ System Settings
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => console.log('Analytics clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    📊 Analytics
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-midnight mb-4">Quick Actions</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => console.log('Backup clicked', { correlationId, userId: user?.id })}
                      className="text-xs"
                    >
                      💾 Backup
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => console.log('Logs clicked', { correlationId, userId: user?.id })}
                      className="text-xs"
                    >
                      📋 View Logs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => console.log('Email blast clicked', { correlationId, userId: user?.id })}
                      className="text-xs"
                    >
                      📧 Send Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => console.log('Maintenance clicked', { correlationId, userId: user?.id })}
                      className="text-xs"
                    >
                      🔧 Maintenance
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Approvals */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={2} className="text-xl text-midnight">
                  Pending Approvals ({pendingApprovals.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingApprovals.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-midnight">{item.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary">{item.description}</p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="adoption"
                          size="sm"
                          onClick={() => console.log('Approve clicked', { correlationId, userId: user?.id, itemType: item.type })}
                        >
                          ✓ Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => console.log('Review clicked', { correlationId, userId: user?.id, itemType: item.type })}
                        >
                          👁️ Review
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={() => console.log('View all approvals clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    View All Pending Items
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={3} className="text-lg text-midnight">
                  System Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-beige rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">{getActivityIcon(activity.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-midnight">{activity.title}</p>
                      <p className="text-xs text-text-secondary">{activity.description}</p>
                      <p className="text-xs text-text-tertiary">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* System Health */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={3} className="text-lg text-midnight">
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Database</span>
                  <span className="text-sm font-medium text-green-600">✓ Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">API Services</span>
                  <span className="text-sm font-medium text-green-600">✓ Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Email Service</span>
                  <span className="text-sm font-medium text-green-600">✓ Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Storage</span>
                  <span className="text-sm font-medium text-amber-600">⚠ 78% Full</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Last Backup</span>
                  <span className="text-sm font-medium text-green-600">6 hours ago</span>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Actions */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={3} className="text-lg text-midnight">
                  Emergency Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.log('Emergency broadcast clicked', { correlationId, userId: user?.id })}
                  className="w-full text-left justify-start"
                >
                  📢 Emergency Broadcast
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.log('Maintenance mode clicked', { correlationId, userId: user?.id })}
                  className="w-full text-left justify-start"
                >
                  🚧 Maintenance Mode
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.log('Emergency backup clicked', { correlationId, userId: user?.id })}
                  className="w-full text-left justify-start"
                >
                  💾 Emergency Backup
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}