import React from 'react';

export const MicIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
    <path d="M17 11a1 1 0 012 0v1a7 7 0 01-14 0v-1a1 1 0 012 0v1a5 5 0 0010 0v-1z" />
    <path d="M12 18a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1z" />
  </svg>
);

export const StopIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3-3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
    </svg>
);

export const SpeakerIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 7a1 1 0 00-1 1v8a1 1 0 002 0V8a1 1 0 00-1-1zM12 5a1 1 0 00-1 1v12a1 1 0 002 0V6a1 1 0 00-1-1zM4 9a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1zM16 9a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1zM20 7a1 1 0 00-1 1v8a1 1 0 102 0V8a1 1 0 00-1-1z" />
  </svg>
);

export const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 5.85c-.09.5.153.995.612 1.295l.708.455a.75.75 0 001.08.028l.243-.242a.75.75 0 011.06 0l2.122 2.121a.75.75 0 010 1.061l-.243.242a.75.75 0 00-.028 1.08l-.455.708c-.299.46-.22.995.09 1.295l2.032.176c.904.078 1.567.86 1.567 1.85v1.732c0 .99-.663 1.772-1.567 1.85l-2.032.176c-.31.026-.609.325-.7.625l-.455.708a.75.75 0 00.028 1.08l.243.242a.75.75 0 010 1.06l-2.122 2.122a.75.75 0 01-1.06 0l-.243-.242a.75.75 0 00-1.08.028l-.708.455c-.46.299-.995.22-1.295-.09l-.176-2.032a1.86 1.86 0 00-1.85-1.567H5.933c-.99 0-1.772.663-1.85 1.567l-.176 2.032c-.026.31-.325.609-.625.7l-.708.455a.75.75 0 01-1.08-.028l-.243-.242a.75.75 0 00-1.06 0L.964 19.04a.75.75 0 000 1.06l.243.242c.307.307.336.792.028 1.08l-.455.708c-.299.46-.794.612-1.295.612H5.083c.917 0 1.699-.663 1.85-1.567l.176-2.032c.09-.5-.153-.995-.612-1.295l-.708-.455a.75.75 0 00-1.08-.028l-.243.242a.75.75 0 01-1.06 0L.964 13.04a.75.75 0 010-1.06l.243-.242a.75.75 0 00.028-1.08l.455-.708c.299-.46.22-.995-.09-1.295l-2.032-.176A1.86 1.86 0 012.25 6.933V5.2c0-.99.663-1.772 1.567-1.85l2.032-.176c.31-.026.609-.325.7-.625l.455-.708a.75.75 0 00-.028-1.08l-.243-.242a.75.75 0 010-1.06L9.964.964a.75.75 0 011.06 0l.243.242a.75.75 0 001.08.028l.708.455c.46.299.995.22 1.295-.09l.176-2.032A1.86 1.86 0 0116.917 2.25h1.732c.99 0 1.772.663 1.85 1.567l.176 2.032c.026.31.325.609.625.7l.708.455a.75.75 0 01.028 1.08l-.243.242a.75.75 0 000 1.06l2.122 2.121a.75.75 0 001.06 0l.243-.242a.75.75 0 011.08.028l.708-.455c.46-.299.612-.794.612-1.295V5.2a1.86 1.86 0 00-1.567-1.85l-2.032-.176c-.904-.078-1.567-.86-1.567-1.85V.083c0-.028 0-.055 0-.083z" clipRule="evenodd" />
  </svg>
);

export const BookOpenIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a1 1 0 011 1v18a1 1 0 01-2 0V3a1 1 0 011-1z" />
        <path d="M10.707 2.293A.999.999 0 0010 3v18c0 .261.103.51.284.693l6 5.5a1 1 0 001.432-1.386L12 19.964V4.036l5.716-4.829a1 1 0 00-1.432-1.386l-6 5.5A.998.998 0 0010.707 2.293zM3.284 21.693A.999.999 0 004 21V3a.999.999 0 00-.293-.707l-6-5.5a1 1 0 00-1.432 1.386L2 4.036v15.928l-5.716 4.829a1 1 0 001.432 1.386l6-5.5z" />
    </svg>
);

export const ArrowPathIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-3.181-4.991v4.99" />
    </svg>
);

export const PlusCircleIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const XMarkIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

export const ChipIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2H9z" />
    <path fillRule="evenodd" d="M8 2a1 1 0 011-1h1a1 1 0 110 2v2h2V3a1 1 0 112 0v2h2V3a1 1 0 112 0v1a1 1 0 01-1 1h-1v2h1a1 1 0 011 1v1a1 1 0 01-2 0V9h-2v2h2v1a1 1 0 011 1v1a1 1 0 01-2 0v-1h-2v2h1a1 1 0 010 2h-1a1 1 0 01-1-1v-1H9v1a1 1 0 11-2 0v-1a1 1 0 011-1h1v-2H7v1a1 1 0 01-2 0v-1a1 1 0 011-1h1v-2H6a1 1 0 01-1-1v-1a1 1 0 112 0v1h2V9H7v1a1 1 0 01-2 0V9a1 1 0 011-1h1V6H6a1 1 0 01-1-1V4a1 1 0 012 0v1h2V3a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

export const WifiIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 9a15.915 15.915 0 0119.5 0M5.25 12.75a10.642 10.642 0 0113.5 0M8.25 16.5a5.368 5.368 0 017.5 0M12 20.25h.008v.008H12v-.008z" />
  </svg>
);

export const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const CubeIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9.75l-9-5.25m9 5.25l9-5.25" />
    </svg>
);

export const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 3.878v16.244c0 .497.538.803.967.558l13.464-8.122a.648.648 0 000-1.116L5.967 3.32A.648.648 0 005 3.878z" />
  </svg>
);

export const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.243 7.243a1 1 0 00-1.414-1.414L11 11.657 9.172 9.83a1 1 0 10-1.414 1.414l2.536 2.536a1 1 0 001.414 0l4.536-4.536z" clipRule="evenodd" />
  </svg>
);
