import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Users, LogOut, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.png';

export default function RoleSelector() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const roles = [
    {
      name: 'student',
      title: 'Student',
      icon: BookOpen,
      description: 'Continue your learning journey',
      color: 'from-brand-blue to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
      route: '/dashboard',
      // Students, instructors, and admins can all access the student dashboard
      available: true,
    },
    {
      name: 'instructor',
      title: 'Instructor',
      icon: Users,
      description: 'Manage courses and students',
      color: 'from-brand-purple to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
      route: '/instructor/dashboard',
      available: user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'super_admin',
    },
  ];

  const availableRoles = roles.filter(role => role.available);

  // If only one role, auto-redirect after 1.5 seconds
  useEffect(() => {
    if (availableRoles.length === 1) {
      const timer = setTimeout(() => {
        navigate(availableRoles[0].route);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [availableRoles, navigate]);

  const handleRoleSelect = (role) => {
    // Store selected role in localStorage for analytics
    localStorage.setItem('selectedRole', role.name);
    localStorage.setItem('lastRoleSelection', new Date().toISOString());

    navigate(role.route);
  };

  const handleLogout = () => {
    // logout() hard-redirects when done — navigating here too would race it
    // (login page mounts while still "authenticated" → bounced → flicker).
    logout({ redirect: '/login' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 flex items-center justify-center p-4 transition-colors">
      {/* Animated background elements */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl animate-float" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="max-w-5xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <img
            src={logo}
            alt="Page Innovations"
            className="h-16 sm:h-20 mx-auto mb-6 drop-shadow-lg"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {user?.full_name}! 👋
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Choose your role to continue
          </p>
        </div>

        {/* Auto-redirect message for single role */}
        {availableRoles.length === 1 && (
          <div className="text-center mb-8 animate-pulse">
            <p className="text-brand-blue dark:text-blue-400 font-medium">
              Redirecting you to your {availableRoles[0].title.toLowerCase()} dashboard...
            </p>
          </div>
        )}

        {/* Role Cards */}
        <div className={`grid grid-cols-1 gap-6 mb-8 ${
          availableRoles.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' :
          availableRoles.length === 3 ? 'md:grid-cols-3' :
          'max-w-md mx-auto'
        }`}>
          {availableRoles.map((role, index) => (
            <button
              key={role.name}
              onClick={() => handleRoleSelect(role)}
              className="bg-white dark:bg-dark-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-transparent hover:border-gray-200 dark:hover:border-dark-600 animate-scale-in relative overflow-hidden group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                   style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />

              {/* Badge */}
              {role.badge && (
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full">
                    {role.badge}
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mx-auto mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                <role.icon className="w-10 h-10 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {role.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 mb-6 min-h-[3rem]">
                {role.description}
              </p>

              {/* Continue Button */}
              <div className={`inline-flex items-center gap-2 font-semibold bg-gradient-to-r ${role.color} ${role.hoverColor} text-white px-8 py-3 rounded-xl transition-all duration-300 transform group-hover:translate-x-1 shadow-md`}>
                Continue
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          ))}
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 mb-6 max-w-2xl mx-auto animate-slide-up">
          <p className="text-sm text-blue-800 dark:text-blue-400 text-center">
            💡 You can switch between roles anytime from your profile menu
          </p>
        </div>

        {/* Logout Button */}
        <div className="text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
