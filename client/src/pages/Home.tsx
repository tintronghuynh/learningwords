import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from "framer-motion";
import { pageVariants, listVariants, listItemVariants } from '@/lib/motionHelpers';
import Header from '@/components/Header';
import VocabGroupCard from '@/components/VocabGroupCard';
import AddGroupModal from '@/components/modals/AddGroupModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const { toast } = useToast();
  
  // Get user stats
  const statsQuery = useQuery({
    queryKey: ['/api/stats/1'],
    retry: 1,
  });
  
  // Get vocabulary groups
  const groupsQuery = useQuery({
    queryKey: ['/api/groups/1'],
    retry: 1,
  });
  
  // Mutation to update user's days studied (once per day)
  const updateDaysStudiedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PUT', '/api/users/1/days-studied', {});
    },
    onSuccess: () => {
      // Refresh stats after updating days studied
      statsQuery.refetch();
    },
  });
  
  // Check if the user has visited today and update days studied if needed
  useEffect(() => {
    const lastVisit = localStorage.getItem('lastVisit');
    const today = new Date().toDateString();
    
    if (lastVisit !== today) {
      // Update the last visit
      localStorage.setItem('lastVisit', today);
      
      // Update days studied on the server
      updateDaysStudiedMutation.mutate();
    }
  }, []);
  
  const stats = statsQuery.data || {
    daysStudied: 0,
    totalWords: 0,
    learnedWords: 0,
    totalGroups: 0
  };
  
  const groups = groupsQuery.data || [];
  
  // Placeholder for loading state
  const renderSkeletonCards = () => (
    <>
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-6 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-2 w-full mb-4" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ))}
    </>
  );
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <motion.main 
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        className="flex-grow"
      >
        <section className="container mx-auto px-4 py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Days Studying</span>
                <span className="material-icons text-primary-500">calendar_today</span>
              </div>
              {statsQuery.isLoading ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">{stats.daysStudied}</p>
              )}
            </Card>
            
            <Card className="bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Total Words</span>
                <span className="material-icons text-primary-500">menu_book</span>
              </div>
              {statsQuery.isLoading ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">{stats.totalWords}</p>
              )}
            </Card>
            
            <Card className="bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Learned Words</span>
                <span className="material-icons text-success-500">check_circle</span>
              </div>
              {statsQuery.isLoading ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">{stats.learnedWords}</p>
              )}
            </Card>
            
            <Card className="bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Words to Learn</span>
                <span className="material-icons text-warning-500">pending</span>
              </div>
              {statsQuery.isLoading ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <p className="text-3xl font-bold mt-2">{stats.totalWords - stats.learnedWords}</p>
              )}
            </Card>
          </div>
          
          {/* Groups Header */}
          <div className="flex items-center justify-between my-6">
            <h2 className="text-2xl font-heading font-bold">Vocabulary Groups</h2>
            <Button
              onClick={() => setShowAddGroupModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md border-2 border-blue-700"
            >
              <span className="material-icons mr-1">add</span>
              Add Group
            </Button>
          </div>
          
          {/* Groups Grid */}
          <motion.div 
            variants={listVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {groupsQuery.isLoading ? (
              renderSkeletonCards()
            ) : groupsQuery.isError ? (
              <div className="col-span-full text-center py-12">
                <p className="text-red-500 mb-2">Error loading vocabulary groups</p>
                <Button 
                  variant="outline" 
                  onClick={() => groupsQuery.refetch()}
                >
                  Try Again
                </Button>
              </div>
            ) : groups.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No vocabulary groups yet. Create your first group to get started!
                </p>
                <Button 
                  onClick={() => setShowAddGroupModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md border-2 border-blue-700"
                >
                  Create First Group
                </Button>
              </div>
            ) : (
              groups.map((group: any) => (
                <motion.div key={group.id} variants={listItemVariants}>
                  <VocabGroupCard
                    id={group.id}
                    name={group.name}
                    wordsCount={group.wordsCount}
                    learnedWords={group.learnedWords}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        </section>
      </motion.main>
      
      {/* Add Group Modal */}
      {showAddGroupModal && (
        <AddGroupModal 
          open={showAddGroupModal} 
          onClose={() => setShowAddGroupModal(false)} 
        />
      )}
    </div>
  );
}
