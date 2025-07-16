import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeepAlive } from "./hooks/useKeepAlive";
import PokerGame from "@/pages/poker-game";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PokerGame} />
      <Route path="/game/:roomCode" component={PokerGame} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Keep server alive to prevent Render sleeping
  useKeepAlive();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
