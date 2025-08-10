import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Link, Users, Calendar, Music, Code, Play, UserPlus, Copy, Check, Headphones, Mic, Image, Monitor } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  show_dates: string[];
  venue: string;
  status: string;
}

export default function StageManagerDashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      toast({
        title: "Error fetching event",
        description: "Failed to load event details",
        variant: "destructive",
      });
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Event not found</h2>
          <Button onClick={() => navigate('/admin/events')}>
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const handleCreateArtistLink = () => {
    navigate(`/artist-registration/${eventId}`);
  };

  const handleManageArtists = () => {
    navigate(`/artist-management/${eventId}`);
  };

  const copyArtistLink = async () => {
    const link = `${window.location.origin}/artist-auth/${eventId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Artist registration link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleManageTeamAccess = () => {
    navigate(`/team-access/${eventId}`);
  };

  const handleRehearsalSchedule = () => {
    navigate(`/rehearsal-schedule/${eventId}`);
  };

  const handleShowOrder = () => {
    navigate(`/performance-order/${eventId}`);
  };

  const handleAddCodes = () => {
    navigate(`/emergency-codes/${eventId}`);
  };

  const handleDJDashboard = () => {
    navigate(`/dj/${eventId}`);
  };

  const handleMCDashboard = () => {
    navigate(`/mc/${eventId}`);
  };

  const handleLiveBoard = () => {
    navigate(`/live-board`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/admin/events')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Events
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
              <p className="text-muted-foreground">Stage Manager Dashboard - {event.venue}</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {event.status}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Event Info */}
          <Card className="hover:shadow-md transition-shadow col-span-full">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-foreground">{event.name}</h1>
                <h2 className="text-2xl font-semibold text-muted-foreground">{event.venue}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 text-left">
                  <div>
                    <span className="font-medium text-sm text-muted-foreground">EVENT DATES</span>
                    <p className="text-lg">{new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}</p>
                  </div>
                  
                  {event.show_dates && event.show_dates.length > 0 && (
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">SHOW DATES</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {event.show_dates.slice(0, 3).map((date, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {new Date(date).toLocaleDateString()}
                          </Badge>
                        ))}
                        {event.show_dates.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{event.show_dates.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {event.description && (
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">DESCRIPTION</span>
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Artist Management */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Artist Portal
              </CardTitle>
              <CardDescription>
                Share link with artists and manage submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-2 bg-muted rounded-md text-sm break-all">
                {`${window.location.origin}/artist-auth/${eventId}`}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={copyArtistLink}
                  className="flex items-center gap-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button 
                  size="sm"
                  onClick={handleManageArtists}
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage Artists
                </Button>
              </div>
            </CardContent>
          </Card>


          {/* Rehearsal Schedule */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Rehearsal Schedule
              </CardTitle>
              <CardDescription>
                Plan and organize rehearsal times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={handleRehearsalSchedule}
              >
                Start Rehearsal
              </Button>
            </CardContent>
          </Card>

          {/* Show Order */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Stage Manager Dashboard
              </CardTitle>
              <CardDescription>
                Set performance order and timing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={handleShowOrder}
              >
                <Play className="h-4 w-4 mr-2" />
                Manage Show Order
              </Button>
            </CardContent>
          </Card>

          {/* DJ Dashboard */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                DJ Dashboard
              </CardTitle>
              <CardDescription>
                Access music tracks and performance order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={handleDJDashboard}
              >
                <Music className="h-4 w-4 mr-2" />
                Open DJ Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* MC Dashboard */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                MC Dashboard
              </CardTitle>
              <CardDescription>
                View artist info and announcements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={handleMCDashboard}
              >
                <Mic className="h-4 w-4 mr-2" />
                Open MC Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Live Performance Board */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Backstage Live Performance Board
              </CardTitle>
              <CardDescription>
                Real-time performance monitoring and display
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={handleLiveBoard}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Open Live Board
              </Button>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}