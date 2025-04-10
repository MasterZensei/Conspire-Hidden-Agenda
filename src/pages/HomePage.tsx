import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLobbies } from '../hooks/useSupabase';
import { signInWithEmail } from '../lib/supabaseClient';
import { GameSettings } from '../lib/supabaseClient';
import { supabase } from '../lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '../hooks/use-toast';

export default function HomePage() {
  const { user, signIn, displayName } = useAuth();
  const { createLobby } = useLobbies();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [name, setName] = useState(displayName || '');
  const [email, setEmail] = useState('');
  const [useDemo, setUseDemo] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [lobbyName, setLobbyName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [joinLobbyId, setJoinLobbyId] = useState('');
  
  // State for expansion toggles
  const [useReformation, setUseReformation] = useState(false);
  const [useInquisitor, setUseInquisitor] = useState(false);
  const [useAnarchy, setUseAnarchy] = useState(false);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a display name"
      });
      return;
    }

    if (!useDemo && !email.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an email or use demo mode"
      });
      return;
    }
    
    try {
      setIsSigningIn(true);
      
      if (useDemo) {
        // Use the demo mode (anonymous sign-in)
        await signIn(name);
        toast({
          title: "Success",
          description: "Signed in successfully with demo mode!"
        });
      } else {
        // Use email sign-in
        await signInWithEmail(email);
        setEmailSent(true);
        toast({
          title: "Success",
          description: "Magic link sent to your email!"
        });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign in. Please try again."
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateLobby = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to create a lobby"
      });
      return;
    }
    
    if (!lobbyName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a lobby name"
      });
      return;
    }
    
    try {
      setIsCreatingLobby(true);
      
      console.log('Creating lobby with user:', user);
      console.log('Display name is:', displayName);
      
      // Ensure we have a valid user ID and session
      if (!user.id) {
        console.error('User has no ID');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Authentication issue. Please try signing in again."
        });
        return;
      }
      
      // Check if we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Authentication error. Please try signing in again."
        });
        return;
      }
      if (!session) {
        console.error('No active session');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in again to create a lobby"
        });
        return;
      }
      
      // Check if we have a displayName
      if (!displayName) {
        console.warn('No display name found, using default');
      }
      
      // Define game settings
      const gameSettings: GameSettings = {
        expansions: {
          reformation: useReformation,
          inquisitor: useInquisitor,
          anarchy: useAnarchy
        },
        startingCoins: 2, // Default
        maxPlayers
      };
      
      // Add user metadata
      const metadata = {
        displayName: displayName || 'Player',
        userId: user.id
      };
      
      const lobby = await createLobby(lobbyName, user.id, gameSettings, metadata);
      toast({
        title: "Success",
        description: "Lobby created successfully!"
      });
      
      // Store lobby ID in session storage as fallback
      try {
        sessionStorage.setItem('lastCreatedLobbyId', lobby.id);
        sessionStorage.setItem('lastCreatedLobbyName', lobby.name);
      } catch (err) {
        console.warn('Could not store lobby info in session storage:', err);
      }
      
      // Navigate to the lobby
      navigate(`/lobby/${lobby.id}`);
    } catch (error: any) {
      console.error('Create lobby error:', error);
      
      // Check for specific permission errors
      if (error?.message?.includes('permission denied') || error?.code === '42501') {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Permission denied. Please try signing in again."
        });
      } else if (error?.code === '23505') {
        toast({
          variant: "destructive",
          title: "Error",
          description: "A lobby with this name already exists."
        });
      } else if (error?.message?.includes('No active session')) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in again to create a lobby"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create lobby. Please try again."
        });
      }
    } finally {
      setIsCreatingLobby(false);
    }
  };

  const handleJoinLobby = async () => {
    if (!joinLobbyId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a lobby ID"
      });
      return;
    }
    
    try {
      navigate(`/join/${joinLobbyId}`);
    } catch (error) {
      console.error('Error joining lobby:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to join lobby. Please try again."
      });
    }
  };

  return (
    <div className="px-4">
      <h1 className="text-4xl font-bold mb-8 text-primary">Coup Online</h1>
      
      {!user ? (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          
          {emailSent ? (
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-md text-center">
                <p className="text-primary font-medium">Magic link sent to your email!</p>
                <p className="text-sm text-muted-foreground mt-2">Check your inbox and click the link to sign in.</p>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setEmailSent(false)}
              >
                Back to Sign In
              </Button>
            </CardContent>
          ) : (
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your display name"
                    disabled={isSigningIn}
                    required
                  />
                </div>
                
                {!useDemo && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      disabled={isSigningIn}
                      required={!useDemo}
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useDemo"
                    checked={useDemo}
                    onCheckedChange={(checked) => setUseDemo(checked === true)}
                    disabled={isSigningIn}
                  />
                  <Label htmlFor="useDemo">
                    Use Demo Mode (No Email Required)
                  </Label>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSigningIn}
                >
                  {isSigningIn ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Lobby</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateLobby} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lobbyName">Lobby Name</Label>
                  <Input
                    id="lobbyName"
                    type="text"
                    value={lobbyName}
                    onChange={(e) => setLobbyName(e.target.value)}
                    placeholder="Enter lobby name"
                    disabled={isCreatingLobby}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxPlayers">Max Players</Label>
                  <Input
                    id="maxPlayers"
                    type="number"
                    min={2}
                    max={6}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    disabled={isCreatingLobby}
                    required
                  />
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Game Settings</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useReformation"
                        checked={useReformation}
                        onCheckedChange={(checked) => setUseReformation(checked === true)}
                        disabled={isCreatingLobby}
                      />
                      <Label htmlFor="useReformation">Use Reformation Expansion</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useInquisitor"
                        checked={useInquisitor}
                        onCheckedChange={(checked) => setUseInquisitor(checked === true)}
                        disabled={isCreatingLobby}
                      />
                      <Label htmlFor="useInquisitor">Use Inquisitor Variant</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useAnarchy"
                        checked={useAnarchy}
                        onCheckedChange={(checked) => setUseAnarchy(checked === true)}
                        disabled={isCreatingLobby}
                      />
                      <Label htmlFor="useAnarchy">Use Anarchy Variant</Label>
                    </div>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isCreatingLobby}
                >
                  {isCreatingLobby ? 'Creating Lobby...' : 'Create Lobby'}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Join Existing Lobby</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinLobbyId">Lobby ID</Label>
                  <Input
                    id="joinLobbyId"
                    type="text"
                    value={joinLobbyId}
                    onChange={(e) => setJoinLobbyId(e.target.value)}
                    placeholder="Enter lobby ID"
                  />
                </div>
                
                <Button
                  onClick={handleJoinLobby}
                  className="w-full"
                  variant="secondary"
                >
                  Join Lobby
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 