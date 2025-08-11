import cn from "classnames"

export default function Page() {
  return (
    <div
      className={cn(
        "w-full py-7 text-lg font-medium tracking-wider rounded-xl transition-all",
        "shadow-lg dark:shadow-white/20 hover:shadow-none active:shadow-none text-white",
        "bg-[linear-gradient(90deg,#1a9d8a_0%,#3b82f6_33%,#fbbf24_66%,#f472b6_100%)]",
        "dark:bg-[linear-gradient(90deg,#1a9d8a_0%,#3b82f6_33%,#fbbf24_66%,#f472b6_100%)]",
        "hover:brightness-[1.06] active:brightness-95",
      )}
    >
      {/* rest of code here */}
    </div>
  )
}
