import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, Clock, GripVertical, Star, CheckCircle } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  venue: string;
  show_dates: string[];
}

interface Artist {
  id: string;
  artist_name: string;
  style: string;
  performance_duration: number;
  quality_rating: number | null;
  rehearsal_date: string | null;
  rehearsal_order: number | null;
  is_confirmed: boolean;
  performance_date: string | null;
  rehearsal_completed: boolean;
}

export default function RehearsalSchedule() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      fetchArtists();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('events')
        .select('id, name, venue, show_dates')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
      
      // Set first show date as default
      if (data.show_dates && data.show_dates.length > 0) {
        setSelectedDate(data.show_dates[0]);
      }
    } catch (error) {
      toast({
        title: "Error fetching event",
        description: "Failed to load event details",
        variant: "destructive",
      });
    }
  };

  const fetchArtists = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('artist_profiles')
        .select('id, artist_name, style, performance_duration, quality_rating, rehearsal_date, rehearsal_order, is_confirmed, performance_date, rehearsal_completed')
        .eq('event_id', eventId)
        .not('performance_date', 'is', null)
        .order('rehearsal_order', { ascending: true, nullsLast: true });

      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      toast({
        title: "Error fetching artists",
        description: "Failed to load artist list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQualityRating = async (artistId: string, rating: number) => {
    try {
      const { error } = await (supabase as any)
        .from('artist_profiles')
        .update({ quality_rating: rating })
        .eq('id', artistId);

      if (error) throw error;

      setArtists(artists.map(artist => 
        artist.id === artistId 
          ? { ...artist, quality_rating: rating }
          : artist
      ));

      toast({
        title: "Quality rating updated",
        description: "Artist quality rating has been saved",
      });
    } catch (error) {
      toast({
        title: "Error updating rating",
        description: "Failed to update quality rating",
        variant: "destructive",
      });
    }
  };

  const scheduleRehearsal = async (artistId: string, date: string, order: number) => {
    try {
      const { error } = await (supabase as any)
        .from('artist_profiles')
        .update({ 
          rehearsal_date: date,
          rehearsal_order: order
        })
        .eq('id', artistId);

      if (error) throw error;

      setArtists(artists.map(artist => 
        artist.id === artistId 
          ? { ...artist, rehearsal_date: date, rehearsal_order: order }
          : artist
      ));

      toast({
        title: "Rehearsal scheduled",
        description: "Rehearsal date and order updated",
      });
    } catch (error) {
      toast({
        title: "Error scheduling rehearsal",
        description: "Failed to schedule rehearsal",
        variant: "destructive",
      });
    }
  };

  const moveArtist = (artistId: string, direction: 'up' | 'down') => {
    const scheduledArtists = artists.filter(a => a.rehearsal_date === selectedDate && a.rehearsal_order !== null);
    const currentIndex = scheduledArtists.findIndex(a => a.id === artistId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= scheduledArtists.length) return;

    // Swap orders
    const currentArtist = scheduledArtists[currentIndex];
    const swapArtist = scheduledArtists[newIndex];
    
    scheduleRehearsal(currentArtist.id, selectedDate, swapArtist.rehearsal_order!);
    scheduleRehearsal(swapArtist.id, selectedDate, currentArtist.rehearsal_order!);
  };

  const moveUnscheduledArtist = (artistId: string, direction: 'up' | 'down') => {
    // Get artists for the selected date first
    const artistsForDate = artists.filter(a => {
      if (!selectedDate) return false;
      return a.performance_date === selectedDate;
    });
    const filteredUnscheduled = artistsForDate.filter(a => !a.rehearsal_date);
    const currentIndex = filteredUnscheduled.findIndex(a => a.id === artistId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= filteredUnscheduled.length) return;

    // Swap in artists array
    const newArtists = [...artists];
    const artistsToSwap = newArtists.filter(a => a.performance_date === selectedDate && !a.rehearsal_date);
    const currentArtist = artistsToSwap[currentIndex];
    const swapArtist = artistsToSwap[newIndex];
    
    const currentArtistIndex = newArtists.findIndex(a => a.id === currentArtist.id);
    const swapArtistIndex = newArtists.findIndex(a => a.id === swapArtist.id);
    
    [newArtists[currentArtistIndex], newArtists[swapArtistIndex]] = [newArtists[swapArtistIndex], newArtists[currentArtistIndex]];
    
    setArtists(newArtists);
  };

  const addToRehearsalOrder = (artistId: string) => {
    const scheduledForDate = artists.filter(a => a.rehearsal_date === selectedDate);
    const nextOrder = scheduledForDate.length > 0 
      ? Math.max(...scheduledForDate.map(a => a.rehearsal_order || 0)) + 1 
      : 1;
    
    scheduleRehearsal(artistId, selectedDate, nextOrder);
  };

  const removeFromRehearsal = async (artistId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('artist_profiles')
        .update({ 
          rehearsal_date: null,
          rehearsal_order: null
        })
        .eq('id', artistId);

      if (error) throw error;

      setArtists(artists.map(artist => 
        artist.id === artistId 
          ? { ...artist, rehearsal_date: null, rehearsal_order: null }
          : artist
      ));

      toast({
        title: "Removed from rehearsal",
        description: "Artist removed from rehearsal schedule",
      });
    } catch (error) {
      toast({
        title: "Error removing from rehearsal",
        description: "Failed to remove artist from rehearsal",
        variant: "destructive",
      });
    }
  };

  const confirmRehearsalCompleted = async (artistId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('artist_profiles')
        .update({ rehearsal_completed: true })
        .eq('id', artistId);

      if (error) throw error;

      setArtists(artists.map(artist => 
        artist.id === artistId 
          ? { ...artist, rehearsal_completed: true }
          : artist
      ));

      toast({
        title: "Rehearsal completed",
        description: "Artist is now ready for performance order",
      });
    } catch (error) {
      toast({
        title: "Error confirming rehearsal",
        description: "Failed to confirm rehearsal completion",
        variant: "destructive",
      });
    }
  };

  const toggleRehearsalStatus = async (artistId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await (supabase as any)
        .from('artist_profiles')
        .update({ rehearsal_completed: newStatus })
        .eq('id', artistId);

      if (error) throw error;

      setArtists(artists.map(artist => 
        artist.id === artistId 
          ? { ...artist, rehearsal_completed: newStatus }
          : artist
      ));

      toast({
        title: newStatus ? "Rehearsal completed" : "Rehearsal marked as uncompleted",
        description: newStatus 
          ? "Artist is now ready for performance order" 
          : "Artist removed from performance order queue",
      });
    } catch (error) {
      toast({
        title: "Error updating rehearsal status",
        description: "Failed to update rehearsal status",
        variant: "destructive",
      });
    }
  };

  const getQualityBadge = (rating: number | null) => {
    if (!rating) return null;
    
    const colors = {
      1: 'text-green-500',
      2: 'text-yellow-500', 
      3: 'text-blue-500'
    };

    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: rating }, (_, i) => (
          <Star key={i} className={`h-4 w-4 fill-current ${colors[rating as keyof typeof colors]}`} />
        ))}
      </div>
    );
  };

  const renderStarRating = (artistId: string, currentRating: number | null) => {
    return (
      <div className="flex items-center gap-1">
        {[3, 2, 1].map((starValue) => {
          const isActive = currentRating === starValue;
          const colors = {
            1: 'text-green-500',
            2: 'text-yellow-500',
            3: 'text-blue-500'
          };
          
          return (
            <button
              key={starValue}
              onClick={() => updateQualityRating(artistId, starValue)}
              className="hover:scale-110 transition-transform"
            >
              <Star 
                className={`h-4 w-4 ${
                  isActive 
                    ? `fill-current ${colors[starValue as keyof typeof colors]}` 
                    : 'text-gray-300 hover:text-gray-400'
                }`} 
              />
            </button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading rehearsal schedule...</p>
        </div>
      </div>
    );
  }

  // Filter artists based on selected rehearsal date
  const artistsForSelectedDate = artists.filter(a => {
    if (!selectedDate) return false;
    // Show artists who have a performance date matching the selected show date
    return a.performance_date === selectedDate;
  });
  
  const unscheduledArtists = artistsForSelectedDate.filter(a => 
    a.rehearsal_date === null || a.rehearsal_date !== selectedDate
  );
  const scheduledArtists = artistsForSelectedDate.filter(a => 
    a.rehearsal_date !== null && a.rehearsal_date === selectedDate
  ).sort((a, b) => (a.rehearsal_order || 0) - (b.rehearsal_order || 0));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/stage-manager/${eventId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Rehearsal Schedule</h1>
              <p className="text-muted-foreground">{event?.name} - {event?.venue}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Date Selection & Scheduled Artists */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Rehearsal Date
                </CardTitle>
                <CardDescription>
                  Select a show date to schedule rehearsals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rehearsal date" />
                  </SelectTrigger>
                  <SelectContent>
                    {event?.show_dates?.map((date) => (
                      <SelectItem key={date} value={date}>
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Rehearsal Order - {new Date(selectedDate).toLocaleDateString()}
                  </CardTitle>
                  <CardDescription>
                    Drag to reorder or use buttons to move artists up/down
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scheduledArtists.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No artists scheduled for this date
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {scheduledArtists.map((artist, index) => (
                        <div 
                          key={artist.id} 
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span 
                              className="text-sm font-mono bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors"
                              onClick={() => navigate(`/artist-profile/${eventId}/${artist.id}?edit=true`)}
                            >
                              #{index + 1}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div 
                              className="font-medium cursor-pointer hover:text-primary transition-colors"
                              onClick={() => navigate(`/artist-profile/${eventId}/${artist.id}?edit=true`)}
                            >
                              {artist.artist_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {artist.style} • {artist.performance_duration} min
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {artist.rehearsal_completed && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                              </Badge>
                            )}
                            {renderStarRating(artist.id, artist.quality_rating)}
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moveArtist(artist.id, 'up')}
                                disabled={index === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moveArtist(artist.id, 'down')}
                                disabled={index === scheduledArtists.length - 1}
                              >
                                ↓
                              </Button>
                              <Button
                                size="sm"
                                variant={artist.rehearsal_completed ? "secondary" : "default"}
                                onClick={() => toggleRehearsalStatus(artist.id, artist.rehearsal_completed)}
                              >
                                {artist.rehearsal_completed ? "Completed" : "Mark Complete"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeFromRehearsal(artist.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Unscheduled Artists */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Artists</CardTitle>
                <CardDescription>
                  Artists not yet scheduled for rehearsal
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unscheduledArtists.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    All artists have been scheduled
                  </p>
                ) : (
                  <div className="space-y-3">
                     {unscheduledArtists.map((artist, index) => (
                       <div key={artist.id} className="flex items-center gap-3 p-3 border rounded-lg">
                         <div className="flex-1">
                           <div className="font-medium">{artist.artist_name}</div>
                           <div className="text-sm text-muted-foreground">
                             {artist.style} • {artist.performance_duration} min
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <div className="flex gap-1">
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => moveUnscheduledArtist(artist.id, 'up')}
                               disabled={index === 0}
                             >
                               ↑
                             </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => moveUnscheduledArtist(artist.id, 'down')}
                               disabled={index === unscheduledArtists.length - 1}
                             >
                               ↓
                             </Button>
                             <Button
                               size="sm"
                               onClick={() => addToRehearsalOrder(artist.id)}
                               disabled={!selectedDate}
                             >
                               Schedule
                             </Button>
                           </div>
                         </div>
                       </div>
                     ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}