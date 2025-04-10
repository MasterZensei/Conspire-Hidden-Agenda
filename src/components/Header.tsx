import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
          <button 
            onClick={() => navigate('/')}
            className="text-2xl font-bold text-primary hover:text-primary/90 transition"
          >
            Coup Online
          </button>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{displayName}</span>
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-destructive hover:text-destructive/90 transition"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
} 