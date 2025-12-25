import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  BookOpen,
  Users,
  Award,
  TrendingUp,
  Star,
  CheckCircle,
  ArrowRight,
  Play,
  Sun,
  Moon,
  Sparkles,
  Zap,
  Target,
  Globe,
} from 'lucide-react';
import logo from '../assets/logo.png';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    // Redirect if already logged in
    if (isAuthenticated) {
      navigate('/role-selector');
    }
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: Users,
      title: 'Expert Instructors',
      description: 'Learn from industry professionals with years of experience',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Zap,
      title: 'Hands-On Practice',
      description: 'Real-world projects and interactive exercises',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Award,
      title: 'Earn Certifications',
      description: 'Get recognized credentials for your achievements',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Target,
      title: 'Career Support',
      description: 'Job placement assistance and career guidance',
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Students Enrolled' },
    { value: '500+', label: 'Expert Courses' },
    { value: '98%', label: 'Success Rate' },
    { value: '24/7', label: 'Support Available' },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Software Engineer',
      image: 'https://randomuser.me/api/portraits/women/44.jpg',
      quote: 'TekyPro transformed my career. The SQL mastery course landed me my dream job!',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      role: 'Data Analyst',
      image: 'https://randomuser.me/api/portraits/men/32.jpg',
      quote: 'The hands-on projects were invaluable. I now work at a Fortune 500 company.',
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      role: 'Full Stack Developer',
      image: 'https://randomuser.me/api/portraits/women/68.jpg',
      quote: 'Best investment in my education. The instructors are world-class!',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 transition-colors">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 p-3 rounded-xl bg-white dark:bg-dark-800 shadow-lg hover:shadow-xl transition-all z-50 group"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-500 group-hover:rotate-180 transition-transform duration-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-700 group-hover:-rotate-12 transition-transform duration-500" />
        )}
      </button>

      {/* Navigation */}
      <nav className="relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img src={logo} alt="TekyPro" className="h-10 w-auto" />
              <span className="text-2xl font-bold bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red bg-clip-text text-transparent">
                TekyPro
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-brand-blue dark:hover:text-brand-blue transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-brand-blue/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-brand-red/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-800 rounded-full shadow-md mb-6 transition-all ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
              style={{ transitionDelay: '0.1s' }}>
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                #1 Remote DBA Training Platform
              </span>
            </div>

            {/* Main Heading */}
            <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '0.2s' }}>
              Transform Your Career
              <br />
              <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red bg-clip-text text-transparent">
                with Expert Training
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '0.3s' }}>
              Master database administration, cloud technologies, and more with hands-on courses from industry experts
            </p>

            {/* CTA Buttons - The Main Feature! */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
              style={{ transitionDelay: '0.4s' }}>

              {/* Student Button */}
              <Link
                to="/register?role=student"
                className="group relative overflow-hidden bg-white dark:bg-dark-800 rounded-3xl p-8 shadow-xl hover:shadow-2xl border-2 border-transparent hover:border-brand-blue transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
              >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Icon */}
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-brand-blue to-blue-600 rounded-2xl flex items-center justify-center transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-lg">
                    <BookOpen className="w-10 h-10 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-brand-blue transition-colors">
                    I'm a Student
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                    Start your learning journey and master new skills
                  </p>

                  {/* Features */}
                  <ul className="space-y-2 mb-6 text-left">
                    <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Access 500+ expert courses
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Get certified credentials
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      24/7 learning support
                    </li>
                  </ul>

                  {/* Button */}
                  <div className="inline-flex items-center gap-2 text-brand-blue font-semibold group-hover:gap-4 transition-all">
                    Get Started
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Shine Effect */}
                <div className="absolute inset-0 -top-full group-hover:top-full bg-gradient-to-b from-white/0 via-white/20 to-white/0 transform transition-transform duration-1000"></div>
              </Link>

              {/* Tutor Button */}
              <Link
                to="/register?role=instructor"
                className="group relative overflow-hidden bg-white dark:bg-dark-800 rounded-3xl p-8 shadow-xl hover:shadow-2xl border-2 border-transparent hover:border-brand-purple transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
              >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Icon */}
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-brand-purple to-purple-600 rounded-2xl flex items-center justify-center transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-lg">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-brand-purple transition-colors">
                    I'm a Tutor
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                    Share your expertise and earn money teaching
                  </p>

                  {/* Features */}
                  <ul className="space-y-2 mb-6 text-left">
                    <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Reach 10,000+ students
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Earn passive income
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Full platform support
                    </li>
                  </ul>

                  {/* Button */}
                  <div className="inline-flex items-center gap-2 text-brand-purple font-semibold group-hover:gap-4 transition-all">
                    Apply Now
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Shine Effect */}
                <div className="absolute inset-0 -top-full group-hover:top-full bg-gradient-to-b from-white/0 via-white/20 to-white/0 transform transition-transform duration-1000"></div>
              </Link>
            </div>

            {/* Trust Indicators */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Trusted by professionals at{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">Google</span>,{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">Amazon</span>,{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">Microsoft</span>
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white dark:bg-dark-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center transform hover:scale-110 transition-transform duration-300"
              >
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-400 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose TekyPro?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need to succeed in your tech career
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white dark:bg-dark-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Success Stories
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Hear from our amazing students
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-dark-700 rounded-2xl p-8 transition-all duration-300 hover:shadow-xl"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red rounded-3xl p-12 shadow-2xl">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Career?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of students and start your journey today
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-brand-blue font-bold rounded-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-lg"
            >
              Get Started Free
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-border-dark py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="TekyPro" className="h-8 w-auto" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                TekyPro
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              © 2025 TekyPro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
