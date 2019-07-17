const path = require('path')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebPackPlugin = require('html-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

module.exports = (env, options) => {
  const isDevMode = options.mode !== 'production'
  const settingsFileLocation = isDevMode
    ? './src/settings.dev.js'
    : './src/settings.prod.js'

  const plugins = [
    new CopyWebpackPlugin([
      { from: './src/fonts', to: 'fonts' },
      { from: './src/images', to: 'images' },
      { from: './src/locale', to: 'locale' },
      // { from: './src/css', to: 'css' },
      { from: settingsFileLocation, to: 'settings.js' },
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
        LOGLEVEL: JSON.stringify(isDevMode ? 'DEBUG' : 'INFO'),
      }
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: isDevMode ? '[name].css' : '[name].[hash].css',
      chunkFilename: isDevMode ? '[id].css' : '[id].[hash].css',
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
    devtool: isDevMode ? 'inline-source-map' : 'source-map',
    devServer: {
      contentBase: './dist',
      hot: true,
      compress: true,
      historyApiFallback: true,
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
      ignored: [
        /node_modules/,
        /src\/js\/lib/
      ],
      aggregateTimeout: 300,
      poll: 1500
    },
    plugins,
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.(js|jsx)$/,
          loader: 'eslint-loader',
          exclude: [
            /(node_modules)/
          ],
          options: {
            // emitWarning: isDevMode,
            // there are too many linter errors in the old code.
            // until they are fixed all errors are treated as warnings
            emitWarning: true
          },
        },
        {
          test: /sigma.*\.js$/,
          use: 'imports-loader?this=>window',
        },
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
              loader: MiniCssExtractPlugin.loader,
              options: {
                hmr: isDevMode,
              },
            },
            'css-loader',
          ],
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
        },
        {
          test: /\.(gif|jpg|png)$/,
          loader: 'file-loader',
        }
      ]
    }
  }
}
