import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';

export default function Header() {
  const { user, displayName, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="w-full bg-card shadow-sm p-4 border-b border-border">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="text-2xl font-bold text-primary hover:text-primary/90"
            onClick={() => navigate('/')}
          >
            Coup Online
          </Button>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{displayName}</span>
            </span>
            <Button
              variant="ghost"
              className="text-sm text-destructive hover:text-destructive/90"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
} 