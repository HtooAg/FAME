import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Users, AlertTriangle, Video, MessageSquare, RefreshCw, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Artist {
  id: string;
  artist_name: string;
  style: string;
  image_url: string;
  performance_order: number | null;
  props_needed: string;
  performance_notes: string;
}

interface Cue {
  id: string;
  type: string;
  title: string;
  duration: number;
  performance_order: number;
  notes?: string;
}

interface PerformanceItem {
  id: string;
  type: 'artist' | 'cue';
  artist?: Artist;
  cue?: Cue;
  performance_order: number;
  status?: 'completed' | 'currently_on_stage' | 'next_on_stage' | 'next_on_deck' | 'neutral';
}

interface EmergencyBroadcast {
  id: string;
  message: string;
  emergency_code: string;
  is_active: boolean;
  created_at: string;
}

export default function LivePerformanceBoard() {
  const [performanceItems, setPerformanceItems] = useState<PerformanceItem[]>([]);
  const [emergencyBroadcasts, setEmergencyBroadcasts] = useState<EmergencyBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPerformer, setCurrentPerformer] = useState<number>(1);
  const [specialNotes, setSpecialNotes] = useState('');
  const [isEmergencyDialogOpen, setIsEmergencyDialogOpen] = useState(false);
  const [eventId, setEventId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [eventData, setEventData] = useState<any>(null);
  const [newBroadcast, setNewBroadcast] = useState({
    message: '',
    emergency_code: 'green',
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Find the New York Salsa event specifically
    const initializeData = async () => {
      try {
        const { data: events, error } = await supabase
          .from('events')
          .select('*')
          .ilike('name', '%new york salsa%');
        
        if (error) throw error;
        
        if (events && events.length > 0) {
          const event = events[0];
          setEventId(event.id);
          setEventData(event);
          
          // Get available dates from show_dates array or start/end date
          const dates = [];
          if (event.show_dates && event.show_dates.length > 0) {
            dates.push(...event.show_dates.map((date: string) => date.split('T')[0]));
          } else if (event.start_date) {
            dates.push(event.start_date.split('T')[0]);
          }
          
          setAvailableDates(dates);
          if (dates.length > 0) {
            setSelectedDate(dates[0]); // Default to first available date
          }
        } else {
          // If no New York Salsa event found, get any available event
          const { data: fallbackEvents, error: fallbackError } = await supabase
            .from('events')
            .select('*')
            .limit(1);
            
          if (!fallbackError && fallbackEvents && fallbackEvents.length > 0) {
            const event = fallbackEvents[0];
            setEventId(event.id);
            setEventData(event);
            
            const dates = [];
            if (event.show_dates && event.show_dates.length > 0) {
              dates.push(...event.show_dates.map((date: string) => date.split('T')[0]));
            } else if (event.start_date) {
              dates.push(event.start_date.split('T')[0]);
            }
            
            setAvailableDates(dates);
            if (dates.length > 0) {
              setSelectedDate(dates[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error getting event:', error);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    if (eventId && selectedDate) {
      fetchData();
      
      // Set up real-time subscriptions
      const artistsChannel = supabase
        .channel('live-artist-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'artist_profiles' },
          () => {
            fetchData();
          }
        )
        .subscribe();

      const cuesChannel = supabase
        .channel('live-cues-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'performance_cues' },
          () => {
            fetchData();
          }
        )
        .subscribe();

      const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
      
      return () => {
        clearInterval(interval);
        supabase.removeChannel(artistsChannel);
        supabase.removeChannel(cuesChannel);
      };
    }
  }, [eventId, selectedDate]);

  const fetchData = async () => {
    if (!selectedDate) return;
    
    try {
      // Fetch all artists first, then filter client-side for better control (matching PerformanceOrder logic)
      const { data: artistsData, error: artistsError } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, style, performance_order, props_needed, mc_notes, performance_date, performance_duration, performance_status')
        .eq('event_id', eventId);

      if (artistsError) throw artistsError;

      // Fetch cues with the same logic as PerformanceOrder
      const { data: cuesData, error: cuesError } = await supabase
        .from('performance_cues')
        .select('*')
        .eq('event_id', eventId)
        .or(`performance_date.eq."${selectedDate}",performance_date.is.null`)
        .order('performance_order', { ascending: true });

      if (cuesError) throw cuesError;

      // Filter artists for the selected performance date and ensure they have performance_order
      const filteredArtists = (artistsData || []).filter((artist: any) => {
        // Must have a performance_order assigned
        if (artist.performance_order === null || artist.performance_order === undefined) {
          return false;
        }
        
        // Include artists that:
        // 1. Have performance_date matching selectedDate (extract date part)
        // 2. Have performance_date as null (not assigned to any specific date yet)
        if (!artist.performance_date) return true; // Show unassigned artists with order
        
        // Extract date part from performance_date and compare
        const artistDate = new Date(artist.performance_date).toISOString().split('T')[0];
        return artistDate === selectedDate;
      });

      // Remove duplicates by ID (in case there are any)
      const uniqueArtists = filteredArtists.filter((artist: any, index: number, array: any[]) => 
        array.findIndex(a => a.id === artist.id) === index
      );

      // Fetch emergency codes (using emergency_codes table as emergency broadcasts)
      const { data: broadcastsData, error: broadcastsError } = await supabase
        .from('emergency_codes')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (broadcastsError) throw broadcastsError;

      // Transform artists to performance items with status from database
      const artistItems: PerformanceItem[] = uniqueArtists.map(artist => ({
        id: artist.id,
        type: 'artist',
        artist: {
          ...artist,
          image_url: '', // No image URL in current schema
          performance_notes: artist.mc_notes || ''
        },
        performance_order: artist.performance_order,
        status: artist.performance_status as PerformanceItem['status'] || undefined
      }));

      // Transform cues to performance items with status from database  
      const cueItems: PerformanceItem[] = (cuesData || [])
        .filter(cue => cue.performance_order !== null && cue.performance_order !== undefined)
        .map(cue => ({
          id: cue.id,
          type: 'cue',
          cue: {
            id: cue.id,
            type: cue.type,
            title: cue.title,
            duration: cue.duration,
            performance_order: cue.performance_order,
            notes: cue.notes
          },
          performance_order: cue.performance_order,
          status: cue.is_completed ? 'completed' : undefined
        }));

      // Combine and sort all performance items
      const allPerformanceItems = [...artistItems, ...cueItems]
        .sort((a, b) => a.performance_order - b.performance_order);

      // Remove any items with duplicate performance_order (keeping the first one)
      const uniquePerformanceItems = allPerformanceItems.filter((item, index, array) =>
        array.findIndex(i => i.performance_order === item.performance_order) === index
      );

      const transformedBroadcasts = (broadcastsData || []).map(broadcast => ({
        id: broadcast.id,
        message: broadcast.code_description,
        emergency_code: broadcast.code_name.toLowerCase().includes('red') ? 'red' : 
                       broadcast.code_name.toLowerCase().includes('blue') ? 'blue' : 'green',
        is_active: broadcast.is_active,
        created_at: broadcast.created_at
      }));

      setPerformanceItems(uniquePerformanceItems);
      setEmergencyBroadcasts(transformedBroadcasts);
    } catch (error) {
      toast({
        title: "Error fetching data",
        description: "Failed to load performance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEmergencyBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create emergency code entry
      const { error } = await supabase
        .from('emergency_codes')
        .insert({
          event_id: eventId,
          code_name: `${newBroadcast.emergency_code.toUpperCase()} Alert`,
          code_description: newBroadcast.message,
          is_active: true
        });

      if (error) throw error;

      setNewBroadcast({ message: '', emergency_code: 'green' });
      setIsEmergencyDialogOpen(false);
      
      toast({
        title: "Emergency broadcast sent",
        description: `${newBroadcast.emergency_code.toUpperCase()} alert broadcast`,
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Error sending broadcast",
        description: "Failed to send emergency broadcast",
        variant: "destructive",
      });
    }
  };

  const deactivateBroadcast = async (broadcastId: string) => {
    try {
      const { error } = await supabase
        .from('emergency_codes')
        .update({ is_active: false })
        .eq('id', broadcastId);

      if (error) throw error;

      toast({
        title: "Broadcast deactivated",
        description: "Emergency broadcast has been cleared",
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Error deactivating broadcast",
        description: "Failed to clear emergency broadcast",
        variant: "destructive",
      });
    }
  };

  const nextPerformer = () => {
    if (currentPerformer < performanceItems.length) {
      setCurrentPerformer(currentPerformer + 1);
      const currentItem = performanceItems[currentPerformer];
      if (currentItem?.type === 'artist' && currentItem.artist) {
        toast({
          title: "Next performer called",
          description: `Now calling ${currentItem.artist.artist_name}`,
        });
      } else if (currentItem?.type === 'cue' && currentItem.cue) {
        toast({
          title: "Next cue",
          description: `Now playing ${currentItem.cue.title}`,
        });
      }
    }
  };

  const previousPerformer = () => {
    if (currentPerformer > 1) {
      setCurrentPerformer(currentPerformer - 1);
      const currentItem = performanceItems[currentPerformer - 2];
      if (currentItem?.type === 'artist' && currentItem.artist) {
        toast({
          title: "Previous performer called",
          description: `Now calling ${currentItem.artist.artist_name}`,
        });
      } else if (currentItem?.type === 'cue' && currentItem.cue) {
        toast({
          title: "Previous cue",
          description: `Now playing ${currentItem.cue.title}`,
        });
      }
    }
  };

  const getEmergencyColor = (code: string) => {
    switch (code) {
      case 'red': return 'bg-red-500 text-white';
      case 'blue': return 'bg-blue-500 text-white';
      case 'green': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Get items by status instead of position
  const getCurrentItem = () => performanceItems.find(item => item.status === 'currently_on_stage');
  const getNextItem = () => performanceItems.find(item => item.status === 'next_on_stage');
  const getOnDeckItem = () => performanceItems.find(item => item.status === 'next_on_deck');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading performance board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
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
                <h1 className="text-2xl font-bold text-foreground">Live Performance Board</h1>
                <p className="text-muted-foreground">Real-time performance order and emergency management</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isEmergencyDialogOpen} onOpenChange={setIsEmergencyDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Emergency Broadcast
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Emergency Broadcast</DialogTitle>
                    <DialogDescription>
                      Send an emergency message with color code
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createEmergencyBroadcast} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Emergency Code</Label>
                      <Select 
                        value={newBroadcast.emergency_code} 
                        onValueChange={(value) => setNewBroadcast({ ...newBroadcast, emergency_code: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="red">🔴 RED - Emergency</SelectItem>
                          <SelectItem value="blue">🔵 BLUE - Security</SelectItem>
                          <SelectItem value="green">🟢 GREEN - All Clear</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea
                        value={newBroadcast.message}
                        onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                        placeholder="Enter emergency message..."
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">Send Broadcast</Button>
                      <Button type="button" variant="outline" onClick={() => setIsEmergencyDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Emergency Broadcasts */}
      {emergencyBroadcasts.length > 0 && (
        <div className="border-b border-border">
          {emergencyBroadcasts.map((broadcast) => (
            <div key={broadcast.id} className={`p-4 ${getEmergencyColor(broadcast.emergency_code)}`}>
              <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5" />
                  <div>
                    <span className="font-bold">
                      {broadcast.emergency_code.toUpperCase()} ALERT:
                    </span>
                    <span className="ml-2">{broadcast.message}</span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-white/20 hover:bg-white/30"
                  onClick={() => deactivateBroadcast(broadcast.id)}
                >
                  Clear Alert
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Date Selection */}
      {availableDates.length > 1 && (
        <div className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Label htmlFor="date-select" className="text-sm font-medium">
                  Performance Date:
                </Label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger id="date-select" className="w-48">
                    <SelectValue placeholder="Select date" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.map((date) => (
                      <SelectItem key={date} value={date}>
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                {eventData?.name && `${eventData.name} - ${eventData.venue}`}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Performance Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Performance Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Button onClick={previousPerformer} disabled={currentPerformer <= 1}>
                Previous
              </Button>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current Position</p>
                <p className="text-2xl font-bold">{currentPerformer} of {performanceItems.length}</p>
              </div>
              <Button onClick={nextPerformer} disabled={currentPerformer >= performanceItems.length}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Performer - GREEN for on stage */}
          <Card className="bg-green-500 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                NOW PERFORMING
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getCurrentItem() ? (
                <div className="text-center space-y-4">
                  {getCurrentItem()?.type === 'artist' && getCurrentItem()?.artist ? (
                    <>
                      <Avatar className="h-24 w-24 mx-auto border-2 border-white">
                        <AvatarImage src={getCurrentItem()?.artist?.image_url} alt={getCurrentItem()?.artist?.artist_name} />
                        <AvatarFallback className="text-2xl bg-white text-green-500">
                          {getCurrentItem()?.artist?.artist_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-2xl font-bold">{getCurrentItem()?.artist?.artist_name}</h3>
                        <p className="text-white/80">{getCurrentItem()?.artist?.style}</p>
                        <Badge className="mt-2 bg-white text-green-500">
                          Position {currentPerformer}
                        </Badge>
                      </div>
                      {getCurrentItem()?.artist?.performance_notes && (
                        <div className="text-sm bg-white/10 rounded p-3">
                          <p className="font-medium">MC Notes:</p>
                          <p>{getCurrentItem()?.artist?.performance_notes}</p>
                        </div>
                      )}
                    </>
                  ) : getCurrentItem()?.type === 'cue' && getCurrentItem()?.cue ? (
                    <>
                      <div className="h-24 w-24 mx-auto border-2 border-white rounded-full flex items-center justify-center bg-white text-green-500">
                        <Video className="h-12 w-12" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{getCurrentItem()?.cue?.title}</h3>
                        <p className="text-white/80">{getCurrentItem()?.cue?.duration} minutes</p>
                        <Badge className="mt-2 bg-white text-green-500">
                          Position {currentPerformer}
                        </Badge>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p>Performance Complete!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Up - YELLOW for next on stage */}
          <Card className="bg-yellow-400 text-black">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                NEXT UP
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getNextItem() ? (
                <div className="text-center space-y-4">
                  {getNextItem()?.type === 'artist' && getNextItem()?.artist ? (
                    <>
                      <Avatar className="h-20 w-20 mx-auto border-2 border-black">
                        <AvatarImage src={getNextItem()?.artist?.image_url} alt={getNextItem()?.artist?.artist_name} />
                        <AvatarFallback className="text-lg bg-black text-yellow-400">
                          {getNextItem()?.artist?.artist_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold">{getNextItem()?.artist?.artist_name}</h3>
                        <p className="text-black/80">{getNextItem()?.artist?.style}</p>
                        <Badge className="mt-2 bg-black text-yellow-400">
                          Position {currentPerformer + 1}
                        </Badge>
                      </div>
                      {getNextItem()?.artist?.props_needed && (
                        <div className="text-sm bg-black/10 rounded p-3">
                          <p className="font-medium">Props Needed:</p>
                          <p>{getNextItem()?.artist?.props_needed}</p>
                        </div>
                      )}
                    </>
                  ) : getNextItem()?.type === 'cue' && getNextItem()?.cue ? (
                    <>
                      <div className="h-20 w-20 mx-auto border-2 border-black rounded-full flex items-center justify-center bg-black text-yellow-400">
                        <Video className="h-10 w-10" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{getNextItem()?.cue?.title}</h3>
                        <p className="text-black/80">{getNextItem()?.cue?.duration} minutes</p>
                        <Badge className="mt-2 bg-black text-yellow-400">
                          Position {currentPerformer + 1}
                        </Badge>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="text-center py-8 text-black/70">
                  <p>No more items</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* On Deck - BLUE for next on deck */}
          <Card className="bg-blue-500 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                ON DECK
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getOnDeckItem() ? (
                <div className="text-center space-y-4">
                  {getOnDeckItem()?.type === 'artist' && getOnDeckItem()?.artist ? (
                    <>
                      <Avatar className="h-16 w-16 mx-auto border-2 border-white">
                        <AvatarImage src={getOnDeckItem()?.artist?.image_url} alt={getOnDeckItem()?.artist?.artist_name} />
                        <AvatarFallback className="bg-white text-blue-500">
                          {getOnDeckItem()?.artist?.artist_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-bold">{getOnDeckItem()?.artist?.artist_name}</h3>
                        <p className="text-white/80">{getOnDeckItem()?.artist?.style}</p>
                        <Badge className="mt-2 bg-white text-blue-500">
                          Position {currentPerformer + 2}
                        </Badge>
                      </div>
                    </>
                  ) : getOnDeckItem()?.type === 'cue' && getOnDeckItem()?.cue ? (
                    <>
                      <div className="h-16 w-16 mx-auto border-2 border-white rounded-full flex items-center justify-center bg-white text-blue-500">
                        <Video className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{getOnDeckItem()?.cue?.title}</h3>
                        <p className="text-white/80">{getOnDeckItem()?.cue?.duration} minutes</p>
                        <Badge className="mt-2 bg-white text-blue-500">
                          Position {currentPerformer + 2}
                        </Badge>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="text-center py-8 text-white/70">
                  <p>No one on deck</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Full Performance Order */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Complete Performance Order</CardTitle>
            <CardDescription>Full lineup for tonight's show</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {performanceItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    item.status === 'currently_on_stage' 
                      ? 'bg-green-500 text-white border-green-500' 
                      : item.status === 'completed'
                      ? 'bg-red-500 text-white border-red-500'
                      : item.status === 'next_on_stage'
                      ? 'bg-yellow-400 text-black border-yellow-400'
                      : item.status === 'next_on_deck'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-card'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    item.status === 'currently_on_stage' 
                      ? 'bg-white text-green-500'
                      : item.status === 'completed'
                      ? 'bg-white text-red-500'
                      : item.status === 'next_on_stage'
                      ? 'bg-black text-yellow-400'
                      : item.status === 'next_on_deck'
                      ? 'bg-white text-blue-500'
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {item.performance_order}
                  </div>
                  {item.type === 'artist' && item.artist ? (
                    <>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={item.artist.image_url} alt={item.artist.artist_name} />
                        <AvatarFallback className="text-xs">
                          {item.artist.artist_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="font-medium">{item.artist.artist_name}</span>
                        <span className="text-sm ml-2 opacity-80">({item.artist.style})</span>
                      </div>
                    </>
                  ) : item.type === 'cue' && item.cue ? (
                    <>
                      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                        <Video className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{item.cue.title}</span>
                        <span className="text-sm ml-2 opacity-80">({item.cue.duration}min)</span>
                      </div>
                    </>
                  ) : null}
                  {item.status === 'currently_on_stage' && (
                    <Badge className="bg-white text-green-500">
                      PERFORMING NOW
                    </Badge>
                  )}
                  {item.status === 'next_on_stage' && (
                    <Badge className="bg-black text-yellow-400">
                      NEXT UP
                    </Badge>
                  )}
                  {item.status === 'next_on_deck' && (
                    <Badge className="bg-white text-blue-500">
                      ON DECK
                    </Badge>
                  )}
                  {item.status === 'completed' && (
                    <Badge className="bg-white text-red-500">
                      COMPLETED
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}