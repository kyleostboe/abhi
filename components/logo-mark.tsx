import { cn } from "@/lib/utils"

/**
 * The seven-shape logo mark that sits above the switch on each main page.
 *
 * This markup used to be copy-pasted into every page at two different sizes, which is how the
 * Library's ended up noticeably larger than the Home page's. Keeping it in one place means the
 * mark stays identical everywhere it appears.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center items-center space-x-[3px]", className)}>
      <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[13px] h-[13px] shadow-md" />
      <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[9px] w-[9px] shadow" />
      <div className="w-4 bg-gradient-to-br from-logo-amber to-orange-300 rounded-[3px] transform h-[9px] shadow-sm" />
      <div className="w-4 bg-gradient-to-r from-gray-600 to-gray-500 border-2 border-stone-200 h-[34px] shadow-md rounded w-[9px]" />
      <div className="w-4 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-[3px] transform h-[9px] pl-0 shadow-sm" />
      <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[9px] w-[9px] shadow" />
      <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[13px] h-[13px] shadow-md" />
    </div>
  )
}

/**
 * The soft colour wash behind a page header. Absolutely positioned, so it expects a
 * `relative overflow-hidden` parent.
 */
export function HeaderWash() {
  return (
    <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20" />
      <div className="absolute top-2 left-8 w-16 h-12 bg-gradient-to-br from-emerald-300/30 to-teal-400/25 rounded-full transform rotate-12" />
      <div className="absolute top-6 right-12 w-20 h-8 bg-gradient-to-bl from-rose-300/25 to-purple-400/20 rounded-full transform -rotate-6" />
      <div className="absolute top-1 left-1/3 w-12 h-16 bg-gradient-to-tr from-amber-300/20 to-orange-400/15 rounded-full transform rotate-45" />
      <div className="absolute top-8 right-1/4 w-14 h-10 bg-gradient-to-tl from-blue-300/25 to-indigo-400/20 rounded-full transform -rotate-12" />
    </div>
  )
}
