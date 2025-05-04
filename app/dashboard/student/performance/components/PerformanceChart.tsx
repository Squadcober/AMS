import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import React, { useMemo } from "react";

interface PerformanceChartProps {
  data: any[];
  attributes: string[];
  colors: string[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, attributes, colors }) => {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    console.log('Raw chart data:', data);

    return data.map(entry => {
      const result: any = { 
        date: entry.date,
        // Just use the date string directly without parsing
        displayDate: entry.date
      };
      
      // Track used values for this date to handle overlaps
      const usedValues = new Set();
      
      attributes.forEach((attr, index) => {
        let value = entry[attr];
        
        // Add small offset if value already exists
        while (usedValues.has(value)) {
          value += 0.1;
        }
        
        usedValues.add(value);
        result[attr] = value;
      });

      return result;
    });
  }, [data, attributes]);

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer>
        <LineChart 
          data={chartData}
          onMouseMove={(e) => {
            // This ensures dots are only visible when hovering
            const chart = document.querySelector('.recharts-wrapper');
            if (chart) {
              chart.classList.add('showing-dots');
            }
          }}
          onMouseLeave={() => {
            // Hide dots when mouse leaves the chart
            const chart = document.querySelector('.recharts-wrapper');
            if (chart) {
              chart.classList.remove('showing-dots');
            }
          }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255,255,255,0.1)" 
          />
          <XAxis
            dataKey="displayDate"
            stroke="#666"
            angle={-45}
            textAnchor="end"
            height={80} // Increased height to accommodate longer text
            tickMargin={30} // Increased margin to prevent text overlap
            interval={0} // Show all labels
            fontSize={11} // Slightly smaller font size
          />
          <YAxis
            stroke="#666"
            domain={[0, 10]}
            tickCount={11}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0,0,0,0.95)',
              borderColor: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
            }}
            formatter={(value: number) => value.toFixed(1)}
          />
          <Legend />
          <style>
            {`
              .recharts-wrapper .recharts-dot {
                display: none;
              }
              .recharts-wrapper.showing-dots .recharts-dot {
                display: block;
              }
            `}
          </style>
          {attributes.map((attr, index) => (
            <Line
              key={attr}
              type="monotone"
              dataKey={attr}
              stroke={colors[index]}
              name={attr.charAt(0).toUpperCase() + attr.slice(1)}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;
