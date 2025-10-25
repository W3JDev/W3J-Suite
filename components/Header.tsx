
import React from 'react';
import { LogoIcon, UserIcon, PlusIcon } from './Icons';

interface HeaderProps {
  onNewChat: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewChat, onToggleSidebar }) => {
  return (
    <header className="[grid-area:header] flex items-center justify-between px-6 bg-[rgba(31,33,33,0.95)] border-b border-border-subtle backdrop-blur-[20px] z-[100]">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="icon-btn sm:flex hidden items-center justify-center w-10 h-10 lg:hidden md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div className="logo flex items-center gap-3 text-lg font-bold bg-gradient-to-r from-teal-300 to-teal-500 bg-clip-text text-transparent">
          <div className="logo-icon w-8 h-8 rounded-lg bg-gradient-to-r from-teal-300 to-teal-500 flex items-center justify-center text-slate-900">
            <LogoIcon />
          </div>
          <span>W3J Suite</span>
        </div>
      </div>
      <div className="header-center hidden md:flex items-center gap-3 text-md text-text">
        <span>New Conversation</span>
      </div>
      <div className="header-right flex items-center gap-3">
        <button className="icon-btn w-10 h-10 rounded-lg bg-[rgba(119,124,124,0.15)] border border-border-subtle flex items-center justify-center cursor-pointer transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] text-text hover:bg-[rgba(50,184,198,0.2)] hover:border-primary hover:-translate-y-0.5 hover:shadow-md" title="User Profile">
          <UserIcon className="w-5 h-5" />
        </button>
        <button onClick={onNewChat} className="icon-btn w-10 h-10 rounded-lg bg-[rgba(119,124,124,0.15)] border border-border-subtle flex items-center justify-center cursor-pointer transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] text-text hover:bg-[rgba(50,184,198,0.2)] hover:border-primary hover:-translate-y-0.5 hover:shadow-md" title="New Agent">
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
