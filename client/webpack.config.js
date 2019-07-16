const path = require('path')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebPackPlugin = require('html-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

const settings = require('../settings')

module.exports = (env, options) => {
  const isDevMode = options.mode !== 'production'

  const plugins = [
    new CopyWebpackPlugin([
      { from: './src/fonts', to: 'fonts' },
      { from: './src/images', to: 'images' },
      { from: './src/locale', to: 'locale' },
      { from: './src/css', to: 'css' },
    ]),
    new HtmlWebPackPlugin({
      template: './views/index.html',
      filename: './index.html'
    }),
    /**
     * Define base URL for the API endpoint.
     */
    new webpack.DefinePlugin({
      'process.env': {
        API_BASE_URL: JSON.stringify(process.env.API_BASE_URL || 'http://localhost:8080'),
        LOGLEVEL: JSON.stringify(isDevMode ? 'DEBUG' : 'INFO'),
      },
      __histograph_globals: {
        analytics: JSON.stringify({}),
        types: {
          resources: JSON.stringify(settings.types.resources)
        }
      },
    })
  ]

  if (isDevMode) {
    plugins.push(new webpack.HotModuleReplacementPlugin())
  } else {
    // plugins.push(new BundleAnalyzerPlugin())
    plugins.push(new CleanWebpackPlugin())
  }

  const filename = isDevMode
    ? '[name].[hash].js'
    : '[name].[contenthash].js'

  return {
    entry: './src/js/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/',
      filename
    },
    devServer: {
      contentBase: './dist',
      hot: true,
      compress: true,
      historyApiFallback: true
    },
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    optimization: {
      minimizer: [
        new UglifyJsPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
        }),
      ],
      splitChunks: {
        cacheGroups: {
          commons: {
            test: /node_modules/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    },
    watchOptions: {
      ignored: /node_modules/,
      poll: 1000 // Check for changes every second
    },
    plugins,
    module: {
      rules: [
        // {
        //   enforce: 'pre',
        //   test: /\.(js|jsx)$/,
        //   loader: 'eslint-loader',
        //   exclude: [
        //     /(node_modules)/
        //   ],
        //   options: {
        //     emitWarning: isDevMode,
        //   },
        // },
        {
          test: /\.(js|jsx)$/,
          exclude: [
            /node_modules/,
            /\.test\.(js|jsx)/
          ],
          use: [
            'angular-router-loader',
            'babel-loader',
          ]
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: 'style-loader'
            },
            {
              loader: 'css-loader',
            }
          ]
        },
        {
          test: /\.svg$/,
          use: {
            loader: 'url-loader'
          }
        },
        {
          test: /\.html$/,
          exclude: [
            /views\//
          ],
          use: 'html-loader'
        }
      ]
    }
  }
}
