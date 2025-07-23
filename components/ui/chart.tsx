"use client"

import * as React from "react"
import { VictoryPie, VictoryLabel, VictoryContainer } from "victory"

import { cn } from "@/lib/utils"

const ChartContext = React.createContext(null)

function Chart({ className, children, ...props }: React.ComponentProps<"div">) {
  const id = React.useId()
  return (
    <ChartContext.Provider value={{ id }}>
      <div data-chart={id} className={cn("w-full h-full", className)} {...props}>
        {children}
      </div>
    </ChartContext.Provider>
  )
}

const ChartTooltip = ({ data, x, y, datum, ...props }: any) => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-50} y={-30} width={100} height={20} fill="black" rx="5" ry="5" />
      <text x={0} y={-18} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">
        {datum.x}: {datum.y}
      </text>
    </g>
  )
}

const ChartPie = ({ data, ...props }: any) => {
  return (
    <VictoryPie
      data={data}
      labels={({ datum }) => `${datum.x}: ${datum.y}`}
      labelComponent={<ChartTooltip />}
      containerComponent={<VictoryContainer />}
      {...props}
    />
  )
}

const ChartLabel = ({ text, x, y, ...props }: any) => {
  return <VictoryLabel text={text} x={x} y={y} textAnchor="middle" verticalAnchor="middle" {...props} />
}

export { Chart, ChartPie, ChartLabel }
