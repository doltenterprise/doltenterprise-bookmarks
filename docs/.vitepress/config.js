export default {
  title: 'LinkBoard',
  description: 'Official Documentation for LinkBoard',
  base: '/linkboard/docs/',
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'GitHub', link: 'https://github.com/# TODO: replace with your GitHub username/linkboard' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'Deployment', link: '/deployment' },
          { text: 'Single Executable (SEA)', link: '/sea' }
        ]
      }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present'
    }
  },
  appearance: 'dark'
}
