// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// CRA's bundled jsdom test environment doesn't provide TextEncoder/TextDecoder,
// which react-router v7 requires at import time.
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
// @ts-expect-error - Node's TextDecoder type is slightly stricter than the DOM lib's
global.TextDecoder = TextDecoder;

// Mock IntersectionObserver for tests
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
  }
  
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  
  observe(target: Element) {
    // Simulate intersection immediately for tests
    setTimeout(() => {
      this.callback([{
        target,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
        time: Date.now()
      }] as IntersectionObserverEntry[], this);
    }, 0);
  }
  
  unobserve(target: Element) {}
  disconnect() {}
};

// Mock ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  callback: ResizeObserverCallback;
  
  observe(target: Element) {}
  unobserve(target: Element) {}
  disconnect() {}
};

// Mock navigator.connection for network speed tests
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
});

// Mock performance.memory for memory usage tests
Object.defineProperty(performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 50000000,
    jsHeapSizeLimit: 100000000,
    totalJSHeapSize: 60000000
  }
});

// Mock PerformanceObserver for web vitals
global.PerformanceObserver = class PerformanceObserver {
  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
  }
  
  callback: PerformanceObserverCallback;
  
  observe(options: PerformanceObserverInit) {}
  disconnect() {}
};

// Suppress ResizeObserver errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('ResizeObserver loop completed with undelivered notifications')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});