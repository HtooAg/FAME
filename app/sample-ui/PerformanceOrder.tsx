import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Clock, ArrowLeft, Star, ArrowUp, ArrowDown, Plus, Mic, Video, Trash2, Speaker, Play, Timer, Sparkles, CheckCircle, Edit, Settings } from 'lucide-react';

interface Artist {
  id: string;
  artist_name: string;
  style: string;
  performance_duration: number;
  quality_rating: number | null;
  performance_order: number | null;
  rehearsal_completed: boolean;
  performance_status?: string | null;
  performance_date?: string | null;
  actual_duration?: number; // Duration from uploaded music in seconds
}

interface Cue {
  id: string;
  type: 'mc_break' | 'video_break' | 'cleaning_break' | 'speech_break' | 'opening' | 'countdown' | 'artist_ending' | 'animation';
  title: string;
  duration?: number;
  performance_order: number;
  notes?: string;
  start_time?: string;
  end_time?: string;
  is_completed?: boolean;
  completed_at?: string;
}

interface EventTimings {
  backstage_ready_time?: string;
  show_start_time?: string;
}

interface ShowOrderItem {
  id: string;
  type: 'artist' | 'cue';
  artist?: Artist;
  cue?: Cue;
  performance_order: number;
  status?: 'completed' | 'currently_on_stage' | 'next_on_stage' | 'next_on_deck' | 'neutral';
}

export default function PerformanceOrder() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [completedArtists, setCompletedArtists] = useState<Artist[]>([]);
  const [showOrderItems, setShowOrderItems] = useState<ShowOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCue, setEditingCue] = useState<Cue | null>(null);
  const [editForm, setEditForm] = useState({ title: '', duration: 0, notes: '' });
  const [eventTimings, setEventTimings] = useState<EventTimings>({});
  const [showTimingSettings, setShowTimingSettings] = useState(false);
  const [selectedPerformanceDate, setSelectedPerformanceDate] = useState<string>('');
  const [eventDates, setEventDates] = useState<string[]>([]);
  const { toast } = useToast();

  // Calculate show timings
  const calculateTotalShowTime = () => {
    return showOrderItems.reduce((total, item) => {
      if (item.type === 'artist' && item.artist) {
        return total + (item.artist.performance_duration || 0);
      } else if (item.type === 'cue' && item.cue) {
        return total + (item.cue.duration || 0);
      }
      return total;
    }, 0);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const calculateItemTiming = (index: number) => {
    if (!eventTimings.show_start_time) return { start: '', end: '' };

    const [hours, minutes] = eventTimings.show_start_time.split(':').map(Number);
    let currentTime = hours * 60 + minutes;

    // Calculate start time for this item
    for (let i = 0; i < index; i++) {
      const item = showOrderItems[i];
      if (item.type === 'artist' && item.artist) {
        currentTime += item.artist.performance_duration || 0;
      } else if (item.type === 'cue' && item.cue) {
        currentTime += item.cue.duration || 0;
      }
    }

    const startTime = currentTime;
    const item = showOrderItems[index];
    let duration = 0;
    if (item.type === 'artist' && item.artist) {
      duration = item.artist.performance_duration || 0;
    } else if (item.type === 'cue' && item.cue) {
      duration = item.cue.duration || 0;
    }
    const endTime = startTime + duration;

    const formatMinutesToTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    return {
      start: formatMinutesToTime(startTime),
      end: formatMinutesToTime(endTime)
    };
  };

  // Helper function to format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  const fetchEventDates = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('show_dates')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      
      if (data?.show_dates) {
        const dates = data.show_dates.map((date: string) => date.split('T')[0]); // Extract date part
        setEventDates(dates);
        if (dates.length > 0 && !selectedPerformanceDate) {
          setSelectedPerformanceDate(dates[0]); // Auto-select first date
        }
      }
    } catch (error) {
      console.error('Error fetching event dates:', error);
    }
  };

  useEffect(() => {
    fetchEventDates();
    fetchEventTimings();
    
    // Set up real-time subscriptions
    const artistsChannel = supabase
      .channel('artist-performance-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'artist_profiles' },
        () => {
          fetchArtists();
        }
      )
      .subscribe();

    const cuesChannel = supabase
      .channel('performance-cues-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'performance_cues' },
        () => {
          fetchArtists();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(artistsChannel);
      supabase.removeChannel(cuesChannel);
    };
  }, [eventId]);

  // Separate useEffect to fetch artists when performance date changes
  useEffect(() => {
    if (selectedPerformanceDate) {
      fetchArtists();
    }
  }, [selectedPerformanceDate]);

  const fetchEventTimings = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('backstage_ready_time, show_start_time')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      
      if (data) {
        setEventTimings({
          backstage_ready_time: data.backstage_ready_time,
          show_start_time: data.show_start_time
        });
      }
    } catch (error) {
      console.error('Error fetching event timings:', error);
    }
  };

  const saveEventTimings = async (timings: EventTimings) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          backstage_ready_time: timings.backstage_ready_time,
          show_start_time: timings.show_start_time
        })
        .eq('id', eventId);

      if (error) throw error;

      setEventTimings(timings);
      toast({
        title: "Timing settings saved",
        description: "Event timing has been updated",
      });
    } catch (error) {
      toast({
        title: "Error saving timings",
        description: "Failed to save timing settings",
        variant: "destructive",
      });
    }
  };

  const fetchArtists = async () => {
    if (!selectedPerformanceDate) return;
    
    try {
      // Fetch all artists first, then filter client-side for better control
      const { data: artistsData, error: artistsError } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, style, performance_duration, quality_rating, performance_order, rehearsal_completed, performance_status, performance_date')
        .eq('event_id', eventId);

      if (artistsError) throw artistsError;

      // Fetch music durations for each artist
      const artistsWithDuration = await Promise.all(
        (artistsData || []).map(async (artist: Artist) => {
          try {
            const { data: musicData, error: musicError } = await supabase
              .from('artist_music')
              .select('duration')
              .eq('artist_id', artist.id)
              .eq('is_main_track', true)
              .single();
            
            if (musicError) {
              console.log(`No music found for artist ${artist.artist_name}:`, musicError);
            }
            
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

      // Fetch cues with completion status for the selected performance date or those not assigned to any date
      const { data: cuesData, error: cuesError } = await supabase
        .from('performance_cues')
        .select('id, type, title, duration, performance_order, notes, start_time, end_time, is_completed, completed_at')
        .eq('event_id', eventId)
        .or(`performance_date.eq."${selectedPerformanceDate}",performance_date.is.null`)
        .order('performance_order', { ascending: true });

      if (cuesError) throw cuesError;

      const artists = artistsWithDuration;
      const cues = cuesData || [];
      
      // Filter artists for the selected performance date (client-side filtering for better control)
      const filteredArtists = artists.filter((a: Artist) => {
        // Include artists that:
        // 1. Have performance_date matching selectedPerformanceDate (extract date part)
        // 2. Have performance_date as null (not assigned to any specific date yet)
        if (!a.performance_date) return true; // Show unassigned artists
        
        // Extract date part from performance_date and compare
        const artistDate = new Date(a.performance_date).toISOString().split('T')[0];
        return artistDate === selectedPerformanceDate;
      });
      
      // Artists who completed rehearsal but not yet assigned to show order
      const completed = filteredArtists.filter((a: Artist) => a.rehearsal_completed && a.performance_order === null);
      
      // Artists assigned to show order - convert to show order items
      const assignedArtists = filteredArtists
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
          type: cue.type as Cue['type'],
          title: cue.title,
          duration: cue.duration,
          performance_order: cue.performance_order,
          notes: cue.notes,
          start_time: cue.start_time,
          end_time: cue.end_time,
          is_completed: cue.is_completed,
          completed_at: cue.completed_at
        },
        performance_order: cue.performance_order
      }));

      // Combine and sort all show order items
      const allShowOrderItems = [...assignedArtists, ...cueItems]
        .sort((a, b) => a.performance_order - b.performance_order)
        .map(item => ({
          ...item,
          // Initialize status based on saved status from database
          status: (item.type === 'cue' && item.cue?.is_completed) 
            ? 'completed' as const 
            : (item.type === 'artist' && item.artist?.performance_status) 
              ? item.artist.performance_status as ShowOrderItem['status'] 
              : undefined
        }));

      setCompletedArtists(completed);
      setShowOrderItems(allShowOrderItems);
    } catch (error) {
      toast({
        title: "Error fetching data",
        description: "Failed to load artists and cues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignToShowOrder = async (artistId: string) => {
    const nextOrder = showOrderItems.length + 1;

    try {
      const { error } = await (supabase as any)
        .from('artist_profiles')
        .update({ 
          performance_order: nextOrder,
          performance_date: selectedPerformanceDate
        })
        .eq('id', artistId);

      if (error) throw error;

      toast({
        title: "Artist assigned to show order",
        description: "Artist has been added to the performance lineup",
      });

      fetchArtists();
    } catch (error) {
      toast({
        title: "Error assigning artist",
        description: "Failed to assign artist to show order",
        variant: "destructive",
      });
    }
  };

  const removeFromShowOrder = async (itemId: string, itemType: 'artist' | 'cue') => {
    if (itemType === 'artist') {
      try {
        const { error } = await (supabase as any)
          .from('artist_profiles')
          .update({ performance_order: null })
          .eq('id', itemId);

        if (error) throw error;

        toast({
          title: "Artist removed from show order",
          description: "Artist removed from performance lineup",
        });

        fetchArtists();
      } catch (error) {
        toast({
          title: "Error removing artist",
          description: "Failed to remove artist from show order",
          variant: "destructive",
        });
      }
    } else {
      // Remove cue from database
      try {
        const { error } = await supabase
          .from('performance_cues')
          .delete()
          .eq('id', itemId);

        if (error) throw error;

        toast({
          title: "Cue removed",
          description: "Cue removed from show order",
        });

        fetchArtists();
      } catch (error) {
        toast({
          title: "Error removing cue",
          description: "Failed to remove cue from show order",
          variant: "destructive",
        });
      }
    }
  };

  const addCue = async (cueType: Cue['type']) => {
    const cueDefinitions = {
      'mc_break': { title: 'MC Break', icon: Mic, duration: 5 },
      'video_break': { title: 'Video Break', icon: Video, duration: 3 },
      'cleaning_break': { title: 'Cleaning Break', icon: Trash2, duration: 10 },
      'speech_break': { title: 'Speech Break', icon: Speaker, duration: 8 },
      'opening': { title: 'Opening', icon: Play, duration: 5 },
      'countdown': { title: 'Countdown', icon: Timer, duration: 2 },
      'artist_ending': { title: 'Artist Ending', icon: CheckCircle, duration: 3 },
      'animation': { title: 'Animation', icon: Sparkles, duration: 4 }
    };

    const cueInfo = cueDefinitions[cueType];
    const nextOrder = showOrderItems.length + 1;

    try {
      const { error } = await supabase
        .from('performance_cues')
        .insert({
          event_id: eventId,
          type: cueType,
          title: cueInfo.title,
          duration: cueInfo.duration,
          performance_order: nextOrder,
          performance_date: selectedPerformanceDate
        });

      if (error) throw error;

      toast({
        title: "Cue added",
        description: `${cueInfo.title} added to show order`,
      });

      fetchArtists(); // Refresh to get the new cue
    } catch (error) {
      toast({
        title: "Error adding cue",
        description: "Failed to add cue to show order",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const newList = Array.from(showOrderItems);
    const [reorderedItem] = newList.splice(source.index, 1);
    newList.splice(destination.index, 0, reorderedItem);

    // Update performance_order for all items
    const updatedList = newList.map((item, index) => ({
      ...item,
      performance_order: index + 1,
      ...(item.artist && { artist: { ...item.artist, performance_order: index + 1 } }),
      ...(item.cue && { cue: { ...item.cue, performance_order: index + 1 } })
    }));

    setShowOrderItems(updatedList);

    // Update database for both artists and cues
    try {
      const artistUpdates = updatedList
        .filter(item => item.type === 'artist' && item.artist)
        .map((item) => ({
          id: item.artist!.id,
          performance_order: item.performance_order
        }));

      const cueUpdates = updatedList
        .filter(item => item.type === 'cue' && item.cue)
        .map((item) => ({
          id: item.cue!.id,
          performance_order: item.performance_order
        }));

      // Update artists
      for (const update of artistUpdates) {
        const { error } = await supabase
          .from('artist_profiles')
          .update({ performance_order: update.performance_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Update cues
      for (const update of cueUpdates) {
        const { error } = await supabase
          .from('performance_cues')
          .update({ performance_order: update.performance_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Show order updated",
        description: "Performance order has been updated",
      });
    } catch (error) {
      toast({
        title: "Error updating order",
        description: "Failed to update the performance order",
        variant: "destructive",
      });
      fetchArtists();
    }
  };

  const moveItem = async (itemId: string, direction: 'up' | 'down') => {
    const currentIndex = showOrderItems.findIndex(item => item.id === itemId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= showOrderItems.length) return;

    const newList = Array.from(showOrderItems);
    const [movedItem] = newList.splice(currentIndex, 1);
    newList.splice(newIndex, 0, movedItem);

    // Update performance_order for all items
    const updatedList = newList.map((item, index) => ({
      ...item,
      performance_order: index + 1,
      ...(item.artist && { artist: { ...item.artist, performance_order: index + 1 } }),
      ...(item.cue && { cue: { ...item.cue, performance_order: index + 1 } })
    }));

    setShowOrderItems(updatedList);

    // Update database for both artists and cues
    try {
      const artistUpdates = updatedList
        .filter(item => item.type === 'artist' && item.artist)
        .map(item => ({
          id: item.artist!.id,
          performance_order: item.performance_order
        }));

      const cueUpdates = updatedList
        .filter(item => item.type === 'cue' && item.cue)
        .map(item => ({
          id: item.cue!.id,
          performance_order: item.performance_order
        }));

      // Update artists
      for (const update of artistUpdates) {
        const { error } = await supabase
          .from('artist_profiles')
          .update({ performance_order: update.performance_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Update cues
      for (const update of cueUpdates) {
        const { error } = await supabase
          .from('performance_cues')
          .update({ performance_order: update.performance_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Item moved",
        description: `Item moved ${direction} in show order`,
      });
    } catch (error) {
      toast({
        title: "Error moving item",
        description: "Failed to update item position",
        variant: "destructive",
      });
      fetchArtists();
    }
  };

  const updateItemStatus = async (itemId: string, status: ShowOrderItem['status']) => {
    const item = showOrderItems.find(item => item.id === itemId);
    
    // For cues, update the completion status in the database
    if (item && item.type === 'cue' && status === 'completed') {
      try {
        const { error } = await supabase
          .from('performance_cues')
          .update({ is_completed: true })
          .eq('id', itemId);

        if (error) throw error;
      } catch (error) {
        toast({
          title: "Error updating cue status",
          description: "Failed to mark cue as completed",
          variant: "destructive",
        });
        return;
      }
    } else if (item && item.type === 'cue' && status !== 'completed') {
      try {
        const { error } = await supabase
          .from('performance_cues')
          .update({ is_completed: false })
          .eq('id', itemId);

        if (error) throw error;
      } catch (error) {
        toast({
          title: "Error updating cue status",
          description: "Failed to update cue status",
          variant: "destructive",
        });
        return;
      }
    }

    // For artists, save the performance status to the database
    if (item && item.type === 'artist') {
      try {
        const { error } = await supabase
          .from('artist_profiles')
          .update({ performance_status: status === 'neutral' ? null : status })
          .eq('id', itemId);

        if (error) throw error;
      } catch (error) {
        toast({
          title: "Error updating artist status",
          description: "Failed to update artist status",
          variant: "destructive",
        });
        return;
      }
    }

    setShowOrderItems(prev => {
      const updatedItems = prev.map(item => 
        item.id === itemId ? { ...item, status } : item
      );

      // If status is "completed", automatically update following items
      if (status === 'completed') {
        const currentIndex = updatedItems.findIndex(item => item.id === itemId);
        
        if (currentIndex !== -1) {
          // Keep all previously completed items, but reset other statuses after current item
          const resetItems = updatedItems.map((item, index) => {
            if (index <= currentIndex) {
              // Keep existing status for items before and including current
              return item;
            } else {
              // Reset status for items after current (unless they were already completed)
              return item.status === 'completed' ? item : { ...item, status: undefined };
            }
          });
          
          // Set the next item to "currently_on_stage"
          if (currentIndex + 1 < resetItems.length && resetItems[currentIndex + 1].status !== 'completed') {
            resetItems[currentIndex + 1].status = 'currently_on_stage';
          }
          
          // Set the item after that to "next_on_stage"
          if (currentIndex + 2 < resetItems.length && resetItems[currentIndex + 2].status !== 'completed') {
            resetItems[currentIndex + 2].status = 'next_on_stage';
          }
          
          // Set the item after that to "next_on_deck"
          if (currentIndex + 3 < resetItems.length && resetItems[currentIndex + 3].status !== 'completed') {
            resetItems[currentIndex + 3].status = 'next_on_deck';
          }
          
          return resetItems;
        }
      }

      return updatedItems;
    });
  };

  const getRowColorClasses = (status?: ShowOrderItem['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300';
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
      1: 'text-green-500',
      2: 'text-yellow-500', 
      3: 'text-blue-500'
    };

    return (
      <div className="flex items-center gap-1">
        <Star className={`h-4 w-4 fill-current ${colors[rating as keyof typeof colors]}`} />
      </div>
    );
  };

  const editCue = (cue: Cue) => {
    setEditingCue(cue);
    setEditForm({
      title: cue.title,
      duration: cue.duration || 0,
      notes: cue.notes || ''
    });
  };

  const saveCueEdit = async () => {
    if (!editingCue) return;

    try {
      const { error } = await supabase
        .from('performance_cues')
        .update({
          title: editForm.title,
          duration: editForm.duration,
          notes: editForm.notes
        })
        .eq('id', editingCue.id);

      if (error) throw error;

      setEditingCue(null);
      setEditForm({ title: '', duration: 0, notes: '' });
      
      toast({
        title: "Cue updated",
        description: "Cue details have been saved",
      });

      fetchArtists(); // Refresh data
    } catch (error) {
      toast({
        title: "Error updating cue",
        description: "Failed to save cue changes",
        variant: "destructive",
      });
    }
  };

  const getCueIcon = (cueType: Cue['type']) => {
    const iconMap = {
      'mc_break': Mic,
      'video_break': Video,
      'cleaning_break': Trash2,
      'speech_break': Speaker,
      'opening': Play,
      'countdown': Timer,
      'artist_ending': CheckCircle,
      'animation': Sparkles
    };
    return iconMap[cueType];
  };

  const cueTypes = [
    { type: 'opening' as const, label: 'Opening', icon: Play },
    { type: 'countdown' as const, label: 'Countdown', icon: Timer },
    { type: 'mc_break' as const, label: 'MC Break', icon: Mic },
    { type: 'video_break' as const, label: 'Video Break', icon: Video },
    { type: 'cleaning_break' as const, label: 'Cleaning Break', icon: Trash2 },
    { type: 'speech_break' as const, label: 'Speech Break', icon: Speaker },
    { type: 'artist_ending' as const, label: 'Artist Ending', icon: CheckCircle },
    { type: 'animation' as const, label: 'Animation', icon: Sparkles }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading performance order...</p>
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
                onClick={() => navigate(`/stage-manager/${eventId}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Performance Order</h1>
                <p className="text-muted-foreground">Assign completed rehearsal artists to show order</p>
              </div>
            </div>
            
            {/* Performance Day Selector */}
            {eventDates.length > 0 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="performance-day" className="text-sm font-medium whitespace-nowrap">
                  Performance Day:
                </Label>
                <Select
                  value={selectedPerformanceDate}
                  onValueChange={setSelectedPerformanceDate}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select performance day" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventDates.map((date, index) => (
                      <SelectItem key={date} value={date}>
                        Day {index + 1} - {new Date(date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Timing Overview Section */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Show Time</p>
                  <p className="text-2xl font-bold">{formatTime(calculateTotalShowTime())}</p>
                </div>
                <Timer className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Backstage Ready</p>
                  <p className="text-2xl font-bold">{eventTimings.backstage_ready_time || '--:--'}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Show Start</p>
                  <p className="text-2xl font-bold">{eventTimings.show_start_time || '--:--'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="h-8 w-8 text-muted-foreground" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTimingSettings(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Show Order - Left Side */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Show Order
                </CardTitle>
                <CardDescription>
                  Drag and drop to reorder performance lineup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="showOrder">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {showOrderItems.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                             {(provided, snapshot) => (
                               <div
                                 ref={provided.innerRef}
                                 {...provided.draggableProps}
                                 {...provided.dragHandleProps}
                                  className={`p-4 rounded-lg border ${
                                    snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                                  } transition-shadow ${
                                    item.status ? getRowColorClasses(item.status) : (item.type === 'cue' ? 'bg-muted/50' : 'bg-card')
                                  }`}
                               >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1">
                                      {item.type === 'artist' && item.artist ? (
                                        <div>
                                          <h4 className="font-medium">{item.artist.artist_name}</h4>
                                          <p className="text-sm text-muted-foreground">{item.artist.style} • {formatDuration(item.artist.actual_duration)}</p>
                                        </div>
                                       ) : item.type === 'cue' && item.cue ? (
                                          <div 
                                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/20 p-2 rounded transition-colors"
                                            onClick={() => editCue(item.cue!)}
                                          >
                                            {(() => {
                                              const IconComponent = getCueIcon(item.cue.type);
                                              return <IconComponent className="h-4 w-4 text-muted-foreground" />;
                                            })()}
                                            <div className="flex-1">
                                              <h4 className="font-medium text-muted-foreground">{item.cue.title}</h4>
                                              <p className="text-sm text-muted-foreground">{item.cue.duration} min</p>
                                              {item.cue.notes && (
                                                <p className="text-xs text-muted-foreground/80 mt-1 italic">{item.cue.notes}</p>
                                              )}
                                            </div>
                                            <Edit className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                      ) : null}
                                      {/* Timing Information */}
                                      {eventTimings.show_start_time && (
                                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                                          <span>Start: {calculateItemTiming(index).start}</span>
                                          <span>End: {calculateItemTiming(index).end}</span>
                                          <span>Duration: {
                                            item.type === 'artist' && item.artist 
                                              ? `${item.artist.performance_duration}m`
                                              : item.type === 'cue' && item.cue 
                                                ? `${item.cue.duration}m`
                                                : '0m'
                                          }</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                   <div className="flex items-center gap-2">
                                     {item.type === 'artist' && item.artist && getQualityBadge(item.artist.quality_rating)}
                                     <div className="flex gap-1">
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         onClick={() => moveItem(item.id, 'up')}
                                         disabled={index === 0}
                                       >
                                         <ArrowUp className="h-4 w-4" />
                                       </Button>
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         onClick={() => moveItem(item.id, 'down')}
                                         disabled={index === showOrderItems.length - 1}
                                       >
                                         <ArrowDown className="h-4 w-4" />
                                       </Button>
                                     </div>
                                     <Select
                                       value={item.status || ""}
                                       onValueChange={(value) => updateItemStatus(item.id, value as ShowOrderItem['status'])}
                                     >
                                       <SelectTrigger className="w-[140px] h-8">
                                         <SelectValue placeholder="Status" />
                                       </SelectTrigger>
                                        <SelectContent className="bg-popover border border-border z-50">
                                          <SelectItem value="neutral">Status</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                          <SelectItem value="currently_on_stage">Currently On Stage</SelectItem>
                                          <SelectItem value="next_on_stage">Next On Stage</SelectItem>
                                          <SelectItem value="next_on_deck">Next On Deck</SelectItem>
                                        </SelectContent>
                                     </Select>
                                     <Button
                                       size="sm"
                                       variant="destructive"
                                       onClick={() => removeFromShowOrder(item.id, item.type)}
                                     >
                                       <Trash2 className="h-4 w-4" />
                                     </Button>
                                   </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {showOrderItems.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No items in show order yet</p>
                            <p className="text-sm">Add artists and cues to build your performance lineup</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </CardContent>
            </Card>

            {/* Add Cues Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Cues
                </CardTitle>
                <CardDescription>
                  Insert breaks and special elements into the show order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {cueTypes.map((cue) => (
                    <Button
                      key={cue.type}
                      variant="outline"
                      size="sm"
                      onClick={() => addCue(cue.type)}
                      className="flex items-center gap-2 justify-start"
                    >
                      <cue.icon className="h-4 w-4" />
                      {cue.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Completed Rehearsals - Right Side */}
          <Card>
            <CardHeader>
              <CardTitle>Completed Rehearsals</CardTitle>
              <CardDescription>
                Artists ready to be assigned to show order
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedArtists.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed rehearsals yet</p>
                  <p className="text-sm">Artists will appear here once they complete their rehearsals</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedArtists.map((artist) => (
                    <div key={artist.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{artist.artist_name}</h4>
                          <p className="text-sm text-muted-foreground">{artist.style} • {formatDuration(artist.actual_duration)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getQualityBadge(artist.quality_rating)}
                          <Button
                            size="sm"
                            onClick={() => assignToShowOrder(artist.id)}
                          >
                            Assign to Show Order
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

        {/* Edit Cue Dialog */}
        <Dialog open={!!editingCue} onOpenChange={() => setEditingCue(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Cue</DialogTitle>
              <DialogDescription>
                Modify the cue timing, name, and add notes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cue-title">Cue Title</Label>
                <Input
                  id="cue-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Enter cue title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cue-duration">Duration (minutes)</Label>
                <Input
                  id="cue-duration"
                  type="number"
                  min="0"
                  value={editForm.duration}
                  onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 0 })}
                  placeholder="Enter duration"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cue-notes">Notes</Label>
                <Textarea
                  id="cue-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Add any special notes for this cue..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingCue(null)}>
                  Cancel
                </Button>
                <Button onClick={saveCueEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Timing Settings Dialog */}
        <Dialog open={showTimingSettings} onOpenChange={setShowTimingSettings}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Show Timing Settings</DialogTitle>
              <DialogDescription>
                Set the backstage ready time and show start time
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backstage-time">Backstage Ready Time</Label>
                <Input
                  id="backstage-time"
                  type="time"
                  value={eventTimings.backstage_ready_time || ''}
                  onChange={(e) => setEventTimings({ ...eventTimings, backstage_ready_time: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">When artists need to be backstage and ready</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="show-time">Show Start Time</Label>
                <Input
                  id="show-time"
                  type="time"
                  value={eventTimings.show_start_time || ''}
                  onChange={(e) => setEventTimings({ ...eventTimings, show_start_time: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">When the show officially begins</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowTimingSettings(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  saveEventTimings(eventTimings);
                  setShowTimingSettings(false);
                }}>
                  Save Timing
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}