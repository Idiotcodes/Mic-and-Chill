import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Calendar, Mic, Play, Pause, Volume2 } from "lucide-react";
import { useState } from "react";
import LiveBroadcastStudio from "./LiveBroadcastStudio";
import { useAuth } from "@/hooks/useAuth";
import type { PodcastWithHost } from "@shared/schema";

interface PodcastCardProps {
  podcast: PodcastWithHost;
  isLive?: boolean;
  isUpcoming?: boolean;
}

function LivePodcastPlayer({ podcast, onClose }: { podcast: PodcastWithHost; onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mic className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{podcast.title}</h3>
        <p className="text-muted-foreground text-sm mb-4">{podcast.description}</p>
        
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-red-400 font-medium">LIVE</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{podcast.listenerCount || 0} listeners</span>
        </div>
      </div>
      
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-12 h-12 rounded-full p-0"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-1" />}
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full" 
              style={{ width: `${volume}%` }}
            ></div>
          </div>
          <span className="text-sm text-muted-foreground">{volume}%</span>
        </div>
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>Host: {podcast.host.firstName} {podcast.host.lastName}</p>
        {podcast.guests && podcast.guests.length > 0 && (
          <p>Guests: {podcast.guests.map(g => `${g.guest.firstName} ${g.guest.lastName}`).join(', ')}</p>
        )}
      </div>
      
      <div className="text-center">
        <Button variant="outline" onClick={onClose}>
          Close Player
        </Button>
      </div>
    </div>
  );
}

export default function PodcastCard({ podcast, isLive, isUpcoming }: PodcastCardProps) {
  const { user } = useAuth();
  const [showPlayer, setShowPlayer] = useState(false);
  const [showBroadcastStudio, setShowBroadcastStudio] = useState(false);
  
  const formatScheduledTime = (date: Date | string | null) => {
    if (!date) return "TBD";
    const d = new Date(date);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isHost = user?.id === podcast.hostId;
  const isGuest = podcast.guests?.some(g => g.guestId === user?.id);

  const handleJoinClick = () => {
    if (isLive) {
      if (isHost || isGuest) {
        // Hosts and guests get the broadcast studio
        setShowBroadcastStudio(true);
      } else {
        // Listeners get the simple player
        setShowPlayer(true);
      }
    } else {
      // For non-live podcasts, could redirect to recording or show info
      alert(`This podcast is ${podcast.status}. ${podcast.recordingUrl ? 'Recording available!' : 'No recording available yet.'}`);
    }
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
          {isLive ? (
            <>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="sm"
                onClick={handleJoinClick}
                data-testid={`button-join-${podcast.id}`}
              >
                {isHost || isGuest ? 'Broadcast' : 'Listen'}
              </Button>
              
              <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Live Podcast Player</DialogTitle>
                  </DialogHeader>
                  <LivePodcastPlayer podcast={podcast} onClose={() => setShowPlayer(false)} />
                </DialogContent>
              </Dialog>
              
              <Dialog open={showBroadcastStudio} onOpenChange={setShowBroadcastStudio}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Live Broadcast Studio</DialogTitle>
                  </DialogHeader>
                  {user && (
                    <LiveBroadcastStudio 
                      podcast={podcast} 
                      user={user} 
                      onClose={() => setShowBroadcastStudio(false)} 
                    />
                  )}
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              size="sm"
              onClick={handleJoinClick}
              data-testid={`button-join-${podcast.id}`}
            >
              {podcast.status === 'completed' && podcast.recordingUrl ? 'Listen' : 'Info'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
