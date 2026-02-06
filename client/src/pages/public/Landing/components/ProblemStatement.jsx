import { FileText, Edit, ShieldOff, Users } from "lucide-react";

const problems = [
  {
    icon: FileText,
    title: "Unstructured Documents",
    desc: "Long, complex tender documents are hard to navigate and understand.",
  },
  {
    icon: Edit,
    title: "Manual Drafting Errors",
    desc: "Drafting proposals manually leads to mistakes and inefficiency.",
  },
  {
    icon: ShieldOff,
    title: "Compliance Tracking",
    desc: "Ensuring compliance is difficult and often overlooked.",
  },
  {
    icon: Users,
    title: "Collaboration & Traceability",
    desc: "Poor collaboration and lack of traceability slow down tender processes.",
  },
];

export default function ProblemStatement() {
  return (
    <section className="w-full bg-neutral-50 py-12" id="problem">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-16">
        <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-8">
          Key Challenges in Tender Management
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {problems.map((p, i) => (
            <div
              key={i}
              className="bg-white border border-neutral-200 rounded-lg p-6 flex flex-col items-center text-center shadow-sm"
            >
              <p.icon
                className="w-8 h-8 text-primary-600 mb-3"
                aria-hidden="true"
              />
              <div className="font-medium text-neutral-900 mb-1">{p.title}</div>
              <div className="text-sm text-neutral-700">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
