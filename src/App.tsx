import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { useState, createContext, useContext } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Recipes from "./pages/Recipes";
import Inspiration from "./pages/Inspiration";
import RecipeForm from "./pages/RecipeForm";
import RecipeDetail from "./pages/RecipeDetail";
import Lists from "./pages/Lists";
import ListDetail from "./pages/ListDetail";
import ShoppingList from "./pages/ShoppingList";
import ShoppingProducts from "./pages/ShoppingProducts";
import GlobalProducts from "./pages/GlobalProducts";
import MealPlanning from "./pages/MealPlanning";
import TypicalWeek from "./pages/TypicalWeek";
import EssentialProducts from "./pages/EssentialProducts";
import Cookiers from "./pages/Cookiers";
import CookierRecipes from "./pages/CookierRecipes";
import AisleOrders from "./pages/AisleOrders";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import Guide from "./pages/Guide";
import SeasonalProducts from "./pages/SeasonalProducts";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminRecipes from "./pages/admin/AdminRecipes";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminSeasonalProducts from "./pages/admin/AdminSeasonalProducts";
import AdminUsers from "./pages/admin/AdminUsers";


const queryClient = new QueryClient();

// Context for search query state
const SearchContext = createContext<{
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}>({
  searchQuery: "",
  setSearchQuery: () => {},
});

export const useSearchContext = () => useContext(SearchContext);

// Layout wrapper component
const LayoutWrapper = () => {
  const { searchQuery, setSearchQuery } = useSearchContext();
  return <AppLayout searchQuery={searchQuery} onSearchChange={setSearchQuery} />;
};

// Root component with providers
const Root = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
            <Toaster />
            <Sonner />
            <Outlet />
          </SearchContext.Provider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Admin routes wrapper with its own provider
const AdminRoot = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Outlet />
        </TooltipProvider>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
};

const router = createBrowserRouter([
  // Admin routes (separate from main app)
  {
    element: <AdminRoot />,
    children: [
      { path: "/admin/login", element: <AdminLogin /> },
      {
        element: <AdminLayout />,
        children: [
          { path: "/admin", element: <AdminRecipes /> },
          { path: "/admin/products", element: <AdminProducts /> },
          { path: "/admin/seasonal-products", element: <AdminSeasonalProducts /> },
          { path: "/admin/users", element: <AdminUsers /> },
        ],
      },
    ],
  },
  // Main app routes
  {
    element: <Root />,
    children: [
      // Cooky auth
      { path: "/auth", element: <Auth /> },
      { path: "/reset-password", element: <ResetPassword /> },
      
      // Cooky routes (default at root)
      {
        element: <LayoutWrapper />,
        children: [
          { index: true, element: <Recipes /> },
          { path: "recipes", element: <Recipes /> },
          { path: "recipes/new", element: <RecipeForm /> },
          { path: "recipes/:id", element: <RecipeDetail /> },
          { path: "recipes/:id/edit", element: <RecipeForm /> },
          { path: "inspiration", element: <Inspiration /> },
          { path: "seasonal-products", element: <SeasonalProducts /> },
          { path: "lists", element: <Lists /> },
          { path: "lists/:id", element: <ListDetail /> },
          { path: "shopping", element: <ShoppingList /> },
          { path: "shopping/essentials", element: <EssentialProducts /> },
          { path: "shopping/products", element: <ShoppingProducts /> },
          { path: "global-products", element: <GlobalProducts /> },
          { path: "meal-planning", element: <MealPlanning /> },
          { path: "typical-week", element: <TypicalWeek /> },
          { path: "aisle-orders", element: <AisleOrders /> },
          { path: "cookiers", element: <Cookiers /> },
          { path: "cookiers/:cookierId/recipes", element: <CookierRecipes /> },
          { path: "profile", element: <Profile /> },
          { path: "guide", element: <Guide /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
