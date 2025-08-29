import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Users, 
  Square, 
  Play,
  Settings
} from "lucide-react";
import type { PodcastWithHost, User } from "@shared/schema";

interface LiveBroadcastStudioProps {
  podcast: PodcastWithHost;
  user: User;
  onClose: () => void;
}

interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  role: 'host' | 'guest' | 'listener';
  isMuted: boolean;
}

export default function LiveBroadcastStudio({ podcast, user, onClose }: LiveBroadcastStudioProps) {
  const { toast } = useToast();
  const [isLive, setIsLive] = useState(podcast.status === 'live');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState([80]);
  const [connectedUsers, setConnectedUsers] = useState<PeerConnection[]>([]);
  const [listenerCount, setListenerCount] = useState(parseInt(podcast.listenerCount || '0'));
  
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const isHost = podcast.hostId === user.id;
  const isGuest = podcast.guests?.some(g => g.guestId === user.id);
  const userRole = isHost ? 'host' : isGuest ? 'guest' : 'listener';

  // WebSocket connection for signaling
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      // Join the podcast room
      wsRef.current?.send(JSON.stringify({
        type: 'join-podcast',
        podcastId: podcast.id,
        userId: user.id,
        role: userRole
      }));
    };
    
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };
    
    return () => {
      wsRef.current?.close();
    };
  }, [podcast.id, user.id, userRole]);

  // Get user media for hosts and guests
  useEffect(() => {
    if (userRole !== 'listener') {
      getUserMedia();
    }
  }, [userRole]);

  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      localStreamRef.current = stream;
      
      // Create audio context for monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      // Add audio monitoring here if needed
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error", 
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const handleWebSocketMessage = async (message: any) => {
    switch (message.type) {
      case 'user-joined':
        setListenerCount(prev => prev + 1);
        toast({
          title: `${message.role === 'listener' ? 'Listener' : 'Participant'} joined`,
          description: `Someone joined the podcast`
        });
        break;
        
      case 'webrtc-offer':
        await handleWebRTCOffer(message);
        break;
        
      case 'webrtc-answer':
        await handleWebRTCAnswer(message);
        break;
        
      case 'webrtc-candidate':
        await handleICECandidate(message);
        break;
        
      case 'mute-audio':
      case 'unmute-audio':
        updateUserMuteStatus(message.userId, message.muted);
        break;
    }
  };

  const handleWebRTCOffer = async (message: any) => {
    // Handle incoming WebRTC offer for peer-to-peer connection
    const peerConnection = createPeerConnection(message.fromUserId);
    await peerConnection.setRemoteDescription(message.offer);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    wsRef.current?.send(JSON.stringify({
      type: 'webrtc-answer',
      answer,
      userId: user.id
    }));
  };

  const handleWebRTCAnswer = async (message: any) => {
    const peerConnection = peersRef.current.get(message.fromUserId);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(message.answer);
    }
  };

  const handleICECandidate = async (message: any) => {
    const peerConnection = peersRef.current.get(message.fromUserId);
    if (peerConnection) {
      await peerConnection.addIceCandidate(message.candidate);
    }
  };

  const createPeerConnection = (userId: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current?.send(JSON.stringify({
          type: 'webrtc-candidate',
          candidate: event.candidate,
          userId: user.id
        }));
      }
    };
    
    peerConnection.ontrack = (event) => {
      // Play incoming audio from other participants
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play().catch(console.error);
    };
    
    peersRef.current.set(userId, peerConnection);
    return peerConnection;
  };

  const updateUserMuteStatus = (userId: string, muted: boolean) => {
    setConnectedUsers(prev => 
      prev.map(user => 
        user.userId === userId ? { ...user, isMuted: muted } : user
      )
    );
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // Toggle enabled state
      });
      
      setIsMuted(!isMuted);
      
      // Broadcast mute status
      wsRef.current?.send(JSON.stringify({
        type: isMuted ? 'unmute-audio' : 'mute-audio',
        userId: user.id
      }));
    }
  };

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/podcasts/${podcast.id}/status`, { status: 'live' });
      return response.json();
    },
    onSuccess: () => {
      setIsLive(true);
      toast({
        title: "Gone Live!",
        description: "Your podcast is now broadcasting live"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
    }
  });

  const endPodcastMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/podcasts/${podcast.id}/status`, { status: 'completed' });
      return response.json();
    },
    onSuccess: () => {
      setIsLive(false);
      toast({
        title: "Podcast Ended",
        description: "Your podcast has ended successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      onClose();
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5" />
                <span>{podcast.title}</span>
                {isLive && (
                  <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                )}
              </CardTitle>
              <p className="text-muted-foreground mt-1">{podcast.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium" data-testid="text-listener-count">{listenerCount} listeners</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You are the {userRole}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Broadcasting Controls */}
      {(isHost || isGuest) && (
        <Card>
          <CardHeader>
            <CardTitle>Broadcasting Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={toggleMute}
                  variant={isMuted ? "destructive" : "default"}
                  size="lg"
                  data-testid="button-toggle-mute"
                >
                  {isMuted ? (
                    <>
                      <MicOff className="h-5 w-5 mr-2" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5 mr-2" />
                      Mute
                    </>
                  )}
                </Button>
                
                <div className="flex items-center space-x-2">
                  <VolumeX className="h-4 w-4" />
                  <Slider
                    value={volume}
                    onValueChange={setVolume}
                    max={100}
                    className="w-24"
                    data-testid="slider-microphone-volume"
                  />
                  <Volume2 className="h-4 w-4" />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!isLive ? (
                  <Button
                    onClick={() => goLiveMutation.mutate()}
                    disabled={goLiveMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                    size="lg"
                    data-testid="button-go-live"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    {goLiveMutation.isPending ? "Going Live..." : "Go Live"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => endPodcastMutation.mutate()}
                    disabled={endPodcastMutation.isPending}
                    variant="destructive"
                    size="lg"
                    data-testid="button-end-podcast"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    {endPodcastMutation.isPending ? "Ending..." : "End Podcast"}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Audio Level Indicator */}
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Audio Level</span>
                <Badge variant={isMuted ? "destructive" : "default"}>
                  {isMuted ? "MUTED" : "LIVE"}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-6 rounded-full ${
                        !isMuted && i < volume[0] / 10 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-muted-foreground/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Host */}
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center space-x-3">
                {podcast.host.profileImageUrl && (
                  <img 
                    src={podcast.host.profileImageUrl} 
                    alt="Host" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{podcast.host.firstName} {podcast.host.lastName}</p>
                  <Badge variant="secondary">Host</Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {userRole === 'host' ? (
                  <Badge variant={isMuted ? "destructive" : "default"}>
                    {isMuted ? "MUTED" : "SPEAKING"}
                  </Badge>
                ) : (
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 h-4 bg-primary rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Guests */}
            {podcast.guests?.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                <div className="flex items-center space-x-3">
                  {guest.guest.profileImageUrl && (
                    <img 
                      src={guest.guest.profileImageUrl} 
                      alt="Guest" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium">{guest.guest.firstName} {guest.guest.lastName}</p>
                    <Badge variant="outline">Guest</Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {user.id === guest.guestId ? (
                    <Badge variant={isMuted ? "destructive" : "default"}>
                      {isMuted ? "MUTED" : "SPEAKING"}
                    </Badge>
                  ) : (
                    <div className="flex space-x-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 h-4 bg-accent rounded-full animate-pulse"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Listeners Only View */}
      {userRole === 'listener' && (
        <Card>
          <CardHeader>
            <CardTitle>Listening to Live Podcast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Volume2 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground">
                You're listening to the live podcast. Audio will start automatically.
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <VolumeX className="h-4 w-4" />
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                className="w-32"
                data-testid="slider-listener-volume"
              />
              <Volume2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Leave Podcast
        </Button>
        
        {isHost && (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}