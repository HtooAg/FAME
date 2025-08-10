import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Users, Copy, Trash2, Music, Mic, Palette } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  venue: string;
}

interface TeamMember {
  id: string;
  team_member_name: string;
  team_role: 'dj' | 'mc' | 'graphics';
  access_code: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export default function TeamAccessManagement() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newMember, setNewMember] = useState({
    team_member_name: '',
    team_role: '' as 'dj' | 'mc' | 'graphics' | '',
    email: '',
  });

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      fetchTeamMembers();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('events')
        .select('id, name, venue')
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

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('team_access')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      toast({
        title: "Error fetching team members",
        description: "Failed to load team access list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAccessCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const createTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const accessCode = generateAccessCode();
      
      const { data, error } = await (supabase as any)
        .from('team_access')
        .insert([{
          event_id: eventId,
          ...newMember,
          access_code: accessCode
        }])
        .select()
        .single();

      if (error) throw error;

      setTeamMembers([data, ...teamMembers]);
      setNewMember({ team_member_name: '', team_role: '', email: '' });
      setIsDialogOpen(false);
      
      toast({
        title: "Team member added",
        description: `${data.team_member_name} has been granted ${data.team_role} access`,
      });
    } catch (error) {
      toast({
        title: "Error creating team member",
        description: "Failed to create team access",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleMemberAccess = async (memberId: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('team_access')
        .update({ is_active: !currentStatus })
        .eq('id', memberId);

      if (error) throw error;

      setTeamMembers(teamMembers.map(member => 
        member.id === memberId 
          ? { ...member, is_active: !currentStatus }
          : member
      ));

      toast({
        title: "Access updated",
        description: `Team member access ${!currentStatus ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      toast({
        title: "Error updating access",
        description: "Failed to update team member access",
        variant: "destructive",
      });
    }
  };

  const deleteMember = async (memberId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('team_access')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setTeamMembers(teamMembers.filter(member => member.id !== memberId));
      
      toast({
        title: "Team member removed",
        description: "Team member access has been revoked",
      });
    } catch (error) {
      toast({
        title: "Error removing member",
        description: "Failed to remove team member",
        variant: "destructive",
      });
    }
  };

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Access code copied",
      description: "The access code has been copied to your clipboard",
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'dj': return <Music className="h-4 w-4" />;
      case 'mc': return <Mic className="h-4 w-4" />;
      case 'graphics': return <Palette className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'dj': return 'bg-blue-100 text-blue-800';
      case 'mc': return 'bg-green-100 text-green-800';
      case 'graphics': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading team access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
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
                <h1 className="text-2xl font-bold text-foreground">Team Access Management</h1>
                <p className="text-muted-foreground">{event?.name} - {event?.venue}</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Grant access to DJ, MC, or Graphics team members
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createTeamMember} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="team_member_name">Name</Label>
                    <Input
                      id="team_member_name"
                      value={newMember.team_member_name}
                      onChange={(e) => setNewMember({ ...newMember, team_member_name: e.target.value })}
                      placeholder="Enter team member name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team_role">Role</Label>
                    <Select 
                      value={newMember.team_role} 
                      onValueChange={(value: 'dj' | 'mc' | 'graphics') => setNewMember({ ...newMember, team_role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dj">DJ</SelectItem>
                        <SelectItem value="mc">MC</SelectItem>
                        <SelectItem value="graphics">Graphics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={creating}>
                      {creating ? 'Creating...' : 'Create Access'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {teamMembers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
              <p className="text-muted-foreground mb-4">
                Add DJ, MC, and Graphics team members to give them access to artist information
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{member.team_member_name}</CardTitle>
                      <CardDescription>{member.email}</CardDescription>
                    </div>
                    <Badge className={getRoleColor(member.team_role)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(member.team_role)}
                        {member.team_role.toUpperCase()}
                      </div>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Access Code</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono flex-1">
                          {member.access_code}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyAccessCode(member.access_code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Status: {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Badge variant={member.is_active ? 'default' : 'secondary'}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={member.is_active ? "outline" : "default"}
                        onClick={() => toggleMemberAccess(member.id, member.is_active)}
                        className="flex-1"
                      >
                        {member.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}