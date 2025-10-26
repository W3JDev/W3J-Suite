
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ContextPanel } from './components/ContextPanel';
import { ChatCanvas } from './components/ChatCanvas';
import { LiveAgentView } from './components/LiveAgentView';
import { MediaSuiteView } from './components/MediaSuiteView';
import { SchedulerView } from './components/SchedulerView';

export type AppView = 'chat' | 'live' | 'media' | 'scheduler';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>('scheduler');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const handleNewChat = useCallback(() => {
    // This is a placeholder for a more complex implementation
    // For now, we just ensure we're on the chat view.
    setActiveView('chat');
  }, []);
  
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const renderActiveView = () => {
    switch(activeView) {
      case 'chat':
        return <ChatCanvas />;
      case 'media':
        return <MediaSuiteView />;
      case 'live':
        return <LiveAgentView />;
      case 'scheduler':
        return <SchedulerView />;
      default:
        return <ChatCanvas />;
    }
  }

  return (
    <div className="app-container bg-background">
      <Header onNewChat={handleNewChat} onToggleSidebar={toggleSidebar} />
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        isSidebarOpen={isSidebarOpen} 
        onClose={toggleSidebar} 
      />
      
      {isSidebarOpen && <div className="sidebar-backdrop open md:hidden" onClick={toggleSidebar}></div>}

      <main className="[grid-area:main] flex flex-col bg-background relative min-h-0">
        {renderActiveView()}
      </main>

      <ContextPanel />
    </div>
  );
};

export default App;