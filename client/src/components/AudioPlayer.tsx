import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, SkipBack, SkipForward } from "lucide-react";

interface AudioPlayerProps {
  currentPodcast?: {
    id: string;
    title: string;
    host: string;
    imageUrl?: string;
    isLive?: boolean;
    url?: string;
  };
}

export default function AudioPlayer({ currentPodcast }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Only show if there's an actual current podcast
  if (!currentPodcast) return null;

  const mockPodcast = currentPodcast;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newVolume = value[0];
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Simulate loading audio stream for live podcasts
  useEffect(() => {
    if (mockPodcast.isLive && isPlaying) {
      // Simulate connecting to live stream
      console.log('Connecting to live stream:', mockPodcast.id);
      // In a real app, this would connect to a WebRTC stream or similar
    }
  }, [isPlaying, mockPodcast.isLive, mockPodcast.id]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm border-t border-border z-40">
      <audio ref={audioRef} preload="metadata" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Podcast Info */}
          <div className="flex items-center space-x-4">
            <img 
              src={mockPodcast.imageUrl} 
              alt="Current podcast" 
              className="w-12 h-12 rounded-md object-cover"
              data-testid="img-current-podcast"
            />
            <div>
              <h4 className="text-foreground font-medium text-sm" data-testid="text-current-title">
                {mockPodcast.title}
              </h4>
              <p className="text-muted-foreground text-xs" data-testid="text-current-host">
                {mockPodcast.host}
              </p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex-1 max-w-md mx-8">
            <div className="flex items-center justify-center space-x-4 mb-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-skip-back"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                onClick={togglePlayPause}
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-10 h-10 rounded-full p-0"
                data-testid="button-play-pause"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-skip-forward"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground w-12" data-testid="text-current-time">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                onValueChange={handleSeek}
                max={duration || 100}
                step={1}
                className="flex-1"
                data-testid="slider-progress"
              />
              <span className="text-xs text-muted-foreground w-12" data-testid="text-duration">
                {mockPodcast.isLive ? 'LIVE' : formatTime(duration)}
              </span>
            </div>
          </div>
          
          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {mockPodcast.isLive && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-1 h-3 bg-primary rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <span className="text-red-400 text-sm font-medium">LIVE</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.1}
                className="w-20"
                data-testid="slider-volume"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
