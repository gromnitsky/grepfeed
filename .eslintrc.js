module.exports = {
    parserOptions: {
	ecmaVersion: 2019,
	sourceType: "module",
	ecmaFeatures: {
	    impliedStrict: true
	}
    },
    env: {
	browser: true,
	commonjs: true,
	es6: true,
	node: true,
	mocha: true,
	jquery: true,
    },
    plugins: ["react"],
    extends: ["eslint:recommended", "plugin:react/recommended"],
    rules: {
	"no-console": ["off"],
	"no-mixed-spaces-and-tabs": ["off"],
	"no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],

	"eqeqeq": ["error", "always", {"null": "ignore"}],
	"block-scoped-var": ["warn"],
	"default-case": ["warn"],
	"dot-notation": ["warn"],
	"no-throw-literal": ["error"],
	"no-constant-condition": ["error", { "checkLoops": false }],

	// "react/no-danger": 0,
	"react/prop-types": 0,
        "react/jsx-no-undef": [2, { "allowGlobals": true }]
    },
    settings: {
	react: {
	    version: "detect"
	}
    }
}
