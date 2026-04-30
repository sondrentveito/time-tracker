"use client";

import { useChartTheme } from "@/lib/chartTheme";
import type { TimeEntry, WorkRulesConfig } from "@/lib/types";
import { getWeekdays, getDayName, formatDuration, getExpectedHours, formatDate, isToday } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { useRouter } from "next/navigation";

interface WeekOverviewProps {
  entries: TimeEntry[];
  rules: WorkRulesConfig;
}

export default function WeekOverview({ entries, rules }: WeekOverviewProps) {
  const theme = useChartTheme();
  const router = useRouter();
  const weekdays = getWeekdays(new Date());

  const dayData = weekdays.map((date) => {
    const dateStr = formatDate(date);
    const dayEntries = entries.filter((e) => e.date === dateStr);
    const workHours = dayEntries.filter((e) => e.type === "work").reduce((sum, e) => sum + e.duration, 0);
    const expected = getExpectedHours(date, rules);
    const today = isToday(dateStr);

    return { 
      date, 
      dateStr, 
      dayName: getDayName(date), 
      workHours, 
      expected, 
      today 
    };
  });

  const maxExpected = Math.max(...dayData.map((d) => d.expected));

  const handleBarClick = (data: { payload?: { dateStr?: string } } | undefined) => {
    const dateStr = data?.payload?.dateStr;
    if (dateStr) {
      router.push(`/timelogg?date=${dateStr}`);
    }
  };

  return (
    <div className="glass-card-interactive p-5 animate-in stagger-3">
      <h2 className="text-sm font-medium mb-5" style={{ color: "var(--fg-muted)" }}>Denne uken</h2>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dayData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
            <XAxis 
              dataKey="dayName" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: theme.fgMuted, fontSize: 12, fontWeight: 500 }} 
              dy={10}
            />
            <YAxis 
              hide 
              domain={[0, 'dataMax + 1']} 
            />
            <Tooltip 
              cursor={{ fill: theme.cardHover || 'rgba(255,255,255,0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const delta = data.workHours - data.expected;
                  const deltaStr = delta > 0 ? `+${formatDuration(delta)}` : delta < 0 ? `-${formatDuration(Math.abs(delta))}` : '0t';
                  
                  return (
                    <div 
                      className="rounded-xl px-3 py-2 shadow-lg" 
                      style={{ 
                        background: theme.cardBg, 
                        border: `1px solid ${theme.cardBorder}`,
                        backdropFilter: "blur(12px)"
                      }}
                    >
                      <p className="text-xs mb-1 font-medium" style={{ color: theme.fgMuted }}>{data.dateStr}</p>
                      <p className="text-sm font-semibold tabular-nums" style={{ color: theme.fg }}>
                        {formatDuration(data.workHours)}
                      </p>
                      {data.expected > 0 && (
                        <p className="text-xs mt-1 tabular-nums" style={{ color: delta >= 0 ? theme.ok : theme.warn }}>
                          {deltaStr} vs mål
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {maxExpected > 0 && (
              <ReferenceLine 
                y={maxExpected} 
                stroke={theme.fgMuted} 
                strokeDasharray="4 4" 
                strokeOpacity={0.5}
              />
            )}
            <Bar 
              dataKey="workHours" 
              radius={[4, 4, 4, 4]} 
              onClick={handleBarClick}
              cursor="pointer"
              maxBarSize={40}
            >
              {dayData.map((entry, index) => {
                let fill = theme.fgMuted;
                if (entry.expected > 0) {
                  fill = entry.workHours >= entry.expected ? theme.accent : theme.warn;
                }
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid var(--divider)" }}>
        <span className="text-xs" style={{ color: "var(--fg-muted)" }}>Total denne uken</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium tabular-nums text-fg">
            {formatDuration(dayData.reduce((sum, d) => sum + d.workHours, 0))}
          </span>
          <span className="text-xs" style={{ color: "var(--fg-faint)" }}>
            / {formatDuration(dayData.reduce((sum, d) => sum + d.expected, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
