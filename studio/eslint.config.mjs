import studio from '@sanity/eslint-config-studio'

export default [
  ...studio,
  {
    settings: {
      react: {
        version: '19',
      },
    },
  },
]
