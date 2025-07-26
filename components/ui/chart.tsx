"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  type BarProps,
  type LineProps,
  type PieProps,
} from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

// Define types for chart components
type ChartComponent =
  | React.ForwardRefExoticComponent<BarProps & React.RefAttributes<SVGElement>>
  | React.ForwardRefExoticComponent<LineProps & React.RefAttributes<SVGElement>>
  | React.ForwardRefExoticComponent<PieProps & React.RefAttributes<SVGElement>>

// Map of chart types to their respective components
const chartComponents: Record<string, ChartComponent> = {
  bar: Bar,
  line: Line,
  pie: Pie,
}

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  data: Record<string, any>[]
  chartType?: "bar" | "line" | "pie"
  className?: string
  children?: React.ReactNode
}

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(
  (
    {
      config,
      data,
      chartType = "bar", // Default to bar chart
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const ChartComponent = chartComponents[chartType]
    const is = chartType === "pie" ? PieChart : BarChart // Default to BarChart if not pie

    if (!ChartComponent) {
      console.warn(`Unknown chart type: ${chartType}. Defaulting to BarChart.`)
      return null
    }

    return (
      <ChartContainer ref={ref} config={config} className={cn("min-h-[200px] w-full", className)} {...props}>
        <ResponsiveContainer>
          <is data={data}>
            <XAxis
              dataKey={Object.keys(config)[0]} // Use the first key in config as dataKey for XAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {Object.entries(config).map(([key, item]) => {
              if (key === Object.keys(config)[0]) return null // Skip the dataKey for XAxis
              return (
                <ChartComponent
                  key={key}
                  dataKey={key}
                  fill={`var(--color-${key})`}
                  radius={chartType === "pie" ? 80 : undefined} // Apply radius for pie chart
                  {...item.props} // Spread any additional props from config
                />
              )
            })}
            {children}
          </is>
        </ResponsiveContainer>
      </ChartContainer>
    )
  },
)

Chart.displayName = "Chart"

export { Chart }
