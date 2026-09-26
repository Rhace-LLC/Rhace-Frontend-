import { AllStaffTab } from './AllStaffTab';

const AllStaffPage = () => {
  const handleRefresh = () => {
    // Trigger refresh in the tab - the tab's loadStaff will be called via onRefresh
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="type-res-h2 text-res-ink">All staff</h1>
        <p className="type-res-body mt-1 font-normal text-res-ink-muted">
          Manage your team members, roles, and invitations.
        </p>
      </div>
      <AllStaffTab onRefresh={handleRefresh} />
    </div>
  );
};

export { AllStaffPage as default, AllStaffTab };
