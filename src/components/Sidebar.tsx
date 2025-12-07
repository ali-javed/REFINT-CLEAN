'use client';

import { useState, useEffect } from 'react';

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function Sidebar({ onCollapseChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-zinc-900 p-2 text-zinc-100 hover:bg-zinc-800 md:hidden"
        aria-label="Toggle menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen ${isCollapsed ? 'w-16' : 'w-64'} transform border-r border-zinc-800 bg-zinc-950 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex h-full flex-col px-4 py-6">
          <div className="mb-8 flex items-center justify-between">
            {!isCollapsed && <h2 className="text-lg font-bold text-zinc-50">ReferenceAudit</h2>}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50 md:block"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isCollapsed ? (
                  <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            <button
              onClick={() => scrollToSection('hero')}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50"
              title={isCollapsed ? 'Home' : ''}
            >
              <span className="text-lg">🏠</span>
              {!isCollapsed && <span>Home</span>}
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50"
              title={isCollapsed ? 'Features' : ''}
            >
              <span className="text-lg">✨</span>
              {!isCollapsed && <span>Features</span>}
            </button>
            <button
              onClick={() => scrollToSection('integrity-score')}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50"
              title={isCollapsed ? 'Integrity Score' : ''}
            >
              <span className="text-lg">⚖️</span>
              {!isCollapsed && <span>Integrity Score</span>}
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50"
              title={isCollapsed ? 'How It Works' : ''}
            >
              <span className="text-lg">⚙️</span>
              {!isCollapsed && <span>How It Works</span>}
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50"
              title={isCollapsed ? 'Pricing' : ''}
            >
              <span className="text-lg">💰</span>
              {!isCollapsed && <span>Pricing</span>}
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50"
              title={isCollapsed ? 'FAQ' : ''}
            >
              <span className="text-lg">❓</span>
              {!isCollapsed && <span>FAQ</span>}
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50"
              title={isCollapsed ? 'Contact' : ''}
            >
              <span className="text-lg">📧</span>
              {!isCollapsed && <span>Contact</span>}
            </button>
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
