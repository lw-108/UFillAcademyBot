import Head from 'next/head';
import { GetStaticProps } from 'next';
import { getServerTranslations } from '@/lib/i18n/getServerTranslations';
import MainLayout from '../components/MainLayout';

export const getStaticProps: GetStaticProps = async (context) => {
  const locale = context.locale || 'en-US';
  try {
    const translations = await getServerTranslations(locale, ['common']);
    return {
      props: {
        ...translations,
      },
    };
  } catch (err) {
    console.warn('Failed to load translations in getStaticProps:', err);
    return {
      props: {},
    };
  }
};

export default function Home() {
  return (
    <>
      <Head>
        <title>U Fill Acadmey Bot</title>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>
      <MainLayout />
    </>
  );
}
