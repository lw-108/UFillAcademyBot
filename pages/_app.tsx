import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
import localFont from 'next/font/local';
import nextI18NextConfig from '../next-i18next.config';

const satoshi = localFont({
  src: '../fonts/Satoshi.ttf',
  variable: '--font-satoshi',
  display: 'swap',
  preload: false,
});

function App({ Component, pageProps }: AppProps) {
  return (
    <main className={`${satoshi.variable} ${satoshi.className} font-sans`}>
      <Component {...pageProps} />
    </main>
  );
}

export default appWithTranslation(App, nextI18NextConfig);
