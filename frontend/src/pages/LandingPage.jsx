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
  Code,
  Database,
  Cloud,
  Shield,
  Rocket,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import logo from '../assets/logo.png';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    setIsVisible(true);

    console.log('[LandingPage] useEffect - isAuthenticated:', isAuthenticated);

    // Redirect if already logged in - go to appropriate dashboard
    if (isAuthenticated) {
      const selectedRole = localStorage.getItem('selectedRole');
      console.log('[LandingPage] User is authenticated, selectedRole:', selectedRole);
      if (selectedRole === 'instructor') {
        console.log('[LandingPage] Redirecting to /instructor/dashboard');
        navigate('/instructor/dashboard');
      } else {
        console.log('[LandingPage] Redirecting to /dashboard');
        navigate('/dashboard');
      }
    }

    // Auto-rotate testimonials
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: Users,
      title: 'Expert Instructors',
      description: 'Learn from practitioners who build and ship real products every day',
      color: 'from-blue-500 to-cyan-500',
      delay: '0.1s',
    },
    {
      icon: Zap,
      title: 'Hands-On Practice',
      description: 'Project-based learning — you graduate with work you can show employers',
      color: 'from-purple-500 to-pink-500',
      delay: '0.2s',
    },
    {
      icon: Award,
      title: 'Earn Certificates',
      description: 'Complete a program and receive a verifiable Page Innovations certificate',
      color: 'from-orange-500 to-red-500',
      delay: '0.3s',
    },
    {
      icon: Target,
      title: 'Career Support',
      description: 'Mentorship and guidance from enrollment through to your first role',
      color: 'from-green-500 to-emerald-500',
      delay: '0.4s',
    },
  ];

  const courseCategories = [
    {
      icon: Code,
      title: 'Software Development',
      count: 'Web & Mobile',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
    {
      icon: Sparkles,
      title: 'UX / Product Design',
      count: 'Design & Research',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    },
    {
      icon: Database,
      title: 'Data & AI',
      count: 'Analytics & ML',
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
    },
    {
      icon: Shield,
      title: 'Cyber Security',
      count: 'Defense & Compliance',
      color: 'bg-gradient-to-br from-green-500 to-emerald-600',
    },
  ];

  const stats = [
    { value: '8+', label: 'Career Tracks', icon: BookOpen },
    { value: 'Live', label: 'On-site & Virtual Classes', icon: Users },
    { value: '100%', label: 'Hands-On Projects', icon: TrendingUp },
    { value: '24/7', label: 'Learner Support', icon: MessageCircle },
  ];

  const testimonials = [
    {
      name: 'Chiamaka Eze',
      role: 'Product Designer, Lagos fintech',
      image: 'https://randomuser.me/api/portraits/women/44.jpg',
      quote: 'Page Innovations gave me structure I could not get learning alone. The product design track was fully hands-on — by the end I had a real portfolio, and my instructor kept mentoring me through my first job interviews.',
      rating: 5,
    },
    {
      name: 'Tunde Adeyemi',
      role: 'Frontend Developer, e-commerce startup',
      image: 'https://randomuser.me/api/portraits/men/32.jpg',
      quote: 'I joined the software development cohort as a complete beginner. The live classes and projects made everything practical — I was building real applications within weeks, not just watching videos.',
      rating: 5,
    },
    {
      name: 'Amina Bello',
      role: 'Data Analyst, telecoms',
      image: 'https://randomuser.me/api/portraits/women/68.jpg',
      quote: 'The instructors genuinely care about your progress. Being able to attend on-site in Lagos and continue virtually when I travelled made it possible to finish the program while working full-time.',
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: 'Are classes on-site or online?',
      answer: 'Both. You can attend in person at our Lagos training centre (Fagba) or join the same classes live online — and switch between the two whenever you need to.',
    },
    {
      question: 'Do I get a certificate upon completion?',
      answer: 'Yes! You receive a Page Innovations certificate with a unique verification code after completing each program.',
    },
    {
      question: 'Can I pay in installments?',
      answer: 'Yes — tuition is in naira (₦) and most programs support installment payment plans at checkout, so you can start learning while spreading the cost.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors overflow-hidden font-sans selection:bg-brand-blue/30">
      {/* Enhanced Animated Background - More Subtle */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 -left-40 w-[800px] h-[800px] bg-brand-blue/10 dark:bg-brand-blue/10 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute top-20 -right-40 w-[600px] h-[600px] bg-brand-purple/10 dark:bg-brand-purple/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-brand-blue/10 dark:bg-brand-blue/10 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.05]"></div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 p-3 rounded-full bg-white/80 dark:bg-dark-800/80 backdrop-blur-md shadow-lg border border-gray-200/50 dark:border-gray-700/50 z-50 hover:scale-110 transition-all duration-300"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-700" />
        )}
      </button>

      {/* Navigation */}
      <nav className="fixed w-full z-40 top-0 backdrop-blur-xl bg-white/80 dark:bg-dark-900/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo - Fixed Alignment */}
            <div className="flex items-center gap-3 cursor-pointer select-none">
              <img src={logo} alt="Page Innovations" className="h-12 w-auto" />
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-brand-blue dark:hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-light text-white text-sm font-semibold rounded-full transition-all shadow-lg hover:shadow-brand-blue/25 hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-[90%] mx-auto">
            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 bg-brand-blue/5 dark:bg-brand-blue/10 rounded-full border border-brand-blue/10 mb-8 transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue"></span>
              </span>
              <span className="text-sm font-medium text-brand-blue dark:text-brand-blue-300">
                Practical Tech Training — On-site in Lagos & Live Online
              </span>
            </div>

            {/* Heading */}
            <h1
              className={`text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-8 leading-[1.1] tracking-tight transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              Launch Your Tech Career with <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red animate-gradient-x">
                Practical Training
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className={`text-xl md:text-2xl text-gray-700 dark:text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed transition-all duration-700 delay-100 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              Master software development, product design, data &amp; AI, and cyber security with <span className="text-brand-blue dark:text-cyan-400 font-bold">hands-on programs</span> taught by <span className="text-brand-purple dark:text-purple-400 font-bold">industry practitioners</span> — from concept to launch, and beyond.
            </p>

            {/* Role Selection — modern bento with gradient border + bullets */}
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto transition-all duration-700 delay-200 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {/* Student Card */}
              <button
                onClick={() => {
                  localStorage.setItem('selectedRole', 'student');
                  navigate('/login');
                }}
                className="group relative text-left rounded-2xl p-[1.5px] bg-gradient-to-br from-brand-blue/40 via-cyan-400/20 to-transparent hover:from-brand-blue hover:via-cyan-400/60 hover:to-brand-blue/40 transition-all duration-500 shadow-xl shadow-brand-blue/5 hover:shadow-2xl hover:shadow-brand-blue/30 hover:-translate-y-1"
              >
                <div className="relative h-full rounded-2xl bg-white dark:bg-dark-800/95 backdrop-blur-xl p-6 sm:p-7 overflow-hidden">
                  {/* Soft radial glow */}
                  <div className="absolute -top-20 -right-20 w-56 h-56 bg-brand-blue/10 rounded-full blur-3xl group-hover:bg-brand-blue/20 transition-colors duration-500" />

                  <div className="relative z-10">
                    {/* Header row: icon + popular pill */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-blue/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        <BookOpen className="w-6 h-6 text-white" strokeWidth={2.2} />
                      </div>
                      <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue dark:text-cyan-400 border border-brand-blue/20">
                        Most Popular
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-[1.65rem] font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
                      I'm a Student
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-5 text-sm sm:text-base leading-relaxed">
                      Master in-demand skills with hands-on courses, live sessions, and real projects.
                    </p>

                    {/* Benefits */}
                    <ul className="space-y-2 mb-6">
                      {[
                        'Learn on-site in Lagos or live online',
                        'Real projects, live Q&A and community',
                        'Verifiable certificate on completion',
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-brand-blue dark:text-cyan-400 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="flex items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-700/60">
                      <span className="text-brand-blue dark:text-cyan-400 font-semibold text-sm">
                        Get Started — Free
                      </span>
                      <span className="w-9 h-9 rounded-full bg-brand-blue/10 group-hover:bg-brand-blue dark:group-hover:bg-cyan-500 flex items-center justify-center transition-all duration-300 group-hover:translate-x-1">
                        <ArrowRight className="w-4 h-4 text-brand-blue dark:text-cyan-400 group-hover:text-white transition-colors" />
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Instructor Card */}
              <button
                onClick={() => {
                  localStorage.setItem('selectedRole', 'instructor');
                  navigate('/login');
                }}
                className="group relative text-left rounded-2xl p-[1.5px] bg-gradient-to-br from-brand-purple/40 via-fuchsia-400/20 to-transparent hover:from-brand-purple hover:via-fuchsia-400/60 hover:to-brand-purple/40 transition-all duration-500 shadow-xl shadow-brand-purple/5 hover:shadow-2xl hover:shadow-brand-purple/30 hover:-translate-y-1"
              >
                <div className="relative h-full rounded-2xl bg-white dark:bg-dark-800/95 backdrop-blur-xl p-6 sm:p-7 overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-56 h-56 bg-brand-purple/10 rounded-full blur-3xl group-hover:bg-brand-purple/20 transition-colors duration-500" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-purple to-fuchsia-500 flex items-center justify-center shadow-lg shadow-brand-purple/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        <Users className="w-6 h-6 text-white" strokeWidth={2.2} />
                      </div>
                      <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-brand-purple/10 text-brand-purple dark:text-purple-300 border border-brand-purple/20">
                        Earn Income
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-[1.65rem] font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
                      I'm an Instructor
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-5 text-sm sm:text-base leading-relaxed">
                      Teach what you love, build a global audience, and earn from every enrollment.
                    </p>

                    <ul className="space-y-2 mb-6">
                      {[
                        'Reach thousands of learners',
                        'Keep up to 70% of revenue',
                        'Pro tools — drip, live, analytics',
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-brand-purple dark:text-purple-400 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-700/60">
                      <span className="text-brand-purple dark:text-purple-300 font-semibold text-sm">
                        Apply to Teach
                      </span>
                      <span className="w-9 h-9 rounded-full bg-brand-purple/10 group-hover:bg-brand-purple dark:group-hover:bg-fuchsia-500 flex items-center justify-center transition-all duration-300 group-hover:translate-x-1">
                        <ArrowRight className="w-4 h-4 text-brand-purple dark:text-purple-300 group-hover:text-white transition-colors" />
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-20 pt-10 border-t border-gray-200/50 dark:border-gray-800/50">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8 uppercase tracking-wider">
                Our learners build careers across
              </p>
              <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                {['Fintech', 'E-Commerce', 'Telecoms', 'EdTech', 'HealthTech'].map((sector) => (
                  <span key={sector} className="text-xl font-bold text-gray-800 dark:text-white">
                    {sector}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Clean & Minimal */}
      <section className="py-20 bg-white dark:bg-dark-800/50 border-y border-gray-100 dark:border-gray-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-blue/5 dark:bg-transparent"></div>
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-[90%] mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group hover:-translate-y-1 transition-transform duration-300">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white dark:bg-dark-700 shadow-lg shadow-brand-blue/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="w-8 h-8 text-brand-blue dark:text-cyan-400" />
                </div>
                <div className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-purple dark:from-white dark:to-gray-300">
                  {stat.value}
                </div>
                <div className="text-gray-700 dark:text-gray-300 font-semibold text-base sm:text-lg">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-24">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6">
          <div className="max-w-full mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Explore Categories
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
                Master the skills that matter most in today's tech industry.
              </p>
            </div>
            <Link to="/courses" className="text-brand-blue dark:text-cyan-400 font-bold text-lg hover:underline flex items-center gap-2">
              View all categories <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courseCategories.map((category, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-white dark:bg-dark-800 border border-gray-100 dark:border-gray-700 hover:border-brand-blue/30 transition-all shadow-lg shadow-gray-200/50 dark:shadow-none hover:shadow-xl hover:shadow-brand-blue/10 cursor-pointer relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className={`w-12 h-12 rounded-xl ${category.color.replace('bg-gradient-to-br', 'bg')} bg-opacity-10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <category.icon className="w-6 h-6 text-gray-900 dark:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 relative z-10">
                  {category.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium relative z-10">
                  {category.count}
                </p>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50 dark:bg-dark-800/30">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6">
          <div className="max-w-full mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Page Innovations?
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Everything you need to succeed in your tech career.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl bg-white dark:bg-dark-800 border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-brand-blue/10 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-dark-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-brand-blue" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6">
          <div className="max-w-full mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Loved by our learners
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
                Join the professionals who launched and grew their tech careers with Page Innovations.
              </p>
              
              <div className="flex gap-4 mb-8">
                <button 
                  onClick={() => setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                  className="p-3 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors"
                >
                  <ArrowRight className="w-5 h-5 rotate-180 text-gray-600 dark:text-gray-400" />
                </button>
                <button 
                  onClick={() => setActiveTestimonial((prev) => (prev + 1) % testimonials.length)}
                  className="p-3 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors"
                >
                  <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/20 to-brand-purple/20 rounded-3xl transform rotate-3 scale-105 opacity-50 blur-xl"></div>
              <div className="relative bg-white dark:bg-dark-800 p-10 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-xl">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <blockquote className="text-xl lg:text-2xl font-medium text-gray-900 dark:text-white mb-8 leading-relaxed">
                  "{testimonials[activeTestimonial].quote}"
                </blockquote>
                <div className="flex items-center gap-4">
                  <img
                    src={testimonials[activeTestimonial].image}
                    alt={testimonials[activeTestimonial].name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-lg">
                      {testimonials[activeTestimonial].name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                      {testimonials[activeTestimonial].role}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50 dark:bg-dark-800/30">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{faq.question}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6">
          <div className="max-w-full mx-auto">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-brand-blue px-6 py-20 text-center">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue to-brand-purple opacity-90"></div>
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to start learning?
              </h2>
              <p className="text-xl text-blue-100 mb-10">
                Pick a track, join a cohort, and start your journey to becoming a tech professional today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/signup"
                  className="px-8 py-4 bg-white text-brand-blue font-bold rounded-full hover:bg-blue-50 transition-colors"
                >
                  Get Started for Free
                </Link>
                <Link
                  to="/courses"
                  className="px-8 py-4 bg-transparent border border-white/30 text-white font-bold rounded-full hover:bg-white/10 transition-colors"
                >
                  Browse Courses
                </Link>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-gray-800 pt-16 pb-8">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6">
          <div className="max-w-full mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <img src={logo} alt="Page Innovations" className="h-8 w-auto" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed font-medium">
                Practical tech training that upskills people and teams — from
                concept to launch, and beyond. On-site in Lagos and live online.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 text-lg">Platform</h4>
              <ul className="space-y-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                <li><Link to="/courses" className="hover:text-brand-blue dark:hover:text-cyan-400 transition-colors">Browse Courses</Link></li>
                <li><Link to="/instructor-apply" className="hover:text-brand-blue dark:hover:text-cyan-400 transition-colors">Become an Instructor</Link></li>
                <li><Link to="/login" className="hover:text-brand-blue dark:hover:text-cyan-400 transition-colors">Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 text-lg">Company</h4>
              <ul className="space-y-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                <li><a href="https://pageinnovations.com.ng/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-blue dark:hover:text-cyan-400 transition-colors">About Us</a></li>
                <li><a href="https://pageinnovations.com.ng/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-blue dark:hover:text-cyan-400 transition-colors">Our Services</a></li>
                <li><a href="mailto:enquiries@pageinnovations.com.ng" className="hover:text-brand-blue dark:hover:text-cyan-400 transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 text-lg">Legal</h4>
              <ul className="space-y-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                <li><a href="#" className="hover:text-brand-blue dark:hover:text-cyan-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-brand-blue dark:hover:text-cyan-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-brand-blue dark:hover:text-cyan-400 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Page Innovations. All rights reserved.
          </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .dark .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px);
        }
      `}</style>
    </div>
  );
}
