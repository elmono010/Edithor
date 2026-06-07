import { useState, useCallback } from 'react';

interface TestResult {
  name: string;
  line: number;
  status: 'idle' | 'running' | 'passed' | 'failed';
  error?: string;
  duration?: number;
}

export function useTestRunner() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testRunState, setTestRunState] = useState<'idle' | 'running' | 'done'>('idle');

  const parseTestsFromFile = useCallback((content: string): TestResult[] => {
    const testRegex = /test\s*\(\s*["']([^"']+)["']\s*,/g;
    const results: TestResult[] = [];
    let match;
    
    while ((match = testRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      results.push({
        name: match[1],
        line: lineNumber,
        status: 'idle'
      });
    }
    
    return results;
  }, []);

  const runTests = useCallback(async (tests: TestResult[], testFn: (test: TestResult) => Promise<{ passed: boolean; error?: string; duration?: number }>) => {
    setTestRunState('running');
    
    const updatedTests = tests.map(t => ({ ...t, status: 'running' as const }));
    setTestResults(updatedTests);

    for (let i = 0; i < updatedTests.length; i++) {
      try {
        const result = await testFn(updatedTests[i]);
        
        setTestResults(prev => prev.map((t, idx) => {
          if (idx === i) {
            return {
              ...t,
              status: result.passed ? 'passed' : 'failed',
              error: result.error,
              duration: result.duration
            };
          }
          return t;
        }));
      } catch (error) {
        setTestResults(prev => prev.map((t, idx) => {
          if (idx === i) {
            return {
              ...t,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              duration: 0
            };
          }
          return t;
        }));
      }
    }

    setTestRunState('done');
  }, []);

  const clearTests = useCallback(() => {
    setTestResults([]);
    setTestRunState('idle');
  }, []);

  const getTestSummary = useCallback(() => {
    const total = testResults.length;
    const passed = testResults.filter(t => t.status === 'passed').length;
    const failed = testResults.filter(t => t.status === 'failed').length;
    const running = testResults.filter(t => t.status === 'running').length;
    const idle = testResults.filter(t => t.status === 'idle').length;

    return { total, passed, failed, running, idle };
  }, [testResults]);

  return {
    testResults,
    setTestResults,
    testRunState,
    parseTestsFromFile,
    runTests,
    clearTests,
    getTestSummary
  };
}
