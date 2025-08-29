import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import PodcastCard from "@/components/PodcastCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, Calendar } from "lucide-react";
import type { PodcastWithHost } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { 
    data: livePodcasts = [], 
    isLoading: isLoadingLive,
    error: liveError 
  } = useQuery<PodcastWithHost[]>({
    queryKey: ["/api/podcasts/live"],
    retry: false,
  });

  const { 
    data: upcomingPodcasts = [], 
    isLoading: isLoadingUpcoming,
    error: upcomingError 
  } = useQuery<PodcastWithHost[]>({
    queryKey: ["/api/podcasts/upcoming"],
    retry: false,
  });

  // Handle errors
  useEffect(() => {
    if (liveError && isUnauthorizedError(liveError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [liveError, toast]);

  useEffect(() => {
    if (upcomingError && isUnauthorizedError(upcomingError)) {
      toast({
        title: "Unauthorized", 
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [upcomingError, toast]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              Welcome to <span className="text-primary">PodcastLive</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover live podcasts happening right now and catch up on upcoming shows.
            </p>
          </div>
          
          {/* Live Indicator */}
          <div className="flex justify-center mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-foreground font-medium" data-testid="text-live-count">
                    {livePodcasts.length} Live Podcasts
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground" data-testid="text-total-listeners">
                    {livePodcasts.reduce((sum, p) => sum + parseInt(p.listenerCount || '0'), 0)} Listeners
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Live Podcasts Section */}
        <section id="live" className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
              Live Now
            </h2>
            {user?.role === 'admin' && (
              <Button
                variant="outline"
                onClick={() => window.location.href = "/admin"}
                data-testid="button-admin-panel"
              >
                Admin Panel
              </Button>
            )}
          </div>
          
          {isLoadingLive ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : livePodcasts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Live Podcasts</h3>
                <p className="text-muted-foreground">
                  There are currently no live podcasts. Check back later or browse upcoming shows.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {livePodcasts.map((podcast) => (
                <PodcastCard 
                  key={podcast.id} 
                  podcast={podcast} 
                  isLive={true}
                />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Podcasts Section */}
        <section id="upcoming" className="mb-12 pb-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Upcoming Podcasts</h2>
          </div>
          
          {isLoadingUpcoming ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Skeleton className="w-12 h-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : upcomingPodcasts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Upcoming Podcasts</h3>
                <p className="text-muted-foreground">
                  No podcasts are currently scheduled. Check back later for new content.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingPodcasts.map((podcast) => (
                <PodcastCard 
                  key={podcast.id} 
                  podcast={podcast} 
                  isUpcoming={true}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
