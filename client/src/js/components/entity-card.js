import { get } from 'lodash'
import moment from 'moment'
import { withStyles, theme } from '../styles'
import { valueForLanguage } from '../utils'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    color: theme.colours.text.light.primary,
    width: '100%'
  },
  headerRow: {
    display: 'flex',
    flexDirection: 'row'
  },
  thumbnail: {
    border: '3px solid #4dc3ba',
    backgroundSize: 'cover',
    backgroundColor: 'black',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    marginRight: theme.units(1)
  },
  thumbnailSizeRegular: {
    height: theme.units(6),
    width: theme.units(6),
    minHeight: theme.units(6),
    minWidth: theme.units(6),
    borderRadius: theme.units(3)
  },
  thumbnailSizeSmall: {
    height: theme.units(3),
    width: theme.units(3),
    minHeight: theme.units(3),
    minWidth: theme.units(3),
    borderRadius: theme.units(3)
  },
  title: {
    borderBottom: '1px solid #A9A2A2',
    '& a': {
      color: theme.colours.text.light.primary,
      transition: 'color .3s cubic-bezier(0.65, 0.05, 0.36, 1)',
      '&:hover': {
        color: '#fff'
      }
    },
    '& h3': {
      borderBottom: 'none !important',
      margin: 0,
      paddingBottom: '0px',
      textAlign: 'left'
    }
  },
  titleSizeSmall: {
    '& h3': {
      fontWeight: 'bold',
      fontSize: 'inherit',
    }
  },
  titleSizeRegular: {
    paddingBottom: `${theme.units(0.5)} !important`,
    '& h3': {
      fontWeight: 'normal',
      fontSize: '15px',
      lineHeight: '24px',
    }
  },
  subtitle: {
    display: 'flex',
    justifyContent: 'space-between',
    '& h4': {
      color: theme.colours.text.light.secondary,
      padding: 0,
      margin: 0
    }
  },
  subtitleSizeSmall: {
    '& h4': {
      fontSize: '11px'
    }
  },
  subtitleSizeRegular: {
    paddingTop: `${theme.units(0.5)} !important`,
  },
  containerTitle: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%'
  },
  description: {
    color: theme.colours.text.light.secondary,
    marginTop: theme.units(1),
    '& p': {
      textAlign: 'left'
    }
  },
  footerRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  ambiguousTag: {
    display: 'flex',
    '& .fa': {
      marginRight: theme.units(0.25),
      fontSize: '11px'
    },
    fontSize: '11px',
    color: theme.colours.text.light.secondary
  }
}

const template = /* html */ `
<div class="{{classes.container}}">
  
  <div class="{{classes.headerRow}}">
    <div class="{{classes.thumbnail}} {{classes.thumbnailSizeClass}}"
         style='background-image: url("{{thumbnailUrl}}")'>
    </div>
    <div class="{{classes.containerTitle}}">
      <div class="{{classes.title}}  {{classes.titleSizeClass}}">
        <a href="{{link}}" ng-if="link">
          <h3>{{title}}</h3>
        </a>
        <h3 ng-if="!link">{{title}}</h3>
      </div>
      <div class="{{classes.subtitle}} {{classes.subtitleSizeClass}}">
        <h4>{{subtitle}}</h4>
      </div>
    </div>
  </div>

  <div class="{{classes.description}}">
    <p>{{description || 'description not available'}}</p>
  </div>

  <div class="{{classes.links}}">
    <a ng-repeat="link in meta.externalLinks"
       href={{link.url}}
       target="about:blank">
       {{link.label}}
    </a>
  </div>
  
  <div ng-if="meta.isAmbiguousMatch" class="{{classes.footerRow}}">
    <div class="{{classes.ambiguousTag}}">
      <i class="fa fa-exclamation-triangle"></i> Not disambiguated metadata
    </div>
  </div>
</div>
`

const DefaultThumbnails = {
  person: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-170 -190 788 972'%3E%3Cpath fill='%23A9A2A2' d='M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z'%3E%3C/path%3E%3C/svg%3E",
  location: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-120 -180 788 972'%3E%3Cpath fill='%23A9A2A2' d='M288 0c-69.59 0-126 56.41-126 126 0 56.26 82.35 158.8 113.9 196.02 6.39 7.54 17.82 7.54 24.2 0C331.65 284.8 414 182.26 414 126 414 56.41 357.59 0 288 0zm0 168c-23.2 0-42-18.8-42-42s18.8-42 42-42 42 18.8 42 42-18.8 42-42 42zM20.12 215.95A32.006 32.006 0 0 0 0 245.66v250.32c0 11.32 11.43 19.06 21.94 14.86L160 448V214.92c-8.84-15.98-16.07-31.54-21.25-46.42L20.12 215.95zM288 359.67c-14.07 0-27.38-6.18-36.51-16.96-19.66-23.2-40.57-49.62-59.49-76.72v182l192 64V266c-18.92 27.09-39.82 53.52-59.49 76.72-9.13 10.77-22.44 16.95-36.51 16.95zm266.06-198.51L416 224v288l139.88-55.95A31.996 31.996 0 0 0 576 426.34V176.02c0-11.32-11.43-19.06-21.94-14.86z' %3E%3C/path%3E%3C/svg%3E",
  organization: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-180 -210 788 972'%3E%3Cpath fill='%23A9A2A2' d='M436 480h-20V24c0-13.255-10.745-24-24-24H56C42.745 0 32 10.745 32 24v456H12c-6.627 0-12 5.373-12 12v20h448v-20c0-6.627-5.373-12-12-12zM128 76c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v40c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12V76zm0 96c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v40c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40zm52 148h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v40c0 6.627-5.373 12-12 12zm76 160h-64v-84c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v84zm64-172c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v40zm0-96c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12v-40c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v40zm0-96c0 6.627-5.373 12-12 12h-40c-6.627 0-12-5.373-12-12V76c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v40z'%3E%3C/path%3E%3C/svg%3E"
}

const getDateAndLocation = (birthOrDeath, languageCode) => {
  const date = get(birthOrDeath, 'date')
  const year = date ? String(moment.utc(date).get('year')) : undefined
  const place = valueForLanguage(get(birthOrDeath, 'place.label'), languageCode)
  if (year && place) return `${year}, ${place}`
  if (year && !place) return `${year}, ?`
  return undefined
}

const getBirthAndDeath = (meta, languageCode) => {
  const birth = getDateAndLocation(get(meta, 'birth'), languageCode)
  const death = getDateAndLocation(get(meta, 'death'), languageCode)
  if (birth && death) return `${birth} - ${death}`
  if (birth && !death) return `${birth} - ...`
  if (!birth && death) return `? - ${death}`
  return '? - ...'
}

const getLocation = (meta, languageCode) => {
  return valueForLanguage(get(meta, 'country.label'), languageCode)
}

const getSubtitle = (type, meta, languageCode) => {
  switch (type) {
    case 'person':
      return getBirthAndDeath(meta, languageCode)
    case 'location':
      return getLocation(meta, languageCode)
    default:
      return ''
  }
}

function controller($scope, $log, EntityService) {
  $scope.$watch('entity', entity => {
    $scope.title = get(entity, 'name', '')
    const id = get(entity, 'id')

    if (id) {
      EntityService.getMeta({ id }).$promise
        .then(meta => {
          $scope.meta = meta
        })
        .catch(() => {
          $log.error('Could not load metadata for this entity')
        })
    }
  }, true)
  $scope.$watch('entityType', type => {
    if (!get($scope.meta, 'thumbnailUrl')) {
      $scope.thumbnailUrl = DefaultThumbnails[type]
    }
  })

  $scope.$watch('meta', meta => {
    $scope.thumbnailUrl = get(meta, 'thumbnailUrl', DefaultThumbnails[$scope.entityType])
    $scope.description = valueForLanguage(get(meta, 'description'), $scope.languageCode)
    $scope.subtitle = getSubtitle($scope.entityType, meta, $scope.languageCode)
  }, true)

  $scope.$watch('language', language => {
    $scope.languageCode = language || 'en'
  })
}

const directive = {
  restrict: 'E',
  template,
  controller: 'HiEntityCardCtrl',
  link($scope) {
    withStyles($scope, styles)
    $scope.classes.thumbnailSizeClass = $scope.size === 'small'
      ? $scope.classes.thumbnailSizeSmall
      : $scope.classes.thumbnailSizeRegular
    $scope.classes.titleSizeClass = $scope.size === 'small'
      ? $scope.classes.titleSizeSmall
      : $scope.classes.titleSizeRegular
    $scope.classes.subtitleSizeClass = $scope.size === 'small'
      ? $scope.classes.subtitleSizeSmall
      : $scope.classes.subtitleSizeRegular
  },
  scope: {
    entity: '=',
    entityType: '@',
    link: '@',
    size: '@', // 'small' or 'regular'
  }
}

angular.module('histograph')
  .directive('hiEntityCard', () => directive)
  .controller('HiEntityCardCtrl', controller)
