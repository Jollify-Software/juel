import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import functional from 'eslint-plugin-functional';
import imprt from 'eslint-plugin-import'; // 'import' is ambiguous & prettier has trouble

// eslint.config.js
export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: { 
      parser: tsParser,  
      parserOptions: {  
        ecmaFeatures: { 
          modules: true
        },
        ecmaVersion: 'latest',
        project: './tsconfig.json',  
      },
    },
  
    plugins: {  
      functional,      
      import: imprt,  
      '@typescript-eslint': ts,  
      ts,  
    },
  
  
    rules: {  
      ...ts.configs['eslint-recommended'].rules,
      ...ts.configs['recommended'].rules,
      'ts/return-await': 2,
    }
  }
];