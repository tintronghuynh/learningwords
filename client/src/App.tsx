import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import SlideshowMode from "@/pages/SlideshowMode";
import WordInputMode from "@/pages/WordInputMode";
import { AppProvider } from "@/providers/AppProvider";
import { useState, useEffect } from "react";
import Clock from "@/components/Clock";
import useKeyPress from "@/hooks/useKeyPress";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/study/slideshow/:groupId" component={SlideshowMode} />
      <Route path="/study/input/:groupId" component={WordInputMode} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showClock, setShowClock] = useState(false);
  
  // Handle the Shift key press to toggle the clock modal
  useKeyPress("Shift", () => {
    setShowClock(prev => !prev);
  });
  
  // Add event listener for the Escape key to close the clock modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showClock) {
        setShowClock(false);
      }
    };
    
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [showClock]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
          <Router />
          <Toaster />
          {showClock && <Clock />}
        </div>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
