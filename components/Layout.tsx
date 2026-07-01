import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/import', label: 'Import' },
    { path: '/quizzes', label: 'Quizzes' },
    { path: '/vocabulary', label: 'Vocabulary' },
    { path: '/grammar', label: 'Grammar' },
    { path: '/statistics', label: 'Statistics' },
    { path: '/settings', label: 'Settings' }
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 text-gray-300">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white tracking-wider">
            <Link to="/">MicaLingo</Link>
          </h1>
        </div>
        <nav className="flex flex-col gap-1 px-4 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded transition-colors ${
                location.pathname === link.path ? 'bg-gray-800 text-white font-medium' : 'hover:bg-gray-800 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/quiz"
            className="mt-6 bg-blue-600 text-white font-bold px-4 py-2 rounded text-center shadow hover:bg-blue-700 transition-colors"
          >
            Practice
          </Link>
        </nav>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center shadow-md z-10">
        <h1 className="text-xl font-bold tracking-wider">
          <Link to="/">MicaLingo</Link>
        </h1>
        <div className="flex items-center gap-3">
          <Link to="/quiz" className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded shadow hover:bg-blue-700 transition-colors text-sm">
            Practice
          </Link>
          {user ? (
            <button onClick={signOut} title="Sign Out" className="flex items-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-7 h-7 rounded-full border border-gray-700" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-700 text-white flex items-center justify-center font-bold text-xs border border-gray-600">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <Link to="/login" className="text-xs text-gray-400 hover:text-white border border-gray-600 px-2 py-1.5 rounded">Login</Link>
          )}
        </div>
      </div>

      {/* Desktop Top Header & Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        {/* Desktop Top Profile Widget */}
        <header className="hidden md:flex justify-end items-center px-8 py-4 bg-white border-b border-gray-200 shadow-sm z-10">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700 hidden lg:block">{user.displayName || user.email}</span>
              </div>
              <button onClick={signOut} className="text-sm font-medium text-gray-500 hover:text-gray-900 border-l pl-4 border-gray-300 transition-colors">
                Sign Out
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
              Log in
            </Link>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          <div className="max-w-4xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 text-xs font-medium z-10">
        <Link to="/" className={`flex flex-col items-center flex-1 py-2 ${location.pathname === '/' ? 'text-blue-600' : 'text-gray-500'}`}>
          Home
        </Link>
        <Link to="/vocabulary" className={`flex flex-col items-center flex-1 py-2 ${location.pathname === '/vocabulary' ? 'text-blue-600' : 'text-gray-500'}`}>
          Vocab
        </Link>
        <Link to="/import" className={`flex flex-col items-center flex-1 py-2 ${location.pathname === '/import' ? 'text-blue-600' : 'text-gray-500'}`}>
          Import
        </Link>
        <Link to="/quizzes" className={`flex flex-col items-center flex-1 py-2 ${location.pathname === '/quizzes' ? 'text-blue-600' : 'text-gray-500'}`}>
          Quizzes
        </Link>
      </nav>
    </div>
  );
}
