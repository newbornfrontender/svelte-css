module.exports = ({ production }) => ({
  plugins: {
    'postcss-use': true,
    'postcss-preset-env': {
      autoprefixer: production,
    },
  },
});
