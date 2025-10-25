
import React from 'react';

export const ContextPanel: React.FC = () => {
    return (
        <aside className="context-panel [grid-area:context] bg-surface border-l border-border-subtle overflow-y-auto p-6 flex-col gap-6 hidden lg:flex">
            <div className="context-section">
                <div className="upgrade-card bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg p-6 text-slate-900 relative overflow-hidden cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-premium">
                    <div className="upgrade-content relative z-10">
                        <div className="upgrade-icon text-4xl mb-3">💎</div>
                        <div className="upgrade-title text-lg font-bold mb-3">Upgrade to Pro</div>
                        <ul className="upgrade-features list-none mb-4 text-sm space-y-2">
                            <li className="flex items-center gap-2">✓ Unlimited conversations</li>
                            <li className="flex items-center gap-2">✓ Advanced AI models</li>
                            <li className="flex items-center gap-2">✓ Priority support</li>
                        </ul>
                        <button className="upgrade-btn w-full p-3 bg-slate-900 text-primary border-none rounded-lg font-semibold cursor-pointer transition-transform duration-150 hover:scale-105">Upgrade Now →</button>
                    </div>
                </div>
            </div>

            <div className="context-section flex flex-col gap-4">
                <div className="context-section-title text-sm font-semibold text-text flex items-center gap-2">
                    <span>📌</span>
                    <span>Quick Actions</span>
                </div>
                <div className="context-card bg-[rgba(19,52,59,0.4)] backdrop-blur-lg border border-border-subtle rounded-md p-4 space-y-2 text-sm text-text-secondary">
                    <div className="cursor-pointer hover:text-text">→ Create summary</div>
                    <div className="cursor-pointer hover:text-text">→ Export conversation</div>
                    <div className="cursor-pointer hover:text-text">→ Share with team</div>
                </div>
            </div>

            <div className="context-section flex flex-col gap-4">
                <div className="context-section-title text-sm font-semibold text-text flex items-center gap-2">
                    <span>🔥</span>
                    <span>This Month</span>
                </div>
                <div className="context-card bg-[rgba(19,52,59,0.4)] backdrop-blur-lg border border-border-subtle rounded-md p-4 space-y-2 text-sm text-text-secondary">
                    <div>47 conversations</div>
                    <div>12,384 tokens used</div>
                    <div>⚡ 3 more for Pro tier</div>
                </div>
            </div>
        </aside>
    );
};