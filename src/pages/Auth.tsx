import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import cookyLogo from '@/assets/cooky-logo.png';
import { ArrowLeft } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot-password';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Erreur de connexion",
            description: error.message === 'Invalid login credentials' 
              ? "Email ou mot de passe incorrect" 
              : error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Bienvenue !",
            description: "Connexion réussie",
          });
          navigate('/');
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, username);
        if (error) {
          toast({
            title: "Erreur d'inscription",
            description: error.message.includes('already registered') 
              ? "Cet email est déjà utilisé" 
              : error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Compte créé !",
            description: "Bienvenue dans la communauté Cooky",
          });
          navigate('/');
        }
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email envoyé !",
          description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe.",
        });
        setMode('login');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderForgotPasswordForm = () => (
    <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMode('login')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-display">
            Mot de passe oublié
          </CardTitle>
        </div>
        <CardDescription className="text-center">
          Entrez votre email pour recevoir un lien de réinitialisation
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleForgotPassword}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background/50"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            type="submit" 
            className="w-full gradient-warm text-primary-foreground hover:opacity-90 transition-opacity"
            disabled={loading}
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );

  const renderAuthForm = () => (
    <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-display text-center">
          {mode === 'login' ? 'Connexion' : 'Inscription'}
        </CardTitle>
        <CardDescription className="text-center">
          {mode === 'login'
            ? 'Connectez-vous pour retrouver vos recettes' 
            : 'Créez votre compte pour commencer à cuisiner'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                type="text"
                placeholder="Votre pseudo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background/50"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-background/50"
            />
          </div>
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setMode('forgot-password')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Mot de passe oublié ?
            </button>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            type="submit" 
            className="w-full gradient-warm text-primary-foreground hover:opacity-90 transition-opacity"
            disabled={loading}
          >
            {loading 
              ? 'Chargement...' 
              : mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {mode === 'login'
              ? "Pas encore de compte ? S'inscrire" 
              : 'Déjà un compte ? Se connecter'}
          </button>
        </CardFooter>
      </form>
    </Card>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.img 
            src={cookyLogo} 
            alt="Cooky" 
            className="w-24 h-24 mb-4"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <h1 className="text-3xl font-display font-bold text-gradient">Cooky</h1>
          <p className="text-muted-foreground mt-2">Partagez vos recettes avec vos proches</p>
        </div>

        {mode === 'forgot-password' ? renderForgotPasswordForm() : renderAuthForm()}
      </motion.div>
    </div>
  );
};

export default Auth;
