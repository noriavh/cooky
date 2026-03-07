import { useState } from 'react';
import { ChevronDown, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import type { Recipe } from '@/hooks/useRecipes';

interface BulkActionsMenuProps {
  selectedRecipes: Recipe[];
  onActionComplete?: () => void;
}

const difficultyLabels: Record<string, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
};

const recipeTypeLabels: Record<string, string> = {
  apero: 'Apéro',
  entree: 'Entrée',
  soupe: 'Soupe',
  plat: 'Plat',
  dessert: 'Dessert',
  boisson: 'Boisson',
};

const COLORS = {
  primary: { r: 229, g: 100, b: 51 },
  gold: { r: 230, g: 176, b: 61 },
  cream: { r: 249, g: 244, b: 236 },
  brown: { r: 51, g: 42, b: 38 },
  mutedText: { r: 115, g: 99, b: 87 },
  border: { r: 224, g: 214, b: 204 },
  lightGray: { r: 245, g: 245, b: 245 },
};

const loadImageWithDimensions = (url: string): Promise<{ base64: string; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({
          base64: canvas.toDataURL('image/jpeg', 0.8),
          width: img.width,
          height: img.height,
        });
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const BulkActionsMenu = ({ selectedRecipes, onActionComplete }: BulkActionsMenuProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRecipeBook = async () => {
    if (selectedRecipes.length === 0) return;
    
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      // ===== PAGE 1: COVER =====
      // Background cream color
      doc.setFillColor(COLORS.cream.r, COLORS.cream.g, COLORS.cream.b);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Decorative border
      doc.setDrawColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.setLineWidth(2);
      doc.rect(15, 15, pageWidth - 30, pageHeight - 30, 'S');

      // Inner decorative line
      doc.setDrawColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
      doc.setLineWidth(0.5);
      doc.rect(18, 18, pageWidth - 36, pageHeight - 36, 'S');

      // Logo "Cooky" centered
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(48);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text('Cooky', pageWidth / 2, pageHeight / 2 - 30, { align: 'center' });

      // Gold underline
      doc.setDrawColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
      doc.setLineWidth(2);
      doc.line(pageWidth / 2 - 40, pageHeight / 2 - 22, pageWidth / 2 + 40, pageHeight / 2 - 22);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
      doc.text('Mon livre de recettes', pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

      // Recipe count
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(COLORS.mutedText.r, COLORS.mutedText.g, COLORS.mutedText.b);
      doc.text(`${selectedRecipes.length} recette${selectedRecipes.length > 1 ? 's' : ''}`, pageWidth / 2, pageHeight / 2 + 25, { align: 'center' });

      // Date
      const date = new Date().toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.setFontSize(10);
      doc.text(date, pageWidth / 2, pageHeight - 40, { align: 'center' });

      // ===== PAGE 2: TABLE OF CONTENTS =====
      doc.addPage();
      
      let y = margin;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text('Table des matières', margin, y + 8);

      // Gold underline
      doc.setDrawColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
      doc.setLineWidth(1.5);
      doc.line(margin, y + 14, margin + 80, y + 14);

      y += 30;

      // List recipes with page numbers
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);

      selectedRecipes.forEach((recipe, index) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
        }

        const pageNum = index + 3; // Cover + TOC + index
        
        // Recipe number circle
        doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
        doc.circle(margin + 4, y, 4, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(`${index + 1}`, margin + 4, y + 1, { align: 'center' });

        // Recipe title
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
        const maxTitleWidth = contentWidth - 30;
        const truncatedTitle = doc.splitTextToSize(recipe.title, maxTitleWidth)[0];
        doc.text(truncatedTitle, margin + 12, y + 1);

        // Dotted line
        const titleWidth = doc.getTextWidth(truncatedTitle);
        const dotsStart = margin + 14 + titleWidth;
        const dotsEnd = pageWidth - margin - 15;
        doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
        doc.setLineDashPattern([1, 2], 0);
        doc.line(dotsStart, y, dotsEnd, y);
        doc.setLineDashPattern([], 0);

        // Page number
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLORS.mutedText.r, COLORS.mutedText.g, COLORS.mutedText.b);
        doc.text(`${pageNum}`, pageWidth - margin, y + 1, { align: 'right' });

        y += 10;
      });

      // ===== RECIPE PAGES =====
      for (let recipeIndex = 0; recipeIndex < selectedRecipes.length; recipeIndex++) {
        const recipe = selectedRecipes[recipeIndex];
        doc.addPage();
        y = margin;

        // Helper to add a new page if needed
        const checkNewPage = (neededHeight: number) => {
          if (y + neededHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
            return true;
          }
          return false;
        };

        // ===== HEADER =====
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
        doc.text('Cooky', margin, y + 8);
        
        doc.setDrawColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
        doc.setLineWidth(1.5);
        doc.line(margin, y + 12, margin + 30, y + 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.mutedText.r, COLORS.mutedText.g, COLORS.mutedText.b);
        doc.text('Vos recettes préférées', margin + 35, y + 8);

        y += 25;

        // ===== RECIPE IMAGE =====
        if (recipe.image_url) {
          const imageData = await loadImageWithDimensions(recipe.image_url);
          if (imageData) {
            const imageWidth = (pageWidth * 2) / 3;
            const ratio = imageData.width / imageData.height;
            const imageHeight = imageWidth / ratio;
            const imageX = (pageWidth - imageWidth) / 2;
            
            doc.addImage(imageData.base64, 'JPEG', imageX, y, imageWidth, imageHeight);
            y += imageHeight + 8;
          }
        }

        // ===== RECIPE TITLE =====
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
        
        const titleLines = doc.splitTextToSize(recipe.title, contentWidth);
        titleLines.forEach((line: string) => {
          doc.text(line, margin, y);
          y += 9;
        });

        // Description
        if (recipe.description) {
          y += 2;
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          doc.setTextColor(COLORS.mutedText.r, COLORS.mutedText.g, COLORS.mutedText.b);
          const descLines = doc.splitTextToSize(recipe.description, contentWidth);
          descLines.forEach((line: string) => {
            doc.text(line, margin, y);
            y += 5;
          });
        }

        y += 8;

        // ===== CHARACTERISTICS =====
        const characteristics: string[] = [];
        
        if (recipe.recipe_type) {
          characteristics.push(recipeTypeLabels[recipe.recipe_type] || recipe.recipe_type);
        }
        if (recipe.origins?.name) {
          characteristics.push(recipe.origins.name);
        }
        if (recipe.difficulty) {
          characteristics.push(difficultyLabels[recipe.difficulty]);
        }
        if (recipe.price_level) {
          characteristics.push('€'.repeat(parseInt(recipe.price_level)));
        }
        
        const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
        if (totalTime > 0) {
          characteristics.push(`${totalTime} min`);
        }
        if (recipe.servings) {
          characteristics.push(`${recipe.servings} portions`);
        }

        doc.setFillColor(COLORS.cream.r, COLORS.cream.g, COLORS.cream.b);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        let charX = margin;
        const charHeight = 7;
        const charPadding = 4;
        const charSpacing = 3;

        characteristics.forEach((char) => {
          const textWidth = doc.getTextWidth(char);
          const badgeWidth = textWidth + charPadding * 2;
          
          if (charX + badgeWidth > pageWidth - margin) {
            charX = margin;
            y += charHeight + 4;
          }
          
          doc.setFillColor(COLORS.cream.r, COLORS.cream.g, COLORS.cream.b);
          doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
          doc.roundedRect(charX, y - 4, badgeWidth, charHeight, 2, 2, 'FD');
          
          doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
          doc.text(char, charX + charPadding, y);
          
          charX += badgeWidth + charSpacing;
        });

        y += charHeight + 12;

        // ===== INGREDIENTS =====
        checkNewPage(40);

        doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
        doc.rect(margin, y, 3, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
        doc.text('Ingrédients', margin + 7, y + 6);

        y += 14;

        const ingredients = recipe.ingredients ?? [];
        if (ingredients.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);

          const colWidth = contentWidth / 2;
          let col = 0;
          let startY = y;

          ingredients.forEach((ingredient, index) => {
            const rowIndex = Math.floor(index / 2);
            const currentY = startY + rowIndex * 7;
            const currentX = margin + col * colWidth;

            if (currentY > pageHeight - margin - 10) {
              doc.addPage();
              startY = margin;
              y = margin;
            }

            doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
            doc.circle(currentX + 2, currentY - 1, 1.5, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
            let quantityText = '';
            if (ingredient.quantity !== null) {
              quantityText = `${ingredient.quantity}`;
              if (ingredient.units?.abbreviation) {
                quantityText += ` ${ingredient.units.abbreviation}`;
              }
            }

            doc.text(quantityText, currentX + 6, currentY);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
            const quantityWidth = quantityText ? doc.getTextWidth(quantityText) + 2 : 0;
            const maxNameWidth = colWidth - 8 - quantityWidth;
            const truncatedName = doc.splitTextToSize(ingredient.name, maxNameWidth)[0];
            doc.text(truncatedName, currentX + 6 + quantityWidth, currentY);

            col = 1 - col;
          });

          y = startY + Math.ceil(ingredients.length / 2) * 7 + 8;
        }

        // ===== STEPS =====
        checkNewPage(40);

        doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
        doc.rect(margin, y, 3, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
        doc.text('Préparation', margin + 7, y + 6);

        y += 14;

        const sortedSteps = [...(recipe.steps ?? [])].sort((a, b) => a.position - b.position);

        sortedSteps.forEach((step, index) => {
          checkNewPage(25);

          doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
          doc.circle(margin + 4, y, 4, 'F');
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255);
          doc.text(`${index + 1}`, margin + 4, y + 1, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);

          const stepLines = doc.splitTextToSize(step.content, contentWidth - 14);
          let stepY = y - 2;
          stepLines.forEach((line: string) => {
            doc.text(line, margin + 12, stepY);
            stepY += 5;
          });

          y += Math.max(stepLines.length * 5, 8) + 5;
        });

        // ===== FOOTER =====
        const footerY = pageHeight - 12;
        
        doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(COLORS.mutedText.r, COLORS.mutedText.g, COLORS.mutedText.b);
        doc.text('Généré avec Cooky', margin, footerY);

        // Page number
        const currentPageNum = recipeIndex + 3;
        doc.text(`${currentPageNum}`, pageWidth - margin, footerY, { align: 'right' });
      }

      doc.save('mon-livre-de-recettes.pdf');
      toast.success(`Livre de recettes généré avec ${selectedRecipes.length} recette${selectedRecipes.length > 1 ? 's' : ''} !`);
      onActionComplete?.();
    } catch (error) {
      console.error('Error generating recipe book:', error);
      toast.error('Erreur lors de la génération du livre de recettes');
    } finally {
      setIsGenerating(false);
    }
  };

  if (selectedRecipes.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="default" 
          className="gradient-warm text-primary-foreground"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              Actions ({selectedRecipes.length})
              <ChevronDown className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border shadow-md z-50">
        <DropdownMenuItem onClick={generateRecipeBook} disabled={isGenerating}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BulkActionsMenu;
