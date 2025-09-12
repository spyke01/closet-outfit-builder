import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'
import { SettingsProvider } from '../contexts/SettingsContext'
import { ThemeProvider } from '../contexts/ThemeContext'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Setup localStorage mock before each test
beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
  
  // Reset mocks
  localStorageMock.getItem.mockReturnValue(null)
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})

// Mock providers with default values
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        {children}
      </SettingsProvider>
    </ThemeProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
