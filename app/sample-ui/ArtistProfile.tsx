import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Save, Edit, X } from 'lucide-react';

interface Artist {
  id: string;
  event_id: string;
  artist_name: string;
  real_name: string;
  email: string;
  phone: string;
  style: string;
  biography: string;
  notes: string;
  props_needed: string;
  performance_duration: number;
  quality_rating: number | null;
  rehearsal_date: string;
  rehearsal_order: number | null;
  performance_order: number | null;
  performance_date: string;
  costume_color: string;
  custom_costume_color: string;
  light_color_single: string;
  light_color_two: string;
  light_color_three: string;
  light_requests: string;
  show_link: string;
  performance_type: string;
  stage_position_start: string;
  stage_position_end: string;
  custom_stage_position: string;
  instagram_link: string;
  facebook_link: string;
  tiktok_link: string;
  youtube_link: string;
  website_link: string;
  mc_notes: string;
  stage_manager_notes: string;
  rehearsal_completed: boolean;
  is_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export default function ArtistProfile() {
  const { artistId, eventId } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qualityPopoverOpen, setQualityPopoverOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchArtist();
  }, [artistId]);

  const fetchArtist = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('artist_profiles')
        .select('*')
        .eq('id', artistId)
        .single();

      if (error) throw error;
      setArtist(data);
    } catch (error) {
      toast({
        title: "Error fetching artist",
        description: "Failed to load artist profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!artist) return;

    console.log('Starting save operation...', artist);
    setSaving(true);
    try {
      const updateData = {
        artist_name: artist.artist_name,
        real_name: artist.real_name || '',
        email: artist.email || '',
        phone: artist.phone || '',
        style: artist.style || '',
        biography: artist.biography || '',
        notes: artist.notes || '',
        props_needed: artist.props_needed || '',
        performance_duration: artist.performance_duration || 5,
        quality_rating: artist.quality_rating,
        costume_color: artist.costume_color || '',
        custom_costume_color: artist.custom_costume_color || '',
        light_color_single: artist.light_color_single || 'trust',
        light_color_two: artist.light_color_two || 'none',
        light_color_three: artist.light_color_three || 'none',
        light_requests: artist.light_requests || '',
        show_link: artist.show_link || '',
        performance_type: artist.performance_type || '',
        stage_position_start: artist.stage_position_start || '',
        stage_position_end: artist.stage_position_end || '',
        custom_stage_position: artist.custom_stage_position || '',
        instagram_link: artist.instagram_link || '',
        facebook_link: artist.facebook_link || '',
        tiktok_link: artist.tiktok_link || '',
        youtube_link: artist.youtube_link || '',
        website_link: artist.website_link || '',
        mc_notes: artist.mc_notes || '',
        stage_manager_notes: artist.stage_manager_notes || '',
        is_confirmed: artist.is_confirmed || false,
      };

      console.log('Update data:', updateData);

      const { error } = await (supabase as any)
        .from('artist_profiles')
        .update(updateData)
        .eq('id', artistId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Save successful');
      
      // Refetch the artist data to ensure UI is in sync
      await fetchArtist();
      
      toast({
        title: "✅ Profile updated successfully!",
        description: "All changes have been saved to the database.",
      });
      setEditing(false);
      setQualityPopoverOpen(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error saving profile",
        description: `Failed to save artist profile: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getQualityBadgeColor = (rating: number | null) => {
    switch (rating) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityText = (rating: number | null) => {
    switch (rating) {
      case 1: return 'Great';
      case 2: return 'Good';
      case 3: return 'Okay';
      default: return 'Not Rated';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading artist profile...</p>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Artist Not Found</h1>
          <Button onClick={() => navigate(`/performance-order/${eventId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Performance Order
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
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="" alt={artist.artist_name} />
                  <AvatarFallback>
                    {artist.artist_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{artist.artist_name}</h1>
                  <p className="text-muted-foreground">Artist Profile</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <Button onClick={() => setEditing(false)} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} size="sm" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)} size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Personal and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Artist Name</label>
                  {editing ? (
                    <Input
                      value={artist.artist_name}
                      onChange={(e) => setArtist({ ...artist, artist_name: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm mt-1">{artist.artist_name}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Real Name</label>
                  {editing ? (
                    <Input
                      value={artist.real_name || ''}
                      onChange={(e) => setArtist({ ...artist, real_name: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm mt-1">{artist.real_name || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  {editing ? (
                    <Input
                      type="email"
                      value={artist.email || ''}
                      onChange={(e) => setArtist({ ...artist, email: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm mt-1">{artist.email || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  {editing ? (
                    <Input
                      value={artist.phone || ''}
                      onChange={(e) => setArtist({ ...artist, phone: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm mt-1">{artist.phone || 'Not provided'}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Biography</label>
                {editing ? (
                  <Textarea
                    value={artist.biography}
                    onChange={(e) => setArtist({ ...artist, biography: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{artist.biography || 'No biography provided'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Details */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Details</CardTitle>
              <CardDescription>Style and performance information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Style</label>
                  {editing ? (
                    <Input
                      value={artist.style}
                      onChange={(e) => setArtist({ ...artist, style: e.target.value })}
                    />
                  ) : (
                    <Badge className="bg-blue-100 text-blue-800 mt-1">
                      {artist.style || 'Not specified'}
                    </Badge>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Performance Type</label>
                  {editing ? (
                    <Input
                      value={artist.performance_type}
                      onChange={(e) => setArtist({ ...artist, performance_type: e.target.value })}
                    />
                  ) : (
                    <Badge className="bg-blue-100 text-blue-800 mt-1">
                      {artist.performance_type || 'Not specified'}
                    </Badge>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  {editing ? (
                    <Input
                      type="number"
                      value={artist.performance_duration}
                      onChange={(e) => setArtist({ ...artist, performance_duration: parseInt(e.target.value) })}
                    />
                  ) : (
                    <p className="text-sm mt-1">{artist.performance_duration} minutes</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Quality Rating</label>
                   {editing ? (
                     <Popover open={qualityPopoverOpen} onOpenChange={setQualityPopoverOpen}>
                       <PopoverTrigger asChild>
                         <Button
                           variant="outline"
                           className="w-full justify-start text-left font-normal mt-1"
                         >
                           {artist.quality_rating ? getQualityText(artist.quality_rating) : "Select rating"}
                         </Button>
                       </PopoverTrigger>
                       <PopoverContent className="w-48 p-0 bg-background border-border shadow-lg z-[100]" align="start">
                         <div className="p-1">
                           <div 
                             className="px-3 py-2 hover:bg-accent cursor-pointer rounded"
                             onClick={() => {
                               setArtist({ ...artist, quality_rating: 1 });
                               setQualityPopoverOpen(false);
                             }}
                           >
                             Great
                           </div>
                           <div 
                             className="px-3 py-2 hover:bg-accent cursor-pointer rounded"
                             onClick={() => {
                               setArtist({ ...artist, quality_rating: 2 });
                               setQualityPopoverOpen(false);
                             }}
                           >
                             Good
                           </div>
                           <div 
                             className="px-3 py-2 hover:bg-accent cursor-pointer rounded"
                             onClick={() => {
                               setArtist({ ...artist, quality_rating: 3 });
                               setQualityPopoverOpen(false);
                             }}
                           >
                             Okay
                           </div>
                         </div>
                       </PopoverContent>
                     </Popover>
                   ) : (
                    <div className="mt-1">
                      <Badge className={getQualityBadgeColor(artist.quality_rating)}>
                        {getQualityText(artist.quality_rating)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Props Needed</label>
                {editing ? (
                  <Textarea
                    value={artist.props_needed}
                    onChange={(e) => setArtist({ ...artist, props_needed: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{artist.props_needed || 'No props needed'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes & Links */}
          <Card>
            <CardHeader>
              <CardTitle>Notes & Links</CardTitle>
              <CardDescription>Additional information and social media</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Performance Notes</label>
                {editing ? (
                  <Textarea
                    value={artist.notes}
                    onChange={(e) => setArtist({ ...artist, notes: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{artist.notes || 'No notes'}</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">MC Notes</label>
                {editing ? (
                  <Textarea
                    value={artist.mc_notes}
                    onChange={(e) => setArtist({ ...artist, mc_notes: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{artist.mc_notes || 'No MC notes'}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Instagram</label>
                  {editing ? (
                    <Input
                      value={artist.instagram_link}
                      onChange={(e) => setArtist({ ...artist, instagram_link: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm mt-1">{artist.instagram_link || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Website</label>
                  {editing ? (
                    <Input
                      value={artist.website_link}
                      onChange={(e) => setArtist({ ...artist, website_link: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm mt-1">{artist.website_link || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status & Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Settings</CardTitle>
              <CardDescription>Performance and rehearsal status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Rehearsal Status</label>
                  <p className="text-sm mt-1">
                    {artist.rehearsal_completed ? (
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Confirmation Status</label>
                  <p className="text-sm mt-1">
                    {artist.is_confirmed ? (
                      <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Rehearsal Order</label>
                  <p className="text-sm mt-1">{artist.rehearsal_order || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Performance Order</label>
                  <p className="text-sm mt-1">{artist.performance_order || 'Not assigned'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Stage Manager Notes</label>
                {editing ? (
                  <Textarea
                    value={artist.stage_manager_notes}
                    onChange={(e) => setArtist({ ...artist, stage_manager_notes: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{artist.stage_manager_notes || 'No stage manager notes'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}