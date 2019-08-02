import resolve from 'rollup-plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import babel from 'rollup-plugin-babel';
import postcss from 'postcss';
import postcssrc from 'postcss-load-config';
import syntax from 'postcss-syntax';
import env from 'postcss-preset-env';
import { promises as fs } from 'fs';
import { sync as rimraf } from 'rimraf';
import { createFilter } from 'rollup-pluginutils';

const paths = {
  from: 'src',
  to: 'public',
};
const production = !process.env.ROLLUP_WATCH;

rimraf(paths.to);

export default {
  input: `${paths.from}/main.js`,
  output: {
    format: 'esm',
    dir: paths.to,
    sourcemap: true,
    preferConst: true,
  },
  plugins: [
    resolve({
      browser: true,
      modulesOnly: true,
    }),
    svelte({
      exclude: '**/*.html',
      dev: !production,
      preprocess: {
        async style({ content, filename }) {
          const { css } = await postcss([
            env({
              stage: false,
              autoprefixer: false,
              features: {},
            }),
          ]).process(content, { from: filename });

          return {
            code: css,
          };
        },
      },
      async css(source) {
        const { code } = source;
        const { plugins, options } = await postcssrc({ production });
        const { css } = await postcss(plugins).process(code, { ...options, from: undefined });

        source.code = css;
        source.write(`${paths.to}/bundle.css`);
      },
    }),
    css({
      targets: [
        {
          from: `${paths.from}/index.html`,
          to: `${paths.to}/index.html`,
        },
      ],
      ctx: {
        production,
        map: {
          inline: false,
        },
      },
    }),
    babel({
      extensions: ['.svelte', '.js'],
    }),
  ],
  watch: {
    clearScreen: false,
  },
  treeshake: production,
};

function css(options = {}) {
  let { include, exclude, targets = [], ctx = {} } = options;

  if (!include) include = '**/*.{html,css}';

  const filter = createFilter(include, exclude);

  async function isDirExists(dir) {
    let status;

    await fs
      .access(dir)
      .then(() => (status = true))
      .catch(() => (status = false));

    return status;
  }

  async function createDir(dir) {
    await fs.mkdir(dir).catch((err) => console.log(err));
  }

  async function writeFile(file, code) {
    await fs.writeFile(file, code).catch((err) => console.log(err));
  }

  return {
    name: 'css',

    async transform(code, id) {
      if (!filter(id)) return;

      const file = {
        getName() {
          return id
            .split('\\')
            .pop()
            .split('.')
            .shift();
        },
        getExt() {
          return id.split('.').pop();
        },
      };

      const { plugins, options } = await postcssrc(ctx);
      let { css, map } = await postcss(plugins).process(code, {
        ...options,
        syntax: syntax,
        from: id,
        map: {
          inline: ctx.map.inline,
          annotation: `${file.getName()}.css.map`,
        },
      });

      if (await isDirExists(paths.to)) {
        await generate();
      } else {
        await createDir(paths.to);
        await generate();
      }

      async function generate() {
        if (ctx.map && !ctx.map.inline && file.getExt() === 'css') {
          await fs.writeFile(`${paths.to}/${file.getName()}.css.map`, map.toString());
        }

        await writeFile(`${paths.to}/${file.getName()}.${file.getExt()}`, css);
      }

      return {
        code: '',
        map: null,
      };
    },

    async buildEnd() {
      if (targets) {
        for (const { from, to } of targets) {
          if (from && to) {
            const code = await fs.readFile(from).catch((err) => console.log(err));

            const { plugins, options } = await postcssrc(ctx);
            const { css } = await postcss(plugins).process(code, {
              ...options,
              syntax: syntax,
              from,
              to,
            });

            if (await isDirExists(paths.to)) {
              await writeFile(to, css);
            } else {
              await createDir(paths.to);
              await writeFile(to, css);
            }
          }
        }
      }
    },
  };
}
