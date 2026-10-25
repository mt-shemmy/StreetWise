import React from 'react';
import '../public/css/globals.css';

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}