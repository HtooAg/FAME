import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Palette, Clock, Download, Video, Image as ImageIcon } from 'lucide-react';

interface Artist {
  id: string;
  artist_name: string;
  real_name: string;
  style: string;
  biography: string;
  performance_duration: number;
  performance_order: number;
  performance_date: string;
}

interface ArtistImage {
  id: string;
  artist_id: string;
  image_url: string;
  image_type: string;
  is_primary: boolean;
}

interface PerformanceNote {
  id: string;
  artist_id: string;
  video_url: string;
  note_content: string;
  note_type: string;
}

interface Event {
  id: string;
  name: string;
  venue: string;
}

export default function GraphicsDashboard() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistImages, setArtistImages] = useState<ArtistImage[]>([]);
  const [performanceNotes, setPerformanceNotes] = useState<PerformanceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const fetchData = async () => {
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, venue')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch artists with performance order
      const { data: artistsData, error: artistsError } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, real_name, style, biography, performance_duration, performance_order, performance_date')
        .eq('event_id', eventId)
        .not('performance_order', 'is', null)
        .order('performance_order', { ascending: true });

      if (artistsError) throw artistsError;
      setArtists(artistsData || []);

      // Fetch artist images
      const artistIds = (artistsData || []).map(artist => artist.id);
      if (artistIds.length > 0) {
        const { data: imagesData, error: imagesError } = await supabase
          .from('artist_images')
          .select('*')
          .in('artist_id', artistIds);

        if (imagesError) throw imagesError;
        setArtistImages(imagesData || []);

        // Fetch performance notes with videos
        const { data: notesData, error: notesError } = await supabase
          .from('performance_notes')
          .select('*')
          .in('artist_id', artistIds)
          .not('video_url', 'is', null);

        if (notesError) throw notesError;
        setPerformanceNotes(notesData || []);
      }
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Failed to load Graphics dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getArtistImages = (artistId: string) => {
    return artistImages.filter(img => img.artist_id === artistId);
  };

  const getArtistVideos = (artistId: string) => {
    return performanceNotes.filter(note => note.artist_id === artistId && note.video_url);
  };

  const getPrimaryImage = (artistId: string) => {
    const images = getArtistImages(artistId);
    return images.find(img => img.is_primary) || images[0];
  };

  const downloadImage = (imageUrl: string, artistName: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${artistName}_image.jpg`;
    link.target = '_blank';
    link.click();
    
    toast({
      title: "Download started",
      description: "Image download has been initiated",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading Graphics dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Graphics Dashboard</h1>
              <p className="text-muted-foreground">
                {event?.name} at {event?.venue}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <span className="text-sm text-muted-foreground">Artist Media & Graphics</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {artists.map((artist, index) => {
            const images = getArtistImages(artist.id);
            const videos = getArtistVideos(artist.id);
            const primaryImage = getPrimaryImage(artist.id);
            
            return (
              <Card key={artist.id}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                      {index + 1}
                    </div>
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={primaryImage?.image_url} alt={artist.artist_name} />
                      <AvatarFallback className="text-lg">
                        {artist.artist_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-2xl">{artist.artist_name}</CardTitle>
                      <p className="text-muted-foreground">{artist.real_name}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline">{artist.style}</Badge>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{artist.performance_duration} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Biography Section */}
                    <div>
                      <h4 className="font-semibold mb-3">Artist Biography</h4>
                      <div className="bg-muted/20 p-4 rounded-lg">
                        {artist.biography ? (
                          <p className="text-sm leading-relaxed">{artist.biography}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No biography available</p>
                        )}
                      </div>
                    </div>

                    {/* Performance Details */}
                    <div>
                      <h4 className="font-semibold mb-3">Performance Details</h4>
                      <div className="bg-muted/20 p-4 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="font-medium">
                            {new Date(artist.performance_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">{artist.performance_duration} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Style:</span>
                          <span className="font-medium">{artist.style}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Order:</span>
                          <span className="font-medium">#{artist.performance_order}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Images Section */}
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Artist Images ({images.length})
                    </h4>
                    {images.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {images.map((image) => (
                          <div key={image.id} className="relative group">
                            <img 
                              src={image.image_url} 
                              alt={`${artist.artist_name} - ${image.image_type}`}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => downloadImage(image.image_url, artist.artist_name)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                            {image.is_primary && (
                              <Badge className="absolute top-2 left-2" variant="default">
                                Primary
                              </Badge>
                            )}
                            <Badge className="absolute top-2 right-2" variant="outline">
                              {image.image_type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No images available</p>
                      </div>
                    )}
                  </div>

                  {/* Videos Section */}
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Performance Videos ({videos.length})
                    </h4>
                    {videos.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {videos.map((video) => (
                          <div key={video.id} className="border rounded-lg p-4">
                            <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                              <a 
                                href={video.video_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-primary hover:underline"
                              >
                                <Video className="h-6 w-6" />
                                Open Video
                              </a>
                            </div>
                            {video.note_content && (
                              <p className="text-sm text-muted-foreground">{video.note_content}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No videos available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {artists.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Palette className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Performance Order Set</h3>
                <p className="text-muted-foreground">
                  Waiting for stage manager to set the performance order
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}