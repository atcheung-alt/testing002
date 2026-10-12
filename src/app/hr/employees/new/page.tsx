import EmployeeForm from "@/components/EmployeeForm";
import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  // The form covers every field, including HKID/bank/salary — admin-only,
  // same as viewing or editing an existing record.
  await requireAdminPage();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">New Employee</h1>
        <p className="text-sm text-ink-muted">
          Add a new employee record. Once saved, they get a personal link to view their leave
          balance and submit leave requests.
        </p>
      </div>
      <EmployeeForm />
    </div>
  );
}
