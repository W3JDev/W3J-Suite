
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ContextPanel } from './components/ContextPanel';
import { ChatCanvas } from './components/ChatCanvas';
import { LiveAgentView } from './components/LiveAgentView';

type View = 'chat' | 'live';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('chat');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const handleNewChat = useCallback(() => {
    // This is a placeholder for a more complex implementation
    // For now, we just ensure we're on the chat view.
    setActiveView('chat');
  }, []);
  
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="app-container bg-background">
      <Header onNewChat={handleNewChat} onToggleSidebar={toggleSidebar} />
      <Sidebar activeView={activeView} setActiveView={setActiveView} isSidebarOpen={isSidebarOpen} />
      
      <main className="[grid-area:main] flex flex-col bg-background relative min-h-0">
        {activeView === 'chat' && <ChatCanvas />}
        {activeView === 'live' && <LiveAgentView />}
      </main>

      <ContextPanel />
    </div>
  );
};

export default App;