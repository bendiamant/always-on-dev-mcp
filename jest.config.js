export default {
  roots: ['<rootDir>/src'], // Only look for tests in the src directory
  preset: 'ts-jest/presets/default-esm', // Using the ESM preset
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json', // Explicitly point to tsconfig
      isolatedModules: false, // Crucial for this issue
    }],
  },
  // extensionsToTreatAsEsm is usually handled by the preset, but being explicit can help.
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // This mapping helps Jest resolve '.js' extensions in imports from .ts files,
    // which is often needed when working with ESM and TypeScript.
    '^(\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
};
