import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#090a0d] text-white p-6 text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#ff4500]">404</h1>
      <p className="text-gray-400 mb-6 text-lg">Page not found</p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl bg-[#ff4500] hover:bg-[#e03a00] text-white font-semibold transition-colors shadow-lg"
      >
        Return to Voice Chat
      </Link>
    </div>
  );
}
