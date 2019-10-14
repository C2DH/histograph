
import { get, find, first } from 'lodash'
import marked from 'marked'

angular.module('histograph')
  /*
    usage
    <span lookup language="<$scope.language>language" context="<$scope.item>item"></span>
  */
  .directive('lookup', function () {
    return {
      restrict: 'A',
      scope: {
        context: '=',
        language: '='
      },
      template: '<span marked="text" context="context"></span>',
      link(scope, element, attrs) {
        const fallbackLanguage = 'en'

        scope.$watch('language', language => {
          // eslint-disable-next-line no-param-reassign
          if (language === undefined) language = fallbackLanguage

          // look for annotations
          if (scope.context.annotations && scope.context.annotations.length) {
            // get the correct annotation based on field and language
            let annotation = get(find(scope.context.annotations, {
              language
            }), 'annotation');

            if (!annotation) {
              annotation = get(first(scope.context.annotations), 'annotation');
            }
            // annotation has to be there, otherwise an exception is thrown
            scope.text = annotation[attrs.field];
            return
          }

          // paths of the old resource representation (`props`) and new (no `props`, top level)
          const paths = [
            `${attrs.field}.${language}`,
            `props.${attrs.field}_${language}`,
            `${attrs.field}.${fallbackLanguage}`,
            `props.${attrs.field}_${fallbackLanguage}`,
          ]
          const content = paths.reduce((c, path) => {
            if (c !== undefined) return c
            return get(scope.context, path)
          }, undefined)
          if (content !== undefined) scope.text = content
        });
      }
    }
  })
  /*
    Basic wrapper for ui-codemirror providing it with special hints, thanks to github.com/amarnus cfr.
    https://github.com/amarnus/ng-codemirror-dictionary-hint/blob/master/lib/ng-codemirror-dictionary-hint.js
  */
  .directive('mirror', function ($compile, $log) {
    return {
      restrict: 'A',
      priority: 2,
      compile: function compile() {
        return function postLink(scope, iElement, iAttrs) {
          const dictionary = [];

          // console.log(iAttrs);

          CodeMirror.registerHelper('hint', 'localHint', function (mirror, options) {
            CodeMirror.commands.autocomplete(mirror, function (editor, callback, options) {
              const cur = editor.getCursor();


              const curLine = editor.getLine(cur.line);


              let start = cur.ch;


              const end = start;


              const word = '';


              let tag = '';

              // get last \w combination till last previous #
              while (start && /[#@\w-_$]+/.test(curLine.charAt(start - 1))) --start;

              tag = curLine.charAt(start);
              //
              if (tag == '@') {
                // load user list
                callback({
                  list: ['@daniele', '@davide'],
                  from: CodeMirror.Pos(cur.line, start),
                  to: CodeMirror.Pos(cur.line, end)
                })
              } else if (tag == '#') {
                console.log(curLine.slice(start, end))

                // looking for a type, if there is a ':' sign for a person
                setTimeout(function () {
                  callback({
                    list: [
                      {
                        text: '#person'
                      },
                      {
                        text: '#place'
                      },
                      ''
                    ],
                    from: CodeMirror.Pos(cur.line, start),
                    to: CodeMirror.Pos(cur.line, end)
                  })
                }, 100);
              } else {
                callback({
                  list: [],
                  from: CodeMirror.Pos(cur.line, start),
                  to: CodeMirror.Pos(cur.line, end)
                })
              }
            }, {
              async: true
            })
          });
          // The ui-codemirror directive allows us to receive a reference to the Codemirror instance on demand.
          scope.$broadcast('CodeMirror', function (cm) {
            cm.on('change', function (instance, change) {
              if (change.origin !== 'complete') {
                // console.log('Mirror, mirror', change)
                instance.showHint({ hint: CodeMirror.hint.localHint, completeSingle: false });
              }
            });
          });
        }
      }
    }
  })

  .directive('marked', function ($compile, $log) {
    return {
      restrict: 'A',
      scope: {
        marked: '=',
        context: '='
      },
      link(scope, element, attrs) {
        let entities = [];


        const renderer = new marked.Renderer();


        // chenge how marked interpred link for this special directive only
        renderer.link = function (href, title, text) {
          const localEntitiesIds = href.split(',');


          let localEntities = [];

          localEntities = entities.filter(function (d) {
            return localEntitiesIds.indexOf(`${d.entity.uuid}`) !== -1;
          })

          // it has been abandoned... sad
          if (!localEntities.length) {
            return text
          }
          // rewrite localentities better.
          return `<a  gasp-type="${
            localEntities.map(function (d) {
              return d.type
            }).join(',')}" data-id="${href.split(',').pop()}"  gasp-parent="resource-${
            scope.context.id}">${text}</a>`;
        };


        scope.$watch('marked', function (val) {
          if (!val) return;

          // organise(merge) entitites
          // $log.log('::marked @marked changed', val);
          if (scope.context && scope.context.locations && scope.context.persons) {
            entities = scope.context.locations.concat(scope.context.persons)// , scope.context.organizations, scope.context.social_groups)
            element.html(marked(scope.marked, {
              renderer
            }));
          } else {
            element.html(marked(scope.marked));
          }
          // enable annotations


          //

          // }
          // console.log(attrs)
          // apply tooltip
          $compile(element.contents())(scope);
        });

        // add annotation capabilities on marked elements
      }
    }
  })

  .directive('typeaheadTriggerOnModelChange', function ($timeout) {
    return {
      require: 'ngModel',
      link(scope, element, attr, ctrl) {
        scope.$watch(attr.typeaheadTriggerOnModelChange, function (v) {
          if (!v) // and v !=some previous value
          { return; }
          console.log('::typeaheadTriggerOnModelChange @', attr.typeaheadTriggerOnModelChange, v);
          ctrl.$setViewValue('');
          $timeout(function () {
            ctrl.$setViewValue(v);
          });
        });
      }
    }
  })

  /*

  */
  .directive('annotator', function ($log, $timeout) {
    return {
      restrict: 'E',
      scope: {
        language: '=',
        notes: '=',
        item: '='
      },
      link(scope, element, attrs) {
        $log.log('::annotator for:', attrs.context, '- language:', scope.language);


        const annotator = angular.element(element).annotator().data('annotator');


        let _timer;


        const ctx = `${attrs.context}`;


        annotator.addPlugin('Unsupported');
        annotator.addPlugin('HelloWorld', {
          context: attrs.context,
          annotationEditorShown(annotation, annotator) {
            scope.$parent.contribute(scope.item, 'entity', {
              context: attrs.context,
              language: scope.language,
              query: annotation.quote,
              annotator,
              submit(annotator, result) {
                annotator.editor.submit();
              },
              discard(annotator) {
                annotator.editor.hide();
              }
            });
            scope.$apply();
          }
        });
        annotator.publish('resize')

        scope.$watch('notes', function (notes) {
          console.log('::annotator > sync()', ctx, scope.language, (notes && notes.length && scope.language ? 'go on' : 'stop'))
          // ask for
          if (notes && notes.length && scope.language) scope.sync();
        }, true);

        scope.$watch('language', function (language) {
          // ask for
          console.log('::annotator > sync()', ctx, scope.language, (!!scope.notes && scope.language ? 'go on' : 'stop'))

          if (scope.notes && scope.notes.length && language) scope.sync();
        });


        scope.sync = function () {
          console.log('::annotator > sync()', ctx, '- annotation load: ', typeof scope.$parent.loadAnnotations === 'function')

          if (!scope.$parent.loadAnnotations) {
            return;
          }

          if (_timer) $timeout.cancel(_timer);
          _timer = $timeout(function () {
            scope.$parent.loadAnnotations({
              context: ctx,
              language: scope.language
            }, function (annotations) {
              console.log('::annotator', ctx, 'annotation to load: ', annotations)
              // horrible
              $(annotator.element.find('[data-annotation-id]'))
                .each(function () {
                  debugger
                  annotator.deleteAnnotation($(this).data().annotation)
                })
              // remove annotations
              annotator.loadAnnotations(annotations);
            });
          }, 10);
        }
        // lazyload annotation for this specific  element
      }
    }
  });

Annotator.Plugin.HelloWorld = function (element, options) {
  return {
    pluginInit() {
      let editor;


      const annotator = this.annotator;


      let link;
      console.log('::annotator instanciate plugin', options.context);

      this.annotator.viewer.addField({
        load(field, annotation) {
          console.log(annotation);

          field.innerHTML = annotation.mentions.map(function (d) {
            console.log(d)
            field.className = 'custom';
            let html = '';

            html = `${''
              + '<div class="sans-serif '}${d.type}" style="padding: 10px 20px; font-size:13px; color: white; border: 0px solid transparent; font-style: normal ">`

              + `<span data-id="${d.props.uuid}"`
              + ` gasp-removable="false" gasp-upvotes='${JSON.stringify(d.props.upvote || [])}'`
              + ` gasp-downvotes='${JSON.stringify(d.props.downvote || [])}'`
              + ` gasp-creator="" gasp-type="${d.type}"  class="tag ${d.type}">${
                d.props.name}`
            '</span></div>';

            // console.log(html)
            // if(d.type == 'person')
            //   html = '' +
            //   '<div class="node '+ d.type + '">' +
            //     '<div class="thumbnail"><div class="thumbnail-wrapper" style="background-image: url(' + d.props.thumbnail + ')"></div></div>' +
            //     '<div class="content tk-proxima-nova"><h4><a class="tk-proxima-nova">' + d.props.name + '</a></h4> ' + d.props.description + '</div>' +
            //   '</div>';

            //  if(d.type == 'location')
            //   html = '' +
            //   '<div class="node '+ d.type + '">' +
            //     '<div class="content tk-proxima-nova"><h4><a class="tk-proxima-nova">' + d.props.name + (d.props.country?'('+d.props.country + ')':'')+'</a></h4> ' + d.props.type + '</div>' +
            //   '</div>';

            // if(d.type == 'organization')
            //   html = '' +
            //   '<div class="node '+ d.type + '">' +
            //     '<div class="content tk-proxima-nova"><h4><a class="tk-proxima-nova">' + d.props.name +'</a></h4> ' + d.props.type + '</div>' +
            //   '</div>';

            return html;
          }).join('-')
        }
      });

      this.annotator.viewer.addField({
        load(field, annotation) {
          // console.log(annotation)
          field.className = 'author custom';
          field.innerHTML = annotation.author.username;
        }
      })

      this.annotator.subscribe('resize', function () {

      });

      this.annotator.subscribe('annotationCreated', function (annotation) {
        console.log('The annotation: %o has just been created!', annotation, link)
      })
        .subscribe('annotationUpdated', function (annotation) {
          console.log('The annotation: %o has just been updated!', annotation)
        })
        .subscribe('annotationDeleted', function (annotation) {
          console.log('The annotation: %o has just been deleted!', annotation)
          if (editor) editor.hide()
        })
        .subscribe('annotationEditorShown', function (editor, annotation) {
          editor = editor;
          console.log('The annotation:  has just been annotationEditorShown!', arguments, annotator);

          if (typeof options.annotationEditorShown === 'function') options.annotationEditorShown(annotation, annotator)
        })
        .subscribe('annotationViewerShown', function (viewer) {
        // console.log("The annotation: %o has just been annotationViewerShown!", annotation, annotator.wrapper.width());
          const w = annotator.wrapper.width();


          const l = parseInt((viewer.element[0].style.left || 0).replace(/[^0-9-]/g, ''));


          const d = w - l;
          // console.log('annotationViewerShown', d, viewer.element[0].style.left)
          if (d < 280) {
            viewer.element[0].style.left = `${l - 280 + d}px`;
          }
          // console.log('d is ', d, (l - 280 + d))
        // viewer.element[0].style.left = d < 280? (viewer.element[0].style.left - 280 + d) +'px': viewer.element[0].style.left;
        // console.log(w,d,viewer.element[0].offsetLeft, annotator)
        })
    }
  };
};
