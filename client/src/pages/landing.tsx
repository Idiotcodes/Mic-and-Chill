import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Users, Calendar, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Live Podcast <span className="text-primary">Platform</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Stream live podcasts, engage with audiences in real-time, and build your community with our professional-grade platform.
          </p>
          
          {/* Live Indicator */}
          <div className="flex justify-center mb-12">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-foreground font-medium">Live Podcasts Available</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">Join the conversation</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* CTA Button */}
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-signin"
          >
            <Mic className="mr-2 h-5 w-5" />
            Get Started
          </Button>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Live Streaming</h3>
              <p className="text-muted-foreground">
                Professional-grade live audio streaming with real-time audience engagement.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Easy Scheduling</h3>
              <p className="text-muted-foreground">
                Schedule podcasts in advance and automatically notify your audience.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Analytics</h3>
              <p className="text-muted-foreground">
                Track listener engagement and grow your podcast audience effectively.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
