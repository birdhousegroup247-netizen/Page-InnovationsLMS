import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI } from '../lib/api';
import { Container } from '../components/layout';
import { Button, Input, Select } from '../components/ui';
import { useToast } from '../components/ui/Toast';

/**
 * Complete Profile — after signup, a Page Innovations student fills the
 * enrollment details we don't collect at registration (next-of-kin +
 * academic). Saved into the same users.onboarding_profile the admin
 * Onboarding wizard writes, so staff see one consistent record.
 *
 * Non-blocking: the student can "Skip for now" and finish later (a
 * dashboard banner keeps nudging until it's done). Gated by the
 * `completeProfile` feature flag.
 */
const RELATIONSHIP_OPTIONS = ['Parent', 'Spouse', 'Sibling', 'Guardian', 'Other'].map(
  (r) => ({ value: r, label: r })
);
const QUALIFICATION_OPTIONS = [
  'Secondary School (SSCE/WAEC)', 'OND / NCE', 'HND', "Bachelor's Degree",
  "Master's Degree", 'Doctorate', 'Other',
].map((q) => ({ value: q, label: q }));
const ENROLLMENT_OPTIONS = [
  { value: 'on_site', label: 'On-site' },
  { value: 'virtual', label: 'Virtual Class' },
];

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const existing = user?.onboarding_profile || {};
  const [form, setForm] = useState({
    next_of_kin: {
      full_name: existing.next_of_kin?.full_name || '',
      relationship: existing.next_of_kin?.relationship || '',
      contact_number: existing.next_of_kin?.contact_number || '',
      address: existing.next_of_kin?.address || '',
    },
    academic: {
      highest_qualification: existing.academic?.highest_qualification || '',
      enrollment_type: existing.academic?.enrollment_type || 'on_site',
      preferred_start_date: existing.academic?.preferred_start_date || '',
    },
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (section, field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [section]: { ...f[section], [field]: value } }));
    setErrors((er) => ({ ...er, [`${section}.${field}`]: undefined }));
  };

  const submit = async () => {
    const er = {};
    if (!form.next_of_kin.full_name.trim()) er['next_of_kin.full_name'] = 'Next of kin name is required';
    if (!form.next_of_kin.contact_number.trim()) er['next_of_kin.contact_number'] = 'A contact number is required';
    setErrors(er);
    if (Object.keys(er).length) return;

    try {
      setSaving(true);
      const res = await profileAPI.completeOnboarding(form);
      if (res.data?.data?.user) updateUser(res.data.data.user);
      showToast('Profile completed — thank you!', 'success');
      navigate('/dashboard');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 py-10 sm:py-12">
          <Container>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Complete your enrollment</h1>
                <p className="text-white/85 text-sm mt-1">
                  A few more details so we can finish setting up your student record.
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8 max-w-3xl">
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 space-y-8">
          {/* Next of kin */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Next of Kin</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">An emergency contact for your records.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name" required placeholder="e.g. Chinelo Adebayo"
                value={form.next_of_kin.full_name} onChange={set('next_of_kin', 'full_name')}
                error={errors['next_of_kin.full_name']}
              />
              <Select
                label="Relationship" placeholder="Select relationship" options={RELATIONSHIP_OPTIONS}
                value={form.next_of_kin.relationship} onChange={set('next_of_kin', 'relationship')}
              />
              <Input
                label="Contact Number" type="tel" required placeholder="+234 801 234 5678"
                value={form.next_of_kin.contact_number} onChange={set('next_of_kin', 'contact_number')}
                error={errors['next_of_kin.contact_number']}
              />
              <Input
                label="Residential Address" placeholder="House No, Street, LGA, State"
                value={form.next_of_kin.address} onChange={set('next_of_kin', 'address')}
              />
            </div>
          </div>

          {/* Academic */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Academic Background</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Helps us tailor your learning experience.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Highest Qualification" placeholder="Select level" options={QUALIFICATION_OPTIONS}
                value={form.academic.highest_qualification} onChange={set('academic', 'highest_qualification')}
              />
              <Select
                label="Preferred Class Mode" options={ENROLLMENT_OPTIONS}
                value={form.academic.enrollment_type} onChange={set('academic', 'enrollment_type')}
              />
              <Input
                label="Preferred Start Date" type="date"
                value={form.academic.preferred_start_date} onChange={set('academic', 'preferred_start_date')}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Skip for now
            </button>
            <Button
              onClick={submit}
              loading={saving}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="!bg-brand-red hover:!bg-brand-red-600 !text-white focus:!ring-brand-red"
            >
              Save &amp; Continue
            </Button>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          Your information is private and used only for your student record.
        </p>
      </Container>
    </div>
  );
}
