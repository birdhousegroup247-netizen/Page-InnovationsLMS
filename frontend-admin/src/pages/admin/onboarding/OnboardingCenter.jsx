import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  GraduationCap,
  Briefcase,
  BookOpen,
  ClipboardCheck,
  Wallet,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Container, PageHeader } from '../../../components/layout';
import { Button } from '../../../components/ui';

/**
 * Onboarding Center — entry chooser for the two registration wizards.
 *
 * "Who would you like to add?" → Add Student (LMS enrollment path) or
 * Add Staff (trainer / employee path). Bulk additions hand off to the
 * existing CSV import on the Users page.
 */
const PATHS = [
  {
    key: 'student',
    icon: GraduationCap,
    title: 'Add Student',
    description:
      'Register a new trainee into the learning management module. Perfect for onboarding cohort members, individual learners, or external contractors requiring training certification.',
    chips: [
      { icon: BookOpen, label: 'LMS Access' },
      { icon: ClipboardCheck, label: 'Enrollment' },
    ],
    cta: 'Start Student Onboarding',
    to: '/onboarding/student',
    featured: true,
  },
  {
    key: 'staff',
    icon: Briefcase,
    title: 'Add Staff',
    description:
      'Configure a new employee record within the core HR system. Used for department hires, management roles, and internal administrative personnel.',
    chips: [
      { icon: Wallet, label: 'Payroll Setup' },
      { icon: ShieldCheck, label: 'Admin Perms' },
    ],
    cta: 'Initiate Staff Registration',
    to: '/onboarding/staff',
    featured: false,
  },
];

export default function OnboardingCenter() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-light-100 dark:bg-dark-900">
      <PageHeader
        icon={UserPlus}
        title="Onboarding Center"
        subtitle="Register new users into the Page Innovations ecosystem"
      />

      <Container className="py-10">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1 rounded-xl bg-brand-red-50 dark:bg-brand-red-900/30 text-brand-red dark:text-brand-red-300 text-xs font-bold uppercase tracking-wider">
            Onboarding Wizard
          </span>
          <h2 className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">
            Who would you like to add?
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-gray-600 dark:text-gray-400">
            Select the appropriate workflow to register a new user into the
            Page Innovations ecosystem. Each path offers specialized
            configuration for specific roles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {PATHS.map(({ key, icon: Icon, title, description, chips, cta, to, featured }) => (
            <div
              key={key}
              className={`bg-white dark:bg-dark-800 rounded-xl p-8 sm:p-10 flex flex-col items-center text-center shadow-sm transition-shadow hover:shadow-lg ${
                featured
                  ? 'border-2 border-brand-red'
                  : 'border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="w-16 h-16 rounded-xl bg-brand-blue-100 dark:bg-dark-700 flex items-center justify-center mb-6">
                <Icon className="w-8 h-8 text-brand-red" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 flex-1">
                {description}
              </p>
              <div className="flex items-center gap-6 mb-8">
                {chips.map(({ icon: ChipIcon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-2 text-xs font-medium tracking-wide text-gray-600 dark:text-gray-400"
                  >
                    <ChipIcon className="w-4 h-4 text-brand-red" />
                    {label}
                  </span>
                ))}
              </div>
              <Button
                fullWidth
                size="lg"
                className="!bg-brand-red hover:!bg-brand-red-600 !text-white focus:!ring-brand-red"
                onClick={() => navigate(to)}
              >
                {cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mt-10 bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-brand-red flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                Need to add users in bulk?
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload a CSV from the Users page to register many accounts at
                once.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/users')}>
            Go to CSV Import
          </Button>
        </div>
      </Container>
    </div>
  );
}
