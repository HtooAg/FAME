import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, Clock, User, ArrowLeft, Users, Calendar, Star, CheckCircle, Edit3 } from 'lucide-react';

interface Artist {
  id: string;
  artist_name: string;
  real_name: string | null;
  style: string;
  biography: string | null;
  performance_duration: number;
  performance_order: number | null;
  rehearsal_order: number | null;
  performance_date: string | null;
  rehearsal_date: string | null;
  rehearsal_completed: boolean;
  quality_rating: number | null;
  mc_notes: string | null;
  phone: string | null;
  email: string | null;
}

interface ArtistImage {
  id: string;
  artist_id: string;
  image_url: string;
  is_primary: boolean;
}

interface Event {
  id: string;
  name: string;
  venue: string;
  show_dates: string[];
}

interface PerformanceCue {
  id: string;
  type: string;
  title: string;
  duration: number;
  performance_order: number;
  notes: string | null;
  performance_date: string | null;
  is_completed: boolean;
  mc_notes: string | null;
}

export default function MCDashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [rehearsalArtists, setRehearsalArtists] = useState<Artist[]>([]);
  const [performanceItems, setPerformanceItems] = useState<any[]>([]); // Combined artists and cues
  const [artistImages, setArtistImages] = useState<ArtistImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (eventId) {
      fetchData();
      
      // Set up real-time subscriptions
      const artistsChannel = supabase
        .channel('mc-artist-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'artist_profiles' },
          () => {
            fetchData();
          }
        )
        .subscribe();

      const cuesChannel = supabase
        .channel('mc-cues-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'performance_cues' },
          () => {
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(artistsChannel);
        supabase.removeChannel(cuesChannel);
      };
    }
  }, [eventId]);

  const fetchData = async () => {
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, venue, show_dates')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Set first show date as default if available
      if (eventData.show_dates && eventData.show_dates.length > 0) {
        setSelectedDate(eventData.show_dates[0]);
      }

      // Fetch all artists for this event
      const { data: artistsData, error: artistsError } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, real_name, style, biography, performance_duration, performance_order, rehearsal_order, performance_date, rehearsal_date, rehearsal_completed, quality_rating, mc_notes, phone, email')
        .eq('event_id', eventId);

      if (artistsError) throw artistsError;

      // Fetch performance cues
      const { data: cuesData, error: cuesError } = await supabase
        .from('performance_cues')
        .select('id, type, title, duration, performance_order, notes, performance_date, is_completed, mc_notes')
        .eq('event_id', eventId)
        .order('performance_order', { ascending: true });

      if (cuesError) throw cuesError;

      const artists = artistsData || [];
      const cues = cuesData || [];
      
      // Separate rehearsal and performance artists
      const rehearsal = artists
        .filter(a => a.rehearsal_order !== null)
        .sort((a, b) => (a.rehearsal_order || 0) - (b.rehearsal_order || 0));
      
      // Combine artists and cues for the exact same performance order as PerformanceOrder page
      const assignedArtists = artists
        .filter((a: Artist) => a.performance_order !== null)
        .map(artist => ({
          id: artist.id,
          type: 'artist' as const,
          artist,
          performance_order: artist.performance_order || 0
        }));

      // Convert cues to show order items
      const cueItems = cues.map(cue => ({
        id: cue.id,
        type: 'cue' as const,
        cue: {
          id: cue.id,
          type: cue.type,
          title: cue.title,
          duration: cue.duration,
          performance_order: cue.performance_order,
          notes: cue.notes,
          performance_date: cue.performance_date,
          is_completed: cue.is_completed,
          mc_notes: cue.mc_notes
        },
        performance_order: cue.performance_order
      }));

      // Combine and sort all show order items (same logic as PerformanceOrder)
      const allPerformanceItems = [...assignedArtists, ...cueItems]
        .sort((a, b) => a.performance_order - b.performance_order);

      setRehearsalArtists(rehearsal);
      setPerformanceItems(allPerformanceItems);

      // Fetch artist images
      const artistIds = artists.map(artist => artist.id);
      if (artistIds.length > 0) {
        const { data: imagesData, error: imagesError } = await supabase
          .from('artist_images')
          .select('*')
          .in('artist_id', artistIds);

        if (imagesError) throw imagesError;
        setArtistImages(imagesData || []);
      }
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Failed to load MC dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMCNotes = async (artistId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('artist_profiles')
        .update({ mc_notes: notes })
        .eq('id', artistId);

      if (error) throw error;

      // Update local state for both rehearsal and performance items
      setRehearsalArtists(prev => prev.map(artist => 
        artist.id === artistId ? { ...artist, mc_notes: notes } : artist
      ));
      setPerformanceItems(prev => prev.map(item => 
        item.type === 'artist' && item.artist?.id === artistId 
          ? { ...item, artist: { ...item.artist, mc_notes: notes } } 
          : item
      ));

      toast({
        title: "MC Notes updated",
        description: "Notes have been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error updating notes",
        description: "Failed to save MC notes",
        variant: "destructive",
      });
    }
  };

  const updateCueMCNotes = async (cueId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('performance_cues')
        .update({ mc_notes: notes })
        .eq('id', cueId);

      if (error) throw error;

      // Update local state for performance items
      setPerformanceItems(prev => prev.map(item => 
        item.type === 'cue' && item.cue?.id === cueId 
          ? { ...item, cue: { ...item.cue, mc_notes: notes } } 
          : item
      ));

      toast({
        title: "MC Notes updated",
        description: "Cue notes have been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error updating notes",
        description: "Failed to save cue MC notes",
        variant: "destructive",
      });
    }
  };

  const generateArtistIntroduction = async (artistId: string, artistName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-artist-introduction', {
        body: { 
          artistId,
          eventId 
        }
      });

      if (error) throw error;

      toast({
        title: "Introduction generated",
        description: `AI-generated introduction created for ${artistName}`,
      });

      // Refresh data to show the new introduction
      fetchData();
      
      return data.introduction;
    } catch (error) {
      console.error('Error generating introduction:', error);
      toast({
        title: "Error generating introduction",
        description: "Failed to generate AI introduction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateAllIntroductions = async () => {
    const artistsWithoutIntros = performanceItems
      .filter(item => item.type === 'artist' && !item.artist.mc_notes)
      .map(item => item.artist);

    if (artistsWithoutIntros.length === 0) {
      toast({
        title: "All set!",
        description: "All artists already have introductions",
      });
      return;
    }

    toast({
      title: "Generating introductions...",
      description: `Creating AI introductions for ${artistsWithoutIntros.length} artists`,
    });

    for (const artist of artistsWithoutIntros) {
      await generateArtistIntroduction(artist.id, artist.artist_name);
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    toast({
      title: "All introductions generated!",
      description: "AI has created personalized introductions for all artists",
    });
  };

  const getArtistImage = (artistId: string) => {
    const primaryImage = artistImages.find(img => img.artist_id === artistId && img.is_primary);
    return primaryImage?.image_url || artistImages.find(img => img.artist_id === artistId)?.image_url;
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
          <Star key={i} className={`h-3 w-3 fill-current ${colors[rating as keyof typeof colors]}`} />
        ))}
      </div>
    );
  };

  // Status determination
  const getItemStatus = (item: any, index: number) => {
    if (item.type === 'cue' && item.cue.is_completed) {
      return 'completed';
    }
    if (index === 0) return 'currently_on_stage';
    if (index === 1) return 'next_on_stage';
    if (index === 2) return 'next_on_deck';
    return 'waiting';
  };

  const getRowColorClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      case 'currently_on_stage':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      case 'next_on_stage':
        return 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800';
      case 'next_on_deck':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-background';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-red-500 text-white">Completed</Badge>;
      case 'currently_on_stage':
        return <Badge className="bg-green-500 text-white">Currently On Stage</Badge>;
      case 'next_on_stage':
        return <Badge className="bg-yellow-500 text-white">Next On Stage</Badge>;
      case 'next_on_deck':
        return <Badge className="bg-blue-500 text-white">Next On Deck</Badge>;
      default:
        return <Badge variant="outline">Waiting</Badge>;
    }
  };

  // MC Notes Cell Component
  const MCNotesCell = ({ artist, onUpdate }: { artist: Artist, onUpdate: (id: string, notes: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [notes, setNotes] = useState(artist.mc_notes || '');

    const handleSave = () => {
      onUpdate(artist.id, notes);
      setIsEditing(false);
    };

    const handleCancel = () => {
      setNotes(artist.mc_notes || '');
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <div className="space-y-2 min-w-[200px]">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add MC introduction notes..."
            className="min-h-[60px]"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-[200px]">
        {notes ? (
          <div className="space-y-1">
            <p className="text-sm truncate" title={notes}>
              {notes}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-6 px-2 text-xs"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="h-8 text-xs"
          >
            <Edit3 className="h-3 w-3 mr-1" />
            Add Notes
          </Button>
        )}
      </div>
    );
  };

  // Cue MC Notes Cell Component
  const CueMCNotesCell = ({ cue, onUpdate }: { cue: PerformanceCue, onUpdate: (id: string, notes: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [notes, setNotes] = useState(cue.mc_notes || '');

    const handleSave = () => {
      onUpdate(cue.id, notes);
      setIsEditing(false);
    };

    const handleCancel = () => {
      setNotes(cue.mc_notes || '');
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <div className="space-y-2 min-w-[200px]">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add MC cue notes..."
            className="min-h-[60px]"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-[200px]">
        {notes ? (
          <div className="space-y-1">
            <p className="text-sm truncate" title={notes}>
              {notes}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-6 px-2 text-xs"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="h-8 text-xs"
          >
            <Edit3 className="h-3 w-3 mr-1" />
            Add Notes
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading MC dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/stage-manager/${eventId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">MC Dashboard</h1>
              <p className="text-muted-foreground">
                {event?.name} at {event?.venue}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              <span className="text-sm text-muted-foreground">Artist Introductions</span>
            </div>
          </div>
        </div>
      </header>

      {/* Current Status Section */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Currently On Stage */}
            <Card className="border-green-500 bg-green-50 dark:bg-green-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-700 dark:text-green-300 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  Currently On Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceItems.length > 0 && performanceItems[0]?.type === 'artist' ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getArtistImage(performanceItems[0].artist.id)} alt={performanceItems[0].artist.artist_name} />
                      <AvatarFallback>
                        {performanceItems[0].artist.artist_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{performanceItems[0].artist.artist_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{performanceItems[0].artist.style}</Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {performanceItems[0].artist.performance_duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                ) : performanceItems.length > 0 && performanceItems[0]?.type === 'cue' ? (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <Mic className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{performanceItems[0].cue.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{performanceItems[0].cue.type}</Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {performanceItems[0].cue.duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No performance currently on stage</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Up */}
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  Next Up
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceItems.length > 1 && performanceItems[1]?.type === 'artist' ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getArtistImage(performanceItems[1].artist.id)} alt={performanceItems[1].artist.artist_name} />
                      <AvatarFallback>
                        {performanceItems[1].artist.artist_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{performanceItems[1].artist.artist_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{performanceItems[1].artist.style}</Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {performanceItems[1].artist.performance_duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                ) : performanceItems.length > 1 && performanceItems[1]?.type === 'cue' ? (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <Mic className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{performanceItems[1].cue.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{performanceItems[1].cue.type}</Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {performanceItems[1].cue.duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                ) : performanceItems.length === 1 ? (
                  <div className="text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Last item in performance order</p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No next performance scheduled</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next on Deck */}
            <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Next on Deck
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceItems.length > 2 && performanceItems[2]?.type === 'artist' ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getArtistImage(performanceItems[2].artist.id)} alt={performanceItems[2].artist.artist_name} />
                      <AvatarFallback>
                        {performanceItems[2].artist.artist_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{performanceItems[2].artist.artist_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{performanceItems[2].artist.style}</Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {performanceItems[2].artist.performance_duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                ) : performanceItems.length > 2 && performanceItems[2]?.type === 'cue' ? (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <Mic className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{performanceItems[2].cue.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{performanceItems[2].cue.type}</Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {performanceItems[2].cue.duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                ) : performanceItems.length <= 2 ? (
                  <div className="text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No upcoming performances</p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No performance on deck</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Day Selection */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Performance Schedule</h2>
            <div className="flex items-center gap-4">
              <Button
                onClick={generateAllIntroductions}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="lg"
              >
                <Star className="h-4 w-4 mr-2" />
                Generate AI Introductions
              </Button>
              <div className="flex items-center gap-2">
                <Label htmlFor="date-select">Show Date:</Label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select a date" />
                  </SelectTrigger>
                  <SelectContent>
                    {event?.show_dates?.map((date) => (
                      <SelectItem key={date} value={date}>
                        {new Date(date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

          {/* Performance Order List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                MC Introduction Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Filter performance items by selected date
                const filteredItems = performanceItems.filter(item => {
                  if (!selectedDate) return true;
                  
                  if (item.type === 'artist') {
                    const performanceDate = item.artist.performance_date;
                    if (!performanceDate) return false;
                    // Compare just the date part (YYYY-MM-DD)
                    const artistDate = new Date(performanceDate).toISOString().split('T')[0];
                    const filterDate = new Date(selectedDate).toISOString().split('T')[0];
                    return artistDate === filterDate;
                  }
                  
                  if (item.type === 'cue') {
                    const cueDate = item.cue.performance_date;
                    if (!cueDate) return false;
                    // Handle date string format from database
                    const cueFormatted = cueDate.includes('T') ? cueDate.split('T')[0] : cueDate;
                    const filterDate = new Date(selectedDate).toISOString().split('T')[0];
                    return cueFormatted === filterDate;
                  }
                  
                  return true;
                });

                if (filteredItems.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <Mic className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No performances scheduled</h3>
                      <p className="text-muted-foreground">
                        No performances found for the selected date
                      </p>
                    </div>
                  );
                }

                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Performer/Cue</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Biography</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-32">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item, index) => {
                        const status = getItemStatus(item, index);
                        const rowClasses = getRowColorClasses(status);
                        
                        return (
                          <TableRow key={item.id} className={rowClasses}>
                            <TableCell className="font-medium">
                              {item.performance_order}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {item.type === 'artist' ? (
                                  <>
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage 
                                        src={getArtistImage(item.artist.id)} 
                                        alt={item.artist.artist_name} 
                                      />
                                      <AvatarFallback className="text-xs">
                                        {item.artist.artist_name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium">{item.artist.artist_name}</div>
                                      {item.artist.real_name && (
                                        <div className="text-sm text-muted-foreground">
                                          {item.artist.real_name}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                                      <Mic className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="font-medium">{item.cue.title}</div>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.type === 'artist' ? item.artist.style : item.cue.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.type === 'artist' 
                                  ? item.artist.performance_duration 
                                  : item.cue.duration} min
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.type === 'artist' && item.artist.biography ? (
                                <div className="max-w-[200px]">
                                  <p className="text-sm text-muted-foreground truncate" title={item.artist.biography}>
                                    {item.artist.biography}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(status)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={selectedItem?.id === item.id ? "default" : "outline"}
                                onClick={() => setSelectedItem(item)}
                                className="w-full"
                              >
                                {selectedItem?.id === item.id ? "Selected" : "Select"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                );
              })()}
            </CardContent>
          </Card>

          {/* Large MC Notes Section */}
          {selectedItem && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Mic className="h-6 w-6" />
                  MC Introduction Notes
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {selectedItem.type === 'artist' ? selectedItem.artist.artist_name : selectedItem.cue.title}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedItem.type === 'artist' && (
                  <>
                    {/* Artist Biography for Reference */}
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <h3 className="text-xl font-semibold mb-3 text-primary">Artist Biography</h3>
                      <p className="text-lg leading-relaxed text-foreground">
                        {selectedItem.artist.biography || 'No biography provided yet.'}
                      </p>
                    </div>

                    {/* Artist Notes */}
                    <div className="bg-muted/50 p-6 rounded-lg">
                      <h3 className="text-xl font-semibold mb-3 text-primary">Artist Notes</h3>
                      <p className="text-lg leading-relaxed text-foreground">
                        {selectedItem.artist.notes || 'No additional notes provided.'}
                      </p>
                    </div>

                    {/* Default Introduction Template */}
                    <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
                      <h3 className="text-xl font-semibold mb-3 text-primary">Default Introduction</h3>
                      <p className="text-xl leading-relaxed text-foreground font-medium">
                        "Ladies and gentlemen, please welcome{' '}
                        {selectedItem.artist.real_name ? (
                          <span className="text-primary">{selectedItem.artist.real_name}</span>
                        ) : (
                          <span className="text-primary">{selectedItem.artist.artist_name}</span>
                        )}
                        {selectedItem.artist.real_name && selectedItem.artist.real_name !== selectedItem.artist.artist_name && (
                          <span>, performing as <span className="text-primary">{selectedItem.artist.artist_name}</span></span>
                        )}
                        , bringing you {selectedItem.artist.performance_duration} minutes of amazing{' '}
                        <span className="text-primary">{selectedItem.artist.style}</span>!"
                      </p>
                    </div>
                  </>
                )}

                {/* MC Notes Section */}
                <div className="bg-background border-2 border-dashed border-primary/30 p-8 rounded-lg min-h-[300px]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-semibold text-primary">
                      {selectedItem.type === 'artist' ? 'Custom MC Introduction Notes' : 'MC Cue Notes'}
                    </h3>
                    <div className="flex gap-2">
                      {selectedItem.type === 'artist' && (
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => generateArtistIntroduction(selectedItem.artist.id, selectedItem.artist.artist_name)}
                          className="text-lg px-6 py-3 border-purple-200 text-purple-700 hover:bg-purple-50"
                        >
                          <Star className="h-5 w-5 mr-2" />
                          Generate AI Introduction
                        </Button>
                      )}
                      <Button
                        size="lg"
                        onClick={() => {
                          if (selectedItem.type === 'artist') {
                            const currentNotes = selectedItem.artist.mc_notes || '';
                            const newNotes = prompt('Edit MC Notes:', currentNotes);
                            if (newNotes !== null) {
                              updateMCNotes(selectedItem.artist.id, newNotes);
                              setSelectedItem({
                                ...selectedItem,
                                artist: { ...selectedItem.artist, mc_notes: newNotes }
                              });
                            }
                          } else {
                            const currentNotes = selectedItem.cue.mc_notes || '';
                            const newNotes = prompt('Edit MC Cue Notes:', currentNotes);
                            if (newNotes !== null) {
                              updateCueMCNotes(selectedItem.cue.id, newNotes);
                              setSelectedItem({
                                ...selectedItem,
                                cue: { ...selectedItem.cue, mc_notes: newNotes }
                              });
                            }
                          }
                        }}
                        className="text-lg px-6 py-3"
                      >
                        <Edit3 className="h-5 w-5 mr-2" />
                        Edit Notes
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/30 p-6 rounded-lg min-h-[200px]">
                    {((selectedItem.type === 'artist' && selectedItem.artist.mc_notes) || 
                      (selectedItem.type === 'cue' && selectedItem.cue.mc_notes)) ? (
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-muted-foreground">Your Custom Notes:</h4>
                        <p className="text-2xl leading-relaxed text-foreground font-medium whitespace-pre-wrap">
                          {selectedItem.type === 'artist' ? selectedItem.artist.mc_notes : selectedItem.cue.mc_notes}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Mic className="h-16 w-16 text-muted-foreground/50 mb-4" />
                        <h4 className="text-xl font-medium text-muted-foreground mb-2">
                          No custom notes yet
                        </h4>
                        <p className="text-lg text-muted-foreground">
                          Click "Edit Notes" to add your custom introduction or cue notes
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedItem && (
            <Card className="border-dashed border-2 border-muted-foreground/30">
              <CardContent className="text-center py-16">
                <Mic className="h-20 w-20 mx-auto mb-6 text-muted-foreground/30" />
                <h3 className="text-2xl font-medium mb-3 text-muted-foreground">
                  Select a Performance Item
                </h3>
                <p className="text-lg text-muted-foreground">
                  Choose an artist or cue from the list above to view and edit MC notes
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}