import React, { useState } from 'react';

const Tabs = ({ children, showDsnaTab = true }) => {
  const [activeTab, setActiveTab] = useState('view1');

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const tabs = [
    { id: 'view1', label: 'Synthèse Globale' },
    { id: 'view2', label: `Comparaison ${currentYear} vs ${previousYear}` },
    { id: 'view3', label: 'Analyse des Causes' },
    { id: 'view4', label: 'Focus Hebdomadaire' },
    ...(showDsnaTab ? [{ id: 'view5', label: 'DSNA' }] : []),
  ];

  const childrenArray = React.Children.toArray(children).filter(Boolean);
  const visibleChildren = showDsnaTab ? childrenArray : childrenArray.slice(0, 4);

  return (
    <>
      <div className="flex border-b mb-6 gap-2 overflow-x-auto"
        style={{ borderColor: 'var(--border-color)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap focus:outline-none transition-colors
              ${activeTab === tab.id
                ? 'border-amber-500'
                : 'border-transparent'
              }`}
            style={{
              color: activeTab === tab.id ? 'var(--accent-amber)' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {visibleChildren.map((child, index) => {
          const tabId = `view${index + 1}`;
          const isActive = activeTab === tabId;
          return (
            <div key={tabId} className={isActive ? 'block' : 'hidden'}>
              {React.cloneElement(child, { isActive })}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default Tabs;