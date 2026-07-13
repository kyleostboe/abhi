const OGG_CRC_POLY = 0x04c11db7

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let value = i << 24
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 0x80000000) !== 0
        ? ((value << 1) ^ OGG_CRC_POLY) >>> 0
        : (value << 1) >>> 0
    }
    table[i] = value
  }
  return table
})()

function oggCrc(bytes: Uint8Array) {
  let crc = 0
  for (const byte of bytes) {
    crc = ((crc << 8) ^ crcTable[((crc >>> 24) ^ byte) & 0xff]) >>> 0
  }
  return crc
}

function writeUint32LE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true)
}

function writeUint64LE(view: DataView, offset: number, value: number) {
  const safeValue = Math.max(0, Math.floor(value))
  writeUint32LE(view, offset, safeValue % 0x100000000)
  writeUint32LE(view, offset + 4, Math.floor(safeValue / 0x100000000))
}

function ascii(value: string) {
  return new TextEncoder().encode(value)
}

function concat(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function createOpusHead(channels: number, preSkip: number, sourceSampleRate: number) {
  const packet = new Uint8Array(19)
  const view = new DataView(packet.buffer)
  packet.set(ascii("OpusHead"), 0)
  packet[8] = 1
  packet[9] = channels
  view.setUint16(10, preSkip, true)
  view.setUint32(12, sourceSampleRate, true)
  view.setInt16(16, 0, true)
  packet[18] = 0
  return packet
}

function createOpusTags() {
  const vendor = ascii("breathwork-audio-studio")
  const packet = new Uint8Array(8 + 4 + vendor.length + 4)
  const view = new DataView(packet.buffer)
  packet.set(ascii("OpusTags"), 0)
  view.setUint32(8, vendor.length, true)
  packet.set(vendor, 12)
  view.setUint32(12 + vendor.length, 0, true)
  return packet
}

function createPage({
  packet,
  serial,
  sequence,
  granulePosition,
  headerType,
}: {
  packet: Uint8Array
  serial: number
  sequence: number
  granulePosition: number
  headerType: number
}) {
  const segmentCount = Math.floor(packet.length / 255) + 1
  if (segmentCount > 255) throw new Error("Opus packet exceeds one Ogg page")

  const page = new Uint8Array(27 + segmentCount + packet.length)
  const view = new DataView(page.buffer)
  page.set(ascii("OggS"), 0)
  page[4] = 0
  page[5] = headerType
  writeUint64LE(view, 6, granulePosition)
  writeUint32LE(view, 14, serial)
  writeUint32LE(view, 18, sequence)
  page[26] = segmentCount

  let remaining = packet.length
  for (let i = 0; i < segmentCount; i++) {
    const size = Math.min(255, remaining)
    page[27 + i] = size
    remaining -= size
  }
  page.set(packet, 27 + segmentCount)

  writeUint32LE(view, 22, oggCrc(page))
  return page
}

export function muxOggOpus({
  packets,
  channels,
  preSkip,
  sourceSampleRate,
  sourceSamples,
  frameSize,
}: {
  packets: Uint8Array[]
  channels: number
  preSkip: number
  sourceSampleRate: number
  sourceSamples: number
  frameSize: number
}) {
  if (packets.length === 0) throw new Error("Cannot mux an empty Opus stream")

  const serial = crypto.getRandomValues(new Uint32Array(1))[0]
  const pages: Uint8Array[] = []
  let sequence = 0

  pages.push(createPage({
    packet: createOpusHead(channels, preSkip, sourceSampleRate),
    serial,
    sequence: sequence++,
    granulePosition: 0,
    headerType: 0x02,
  }))
  pages.push(createPage({
    packet: createOpusTags(),
    serial,
    sequence: sequence++,
    granulePosition: 0,
    headerType: 0,
  }))

  packets.forEach((packet, index) => {
    const isLast = index === packets.length - 1
    const decodedSamples = Math.min((index + 1) * frameSize, sourceSamples)
    pages.push(createPage({
      packet,
      serial,
      sequence: sequence++,
      granulePosition: preSkip + decodedSamples,
      headerType: isLast ? 0x04 : 0,
    }))
  })

  return concat(pages)
}
