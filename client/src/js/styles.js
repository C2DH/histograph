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
