/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['<rootDir>/tests//**/*(*.)@(spec|test).ts'],
	extensionsToTreatAsEsm: ['.ts'],
	moduleNameMapper: {
		'^src/(.*)$': '<rootDir>/src/$1',
		'^tests/(.*)$': '<rootDir>/tests/$1',
	},
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				useESM: true,
				diagnostics: {
					exclude: ['**'],
				},
			},
		],
	},
};
