describe('runRules', function () {
  'use strict';
  var ver = axe.version.substring(0, axe.version.lastIndexOf('.'));

  function iframeReady(src, context, id, cb) {
    var i = document.createElement('iframe');
    i.addEventListener('load', function () {
      cb();
    });
    i.src = src;
    i.id = id;
    context.appendChild(i);
  }

  function createFrames(url, callback) {
    var frame,
      num = 2;
    var loaded = 0;

    if (typeof url === 'function') {
      callback = url;
      url = '../mock/frames/frame-frame.html';
    }

    function onLoad() {
      loaded++;
      if (loaded >= num) {
        callback();
      }
    }

    frame = document.createElement('iframe');
    frame.src = url;

    frame.addEventListener('load', onLoad);
    fixture.appendChild(frame);

    frame = document.createElement('iframe');
    frame.src = '../mock/frames/nocode.html';
    frame.addEventListener('load', onLoad);
    fixture.appendChild(frame);
    return frame;
  }

  var fixture = document.getElementById('fixture');
  var memoizedFns;

  var isNotCalled;
  beforeEach(function () {
    memoizedFns = axe._memoizedFns.slice();
    isNotCalled = function (err) {
      throw err || new Error('Reject should not be called');
    };
  });

  afterEach(function () {
    fixture.innerHTML = '';
    axe._audit = null;
    axe._tree = undefined;
    axe._memoizedFns = memoizedFns;
  });

  it('should work', function (done) {
    axe._load({
      rules: [
        {
          id: 'html',
          selector: 'html',
          any: ['html']
        }
      ],
      checks: [
        {
          id: 'html',
          evaluate: function () {
            return true;
          }
        }
      ],
      messages: {}
    });

    var frame = document.createElement('iframe');
    frame.src = '../mock/frames/frame-frame.html';

    frame.addEventListener('load', function () {
      setTimeout(function () {
        axe._runRules(
          document,
          {},
          function (r) {
            assert.lengthOf(r[0].passes, 3);
            done();
          },
          isNotCalled
        );
      }, 500);
    });
    fixture.appendChild(frame);
  });

  it('should properly order iframes', function (done) {
    axe._load({
      rules: [
        {
          id: 'iframe',
          selector: 'iframe',
          any: ['iframe']
        }
      ],
      checks: [
        {
          id: 'iframe',
          evaluate: function () {
            return true;
          }
        }
      ],
      messages: {}
    });

    var frame = document.createElement('iframe');
    frame.addEventListener('load', function () {
      setTimeout(function () {
        axe._runRules(
          document,
          {},
          function (r) {
            var nodes = r[0].passes.map(function (detail) {
              return detail.node.selector;
            });
            try {
              assert.deepEqual(nodes, [
                ['#level0'],
                ['#level0', '#level1'],
                ['#level0', '#level1', '#level2a'],
                ['#level0', '#level1', '#level2b']
              ]);
              done();
            } catch (e) {
              done(e);
            }
          },
          isNotCalled
        );
      }, 500);
    });
    frame.id = 'level0';
    frame.src = '../mock/frames/nested0.html';
    fixture.appendChild(frame);
  });

  it('should properly calculate context and return results from matching frames', function (done) {
    axe._load({
      rules: [
        {
          id: 'div#target',
          selector: '#target',
          any: ['has-target']
        },
        {
          id: 'first-div',
          selector: 'div:not(#fixture)',
          any: ['first-div']
        }
      ],
      checks: [
        {
          id: 'has-target',
          evaluate: function () {
            return true;
          }
        },
        {
          id: 'first-div',
          evaluate: function (node) {
            this.relatedNodes([node]);
            return false;
          },
          after: function (results) {
            if (results.length) {
              results[0].result = true;
            }
            return [results[0]];
          }
        }
      ],
      messages: {}
    });

    iframeReady(
      '../mock/frames/context.html',
      fixture,
      'context-test',
      function () {
        var div = document.createElement('div');
        fixture.appendChild(div);

        axe._runRules(
          '#fixture',
          {},
          function (results) {
            try {
              assert.deepEqual(JSON.parse(JSON.stringify(results)), [
                {
                  id: 'div#target',
                  helpUrl:
                    'https://dequeuniversity.com/rules/axe/' +
                    ver +
                    '/div#target?application=axeAPI',
                  pageLevel: false,
                  impact: null,
                  inapplicable: [],
                  incomplete: [],
                  violations: [],
                  passes: [
                    {
                      result: 'passed',
                      impact: null,
                      node: {
                        selector: ['#context-test', '#target'],
                        ancestry: [
                          'html > body > div:nth-child(1) > iframe:nth-child(1)',
                          'html > body > div:nth-child(2)'
                        ],
                        xpath: [
                          "/iframe[@id='context-test']",
                          "/div[@id='target']"
                        ],
                        source: '<div id="target"></div>',
                        nodeIndexes: [12, 14]
                      },
                      any: [
                        {
                          id: 'has-target',
                          data: null,
                          relatedNodes: []
                        }
                      ],
                      all: [],
                      none: []
                    }
                  ],
                  result: 'passed',
                  tags: []
                },
                {
                  id: 'first-div',
                  helpUrl:
                    'https://dequeuniversity.com/rules/axe/' +
                    ver +
                    '/first-div?application=axeAPI',
                  pageLevel: false,
                  impact: null,
                  inapplicable: [],
                  incomplete: [],
                  violations: [],
                  passes: [
                    {
                      result: 'passed',
                      impact: null,
                      node: {
                        selector: ['#context-test', '#foo'],
                        ancestry: [
                          'html > body > div:nth-child(1) > iframe:nth-child(1)',
                          'html > body > div:nth-child(1)'
                        ],
                        xpath: [
                          "/iframe[@id='context-test']",
                          "/div[@id='foo']"
                        ],
                        source:
                          '<div id="foo">\n      <div id="bar"></div>\n    </div>',
                        nodeIndexes: [12, 9]
                      },
                      any: [
                        {
                          id: 'first-div',
                          data: null,
                          relatedNodes: [
                            {
                              selector: ['#context-test', '#foo'],
                              ancestry: [
                                'html > body > div:nth-child(1) > iframe:nth-child(1)',
                                'html > body > div:nth-child(1)'
                              ],
                              xpath: [
                                "/iframe[@id='context-test']",
                                "/div[@id='foo']"
                              ],
                              source:
                                '<div id="foo">\n      <div id="bar"></div>\n    </div>',
                              nodeIndexes: [12, 9]
                            }
                          ]
                        }
                      ],
                      all: [],
                      none: []
                    }
                  ],
                  result: 'passed',
                  tags: []
                }
              ]);
              done();
            } catch (e) {
              done(e);
            }
          },
          isNotCalled
        );
      }
    );
  });

  it('should reject if the context is invalid', function (done) {
    axe._load({
      rules: [
        {
          id: 'div#target',
          selector: '#target',
          any: ['has-target']
        }
      ],
      messages: {}
    });

    iframeReady(
      '../mock/frames/context.html',
      fixture,
      'context-test',
      function () {
        axe._runRules(
          '#not-happening',
          {},
          function () {
            assert.fail('This selector should not exist.');
          },
          function (error) {
            assert.isOk(error);
            assert.equal(
              error.message,
              'No elements found for include in page Context'
            );

            done();
          }
        );
      }
    );
  });

  it('should accept a jQuery-like object', function (done) {
    axe._load({
      rules: [
        {
          id: 'test',
          selector: '*',
          none: ['bob']
        }
      ],
      checks: [
        {
          id: 'bob',
          evaluate: function () {
            return true;
          }
        }
      ]
    });

    fixture.innerHTML =
      '<div id="t1"><span></span></div><div id="t2"><em></em></div>';

    var $test = {
      0: fixture.querySelector('#t1'),
      1: fixture.querySelector('#t2'),
      length: 2
    };

    axe.run($test, function (err, results) {
      assert.isNull(err);
      assert.lengthOf(results.violations, 1);
      assert.lengthOf(results.violations[0].nodes, 4);
      assert.deepEqual(results.violations[0].nodes[0].target, ['#t1']);
      // assert.deepEqual(results.violations[0].nodes[1].target, ['span']);
      assert.deepEqual(results.violations[0].nodes[2].target, ['#t2']);
      // assert.deepEqual(results.violations[0].nodes[3].target, ['em']);
      done();
    });
  });

  it('should accept a NodeList', function (done) {
    axe._load({
      rules: [
        {
          id: 'test',
          selector: '*',
          none: ['fred']
        }
      ],
      checks: [
        {
          id: 'fred',
          evaluate: function () {
            return true;
          }
        }
      ]
    });

    fixture.innerHTML =
      '<div class="foo" id="t1"><span></span></div><div class="foo" id="t2"><em></em></div>';

    var test = fixture.querySelectorAll('.foo');
    axe.run(test, function (err, results) {
      assert.isNull(err);
      assert.lengthOf(results.violations, 1);
      assert.lengthOf(results.violations[0].nodes, 4);
      assert.deepEqual(results.violations[0].nodes[0].target, ['#t1']);
      // assert.deepEqual(results.violations[0].nodes[1].target, ['span']);
      assert.deepEqual(results.violations[0].nodes[2].target, ['#t2']);
      // assert.deepEqual(results.violations[0].nodes[3].target, ['em']);
      done();
    });
  });

  it('should pull metadata from configuration', function (done) {
    axe._load({
      rules: [
        {
          id: 'div#target',
          selector: '#target',
          any: ['has-target']
        },
        {
          id: 'first-div',
          selector: 'div#fixture div',
          any: ['first-div']
        }
      ],
      checks: [
        {
          id: 'has-target',
          evaluate: function () {
            return false;
          }
        },
        {
          id: 'first-div',
          evaluate: function (node) {
            this.relatedNodes([node]);
            return false;
          },
          after: function (results) {
            if (results.length) {
              results[0].result = true;
            }
            return [results[0]];
          }
        }
      ],
      data: {
        rules: {
          'div#target': {
            foo: 'bar',
            stuff: 'blah'
          },
          'first-div': {
            bar: 'foo',
            stuff: 'no'
          }
        },
        checks: {
          'first-div': {
            thingy: true,
            impact: 'serious',
            messages: {
              fail: function (checkResult) {
                return checkResult.id === 'first-div'
                  ? 'failing is not good'
                  : 'y u wrong rule?';
              },
              pass: function (checkResult) {
                return checkResult.id === 'first-div'
                  ? 'passing is good'
                  : 'y u wrong rule?';
              }
            }
          },
          'has-target': {
            otherThingy: true,
            impact: 'moderate',
            messages: {
              fail: function (checkResult) {
                return checkResult.id === 'has-target'
                  ? 'failing is not good'
                  : 'y u wrong rule?';
              },
              pass: function (checkResult) {
                return checkResult.id === 'has-target'
                  ? 'passing is good'
                  : 'y u wrong rule?';
              }
            }
          }
        }
      }
    });
    fixture.innerHTML = '<div id="target">Target!</div><div>ok</div>';
    axe._runRules(
      '#fixture',
      {},
      function (results) {
        try {
          assert.deepEqual(JSON.parse(JSON.stringify(results)), [
            {
              id: 'div#target',
              helpUrl:
                'https://dequeuniversity.com/rules/axe/' +
                ver +
                '/div#target?application=axeAPI',
              pageLevel: false,
              foo: 'bar',
              stuff: 'blah',
              impact: 'moderate',
              passes: [],
              inapplicable: [],
              incomplete: [],
              violations: [
                {
                  result: 'failed',
                  node: {
                    selector: ['#target'],
                    ancestry: [
                      'html > body > div:nth-child(1) > div:nth-child(1)'
                    ],
                    xpath: ["/div[@id='target']"],
                    source: '<div id="target">Target!</div>',
                    nodeIndexes: [12]
                  },
                  impact: 'moderate',
                  any: [
                    {
                      impact: 'moderate',
                      otherThingy: true,
                      message: 'failing is not good',
                      id: 'has-target',
                      data: null,
                      relatedNodes: []
                    }
                  ],
                  all: [],
                  none: []
                }
              ],
              result: 'failed',
              tags: []
            },
            {
              id: 'first-div',
              helpUrl:
                'https://dequeuniversity.com/rules/axe/' +
                ver +
                '/first-div?application=axeAPI',
              pageLevel: false,
              bar: 'foo',
              stuff: 'no',
              impact: null,
              inapplicable: [],
              incomplete: [],
              violations: [],
              passes: [
                {
                  result: 'passed',
                  impact: null,
                  node: {
                    selector: ['#target'],
                    xpath: ["/div[@id='target']"],
                    ancestry: [
                      'html > body > div:nth-child(1) > div:nth-child(1)'
                    ],
                    source: '<div id="target">Target!</div>',
                    nodeIndexes: [12]
                  },
                  any: [
                    {
                      impact: 'serious',
                      id: 'first-div',
                      thingy: true,
                      message: 'passing is good',
                      data: null,
                      relatedNodes: [
                        {
                          selector: ['#target'],
                          ancestry: [
                            'html > body > div:nth-child(1) > div:nth-child(1)'
                          ],
                          xpath: ["/div[@id='target']"],
                          source: '<div id="target">Target!</div>',
                          nodeIndexes: [12]
                        }
                      ]
                    }
                  ],
                  all: [],
                  none: []
                }
              ],
              result: 'passed',
              tags: []
            }
          ]);
          done();
        } catch (e) {
          done(e);
        }
      },
      isNotCalled
    );
  });

  it('should call the reject argument if an error occurs', function (done) {
    axe._load({
      rules: [
        {
          id: 'invalidRule'
        }
      ],
      checks: [],
      messages: {}
    });

    createFrames(function () {
      setTimeout(function () {
        axe._runRules(
          document,
          {},
          function () {
            assert.ok(false, 'You shall not pass!');
            done();
          },
          function (err) {
            assert.instanceOf(err, Error);
            done();
          }
        );
      }, 100);
    });
  });

  it('should resolve to cantTell when a rule fails', function (done) {
    axe._load({
      rules: [
        {
          id: 'incomplete-1',
          selector: '*',
          none: ['undeffed']
        },
        {
          id: 'incomplete-2',
          selector: '*',
          none: ['thrower']
        }
      ],
      checks: [
        {
          id: 'undeffed',
          evaluate: function () {
            return undefined;
          }
        },
        {
          id: 'thrower',
          evaluate: function () {
            throw new Error('Check failed to complete');
          }
        }
      ]
    });

    fixture.innerHTML = '<div></div>';

    axe.run('#fixture', function (err, results) {
      assert.isNull(err);
      assert.lengthOf(results.incomplete, 2);
      assert.equal(results.incomplete[0].id, 'incomplete-1');
      assert.equal(results.incomplete[1].id, 'incomplete-2');

      assert.include(
        results.incomplete[1].description,
        'An error occured while running this rule'
      );
      done();
    });
  });

  it('should resolve to cantTell if an error occurs inside frame rules', function (done) {
    axe._load({
      rules: [
        {
          id: 'incomplete-1',
          selector: '.nogo',
          none: ['undeffed']
        },
        {
          id: 'incomplete-2',
          selector: '.nogo',
          none: ['thrower']
        }
      ],
      checks: [
        {
          id: 'undeffed',
          evaluate: function () {
            return false;
          }
        },
        {
          id: 'thrower',
          evaluate: function () {
            return false;
          }
        }
      ]
    });

    iframeReady(
      '../mock/frames/rule-error.html',
      fixture,
      'context-test',
      function () {
        axe.run('#fixture', function (err, results) {
          assert.isNull(err);
          assert.lengthOf(results.incomplete, 2);
          assert.equal(results.incomplete[0].id, 'incomplete-1');
          assert.equal(results.incomplete[1].id, 'incomplete-2');

          assert.include(
            results.incomplete[1].description,
            'An error occured while running this rule'
          );
          done();
        });
      }
    );
  });

  it('should cascade `no elements found` errors in frames to reject run_rules', function (done) {
    axe._load({
      rules: [
        {
          id: 'invalidRule'
        }
      ],
      checks: [],
      messages: {}
    });
    fixture.innerHTML = '<div id="outer"></div>';
    var outer = document.getElementById('outer');

    iframeReady('../mock/frames/context.html', outer, 'target', function () {
      axe._runRules(
        [['#target', '#elementNotFound']],
        {},
        function resolve() {
          assert.ok(false, 'frame should have thrown an error');
        },
        function reject(err) {
          assert.instanceOf(err, Error);
          assert.include(
            err.message,
            'No elements found for include in frame Context'
          );
          done();
        }
      );
    });
  });

  it('should not call reject when the resolve throws', function (done) {
    var rejectCalled = false;
    axe._load({
      rules: [
        {
          id: 'html',
          selector: 'html',
          any: ['html']
        }
      ],
      checks: [
        {
          id: 'html',
          evaluate: function () {
            return true;
          }
        }
      ],
      messages: {}
    });

    function resolve() {
      setTimeout(function () {
        assert.isFalse(rejectCalled);
        axe.log = log;
        done();
      }, 20);
      throw new Error('err');
    }
    function reject() {
      rejectCalled = true;
    }

    var log = axe.log;
    axe.log = function (e) {
      assert.equal(e.message, 'err');
      axe.log = log;
    };
    axe._runRules(document, {}, resolve, reject);
  });

  it('should ignore iframes if `iframes` === false', function (done) {
    axe._load({
      rules: [
        {
          id: 'html',
          selector: 'html',
          any: ['html']
        }
      ],
      checks: [
        {
          id: 'html',
          evaluate: function () {
            return true;
          }
        }
      ],
      messages: {}
    });

    var frame = document.createElement('iframe');
    frame.src = '../mock/frames/frame-frame.html';

    frame.addEventListener('load', function () {
      setTimeout(function () {
        axe._runRules(
          document,
          { iframes: false },
          function (r) {
            assert.lengthOf(r[0].passes, 1);
            assert.equal(
              r[0].passes[0].node.element.ownerDocument,
              document,
              'Result should not be in an iframe'
            );
            done();
          },
          isNotCalled
        );
      }, 500);
    });
    fixture.appendChild(frame);
  });

  it('should not fail if `include` / `exclude` is overwritten', function (done) {
    function invalid() {
      throw new Error('nope!');
    }
    Array.prototype.include = invalid;
    Array.prototype.exclude = invalid;

    axe._load({
      rules: [
        {
          id: 'html',
          selector: 'html',
          any: ['html']
        }
      ],
      checks: [
        {
          id: 'html',
          evaluate: function () {
            return true;
          }
        }
      ],
      messages: {}
    });

    axe._runRules(
      [document],
      {},
      function (r) {
        assert.lengthOf(r[0].passes, 1);

        delete Array.prototype.include;
        delete Array.prototype.exclude;
        done();
      },
      isNotCalled
    );
  });

  it('should return a cleanup method', function (done) {
    axe._load({
      rules: [
        {
          id: 'html',
          selector: 'html',
          any: ['html']
        }
      ],
      checks: [
        {
          id: 'html',
          evaluate: function () {
            return true;
          }
        }
      ],
      messages: {}
    });

    axe._runRules(
      document,
      {},
      function resolve(out, cleanup) {
        assert.isDefined(axe._tree);
        assert.isDefined(axe._selectorData);

        cleanup();
        assert.isUndefined(axe._tree);
        assert.isUndefined(axe._selectorData);
        done();
      },
      isNotCalled
    );
  });

  it('should clear up axe._tree / axe._selectorData after an error', function (done) {
    axe._load({
      rules: [
        {
          id: 'invalidRule'
        }
      ],
      checks: [],
      messages: {}
    });

    createFrames(function () {
      setTimeout(function () {
        axe._runRules(document, {}, isNotCalled, function () {
          assert.isUndefined(axe._tree);
          assert.isUndefined(axe._selectorData);
          done();
        });
      }, 100);
    });
  });

  // todo: see issue - https://github.com/dequelabs/axe-core/issues/2168
  it.skip('should clear the memoized cache for each function', function (done) {
    axe._load({
      rules: [
        {
          id: 'html',
          selector: 'html',
          any: ['html']
        }
      ],
      checks: [
        {
          id: 'html',
          evaluate: function () {
            return true;
          }
        }
      ],
      messages: {}
    });

    axe._runRules(
      document,
      {},
      function resolve(out, cleanup) {
        var called = false;
        axe._memoizedFns = [
          {
            clear: function () {
              called = true;
            }
          }
        ];

        cleanup();
        assert.isTrue(called);

        done();
      },
      isNotCalled
    );
  });
});
