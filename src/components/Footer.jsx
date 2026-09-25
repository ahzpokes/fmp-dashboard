import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-12 pt-6 border-t text-xs theme-text-muted"
      style={{ borderColor: 'var(--border-color)' }}>
      <div className="space-y-2">
        <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
          © European Organisation for the Safety of Air Navigation (EUROCONTROL)
        </p>
        <p>
          This data is published by the EUROCONTROL Aviation Intelligence Unit in the interest of the exchange of information.
          It may be copied in whole or in part providing that this copyright notice and disclaimer are included.
          The information may not be modified without prior written permission from the EUROCONTROL Aviation Intelligence Unit.
        </p>
        <p className="italic">
          The information does not necessarily reflect the official views or policy of EUROCONTROL,
          which makes no warranty, either implied or express, for the information contained in this document,
          including its accuracy, completeness or usefulness.
        </p>
      </div>
    </footer>
  );
};

export default Footer;