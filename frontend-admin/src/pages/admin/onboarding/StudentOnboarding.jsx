import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ArrowLeft,
  ShieldCheck,
  Save,
  LifeBuoy,
  Pencil,
  CheckCircle2,
  Copy,
  MapPin,
  Monitor,
} from 'lucide-react';
import { Container, PageHeader } from '../../../components/layout';
import { Button, Input, Select, Spinner } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { onboardingAPI, adminCoursesAPI } from '../../../lib/api';
import { formatPrice } from '../../../utils/currency';
import { cn } from '../../../utils/cn';
import WizardStepper from './WizardStepper';

/**
 * Student Onboarding wizard — Personal Info → Next of Kin → Academic →
 * Review. Page Innovations admin registration wizard; submits to
 * POST /api/admin/onboarding/student which creates the student and
 * (when a program is selected) comp-enrolls them with full side-effects.
 *
 * Draft state autosaves to localStorage so an interrupted onboarding can
 * be resumed ("Draft Mode — your progress is automatically saved").
 */
const STEPS = ['Personal Info', 'Next of Kin', 'Academic', 'Review'];
const DRAFT_KEY = 'onboarding_student_draft';

const EMPTY_FORM = {
  personal: {
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    address: '',
  },
  next_of_kin: {
    full_name: '',
    relationship: '',
    contact_number: '',
    address: '',
  },
  academic: {
    enrollment_type: 'on_site',
    course_id: '',
    preferred_start_date: '',
    highest_qualification: '',
  },
};

const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const RELATIONSHIP_OPTIONS = ['Parent', 'Spouse', 'Sibling', 'Guardian', 'Other'].map(
  (r) => ({ value: r, label: r })
);

const QUALIFICATION_OPTIONS = [
  'Secondary School (SSCE/WAEC)',
  'OND / NCE',
  'HND',
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate',
  'Other',
].map((q) => ({ value: q, label: q }));

function SectionCard({ title, children, onEdit }) {
  return (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </h4>
        {onEdit && (
          <Button variant="ghost" size="sm" leftIcon={<Pencil />} onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right">
        {value || '—'}
      </span>
    </div>
  );
}

export default function StudentOnboarding() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      return draft ? { ...EMPTY_FORM, ...JSON.parse(draft) } : EMPTY_FORM;
    } catch {
      return EMPTY_FORM;
    }
  });
  const [courses, setCourses] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { user, temp_password }

  // Draft autosave
  useEffect(() => {
    if (!result) localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form, result]);

  useEffect(() => {
    adminCoursesAPI
      .getAll({ status: 'published', limit: 500 })
      .then((r) => setCourses(r.data.data?.courses || []))
      .catch(() => setCourses([]));
  }, []);

  const set = (section, field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [section]: { ...f[section], [field]: value } }));
    setErrors((er) => ({ ...er, [`${section}.${field}`]: undefined }));
  };

  const selectedCourse = courses.find(
    (c) => String(c.id) === String(form.academic.course_id)
  );

  const validateStep = (i) => {
    const er = {};
    if (i === 0) {
      if (!form.personal.full_name.trim()) er['personal.full_name'] = 'Full name is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personal.email))
        er['personal.email'] = 'A valid email address is required';
    }
    if (i === 1) {
      if (!form.next_of_kin.full_name.trim())
        er['next_of_kin.full_name'] = 'Next of kin name is required';
      if (!form.next_of_kin.contact_number.trim())
        er['next_of_kin.contact_number'] = 'Contact number is required';
    }
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelOnboarding = () => {
    localStorage.removeItem(DRAFT_KEY);
    navigate('/onboarding');
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await onboardingAPI.createStudent(form);
      localStorage.removeItem(DRAFT_KEY);
      setResult(res.data.data);
      showToast('Student onboarded successfully', 'success');
    } catch (error) {
      showToast(
        error.response?.data?.message || 'Failed to onboard student. Please try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyTempPassword = async () => {
    try {
      await navigator.clipboard.writeText(result.temp_password);
      showToast('Temporary password copied', 'success');
    } catch {
      showToast('Could not copy — please copy it manually', 'error');
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────
  if (result) {
    return (
      <>
        <PageHeader icon={GraduationCap} title="Student Onboarding" />
        <Container size="sm" className="py-12">
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Enrollment Complete
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {result.user.full_name} has been registered
              {result.enrollment ? ' and enrolled in their program' : ''}. A
              welcome email was sent to {result.user.email}.
            </p>
            {result.temp_password && (
              <div className="bg-light-200 dark:bg-dark-700 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Temporary password — share it securely; shown only once
                </p>
                <div className="flex items-center justify-between gap-3">
                  <code className="font-mono text-lg text-gray-900 dark:text-white">
                    {result.temp_password}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Copy temporary password"
                    leftIcon={<Copy />}
                    onClick={copyTempPassword}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="!bg-brand-red hover:!bg-brand-red-600 !text-white focus:!ring-brand-red"
                onClick={() => navigate(`/users/${result.user.id}`)}
              >
                View Student Profile
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setResult(null);
                  setForm(EMPTY_FORM);
                  setStep(0);
                }}
              >
                Onboard Another Student
              </Button>
            </div>
          </div>
        </Container>
      </>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        icon={GraduationCap}
        title="Student Onboarding"
        subtitle="Register a new trainee into the learning management module"
        actions={
          <Button
            variant="outline"
            leftIcon={<ArrowLeft />}
            className="!border-white !text-white hover:!bg-white/10"
            onClick={() => navigate('/onboarding')}
          >
            Onboarding Center
          </Button>
        }
      />

      <Container size="sm" className="py-8">
        <div className="mb-10">
          <WizardStepper steps={STEPS} currentStep={step} />
        </div>

        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8">
          {step === 0 && (
            <>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Personal Information
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Please provide the student&apos;s legal details as they appear on
                official documentation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  required
                  placeholder="John Doe"
                  value={form.personal.full_name}
                  onChange={set('personal', 'full_name')}
                  error={errors['personal.full_name']}
                />
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="john.doe@example.com"
                  value={form.personal.email}
                  onChange={set('personal', 'email')}
                  error={errors['personal.email']}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={form.personal.date_of_birth}
                  onChange={set('personal', 'date_of_birth')}
                />
                <Select
                  label="Gender"
                  placeholder="Select gender"
                  options={GENDER_OPTIONS}
                  value={form.personal.gender}
                  onChange={set('personal', 'gender')}
                />
                <Input
                  label="Nationality"
                  placeholder="e.g. Nigeria"
                  value={form.personal.nationality}
                  onChange={set('personal', 'nationality')}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+234 801 234 5678"
                  value={form.personal.phone}
                  onChange={set('personal', 'phone')}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Home Address"
                    placeholder="Street name, Apartment, City, Postal Code"
                    value={form.personal.address}
                    onChange={set('personal', 'address')}
                  />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Next of Kin Details
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Emergency contact used for the student&apos;s record.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  required
                  placeholder="e.g. Chinelo Adebayo"
                  value={form.next_of_kin.full_name}
                  onChange={set('next_of_kin', 'full_name')}
                  error={errors['next_of_kin.full_name']}
                />
                <Select
                  label="Relationship"
                  placeholder="Select relationship"
                  options={RELATIONSHIP_OPTIONS}
                  value={form.next_of_kin.relationship}
                  onChange={set('next_of_kin', 'relationship')}
                />
                <Input
                  label="Contact Number"
                  type="tel"
                  required
                  placeholder="+234 801 234 5678"
                  value={form.next_of_kin.contact_number}
                  onChange={set('next_of_kin', 'contact_number')}
                  error={errors['next_of_kin.contact_number']}
                />
                <Input
                  label="Residential Address"
                  placeholder="House No, Street Name, LGA, State"
                  value={form.next_of_kin.address}
                  onChange={set('next_of_kin', 'address')}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Academic Information
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Choose the enrollment mode and program for this student.
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Enrollment Type
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                  { value: 'on_site', icon: MapPin, title: 'On-site', desc: 'In-person learning at a Page Innovations campus.' },
                  { value: 'virtual', icon: Monitor, title: 'Virtual Class', desc: 'Live online sessions with remote access to materials.' },
                ].map(({ value, icon: Icon, title, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('academic', 'enrollment_type')(value)}
                    className={cn(
                      'text-left rounded-xl border-2 p-4 transition-colors',
                      form.academic.enrollment_type === value
                        ? 'border-brand-red bg-brand-red-50 dark:bg-brand-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <Icon className="w-5 h-5 text-brand-red mb-2" />
                    <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{desc}</p>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Select
                    label="Course / Program Selection"
                    placeholder="Select your preferred program"
                    options={courses.map((c) => ({
                      value: String(c.id),
                      label: c.price > 0 ? `${c.title} — ${formatPrice(c.price)}` : c.title,
                    }))}
                    value={form.academic.course_id}
                    onChange={set('academic', 'course_id')}
                    helperText="Optional — the student is comp-enrolled immediately when a program is selected."
                  />
                </div>
                <Input
                  label="Preferred Start Date"
                  type="date"
                  value={form.academic.preferred_start_date}
                  onChange={set('academic', 'preferred_start_date')}
                />
                <Select
                  label="Highest Qualification"
                  placeholder="Select level"
                  options={QUALIFICATION_OPTIONS}
                  value={form.academic.highest_qualification}
                  onChange={set('academic', 'highest_qualification')}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Final Confirmation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Please review all provided details before submitting the
                enrollment application.
              </p>
              <div className="space-y-4">
                <SectionCard title="Personal Information" onEdit={() => setStep(0)}>
                  <ReviewRow label="Full Name" value={form.personal.full_name} />
                  <ReviewRow label="Email Address" value={form.personal.email} />
                  <ReviewRow label="Phone Number" value={form.personal.phone} />
                  <ReviewRow label="Date of Birth" value={form.personal.date_of_birth} />
                  <ReviewRow label="Nationality" value={form.personal.nationality} />
                </SectionCard>
                <SectionCard title="Next of Kin" onEdit={() => setStep(1)}>
                  <ReviewRow label="Full Name" value={form.next_of_kin.full_name} />
                  <ReviewRow label="Relationship" value={form.next_of_kin.relationship} />
                  <ReviewRow label="Contact Number" value={form.next_of_kin.contact_number} />
                </SectionCard>
                <SectionCard title="Academic" onEdit={() => setStep(2)}>
                  <ReviewRow
                    label="Enrollment Type"
                    value={form.academic.enrollment_type === 'virtual' ? 'Virtual Class' : 'On-site'}
                  />
                  <ReviewRow label="Program" value={selectedCourse?.title || 'None selected'} />
                  <ReviewRow label="Preferred Start" value={form.academic.preferred_start_date} />
                  <ReviewRow label="Qualification" value={form.academic.highest_qualification} />
                </SectionCard>
                {selectedCourse && (
                  <SectionCard title="Financial Details" onEdit={() => setStep(2)}>
                    <ReviewRow
                      label="Total Enrollment Value"
                      value={formatPrice(selectedCourse.price || 0)}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Onboarding registers the student with complimentary
                      access; payments are managed from the Payments page.
                    </p>
                  </SectionCard>
                )}
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            {step === 0 ? (
              <Button variant="ghost" onClick={cancelOnboarding}>
                Cancel Onboarding
              </Button>
            ) : (
              <Button variant="secondary" leftIcon={<ArrowLeft />} onClick={goBack}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                className="!bg-brand-red hover:!bg-brand-red-600 !text-white focus:!ring-brand-red"
                onClick={goNext}
              >
                {['Continue to Next of Kin', 'Continue to Academic Info', 'Continue to Review'][step]}
              </Button>
            ) : (
              <Button
                className="!bg-brand-red hover:!bg-brand-red-600 !text-white focus:!ring-brand-red"
                onClick={handleSubmit}
                disabled={submitting}
                leftIcon={submitting ? <Spinner size="sm" /> : undefined}
              >
                {submitting ? 'Completing…' : 'Complete Enrollment'}
              </Button>
            )}
          </div>
        </div>

        {/* Reassurance strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {[
            { icon: ShieldCheck, title: 'Secure Data', desc: 'Information provided is encrypted and admin-only.' },
            { icon: Save, title: 'Draft Mode', desc: 'Your progress is automatically saved on this device.' },
            { icon: LifeBuoy, title: 'Need Help?', desc: 'Contact the admissions team for onboarding support.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="w-5 h-5 text-brand-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
