import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ArrowLeft,
  ShieldCheck,
  Save,
  Pencil,
  CheckCircle2,
  Copy,
  IdCard,
} from 'lucide-react';
import { Container, PageHeader } from '../../../components/layout';
import { Button, Input, Select, Spinner } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { onboardingAPI, adminUsersAPI } from '../../../lib/api';
import WizardStepper from './WizardStepper';

/**
 * Staff Onboarding wizard — Personal Info → Employment → Compensation →
 * Review. Submits to POST /api/admin/onboarding/staff which creates an
 * approved instructor account with the HR record stored in
 * users.onboarding_profile, and returns the generated staff ID
 * (TK-STF-<year>-<seq>).
 *
 * Compensation data is sensitive: it is only ever readable through
 * admin-only endpoints. Draft autosaves to localStorage.
 */
const STEPS = ['Personal Info', 'Employment', 'Compensation', 'Review'];
const DRAFT_KEY = 'onboarding_staff_draft';

const EMPTY_FORM = {
  personal: {
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
  },
  employment: {
    job_title: '',
    department: '',
    employment_type: 'full_time',
    start_date: '',
    manager: '',
  },
  compensation: {
    monthly_salary: '',
    bank_name: '',
    account_number: '',
    tin: '',
    pfa_name: '',
    rsa_pin: '',
    hmo_provider: '',
    dependent_coverage: '',
  },
};

const DEPARTMENT_OPTIONS = [
  'Technical Training Division',
  'Academic Operations',
  'Administration',
  'Finance',
  'Marketing & Growth',
  'Human Resources',
  'IT & Infrastructure',
].map((d) => ({ value: d, label: d }));

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'part_time', label: 'Part-time' },
];

const BANK_OPTIONS = [
  'Access Bank', 'Zenith Bank', 'GTBank', 'First Bank', 'UBA', 'Stanbic IBTC',
  'Fidelity Bank', 'Union Bank', 'Sterling Bank', 'Wema Bank', 'Kuda', 'Opay',
].map((b) => ({ value: b, label: b }));

const HMO_OPTIONS = ['RelianceHMO', 'Hygeia HMO', 'AXA Mansard', 'None'].map(
  (h) => ({ value: h, label: h })
);

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

const formatNaira = (v) =>
  v ? `₦${Number(String(v).replace(/[^\d.]/g, '') || 0).toLocaleString()}` : '—';

export default function StaffOnboarding() {
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
  const [managers, setManagers] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { user, staff_id, temp_password }

  useEffect(() => {
    if (!result) localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form, result]);

  // Manager picker — existing staff (instructors + admins).
  useEffect(() => {
    adminUsersAPI
      .getAll({ role: 'instructor', limit: 200 })
      .then((r) => setManagers(r.data.data?.users || []))
      .catch(() => setManagers([]));
  }, []);

  const set = (section, field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [section]: { ...f[section], [field]: value } }));
    setErrors((er) => ({ ...er, [`${section}.${field}`]: undefined }));
  };

  const monthlySalaryNumber = Number(
    String(form.compensation.monthly_salary).replace(/[^\d.]/g, '') || 0
  );

  const validateStep = (i) => {
    const er = {};
    if (i === 0) {
      if (!form.personal.full_name.trim()) er['personal.full_name'] = 'Full name is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personal.email))
        er['personal.email'] = 'A valid email address is required';
    }
    if (i === 1) {
      if (!form.employment.job_title.trim())
        er['employment.job_title'] = 'Job title is required';
      if (!form.employment.department)
        er['employment.department'] = 'Department is required';
    }
    if (i === 2) {
      if (form.compensation.account_number && !/^\d{10}$/.test(form.compensation.account_number))
        er['compensation.account_number'] = 'NUBAN account numbers are exactly 10 digits';
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
    if (!validateStep(2)) return;
    try {
      setSubmitting(true);
      const res = await onboardingAPI.createStaff(form);
      localStorage.removeItem(DRAFT_KEY);
      setResult(res.data.data);
      showToast('Staff member onboarded successfully', 'success');
    } catch (error) {
      showToast(
        error.response?.data?.message || 'Failed to onboard staff member. Please try again.',
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
        <PageHeader icon={Briefcase} title="Staff Onboarding" />
        <Container size="sm" className="py-12">
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Staff Registration Successful
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The onboarding process for {result.user.full_name} is complete.
              Platform access has been provisioned.
            </p>
            <div className="bg-light-200 dark:bg-dark-700 rounded-lg p-5 mb-6 inline-flex items-center gap-4">
              <IdCard className="w-8 h-8 text-brand-red" />
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Assigned Staff ID
                </p>
                <p className="font-mono text-xl text-gray-900 dark:text-white">
                  {result.staff_id}
                </p>
              </div>
            </div>
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
                View Staff Profile
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setResult(null);
                  setForm(EMPTY_FORM);
                  setStep(0);
                }}
              >
                Onboard Another Staff Member
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
        icon={Briefcase}
        title="Staff Onboarding"
        subtitle="Add a new member to the training team"
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
                The staff member&apos;s core identity record. A profile photo can
                be added later from their profile page.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  required
                  placeholder="e.g. Adebayo Chukwuma"
                  value={form.personal.full_name}
                  onChange={set('personal', 'full_name')}
                  error={errors['personal.full_name']}
                />
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="example@pageinnovations.com"
                  value={form.personal.email}
                  onChange={set('personal', 'email')}
                  error={errors['personal.email']}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+234 803 123 4567"
                  value={form.personal.phone}
                  onChange={set('personal', 'phone')}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={form.personal.date_of_birth}
                  onChange={set('personal', 'date_of_birth')}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Home Address"
                    placeholder="Street Name, Area, City, State"
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
                Employment Details
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Configure the official role and reporting structure for the new
                staff member.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Job Title"
                  required
                  placeholder="e.g. Senior Technical Lead"
                  value={form.employment.job_title}
                  onChange={set('employment', 'job_title')}
                  error={errors['employment.job_title']}
                />
                <Select
                  label="Department"
                  required
                  placeholder="Select Department"
                  options={DEPARTMENT_OPTIONS}
                  value={form.employment.department}
                  onChange={set('employment', 'department')}
                  error={errors['employment.department']}
                />
                <Select
                  label="Employment Type"
                  options={EMPLOYMENT_TYPE_OPTIONS}
                  value={form.employment.employment_type}
                  onChange={set('employment', 'employment_type')}
                />
                <Input
                  label="Start Date"
                  type="date"
                  value={form.employment.start_date}
                  onChange={set('employment', 'start_date')}
                />
                <div className="sm:col-span-2">
                  <Select
                    label="Manager / Supervisor"
                    placeholder="Search or select manager"
                    options={managers.map((m) => ({
                      value: m.full_name,
                      label: m.full_name,
                    }))}
                    value={form.employment.manager}
                    onChange={set('employment', 'manager')}
                    helperText="The assigned manager will be notified upon onboarding completion."
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Compensation &amp; Benefits
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Complete the financial details for the new recruit. Visible to
                administrators only.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Monthly Base Salary (₦)"
                  placeholder="e.g. 750,000"
                  value={form.compensation.monthly_salary}
                  onChange={set('compensation', 'monthly_salary')}
                  helperText={
                    monthlySalaryNumber > 0
                      ? `Annual equivalent: ₦${(monthlySalaryNumber * 12).toLocaleString()}`
                      : undefined
                  }
                />
                <Select
                  label="Bank Name"
                  placeholder="Select Local Bank"
                  options={BANK_OPTIONS}
                  value={form.compensation.bank_name}
                  onChange={set('compensation', 'bank_name')}
                />
                <Input
                  label="Account Number (NUBAN)"
                  placeholder="10 digits"
                  value={form.compensation.account_number}
                  onChange={set('compensation', 'account_number')}
                  error={errors['compensation.account_number']}
                />
                <Input
                  label="Tax Identification Number (TIN)"
                  placeholder="e.g. 12345678-0001"
                  value={form.compensation.tin}
                  onChange={set('compensation', 'tin')}
                />
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-6 mb-2">
                Statutory Contributions
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Pension Scheme (PENCOM): automatic 8% employee and 10% employer
                contribution as per Nigerian regulations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="PFA Name"
                  placeholder="e.g. Stanbic IBTC Pension"
                  value={form.compensation.pfa_name}
                  onChange={set('compensation', 'pfa_name')}
                />
                <Input
                  label="RSA PIN"
                  placeholder="e.g. PEN123456789"
                  value={form.compensation.rsa_pin}
                  onChange={set('compensation', 'rsa_pin')}
                />
                <Select
                  label="HMO Provider"
                  placeholder="Select provider"
                  options={HMO_OPTIONS}
                  value={form.compensation.hmo_provider}
                  onChange={set('compensation', 'hmo_provider')}
                />
                <Input
                  label="Dependent Coverage"
                  placeholder="e.g. Spouse & 4 Children"
                  value={form.compensation.dependent_coverage}
                  onChange={set('compensation', 'dependent_coverage')}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Final Review &amp; Confirmation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Please verify all information before finalizing the
                registration of the new staff member.
              </p>
              <div className="space-y-4">
                <SectionCard title="Personal Information" onEdit={() => setStep(0)}>
                  <ReviewRow label="Full Name" value={form.personal.full_name} />
                  <ReviewRow label="Email Address" value={form.personal.email} />
                  <ReviewRow label="Phone Number" value={form.personal.phone} />
                  <ReviewRow label="Residential Address" value={form.personal.address} />
                  <ReviewRow label="Date of Birth" value={form.personal.date_of_birth} />
                </SectionCard>
                <SectionCard title="Employment Details" onEdit={() => setStep(1)}>
                  <ReviewRow label="Designation" value={form.employment.job_title} />
                  <ReviewRow label="Department" value={form.employment.department} />
                  <ReviewRow
                    label="Contract Type"
                    value={
                      EMPLOYMENT_TYPE_OPTIONS.find(
                        (o) => o.value === form.employment.employment_type
                      )?.label
                    }
                  />
                  <ReviewRow label="Reporting To" value={form.employment.manager} />
                  <ReviewRow label="Start Date" value={form.employment.start_date} />
                </SectionCard>
                <SectionCard title="Compensation &amp; Benefits" onEdit={() => setStep(2)}>
                  <ReviewRow
                    label="Gross Salary"
                    value={
                      monthlySalaryNumber > 0
                        ? `${formatNaira(monthlySalaryNumber)} / month`
                        : '—'
                    }
                  />
                  <ReviewRow label="Bank" value={form.compensation.bank_name} />
                  <ReviewRow label="Health Insurance Plan" value={form.compensation.hmo_provider} />
                  <ReviewRow label="Pension Fund Admin" value={form.compensation.pfa_name} />
                </SectionCard>
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
                {step === 3 ? 'Back to Compensation' : 'Previous Step'}
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                className="!bg-brand-red hover:!bg-brand-red-600 !text-white focus:!ring-brand-red"
                onClick={goNext}
              >
                {['Continue to Employment', 'Continue to Compensation', 'Continue to Review'][step]}
              </Button>
            ) : (
              <Button
                className="!bg-brand-red hover:!bg-brand-red-600 !text-white focus:!ring-brand-red"
                onClick={handleSubmit}
                disabled={submitting}
                leftIcon={submitting ? <Spinner size="sm" /> : undefined}
              >
                {submitting ? 'Registering…' : 'Complete Staff Registration'}
              </Button>
            )}
          </div>
        </div>

        {/* Reassurance strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {[
            { icon: ShieldCheck, title: 'Secure Records', desc: 'All staff data is encrypted and visible to administrators only.' },
            { icon: Save, title: 'Auto-Save', desc: 'Your progress is automatically saved on this device.' },
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
