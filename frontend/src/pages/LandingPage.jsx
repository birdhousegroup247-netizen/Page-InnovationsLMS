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

    // Redirect if already logged in
    if (isAuthenticated) {
      navigate('/role-selector');
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
      description: 'Learn from industry professionals with 10+ years experience',
      color: 'from-blue-500 to-cyan-500',
      delay: '0.1s',
    },
    {
      icon: Zap,
      title: 'Hands-On Practice',
      description: 'Real-world projects with interactive coding environments',
      color: 'from-purple-500 to-pink-500',
      delay: '0.2s',
    },
    {
      icon: Award,
      title: 'Earn Certifications',
      description: 'Industry-recognized credentials to boost your career',
      color: 'from-orange-500 to-red-500',
      delay: '0.3s',
    },
    {
      icon: Target,
      title: 'Career Support',
      description: 'Dedicated job placement assistance and mentorship',
      color: 'from-green-500 to-emerald-500',
      delay: '0.4s',
    },
  ];

  const courseCategories = [
    {
      icon: Database,
      title: 'Database Administration',
      count: '150+ Courses',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
    {
      icon: Cloud,
      title: 'Cloud Computing',
      count: '120+ Courses',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    },
    {
      icon: Code,
      title: 'Full Stack Development',
      count: '200+ Courses',
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
    },
    {
      icon: Shield,
      title: 'Cybersecurity',
      count: '90+ Courses',
      color: 'bg-gradient-to-br from-green-500 to-emerald-600',
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Students Enrolled', icon: Users },
    { value: '500+', label: 'Expert Courses', icon: BookOpen },
    { value: '98%', label: 'Success Rate', icon: TrendingUp },
    { value: '24/7', label: 'Support Available', icon: MessageCircle },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Senior Software Engineer @ Google',
      image: 'https://randomuser.me/api/portraits/women/44.jpg',
      quote: 'TekyPro transformed my career trajectory. The SQL mastery course not only taught me advanced concepts but also prepared me for real-world challenges. Within 3 months, I landed my dream job at Google!',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      role: 'Lead Data Analyst @ Amazon',
      image: 'https://randomuser.me/api/portraits/men/32.jpg',
      quote: 'The hands-on projects were invaluable. Unlike other platforms, TekyPro focuses on practical skills that employers actually need. I now work at Amazon thanks to the comprehensive training.',
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      role: 'Full Stack Developer @ Microsoft',
      image: 'https://randomuser.me/api/portraits/women/68.jpg',
      quote: 'Best investment in my education! The instructors are world-class professionals who genuinely care about your success. The platform is intuitive and the community is incredibly supportive.',
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: 'How long does it take to complete a course?',
      answer: 'Course duration varies from 4-12 weeks depending on complexity. You can learn at your own pace with lifetime access.',
    },
    {
      question: 'Do I get a certificate upon completion?',
      answer: 'Yes! You receive an industry-recognized certificate with a unique verification code after completing each course.',
    },
    {
      question: 'Is there a money-back guarantee?',
      answer: '30-day money-back guarantee on all courses. If you\'re not satisfied, we\'ll refund your payment, no questions asked.',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 transition-colors overflow-hidden">
      {/* Enhanced Animated Background with Gradient Mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Animated gradient blobs */}
        <div className="absolute top-0 -left-40 w-96 h-96 bg-gradient-to-br from-brand-blue/20 to-cyan-500/20 dark:from-brand-blue/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-20 -right-40 w-96 h-96 bg-gradient-to-br from-brand-purple/20 to-pink-500/20 dark:from-brand-purple/10 dark:to-pink-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-gradient-to-br from-brand-red/20 to-orange-500/20 dark:from-brand-red/10 dark:to-orange-500/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      </div>

      {/* Theme Toggle - Glass-morphism */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 p-4 rounded-2xl bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl shadow-2xl hover:shadow-brand-blue/20 hover:scale-110 transition-all duration-300 z-50 group border border-gray-200/50 dark:border-gray-700/50"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-500 group-hover:rotate-180 transition-transform duration-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-700 group-hover:-rotate-180 transition-transform duration-500" />
        )}
      </button>

      {/* Navigation - Glass-morphism */}
      <nav className="relative z-40 sticky top-0 backdrop-blur-xl bg-white/70 dark:bg-dark-900/70 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <img src={logo} alt="TekyPro" className="h-12 w-auto transform group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-blue to-brand-purple rounded-full blur-xl opacity-0 group-hover:opacity-30 transition-opacity"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red bg-clip-text text-transparent">
                TekyPro
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:text-brand-blue dark:hover:text-brand-blue transition-all font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-dark-800"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red text-white rounded-xl font-semibold overflow-hidden group shadow-lg hover:shadow-2xl hover:shadow-brand-blue/50 transition-all duration-300"
              >
                <span className="relative z-10">Get Started</span>
                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-purple via-brand-red to-brand-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Enhanced */}
      <section className="relative pt-20 pb-32 sm:pt-32 sm:pb-40">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            {/* Badge with glass effect */}
            <div
              className={`inline-flex items-center gap-2 px-5 py-2.5 bg-white/60 dark:bg-dark-800/60 backdrop-blur-xl rounded-full shadow-lg border border-gray-200/50 dark:border-gray-700/50 mb-8 transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
              }`}
              style={{ transitionDelay: '0.1s' }}
            >
              <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
              <span className="text-sm font-semibold bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
                #1 Remote DBA Training Platform
              </span>
              <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse"></div>
            </div>

            {/* Main Heading with enhanced gradient */}
            <h1
              className={`text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-gray-900 dark:text-white mb-8 leading-tight transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '0.2s' }}
            >
              <span className="block mb-2">Transform Your Career</span>
              <span className="block bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red bg-clip-text text-transparent animate-gradient-x">
                with Expert Training
              </span>
            </h1>

            {/* Subtitle with better spacing */}
            <p
              className={`text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-16 max-w-4xl mx-auto leading-relaxed transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '0.3s' }}
            >
              Master database administration, cloud technologies, and more with{' '}
              <span className="text-brand-blue dark:text-brand-blue font-semibold">hands-on courses</span> from{' '}
              <span className="text-brand-purple dark:text-brand-purple font-semibold">industry experts</span>
            </p>

            {/* Enhanced CTA Cards with vibrant gradients */}
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16 px-4 transition-all duration-700 ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              style={{ transitionDelay: '0.4s' }}
            >
              {/* Student Card - Vibrant Gradient Design */}
              <Link
                to="/register?role=student"
                className="group relative overflow-hidden rounded-3xl p-[2px] transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
              >
                {/* Gradient border */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue via-cyan-500 to-blue-600 rounded-3xl animate-gradient-x"></div>

                {/* Card content */}
                <div className="relative bg-white/95 dark:bg-dark-900/95 backdrop-blur-2xl rounded-[22px] p-10 h-full">
                  {/* Animated gradient background overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/10 via-cyan-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500 rounded-[22px]"></div>

                  {/* Floating icon with 3D effect */}
                  <div className="relative z-10 mb-8">
                    <div className="w-28 h-28 mx-auto bg-gradient-to-br from-brand-blue via-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-2xl shadow-brand-blue/60">
                      <BookOpen className="w-14 h-14 text-white" />
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-blue to-cyan-500 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <h3 className="text-3xl lg:text-4xl font-black mb-4">
                      <span className="bg-gradient-to-r from-brand-blue via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                        I'm a Student
                      </span>
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg leading-relaxed font-medium">
                      Start your learning journey and master new skills with expert guidance
                    </p>

                    {/* Features with checkmarks */}
                    <ul className="space-y-4 mb-8 text-left">
                      {['Access 500+ expert courses', 'Get certified credentials', '24/7 learning support'].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-gray-800 dark:text-gray-200">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-semibold">{item}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-brand-blue via-cyan-500 to-blue-600 text-white font-bold text-lg rounded-2xl group-hover:shadow-2xl group-hover:shadow-brand-blue/50 transition-all">
                      Get Started
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 -inset-x-full group-hover:inset-x-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-all duration-1000 rounded-[22px]"></div>
                </div>
              </Link>

              {/* Tutor Card - Glass-morphism */}
              <Link
                to="/register?role=instructor"
                className="group relative overflow-hidden bg-white/70 dark:bg-dark-800/70 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-gray-200/50 dark:border-gray-700/50 hover:border-brand-purple/50 dark:hover:border-brand-purple/50 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
              >
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Floating icon with 3D effect */}
                <div className="relative z-10 mb-8">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-brand-purple to-purple-600 rounded-3xl flex items-center justify-center transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-2xl shadow-brand-purple/50">
                    <Users className="w-12 h-12 text-white" />
                  </div>
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-purple to-purple-600 rounded-3xl blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 transform translate-y-2"></div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-brand-purple dark:group-hover:text-brand-purple transition-colors">
                    I'm a Tutor
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed">
                    Share your expertise and earn money teaching thousands of students
                  </p>

                  {/* Features with checkmarks */}
                  <ul className="space-y-3 mb-8 text-left">
                    {['Reach 10,000+ students', 'Earn passive income', 'Full platform support'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <div className="inline-flex items-center gap-3 text-brand-purple font-bold text-lg group-hover:gap-5 transition-all">
                    Apply Now
                    <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center group-hover:bg-brand-purple group-hover:text-white transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 -inset-x-full group-hover:inset-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transition-all duration-1000"></div>
              </Link>
            </div>

            {/* Enhanced Trust Indicators */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Trusted by professionals at
              </p>
              <div className="flex items-center gap-8 flex-wrap justify-center">
                {['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple'].map((company) => (
                  <span
                    key={company}
                    className="font-bold text-lg text-gray-700 dark:text-gray-300 hover:text-brand-blue dark:hover:text-brand-blue transition-colors cursor-default"
                  >
                    {company}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="flex justify-center">
            <div className="animate-bounce">
              <ChevronDown className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Enhanced with icons and animations */}
      <section className="py-24 bg-gradient-to-br from-white to-gray-50 dark:from-dark-800 dark:to-dark-900 transition-colors border-y border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group text-center transform hover:scale-110 transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue/10 to-brand-purple/10 dark:from-brand-blue/20 dark:to-brand-purple/20 mb-4 group-hover:shadow-xl group-hover:shadow-brand-blue/20 transition-all">
                  <stat.icon className="w-8 h-8 text-brand-blue dark:text-brand-blue" />
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-400 font-semibold text-sm sm:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Categories Preview */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              Explore Our Course Categories
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              From databases to cloud computing, master the skills that matter most in today's tech industry
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courseCategories.map((category, index) => (
              <div
                key={index}
                className="group cursor-pointer bg-white/70 dark:bg-dark-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:border-transparent transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
              >
                <div className={`w-16 h-16 ${category.color} rounded-2xl flex items-center justify-center mb-4 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                  <category.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-brand-blue dark:group-hover:text-brand-blue transition-colors">
                  {category.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {category.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced */}
      <section className="py-24 bg-gradient-to-br from-white to-gray-50 dark:from-dark-800 dark:to-dark-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              Why Choose <span className="bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">TekyPro</span>?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Everything you need to succeed in your tech career, all in one platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white/70 dark:bg-dark-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:border-transparent transition-all duration-500 transform hover:-translate-y-3"
                style={{ animationDelay: feature.delay }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-brand-blue dark:group-hover:text-brand-blue transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section - Carousel Style */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              Success Stories from Our <span className="bg-gradient-to-r from-brand-purple to-brand-red bg-clip-text text-transparent">Students</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Join thousands of professionals who transformed their careers with TekyPro
            </p>
          </div>

          {/* Featured Testimonial - Large */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-dark-800 dark:to-dark-900 rounded-3xl p-12 shadow-2xl border border-gray-200/50 dark:border-gray-700/50 transform transition-all duration-500">
              <div className="flex items-center gap-2 mb-6">
                {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <p className="text-2xl text-gray-700 dark:text-gray-300 mb-8 italic leading-relaxed">
                "{testimonials[activeTestimonial].quote}"
              </p>
              <div className="flex items-center gap-6">
                <img
                  src={testimonials[activeTestimonial].image}
                  alt={testimonials[activeTestimonial].name}
                  className="w-20 h-20 rounded-full ring-4 ring-white dark:ring-dark-700 shadow-lg"
                />
                <div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {testimonials[activeTestimonial].name}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {testimonials[activeTestimonial].role}
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial Indicators */}
            <div className="flex justify-center gap-3 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === activeTestimonial
                      ? 'bg-gradient-to-r from-brand-blue to-brand-purple w-8'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* All Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                onClick={() => setActiveTestimonial(index)}
                className={`cursor-pointer bg-white/70 dark:bg-dark-800/70 backdrop-blur-xl rounded-2xl p-8 transition-all duration-300 border ${
                  index === activeTestimonial
                    ? 'border-brand-blue shadow-2xl shadow-brand-blue/20 scale-105'
                    : 'border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl'
                }`}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6 line-clamp-3">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      {testimonial.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {testimonial.role.split('@')[0]}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gradient-to-br from-white to-gray-50 dark:from-dark-800 dark:to-dark-900 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Everything you need to know about TekyPro
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group bg-white/70 dark:bg-dark-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300"
              >
                <summary className="flex items-center justify-between cursor-pointer text-lg font-bold text-gray-900 dark:text-white list-none">
                  {faq.question}
                  <ChevronDown className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section - Enhanced */}
      <section className="py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red rounded-3xl p-16 shadow-2xl">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-grid-pattern"></div>
            </div>

            <div className="relative z-10 text-center">
              <Rocket className="w-16 h-16 text-white mx-auto mb-6 animate-bounce" />
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6">
                Ready to Transform Your Career?
              </h2>
              <p className="text-xl sm:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">
                Join 10,000+ students and start your journey to becoming a tech professional today
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-3 px-10 py-5 bg-white text-brand-blue font-bold rounded-2xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-lg group"
                >
                  Start Learning Free
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </Link>
                <Link
                  to="/register?role=instructor"
                  className="inline-flex items-center gap-3 px-10 py-5 bg-white/10 backdrop-blur-xl text-white font-bold rounded-2xl border-2 border-white/30 hover:bg-white/20 transition-all duration-300 text-lg"
                >
                  Become an Instructor
                </Link>
              </div>
              <p className="mt-8 text-white/70 text-sm">
                ✓ No credit card required • ✓ 30-day money-back guarantee • ✓ Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <footer className="bg-white/70 dark:bg-dark-800/70 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 group cursor-pointer">
              <img src={logo} alt="TekyPro" className="h-10 w-auto transform group-hover:scale-110 transition-transform" />
              <span className="text-2xl font-bold bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red bg-clip-text text-transparent">
                TekyPro
              </span>
            </div>
            <div className="flex items-center gap-8">
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-brand-blue dark:hover:text-brand-blue transition-colors font-medium">
                About
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-brand-blue dark:hover:text-brand-blue transition-colors font-medium">
                Courses
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-brand-blue dark:hover:text-brand-blue transition-colors font-medium">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-600 dark:text-gray-400 text-sm">
            © 2025 TekyPro. All rights reserved. Built with ❤️ for learners worldwide.
          </div>
        </div>
      </footer>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
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

        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }

        .bg-grid-pattern {
          background-image: linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .dark .bg-grid-pattern {
          background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
        }
      `}</style>
    </div>
  );
}
