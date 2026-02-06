// Simple bar chart component - no external dependencies
export function BarChart({ data, label, xKey, yKey, height = 200 }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-neutral-500">No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d[yKey] || 0));
  const barWidth = 100 / (data.length * 1.5);
  const barSpacing = barWidth * 0.5;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(400, data.length * 60)} ${height}`}
        className="w-full min-w-max"
        style={{ minHeight: `${height}px` }}
      >
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const yValue = Math.round(maxValue * ratio);
          const yPos = height - height * 0.8 * ratio - 20;
          return (
            <g key={`y-label-${idx}`}>
              <text
                x="30"
                y={yPos}
                fontSize="12"
                fill="#6b7280"
                textAnchor="end"
              >
                {yValue}
              </text>
              <line
                x1="35"
                y1={yPos}
                x2={Math.max(400, data.length * 60) - 10}
                y2={yPos}
                stroke="#e5e7eb"
                strokeDasharray="2,2"
              />
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const barHeight = ((item[yKey] || 0) / maxValue) * (height * 0.8);
          const xPos = 50 + idx * (data.length < 10 ? 60 : 40);
          return (
            <g key={`bar-${idx}`}>
              <rect
                x={xPos}
                y={height - barHeight - 20}
                width="35"
                height={barHeight}
                fill="#3b82f6"
                opacity="0.8"
                rx="2"
              />
              <text
                x={xPos + 17.5}
                y={height - 5}
                fontSize="11"
                fill="#6b7280"
                textAnchor="middle"
              >
                {item[xKey]?.toString().substring(0, 10)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Simple pie chart component
export function PieChart({ data, label, height = 250 }) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="text-center py-8 text-neutral-500">No data available</div>;
  }

  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const colors = ['#10b981', '#f59e0b', '#ef4444'];
  const labels = Object.keys(data);

  let currentAngle = -90;
  const slices = labels.map((label, idx) => {
    const value = data[label];
    const percentage = (value / total) * 100;
    const sliceAngle = (value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;
    const pathData = [
      `M 100 100`,
      `L ${x1} ${y1}`,
      `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    const labelAngle = (startAngle + endAngle) / 2;
    const labelRad = (labelAngle * Math.PI) / 180;
    const labelX = 100 + 50 * Math.cos(labelRad);
    const labelY = 100 + 50 * Math.sin(labelRad);

    return (
      <g key={`slice-${idx}`}>
        <path d={pathData} fill={colors[idx % colors.length]} opacity="0.8" />
        {percentage > 10 && (
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="14"
            fontWeight="bold"
            fill="white"
          >
            {Math.round(percentage)}%
          </text>
        )}
      </g>
    );
  });

  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 250 200" className="w-full max-w-xs" style={{ height: `${height}px` }}>
        {slices}
      </svg>
      <div className="ml-6 space-y-2">
        {labels.map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <span className="text-sm text-neutral-700">
              {label}: {data[label]} ({Math.round((data[label] / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple line chart component
export function LineChart({ data, xKey, yKey, label, height = 200 }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-neutral-500">No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d[yKey] || 0));
  const padding = 40;
  const chartWidth = 600;
  const chartHeight = height;

  const points = data.map((item, idx) => {
    const x = padding + (idx / (data.length - 1 || 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((item[yKey] || 0) / maxValue) * (chartHeight - padding * 2);
    return { x, y, ...item };
  });

  const pathData = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full min-w-max"
        style={{ minHeight: `${height}px` }}
      >
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const yValue = Math.round(maxValue * ratio);
          const yPos = chartHeight - padding - (chartHeight - padding * 2) * ratio;
          return (
            <g key={`y-label-${idx}`}>
              <text x="25" y={yPos + 4} fontSize="12" fill="#6b7280" textAnchor="end">
                {yValue}
              </text>
              <line
                x1="30"
                y1={yPos}
                x2={chartWidth - 10}
                y2={yPos}
                stroke="#e5e7eb"
                strokeDasharray="2,2"
              />
            </g>
          );
        })}

        {/* Line */}
        <path d={pathData} stroke="#3b82f6" strokeWidth="2" fill="none" />

        {/* Points */}
        {points.map((p, idx) => (
          <g key={`point-${idx}`}>
            <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" />
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((p, idx) => {
          if (data.length > 15 && idx % Math.ceil(data.length / 8) !== 0) return null;
          return (
            <text
              key={`x-label-${idx}`}
              x={p.x}
              y={chartHeight - 10}
              fontSize="11"
              fill="#6b7280"
              textAnchor="middle"
            >
              {p[xKey]?.toString().substring(0, 5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
