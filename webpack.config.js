const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const path = require('path')

const mode = process.env.NODE_ENV || 'development'
const prod = mode === 'production'

module.exports = {
	entry: {
		'build/bundle': ['./src/main.js']
	},

  // Resolve path aliases: 
	resolve: {

    // The resolve.alias option is used to make sure that only one copy 
    // of the Svelte runtime is bundled in the app, even if you are 
    // npm linking in dependencies with their own copy of the svelte package. 
    // Having multiple copies of the internal scheduler in an app, 
    // besides being inefficient, can also cause various problems.
    //
		alias: {
			svelte: path.dirname(require.resolve('svelte/package.json'))
		},
		extensions: ['.mjs', '.js', '.svelte'],

    // Webpack's resolve.mainFields option determines which 
    // fields in package.json are used to resolve identifiers. 
    // If you're using Svelte components installed from npm, 
    // you should specify this option so that your app can 
    // use the original component source code, rather than 
    // consuming the already-compiled version (which is less efficient).
    //
		mainFields: ['svelte', 'browser', 'module', 'main'],

    // Webpack's resolve.conditionNames option determines which 
    // fields in the exports in package.json are used to resolve identifiers. 
    // If you're using Svelte components installed from npm, 
    // you should specify this option so that your app can use the 
    // original component source code, rather than consuming the 
    // already-compiled version (which is less efficient).
    //
    // TODO: Disabled because of pending issue: 
    // https://github.com/sveltejs/svelte-loader/issues/228    
		// conditionNames: ['svelte']
	},
	output: {
		path: path.join(__dirname, '/public'),
		filename: '[name].js',
		chunkFilename: '[name].[id].js'
	},
	module: {
		rules: [
			{
				test: /\.svelte$/,
				use: {
					loader: 'svelte-loader',
					options: {
						compilerOptions: {
							dev: !prod
						},
						emitCss: prod,
						hotReload: !prod
					}
				}
			},
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					'css-loader'
				]
			},
			{
				// required to prevent errors from Svelte on Webpack 5+
				test: /node_modules\/svelte\/.*\.mjs$/,
				resolve: {
					fullySpecified: false
				}
			}
		]
	},
	mode,
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css'
		})
	],
	devtool: prod ? false : 'source-map',
	devServer: {
		hot: true
	}
}
