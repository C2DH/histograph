const { get } = require('lodash')

const webappContextToApiContextLocation = {
  caption: 'caption',
  title: 'title',
  'full-text': 'content'
}

function getContextLocation(webAppContext) {
  if (webAppContext === undefined) return undefined
  const context = get(webappContextToApiContextLocation, webAppContext)
  if (context === undefined) throw new Error(`Unexpected context: ${webAppContext}`)
  return context
}

function rangesToContext(ranges = [], languageCode) {
  if (languageCode === undefined) throw new Error('Language is not defined')
  return {
    [languageCode]: ranges.map(({ startOffset, endOffset }) => [startOffset, endOffset])
  }
}

/**
 * @ngdoc function
 * @name histograph.controller:ContributeModalCtrl
 * @description
 * # ContributeModalCtrl
 * Modal controller that handle annotation related contribution.
 *
 */
angular.module('histograph')
  /*
    Contribute: add an (entity)-[]-(resource) relationship (sort of tagging)
    Template: cfr. templates/modals/inspect.html
    Resolve: it requires a (resource) object
  */
  .controller('ContributeModalCtrl', function ($scope, $log, $state, $uibModalInstance, type, resource, language, options, SuggestFactory, ActionsService) {
    // the list of suggested entities
    $scope.entities = [];

    $scope.type = type;
    $log.debug('ContributeModalCtrl -> ready()', resource.id, options);

    // initial value for typeahead
    if (options && options.query) {
      $scope.autotypeahead = options.query
      $scope.q = options.query;
    }

    $scope.createEntity = function () {
      // pu it invisible...
      $scope.isDisabled = true;
      options.createEntity(resource, 'person', _.assign({}, options, {
        query: $scope.query,
        language: options.language,

        dismiss() {
          $scope.cancel();
        },
        submit(entity) {
          // add the current saved entity
          $scope.entities = [entity];
          $scope.ok()
        }
      }));
    }
    $scope.ok = () => {
      const { entities } = $scope
      if (entities.length > 1) {
        return $log.warn('Cannot create more than one entity')
      }
      const entity = entities[0]
      // const ranges = get(options, 'annotator.editor.annotation.ranges', get(options, 'ranges', []))
      // const context = get(options, 'context')
      // const languageCode = get(options, 'language', language)

      return ActionsService.linkEntity(
        entity.id,
        resource.uuid || resource.id,
        // TODO [RK]: the ranges of selection are not relative to the 
        // text (title, caption, content).
        // Instead they are relative to the HTML element where the selection happened. I have not
        // found out how to convert one into another. There might be a hint in
        // https://github.com/openannotation/annotator/tree/v1.2.0 - the version we are using.
        // For the moment we do not add context.
        //
        // ranges.length > 0 ? rangesToContext(ranges, languageCode) : undefined,
        // getContextLocation(context)
      ).then(result => {
        const msg = result.performed
          ? 'Entity has been added'
          : 'Merge is waiting for votes';
        $log.info(msg);
        $uibModalInstance.close();
        $state.reload()
      }).catch(e => { $log.error(e.message); })
    }

    $scope.cancel = function () {
      $log.log('ContributeModalCtrl -> cancel()', 'dismissing...');
      $uibModalInstance.dismiss('cancel');
    };

    /*
      typeahead get suggestions function
    */
    $scope.typeaheadSuggest = function (q) {
      $log.log('ContributeModalCtrl -> typeahead()', q, type);
      // suggest only stuff from 2 chars on
      if (q.trim().length < 2) {
        $scope.query = '';
        return undefined;
      }

      $scope.query = q.trim();

      return SuggestFactory.get({
        m: type,
        query: q,
        limit: 10,
        language: $scope.language
      }).$promise.then(function (res) {
        if (res.status !== 'ok') { return []; }
        return res.result.items
      })
    }

    $scope.typeaheadSelected = function ($item) {
      $scope.entities.push($item);
      $log.log('ContributeModalCtrl -> typeaheadSelected()', $item);
    }
  });
