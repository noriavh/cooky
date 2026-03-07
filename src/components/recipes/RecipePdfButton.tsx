import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import type { Recipe, Ingredient } from '@/hooks/useRecipes';

interface RecipePdfButtonProps {
  recipe: Recipe;
  scaledIngredients: Array<Ingredient & { scaledQuantity: number | null }>;
  servings: number;
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

// Refined Cooky brand colors
const COLORS = {
  primary: { r: 229, g: 100, b: 51 },      // Terracotta orange
  gold: { r: 230, g: 176, b: 61 },         // Gold accent
  cream: { r: 249, g: 244, b: 236 },       // Warm cream
  brown: { r: 51, g: 42, b: 38 },          // Dark brown text
  mutedText: { r: 115, g: 99, b: 87 },     // Muted text
  border: { r: 224, g: 214, b: 204 },      // Border
  lightGray: { r: 245, g: 245, b: 245 },   // Light gray background
};

// Load image as base64 and get dimensions
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

const RecipePdfButton = ({ recipe, scaledIngredients, servings }: RecipePdfButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
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
      let y = margin;

      // Helper to add a new page if needed
      const checkNewPage = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          return true;
        }
        return false;
      };

      // ===== CLEAN HEADER =====
      // Simple logo text with underline accent
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text('Cooky', margin, y + 8);
      
      // Gold underline accent
      doc.setDrawColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
      doc.setLineWidth(1.5);
      doc.line(margin, y + 12, margin + 30, y + 12);

      // Tagline
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(COLORS.mutedText.r, COLORS.mutedText.g, COLORS.mutedText.b);
      doc.text('Vos recettes préférées', margin + 35, y + 8);

      y += 25;

      // ===== RECIPE IMAGE =====
      if (recipe.image_url) {
        const imageData = await loadImageWithDimensions(recipe.image_url);
        if (imageData) {
          // Use 2/3 of page width for image
          const imageWidth = (pageWidth * 2) / 3;
          // Calculate height based on original image ratio to maintain proportions
          const ratio = imageData.width / imageData.height;
          const imageHeight = imageWidth / ratio;
          
          // Center the image horizontally
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

      // ===== RECIPE CHARACTERISTICS - Clean inline layout =====
      const characteristics: string[] = [];
      
      if (recipe.recipe_type) {
        characteristics.push(recipeTypeLabels[recipe.recipe_type] || recipe.recipe_type);
      }
      if (recipe.origins?.name) {
        // Don't include emoji as jsPDF doesn't handle them well
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
      characteristics.push(`${servings} portions`);

      // Draw characteristics as inline badges
      doc.setFillColor(COLORS.cream.r, COLORS.cream.g, COLORS.cream.b);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      let charX = margin;
      const charY = y;
      const charHeight = 7;
      const charPadding = 4;
      const charSpacing = 3;

      characteristics.forEach((char, index) => {
        const textWidth = doc.getTextWidth(char);
        const badgeWidth = textWidth + charPadding * 2;
        
        // Check if we need to wrap
        if (charX + badgeWidth > pageWidth - margin) {
          charX = margin;
          y += charHeight + 4;
        }
        
        // Badge background
        doc.setFillColor(COLORS.cream.r, COLORS.cream.g, COLORS.cream.b);
        doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
        doc.roundedRect(charX, y - 4, badgeWidth, charHeight, 2, 2, 'FD');
        
        // Badge text
        doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
        doc.text(char, charX + charPadding, y);
        
        charX += badgeWidth + charSpacing;
      });

      y += charHeight + 12;

      // ===== INGREDIENTS SECTION =====
      checkNewPage(40);

      // Section header with colored bar
      doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.rect(margin, y, 3, 8, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
      doc.text('Ingrédients', margin + 7, y + 6);

      y += 14;

      // Ingredients list with checkboxes
      if (scaledIngredients.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const colWidth = contentWidth / 2;
        let col = 0;
        let startY = y;

        scaledIngredients.forEach((ingredient, index) => {
          const rowIndex = Math.floor(index / 2);
          const currentY = startY + rowIndex * 7;
          const currentX = margin + col * colWidth;

          if (currentY > pageHeight - margin - 10) {
            doc.addPage();
            startY = margin;
            y = margin;
          }

          // Orange bullet point
          doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
          doc.circle(currentX + 2, currentY - 1, 1.5, 'F');

          // Quantity
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
          let quantityText = '';
          if (ingredient.scaledQuantity !== null) {
            quantityText = `${ingredient.scaledQuantity}`;
            if (ingredient.units?.abbreviation) {
              quantityText += ` ${ingredient.units.abbreviation}`;
            }
          }

          doc.text(quantityText, currentX + 6, currentY);

          // Ingredient name
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
          const quantityWidth = quantityText ? doc.getTextWidth(quantityText) + 2 : 0;
          const maxNameWidth = colWidth - 8 - quantityWidth;
          const truncatedName = doc.splitTextToSize(ingredient.name, maxNameWidth)[0];
          doc.text(truncatedName, currentX + 6 + quantityWidth, currentY);

          col = 1 - col;
        });

        y = startY + Math.ceil(scaledIngredients.length / 2) * 7 + 8;
      }

      // ===== STEPS SECTION =====
      checkNewPage(40);

      // Section header with colored bar
      doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
      doc.rect(margin, y, 3, 8, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
      doc.text('Préparation', margin + 7, y + 6);

      y += 14;

      // Steps
      const sortedSteps = [...(recipe.steps ?? [])].sort((a, b) => a.position - b.position);

      sortedSteps.forEach((step, index) => {
        checkNewPage(25);

        // Step number circle
        doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
        doc.circle(margin + 4, y, 4, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(`${index + 1}`, margin + 4, y + 1, { align: 'center' });

        // Step text
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

      const date = new Date().toLocaleDateString('fr-FR');
      doc.text(date, pageWidth - margin, footerY, { align: 'right' });

      // Save the PDF
      const fileName = recipe.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      doc.save(`cooky-${fileName}.pdf`);
      toast.success('PDF généré avec succès !');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePdf}
      disabled={isGenerating}
    >
      <FileDown className="h-4 w-4 mr-2" />
      {isGenerating ? 'Génération...' : 'PDF'}
    </Button>
  );
};

export default RecipePdfButton;
