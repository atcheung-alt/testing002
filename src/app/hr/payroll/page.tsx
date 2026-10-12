import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/calculations";
import { periodLabel } from "@/lib/payroll";
import NewPayrollRunButton from "@/components/NewPayrollRunButton";
import ClickableTableRow from "@/components/ClickableTableRow";

export const dynamic = "force-dynamic";

export default async function PayrollListPage() {
  await requireAdminPage();

  const runs = await prisma.payrollRun.findMany({
    orderBy: { period: "desc" },
    include: { entries: { select: { grossPay: true, netPay: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Payroll</h1>
          <p className="text-sm text-ink-muted">
            One run per calendar month — salary, day/hourly-rate, and project-fee pay all
            calculated together, with Mandatory Provident Fund (MPF) contributions and payslips.
          </p>
        </div>
        <NewPayrollRunButton />
      </div>

      {runs.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No payroll runs yet — create one for the current month to get started.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3">Employees</th>
                <th className="px-5 py-3">Gross total</th>
                <th className="px-5 py-3">Net total</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run: any) => {
                const totalGross = run.entries.reduce((sum: number, e: any) => sum + e.grossPay, 0);
                const totalNet = run.entries.reduce((sum: number, e: any) => sum + e.netPay, 0);
                return (
                  <ClickableTableRow
                    key={run.id}
                    href={`/hr/payroll/${run.id}`}
                    className="border-b border-line last:border-0 hover:bg-brand-50/40"
                  >
                    <td className="px-5 py-3">
                      <span className="font-medium text-brand-600">{periodLabel(run.period)}</span>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{run.entries.length}</td>
                    <td className="px-5 py-3 font-mono">{formatCurrency(totalGross)}</td>
                    <td className="px-5 py-3 font-mono">{formatCurrency(totalNet)}</td>
                    <td className="px-5 py-3 text-ink-muted">{formatDate(run.createdAt)}</td>
                  </ClickableTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
