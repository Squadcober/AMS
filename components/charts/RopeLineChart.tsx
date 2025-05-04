"use client"

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface DataPoint {
  x: number;
  y: number;
}

interface RopeLineChartProps {
  dataSets: DataPoint[][];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

const RopeLineChart: React.FC<RopeLineChartProps> = ({
  dataSets,
  width = 800,
  height = 500,
  margin = { top: 20, right: 30, bottom: 30, left: 40 },
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !dataSets.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Calculate domains
    const allPoints = dataSets.flat();
    const xExtent = d3.extent(allPoints, d => d.x) as [number, number];
    const yExtent = d3.extent(allPoints, d => d.y) as [number, number];
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([xExtent[0], xExtent[1]])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([yExtent[0], yExtent[1]])
      .range([height - margin.bottom, margin.top]);

    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .attr("color", "white");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .attr("color", "white");

    // Function to calculate offset for overlapping points
    const getVerticalOffset = (point: DataPoint, datasetIndex: number): number => {
      const offset = 5;
      let overlappingCount = 0;

      dataSets.forEach((dataset, index) => {
        if (index !== datasetIndex) {
          dataset.forEach(p => {
            if (Math.abs(p.x - point.x) < 0.1 && Math.abs(p.y - point.y) < 0.1) {
              overlappingCount++;
            }
          });
        }
      });

      if (overlappingCount === 0) return 0;
      const direction = datasetIndex % 2 === 0 ? 1 : -1;
      const magnitude = Math.ceil(datasetIndex / 2);
      return direction * magnitude * offset;
    };

    // Create and add lines with offset
    const colors = d3.schemeTableau10;
    dataSets.forEach((dataset, datasetIndex) => {
      // Create line generator for this dataset
      const lineGen = d3.line<DataPoint>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y) + getVerticalOffset(d, datasetIndex))
        .curve(d3.curveMonotoneX);

      // Add path
      svg.append("path")
        .datum(dataset)
        .attr("fill", "none")
        .attr("stroke", colors[datasetIndex % colors.length])
        .attr("stroke-width", 2)
        .attr("d", lineGen);

      // Add dots
      svg.selectAll(`.dots-${datasetIndex}`)
        .data(dataset)
        .join("circle")
        .attr("class", `dots-${datasetIndex}`)
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y) + getVerticalOffset(d, datasetIndex))
        .attr("r", 4)
        .attr("fill", colors[datasetIndex % colors.length])
        .attr("stroke", "#fff")
        .attr("stroke-width", 1);
    });

  }, [dataSets, width, height, margin]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="text-white"
      style={{ backgroundColor: 'transparent' }}
    />
  );
};

export default RopeLineChart;
