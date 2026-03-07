import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
}

const ImageUpload = ({ value, onChange, className }: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Fichier invalide',
        description: 'Veuillez sélectionner une image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'L\'image ne doit pas dépasser 5 Mo.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(fileName);

      setPreview(publicUrl);
      onChange(publicUrl);

      toast({
        title: 'Image uploadée',
        description: 'Votre image a été ajoutée avec succès.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erreur d\'upload',
        description: 'Une erreur est survenue lors de l\'upload.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value && user) {
      try {
        // Extract file path from URL
        const urlParts = value.split('/recipe-images/');
        if (urlParts[1]) {
          await supabase.storage
            .from('recipe-images')
            .remove([urlParts[1]]);
        }
      } catch (error) {
        console.error('Error removing image:', error);
      }
    }
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={preview}
            alt="Aperçu"
            className="w-full h-48 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          {isUploading ? (
            <div className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Upload en cours...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
                className={cn(
                  "h-32 border-2 border-dashed border-border rounded-lg",
                  "flex flex-col items-center justify-center gap-2",
                  "text-muted-foreground hover:border-primary hover:text-primary",
                  "transition-colors duration-200"
                )}
              >
                <Camera className="w-8 h-8" />
                <span className="text-sm font-medium">Prendre une photo</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={cn(
                  "h-32 border-2 border-dashed border-border rounded-lg",
                  "flex flex-col items-center justify-center gap-2",
                  "text-muted-foreground hover:border-primary hover:text-primary",
                  "transition-colors duration-200"
                )}
              >
                <ImageIcon className="w-8 h-8" />
                <span className="text-sm font-medium">Choisir une image</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImageUpload;
