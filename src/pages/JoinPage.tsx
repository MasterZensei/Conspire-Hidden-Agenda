import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLobbies } from '../hooks/useSupabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabaseClient';

export default function JoinPage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const { joinLobby } = useLobbies();
  const { toast } = useToast();
  
  const [isJoining, setIsJoining] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleJoinLobby = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a display name"
      });
      return;
    }
    
    if (!lobbyId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid lobby ID"
      });
      return;
    }
    
    try {
      setIsJoining(true);
      setError(null);
      
      // Sign in if not already signed in
      if (!user) {
        await signIn(name);
      }
      
      const currentUser = await supabase.auth.getUser();
      if (!currentUser?.data?.user) {
        throw new Error('Failed to authenticate user');
      }
      
      // Join the lobby
      await joinLobby(lobbyId, currentUser.data.user.id, name);
      
      // Save player info to local storage for quick access
      localStorage.setItem('playerName', name);
      localStorage.setItem('lobbyId', lobbyId);
      
      toast({
        title: "Success",
        description: "Successfully joined the lobby!"
      });
      
      // Navigate to the lobby page
      navigate(`/lobby/${lobbyId}`);
    } catch (error) {
      console.error('Error joining lobby:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join lobby';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    } finally {
      setIsJoining(false);
    }
  };
  
  // If there's an error, show it
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-destructive">
          <h2 className="text-2xl font-semibold mb-4 text-destructive">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary text-primary-foreground rounded p-2 hover:bg-primary/90 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <h1 className="text-4xl font-bold mb-2 text-primary">Coup Online</h1>
      <h2 className="text-2xl font-semibold mb-8 text-foreground">Join Lobby</h2>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Game</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinLobby} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your display name"
                disabled={isJoining}
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isJoining}
            >
              {isJoining ? 'Joining...' : 'Join Game'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 