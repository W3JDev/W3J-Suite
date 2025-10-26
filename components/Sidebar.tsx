
import React from 'react';
import { ChatIcon, LiveIcon, SettingsIcon, MediaIcon, SchedulerIcon } from './Icons';
import { AppView } from '../App';

interface SidebarProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  isSidebarOpen: boolean;
  onClose: () => void;
}

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`nav-item flex items-center gap-3 py-3 px-4 rounded-md cursor-pointer transition-all duration-150 ease-in-out text-sm relative ${
      active
        ? 'bg-gradient-to-r from-teal-300 to-teal-500 text-slate-900 font-medium shadow-sm'
        : 'text-text-secondary hover:bg-[rgba(119,124,124,0.15)] hover:text-text'
    }`}
  >
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-teal-300 rounded-r-sm"></div>}
    <span className="nav-icon text-lg w-5 text-center">{icon}</span>
    <span>{label}</span>
  </div>
);

const HistoryItem: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
    <div className={`history-item flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-150 ease-in-out text-xs ${active ? 'bg-[rgba(19,52,59,0.4)] text-primary' : 'text-text-secondary hover:bg-[rgba(19,52,59,0.4)] hover:text-text'}`}>
        <ChatIcon className="w-4 h-4" />
        <span className="truncate">{label}</span>
    </div>
);


export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isSidebarOpen, onClose }) => {
  
  const handleNavClick = (view: AppView) => {
    setActiveView(view);
    onClose();
  };

  return (
    <aside className={`sidebar [grid-area:sidebar] bg-surface border-r border-border-subtle flex flex-col overflow-hidden ${isSidebarOpen ? 'open' : ''}`}>
      <nav className="p-4 space-y-2">
        <NavItem icon={<ChatIcon />} label="Chat Agent" active={activeView === 'chat'} onClick={() => handleNavClick('chat')} />
        <NavItem icon={<MediaIcon />} label="Media Suite" active={activeView === 'media'} onClick={() => handleNavClick('media')} />
        <NavItem icon={<LiveIcon />} label="Live Agent" active={activeView === 'live'} onClick={() => handleNavClick('live')} />
        <NavItem icon={<SchedulerIcon />} label="Scheduler" active={activeView === 'scheduler'} onClick={() => handleNavClick('scheduler')} />
      </nav>

      <div className="conversation-history flex-1 overflow-y-auto px-4 flex flex-col gap-4">
        <div>
            <div className="history-section-label text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Today</div>
            <HistoryItem label="Redesign AI Chat App" active />
            <HistoryItem label="Premium UI Patterns" />
        </div>
        <div>
            <div className="history-section-label text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Yesterday</div>
            <HistoryItem label="Budget Planning Q4" />
            <HistoryItem label="Code Review Session" />
        </div>
      </div>

      <div className="sidebar-footer p-4 border-t border-border-subtle">
        <NavItem icon={<SettingsIcon />} label="Settings" />
      </div>
    </aside>
  );
};