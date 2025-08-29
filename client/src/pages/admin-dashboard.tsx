import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  Podcast, 
  Users, 
  Calendar, 
  Settings, 
  Plus, 
  Activity,
  Mic,
  Clock
} from "lucide-react";
import type { PodcastWithHost, InsertPodcast } from "@shared/schema";

interface AdminStats {
  totalPodcasts: number;
  liveNow: number;
  totalListeners: number;
  thisMonth: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertPodcast>>({
    title: '',
    description: '',
    scheduledAt: undefined,
    status: 'draft',
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      toast({
        title: "Unauthorized",
        description: "Admin access required. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { 
    data: stats, 
    isLoading: isLoadingStats,
    error: statsError 
  } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  const { 
    data: podcasts = [], 
    isLoading: isLoadingPodcasts,
    error: podcastsError 
  } = useQuery<PodcastWithHost[]>({
    queryKey: ["/api/podcasts"],
    retry: false,
  });

  const createPodcastMutation = useMutation({
    mutationFn: async (data: InsertPodcast) => {
      const response = await apiRequest('POST', '/api/podcasts', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Podcast created successfully",
      });
      setShowCreateForm(false);
      setFormData({ title: '', description: '', scheduledAt: undefined, status: 'draft' });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create podcast",
        variant: "destructive",
      });
    },
  });

  // Handle errors
  useEffect(() => {
    if (statsError && isUnauthorizedError(statsError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [statsError, toast]);

  const handleCreatePodcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Title and description are required",
        variant: "destructive",
      });
      return;
    }

    createPodcastMutation.mutate(formData as InsertPodcast);
  };

  if (isLoading || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mic className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage your podcast platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-new-podcast"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Podcast
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = "/"}
                data-testid="button-back-home"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Podcasts</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-total-podcasts">
                    {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.totalPodcasts || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Podcast className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Live Now</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-live-now">
                    {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.liveNow || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Listeners</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-total-listeners">
                    {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.totalListeners || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">This Month</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-this-month">
                    {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.thisMonth || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create New Podcast Form */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Podcast</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePodcast} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Podcast Title</Label>
                    <Input
                      id="title"
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter podcast title"
                      data-testid="input-podcast-title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Podcast description"
                      className="h-20"
                      data-testid="textarea-podcast-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="scheduledAt">Scheduled Date & Time</Label>
                      <Input
                        id="scheduledAt"
                        type="datetime-local"
                        value={formData.scheduledAt ? new Date(formData.scheduledAt).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          scheduledAt: e.target.value ? new Date(e.target.value) : undefined 
                        })}
                        data-testid="input-scheduled-time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                      >
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={createPodcastMutation.isPending}
                      data-testid="button-create-podcast"
                    >
                      {createPodcastMutation.isPending ? "Creating..." : "Create Podcast"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Podcast Management */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Podcasts</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPodcasts ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="w-8 h-8 rounded" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : podcasts.length === 0 ? (
                <div className="text-center py-8">
                  <Podcast className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No podcasts created yet</p>
                  {!showCreateForm && (
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      className="mt-4"
                      data-testid="button-create-first-podcast"
                    >
                      Create Your First Podcast
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto" data-testid="list-recent-podcasts">
                  {podcasts.slice(0, 10).map((podcast) => (
                    <div key={podcast.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <Podcast className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-foreground font-medium text-sm" data-testid={`text-podcast-title-${podcast.id}`}>
                            {podcast.title}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            by {podcast.host?.firstName} {podcast.host?.lastName}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={podcast.status === 'live' ? 'destructive' : 'secondary'}
                        data-testid={`badge-status-${podcast.id}`}
                      >
                        {podcast.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
