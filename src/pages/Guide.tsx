import { useSearchParams } from 'react-router-dom';
import {
  ChefHat, 
  CalendarDays, 
  ShoppingCart, 
  Package, 
  Users, 
  Star,
  Sparkles,
  List,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  content: React.ReactNode;
}

const GuideSectionRecipes = () => (
  <div className="space-y-6">
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Créer une recette</h3>
      <p className="text-muted-foreground">
        Vous pouvez créer vos recettes de plusieurs façons :
      </p>
      <ul className="space-y-2 text-muted-foreground">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <span><strong>Manuellement</strong> : Remplissez le formulaire avec le titre, les ingrédients et les étapes</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <span><strong>Depuis une URL</strong> : Collez le lien d'un site de recettes et laissez Cooky extraire les informations</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <span><strong>Depuis une photo</strong> : Prenez en photo une recette de livre ou magazine</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <span><strong>Par la voix</strong> : Dictez votre recette et Cooky la transcrit</span>
        </li>
      </ul>
    </div>
    
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Lier les ingrédients aux produits</h3>
      <p className="text-muted-foreground">
        Pour chaque ingrédient, vous pouvez le lier à un produit de votre base de données. 
        Cela permet ensuite d'ajouter automatiquement les ingrédients à votre liste de courses !
      </p>
    </div>

    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Organiser avec les tags</h3>
      <p className="text-muted-foreground">
        Utilisez les tags pour classer vos recettes (végétarien, rapide, familial...). 
        Vous pouvez ensuite filtrer par tag dans la liste des recettes.
      </p>
    </div>
  </div>
);

const GuideSectionInspiration = () => (
  <div className="space-y-6">
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Découvrir de nouvelles recettes</h3>
      <p className="text-muted-foreground">
        La page Inspiration vous permet de découvrir les recettes partagées par vos Cookiers 
        (amis et famille). Parcourez leurs créations et copiez celles qui vous plaisent dans votre collection.
      </p>
    </div>

    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Copier une recette</h3>
      <p className="text-muted-foreground">
        Quand vous trouvez une recette qui vous plaît, cliquez sur "Copier" pour l'ajouter à vos recettes. 
        Vous pourrez ensuite la modifier selon vos goûts.
      </p>
    </div>
  </div>
);

const GuideSectionLists = () => (
  <div className="space-y-6">
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Créer des listes thématiques</h3>
      <p className="text-muted-foreground">
        Organisez vos recettes en listes : "Recettes d'été", "Repas de fête", "Recettes express"... 
        Chaque liste peut contenir autant de recettes que vous le souhaitez.
      </p>
    </div>

    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Partager des listes</h3>
      <p className="text-muted-foreground">
        Partagez vos listes avec d'autres utilisateurs pour leur donner accès à votre sélection de recettes.
      </p>
    </div>
  </div>
);

const GuideSectionMealPlanning = () => (
  <div className="space-y-6">
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Planifier vos repas</h3>
      <p className="text-muted-foreground">
        La page "Ma semaine" vous permet de planifier vos repas jour par jour. 
        Glissez vos recettes dans les créneaux du petit-déjeuner, déjeuner, goûter ou dîner.
      </p>
    </div>

    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Semaine type</h3>
      <p className="text-muted-foreground">
        Créez une semaine type avec vos repas habituels (ex: pâtes le lundi, poisson le vendredi). 
        Vous pouvez ensuite l'appliquer en un clic à n'importe quelle semaine.
      </p>
    </div>

    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Générer la liste de courses</h3>
      <p className="text-muted-foreground">
        Une fois votre semaine planifiée, générez automatiquement la liste de courses avec tous les 
        ingrédients nécessaires. Cooky regroupe les quantités et trie par rayon !
      </p>
    </div>
  </div>
);

const GuideSectionShopping = () => (
  <div className="space-y-6">
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Liste de courses intelligente</h3>
      <p className="text-muted-foreground">
        Votre liste de courses est triée automatiquement par rayon de supermarché. 
        Cochez les articles au fur et à mesure de vos achats.
      </p>
    </div>

    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Ajouter des articles</h3>
      <p className="text-muted-foreground">
        Ajoutez des articles manuellement ou depuis vos recettes. 
        Les produits liés aux ingrédients sont automatiquement reconnus.
      </p>
    </div>

    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Partage familial</h3>
      <p className="text-muted-foreground">
        Si vous faites partie d'une famille, la liste de courses est partagée. 
        Tous les membres peuvent ajouter des articles et voir les mises à jour en temps réel.
      </p>
    </div>
  </div>
);

const GuideSectionProducts = () => (
  <div className="space-y-6">
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Gérer vos produits</h3>
      <p className="text-muted-foreground">
        La page Produits vous permet de gérer votre base de produits personnelle. 
        Chaque produit peut être associé à un rayon et une unité par défaut.
      </p>
    </div>

    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Produits globaux</h3>
      <p className="text-muted-foreground">
        Les produits globaux sont partagés par tous les utilisateurs de Cooky. 
        Quand vous créez un produit, vous pouvez demander à ce qu'il soit ajouté aux produits globaux.
      </p>
    </div>
  </div>
);

const GuideSectionEssentials = () => (
  <div className="space-y-6">
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Produits essentiels</h3>
      <p className="text-muted-foreground">
        Définissez les produits que vous achetez régulièrement (lait, pain, œufs...). 
        Vous pourrez ensuite les ajouter en un clic à votre liste de courses.
      </p>
    </div>

    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Quantités par défaut</h3>
      <p className="text-muted-foreground">
        Pour chaque produit essentiel, définissez la quantité habituelle. 
        Par exemple : 6 œufs, 2 litres de lait...
      </p>
    </div>
  </div>
);

const GuideSectionCookiers = () => (
  <div className="space-y-6">
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Qu'est-ce qu'un Cookier ?</h3>
      <p className="text-muted-foreground">
        Les Cookiers sont vos amis et votre famille sur Cooky. 
        En devenant Cookiers, vous pouvez partager vos recettes mutuellement.
      </p>
    </div>

    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Ajouter un Cookier</h3>
      <p className="text-muted-foreground">
        Recherchez un utilisateur par son nom d'utilisateur ou email et envoyez-lui une invitation. 
        Une fois acceptée, vous pourrez voir ses recettes partagées.
      </p>
    </div>

    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-foreground">Partage des recettes</h3>
      <p className="text-muted-foreground">
        Vous choisissez quelles recettes partager avec vos Cookiers. 
        Par défaut, vos recettes restent privées.
      </p>
    </div>
  </div>
);

const guideSections: GuideSection[] = [
  {
    id: 'recettes',
    title: 'Mes Recettes',
    icon: ChefHat,
    description: 'Créez et gérez vos recettes',
    content: <GuideSectionRecipes />
  },
  {
    id: 'inspiration',
    title: 'Inspiration',
    icon: Sparkles,
    description: 'Découvrez les recettes de vos Cookiers',
    content: <GuideSectionInspiration />
  },
  {
    id: 'listes',
    title: 'Mes Listes',
    icon: List,
    description: 'Organisez vos recettes en collections',
    content: <GuideSectionLists />
  },
  {
    id: 'planification',
    title: 'Planification',
    icon: CalendarDays,
    description: 'Planifiez vos repas de la semaine',
    content: <GuideSectionMealPlanning />
  },
  {
    id: 'courses',
    title: 'Liste de courses',
    icon: ShoppingCart,
    description: 'Gérez vos courses efficacement',
    content: <GuideSectionShopping />
  },
  {
    id: 'produits',
    title: 'Produits',
    icon: Package,
    description: 'Gérez votre base de produits',
    content: <GuideSectionProducts />
  },
  {
    id: 'essentiels',
    title: 'Mes Essentiels',
    icon: Star,
    description: 'Vos produits du quotidien',
    content: <GuideSectionEssentials />
  },
  {
    id: 'cookiers',
    title: 'Mes Cookiers',
    icon: Users,
    description: 'Connectez-vous avec vos proches',
    content: <GuideSectionCookiers />
  },
];

const Guide = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSectionId = searchParams.get('section') || 'recettes';

  const currentSectionIndex = guideSections.findIndex(s => s.id === currentSectionId);
  const currentSection = guideSections[currentSectionIndex] || guideSections[0];
  const hasPrev = currentSectionIndex > 0;
  const hasNext = currentSectionIndex < guideSections.length - 1;

  const goToSection = (sectionId: string) => {
    setSearchParams({ section: sectionId });
  };

  const goToPrev = () => {
    if (hasPrev) {
      goToSection(guideSections[currentSectionIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      goToSection(guideSections[currentSectionIndex + 1].id);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-4 lg:py-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 min-w-0">
        <BookOpen className="w-6 h-6 lg:w-8 lg:h-8 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold truncate">Guide d'utilisation</h1>
          <p className="text-sm text-muted-foreground">Apprenez à utiliser Cooky</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Navigation sidebar - horizontal on mobile */}
        <Card className="lg:col-span-1 overflow-hidden">
          <CardHeader className="pb-2 lg:pb-3 px-3 lg:px-6">
            <CardTitle className="text-sm lg:text-base">Sections</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <nav className="flex lg:flex-col gap-1 p-2 lg:p-3 lg:pt-0 w-max lg:w-full">
              {guideSections.map((section, index) => {
                const Icon = section.icon;
                const isActive = section.id === currentSectionId;
                return (
                  <button
                    key={section.id}
                    onClick={() => goToSection(section.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors whitespace-nowrap shrink-0 lg:w-full",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                  >
                    <span className={cn(
                      "flex items-center justify-center w-5 h-5 lg:w-6 lg:h-6 rounded-full text-xs font-medium shrink-0",
                      isActive ? "bg-primary-foreground/20" : "bg-muted"
                    )}>
                      {index + 1}
                    </span>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs lg:text-sm font-medium">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Content area */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="px-4 lg:px-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <currentSection.icon className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base lg:text-lg">{currentSection.title}</CardTitle>
                  <CardDescription className="text-xs lg:text-sm">{currentSection.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 lg:px-6">
              {currentSection.content}
            </CardContent>
          </Card>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrev}
              disabled={!hasPrev}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Précédent</span>
            </Button>

            <div className="hidden sm:flex items-center gap-1.5">
              {guideSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => goToSection(section.id)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    section.id === currentSectionId 
                      ? "bg-primary" 
                      : "bg-muted hover:bg-muted-foreground/50"
                  )}
                  aria-label={`Aller à ${section.title}`}
                />
              ))}
            </div>

            <span className="sm:hidden text-xs text-muted-foreground">
              {currentSectionIndex + 1}/{guideSections.length}
            </span>

            <Button
              size="sm"
              onClick={goToNext}
              disabled={!hasNext}
              className="shrink-0"
            >
              <span className="hidden sm:inline">Suivant</span>
              <ArrowRight className="w-4 h-4 sm:ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide;
