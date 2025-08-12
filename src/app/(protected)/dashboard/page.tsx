'use client';

import { ProtectedRoute } from '@/components/enterprise/ProtectedRoute';
import { usePetLoveCommunitySession } from '@/components/providers/SessionProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { correlationService } from '@/lib/services/CorrelationService';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  return (
    <ProtectedRoute requiredRole="user">
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = usePetLoveCommunitySession();
  const [correlationId, setCorrelationId] = useState<string>('');

  useEffect(() => {
    const correlationContext = correlationService.createContext(user?.id, undefined);
    setCorrelationId(correlationContext.correlationId);

    console.log('[Dashboard] User dashboard accessed', {
      correlationId: correlationContext.correlationId,
      userId: user?.id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
    });
  }, [user]);

  const stats = [
    {
      title: 'Adoption Applications',
      value: user?.adoptionHistory?.length || 0,
      subtitle: 'Applications submitted',
      icon: '❤️',
      color: 'bg-coral/10 text-coral',
    },
    {
      title: 'Events Attended',
      value: user?.volunteeredEvents?.length || 0,
      subtitle: 'Community events',
      icon: '📅',
      color: 'bg-teal/10 text-teal',
    },
    {
      title: 'Account Status',
      value: user?.isEmailVerified ? 'Verified' : 'Pending',
      subtitle: 'Email verification',
      icon: user?.isEmailVerified ? '✅' : '⏳',
      color: user?.isEmailVerified ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600',
    },
    {
      title: 'Member Since',
      value: user?.createdAt ? new Date(user.createdAt).getFullYear().toString() : 'N/A',
      subtitle: 'Year joined',
      icon: '🗓️',
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  const recentActivities = [
    {
      title: 'Profile Updated',
      description: 'Updated your profile information',
      time: '2 hours ago',
      icon: '👤',
    },
    {
      title: 'Event RSVP',
      description: 'Registered for Pet Adoption Fair',
      time: '1 day ago',
      icon: '📅',
    },
    {
      title: 'New Message',
      description: 'Adoption coordinator sent a message',
      time: '3 days ago',
      icon: '💬',
    },
  ];

  return (
    <div className="min-h-[80vh] px-4 sm:px-6 lg:px-8 py-8" data-correlation-id={correlationId}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-midnight mb-2">
            Welcome back, {user?.name || 'Pet Lover'}! 👋
          </h1>
          <p className="text-text-secondary">
            Here's what's happening with your Pet Love Community account
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} variant="default" className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">{stat.title}</p>
                    <p className="text-2xl font-bold text-midnight">{stat.value}</p>
                    <p className="text-xs text-text-tertiary">{stat.subtitle}</p>
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
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card variant="default" className="mb-6">
              <CardHeader>
                <CardTitle level={2} className="text-xl text-midnight">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    variant="adoption"
                    size="lg"
                    onClick={() => console.log('Browse pets clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    🐕 Browse Available Pets
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => console.log('View events clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    📅 Upcoming Events
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => console.log('Update profile clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    👤 Update Profile
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => console.log('View applications clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    📋 My Applications
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Adoption Status */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={2} className="text-xl text-midnight">
                  Adoption Journey
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user?.adoptionHistory?.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-text-secondary">
                      You have {user.adoptionHistory.length} active adoption applications
                    </p>
                    
                    <div className="bg-beige rounded-lg p-4">
                      <h4 className="font-medium text-midnight mb-2">Latest Application</h4>
                      <p className="text-sm text-text-secondary">
                        Application for "Buddy" - Golden Retriever
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">
                        Status: Under Review
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🐾</span>
                    </div>
                    <h4 className="font-medium text-midnight mb-2">Start Your Adoption Journey</h4>
                    <p className="text-text-secondary mb-4">
                      Ready to find your perfect companion? Browse our available pets and start the adoption process.
                    </p>
                    <Button
                      variant="adoption"
                      onClick={() => console.log('Start adoption clicked', { correlationId, userId: user?.id })}
                    >
                      Find My Pet
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={3} className="text-lg text-midnight">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-beige rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">{activity.icon}</span>
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

            {/* Account Info */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={3} className="text-lg text-midnight">
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Email</p>
                  <p className="text-sm text-midnight">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-secondary">Role</p>
                  <p className="text-sm text-midnight capitalize">{user?.role}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-secondary">Member Since</p>
                  <p className="text-sm text-midnight">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-secondary">Last Login</p>
                  <p className="text-sm text-midnight">
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}