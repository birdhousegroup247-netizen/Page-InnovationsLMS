import Container from './Container';

/**
 * PageHeader — the gradient hero used on every admin page.
 *
 * Lives in one place so responsive tweaks (heading scaling, button wrapping,
 * vertical padding) apply to Users / Courses / Categories / Tests / etc. at once.
 *
 * Layout rules:
 * - < sm: icon + title stack on one row, action buttons wrap onto a second row
 * - ≥ sm: title left, action buttons right, both on a single row
 * - Heading and icon shrink at narrow widths so the hero doesn't dominate
 * - Action buttons flex-wrap and stay full-width on very narrow screens
 *
 * Usage:
 *   <PageHeader
 *     icon={UsersIcon}
 *     title="User Management"
 *     subtitle="Manage users, roles, and permissions"
 *     actions={<><Button>Import</Button><Button>Export</Button></>}
 *   />
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="relative z-10 py-8 sm:py-12 lg:py-16">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {Icon && (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white animate-fade-in leading-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm sm:text-base lg:text-lg text-white/90 animate-fade-in mt-0.5 sm:mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
}
