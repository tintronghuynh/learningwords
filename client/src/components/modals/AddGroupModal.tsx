import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AddGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddGroupModal({ open, onClose }: AddGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const { toast } = useToast();
  
  // Mutation for creating a new group
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/groups', {
        name: groupName,
        userId: 1 // Using default user ID for simplicity
      });
    },
    onSuccess: async () => {
      // Reset form state
      setGroupName('');
      
      // Close the modal
      onClose();
      
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/groups/1'] });
      
      // Show success toast
      toast({
        title: "Group Created",
        description: "The vocabulary group has been created successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a group name.",
        variant: "destructive"
      });
      return;
    }
    
    createGroupMutation.mutate();
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Vocabulary Group</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="groupName" className="block text-gray-700 dark:text-gray-300 mb-2">
              Group Name
            </label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Business English"
              className="w-full"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
