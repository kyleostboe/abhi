import { describe, it, expect } from 'vitest'
import { cn } from '../lib/utils'

describe('cn utility', () => {
  it('merges multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles conditional class names', () => {
    expect(cn('foo', { bar: true, baz: false })).toBe('foo bar')
  })
})
