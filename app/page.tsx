"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToastProvider, ToastViewport, useToast } from "@/components/ui/toast"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import * as React from "react"

export default function Home() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [framework, setFramework] = useState("")
  const [terms, setTerms] = useState(false)
  const [volume, setVolume] = useState(50)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [progress, setProgress] = useState(0)
  const [open, setOpen] = React.useState(false)
  const { toast } = useToast()

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <ToastProvider>
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
          <h1 className="text-5xl font-bold">UI Component Showcase</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {/* Card Section */}
          <Card>
            <CardHeader>
              <CardTitle>Card Component</CardTitle>
              <CardDescription>A simple card component.</CardDescription>
            </CardHeader>
            <CardContent>This is the content of the card. You can put anything here.</CardContent>
          </Card>

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Input Fields</CardTitle>
              <CardDescription>Various input field examples.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  type="text"
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Select Section */}
          <Card>
            <CardHeader>
              <CardTitle>Select Component</CardTitle>
              <CardDescription>A dropdown select component.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a framework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next.js">Next.js</SelectItem>
                  <SelectItem value="sveltekit">SvelteKit</SelectItem>
                  <SelectItem value="astro">Astro</SelectItem>
                  <SelectItem value="remix">Remix</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Button Section */}
          <Card>
            <CardHeader>
              <CardTitle>Button Component</CardTitle>
              <CardDescription>Different button styles.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button>Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="link">Link Button</Button>
            </CardContent>
          </Card>

          {/* Switch Section */}
          <Card>
            <CardHeader>
              <CardTitle>Switch Component</CardTitle>
              <CardDescription>A toggle switch component.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch id="terms" checked={terms} onCheckedChange={setTerms} />
                <Label htmlFor="terms">Accept terms and conditions</Label>
              </div>
            </CardContent>
          </Card>

          {/* Slider Section */}
          <Card>
            <CardHeader>
              <CardTitle>Slider Component</CardTitle>
              <CardDescription>A slider for selecting a value.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Label htmlFor="volume">Volume</Label>
                <Slider
                  id="volume"
                  defaultValue={[volume]}
                  max={100}
                  step={1}
                  onValueChange={(value) => setVolume(value[0])}
                />
              </div>
            </CardContent>
          </Card>

          {/* Checkbox Section */}
          <Card>
            <CardHeader>
              <CardTitle>Checkbox Component</CardTitle>
              <CardDescription>A checkbox component.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox id="terms2" />
                <Label htmlFor="terms2">I agree to the terms and conditions</Label>
              </div>
            </CardContent>
          </Card>

          {/* Radio Group Section */}
          <Card>
            <CardHeader>
              <CardTitle>Radio Group Component</CardTitle>
              <CardDescription>A radio group component.</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup defaultValue="default" className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="r1" />
                  <Label htmlFor="r1">Default</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="comfortable" id="r2" />
                  <Label htmlFor="r2">Comfortable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compact" id="r3" />
                  <Label htmlFor="r3">Compact</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Calendar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Calendar Component</CardTitle>
              <CardDescription>A date picker component.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Progress Section */}
          <Card>
            <CardHeader>
              <CardTitle>Progress Component</CardTitle>
              <CardDescription>A progress bar component.</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} />
              <Button className="mt-4" onClick={() => setProgress((progress + 10) % 100)}>
                Increment
              </Button>
            </CardContent>
          </Card>

          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Avatar Component</CardTitle>
              <CardDescription>An avatar component.</CardDescription>
            </CardHeader>
            <CardContent>
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </CardContent>
          </Card>

          {/* Badge Section */}
          <Card>
            <CardHeader>
              <CardTitle>Badge Component</CardTitle>
              <CardDescription>A badge component.</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge>Badge</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </CardContent>
          </Card>

          {/* Command Section */}
          <Card>
            <CardHeader>
              <CardTitle>Command Component</CardTitle>
              <CardDescription>A command palette component.</CardDescription>
            </CardHeader>
            <CardContent>
              <Command>
                <CommandList>
                  <CommandInput placeholder="Type a command or search..." />
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    <CommandItem>Calendar</CommandItem>
                    <CommandItem>Search</CommandItem>
                    <CommandItem>Settings</CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </CardContent>
          </Card>

          {/* Dialog Section */}
          <Card>
            <CardHeader>
              <CardTitle>Dialog Component</CardTitle>
              <CardDescription>A modal dialog component.</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove your data from
                      our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="secondary">Cancel</Button>
                    <Button type="submit">Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Drawer Section */}
          <Card>
            <CardHeader>
              <CardTitle>Drawer Component</CardTitle>
              <CardDescription>A side drawer component.</CardDescription>
            </CardHeader>
            <CardContent>
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline">Open Drawer</Button>
                </DrawerTrigger>
                <DrawerContent className="sm:max-w-[425px]">
                  <DrawerHeader>
                    <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                    <DrawerDescription>
                      This action cannot be undone. This will permanently delete your account and remove your data from
                      our servers.
                    </DrawerDescription>
                  </DrawerHeader>
                  <DrawerFooter>
                    <Button variant="secondary">Cancel</Button>
                    <Button type="submit">Confirm</Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </CardContent>
          </Card>

          {/* Hover Card Section */}
          <Card>
            <CardHeader>
              <CardTitle>Hover Card Component</CardTitle>
              <CardDescription>A hover card component.</CardDescription>
            </CardHeader>
            <CardContent>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="outline">Open</Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">shadcn/ui</h4>
                    <p className="text-sm text-muted-foreground">
                      Beautifully designed components built with Radix UI and Tailwind CSS.
                    </p>
                    <Separator />
                    <p className="text-sm">
                      Made by <a href="https://twitter.com/shadcn">@shadcn</a>
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </CardContent>
          </Card>

          {/* Menubar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Menubar Component</CardTitle>
              <CardDescription>A menubar component.</CardDescription>
            </CardHeader>
            <CardContent>
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger>File</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      New File <MenubarShortcut>⌘N</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      Open... <MenubarShortcut>⌘O</MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarSub>
                      <MenubarSubTrigger>New</MenubarSubTrigger>
                      <MenubarSubContent>
                        <MenubarItem>Team...</MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem>Organization...</MenubarItem>
                      </MenubarSubContent>
                    </MenubarSub>
                    <MenubarSeparator />
                    <MenubarCheckboxItem>Open in New Tab</MenubarCheckboxItem>
                    <MenubarCheckboxItem>Open in New Window</MenubarCheckboxItem>
                    <MenubarSeparator />
                    <MenubarItem disabled>
                      Save... <MenubarShortcut>⌘S</MenubarShortcut>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>Edit</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      Undo <MenubarShortcut>⌘Z</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>
                      Cut <MenubarShortcut>⌘X</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      Copy <MenubarShortcut>⌘C</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      Paste <MenubarShortcut>⌘V</MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>
                      Select All <MenubarShortcut>⌘A</MenubarShortcut>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>View</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      Show All Tabs <MenubarShortcut>⌘⇧E</MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarRadioGroup>
                      <MenubarRadioGroup>
                        <MenubarItem>Show Status Bar</MenubarItem>
                        <MenubarItem>Show Activity Bar</MenubarItem>
                        <MenubarItem>Show Panel</MenubarItem>
                      </MenubarRadioGroup>
                    </MenubarRadioGroup>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>Window</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      Minimize <MenubarShortcut>⌘M</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      Zoom <MenubarShortcut>⇧⌘M</MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>Bring All to Front</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>Help</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      Search <MenubarShortcut>⌘?</MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>Keyboard Shortcuts</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </CardContent>
          </Card>

          {/* Scroll Area Section */}
          <Card>
            <CardHeader>
              <CardTitle>Scroll Area Component</CardTitle>
              <CardDescription>A scrollable area component.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40 w-full rounded-md border">
                <div className="p-4">
                  {[...Array(100)].map((_, i) => (
                    <p key={i}>This is some content inside the scroll area. {i + 1}</p>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
                <ScrollBar />
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Separator Section */}
          <Card>
            <CardHeader>
              <CardTitle>Separator Component</CardTitle>
              <CardDescription>A visual separator.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>First section</p>
              <Separator className="my-4" />
              <p>Second section</p>
            </CardContent>
          </Card>

          {/* Sheet Section */}
          <Card>
            <CardHeader>
              <CardTitle>Sheet Component</CardTitle>
              <CardDescription>A sheet component.</CardDescription>
            </CardHeader>
            <CardContent>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Open Sheet</Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-[425px]">
                  <SheetHeader>
                    <SheetTitle>Edit profile</SheetTitle>
                    <SheetDescription>Make changes to your profile here. Click save when you're done.</SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input id="name" value="Pedro Duarte" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="username" className="text-right">
                        Username
                      </Label>
                      <Input id="username" value="@peduarte" className="col-span-3" />
                    </div>
                  </div>
                  <SheetFooter>
                    <Button type="submit">Save changes</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>

          {/* Skeleton Section */}
          <Card>
            <CardHeader>
              <CardTitle>Skeleton Component</CardTitle>
              <CardDescription>A placeholder skeleton.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[150px]" />
            </CardContent>
          </Card>

          {/* Tabs Section */}
          <Card>
            <CardHeader>
              <CardTitle>Tabs Component</CardTitle>
              <CardDescription>A tabbed interface.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="account" className="w-[400px]">
                <TabsList>
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="account">Make changes to your account here.</TabsContent>
                <TabsContent value="billing">Update your billing details here.</TabsContent>
                <TabsContent value="settings">Configure your application settings here.</TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Toast Section */}
          <Card>
            <CardHeader>
              <CardTitle>Toast Component</CardTitle>
              <CardDescription>A notification toast.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() =>
                  toast({
                    title: "Uh oh! Something went wrong.",
                    description: "There was a problem with your request.",
                  })
                }
              >
                Show Toast
              </Button>
            </CardContent>
          </Card>

          {/* Toggle Section */}
          <Card>
            <CardHeader>
              <CardTitle>Toggle Component</CardTitle>
              <CardDescription>A toggle button.</CardDescription>
            </CardHeader>
            <CardContent>
              <Toggle>Toggle</Toggle>
              <Toggle variant="secondary">Toggle</Toggle>
            </CardContent>
          </Card>

          {/* Tooltip Section */}
          <Card>
            <CardHeader>
              <CardTitle>Tooltip Component</CardTitle>
              <CardDescription>A tooltip on hover.</CardDescription>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button>Hover</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add to library.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>

          {/* Aspect Ratio Section */}
          <Card>
            <CardHeader>
              <CardTitle>Aspect Ratio Component</CardTitle>
              <CardDescription>Maintains aspect ratio.</CardDescription>
            </CardHeader>
            <CardContent>
              <AspectRatio ratio={16 / 9}>
                <img
                  src="https://images.unsplash.com/photo-1587614382231-d9433e61f086?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80"
                  alt="Image"
                  className="rounded-md object-cover"
                />
              </AspectRatio>
            </CardContent>
          </Card>

          {/* Carousel Section */}
          <Card>
            <CardHeader>
              <CardTitle>Carousel Component</CardTitle>
              <CardDescription>An image carousel.</CardDescription>
            </CardHeader>
            <CardContent>
              <Carousel className="w-full max-w-md">
                <CarouselContent>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                      <div className="p-1">
                        <AspectRatio ratio={16 / 9}>
                          <img
                            src={`https://via.placeholder.com/800x450?text=Slide ${index + 1}`}
                            alt={`Slide ${index + 1}`}
                            className="rounded-md object-cover"
                          />
                        </AspectRatio>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </CardContent>
          </Card>

          {/* Session Setup Section */}
          <Card className="border border-logo-rose-600">
            <CardHeader>
              <CardTitle className="text-logo-rose-600">Session Setup</CardTitle>
              <CardDescription className="text-logo-rose-600">Configure your session settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sessionName" className="text-logo-rose-600">
                    Session Name
                  </Label>
                  <Input type="text" id="sessionName" placeholder="Enter session name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sessionDescription" className="text-logo-rose-600">
                    Session Description
                  </Label>
                  <Textarea id="sessionDescription" placeholder="Enter session description" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sessionType" className="text-logo-rose-600">
                    Session Type
                  </Label>
                  <Select>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select session type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lecture">Lecture</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="seminar">Seminar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <ToastViewport />
      </ToastProvider>
    </main>
  )
}
