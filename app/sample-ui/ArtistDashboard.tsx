import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Music, Calendar, Edit, LogOut } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  venue: string;
}

interface ArtistProfile {
  id: string;
  artist_name: string;
  real_name?: string;
  email?: string;
  phone?: string;
  style?: string;
  biography?: string;
  notes?: string;
  props_needed?: string;
  performance_duration?: number;
  performance_date?: string;
  performance_order?: number;
  created_at: string;
  updated_at: string;
}

interface MusicTrack {
  id: string;
  song_title: string;
  duration?: number;
  notes?: string;
  is_main_track: boolean;
}

export default function ArtistDashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate(`/artist-auth/${eventId}`);
        return;
      }

      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, venue')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch artist profile - get the most recent one
      const { data: profileData, error: profileError } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('event_id', eventId)
        .eq('email', user.email)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        // No profile found, redirect to registration
        navigate(`/artist-registration/${eventId}`);
        return;
      }

      setProfile(profileData);

      // Fetch music tracks
      const { data: musicData, error: musicError } = await supabase
        .from('artist_music')
        .select('*')
        .eq('artist_id', profileData.id);

      if (musicError) throw musicError;
      setMusicTracks(musicData || []);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load artist data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate(`/artist-auth/${eventId}`);
  };

  const handleEditProfile = () => {
    navigate(`/artist-registration/${eventId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!event || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
          <Button onClick={() => navigate(`/artist-registration/${eventId}`)}>
            Register for Event
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
              <p className="text-muted-foreground">Artist Dashboard - {event.venue}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = "https://182391f1-7d22-4e88-afb4-1bbdc7413ad9.lovableproject.com/artist-auth/37725b3d-a07f-47f4-9e9c-9653021c1e6f"}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Greeting */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground">Hello, {profile.artist_name}!</h2>
        </div>
        
        <div className="space-y-6">
          {/* Profile Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Overview
                </CardTitle>
                <Button onClick={handleEditProfile} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
              <CardDescription>
                Your registration for {event.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground">Artist Name</h4>
                  <p className="text-muted-foreground">{profile.artist_name}</p>
                </div>
                {profile.real_name && (
                  <div>
                    <h4 className="font-medium text-foreground">Real Name</h4>
                    <p className="text-muted-foreground">{profile.real_name}</p>
                  </div>
                )}
                {profile.email && (
                  <div>
                    <h4 className="font-medium text-foreground">Email</h4>
                    <p className="text-muted-foreground">{profile.email}</p>
                  </div>
                )}
                {profile.phone && (
                  <div>
                    <h4 className="font-medium text-foreground">Phone</h4>
                    <p className="text-muted-foreground">{profile.phone}</p>
                  </div>
                )}
                {profile.style && (
                  <div>
                    <h4 className="font-medium text-foreground">Performance Style</h4>
                    <p className="text-muted-foreground">{profile.style}</p>
                  </div>
                )}
                {profile.performance_duration && (
                  <div>
                    <h4 className="font-medium text-foreground">Performance Duration</h4>
                    <p className="text-muted-foreground">{profile.performance_duration} minutes</p>
                  </div>
                )}
              </div>
              
              {profile.biography && (
                <div>
                  <h4 className="font-medium text-foreground">Biography</h4>
                  <p className="text-muted-foreground">{profile.biography}</p>
                </div>
              )}
              
              {profile.props_needed && (
                <div>
                  <h4 className="font-medium text-foreground">Props Needed</h4>
                  <p className="text-muted-foreground">{profile.props_needed}</p>
                </div>
              )}
              
              {profile.notes && (
                <div>
                  <h4 className="font-medium text-foreground">Special Notes</h4>
                  <p className="text-muted-foreground">{profile.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Performance Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.performance_date ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Scheduled</Badge>
                    <span className="text-foreground">
                      {new Date(profile.performance_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {profile.performance_order && (
                    <p className="text-muted-foreground">Performance order: #{profile.performance_order}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Pending</Badge>
                  <span className="text-muted-foreground">Performance date not yet assigned</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Music Tracks */}
          {musicTracks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Music Tracks
                </CardTitle>
                <CardDescription>
                  Your submitted tracks for the DJ and technical team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {musicTracks.map((track, index) => (
                    <div key={track.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">{track.song_title}</h4>
                        <div className="flex items-center gap-2">
                          {track.is_main_track && (
                            <Badge variant="default">Main Track</Badge>
                          )}
                          {track.duration && (
                            <Badge variant="secondary">{track.duration}s</Badge>
                          )}
                        </div>
                      </div>
                      {track.notes && (
                        <p className="text-muted-foreground text-sm">{track.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Registration Status */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="default">Submitted</Badge>
                <span className="text-muted-foreground">
                  Submitted on {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
              {profile.updated_at !== profile.created_at && (
                <p className="text-sm text-muted-foreground mt-2">
                  Last updated: {new Date(profile.updated_at).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}