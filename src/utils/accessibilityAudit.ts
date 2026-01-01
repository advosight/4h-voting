/**
 * Accessibility audit utilities for runtime validation
 * Helps identify and fix accessibility issues in production
 */

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  element: HTMLElement;
  message: string;
  rule: string;
  suggestion?: string;
}

export interface AccessibilityAuditResult {
  issues: AccessibilityIssue[];
  score: number;
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Comprehensive accessibility audit for mobile interfaces
 */
export class AccessibilityAuditor {
  private issues: AccessibilityIssue[] = [];

  /**
   * Run complete accessibility audit
   */
  public audit(container: HTMLElement = document.body): AccessibilityAuditResult {
    this.issues = [];

    // Run all audit checks
    this.auditTouchTargets(container);
    this.auditAriaLabels(container);
    this.auditKeyboardNavigation(container);
    this.auditColorContrast(container);
    this.auditFormLabels(container);
    this.auditHeadingStructure(container);
    this.auditFocusManagement(container);
    this.auditLiveRegions(container);

    return this.generateReport();
  }

  /**
   * Audit touch target sizes for mobile accessibility
   */
  private auditTouchTargets(container: HTMLElement): void {
    const interactiveElements = container.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
    );

    interactiveElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      const minSize = 44;

      if (rect.width < minSize || rect.height < minSize) {
        this.addIssue({
          type: 'error',
          element: htmlElement,
          message: `Touch target is too small: ${Math.round(rect.width)}x${Math.round(rect.height)}px`,
          rule: 'WCAG 2.1 AA - Target Size',
          suggestion: `Increase size to at least ${minSize}x${minSize}px for mobile accessibility`,
        });
      }
    });
  }

  /**
   * Audit ARIA labels and roles
   */
  private auditAriaLabels(container: HTMLElement): void {
    // Check for missing aria-labels on interactive elements
    const interactiveElements = container.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"]'
    );

    interactiveElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const hasLabel = 
        htmlElement.getAttribute('aria-label') ||
        htmlElement.getAttribute('aria-labelledby') ||
        htmlElement.textContent?.trim() ||
        htmlElement.querySelector('img')?.getAttribute('alt');

      if (!hasLabel) {
        this.addIssue({
          type: 'error',
          element: htmlElement,
          message: 'Interactive element missing accessible name',
          rule: 'WCAG 2.1 A - Name, Role, Value',
          suggestion: 'Add aria-label, aria-labelledby, or visible text content',
        });
      }
    });

    // Check for invalid ARIA attributes
    const elementsWithAria = container.querySelectorAll('[aria-*]');
    elementsWithAria.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const ariaInvalid = htmlElement.getAttribute('aria-invalid');
      
      if (ariaInvalid === 'true') {
        const errorId = htmlElement.getAttribute('aria-describedby');
        if (!errorId || !document.getElementById(errorId)) {
          this.addIssue({
            type: 'warning',
            element: htmlElement,
            message: 'Element marked as invalid but missing error description',
            rule: 'WCAG 2.1 AA - Error Identification',
            suggestion: 'Add aria-describedby pointing to error message element',
          });
        }
      }
    });
  }

  /**
   * Audit keyboard navigation support
   */
  private auditKeyboardNavigation(container: HTMLElement): void {
    const focusableElements = container.querySelectorAll(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const tabIndex = htmlElement.getAttribute('tabindex');

      // Check for positive tabindex (anti-pattern)
      if (tabIndex && parseInt(tabIndex) > 0) {
        this.addIssue({
          type: 'warning',
          element: htmlElement,
          message: 'Positive tabindex detected',
          rule: 'WCAG 2.1 A - Keyboard Navigation',
          suggestion: 'Use tabindex="0" or rely on natural tab order',
        });
      }

      // Check for missing focus indicators
      const computedStyle = window.getComputedStyle(htmlElement, ':focus');
      const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '0px';
      const hasBoxShadow = computedStyle.boxShadow !== 'none';
      
      if (!hasOutline && !hasBoxShadow) {
        this.addIssue({
          type: 'warning',
          element: htmlElement,
          message: 'Element may be missing focus indicator',
          rule: 'WCAG 2.1 AA - Focus Visible',
          suggestion: 'Add visible focus indicator with outline or box-shadow',
        });
      }
    });
  }

  /**
   * Audit color contrast (basic check)
   */
  private auditColorContrast(container: HTMLElement): void {
    const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, button, a');
    
    textElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const style = window.getComputedStyle(htmlElement);
      const fontSize = parseFloat(style.fontSize);
      const fontWeight = style.fontWeight;
      
      // Basic check for very light text
      const color = style.color;
      if (color.includes('rgb')) {
        const rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          const [r, g, b] = rgb.map(Number);
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          
          // Very basic contrast check
          if (luminance > 0.8) {
            this.addIssue({
              type: 'warning',
              element: htmlElement,
              message: 'Text may have insufficient contrast',
              rule: 'WCAG 2.1 AA - Contrast Minimum',
              suggestion: 'Verify color contrast meets 4.5:1 ratio (3:1 for large text)',
            });
          }
        }
      }
    });
  }

  /**
   * Audit form labels
   */
  private auditFormLabels(container: HTMLElement): void {
    const formControls = container.querySelectorAll('input, select, textarea');
    
    formControls.forEach((element) => {
      const htmlElement = element as HTMLInputElement;
      const id = htmlElement.id;
      const type = htmlElement.type;
      
      // Skip hidden inputs
      if (type === 'hidden') return;
      
      const hasLabel = 
        (id && container.querySelector(`label[for="${id}"]`)) ||
        htmlElement.getAttribute('aria-label') ||
        htmlElement.getAttribute('aria-labelledby') ||
        htmlElement.closest('label');

      if (!hasLabel) {
        this.addIssue({
          type: 'error',
          element: htmlElement,
          message: 'Form control missing label',
          rule: 'WCAG 2.1 A - Labels or Instructions',
          suggestion: 'Add <label> element or aria-label attribute',
        });
      }

      // Check required fields
      if (htmlElement.required && !htmlElement.getAttribute('aria-required')) {
        this.addIssue({
          type: 'info',
          element: htmlElement,
          message: 'Required field should have aria-required="true"',
          rule: 'WCAG 2.1 A - Labels or Instructions',
          suggestion: 'Add aria-required="true" to required form fields',
        });
      }
    });
  }

  /**
   * Audit heading structure
   */
  private auditHeadingStructure(container: HTMLElement): void {
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let previousLevel = 0;

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level > previousLevel + 1) {
        this.addIssue({
          type: 'warning',
          element: heading as HTMLElement,
          message: `Heading level skipped from h${previousLevel} to h${level}`,
          rule: 'WCAG 2.1 AA - Headings and Labels',
          suggestion: 'Use heading levels sequentially (h1, h2, h3, etc.)',
        });
      }
      
      previousLevel = level;
    });

    // Check for missing h1
    if (!container.querySelector('h1') && headings.length > 0) {
      this.addIssue({
        type: 'info',
        element: headings[0] as HTMLElement,
        message: 'Page missing h1 heading',
        rule: 'WCAG 2.1 AA - Headings and Labels',
        suggestion: 'Add h1 heading to identify main page content',
      });
    }
  }

  /**
   * Audit focus management
   */
  private auditFocusManagement(container: HTMLElement): void {
    const modals = container.querySelectorAll('[role="dialog"], [aria-modal="true"]');
    
    modals.forEach((modal) => {
      const htmlElement = modal as HTMLElement;
      
      // Check for proper labeling
      const hasLabel = 
        htmlElement.getAttribute('aria-labelledby') ||
        htmlElement.getAttribute('aria-label');
        
      if (!hasLabel) {
        this.addIssue({
          type: 'error',
          element: htmlElement,
          message: 'Modal missing accessible name',
          rule: 'WCAG 2.1 A - Name, Role, Value',
          suggestion: 'Add aria-labelledby or aria-label to modal',
        });
      }
    });
  }

  /**
   * Audit live regions
   */
  private auditLiveRegions(container: HTMLElement): void {
    const liveRegions = container.querySelectorAll('[aria-live]');
    
    liveRegions.forEach((region) => {
      const htmlElement = region as HTMLElement;
      const liveValue = htmlElement.getAttribute('aria-live');
      
      if (liveValue && !['polite', 'assertive', 'off'].includes(liveValue)) {
        this.addIssue({
          type: 'error',
          element: htmlElement,
          message: `Invalid aria-live value: "${liveValue}"`,
          rule: 'WCAG 2.1 A - Status Messages',
          suggestion: 'Use "polite", "assertive", or "off" for aria-live',
        });
      }
    });
  }

  /**
   * Add issue to the audit results
   */
  private addIssue(issue: AccessibilityIssue): void {
    this.issues.push(issue);
  }

  /**
   * Generate audit report
   */
  private generateReport(): AccessibilityAuditResult {
    const summary = {
      errors: this.issues.filter(issue => issue.type === 'error').length,
      warnings: this.issues.filter(issue => issue.type === 'warning').length,
      info: this.issues.filter(issue => issue.type === 'info').length,
    };

    // Calculate score (100 - penalty for each issue type)
    const score = Math.max(0, 100 - (summary.errors * 10) - (summary.warnings * 5) - (summary.info * 1));

    return {
      issues: this.issues,
      score,
      summary,
    };
  }
}

/**
 * Quick accessibility check for development
 */
export const quickAccessibilityCheck = (element?: HTMLElement): AccessibilityAuditResult => {
  const auditor = new AccessibilityAuditor();
  return auditor.audit(element);
};

/**
 * Log accessibility issues to console (development only)
 */
export const logAccessibilityIssues = (result: AccessibilityAuditResult): void => {
  if (process.env.NODE_ENV !== 'development') return;

  console.group('🔍 Accessibility Audit Results');
  console.log(`Score: ${result.score}/100`);
  console.log(`Issues: ${result.issues.length} total (${result.summary.errors} errors, ${result.summary.warnings} warnings, ${result.summary.info} info)`);

  if (result.issues.length > 0) {
    result.issues.forEach((issue, index) => {
      const emoji = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
      console.group(`${emoji} ${issue.type.toUpperCase()}: ${issue.message}`);
      console.log('Rule:', issue.rule);
      if (issue.suggestion) {
        console.log('Suggestion:', issue.suggestion);
      }
      console.log('Element:', issue.element);
      console.groupEnd();
    });
  } else {
    console.log('✅ No accessibility issues found!');
  }

  console.groupEnd();
};

/**
 * Continuous accessibility monitoring
 */
export class AccessibilityMonitor {
  private observer: MutationObserver | null = null;
  private auditor = new AccessibilityAuditor();

  /**
   * Start monitoring for accessibility issues
   */
  public startMonitoring(container: HTMLElement = document.body): void {
    if (process.env.NODE_ENV !== 'development') return;

    this.observer = new MutationObserver((mutations) => {
      let shouldAudit = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldAudit = true;
        }
      });

      if (shouldAudit) {
        // Debounce audit calls
        setTimeout(() => {
          const result = this.auditor.audit(container);
          if (result.issues.length > 0) {
            logAccessibilityIssues(result);
          }
        }, 500);
      }
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true,
    });

    console.log('🔍 Accessibility monitoring started');
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      console.log('🔍 Accessibility monitoring stopped');
    }
  }
}

// Global accessibility monitor instance
export const accessibilityMonitor = new AccessibilityMonitor();