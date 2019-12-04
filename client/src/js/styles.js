import jss from 'jss'
import preset from 'jss-preset-default'


export function setUpStyles() {
  jss.setup(preset())
}

export function withStyles(angularScope, styles) {
  const stylesheet = jss.createStyleSheet(styles).attach()
  // eslint-disable-next-line no-param-reassign
  angularScope._stylesheet = stylesheet
  // eslint-disable-next-line no-param-reassign
  angularScope.classes = stylesheet.classes
  angularScope.$on('$destroy', () => {
    angularScope._stylesheet.detach()
  })
}

export const theme = {
  units: (x) => `${x}em`,
  colours: {
    background: {
      dark: {
        primary: '#383838'
      },
      light: {
        secondary: '#f0f0f0'
      }
    },
    text: {
      light: {
        primary: '#f0f0f0',
        secondary: '#A9A2A2'
      }
    },
    action: {
      error: '#FF5742',
      warn: '#b3b02d',
      info: '#8b76f3',
    }
  },
  text: {
    h3: {
      fontSize: '1.2em'
    },
    h2: {
      fontSize: '1.3em'
    },
  }
}
