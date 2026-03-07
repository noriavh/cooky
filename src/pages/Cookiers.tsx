import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, UserPlus, Check, X, Trash2, Loader2, ChefHat, Share2, Users, LogOut, Edit2, AlertTriangle, Shield, ShieldOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCookiers,
  usePendingRequests,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useRemoveCookier,
  useToggleRecipeSharing,
} from '@/hooks/useCookiers';
import {
  useUserFamily,
  useFamilyMembers,
  usePendingFamilyInvitations,
  useCreateFamily,
  useInviteToFamily,
  useAcceptFamilyInvitation,
  useRejectFamilyInvitation,
  useRemoveFamilyMember,
  useLeaveFamily,
  useUpdateFamilyName,
} from '@/hooks/useFamilies';
import {
  useCanManageAdmins,
  useUsersAdminStatus,
  usePromoteToAdmin,
  useDemoteFromAdmin,
} from '@/hooks/useUserRole';

interface SearchResult {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

const Cookiers = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [familySearchQuery, setFamilySearchQuery] = useState('');
  const [familySearchResult, setFamilySearchResult] = useState<SearchResult | null>(null);
  const [isFamilySearching, setIsFamilySearching] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState(false);
  const [editFamilyName, setEditFamilyName] = useState('');
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);

  // Cookiers hooks
  const { data: cookiers, isLoading: cookiersLoading } = useCookiers();
  const { data: pendingRequests, isLoading: pendingLoading } = usePendingRequests();

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const removeCookier = useRemoveCookier();
  const toggleSharing = useToggleRecipeSharing();

  // Family hooks
  const { data: family, isLoading: familyLoading } = useUserFamily();
  const { data: familyMembers, isLoading: membersLoading } = useFamilyMembers(family?.id);
  const { data: familyInvitations } = usePendingFamilyInvitations();

  const createFamily = useCreateFamily();
  const inviteToFamily = useInviteToFamily();
  const acceptFamilyInvitation = useAcceptFamilyInvitation();
  const rejectFamilyInvitation = useRejectFamilyInvitation();
  const removeFamilyMember = useRemoveFamilyMember();
  const leaveFamily = useLeaveFamily();
  const updateFamilyName = useUpdateFamilyName();

  // Admin management hooks (only for benoit.valkenberg@gmail.com)
  const canManageAdmins = useCanManageAdmins();
  const promoteToAdmin = usePromoteToAdmin();
  const demoteFromAdmin = useDemoteFromAdmin();

  // Get all cookier user IDs and family member IDs to check their admin status
  const allUserIdsToCheck = useMemo(() => {
    const ids: string[] = [];
    if (cookiers && user) {
      cookiers.forEach(c => ids.push(c.user_id === user.id ? c.cookier_id : c.user_id));
    }
    if (familyMembers) {
      familyMembers.forEach(m => {
        if (!ids.includes(m.user_id)) {
          ids.push(m.user_id);
        }
      });
    }
    return ids;
  }, [cookiers, user, familyMembers]);

  const { data: adminStatusMap } = useUsersAdminStatus(allUserIdsToCheck);

  // Search for user by exact email or username match
  const handleSearch = async (query: string, isForFamily: boolean = false) => {
    if (isForFamily) {
      setFamilySearchQuery(query);
    } else {
      setSearchQuery(query);
    }

    if (!query.trim() || !user) {
      if (isForFamily) {
        setFamilySearchResult(null);
      } else {
        setSearchResult(null);
      }
      return;
    }

    if (isForFamily) {
      setIsFamilySearching(true);
    } else {
      setIsSearching(true);
    }

    try {
      const { data, error } = await supabase.functions.invoke('search-user', {
        body: {
          query: query.trim(),
          currentUserId: user.id,
        },
      });

      if (error) throw error;

      if (isForFamily) {
        setFamilySearchResult(data?.user || null);
      } else {
        setSearchResult(data?.user || null);
      }
    } catch (error) {
      console.error('Search error:', error);
      if (isForFamily) {
        setFamilySearchResult(null);
      } else {
        setSearchResult(null);
      }
    } finally {
      if (isForFamily) {
        setIsFamilySearching(false);
      } else {
        setIsSearching(false);
      }
    }
  };

  const handleSendRequest = (userId: string) => {
    sendRequest.mutate(userId);
    setSearchQuery('');
    setSearchResult(null);
  };

  const handleInviteToFamily = (userId: string) => {
    if (family) {
      inviteToFamily.mutate({ familyId: family.id, invitedUserId: userId });
      setFamilySearchQuery('');
      setFamilySearchResult(null);
    }
  };

  const handleCreateFamily = () => {
    if (newFamilyName.trim()) {
      createFamily.mutate(newFamilyName.trim());
      setNewFamilyName('');
      setIsCreateFamilyOpen(false);
    }
  };

  const handleUpdateFamilyName = () => {
    if (family && editFamilyName.trim()) {
      updateFamilyName.mutate({ familyId: family.id, name: editFamilyName.trim() });
      setIsEditNameOpen(false);
    }
  };

  const getInitials = (username: string | null) => {
    return username?.substring(0, 2).toUpperCase() || '??';
  };

  const hasFamily = !!family;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Mes Cookiers</h1>
        </div>
      </div>

      {/* Pending Family Invitations */}
      {familyInvitations && familyInvitations.length > 0 && !hasFamily && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="w-5 h-5 shrink-0" />
              <span className="truncate">Invitations famille</span>
              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full shrink-0">
                {familyInvitations.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <AlertDescription className="text-sm">
                <strong>Attention :</strong> En rejoignant une famille, votre liste de courses et votre planning seront perdus.
              </AlertDescription>
            </Alert>
            {familyInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(invitation.profile?.username || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {invitation.profile?.username || 'Utilisateur'} vous invite
                    </p>
                    <p className="text-sm text-primary font-semibold truncate">
                      {invitation.family?.name || 'Famille'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => acceptFamilyInvitation.mutate(invitation.id)}
                    disabled={acceptFamilyInvitation.isPending}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectFamilyInvitation.mutate(invitation.id)}
                    disabled={rejectFamilyInvitation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={hasFamily ? "family" : "cookiers"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="family" className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Ma famille</span>
          </TabsTrigger>
          <TabsTrigger value="cookiers" className="flex items-center gap-2 min-w-0">
            <ChefHat className="w-4 h-4 shrink-0" />
            <span className="truncate">Mes Cookiers</span>
          </TabsTrigger>
        </TabsList>

        {/* FAMILY TAB */}
        <TabsContent value="family" className="space-y-6 mt-6">
          {!hasFamily ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  Créer une famille
                </CardTitle>
                <CardDescription>
                  Une famille permet de partager toutes vos recettes, listes, produits et plannings avec vos proches.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-muted/50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Attention :</strong> En créant une famille, votre liste de courses et votre planning seront réinitialisés.
                    Vos recettes, listes, tags et produits seront partagés avec tous les membres de la famille.
                  </AlertDescription>
                </Alert>

                <Dialog open={isCreateFamilyOpen} onOpenChange={setIsCreateFamilyOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Users className="w-4 h-4 mr-2" />
                      Créer une famille
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer une famille</DialogTitle>
                      <DialogDescription>
                        Choisissez un nom pour votre famille. Vous pourrez ensuite inviter des membres.
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      placeholder="Nom de la famille..."
                      value={newFamilyName}
                      onChange={(e) => setNewFamilyName(e.target.value)}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateFamilyOpen(false)}>
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleCreateFamily}
                        disabled={!newFamilyName.trim() || createFamily.isPending}
                      >
                        {createFamily.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Créer
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Family Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 sm:p-3 rounded-full bg-primary/10 shrink-0">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg sm:text-xl truncate">{family.name}</CardTitle>
                        <CardDescription>
                          {familyMembers?.length || 0} membre{(familyMembers?.length || 0) > 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setEditFamilyName(family.name)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Modifier le nom</DialogTitle>
                          </DialogHeader>
                          <Input
                            value={editFamilyName}
                            onChange={(e) => setEditFamilyName(e.target.value)}
                          />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditNameOpen(false)}>
                              Annuler
                            </Button>
                            <Button 
                              onClick={handleUpdateFamilyName}
                              disabled={updateFamilyName.isPending}
                            >
                              Enregistrer
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <LogOut className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Quitter la famille ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Une copie de toutes les recettes, listes, tags et produits de la famille sera créée dans votre compte personnel.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => leaveFamily.mutate(family.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Quitter
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Invite to Family */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserPlus className="w-5 h-5" />
                    Inviter un membre
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Rechercher par nom d'utilisateur ou email..."
                        value={familySearchQuery}
                        onChange={(e) => handleSearch(e.target.value, true)}
                        className="pl-10"
                      />
                    </div>

                    {isFamilySearching && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    )}

                    {familySearchResult && !isFamilySearching && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(familySearchResult.username)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{familySearchResult.username || 'Utilisateur'}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleInviteToFamily(familySearchResult.id)}
                            disabled={inviteToFamily.isPending}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Inviter
                          </Button>
                        </div>
                      </div>
                    )}

                    {familySearchQuery && !isFamilySearching && !familySearchResult && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun utilisateur trouvé.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Family Members List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Membres ({familyMembers?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {membersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : familyMembers && familyMembers.length > 0 ? (
                    <div className="space-y-3">
                      {familyMembers.map((member) => {
                        const isMemberAdmin = adminStatusMap?.get(member.user_id) || false;
                        return (
                          <div
                            key={member.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Avatar className="w-10 h-10 shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getInitials(member.profile?.username || null)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium truncate">
                                    {member.profile?.username || 'Utilisateur'}
                                    {member.user_id === user?.id && (
                                      <span className="text-muted-foreground text-sm ml-2">(vous)</span>
                                    )}
                                  </p>
                                  {isMemberAdmin && (
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      <Shield className="w-3 h-3 mr-1" />
                                      Admin
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  Membre depuis {new Date(member.joined_at).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              {/* Admin management - only for benoit.valkenberg@gmail.com */}
                              {canManageAdmins && member.user_id !== user?.id && (
                                isMemberAdmin ? (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                      >
                                        <ShieldOff className="w-4 h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">Retirer admin</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Retirer les droits admin ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {member.profile?.username} ne pourra plus gérer les produits globaux.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => demoteFromAdmin.mutate(member.user_id)}
                                          className="bg-amber-600 text-white hover:bg-amber-700"
                                        >
                                          Retirer
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                ) : (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        <Shield className="w-4 h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">Nommer admin</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Nommer admin ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {member.profile?.username} pourra gérer les produits globaux et les demandes de produits.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => promoteToAdmin.mutate(member.user_id)}
                                          className="bg-green-600 text-white hover:bg-green-700"
                                        >
                                          Nommer
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )
                              )}
                              {member.user_id !== user?.id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {member.profile?.username} sera retiré de la famille.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => removeFamilyMember.mutate({ memberId: member.id, userId: member.user_id })}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Retirer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Vous êtes seul dans cette famille.</p>
                      <p className="text-sm mt-1">Invitez des membres pour partager vos recettes !</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* COOKIERS TAB */}
        <TabsContent value="cookiers" className="space-y-6 mt-6">
          {/* Add Cookier Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="w-5 h-5" />
                Ajouter un Cookier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Rechercher par nom d'utilisateur ou adresse email exacte..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {isSearching && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {searchResult && !isSearching && (
                  <div className="space-y-2">
                    <div
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(searchResult.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{searchResult.username || 'Utilisateur'}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendRequest(searchResult.id)}
                        disabled={sendRequest.isPending}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </div>
                  </div>
                )}

                {searchQuery && !isSearching && !searchResult && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun utilisateur trouvé. Entrez le nom d'utilisateur ou l'email exact.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Requests Section */}
          {pendingRequests && pendingRequests.length > 0 && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  Demandes en attente
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    {pendingRequests.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(request.profile?.username || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.profile?.username || 'Utilisateur'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => acceptRequest.mutate(request.id)}
                          disabled={acceptRequest.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectRequest.mutate(request.id)}
                          disabled={rejectRequest.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cookiers List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mes Cookiers ({cookiers?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {cookiersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : cookiers && cookiers.length > 0 ? (
                <div className="space-y-4">
                  {cookiers.map((cookier) => {
                    const cookierUserId = cookier.user_id === user?.id ? cookier.cookier_id : cookier.user_id;
                    const isUserAdmin = adminStatusMap?.get(cookierUserId) || false;
                    return (
                      <div
                        key={cookier.id}
                        className="flex flex-col gap-3 p-3 sm:p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        {/* User info row */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(cookier.profile?.username || null)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{cookier.profile?.username || 'Utilisateur'}</p>
                                {isUserAdmin && (
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Admin
                                  </Badge>
                                )}
                              </div>
                              {cookier.sharesRecipesWithMe && (
                                <Link 
                                  to={`/cookiers/${cookierUserId}/recipes`}
                                  className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                  <ChefHat className="w-3 h-3 shrink-0" />
                                  <span className="truncate">Voir ses recettes</span>
                                </Link>
                              )}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => removeCookier.mutate(cookier.id)}
                            disabled={removeCookier.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Actions row */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          {/* Toggle pour partager mes recettes */}
                          <div className="flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground">Partager</span>
                            <Switch
                              checked={cookier.iShareRecipesWithThem}
                              onCheckedChange={() => toggleSharing.mutate({
                                cookierRelationId: cookier.id,
                                currentlySharing: cookier.iShareRecipesWithThem
                              })}
                              disabled={toggleSharing.isPending}
                            />
                          </div>

                          {/* Admin management - only visible to benoit.valkenberg@gmail.com */}
                          {canManageAdmins && (
                            isUserAdmin ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  >
                                    <ShieldOff className="w-4 h-4 sm:mr-1" />
                                    <span className="hidden sm:inline">Retirer admin</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Retirer les droits admin ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {cookier.profile?.username} ne pourra plus gérer les produits globaux.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => demoteFromAdmin.mutate(cookierUserId)}
                                      className="bg-amber-600 text-white hover:bg-amber-700"
                                    >
                                      Retirer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <Shield className="w-4 h-4 sm:mr-1" />
                                    <span className="hidden sm:inline">Nommer admin</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Nommer admin ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {cookier.profile?.username} pourra gérer les produits globaux et les demandes de produits.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => promoteToAdmin.mutate(cookierUserId)}
                                      className="bg-green-600 text-white hover:bg-green-700"
                                    >
                                      Nommer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Vous n'avez pas encore de Cookiers.</p>
                  <p className="text-sm mt-1">Ajoutez des amis pour partager vos recettes !</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Cookiers;