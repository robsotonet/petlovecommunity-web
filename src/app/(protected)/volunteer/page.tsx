'use client';

import { ProtectedRoute } from '@/components/enterprise/ProtectedRoute';
import { usePetLoveCommunitySession } from '@/components/providers/SessionProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { correlationService } from '@/lib/services/CorrelationService';
import { useEffect, useState } from 'react';

export default function VolunteerDashboardPage() {
  return (
    <ProtectedRoute requiredRole="volunteer">
      <VolunteerDashboardContent />
    </ProtectedRoute>
  );
}

function VolunteerDashboardContent() {
  const { user } = usePetLoveCommunitySession();
  const [correlationId, setCorrelationId] = useState<string>('');

  useEffect(() => {
    const correlationContext = correlationService.createContext(user?.id, undefined);
    setCorrelationId(correlationContext.correlationId);

    console.log('[VolunteerDashboard] Volunteer dashboard accessed', {
      correlationId: correlationContext.correlationId,
      userId: user?.id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
    });
  }, [user]);

  const volunteerStats = [
    {
      title: 'Events Organized',
      value: 12,
      subtitle: 'This year',
      icon: '📅',
      color: 'bg-teal/10 text-teal',
    },
    {
      title: 'Pets Helped',
      value: 28,
      subtitle: 'Total adoptions facilitated',
      icon: '🐾',
      color: 'bg-coral/10 text-coral',
    },
    {
      title: 'Volunteer Hours',
      value: 156,
      subtitle: 'This year',
      icon: '⏰',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Community Impact',
      value: 'High',
      subtitle: 'Impact rating',
      icon: '⭐',
      color: 'bg-amber-100 text-amber-600',
    },
  ];

  const upcomingTasks = [
    {
      title: 'Pet Adoption Fair Setup',
      description: 'Help set up booths and registration area',
      date: 'Tomorrow, 9:00 AM',
      priority: 'high',
      icon: '🏕️',
    },
    {
      title: 'New Volunteer Orientation',
      description: 'Lead orientation session for 5 new volunteers',
      date: 'Friday, 2:00 PM',
      priority: 'medium',
      icon: '👥',
    },
    {
      title: 'Pet Health Check Assistance',
      description: 'Assist veterinarian with weekly health checks',
      date: 'Saturday, 10:00 AM',
      priority: 'medium',
      icon: '🏥',
    },
    {
      title: 'Social Media Content Review',
      description: 'Review and approve adoption success stories',
      date: 'Monday, 11:00 AM',
      priority: 'low',
      icon: '📱',
    },
  ];

  const recentAchievements = [
    {
      title: 'Volunteer of the Month',
      description: 'Recognized for outstanding dedication',
      date: 'Last month',
      badge: '🏆',
    },
    {
      title: 'Event Coordination Success',
      description: 'Successfully organized adoption fair with 15 adoptions',
      date: '2 weeks ago',
      badge: '🎯',
    },
    {
      title: 'Training Certification',
      description: 'Completed advanced pet care training',
      date: '1 month ago',
      badge: '📜',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-coral bg-coral/5';
      case 'medium': return 'border-l-4 border-amber-500 bg-amber-50';
      case 'low': return 'border-l-4 border-teal bg-teal/5';
      default: return 'border-l-4 border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="min-h-[80vh] px-4 sm:px-6 lg:px-8 py-8" data-correlation-id={correlationId}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-midnight mb-2">
            Volunteer Dashboard 🤝
          </h1>
          <p className="text-text-secondary">
            Welcome {user?.name}! Manage your volunteer activities and track your impact.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {volunteerStats.map((stat, index) => (
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
          {/* Volunteer Tools */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={2} className="text-xl text-midnight">
                  Volunteer Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    variant="adoption"
                    size="lg"
                    onClick={() => console.log('Schedule event clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    📅 Schedule Event
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => console.log('Manage volunteers clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    👥 Manage Volunteers
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => console.log('Pet database clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    🐕 Pet Database
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => console.log('Reports clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    📊 Generate Reports
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={2} className="text-xl text-midnight">
                  Upcoming Tasks & Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingTasks.map((task, index) => (
                  <div key={index} className={`p-4 rounded-lg ${getPriorityColor(task.priority)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm">{task.icon}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-midnight">{task.title}</h4>
                          <p className="text-sm text-text-secondary mt-1">{task.description}</p>
                          <p className="text-xs text-text-tertiary mt-2">{task.date}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        task.priority === 'high' ? 'bg-coral text-white' :
                        task.priority === 'medium' ? 'bg-amber-500 text-white' :
                        'bg-teal text-white'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={() => console.log('View all tasks clicked', { correlationId, userId: user?.id })}
                    className="w-full"
                  >
                    View All Tasks
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Achievements */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={3} className="text-lg text-midnight">
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentAchievements.map((achievement, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-beige rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">{achievement.badge}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-midnight">{achievement.title}</p>
                      <p className="text-xs text-text-secondary">{achievement.description}</p>
                      <p className="text-xs text-text-tertiary">{achievement.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={3} className="text-lg text-midnight">
                  This Week's Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-coral">3</p>
                  <p className="text-sm text-text-secondary">Pets found homes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-teal">18</p>
                  <p className="text-sm text-text-secondary">Volunteer hours</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">2</p>
                  <p className="text-sm text-text-secondary">Events organized</p>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contacts */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={3} className="text-lg text-midnight">
                  Emergency Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Emergency Vet</p>
                  <p className="text-sm text-midnight">(555) 123-4567</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-secondary">Animal Control</p>
                  <p className="text-sm text-midnight">(555) 987-6543</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-secondary">Shelter Director</p>
                  <p className="text-sm text-midnight">(555) 456-7890</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}