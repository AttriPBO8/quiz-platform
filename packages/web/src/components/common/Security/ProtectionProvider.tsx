import React, { ReactNode, useEffect } from 'react';

interface ProtectionProviderProps {
  children: ReactNode;
  enableScreenshotProtection?: boolean;
  enableCopyProtection?: boolean;
  enableDeviceFingerprinting?: boolean;
}

export const ProtectionProvider: React.FC<ProtectionProviderProps> = ({
  children,
  enableScreenshotProtection = true,
  enableCopyProtection = true,
  enableDeviceFingerprinting = true
}) => {
  useEffect(() => {
    // Simple protection for testing
    if (enableScreenshotProtection) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'PrintScreen') {
          e.preventDefault();
          alert('Screenshots are disabled');
        }
      });
    }

    if (enableCopyProtection) {
      document.addEventListener('copy', (e) => {
        e.preventDefault();
        alert('Copying is disabled');
      });
    }
  }, [enableScreenshotProtection, enableCopyProtection]);

  return <>{children}</>;
};