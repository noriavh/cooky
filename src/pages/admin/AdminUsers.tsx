import { useState, useMemo } from 'react';
import { Users as UsersIcon, Search, User, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminUsers } from '@/hooks/useAdminData';
import { includesNormalized } from '@/lib/stringUtils';

const dietLabels: Record<string, string> = {
  none: 'Omnivore',
  pescetarian: 'Pescétarien',
  vegetarian: 'Végétarien',
  vegan: 'Végan',
};

const AdminUsers = () => {
  const { data: users, isLoading } = useAdminUsers();

  const [searchName, setSearchName] = useState('');
  const [filterDiet, setFilterDiet] = useState<string>('all');
  const [filterFamily, setFilterFamily] = useState<string>('all');

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    return users.filter(user => {
      const matchesName = 
        includesNormalized(user.username || '', searchName) ||
        includesNormalized(user.email || '', searchName);
      
      const matchesDiet = filterDiet === 'all' || user.diet === filterDiet;
      
      const matchesFamily = 
        filterFamily === 'all' ||
        (filterFamily === 'solo' && !user.family) ||
        (filterFamily === 'family' && !!user.family);

      return matchesName && matchesDiet && matchesFamily;
    });
  }, [users, searchName, filterDiet, filterFamily]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <UsersIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-muted-foreground text-sm">
            {users?.length || 0} utilisateurs au total
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterDiet} onValueChange={setFilterDiet}>
              <SelectTrigger>
                <SelectValue placeholder="Régime" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les régimes</SelectItem>
                <SelectItem value="none">Omnivore</SelectItem>
                <SelectItem value="pescetarian">Pescétarien</SelectItem>
                <SelectItem value="vegetarian">Végétarien</SelectItem>
                <SelectItem value="vegan">Végan</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterFamily} onValueChange={setFilterFamily}>
              <SelectTrigger>
                <SelectValue placeholder="Famille" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="solo">
                  <span className="flex items-center gap-2">
                    <User className="h-3 w-3" /> Solo
                  </span>
                </SelectItem>
                <SelectItem value="family">
                  <span className="flex items-center gap-2">
                    <Users className="h-3 w-3" /> En famille
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Régime</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {(user.username || user.email || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {user.username || 'Sans nom'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email || '-'}
                    </TableCell>
                    <TableCell>
                      {user.diet ? dietLabels[user.diet] || user.diet : 'Non défini'}
                    </TableCell>
                    <TableCell>
                      {user.family ? (
                        <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
                          <Users className="h-3 w-3" />
                          {user.family.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <User className="h-3 w-3" /> Solo
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
