import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, AlertTriangle, Shield, Trash2, Edit, Eye, EyeOff } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  venue: string;
}

interface EmergencyCode {
  id: string;
  code_name: string;
  code_description: string;
  is_active: boolean;
  created_at: string;
}

export default function EmergencyCodes() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [codes, setCodes] = useState<EmergencyCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<EmergencyCode | null>(null);
  const { toast } = useToast();

  const [newCode, setNewCode] = useState({
    code_name: '',
    code_description: '',
  });

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      fetchCodes();
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

  const fetchCodes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('emergency_codes')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      toast({
        title: "Error fetching emergency codes",
        description: "Failed to load emergency codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { data, error } = await (supabase as any)
        .from('emergency_codes')
        .insert([{
          event_id: eventId,
          ...newCode
        }])
        .select()
        .single();

      if (error) throw error;

      setCodes([data, ...codes]);
      setNewCode({ code_name: '', code_description: '' });
      setIsDialogOpen(false);
      
      toast({
        title: "Emergency code created",
        description: `Code "${data.code_name}" has been added`,
      });
    } catch (error) {
      toast({
        title: "Error creating code",
        description: "Failed to create emergency code",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const updateCode = async (codeId: string, updates: Partial<EmergencyCode>) => {
    try {
      const { error } = await (supabase as any)
        .from('emergency_codes')
        .update(updates)
        .eq('id', codeId);

      if (error) throw error;

      setCodes(codes.map(code => 
        code.id === codeId 
          ? { ...code, ...updates }
          : code
      ));

      toast({
        title: "Code updated",
        description: "Emergency code has been updated",
      });
    } catch (error) {
      toast({
        title: "Error updating code",
        description: "Failed to update emergency code",
        variant: "destructive",
      });
    }
  };

  const toggleCodeStatus = (codeId: string, currentStatus: boolean) => {
    updateCode(codeId, { is_active: !currentStatus });
  };

  const deleteCode = async (codeId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('emergency_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;

      setCodes(codes.filter(code => code.id !== codeId));
      
      toast({
        title: "Code deleted",
        description: "Emergency code has been removed",
      });
    } catch (error) {
      toast({
        title: "Error deleting code",
        description: "Failed to delete emergency code",
        variant: "destructive",
      });
    }
  };

  const getCodeColor = (codeName: string) => {
    const name = codeName.toLowerCase();
    switch (name) {
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'orange': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const resetForm = () => {
    setNewCode({ code_name: '', code_description: '' });
    setEditingCode(null);
    setIsDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading emergency codes...</p>
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
                <h1 className="text-2xl font-bold text-foreground">Emergency Codes</h1>
                <p className="text-muted-foreground">{event?.name} - {event?.venue}</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Emergency Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCode ? 'Edit Emergency Code' : 'Add Emergency Code'}
                  </DialogTitle>
                  <DialogDescription>
                    Create quick communication codes for emergency situations
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code_name">Code Name</Label>
                    <Input
                      id="code_name"
                      value={newCode.code_name}
                      onChange={(e) => setNewCode({ ...newCode, code_name: e.target.value })}
                      placeholder="e.g., Red, Blue, Green"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code_description">Description</Label>
                    <Textarea
                      id="code_description"
                      value={newCode.code_description}
                      onChange={(e) => setNewCode({ ...newCode, code_description: e.target.value })}
                      placeholder="Describe what this code means and what action should be taken..."
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={creating}>
                      {creating ? 'Creating...' : editingCode ? 'Update Code' : 'Create Code'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
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
        {/* Common Emergency Codes Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Emergency Code System
            </CardTitle>
            <CardDescription>
              Quick communication codes for emergency and important situations during events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <div className="font-medium text-red-800">Typical Red Code</div>
                <div className="text-red-700">Medical emergency, stop show immediately</div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="font-medium text-blue-800">Typical Blue Code</div>
                <div className="text-blue-700">Technical issue, brief pause needed</div>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <div className="font-medium text-green-800">Typical Green Code</div>
                <div className="text-green-700">All clear, proceed as normal</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {codes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No emergency codes set</h3>
              <p className="text-muted-foreground mb-4">
                Create emergency codes to enable quick communication during events
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {codes.map((code) => (
              <Card key={code.id} className={`hover:shadow-md transition-shadow border-2 ${getCodeColor(code.code_name)}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-bold uppercase">
                        {code.code_name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Created {new Date(code.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant={code.is_active ? 'default' : 'secondary'}>
                      {code.is_active ? (
                        <><Eye className="h-3 w-3 mr-1" /> Active</>
                      ) : (
                        <><EyeOff className="h-3 w-3 mr-1" /> Inactive</>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm mt-1 leading-relaxed">
                        {code.code_description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingCode(code);
                          setNewCode({
                            code_name: code.code_name,
                            code_description: code.code_description
                          });
                          setIsDialogOpen(true);
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={code.is_active ? "outline" : "default"}
                        onClick={() => toggleCodeStatus(code.id, code.is_active)}
                      >
                        {code.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteCode(code.id)}
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