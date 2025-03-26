import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AddWordsModalProps {
  groupId: number;
  onClose: () => void;
}

export default function AddWordsModal({ groupId, onClose }: AddWordsModalProps) {
  const [activeTab, setActiveTab] = useState('import');
  const [jsonInput, setJsonInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Mutation for importing words
  const importWordsMutation = useMutation({
    mutationFn: async () => {
      try {
        // Parse the JSON to validate it
        const jsonData = JSON.parse(jsonInput);
        
        // Send the import request
        return apiRequest('POST', '/api/words/import', {
          groupId,
          dictionary: jsonData.dictionary
        });
      } catch (error) {
        throw new Error("Invalid JSON format. Please check your input.");
      }
    },
    onSuccess: async (response) => {
      const data = await response.json();
      
      // Reset form state
      setJsonInput('');
      
      // Close the modal
      onClose();
      
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/words/${groupId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups/1'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/1'] });
      
      // Show success toast
      toast({
        title: "Words Imported",
        description: `Successfully imported ${data.added} words out of ${data.total}.`
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setSelectedFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setJsonInput(content);
        setIsUploading(false);
      } catch (error) {
        toast({
          title: "File Upload Error",
          description: "Could not read the file. Make sure it's a valid JSON file.",
          variant: "destructive"
        });
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "File Upload Error",
        description: "An error occurred while reading the file.",
        variant: "destructive"
      });
      setIsUploading(false);
      setSelectedFileName(null);
    };
    
    reader.readAsText(file);
  };
  
  const handleImport = () => {
    if (!jsonInput.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter valid JSON data.",
        variant: "destructive"
      });
      return;
    }
    
    importWordsMutation.mutate();
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] md:max-w-[680px] p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-bold">Add Words to Group</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="import" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="import" className="rounded-l-md">Import from File</TabsTrigger>
            <TabsTrigger value="manual" className="rounded-r-md" disabled>Add Manually</TabsTrigger>
          </TabsList>
          
          <TabsContent value="import" className="mt-2 space-y-4">
            <div className="space-y-3">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Import vocabulary from a JSON file with the following format:
              </p>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto max-h-72 text-xs font-mono border border-gray-200 dark:border-gray-700">
                <pre className="whitespace-pre-wrap">{`{
  "dictionary": [
    {
      "word": "Suitcase",
      "IPA": "/ˈsuːtkeɪs/",
      "part_of_speech": "Noun",
      "definition": "A portable rectangular container used for carrying clothes when traveling",
      "meanings": [
        {
          "meaning": "A piece of luggage with a handle and usually a hinged lid",
          "examples": [
            { "en": "She packed all her clothes into a large suitcase.",
              "vi": "Cô ấy đóng gói tất cả quần áo vào một chiếc vali lớn." }
          ]
        }
      ]
    }
  ]
}`}</pre>
              </div>
            </div>
            
            {/* File upload section */}
            <div className="pt-2">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                Upload JSON File:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                  id="json-file-upload"
                />
                <Button 
                  type="button" 
                  variant="secondary"
                  className="px-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Choose File"}
                </Button>
                <span className="text-gray-600 dark:text-gray-400 text-sm truncate flex-1">
                  {selectedFileName || "No file chosen"}
                </span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="manual">
            <div className="flex items-center justify-center h-40">
              <p className="text-center text-gray-500 dark:text-gray-400">
                Manual word addition will be available in a future update.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6 flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={activeTab !== 'import' || importWordsMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {importWordsMutation.isPending ? "Importing..." : "Import Words"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
