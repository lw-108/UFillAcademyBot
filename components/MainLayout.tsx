import CallBob from './CallBob';
import LanguageManager from './LanguageManager';
import { Fragment } from 'react';

export default function MainLayout() {
  return (
    <Fragment>
      <div className="h-screen w-screen max-h-screen overflow-hidden bg-[#090a0d] text-white p-3 md:p-5 font-sans flex flex-col box-border">
        <LanguageManager>
          <main className="w-full h-full max-h-full bg-[#090a0d] flex flex-col overflow-hidden min-h-0">
            <CallBob />
          </main>
        </LanguageManager>
      </div>
    </Fragment>
  );
}
