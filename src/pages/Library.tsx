import React from 'react';
import { Link } from "react-router-dom";
import { useI18n } from "../I18nContext";

const BackgroundBlobs = () => (
  <>
    <style>{`
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob { animation: blob 15s infinite alternate; }
      .animation-delay-2000 { animation-delay: 2s; }
      .animation-delay-4000 { animation-delay: 4s; }
    `}</style>
    <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-blue-300 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob pointer-events-none z-0"></div>
    <div className="fixed top-[10%] right-[-5%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob animation-delay-2000 pointer-events-none z-0"></div>
    <div className="fixed bottom-[-10%] left-[20%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] bg-pink-200 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob animation-delay-4000 pointer-events-none z-0"></div>
  </>
);

export default function Library() {
  const { t } = useI18n();

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
      <BackgroundBlobs />
      
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2">
            {t("back_button")}
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2">
              {t("library")}
            </h1>
            <p className="text-lg text-blue-900/70 font-medium mt-1">
              {t("library_subtitle")}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
          <Link to="/vocabulary" className="group relative flex flex-col items-start justify-between p-6 md:p-8 rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl mb-10 group-hover:scale-110 transition-transform duration-500 border border-gray-100">📖</div>
            <div className="relative z-10 w-full">
              <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-2xl drop-shadow-sm mb-1">{t("vocabulary")}</h3>
              <p className="text-gray-600 font-medium text-sm leading-relaxed">{t("vocab_subtitle") || 'Manage your words.'}</p>
            </div>
          </Link>
          
          <Link to="/learning-materials" className="group relative flex flex-col items-start justify-between p-6 md:p-8 rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl mb-10 group-hover:scale-110 transition-transform duration-500 border border-gray-100">🎧</div>
            <div className="relative z-10 w-full">
              <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-2xl drop-shadow-sm mb-1">{t("learning_materials")}</h3>
              <p className="text-gray-600 font-medium text-sm leading-relaxed">{t("learning_materials_subtitle")}</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}