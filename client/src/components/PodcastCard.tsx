import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Mic } from "lucide-react";
import type { PodcastWithHost } from "@shared/schema";

interface PodcastCardProps {
  podcast: PodcastWithHost;
  isLive?: boolean;
  isUpcoming?: boolean;
}

export default function PodcastCard({ podcast, isLive, isUpcoming }: PodcastCardProps) {
  const formatScheduledTime = (date: Date | string | null) => {
    if (!date) return "TBD";
    const d = new Date(date);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isUpcoming) {
    return (
      <Card className="hover:border-primary/50 transition-colors" data-testid={`card-upcoming-${podcast.id}`}>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-secondary rounded-lg p-3 flex-shrink-0">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-foreground" data-testid={`text-title-${podcast.id}`}>
                  {podcast.title}
                </h3>
                <Badge className="bg-accent text-accent-foreground" data-testid={`badge-status-${podcast.id}`}>
                  {podcast.status}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mb-3" data-testid={`text-description-${podcast.id}`}>
                {podcast.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm" data-testid={`text-scheduled-${podcast.id}`}>
                    {formatScheduledTime(podcast.scheduledAt)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {podcast.host.profileImageUrl && (
                    <img 
                      src={podcast.host.profileImageUrl} 
                      alt="Host avatar" 
                      className="w-6 h-6 rounded-full object-cover"
                      data-testid={`img-host-avatar-${podcast.id}`}
                    />
                  )}
                  <span className="text-foreground text-sm" data-testid={`text-host-name-${podcast.id}`}>
                    {podcast.host.firstName} {podcast.host.lastName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors" data-testid={`card-live-${podcast.id}`}>
      <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Mic className="h-8 w-8 text-primary" />
          </div>
          <p className="text-foreground font-medium">{podcast.title}</p>
        </div>
      </div>
      
      <CardContent className="p-6">
        {isLive && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 text-sm font-medium">LIVE</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i}
                    className="w-1 h-3 bg-primary rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="text-muted-foreground text-sm" data-testid={`text-listeners-${podcast.id}`}>
                {podcast.listenerCount || '0'} listeners
              </span>
            </div>
          </div>
        )}
        
        <h3 className="text-lg font-semibold text-foreground mb-2" data-testid={`text-title-${podcast.id}`}>
          {podcast.title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4" data-testid={`text-description-${podcast.id}`}>
          {podcast.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {podcast.host.profileImageUrl && (
              <img 
                src={podcast.host.profileImageUrl} 
                alt="Host avatar" 
                className="w-8 h-8 rounded-full object-cover"
                data-testid={`img-host-avatar-${podcast.id}`}
              />
            )}
            <span className="text-foreground text-sm font-medium" data-testid={`text-host-name-${podcast.id}`}>
              {podcast.host.firstName} {podcast.host.lastName}
            </span>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            size="sm"
            data-testid={`button-join-${podcast.id}`}
          >
            {isLive ? 'Join Live' : 'Listen'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
