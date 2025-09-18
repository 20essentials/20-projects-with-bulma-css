// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  build: {
    assets: 'static'
  },

  //Localhost
  // site: 'http://localhost:4321/'

  //Deploy normal project
  base: '/20-projects-with-bulma-css/',
  site: 'https://20essentials.github.io/20-projects-with-bulma-css/'
});
