"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Mic, MicOff, Plus } from "lucide-react"

export default function MeditationApp() {
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [multiNoteMode, setMultiNoteMode] = useState(false)
  const [noteType, setNoteType] = useState<"piano" | "synth" | "harp">("piano")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingLabel, setRecordingLabel] = useState("")
  const [instruction, setInstruction] = useState("")

  const MUSICAL_NOTES = [
    { note: "C", octaves: [4, 5, 6] },
    { note: "D", octaves: [4, 5, 6] },
    { note: "E", octaves: [4, 5, 6] },
    { note: "F", octaves: [4, 5, 6] },
    { note: "G", octaves: [4, 5, 6] },
    { note: "A", octaves: [4, 5, 6] },
    { note: "B", octaves: [4, 5, 6] },
  ]

  const handleNoteSelection = (note: string, octave: number) => {
    const noteWithOctave = `${note}${octave}`

    if (multiNoteMode) {
      if (selectedNotes.includes(noteWithOctave)) {
        setSelectedNotes(selectedNotes.filter((n) => n !== noteWithOctave))
      } else {
        setSelectedNotes([...selectedNotes, noteWithOctave])
      }
    } else {
      // Play single note
      console.log(`Playing single ${noteType} note: ${noteWithOctave}`)
    }
  }

  const playChordPreview = () => {
    if (selectedNotes.length > 0) {
      console.log(`Playing ${noteType} chord with notes:`, selectedNotes)
    }
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    console.log(isRecording ? "Stopping recording" : "Starting recording")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">abhī</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Meditation Tool - Adjust meditation length or create custom meditation timelines
          </p>
        </motion.div>

        {/* Mobile Layout - visible on small screens */}
        <div className="lg:hidden space-y-6">
          {/* Instruction Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">📝 Instructions</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Textarea
                  placeholder="Enter an instruction..."
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Sound Cue Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-400 to-orange-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">🎵 Sound Cues</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="musical-notes">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex flex-col gap-2 w-full">
                        <span>Musical Notes</span>
                        <div className="flex flex-col gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span>Type</span>
                            <Select
                              value={noteType}
                              onValueChange={(value: "piano" | "synth" | "harp") => setNoteType(value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="piano">Piano</SelectItem>
                                <SelectItem value="synth">Synth</SelectItem>
                                <SelectItem value="harp">Harp</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Multi-Note</span>
                            <Switch checked={multiNoteMode} onCheckedChange={setMultiNoteMode} />
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {multiNoteMode && selectedNotes.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-600">Selected: {selectedNotes.join(", ")}</span>
                            <Button size="sm" onClick={playChordPreview}>
                              Play Chord
                            </Button>
                          </div>
                        </div>
                      )}

                      {MUSICAL_NOTES.map(({ note, octaves }) => (
                        <Accordion key={note} type="single" collapsible>
                          <AccordionItem value={`octave-${note}`}>
                            <AccordionTrigger>
                              Octave {octaves[0]}-{octaves[octaves.length - 1]} ({note})
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="grid grid-cols-3 gap-2">
                                {octaves.map((octave) => {
                                  const noteWithOctave = `${note}${octave}`
                                  const isSelected = selectedNotes.includes(noteWithOctave)
                                  return (
                                    <Button
                                      key={octave}
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleNoteSelection(note, octave)}
                                      className={
                                        isSelected ? "bg-gradient-to-r from-amber-400 to-rose-400 text-white" : ""
                                      }
                                    >
                                      {noteWithOctave}
                                    </Button>
                                  )
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="miscellaneous">
                    <AccordionTrigger>Miscellaneous</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-center py-8 text-gray-500">Coming Soon</div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Button className="w-full mt-4 bg-transparent" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Timeline
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Voice Recording Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-pink-400 to-green-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">🎤 Voice Recording</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="recording-label">Label</Label>
                  <Input
                    id="recording-label"
                    placeholder="Describe this recording..."
                    value={recordingLabel}
                    onChange={(e) => setRecordingLabel(e.target.value)}
                  />
                </div>
                <Button
                  onClick={toggleRecording}
                  className={`w-full ${isRecording ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Desktop Layout - visible on large screens */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Instruction Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">📝 Instructions</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Textarea
                    placeholder="Enter an instruction..."
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Voice Recording Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-pink-400 to-green-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">🎤 Voice Recording</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label htmlFor="recording-label-desktop">Label</Label>
                    <Input
                      id="recording-label-desktop"
                      placeholder="Describe this recording..."
                      value={recordingLabel}
                      onChange={(e) => setRecordingLabel(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={toggleRecording}
                    className={`w-full ${isRecording ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4 mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        Start Recording
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Sound Cue Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg h-full">
              <CardHeader className="bg-gradient-to-r from-blue-400 to-orange-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">🎵 Sound Cues</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="musical-notes">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex flex-col gap-2 w-full">
                        <span>Musical Notes</span>
                        <div className="flex flex-col gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span>Type</span>
                            <Select
                              value={noteType}
                              onValueChange={(value: "piano" | "synth" | "harp") => setNoteType(value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="piano">Piano</SelectItem>
                                <SelectItem value="synth">Synth</SelectItem>
                                <SelectItem value="harp">Harp</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Multi-Note</span>
                            <Switch checked={multiNoteMode} onCheckedChange={setMultiNoteMode} />
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {multiNoteMode && selectedNotes.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-600">Selected: {selectedNotes.join(", ")}</span>
                            <Button size="sm" onClick={playChordPreview}>
                              Play Chord
                            </Button>
                          </div>
                        </div>
                      )}

                      {MUSICAL_NOTES.map(({ note, octaves }) => (
                        <Accordion key={note} type="single" collapsible>
                          <AccordionItem value={`octave-${note}`}>
                            <AccordionTrigger>
                              Octave {octaves[0]}-{octaves[octaves.length - 1]} ({note})
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="grid grid-cols-3 gap-2">
                                {octaves.map((octave) => {
                                  const noteWithOctave = `${note}${octave}`
                                  const isSelected = selectedNotes.includes(noteWithOctave)
                                  return (
                                    <Button
                                      key={octave}
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleNoteSelection(note, octave)}
                                      className={
                                        isSelected ? "bg-gradient-to-r from-amber-400 to-rose-400 text-white" : ""
                                      }
                                    >
                                      {noteWithOctave}
                                    </Button>
                                  )
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="miscellaneous">
                    <AccordionTrigger>Miscellaneous</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-center py-8 text-gray-500">Coming Soon</div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Button className="w-full mt-4 bg-transparent" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Timeline
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
