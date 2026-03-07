import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Save, Loader2, Lock, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const dietOptions = [
  { value: 'none', label: 'Aucun (omnivore)', description: 'Pas de restriction alimentaire' },
  { value: 'pescetarian', label: 'Pescétarien', description: 'Pas de viande ni charcuterie' },
  { value: 'vegetarian', label: 'Végétarien', description: 'Pas de viande, charcuterie, poisson ou fruits de mer' },
  { value: 'vegan', label: 'Végétalien', description: 'Aucun produit d\'origine animale' },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState('');
  const [diet, setDiet] = useState<string>('');
  const [showMorningMeals, setShowMorningMeals] = useState(true);
  const [showNoonMeals, setShowNoonMeals] = useState(true);
  const [showEveningMeals, setShowEveningMeals] = useState(true);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDiet(profile.diet || '');
      setShowMorningMeals(profile.show_morning_meals ?? true);
      setShowNoonMeals(profile.show_noon_meals ?? true);
      setShowEveningMeals(profile.show_evening_meals ?? true);
    }
  }, [profile]);

  type DietValue = 'none' | 'pescetarian' | 'vegetarian' | 'vegan' | null;

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async ({ 
      username, 
      diet,
      show_morning_meals,
      show_noon_meals,
      show_evening_meals,
    }: { 
      username: string; 
      diet: DietValue;
      show_morning_meals: boolean;
      show_noon_meals: boolean;
      show_evening_meals: boolean;
    }) => {
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username, 
          diet: diet,
          show_morning_meals,
          show_noon_meals,
          show_evening_meals,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Profil mis à jour',
        description: 'Vos préférences ont été enregistrées.',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la mise à jour.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure at least one meal type is selected
    if (!showMorningMeals && !showNoonMeals && !showEveningMeals) {
      toast({
        title: 'Erreur',
        description: 'Vous devez sélectionner au moins un type de repas.',
        variant: 'destructive',
      });
      return;
    }
    const dietValue: DietValue = diet === '' ? null : (diet as DietValue);
    updateProfile.mutate({ 
      username, 
      diet: dietValue,
      show_morning_meals: showMorningMeals,
      show_noon_meals: showNoonMeals,
      show_evening_meals: showEveningMeals,
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'Erreur',
        description: 'Les nouveaux mots de passe ne correspondent pas.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Erreur',
        description: 'Le nouveau mot de passe doit contenir au moins 6 caractères.',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);

    try {
      // First, verify the current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: 'Erreur',
          description: 'Le mot de passe actuel est incorrect.',
          variant: 'destructive',
        });
        setChangingPassword(false);
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast({
          title: 'Erreur',
          description: updateError.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Mot de passe modifié',
          description: 'Votre mot de passe a été mis à jour avec succès.',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur inattendue s\'est produite.',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Mon profil</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du compte</CardTitle>
            <CardDescription>Gérez vos informations personnelles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Votre nom d'utilisateur"
              />
            </div>
          </CardContent>
        </Card>

        {/* Diet Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Préférences alimentaires</CardTitle>
            <CardDescription>
              Ce régime sera appliqué par défaut pour filtrer les recettes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="diet">Régime alimentaire</Label>
              <Select value={diet} onValueChange={setDiet}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez votre régime" />
                </SelectTrigger>
                <SelectContent>
                  {dietOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {diet && (
                <p className="text-sm text-muted-foreground">
                  {dietOptions.find(o => o.value === diet)?.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meal Planning Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <CardTitle>Planning des repas</CardTitle>
            </div>
            <CardDescription>
              Choisissez les types de repas à afficher dans votre planning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="showMorning"
                  checked={showMorningMeals}
                  onCheckedChange={(checked) => setShowMorningMeals(checked === true)}
                />
                <Label htmlFor="showMorning" className="cursor-pointer">
                  Afficher le matin
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="showNoon"
                  checked={showNoonMeals}
                  onCheckedChange={(checked) => setShowNoonMeals(checked === true)}
                />
                <Label htmlFor="showNoon" className="cursor-pointer">
                  Afficher le midi
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="showEvening"
                  checked={showEveningMeals}
                  onCheckedChange={(checked) => setShowEveningMeals(checked === true)}
                />
                <Label htmlFor="showEvening" className="cursor-pointer">
                  Afficher le soir
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="gradient-warm text-primary-foreground"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </form>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <CardTitle>Modifier le mot de passe</CardTitle>
          </div>
          <CardDescription>
            Changez votre mot de passe en entrant d'abord le mot de passe actuel
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordChange}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <PasswordInput
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirmer le nouveau mot de passe</Label>
              <PasswordInput
                id="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Button 
              type="submit" 
              variant="outline"
              disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
            >
              {changingPassword ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Changer le mot de passe
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};

export default Profile;
