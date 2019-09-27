

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Single popup menu for entities (downvote, comment, etc...)
 * Quietly used by CoreCtrl.
 * This script also contains other minor directives connected with the popping up
 */
angular.module('histograph')
  .directive('disableAutoClose', function () {
    // directive for disabling the default
    // close on 'click' behavior
    return {
      link(scope, element) {
        element.on('click', function ($event) {
          $event.stopPropagation();
        });
      }
    };
  })
  /*
    Jquery Popup. One popup in DOM to handle every damn entity
  */
  .directive('popit', function ($log, EntityFactory) {
    return {
      restrict: 'A',
      scope: {
        user: '=',
        target: '=',
        comment: '&comment',
        redirect: '&',
        queue: '&',
        filter: '&',
        inspect: '&'
      },
      templateUrl: 'templates/partials/helpers/popit.html',
      link(scope, element, attrs) {
        const _gasp = $(element[0]);
        // gasp instance;

        let _pId = -1;
        // previous id

        const __delay = 500;


        let __timeout = 0;

        /*
          Ignore by default every click that has been generated from the popit template
        */
        element.bind('click', function (e) {
          e.stopImmediatePropagation();
        })
        /*
          Show gasp instance, with Javascript event
        */
        function toggle(e) {
          const el = $(e.target);


          const type = el.attr('gasp-type');


          const id = el.attr('data-id');


          const pos = el.offset();


          let parent = el.attr('gasp-parent');
          // was there a prefious one?
          // if there is no type, it is like clicking on stage


          if (!type) {
            hide();
            return;
          }
          // debugger
          // if(scope.entity && scope.entity.id == id && (scope.parent && )) {
          //   showGasp(pos)
          //   return;
          // } else if(scope.entity){
          //   scope.entity = {
          //     props: {
          //       name: '...'
          //     },
          //     id: id,
          //     type: type
          //   };
          //   scope.$apply();
          // }

          $log.log(':: popit -> toggle() for type:', type, el)

          // validate id
          if (!id && isNaN(id)) {
            $log.error(':: popit -> toggle() html DOM item lacks "data-id" attribute or it is not a number, given id:', id);
            scope.isUnknown = true;
            scope.$apply();
            showGasp(pos)
            return;
          }

          scope.isUnknown = false;
          // if id is the same of previous Id, ndo not need to recalculate things
          if (id == _pId && !parent) {
            showGasp(pos);
            return;
          }

          $log.log(':: popit -> toggle() reload')

          scope.isReady = false;

          const tooltip = el.attr('gasp-tip');


          const removable = el.attr('gasp-removable');


          const creator = el.attr('gasp-creator');


          let upvotes = el.attr('gasp-upvotes');


          let downvotes = el.attr('gasp-downvotes');


          let entity;


          let resource;


          // rewrite upvotes
          upvotes = upvotes && upvotes.length ? angular.fromJson(upvotes) : [];
          downvotes = downvotes && downvotes.length ? angular.fromJson(downvotes) : [];

          // rewrite parent, if is present, as an object
          if (parent) {
            const parent_parts = parent.split('-');

            parent = {
              type: parent_parts.shift(),
              id: parent_parts.join('-')
            };

            if (!parent.id) {
              $log.error(':: popit -> toggle()  html DOM item lacks "gasp-parent" attribute');
              return;
            }
          }
          // set scope variables
          scope.tooltip = tooltip;
          scope.question = false;

          scope.entity = {
            type,
            id,
            props: {
              name: '...'
            },
          };


          scope.parent = !parent ? null : parent;


          scope.link = {
            label: `go to ${type} page`,
            href: `/e/${id}`,
            creator
          };
          if (removable === 'true') scope.link.removable = true;

          $log.log(':: popit -> -> toggle() is removable:', scope.link, removable === 'true')
          // apply scope
          scope.$apply();
          // set the id
          _pId = id;


          // show gasp item
          showGasp(pos);

          // load item
          EntityFactory.get({ id: scope.entity.id }, function (res) {
            $log.log(':: popit toggle() loaded: ', scope.entity.id);
            scope.entity = res.result.item;
            scope.entity.upvotes = upvotes;
            scope.entity.downvotes = downvotes;
            scope.entity.removable = removable;
            scope.isReady = true;
          });
        }

        /*
          Position the gasp and show it
        */
        function showGasp(pos) {
          clearTimeout(__timeout);
          // recalculate pos.top and pos.left according to _°_layout
          _gasp.css({
            top: Math.max(300, Math.min(__layout.height - 200, pos.top)),
            left: Math.max(0, Math.min(__layout.width - 400, pos.left))
          }).show();
        }

        /*
          Hide
        */
        function hide() {
          _gasp.hide();
        }

        scope.hide = hide;

        function hideDelayed() {
          __timeout = setTimeout(function () {
            hide();
          }, __delay);
        }


        // element.bind('mouseenter', toggle);
        // element.bind('mouseleave', hideDelayed);

        /*
          Enable parent scope action (do not require a proper '&' in scope)
        */
        scope.downvote = function ($event) {
          $log.log(':: gasp -> downvote()', scope.entity);
          $event.stopPropagation();
          scope.$parent.downvote(scope.entity, scope.parent, function (result) {
            scope.entity.upvotes = result.item.rel.upvote;
            scope.feedback();
          });
        }

        scope.upvote = function ($event) {
          $log.log(':: gasp -> upvote()', scope.entity);
          $event.stopPropagation();
          scope.$parent.upvote(scope.entity, scope.parent, function (result) {
            scope.entity.upvotes = result.item.rel.upvote;
            scope.feedback();
          });
        }

        scope.raiseIssueSelected = function (kind, solution) {
          if (kind == 'type') {
            if (solution != scope.entity.type) {
            // just discard IF IT IS NOT THE CASE
              scope.entity._type = solution;
              scope.question = 'wrongtype-confirm';
            }
          } else if (kind == 'irrelevant') {
            scope.question = 'irrelevant-confirm';
          }
        }

        scope.raiseIssue = function (kind, solution) {
          scope.$parent.raiseIssue(scope.entity, scope.parent, kind, solution, function (err, result) {
            scope.feedback();
          });
        }

        scope.queue = function () {
          $log.log(':: gasp -> queue()', scope.entity)
          scope.close();
          scope.$parent.queue(scope.entity.id, true);
        }

        scope.addFilter = function () {
          $log.log(':: gasp -> addFilter()', scope.entity)
          scope.$parent.addFilter('with', scope.entity.id);
        }

        scope.inspect = function () {
          $log.log(':: gasp -> inspect()', scope.entity)
          scope.close();
          scope.$parent.inspect(scope.entity.id);
        }

        scope.remove = function () {
          $log.log(':: gasp -> remove()', scope.entity);
          scope.$parent.discardvote(scope.entity, scope.parent);

          hide();
        }

        scope.merge = function () {
          $log.log(':: gasp -> merge()', scope.entity)
          // merge two entities: add (or upvote the entity) and downvote the current entity
          scope.$parent.mergeEntities(scope.entity, scope.entity.alias, scope.parent, function (err, result) {
            scope.feedback();
          });
        }

        scope.signale = function ($event) {
          $log.log(':: gasp -> signale()', scope.entity);
          scope.$parent.signale(scope.entity, scope.feedback);
        }

        scope.typeaheadSuggest = function (q, type) {
          return scope.$parent.typeaheadSuggest(q, type);
        }

        scope.typeaheadSelected = function ($item, $model, $label, $question) {
          $log.log(':: gasp -> typeaheadSelected()', arguments);
          if (!$item.id) return;
          scope.entity.alias = $item;
          scope.question = $question || 'contribute-confirm';
        }
        /*
          End of the story.
        */
        scope.close = function () {
          scope.question = false;
          hide();
        };

        scope.feedback = function () {
          scope.question = 'feedback'
        }
        /*

        */
        scope.askQuestion = function (question, $event) {
          scope.question = question;

          if ($event) $event.stopPropagation();
        }

        scope.cancelQuestion = function ($event) {
          scope.question = false;
          if ($event) $event.stopPropagation();
        }


        // get the very first window size
        let __layout;
        function calculateLayout() {
          __layout = {
            height: $(window).height(),
            width: $(window).width()
          };
        }
        calculateLayout();

        /* DOM liteners */
        $('body')
          .on('sigma.clickStage', hide)
          .on('click', toggle)
          .on('click', '.obscure', function (e) {
            e.stopImmediatePropagation();
          });
        $(window).on('resize', _.debounce(calculateLayout, 150));

        $log.log(':: gasp init & running, layout:', __layout);
      }
    }
  });
