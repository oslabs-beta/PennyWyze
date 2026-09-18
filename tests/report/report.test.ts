import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { printReport } from '../../src/report.js'

const baseModel = (overrides = {}) => ({
  name: 'model',
  score: '50/50',
  monthlyCost: 100,
  passed: true,
  misses: [],
  ...overrides,
})

describe('printReport', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  const printedOutput = () => logSpy.mock.calls.map(call => call.join(' ')).join('\n')

  it('recommends the cheapest model that passed, never a cheaper one that failed', () => {
    const models = [
      baseModel({ name: 'cheap-but-failed', monthlyCost: 10, passed: false }),
      baseModel({ name: 'expensive-but-passed', monthlyCost: 50, passed: true }),
    ]

    printReport(models, 0.15, 50)

    const output = printedOutput()
    expect(output).toContain('Switch to expensive-but-passed')
    expect(output).not.toContain('Switch to cheap-but-failed')
  })

  it('reports no cheaper option when nothing passed, instead of naming a verdict', () => {
    const models = [
      baseModel({ name: 'opus', monthlyCost: 200, passed: false }),
      baseModel({ name: 'sonnet', monthlyCost: 80, passed: false }),
    ]

    printReport(models, 0.15, 50)

    const output = printedOutput()
    expect(output).toContain('No cheaper model meets quality criteria.')
    expect(output).not.toContain('Switch to')
  })

  it('warns when the dataset is under 30 examples', () => {
    printReport([baseModel()], 0.15, 20)

    expect(printedOutput()).toContain('Small dataset: only 20 examples tested')
  })

  it('does not warn when the dataset is 30 or more examples', () => {
    printReport([baseModel()], 0.15, 30)

    expect(printedOutput()).not.toContain('Small dataset')
  })
})