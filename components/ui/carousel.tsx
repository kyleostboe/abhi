"use client"

import * as React from "react"
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type CarouselOptions = UseEmblaCarouselType[1]
type CarouselPlugin = UseEmblaCarouselType[2]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: ReturnType<UseEmblaCarouselType>[0]) => void
} & React.ComponentPropsWithoutRef<"div">

const CarouselContext = React.createContext<
  | {
      carouselRef: ReturnType<typeof useEmblaCarousel>[0]
      api: ReturnType<typeof useEmblaCarousel>[1]
      scrollNext: () => void
      scrollPrev: () => void
      canScrollPrev: boolean
      canScrollNext: boolean
      setEmblaApi: (api: ReturnType<UseEmblaCarouselType>[0]) => void
      selectedSnap: number
      scrollSnaps: number[]
      orientation: Required<CarouselProps>["orientation"]
    }
  | undefined
>(undefined)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ orientation = "horizontal", opts, setApi, plugins, className, children, ...props }, ref) => {
    const [carouselRef, emblaApi] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins,
    )
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(false)
    const [selectedSnap, setSelectedSnap] = React.useState(0)
    const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([])

    const scrollPrev = React.useCallback(() => {
      emblaApi?.scrollPrev()
    }, [emblaApi])

    const scrollNext = React.useCallback(() => {
      emblaApi?.scrollNext()
    }, [emblaApi])

    const onSelect = React.useCallback((emblaApi: any) => {
      setSelectedSnap(emblaApi.selectedScrollSnap())
      setCanScrollPrev(emblaApi.canScrollPrev())
      setCanScrollNext(emblaApi.canScrollNext())
    }, [])

    const onInit = React.useCallback((emblaApi: any) => {
      setScrollSnaps(emblaApi.scrollSnapList())
    }, [])

    React.useEffect(() => {
      if (!emblaApi) {
        return
      }

      setApi?.(emblaApi)
      emblaApi.on("select", onSelect)
      emblaApi.on("reInit", onSelect)
      emblaApi.on("init", onInit)
      emblaApi.on("reInit", onInit)
    }, [emblaApi, onSelect, setApi, onInit])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api: emblaApi,
          scrollNext,
          scrollPrev,
          canScrollPrev,
          canScrollNext,
          setEmblaApi: setApi || (() => {}),
          selectedSnap,
          scrollSnaps,
          orientation,
        }}
      >
        <div ref={ref} className={cn("relative", className)} role="region" aria-roledescription="carousel" {...props}>
          {children}
        </div>
      </CarouselContext.Provider>
    )
  },
)
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { carouselRef, orientation } = useCarousel()

    return (
      <div ref={carouselRef} className="overflow-hidden">
        <div
          ref={ref}
          className={cn("flex", orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className)}
          {...props}
        />
      </div>
    )
  },
)
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { orientation } = useCarousel()

    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        className={cn("min-w-0 shrink-0 grow-0 basis-full", orientation === "horizontal" ? "pl-4" : "pt-4", className)}
        {...props}
      />
    )
  },
)
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel()

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute h-8 w-8 rounded-full",
          orientation === "horizontal"
            ? "-left-12 top-1/2 -translate-y-1/2"
            : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
          className,
        )}
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        {...props}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">Previous slide</span>
      </Button>
    )
  },
)
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { orientation, scrollNext, canScrollNext } = useCarousel()

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute h-8 w-8 rounded-full",
          orientation === "horizontal"
            ? "-right-12 top-1/2 -translate-y-1/2"
            : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
          className,
        )}
        onClick={scrollNext}
        disabled={!canScrollNext}
        {...props}
      >
        <ArrowRight className="h-4 w-4" />
        <span className="sr-only">Next slide</span>
      </Button>
    )
  },
)
CarouselNext.displayName = "CarouselNext"

const CarouselPagination = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { scrollSnaps, selectedSnap, scrollNext } = useCarousel()

    return (
      <div ref={ref} className={cn("flex justify-center gap-2", className)} {...props}>
        {scrollSnaps.map((_, index) => (
          <Button
            key={index}
            size="icon"
            className={cn("h-2 w-2 rounded-full", index === selectedSnap ? "bg-primary" : "bg-muted")}
            onClick={() => scrollNext()}
          />
        ))}
      </div>
    )
  },
)
CarouselPagination.displayName = "CarouselPagination"

export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, CarouselPagination, useCarousel }
