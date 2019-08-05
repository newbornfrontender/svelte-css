module.exports = ({ production }) => ({
  plugins: {
    'postcss-use': true,
    'postcss-import': {
      root: './src'
    },
    'postcss-preset-env': {
      autoprefixer: production,
    },
  },
});
