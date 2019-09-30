/* eslint-env browser */
/* globals angular, _ */
const {
  assignIn, omitBy, isUndefined,
  isEmpty, get, isArray
} = require('lodash')

/**
 * [RK] NOTE a filter guard used to remove query search filter parameters when moving from
 * a view with the parameter supported to a view with parameter not supported.
 * This is a temporary measure until the filters bar is refactored for real.
 */
function filterGuard(scope, $location, queryParameterName, grammarName) {
  const isNotDefinedInGrammar = isUndefined(get(scope.grammar, grammarName))
  const isPresentInFilters = !isUndefined(get(scope.filters, queryParameterName))

  if (isNotDefinedInGrammar && isPresentInFilters) {
    setTimeout(() => {
      $location.search(queryParameterName, null).replace()
    })
    delete scope.filters[queryParameterName]
    delete scope.filterItems[queryParameterName]
  }
}

/**
 * @ngdoc function
 * @name histograph.controller:FiltersCtrl
 * @description
 * # FiltersCtrl
 * Intermediate controller (below CoreCtrl, but above views controllers) for filtering purposes
 * it was written in order to simplify CoreCtrl debugging
 */
angular.module('histograph')
  // eslint-disable-next-line prefer-arrow-callback
  .controller('FiltersCtrl', function controller($scope, $log, $http, $location, $stateParams, SuggestFactory, EVENTS) {
    $log.debug('FiltersCtrl ready, filters active:', $location.search());

    $scope.filters = {};
    $scope.filterItems = {};
    $scope.facets = {}; // available facets, per filter key
    $scope.qs = ''; // the location.search() object as querystring

    $scope.____q = '';
    /*
      e.g.
      setFacets('type', [
        {
          name:'picture', count: 12
        },
        {
          name:'picture', count: 12
        }
      ])
    */
    $scope.setFacets = function (key, values) {
      $scope.facets[key] = values;
    }

    $scope.asArray = item => (isArray(item) ? item : [item])


    /*
      Filters function for templates
    */
    $scope.removeFilter = function (key, value) {
      $log.log('FiltersCtrl -> removeFilter() - key:', key, '- value:', value)
      const item = isArray($scope.filters[key]) ? $scope.filters[key] : [$scope.filters[key]]
      const aliveFilters = _.filter(angular.copy(item), function (d) {
        return value && (d !== value)
      })

      if (key === 'with') {
        const index = _.map($scope.filterItems.with, 'id').indexOf(value);
        $scope.filterItems.with.splice(index, 1);
      }


      if (aliveFilters.length === 0) $location.search(key, null);
      else $location.search(key, aliveFilters.join(','));
    }

    $scope.addFilterFromTypeahead = function ($item, $model, $label) {
      $scope.addFilter('with', $item.id);
    }

    /*
      Add filter and take care of putting the right args in location.search object.
    */
    $scope.addFilter = function (key, value) {
      // force string
      if (!value) return;

      // eslint-disable-next-line no-param-reassign
      value = `${value}`;
      if (!$scope.filters[key]) $location.search(key, value);
      else {
        $log.log('FiltersCtrl -> addFilter() - key:', key, '- value:', value)

        const item = isArray($scope.filters[key]) ? $scope.filters[key] : [$scope.filters[key]]
        let list = _.compact(_.map(angular.copy(item), _.trim));

        (`${value}`).split(',').forEach(function () {
          if (list.indexOf(value) === -1) list.push(value);
        })
        // cleanup duplicates
        list = _.uniq(list);

        if (list.length) $location.search(key, list.join(','));
      }
      $scope.loadFiltersItems()
    }

    $scope.setFilter = function (key, value) {
      $location.search(key, value);
    }


    /*
      For some field, load complex items (e.g; location, persons etc..);
      Ids can be resoruce or other.
    */
    $scope.loadFiltersItems = function () {
      // collect ids
      if (!$scope.filters.with) {
        $scope.filterItems.with = [];
      } else {
        _.each(angular.copy($scope.filters), function (d, key) {
          if (key === 'with') {
            SuggestFactory.getUnknownNodes({
              ids: d
            }, function (res) {
              $scope.filterItems[key] = res.result.items;
            })
          }
        });
      }
    };

    /*
      Filling filters and transform them
    */
    $scope.loadFilters = function () {
      const candidates = $location.search();


      const filters = {};


      const qs = [];
      // handle 'type' and mimetype (pseudo-array)
      for (const i in candidates) {
        const list = _.uniq(_.compact(_.map((`${candidates[i]}`).split(','), _.trim)));
        filters[i] = list.length === 1 ? list[0] : list;
        qs.push(`${encodeURIComponent(i)}=${encodeURIComponent(candidates[i])}`);
      }
      // set query for search ctrl
      if (filters.query) $scope.query = filters.query.join('');
      $log.debug('FiltersCtrl -> loadFilters()', filters);
      $scope.filters = filters;
      $scope.isFiltered = !_.isEmpty($scope.filters);
      $scope.qs = qs.join('&');
      $scope.loadFiltersItems();
    }

    /*
      typeahead, with filters.
    */
    $scope.typeaheadSuggest = function (q, type) {
      $log.log('FiltersCtrl -> typeahead()', q, type);
      // suggest only stuff from 2 chars on
      if (q.trim().length < 2) return;

      return SuggestFactory.get({
        m: type,
        query: q,
        limit: 10
      }).$promise.then(function (res) {
        if (res.status != 'ok') return [];
        return [{ type: 'default' }].concat(res.result.items)
      })
    }
    /*
      The combinatio of choices.
      load facets?
    */
    $scope.grammar;

    /*
      Set a choiche from the choices provided by the ruler
      (i.e. the root grammar)
    */
    $scope.setChoice = function (choice) {
      const path = $scope.getState().href(choice.name, choice.params)
      $log.log('FilterCtrl -> setChoice', choice.name, '- path:', path);
      $location.path(path).search($location.search())
    }

    // set from the currentState


    $scope.setType = function (subject, type) {
      subject.type = type;
      if (type.filter) $scope.addFilter(type.filter.split('=')[0], type.filter.split('=')[1])
      else $scope.removeFilter('type')
    }

    $scope.$on('$locationChangeSuccess', $scope.loadFilters);

    /*
      Watch for currentState changes in ui.router.
      Cfr StateChangeSuccess listener in core.js
    */
    $scope.$watch('currentState', function (state) {
      if (!state) return;
      $log.log('FiltersCtrl @currentState', state, '- params:', $stateParams);
      const $state = $scope.getState();


      const parentState = $state.get(state.name.split('.')[0]);

      // set (or unset) search query if any
      $scope.query = $state.params.query;
      $scope.stateParams = $stateParams;


      // ruler is the parentstate grammar
      if (parentState && parentState.abstract) {
        $scope.ruler = parentState.grammar;
      }

      if (state.grammar) $scope.grammar = state.grammar

      filterGuard($scope, $location, 'keywords', 'connector.keywords')
      filterGuard($scope, $location, 'with', 'connector.relatedTo')
      filterGuard($scope, $location, 'tst', 'connector.topicScoreThreshold')
    })

    const singleValueAsList = v => (isArray(v) ? v : [v])

    $scope.$watch('filters.keywords', (keywords, oldKeywords) => {
      if (isEmpty(keywords) && isEmpty(oldKeywords)) return
      const kw = !isEmpty(keywords) ? singleValueAsList(keywords).map(encodeURIComponent).join(',') : undefined
      const searchParams = omitBy(assignIn({}, $location.search(), { keywords: kw }), isUndefined)
      $location.search(searchParams)
    }, true)

    $scope.$watch('filters.tst', (val, oldVal) => {
      if (isUndefined(val) && isUndefined(oldVal)) return
      const tst = val === 0 ? undefined : val
      const searchParams = omitBy(assignIn({}, $location.search(), { tst }), isUndefined)
      $location.search(searchParams)
    })
  })
