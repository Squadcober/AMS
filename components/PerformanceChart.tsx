import React from 'react';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface PerformanceChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
    }[];
  };
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  // Function to add slight offset to overlapping points
  const addOffsetToData = (datasets: any[]) => {
    const offset = 0.1; // Adjust this value as needed
    const newDatasets = datasets.map((dataset, datasetIndex) => {
      const newData = dataset.data.map((value: number, index: number) => {
        const sameValueCount = datasets.reduce((count, ds) => {
          return count + (ds.data[index] === value ? 1 : 0);
        }, 0);
        return value + (sameValueCount > 1 ? offset * datasetIndex : 0);
      });
      return { ...dataset, data: newData };
    });
    return newDatasets;
  };

  const adjustedData = {
    ...data,
    datasets: addOffsetToData(data.datasets),
  };

  const options = {
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        min: 0,
        ticks: {
          stepSize: 1,
          display: false,
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        pointLabels: {
          color: "rgb(255, 255, 255)",
          font: {
            size: 12,
          },
        },
        angleLines: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
    plugins: {
      legend: {
        display: true,
      },
    },
    maintainAspectRatio: false,
  };

  return <Radar data={adjustedData} options={options} />;
};

export default PerformanceChart;
