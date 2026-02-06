export default function PageHeader({ title, description, actions }) {
  return (
    <div className="space-y-1 mb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {description && <p className="text-sm text-neutral-600">{description}</p>}
    </div>
  );
}
