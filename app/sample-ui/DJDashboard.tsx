import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Music, Play, Pause, Clock, ArrowLeft, Upload, Edit3, Users, Calendar, Star, CheckCircle, Headphones, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Artist {
  id: string;
  artist_name: string;
  style: string;
  performance_duration: number;
  performance_order: number | null;
  rehearsal_order: number | null;
  performance_date: string | null;
  rehearsal_date: string | null;
  rehearsal_completed: boolean;
  quality_rating: number | null;
  performance_status?: string | null;
}

interface MusicTrack {
  id: string;
  artist_id: string;
  song_title: string;
  duration: number;
  file_url: string | null;
  is_main_track: boolean;
  tempo: string | null;
  notes: string | null;
  dj_notes?: string | null;
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
  notes?: string;
  is_completed?: boolean;
  completed_at?: string;
  performance_date?: string;
}

export default function DJDashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [rehearsalArtists, setRehearsalArtists] = useState<Artist[]>([]);
  const [performanceItems, setPerformanceItems] = useState<any[]>([]); // Combined artists and cues
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editingMusic, setEditingMusic] = useState<{ artistId: string; track: MusicTrack } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (eventId) {
      fetchData();
      
      // Set up real-time subscriptions
      const artistsChannel = supabase
        .channel('dj-artist-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'artist_profiles' },
          () => {
            fetchData();
          }
        )
        .subscribe();

      const cuesChannel = supabase
        .channel('dj-cues-changes')
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
        .select('id, artist_name, style, performance_duration, performance_order, rehearsal_order, performance_date, rehearsal_date, rehearsal_completed, quality_rating, performance_status')
        .eq('event_id', eventId);

      if (artistsError) throw artistsError;

      // Fetch performance cues with completion status
      const { data: cuesData, error: cuesError } = await supabase
        .from('performance_cues')
        .select('id, type, title, duration, performance_order, notes, is_completed, completed_at, performance_date')
        .eq('event_id', eventId)
        .order('performance_order', { ascending: true });

      if (cuesError) throw cuesError;

      const artists = artistsData || [];
      const cues = cuesData || [];
      
      // Separate rehearsal artists
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
          is_completed: cue.is_completed,
          completed_at: cue.completed_at,
          performance_date: cue.performance_date
        },
        performance_order: cue.performance_order
      }));

      // Combine and sort all show order items (same logic as PerformanceOrder)
      const allPerformanceItems = [...assignedArtists, ...cueItems]
        .sort((a, b) => a.performance_order - b.performance_order);

      setRehearsalArtists(rehearsal);
      setPerformanceItems(allPerformanceItems);

      // Fetch music tracks for all artists
      const artistIds = artists.map(artist => artist.id);
      if (artistIds.length > 0) {
        const { data: tracksData, error: tracksError } = await supabase
          .from('artist_music')
          .select('*')
          .in('artist_id', artistIds);

        if (tracksError) throw tracksError;
        setMusicTracks(tracksData || []);
      }
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Failed to load DJ dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const playTrack = (trackId: string) => {
    setCurrentTrack(trackId);
    setIsPlaying(true);
    toast({
      title: "Playing track",
      description: "Audio playback would start here",
    });
  };

  const pauseTrack = () => {
    setIsPlaying(false);
    toast({
      title: "Track paused",
      description: "Audio playback paused",
    });
  };

  const getArtistTracks = (artistId: string) => {
    return musicTracks.filter(track => track.artist_id === artistId);
  };

  const updateMusicTrack = async (trackId: string, updates: Partial<MusicTrack>) => {
    try {
      const { error } = await supabase
        .from('artist_music')
        .update(updates)
        .eq('id', trackId);

      if (error) throw error;

      setMusicTracks(prev => prev.map(track => 
        track.id === trackId ? { ...track, ...updates } : track
      ));

      toast({
        title: "Track updated",
        description: "Music track has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error updating track",
        description: "Failed to update music track",
        variant: "destructive",
      });
    }
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(Math.round(audio.duration));
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio file'));
      });
      
      audio.src = url;
    });
  };

  const uploadNewTrack = async (artistId: string, file: File, title: string) => {
    try {
      // Get artist name for the filename
      const allArtists = [...rehearsalArtists, ...performanceItems.filter(item => item.type === 'artist').map(item => item.artist)];
      const artist = allArtists.find(a => a.id === artistId);
      const artistName = artist?.artist_name || 'unknown-artist';
      
      // Calculate audio duration
      const duration = await getAudioDuration(file);
      
      // Create filename with artist name
      const fileExtension = file.name.split('.').pop();
      const sanitizedArtistName = artistName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const fileName = `${sanitizedArtistName}-${sanitizedTitle}-${Date.now()}.${fileExtension}`;
      
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('music-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('music-files')
        .getPublicUrl(fileName);

      // Create database entry with actual file URL and calculated duration
      const { data, error } = await supabase
        .from('artist_music')
        .insert({
          artist_id: artistId,
          song_title: title,
          duration: duration,
          is_main_track: false,
          file_url: publicUrl
        })
        .select()
        .single();

      if (error) throw error;

      setMusicTracks(prev => [...prev, data]);

      toast({
        title: "Track uploaded",
        description: `Track uploaded successfully (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
      });
    } catch (error) {
      toast({
        title: "Error uploading track",
        description: "Failed to upload music track",
        variant: "destructive",
      });
    }
  };

  const getCurrentItem = () => {
    return performanceItems.length > 0 ? performanceItems[0] : null;
  };

  const getNextItem = () => {
    return performanceItems.length > 1 ? performanceItems[1] : null;
  };

  const getOnDeckItem = () => {
    return performanceItems.length > 2 ? performanceItems[2] : null;
  };

  const updateDJNotes = async (artistId: string, notes: string) => {
    try {
      const track = musicTracks.find(t => t.artist_id === artistId);
      if (track) {
        await updateMusicTrack(track.id, { notes });
      }
    } catch (error) {
      toast({
        title: "Error updating DJ notes",
        description: "Failed to update DJ notes",
        variant: "destructive",
      });
    }
  };

  const getRowColorClasses = (status?: string | null) => {
    switch (status) {
      case 'completed':
        return 'bg-destructive/10 border-destructive/30 text-destructive-foreground';
      case 'currently_on_stage':
        return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400';
      case 'next_on_stage':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-400';
      case 'next_on_deck':
        return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400';
      default:
        return 'bg-card text-card-foreground border-border';
    }
  };

  const getQualityBadge = (rating: number | null) => {
    if (!rating) return null;
    
    const colors = {
      1: 'text-accent',
      2: 'text-primary', 
      3: 'text-fame-purple'
    };

    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: rating }, (_, i) => (
          <Star key={i} className={`h-3 w-3 fill-current ${colors[rating as keyof typeof colors]}`} />
        ))}
      </div>
    );
  };

  const MusicEditDialog = ({ artistId, tracks }: { artistId: string, tracks: MusicTrack[] }) => {
    const [newTrackTitle, setNewTrackTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Edit3 className="h-4 w-4 mr-1" />
            Edit Music
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Music Tracks</DialogTitle>
            <DialogDescription>
              Upload new tracks or edit existing ones
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Upload new track */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Upload New Track</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="track-title">Artist name</Label>
                  <Input
                    id="track-title"
                    value={newTrackTitle}
                    onChange={(e) => setNewTrackTitle(e.target.value)}
                    placeholder="Enter track title"
                  />
                </div>
                <div>
                  <Label htmlFor="track-file">Audio File</Label>
                  <Input
                    id="track-file"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button
                  onClick={() => {
                    if (selectedFile && newTrackTitle) {
                      uploadNewTrack(artistId, selectedFile, newTrackTitle);
                      setNewTrackTitle('');
                      setSelectedFile(null);
                    }
                  }}
                  disabled={!selectedFile || !newTrackTitle}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload Track
                </Button>
              </div>
            </div>

            {/* Existing tracks */}
            <div className="space-y-3">
              <h4 className="font-medium">Existing Tracks</h4>
              {tracks.map((track) => (
                <div key={track.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">{track.song_title}</h5>
                    <Badge variant={track.is_main_track ? "default" : "outline"}>
                      {track.is_main_track ? "Main" : "Additional"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Tempo</Label>
                      <Input
                        value={track.tempo || ''}
                        onChange={(e) => updateMusicTrack(track.id, { tempo: e.target.value })}
                        placeholder="e.g., 120 BPM"
                      />
                    </div>
                    <div>
                      <Label>Duration (seconds)</Label>
                      <Input
                        type="number"
                        value={track.duration}
                        onChange={(e) => updateMusicTrack(track.id, { duration: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                    <div className="mt-2">
                      <Label>Notes</Label>
                      <Input
                        value={track.notes || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateMusicTrack(track.id, { notes: e.target.value });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => e.stopPropagation()}
                        placeholder="DJ notes or cues"
                      />
                    </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const ArtistCard = ({ artist, index, showOrder = false }: { artist: Artist, index: number, showOrder?: boolean }) => {
    const tracks = getArtistTracks(artist.id);
    const mainTrack = tracks.find(track => track.is_main_track) || tracks[0];
    const [djNotes, setDjNotes] = useState(mainTrack?.notes || '');

    return (
      <Card key={artist.id} className={
        showOrder && index === 0 ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
        showOrder && index === 1 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : 
        showOrder && index === 2 ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''
      }>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                showOrder && index === 0 ? 'bg-green-500 text-white' : 
                showOrder && index === 1 ? 'bg-yellow-500 text-white' : 
                showOrder && index === 2 ? 'bg-blue-500 text-white' :
                'bg-primary text-primary-foreground'
              }`}>
                {index + 1}
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {artist.artist_name}
                  {showOrder && index === 0 && <Badge className="bg-green-500">ON STAGE</Badge>}
                  {showOrder && index === 1 && <Badge className="bg-yellow-500">NEXT UP</Badge>}
                  {showOrder && index === 2 && <Badge className="bg-blue-500">ON DECK</Badge>}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{artist.style}</Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {artist.performance_duration} min
                  </span>
                  {artist.rehearsal_completed && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Rehearsed
                    </Badge>
                  )}
                  {getQualityBadge(artist.quality_rating)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MusicEditDialog artistId={artist.id} tracks={tracks} />
              {artist.performance_date && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Performance Date</p>
                  <p className="font-medium text-sm">
                    {new Date(artist.performance_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tracks.length > 0 ? (
            <div className="space-y-3">
              {mainTrack && (
                <div className="p-3 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <h4 className="font-medium">{mainTrack.song_title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Main Track • {Math.floor(mainTrack.duration / 60)}:{(mainTrack.duration % 60).toString().padStart(2, '0')}
                        {mainTrack.tempo && ` • ${mainTrack.tempo}`}
                      </p>
                      <div className="mt-2">
                        <Input
                          value={mainTrack.notes || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newNotes = e.target.value;
                            // Update local state immediately for responsive UI
                            setMusicTracks(prev => prev.map(track => 
                              track.id === mainTrack.id ? { ...track, notes: newNotes } : track
                            ));
                          }}
                          onBlur={(e) => {
                            // Save to database when user finishes editing
                            updateMusicTrack(mainTrack.id, { notes: e.target.value });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          placeholder="DJ notes or cues"
                          className="text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={currentTrack === mainTrack.id && isPlaying ? "destructive" : "default"}
                        onClick={() => currentTrack === mainTrack.id && isPlaying ? pauseTrack() : playTrack(mainTrack.id)}
                      >
                        {currentTrack === mainTrack.id && isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {tracks.filter(track => !track.is_main_track).map((track) => (
                <div key={track.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">{track.song_title}</h5>
                      <p className="text-sm text-muted-foreground">
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                        {track.tempo && ` • ${track.tempo}`}
                      </p>
                      {track.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">DJ Notes:</span> {track.notes}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => playTrack(track.id)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No music tracks available</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading DJ dashboard...</p>
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
              <h1 className="text-2xl font-bold text-foreground">DJ Dashboard</h1>
              <p className="text-muted-foreground">
                {event?.name} at {event?.venue}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {event?.show_dates && event.show_dates.length > 1 && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <Select value={selectedDate} onValueChange={setSelectedDate}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select show date" />
                    </SelectTrigger>
                    <SelectContent>
                      {event.show_dates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {new Date(date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                <span className="text-sm text-muted-foreground">Live Performance Control</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Performance Order</h2>
            {selectedDate && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Badge>
            )}
          </div>
          <div className="space-y-4">
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

              return filteredItems.length === 0 ? (
                <Card className="p-6">
                  <div className="text-center">
                    <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {selectedDate ? 'No Performances Scheduled' : 'No Performance Order Set'}
                    </h3>
                    <p className="text-muted-foreground">
                      {selectedDate 
                        ? `No performances are scheduled for ${new Date(selectedDate).toLocaleDateString()}.`
                        : 'The Stage Manager hasn\'t set up the performance order yet.'
                      }
                    </p>
                  </div>
                </Card>
              ) : (
                filteredItems.map((item, index) => (
                <Card 
                  key={item.id} 
                  className={`transition-all duration-200 ${
                    item.type === 'artist' ? getRowColorClasses(item.artist.performance_status) : 
                    item.type === 'cue' && item.cue.is_completed ? getRowColorClasses('completed') : 
                    getRowColorClasses()
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          {item.type === 'artist' ? (
                            <>
                              <h3 className="text-lg font-semibold">{item.artist.artist_name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary">{item.artist.style}</Badge>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {item.artist.performance_duration} min
                                </span>
                                {item.artist.quality_rating && getQualityBadge(item.artist.quality_rating)}
                              </div>
                              {(() => {
                                const tracks = getArtistTracks(item.artist.id);
                                const mainTrack = tracks.find(track => track.is_main_track) || tracks[0];
                                return mainTrack ? (
                                  <div className="mt-3 p-3 bg-background rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <p className="font-medium">{mainTrack.song_title}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {Math.floor(mainTrack.duration / 60)}:{(mainTrack.duration % 60).toString().padStart(2, '0')}
                                          {mainTrack.tempo && ` • ${mainTrack.tempo}`}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant={currentTrack === mainTrack.id && isPlaying ? "destructive" : "default"}
                                          onClick={() => currentTrack === mainTrack.id && isPlaying ? pauseTrack() : playTrack(mainTrack.id)}
                                        >
                                          {currentTrack === mainTrack.id && isPlaying ? (
                                            <Pause className="h-4 w-4" />
                                          ) : (
                                            <Play className="h-4 w-4" />
                                          )}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingMusic({ artistId: item.artist.id, track: mainTrack })}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                     {mainTrack.notes && (
                                       <div className="mt-2 p-2 bg-muted rounded text-sm">
                                         <strong>DJ Notes:</strong> {mainTrack.notes}
                                       </div>
                                     )}
                                  </div>
                                ) : null;
                              })()}
                            </>
                          ) : (
                            <>
                              <h3 className="text-lg font-semibold">{item.cue.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline">{item.cue.type}</Badge>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {item.cue.duration} min
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {index === 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">On Stage</span>
                        </div>
                      )}
                      {index === 1 && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Next Up</span>
                        </div>
                      )}
                      {index === 2 && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">On Deck</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                ))
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}