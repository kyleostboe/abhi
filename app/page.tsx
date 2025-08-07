import React from 'react';

const Page = () => {
  return (
    <div>
      {/* Header or other content here */}
      <h3 className="mb-2 dark:text-white text-center font-black px-0 rounded text-base text-gray-600 pb-0.5">
        Resources
      </h3>
      <div className="text-sm text-logo-rose-600 leading-relaxed dark:text-logo-rose-300 flex flex-wrap gap-2 justify-center text-center px-px">
        <a
          href="https://dharmaseed.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline border border-gray-600 text-gray-600 px-3 py-1 rounded-md"
        >
          Dharma Seed
        </a>
        <a
          href="https://www.tarabrach.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline border border-gray-600 text-gray-600 px-3 py-1 rounded-md"
        >
          Tara Brach
        </a>
        <a
          href="https://jackkornfield.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline border border-gray-600 text-gray-600 px-3 py-1 rounded-md"
        >
          Jack Kornfield
        </a>
        <a
          href="https://www.audiodharma.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline border border-gray-600 text-gray-600 px-3 py-1 rounded-md"
        >
          Audio Dharma
        </a>
        <a
          href="https://insighttimer.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline border border-gray-600 text-gray-600 px-3 py-1 rounded-md"
        >
          Insight Timer
        </a>
      </div>
      {/* Footer or other content here */}
    </div>
  );
};

export default Page;
