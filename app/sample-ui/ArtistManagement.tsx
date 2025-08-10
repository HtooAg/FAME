import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UserCheck, Calendar, CheckCircle, Eye, Trash2, Plus, Copy, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Event {
  id: string;
  name: string;
  venue: string;
  show_dates: string[];
}

interface Artist {
  id: string;
  artist_name: string;
  real_name: string;
  email: string;
  style: string;
  performance_duration: number;
  performance_date: string | null;
  created_at: string;
  actual_duration?: number; // Duration from uploaded music in seconds
}

export default function ArtistManagement() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newArtist, setNewArtist] = useState({
    artist_name: '',
    real_name: '',
    email: '',
    password: '',
    style: '',
    performance_duration: 15,
    biography: '',
    phone: ''
  });
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    loginUrl: string;
  } | null>(null);
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
        .select('id, artist_name, real_name, email, style, performance_duration, performance_date, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch music durations for each artist
      const artistsWithDuration = await Promise.all(
        (data || []).map(async (artist: Artist) => {
          try {
            const { data: musicData, error: musicError } = await (supabase as any)
              .from('artist_music')
              .select('duration')
              .eq('artist_id', artist.id)
              .eq('is_main_track', true)
              .single();
            
            if (musicError) {
              console.log(`No music found for artist ${artist.artist_name}:`, musicError);
            }
            
            console.log(`Artist ${artist.artist_name} duration:`, musicData?.duration);
            
            return {
              ...artist,
              actual_duration: musicData?.duration || null
            };
          } catch (err) {
            console.error(`Error fetching music for ${artist.artist_name}:`, err);
            return {
              ...artist,
              actual_duration: null
            };
          }
        })
      );
      
      setArtists(artistsWithDuration);
    } catch (error) {
      toast({
        title: "Error fetching artists",
        description: "Failed to load artist submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignPerformanceDate = async (artistId: string, performanceDate: string | null) => {
    try {
      const { error } = await (supabase as any)
        .from('artist_profiles')
        .update({ performance_date: performanceDate })
        .eq('id', artistId);

      if (error) throw error;

      setArtists(artists.map(artist => 
        artist.id === artistId 
          ? { ...artist, performance_date: performanceDate }
          : artist
      ));

      toast({
        title: performanceDate ? "Performance date assigned" : "Artist unassigned",
        description: performanceDate 
          ? "Artist has been assigned to a performance date" 
          : "Artist has been moved back to submitted applications",
      });
    } catch (error) {
      toast({
        title: "Error updating artist",
        description: "Failed to update performance date",
        variant: "destructive",
      });
    }
  };

  const deleteArtist = async (artistId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('artist_profiles')
        .delete()
        .eq('id', artistId);

      if (error) throw error;

      setArtists(artists.filter(artist => artist.id !== artistId));

      toast({
        title: "Artist deleted",
        description: "Artist profile has been removed. They will need to register again.",
      });
    } catch (error) {
      toast({
        title: "Error deleting artist",
        description: "Failed to delete artist profile",
        variant: "destructive",
      });
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const createArtistManually = async () => {
    try {
      // Call edge function to create user account with custom password
      const { data: userResponse, error: userError } = await supabase.functions.invoke('create-artist-account', {
        body: {
          email: newArtist.email,
          password: newArtist.password,
          metadata: {
            artist_name: newArtist.artist_name,
            real_name: newArtist.real_name
          }
        }
      });

      if (userError) throw userError;

      // Create artist profile
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('artist_profiles')
        .insert({
          event_id: eventId,
          artist_name: newArtist.artist_name,
          real_name: newArtist.real_name,
          email: newArtist.email,
          phone: newArtist.phone,
          style: newArtist.style,
          performance_duration: newArtist.performance_duration,
          biography: newArtist.biography
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Generate login URL with pre-filled email
      const loginUrl = `${window.location.origin}/artist-auth?email=${encodeURIComponent(newArtist.email)}`;
      
      setCreatedCredentials({
        email: newArtist.email,
        password: newArtist.password,
        loginUrl
      });

      // Reset form
      setNewArtist({
        artist_name: '',
        real_name: '',
        email: '',
        password: '',
        style: '',
        performance_duration: 15,
        biography: '',
        phone: ''
      });

      // Refresh artists list
      fetchArtists();

      toast({
        title: "Artist created successfully",
        description: "The artist account has been created with login credentials",
      });
    } catch (error: any) {
      toast({
        title: "Error creating artist",
        description: error.message || "Failed to create artist account",
        variant: "destructive",
      });
    }
  };

  // Helper function to format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    
    const credentialsText = `Artist Login Credentials

Name: ${newArtist.artist_name}
Email: ${createdCredentials.email}
Password: ${createdCredentials.password}
Login URL: ${createdCredentials.loginUrl}

Please use these credentials to access your artist dashboard.`;

    navigator.clipboard.writeText(credentialsText);
    toast({
      title: "Credentials copied",
      description: "Login credentials have been copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading artist submissions...</p>
        </div>
      </div>
    );
  }

  const submittedArtists = artists.filter(a => !a.performance_date);
  const assignedArtists = artists.filter(a => a.performance_date);

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
              <h1 className="text-2xl font-bold text-foreground">Artist Management</h1>
              <p className="text-muted-foreground">{event?.name} - {event?.venue}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          
          {/* Add Artist Manually */}
          <div className="flex justify-end">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Artist Manually
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Artist Manually</DialogTitle>
                  <DialogDescription>
                    Create an artist account with login credentials that you can share
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="artist_name">Artist Name *</Label>
                      <Input
                        id="artist_name"
                        value={newArtist.artist_name}
                        onChange={(e) => setNewArtist({...newArtist, artist_name: e.target.value})}
                        placeholder="Stage name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="real_name">Real Name</Label>
                      <Input
                        id="real_name"
                        value={newArtist.real_name}
                        onChange={(e) => setNewArtist({...newArtist, real_name: e.target.value})}
                        placeholder="Legal name"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newArtist.email}
                        onChange={(e) => setNewArtist({...newArtist, email: e.target.value})}
                        placeholder="artist@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newArtist.phone}
                        onChange={(e) => setNewArtist({...newArtist, phone: e.target.value})}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="password"
                        type="text"
                        value={newArtist.password}
                        onChange={(e) => setNewArtist({...newArtist, password: e.target.value})}
                        placeholder="Login password"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setNewArtist({...newArtist, password: generatePassword()})}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="style">Performance Style</Label>
                    <Input
                      id="style"
                      value={newArtist.style}
                      onChange={(e) => setNewArtist({...newArtist, style: e.target.value})}
                      placeholder="e.g., Singer, Dancer, Comedy"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="biography">Biography</Label>
                    <Textarea
                      id="biography"
                      value={newArtist.biography}
                      onChange={(e) => setNewArtist({...newArtist, biography: e.target.value})}
                      placeholder="Artist background and experience"
                      rows={3}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={createArtistManually}
                    disabled={!newArtist.artist_name || !newArtist.email || !newArtist.password}
                  >
                    Create Artist Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Credentials Display Dialog */}
          <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Artist Account Created</DialogTitle>
                <DialogDescription>
                  Share these login credentials with the artist
                </DialogDescription>
              </DialogHeader>
              
              {createdCredentials && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div><strong>Email:</strong> {createdCredentials.email}</div>
                    <div><strong>Password:</strong> {createdCredentials.password}</div>
                    <div><strong>Login URL:</strong> 
                      <a 
                        href={createdCredentials.loginUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline ml-2"
                      >
                        {createdCredentials.loginUrl}
                      </a>
                    </div>
                  </div>
                  
                  <Button onClick={copyCredentials} className="w-full flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Credentials to Clipboard
                  </Button>
                </div>
              )}
              
              <DialogFooter>
                <Button onClick={() => setCreatedCredentials(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Assigned Artists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Assigned Artists
              </CardTitle>
              <CardDescription>
                Artists who have been assigned to a performance date and are ready for scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignedArtists.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No artists assigned yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artist</TableHead>
                      <TableHead>Style</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Performance Date</TableHead>
                      <TableHead>Change Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedArtists.map((artist) => (
                      <TableRow key={artist.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{artist.artist_name}</p>
                            <p className="text-sm text-muted-foreground">{artist.real_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>{artist.style}</TableCell>
                        <TableCell>{formatDuration(artist.actual_duration)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {new Date(artist.performance_date!).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={artist.performance_date || ''}
                            onValueChange={(value) => assignPerformanceDate(artist.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Change date" />
                            </SelectTrigger>
                            <SelectContent>
                              {event?.show_dates?.map((date) => (
                                <SelectItem key={date} value={date}>
                                  {new Date(date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/artist-registration/${eventId}?artistId=${artist.id}`)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => assignPerformanceDate(artist.id, null)}
                              className="flex items-center gap-1"
                            >
                              <X className="h-3 w-3" />
                              Unassign
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Artist Profile</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {artist.artist_name}'s profile? This action cannot be undone and they will need to register again.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteArtist(artist.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Submitted Artists - Not Yet Assigned */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Submitted Applications
              </CardTitle>
              <CardDescription>
                Artists who have submitted their information but haven't been assigned a performance date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submittedArtists.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No pending artist submissions
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artist</TableHead>
                      <TableHead>Style</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Assign Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submittedArtists.map((artist) => (
                      <TableRow key={artist.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{artist.artist_name}</p>
                            <p className="text-sm text-muted-foreground">{artist.real_name}</p>
                            <p className="text-xs text-muted-foreground">{artist.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{artist.style}</TableCell>
                        <TableCell>{formatDuration(artist.actual_duration)}</TableCell>
                        <TableCell>
                          <Select
                            onValueChange={(value) => assignPerformanceDate(artist.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Assign date" />
                            </SelectTrigger>
                            <SelectContent>
                              {event?.show_dates?.map((date) => (
                                <SelectItem key={date} value={date}>
                                  {new Date(date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/artist-registration/${eventId}?artistId=${artist.id}`)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Artist Profile</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {artist.artist_name}'s profile? This action cannot be undone and they will need to register again.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteArtist(artist.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}