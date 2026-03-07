import { useState, useRef, useCallback } from 'react';
import { Link2, Loader2, Sparkles, X, FileText, Upload, Mic, MicOff, Camera, ImageIcon } from 'lucide-react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ExtractedRecipe {
  title: string;
  description: string | null;
  recipe_type: 'entree' | 'plat' | 'dessert' | 'boisson' | 'apero' | 'soupe';
  difficulty: 'facile' | 'moyen' | 'difficile';
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  ingredients: Array<{ name: string; quantity: number | null; unit: string | null }>;
  steps: Array<{ content: string; position: number }>;
}

interface RecipeImporterProps {
  onImport: (recipe: ExtractedRecipe, sourceUrl?: string) => void;
}

type ImportMode = 'none' | 'url' | 'text' | 'pdf' | 'voice' | 'photo';

const RecipeImporter = ({ onImport }: RecipeImporterProps) => {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ImportMode>('none');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Voice recognition state (ElevenLabs Scribe)
  const [voiceText, setVoiceText] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: () => {
      // Partial transcripts shown via scribe.partialTranscript
    },
    onCommittedTranscript: (data) => {
      setVoiceText(prev => prev + data.text + ' ');
    },
  });

  const startVoiceRecognition = useCallback(async () => {
    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');

      if (error || !data?.token) {
        throw new Error('Impossible d\'obtenir le token de transcription');
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      toast({
        title: 'Erreur micro',
        description: error instanceof Error ? error.message : 'Impossible de démarrer la reconnaissance vocale.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [scribe, toast]);

  const stopVoiceRecognition = useCallback(() => {
    scribe.disconnect();
  }, [scribe]);

  const handleImportUrl = async () => {
    if (!url.trim()) {
      toast({
        title: 'URL requise',
        description: 'Veuillez entrer une URL valide',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('import-recipe', {
        body: { url: url.trim() },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Échec de l\'import');
      }

      toast({
        title: 'Recette importée ! 🎉',
        description: `"${data.recipe.title}" a été extraite avec succès.`,
      });

      onImport(data.recipe, url.trim());
      setUrl('');
      setMode('none');

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Erreur d\'import',
        description: error instanceof Error ? error.message : 'Impossible d\'importer cette recette',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportText = async () => {
    if (!text.trim()) {
      toast({
        title: 'Texte requis',
        description: 'Veuillez coller le texte de la recette',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('import-recipe', {
        body: { text: text.trim() },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Échec de l\'import');
      }

      toast({
        title: 'Recette importée ! 🎉',
        description: `"${data.recipe.title}" a été extraite avec succès.`,
      });

      onImport(data.recipe);
      setText('');
      setMode('none');

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Erreur d\'import',
        description: error instanceof Error ? error.message : 'Impossible d\'importer cette recette',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Format non supporté',
          description: 'Veuillez sélectionner un fichier PDF',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImportPdf = async () => {
    if (!selectedFile) {
      toast({
        title: 'Fichier requis',
        description: 'Veuillez sélectionner un fichier PDF',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Convert file to base64
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const { data, error } = await supabase.functions.invoke('import-recipe-pdf', {
        body: { 
          fileBase64,
          fileName: selectedFile.name 
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Échec de l\'import');
      }

      toast({
        title: 'Recette importée ! 🎉',
        description: `"${data.recipe.title}" a été extraite avec succès.`,
      });

      onImport(data.recipe);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setMode('none');

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Erreur d\'import',
        description: error instanceof Error ? error.message : 'Impossible d\'importer cette recette',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // (Voice recognition is now handled by ElevenLabs Scribe above)


  const handleImportVoice = async () => {
    if (!voiceText.trim()) {
      toast({
        title: 'Texte requis',
        description: 'Veuillez dicter la recette',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('import-recipe', {
        body: { text: voiceText.trim() },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Échec de l\'import');
      }

      toast({
        title: 'Recette importée ! 🎉',
        description: `"${data.recipe.title}" a été extraite avec succès.`,
      });

      onImport(data.recipe);
      setVoiceText('');
      setMode('none');

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Erreur d\'import',
        description: error instanceof Error ? error.message : 'Impossible d\'importer cette recette',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Format non supporté',
          description: 'Veuillez sélectionner une image (JPG, PNG, etc.)',
          variant: 'destructive',
        });
        return;
      }
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImportImage = async () => {
    if (!selectedImage) {
      toast({
        title: 'Image requise',
        description: 'Veuillez sélectionner ou prendre une photo',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Convert file to base64
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedImage);
      });

      const { data, error } = await supabase.functions.invoke('import-recipe-image', {
        body: { imageBase64 },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Échec de l\'import');
      }

      toast({
        title: 'Recette importée ! 🎉',
        description: `"${data.recipe.title}" a été extraite avec succès.`,
      });

      onImport(data.recipe);
      setSelectedImage(null);
      setImagePreview(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      setMode('none');

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Erreur d\'import',
        description: error instanceof Error ? error.message : 'Impossible d\'importer cette recette',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'none') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode('url')}
            className="flex-1 border-dashed"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Lien
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode('text')}
            className="flex-1 border-dashed"
          >
            <FileText className="w-4 h-4 mr-2" />
            Texte
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode('pdf')}
            className="flex-1 border-dashed"
          >
            <Upload className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode('voice')}
            className="flex-1 border-dashed"
          >
            <Mic className="w-4 h-4 mr-2" />
            Dictée
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode('photo')}
            className="flex-1 border-dashed"
          >
            <Camera className="w-4 h-4 mr-2" />
            Photo
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'url') {
    return (
      <Card className="border-dashed border-primary/50 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" />
              Import depuis un lien
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setMode('none')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://marmiton.org/recettes/..."
                className="pl-9"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleImportUrl();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              onClick={handleImportUrl}
              disabled={isLoading || !url.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyse...
                </>
              ) : (
                'Importer'
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            L'IA va extraire automatiquement le titre, les ingrédients et les étapes de la recette.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'text') {
    return (
      <Card className="border-dashed border-primary/50 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <FileText className="w-4 h-4" />
              Import depuis du texte
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setMode('none')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Collez ici le texte de la recette (ingrédients, étapes, etc.)..."
              className="min-h-[120px]"
              disabled={isLoading}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleImportText}
                disabled={isLoading || !text.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyse...
                  </>
                ) : (
                  'Importer'
                )}
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Copiez-collez la description d'une recette (Instagram, livre, etc.) et l'IA l'analysera.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Mode Voice
  if (mode === 'voice') {
    return (
      <Card className="border-dashed border-primary/50 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Mic className="w-4 h-4" />
              Import par dictée vocale
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setMode('none');
                setVoiceText('');
                stopVoiceRecognition();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {/* Microphone button */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant={scribe.isConnected ? "destructive" : "default"}
                size="lg"
                className={`rounded-full w-16 h-16 ${scribe.isConnected ? 'animate-pulse' : ''}`}
                onClick={scribe.isConnected ? stopVoiceRecognition : startVoiceRecognition}
                disabled={isLoading || isConnecting}
              >
                {scribe.isConnected ? (
                  <MicOff className="w-6 h-6" />
                ) : isConnecting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              {isConnecting ? (
                <span className="text-primary font-medium">Connexion...</span>
              ) : scribe.isConnected ? (
                <span className="text-primary font-medium">Écoute en cours... Parlez !</span>
              ) : (
                'Appuyez sur le micro pour commencer'
              )}
            </p>

            {/* Live partial transcript */}
            {scribe.isConnected && scribe.partialTranscript && (
              <p className="text-sm text-muted-foreground/70 italic px-1">
                {scribe.partialTranscript}
              </p>
            )}

            {/* Transcribed text */}
            <Textarea
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Le texte dicté apparaîtra ici... Vous pouvez aussi le modifier manuellement."
              className="min-h-[120px]"
              disabled={isLoading}
            />
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVoiceText('')}
                disabled={isLoading || !voiceText.trim()}
              >
                Effacer
              </Button>
              <Button
                type="button"
                onClick={handleImportVoice}
                disabled={isLoading || !voiceText.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyse...
                  </>
                ) : (
                  'Importer'
                )}
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Dictez votre recette (titre, ingrédients, étapes) et l'IA l'analysera automatiquement.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Mode Photo
  if (mode === 'photo') {
    return (
      <Card className="border-dashed border-primary/50 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Camera className="w-4 h-4" />
              Import depuis une photo
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setMode('none');
                setSelectedImage(null);
                setImagePreview(null);
                if (imageInputRef.current) {
                  imageInputRef.current.value = '';
                }
                if (cameraInputRef.current) {
                  cameraInputRef.current.value = '';
                }
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {/* Hidden inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isLoading}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
              disabled={isLoading}
            />

            {imagePreview ? (
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                <div className="space-y-2">
                  <img 
                    src={imagePreview} 
                    alt="Aperçu" 
                    className="max-h-48 mx-auto rounded-lg object-contain"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cliquez pour changer l'image
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isLoading}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors flex flex-col items-center gap-2"
                >
                  <Camera className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Prendre une photo
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isLoading}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors flex flex-col items-center gap-2"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Choisir une image
                  </p>
                </button>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleImportImage}
                disabled={isLoading || !selectedImage}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyse...
                  </>
                ) : (
                  'Importer'
                )}
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            L'IA va lire l'image et extraire automatiquement la recette.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Mode PDF
  return (
    <Card className="border-dashed border-primary/50 bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Upload className="w-4 h-4" />
            Import depuis un PDF
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setMode('none');
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(1)} Ko)
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Cliquez pour sélectionner un PDF
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleImportPdf}
              disabled={isLoading || !selectedFile}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyse...
                </>
              ) : (
                'Importer'
              )}
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          L'IA va lire le PDF et extraire automatiquement la recette.
        </p>
      </CardContent>
    </Card>
  );
};

export default RecipeImporter;
