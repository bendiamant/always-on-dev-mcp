export default {
  roots: ['<rootDir>/src'], // Only look for tests in the src directory
  // preset: 'ts-jest/presets/default-esm', // Removed preset
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true, // Important for ES Module support
      tsconfig: 'tsconfig.json', // Point directly to the tsconfig.json file
      isolatedModules: false, // Explicitly set isolatedModules to false
    }],
  },
  // If using ESM, Jest needs to know how to handle .ts files as modules
  // This tells Jest to treat .ts files as ESM
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // This mapping helps Jest resolve '.js' extensions in imports from .ts files,
    // which is often needed when working with ESM and TypeScript.
    '^(\.{1,2}/.*)\\.js$': '$1',
  },
};
