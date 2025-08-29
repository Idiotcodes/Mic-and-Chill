import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

export default function Navigation() {
  const { isAuthenticated, user } = useAuth();

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mic className="text-primary-foreground h-4 w-4" />
              </div>
              <span className="text-xl font-bold text-foreground">PodcastLive</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <a 
                href="#live" 
                className="text-foreground hover:text-primary transition-colors"
                data-testid="link-live-now"
              >
                Live Now
              </a>
              <a 
                href="#upcoming" 
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-upcoming"
              >
                Upcoming
              </a>
              <a 
                href="#archived" 
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-archive"
              >
                Archive
              </a>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {user?.role === 'admin' && (
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = "/admin"}
                    data-testid="button-admin-access"
                  >
                    Admin
                  </Button>
                )}
                <div className="flex items-center space-x-2">
                  {user?.profileImageUrl && (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover"
                      data-testid="img-user-avatar"
                    />
                  )}
                  <span className="text-foreground text-sm" data-testid="text-user-name">
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/api/logout"}
                  data-testid="button-logout"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => window.location.href = "/api/login"}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="button-signin"
              >
                <Mic className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
