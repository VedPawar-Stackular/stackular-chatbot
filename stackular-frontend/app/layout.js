import ChatWidget from '@/components/ChatWidget';

export const metadata = {
  title: 'Stackular — Scaling customer success, one stack at a time.',
  description: 'We build AI-driven, customer-centric solutions to fuel digital transformation and business growth.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#060b14' }}>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}