export default {
  title: 'LinkBoard',
  description: 'Official Documentation for LinkBoard',
  base: '/docs/',
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'GitHub', link: 'https://github.com/doltenterprise/doltenterprise-bookmarks' }
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
      copyright: 'Copyright © 2026 Dolt Enterprise'
    }
  },
  appearance: false
}
