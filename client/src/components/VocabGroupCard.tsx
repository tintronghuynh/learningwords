import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import AddWordsModal from './modals/AddWordsModal';
import StudyModeModal from './modals/StudyModeModal';
import LabanDictionaryModal from './modals/LabanDictionaryModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface VocabGroupCardProps {
  id: number;
  name: string;
  wordsCount: number;
  learnedWords: number;
}

export default function VocabGroupCard({
  id,
  name,
  wordsCount,
  learnedWords
}: VocabGroupCardProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [showAddWordsModal, setShowAddWordsModal] = useState(false);
  const [showStudyModeModal, setShowStudyModeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDictionaryModal, setShowDictionaryModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState(name);
  
  // Calculate progress percentage
  const progressPercentage = wordsCount > 0 
    ? Math.round((learnedWords / wordsCount) * 100) 
    : 0;
  
  // Mutation for updating group name
  const updateGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PUT', `/api/groups/${id}`, { name: newGroupName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups/1'] });
      setShowEditModal(false);
      toast({
        title: "Group Updated",
        description: "The group name has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation for deleting group
  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups/1'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/1'] });
      setShowDeleteModal(false);
      toast({
        title: "Group Deleted",
        description: "The vocabulary group has been deleted successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleEditGroup = () => {
    updateGroupMutation.mutate();
  };
  
  const handleDeleteGroup = () => {
    deleteGroupMutation.mutate();
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition group">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg">{name}</h3>
          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowEditModal(true)}
            >
              <span className="material-icons text-gray-500 text-sm">edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowDeleteModal(true)}
            >
              <span className="material-icons text-gray-500 text-sm">delete</span>
            </Button>
          </div>
        </div>
        
        <div className="mb-3">
          <div className="flex justify-between mb-1 text-sm text-gray-600 dark:text-gray-400">
            <span>Progress</span>
            <span>{progressPercentage}% ({learnedWords}/{wordsCount})</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div className="flex mt-4">
          <Button
            variant="secondary"
            className="flex-1 flex items-center justify-center py-2 rounded-l-lg"
            onClick={() => setShowAddWordsModal(true)}
          >
            <span className="material-icons text-sm mr-1">add</span>
            Add Words
          </Button>
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center py-2 rounded-r-lg text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 border-primary-100 dark:border-primary-900/50"
            onClick={() => setShowStudyModeModal(true)}
          >
            <span className="material-icons text-sm mr-1">school</span>
            Study
          </Button>
        </div>
      </CardContent>
      
      {/* Add Words Modal */}
      {showAddWordsModal && (
        <AddWordsModal 
          groupId={id} 
          onClose={() => setShowAddWordsModal(false)} 
        />
      )}
      
      {/* Study Mode Modal */}
      {showStudyModeModal && (
        <StudyModeModal 
          groupId={id} 
          onClose={() => setShowStudyModeModal(false)} 
        />
      )}
      
      {/* Edit Group Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group Name</DialogTitle>
            <DialogDescription>
              Change the name of this vocabulary group.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditGroup} disabled={!newGroupName.trim() || updateGroupMutation.isPending}>
              {updateGroupMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vocabulary Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this group? This will permanently remove the group and all its words.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteGroup}
              disabled={deleteGroupMutation.isPending}
            >
              {deleteGroupMutation.isPending ? "Deleting..." : "Delete Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dictionary Modal */}
      {showDictionaryModal && (
        <LabanDictionaryModal
          open={showDictionaryModal}
          onClose={() => setShowDictionaryModal(false)}
        />
      )}
    </Card>
  );
}
