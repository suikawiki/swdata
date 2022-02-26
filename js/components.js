(function () {
  var exportable = {$paco: {}};
  var pcInternal = {};
  pcInternal.$paco = exportable.$paco;

  var $promised = exportable.$promised = {};

  $promised.forEach = function (code, items) {
    var list = Array.prototype.slice.call (items);
    var run = function () {
      if (!list.length) return Promise.resolve ();
      return Promise.resolve (list.shift ()).then (code).then (run);
    };
    return run ();
  }; // forEach

  $promised.map = function (code, items) {
    var list = Array.prototype.slice.call (items);
    var newList = [];
    var run = function () {
      if (!list.length) return Promise.resolve (newList);
      return Promise.resolve (list.shift ()).then (code).then ((_) => {
        newList.push (_);
      }).then (run);
    };
    return run ();
  }; // map

  var definables = {
    loader: {type: 'handler'},
    filter: {type: 'handler'},
    templateselector: {type: 'handler'},
    saver: {type: 'handler'},
    formsaved: {type: 'handler'},
    formvalidator: {type: 'handler'},
    filltype: {type: 'map'},
    templateSet: {type: 'element'},
    element: {type: 'customElement'},
  };
  var defs = {};
  var defLoadedPromises = {};
  var defLoadedCallbacks = {};
  for (var n in definables) {
    defs[n] = {};
    defLoadedPromises[n] = {};
    defLoadedCallbacks[n] = {};
  }
  var addDef = function (e) {
    var type = e.localName;
    if (!(e.namespaceURI === 'data:,pc' && definables[type])) return;
    if (definables[type].type === 'element') return;

    var name;
    if (definables[type].type === 'customElement') {
      name = e.pcDef ? e.pcDef.name : null;
      if (e.pcDef && e.pcDef.is) {
        name += ' is=' + e.pcDef.is;
      }
    } else {
      name = e.getAttribute ('name');
    }

    if (defs[type][name]) {
      throw new Error ("Duplicate |"+type+"|: |"+name+"|");
    } else {
      var value = null;
      if (definables[type].type === 'handler') {
        value = e.pcHandler || (() => {});
      } else if (definables[type].type === 'customElement') {
        defineElement (e.pcDef);
        value = true;
      } else {
        value = e.getAttribute ('content');
      }
      defs[type][name] = value;
    }
    if (defLoadedCallbacks[type][name]) {
      defLoadedCallbacks[type][name] (value);
      delete defLoadedCallbacks[type][name];
      delete defLoadedPromises[type][name];
    }
    e.remove ();
  }; // addDef
  var addElementDef = (type, name, e) => {
    if (defs[type][name]) {
      throw new Error ("Duplicate |"+type+"|: |"+name+"|");
    }
    defs[type][name] = e;
    if (defLoadedCallbacks[type][name]) {
      defLoadedCallbacks[type][name] (e);
      delete defLoadedCallbacks[type][name];
      delete defLoadedPromises[type][name];
    }
  }; // addElementDef
  new MutationObserver (function (mutations) {
    mutations.forEach
        ((m) => Array.prototype.forEach.call (m.addedNodes, addDef));
  }).observe (document.head, {childList: true});
  Promise.resolve ().then (() => {
    Array.prototype.slice.call (document.head.children).forEach (addDef);
  });
  var getDef = function (type, name) {
    var def = defs[type][name];
    if (def) {
      return Promise.resolve (def);
    } else {
      if (!defLoadedPromises[type][name]) {
        defLoadedPromises[type][name] = new Promise ((a, b) => {
          defLoadedCallbacks[type][name] = a;
        });
      }
      return defLoadedPromises[type][name];
    }
  }; // getDef

  var waitDefsByString = function (string) {
    return Promise.all (string.split (/\s+/).map ((_) => {
      if (_ === "") return;
      var v = _.split (/:/, 2);
      if (defs[v[0]]) {
        return getDef (v[0], v[1]);
      } else {
        throw new Error ("Unknown definition type |"+v[0]+"|");
      }
    }));
  }; // waitDefsByString

  defs.filltype.time = 'datetime';
  // <data>
  defs.filltype.input = 'input';
  defs.filltype.select = 'idlattribute';
  defs.filltype.textarea = 'idlattribute';
  defs.filltype.output = 'idlattribute';
  // <progress>
  // <meter>

  var upgradableSelectors = [];
  var currentUpgradables = ':not(*)';
  var newUpgradableSelectors = [];
  var upgradedElementProps = {};
  var upgrader = {};
  
  var upgrade = function (e) {
    if (e.pcUpgraded) return Promise.resolve ();
    e.pcUpgraded = true;

    var props = (upgradedElementProps[e.localName] || {})[e.getAttribute ('is')] || {};
    Object.keys (props).forEach (function (k) {
      e[k] = props[k];
    });

    return new Promise ((re) => re ((upgrader[e.localName] || {})[e.getAttribute ('is')].call (e))).catch ((err) => {
      console.log ("Can't upgrade an element", e, err);
      throw err;
    });
  }; // upgrade

  exportable.$paco.upgrade = (e) => {
    if (!upgrader[e.localName]) return Promise.resolve ();
    if (!upgrader[e.localName][e.getAttribute ('is')]) return Promise.resolve ();
    return upgrade (e);
  }; // $paco.upgrade

  new MutationObserver (function (mutations) {
    mutations.forEach (function (m) {
      Array.prototype.forEach.call (m.addedNodes, function (e) {
        if (e.nodeType === e.ELEMENT_NODE) {
          if (e.matches && e.matches (currentUpgradables)) upgrade (e);
          Array.prototype.forEach.call
              (e.querySelectorAll (currentUpgradables), upgrade);
        }
      });
    });
  }).observe (document, {childList: true, subtree: true});

  var commonMethods = {};
  var defineElement = function (def) {
    upgradedElementProps[def.name] = upgradedElementProps[def.name] || {};
    upgradedElementProps[def.name][def.is || null] = def.props = def.props || {};
    if (def.pcActionStatus) {
      def.props.pcActionStatus = commonMethods.pcActionStatus;
    }
    if (def.pcInternal) {
      def.props.pcInternal = pcInternal;
    }
    
    upgrader[def.name] = upgrader[def.name] || {};
    var init = def.templateSet ? function () {
      initTemplateSet (this);
      this.pcInit ();
    } : upgradedElementProps[def.name][def.is || null].pcInit || function () { };
    upgrader[def.name][def.is || null] = function () {
      var e = this;
      if (e.nextSibling ||
          document.readyState === 'interactive' ||
          document.readyState === 'complete') {
        return init.call (e);
      }
      return new Promise (function (ok) {
        var timer = setInterval (function () {
          if (e.nextSibling ||
              document.readyState === 'interactive' ||
              document.readyState === 'complete') {
            ok ();
            clearInterval (timer);
          }
        }, 100);
      }).then (function () {
        return init.call (e);
      });
    };
    if (!def.notTopLevel) {
      var selector = def.name;
      if (def.is) selector += '[is="' + def.is + '"]';
      newUpgradableSelectors.push (selector);
      Promise.resolve ().then (() => {
        var news = newUpgradableSelectors.join (',');
        if (!news) return;
        newUpgradableSelectors.forEach ((_) => upgradableSelectors.push (_));
        newUpgradableSelectors = [];
        currentUpgradables = upgradableSelectors.join (',');
        Array.prototype.forEach.call (document.querySelectorAll (news), upgrade);
      });
    } // notTopLevel
  }; // defineElement

  var filledAttributes = ['href', 'src', 'id', 'title', 'value', 'action',
                          'class'];
  var $fill = exportable.$fill = pcInternal.$fill = function (root, object) {
    root.querySelectorAll ('[data-field]').forEach ((f) => {
      var name = f.getAttribute ('data-field').split (/\./);
      var value = object;
      for (var i = 0; i < name.length; i++) {
        value = value[name[i]];
        if (value == null) break;
      }

      var ln = f.localName;
      var fillType = defs.filltype[ln];
      if (fillType === 'contentattribute') {
        f.setAttribute ('value', value);
      } else if (fillType === 'idlattribute') {
        f.value = value;
      } else if (fillType === 'input') {
        var type = f.type;
        if (type === 'date' ||
            type === 'month' ||
            type === 'week' ||
            type === 'datetime-local') {
          value = parseFloat (value);
          if (!Number.isFinite (value)) {
            f.value = '';
          } else {
            f.valueAsNumber = value * 1000;
          }
        } else {
          f.value = value;
        }
      } else if (fillType === 'datetime') {
        try {
          var dt = new Date (value * 1000);
          f.setAttribute ('datetime', dt.toISOString ());
        } catch (e) {
          f.removeAttribute ('datetime');
          f.textContent = e;
        }
        if (f.hasAttribute ('data-tzoffset-field')) {
          var name = f.getAttribute ('data-tzoffset-field').split (/\./);
          var v = object;
          for (var i = 0; i < name.length; i++) {
            v = v[name[i]];
            if (v == null) break;
          }
          if (v != null) {
            f.setAttribute ('data-tzoffset', v);
          } else {
            f.removeAttribute ('data-tzoffset');
          }
        }
      } else {
        if ((value == null || (value + "") === "") && f.hasAttribute ('data-empty')) {
          f.textContent = f.getAttribute ('data-empty');
        } else {
          f.textContent = value;
        }
      }

      f.removeAttribute ('data-filling');
    }); // [data-field]

    root.querySelectorAll ('[data-enable-by-fill]').forEach ((f) => {
      f.removeAttribute ('disabled');
    });

    filledAttributes.forEach ((n) => {
      root.querySelectorAll ('[data-'+n+'-field]').forEach ((f) => {
        var name = f.getAttribute ('data-'+n+'-field').split (/\./);
        var value = object;
        for (var i = 0; i < name.length; i++) {
          value = value[name[i]];
          if (value == null) break;
        }
        if (value != null) {
          f.setAttribute (n, value);
        } else {
          f.removeAttribute (n);
        }
      }); // [data-*-field]

      root.querySelectorAll ('[data-'+n+'-template]').forEach ((f) => {
        f.setAttribute (n, $fill.string (f.getAttribute ('data-'+n+'-template'), object));
      }); // [data-*-template]
    }); // filledAttributes
    root.querySelectorAll ('[data-filled]').forEach (f => {
      var attrs = f.getAttribute ('data-filled').split (/\s+/);
      attrs.forEach (n => {
        if (f.hasAttribute ('data-'+n+'-field')) {
          var name = f.getAttribute ('data-'+n+'-field').split (/\./);
          var value = object;
          for (var i = 0; i < name.length; i++) {
            value = value[name[i]];
            if (value == null) break;
          }
          if (value != null) {
            f.setAttribute (n, value);
          } else {
            f.removeAttribute (n);
          }
        }
        if (f.hasAttribute ('data-'+n+'-template')) {
          f.setAttribute (n, $fill.string (f.getAttribute ('data-'+n+'-template'), object));
        }
      });
    });
    root.querySelectorAll ('[data-filledprops]').forEach (f => {
      f.getAttribute ('data-filledprops').split (/\s+/).forEach (propName => {
        var name = propName.split (/\./);
        var value = object;
        for (var i = 0; i < name.length; i++) {
          value = value[name[i]];
          if (value == null) break;
        }
        if (value != null) {
          f[propName] = value;
        } else {
          f[propName] = null;
        }
      });
    });
  }; // $fill

  $fill.string = function (s, object) {
    return s.replace (/\{(?:(url):|)([\w.]+)\}/g, function (_, t, n) {
      var name = n.split (/\./);
      var value = object;
      for (var i = 0; i < name.length; i++) {
        value = value[name[i]];
        if (value == null) break;
      }
      if (t === 'url') {
        try {
          return encodeURIComponent (value);
        } catch (e) {
          return encodeURIComponent ("\uFFFD");
        }
      } else {
        return value;
      }
    });
  }; // $fill.string

  var templateSetLocalNames = {};
  var templateSetSelector = '';
  var templateSetMembers = {
    pcCreateTemplateList: function () {
      var oldList = this.pcTemplateList || {};
      var newList = this.pcTemplateList = {};
      Array.prototype.slice.call (this.querySelectorAll ('template')).forEach ((g) => {
        this.pcTemplateList[g.getAttribute ('data-name') || ""] = g;
      });
      var oldKeys = Object.keys (oldList);
      var newKeys = Object.keys (newList);
      var changed = false;
      if (oldKeys.length !== newKeys.length) {
        changed = true;
      } else {
        for (var v in newKeys) {
          if (oldKeys[v] !== newKeys[v]) {
            changed = true;
            break;
          }
        }
      }
      if (!changed) return;
      
      this.pcSelectorUpdatedDispatched = false;
      this.pcSelectorName = this.getAttribute ('templateselector') || 'default';
      return getDef ('templateselector', this.pcSelectorName).then ((_) => {
        this.pcSelector = _;
        return Promise.all (Object.values (this.pcTemplateList).map ((e) => waitDefsByString (e.getAttribute ('data-requires') || '')));
      }).then (() => {
        var event = new Event ('pctemplatesetupdated', {});
        event.pcTemplateSet = this;
        var nodes;
        if (this.localName === 'template-set') {
          var name = this.getAttribute ('name');
          nodes = Array.prototype.slice.call (this.getRootNode ().querySelectorAll (templateSetSelector)).filter ((e) => e.getAttribute ('template') === name);
        } else {
          nodes = [this];
        }
        this.pcSelectorUpdatedDispatched = true;
        nodes.forEach ((e) => e.dispatchEvent (event));
      });
    }, // pcCreateTemplateList
    createFromTemplate: function (localName, object) {
      if (!this.pcSelector) throw new DOMException ('The template set is not ready', 'InvalidStateError');
      var template = this.pcSelector.call (this, this.pcTemplateList, object); // or throw
      if (!template) {
        console.log ('Template is not selected (templateselector=' + this.pcSelectorName + ')', this);
        template = document.createElement ('template');
      }
      var e = document.createElement (localName);
      e.appendChild (template.content.cloneNode (true));
      ['class', 'title', 'id'].forEach (_ => {
        if (template.hasAttribute (_)) {
          e.setAttribute (_, template.getAttribute (_));
        }
        if (template.hasAttribute ('data-'+_+'-template')) {
          e.setAttribute (_, $fill.string (template.getAttribute ('data-'+_+'-template'), object));
        }
        if (template.hasAttribute ('data-'+_+'-field')) {
          e.setAttribute (_, $fill.string ('{'+template.getAttribute ('data-'+_+'-field')+'}', object));
        }
      });
      $fill (e, object);
      return e;
    }, // createFromTemplate
  }; // templateSetMembers

  var initTemplateSet = function (e) {
    templateSetLocalNames[e.localName] = true;
    templateSetSelector = Object.keys (templateSetLocalNames).map ((n) => n.replace (/([^A-Za-z0-9])/g, (_) => "\\" + _.charCodeAt (0).toString (16) + " ") + '[template]').join (',');
    
    for (var n in templateSetMembers) {
      e[n] = templateSetMembers[n];
    }

    var templateSetName = e.getAttribute ('template');
    if (templateSetName) {
      var ts = defs.templateSet[templateSetName];
      if (ts && ts.pcSelectorUpdatedDispatched) {
        Promise.resolve ().then (() => {
          if (!ts.pcSelectorUpdatedDispatched) return;
          var event = new Event ('pctemplatesetupdated', {});
          event.pcTemplateSet = ts;
          e.dispatchEvent (event);
        });
      }
    } else {
      e.pcCreateTemplateList ();
      new MutationObserver ((mutations) => {
        e.pcCreateTemplateList ();
      }).observe (e, {childList: true});
    }
  }; // initTemplateSet

  exportable.$getTemplateSet = function (name) {
    return getDef ('templateSet', name).then (ts => {
      ts.pcCreateTemplateList ();
      return ts;
    });
  }; // $getTemplateSet

  exportable.$paco.catchFetchError = function (e, requestInfo) {
    throw new PACOFetchError (e, requestInfo);
  }; // $paco.catchFetchError
  
 class PACOFetchError extends Error {
   constructor (e, requestInfo) {
     var m = e;
     if (e instanceof Response) {
       m = e.status + ' ' + e.statusText
     }
     super (m+' <'+requestInfo.url+'>');
     this.name = 'PACOFetchError';
     this.pcError = e; // Error, Response, or other exception
     this.pcRequestInfo = requestInfo;
   };
 }; // PACOFetchError
 
  var ActionStatus = function (elements) {
    this.stages = {};
    this.elements = elements;
  }; // ActionStatus

  ActionStatus.prototype.start = function (opts) {
    if (opts.stages) {
      opts.stages.forEach ((s) => {
        this.stages[s] = 0;
      });
    }
    this.elements.forEach ((e) => {
      e.querySelectorAll ('action-status-messages').forEach ((f) => f.hidden = true);
      e.querySelectorAll ('progress').forEach ((f) => {
        f.hidden = false;
        var l = Object.keys (this.stages).length;
        if (l) {
          f.max = l;
          f.value = 0;
        } else {
          f.removeAttribute ('max');
          f.removeAttribute ('value');
        }
      });
      e.hidden = false;
      e.removeAttribute ('status');
    }); // e
  }; // start

  ActionStatus.prototype.stageStart = function (stage) {
    this.elements.forEach ((e) => {
      var label = e.getAttribute ('stage-' + stage);
      e.querySelectorAll ('action-status-message').forEach ((f) => {
        if (label) {
          f.textContent = label;
          f.hidden = false;
        } else {
          f.hidden = true;
        }
      });
    });
  }; // stageStart

  ActionStatus.prototype.stageProgress = function (stage, value, max) {
    if (Number.isFinite (value) && Number.isFinite (max)) {
      this.stages[stage] = value / (max || 1);
    } else {
      this.stages[stage] = 0;
    }
    this.elements.forEach ((e) => {
      e.querySelectorAll ('progress').forEach ((f) => {
        var stages = Object.keys (this.stages);
        f.max = stages.length;
        var v = 0;
        stages.forEach ((s) => v += this.stages[s]);
        f.value = v;
      });
    });
  }; // stageProgress

  ActionStatus.prototype.stageEnd = function (stage) {
    this.stages[stage] = 1;
    this.elements.forEach ((e) => {
      e.querySelectorAll ('progress').forEach ((f) => {
        var stages = Object.keys (this.stages);
        f.max = stages.length;
        var v = 0;
        stages.forEach ((s) => v += this.stages[s]);
        f.value = v;
      });
    });
  }; // stageEnd

  ActionStatus.prototype.end = function (opts) {
    this.elements.forEach ((e) => {
      var shown = false;
      var msg;
      var status;
      var err = null;
      if (opts.ok) {
        msg = e.getAttribute ('ok');
      } else { // not ok
        if (opts.error) {
          err = msg = opts.error;
          console.log (opts.error.stack); // for debugging
        } else {
          msg = e.getAttribute ('ng') || 'Failed';
          err = new Error (msg);
        }
      }
      e.querySelectorAll ('action-status-message').forEach ((f) => {
        if (msg) {
          f.textContent = msg;
          f.hidden = false;
          shown = true;
        } else {
          f.hidden = true;
        }
        // XXX set timer to clear ok message
      });
      e.querySelectorAll ('progress').forEach ((f) => f.hidden = true);
      e.hidden = !shown;
      e.setAttribute ('status', opts.ok ? 'ok' : 'ng');
      if (err) {
        var ev = new Event ('error');
        ev.pcError = err;
        e.dispatchEvent (ev);
      }
    });
    if (!opts.ok) setTimeout (() => { throw opts.error }, 0); // invoke onerror
  }; // end

  commonMethods.pcActionStatus = function () {
    var elements = this.querySelectorAll ('action-status');
    elements.forEach (function (e) {
      if (e.hasChildNodes ()) return;
      e.hidden = true;
      e.innerHTML = '<action-status-message></action-status-message> <progress></progress>';
    });
    return new ActionStatus (elements);
  }; // pcActionStatus

  defineElement ({
    name: 'template-set',
    props: {
      pcInit: function () {
        var name = this.getAttribute ('name');
        if (!name) {
          throw new Error
          ('|template-set| element does not have |name| attribute');
        }
        addElementDef ('templateSet', name, this);
        initTemplateSet (this);
      }, // pcInit
    },
  }); // <template-set>

  defs.templateselector["default"] = function (templates) {
    return templates[""];
  }; // empty

  defs.filltype["enum-value"] = 'contentattribute';
  defineElement ({
    name: 'enum-value',
    props: {
      pcInit: function () {
        var mo = new MutationObserver ((mutations) => this.evRender ());
        mo.observe (this, {attributes: true, attributeFilter: ['value']});
        this.evRender ();
      }, // pcInit
      evRender: function () {
        var value = this.getAttribute ('value');
        if (value === null) {
          this.hidden = true;
        } else {
          this.hidden = false;
          var label = this.getAttribute ('label-' + value);
          if (label === null) {
            this.textContent = value;
          } else {
            this.textContent = label;
          }
        }
      }, // evRender
    }, // props
  }); // <enum-value>

  defineElement ({
    name: 'button',
    is: 'command-button',
    props: {
      pcInit: function () {
        this.addEventListener ('click', () => this.cbClick ());
      }, // pcInit
      cbClick: function () {
        var selector = this.getAttribute ('data-selector');
        var selected = document.querySelector (selector);
        if (!selected) {
          throw new Error ("Selector |"+selector+"| does not match any element in the document");
        }
        
        var command = this.getAttribute ('data-command');
        var cmd = selected.cbCommands ? selected.cbCommands[command] : undefined;
        if (!cmd) throw new Error ("Command |"+command+"| not defined");

        selected[command] ();
      }, // cbClick
    },
  }); // button[is=command-button]

  defineElement ({
    name: 'button',
    is: 'mode-button',
    props: {
      pcInit: function () {
        this.addEventListener ('click', () => this.mbClick ());

        this.getRootNode ().addEventListener ('pcModeChange', (ev) => {
          if (ev.mode !== this.name) return;
          
          var selector = this.getAttribute ('data-selector');
          var selected = document.querySelector (selector);
          if (!selected) return;
          if (selected !== ev.target) return;

          var name = this.name;
          if (!name) return;

          this.classList.toggle ('selected', selected[name] == this.value);
        });
        // XXX disconnect

        var selector = this.getAttribute ('data-selector');
        var selected = document.querySelector (selector);
        var name = this.name;
        if (selected && name) {
          this.classList.toggle ('selected', selected[name] == this.value);
        }
      }, // pcInit
      mbClick: function () {
        var selector = this.getAttribute ('data-selector');
        var selected = document.querySelector (selector);
        if (!selected) {
          throw new Error ("Selector |"+selector+"| does not match any element in the document");
        }

        var name = this.name;
        if (!name) {
          throw new Error ("The |mode-button| element has no name");
        }
        
        selected[name] = this.value;
      }, // mbClick
    },
  }); // button[is=mode-button]

  function parseCSSString (cssText, defaultText) {
    var t = (cssText || 'auto');

    // XXX
    t = t.replace (/\\(00[89A-Fa-f][0-9A-Fa-f]|[1-9A-Fa-f][0-9A-Fa-f]{3}|[1-9A-Fa-f][0-9A-Fa-f]{4})/g,
                   (__, _) => String.fromCodePoint (parseInt (_, 16)));
    
    var m = t.match (/^\s*"([^"\\]*)"\s*$/); // XXX escape
    if (m) {
      return m[1];
    }

    var m = t.match (/^\s*'([^'\\]*)'\s*$/); // XXX escape
    if (m) {
      return m[1];
    }

    return defaultText;
  } // parseCSSString
  pcInternal.parseCSSString = parseCSSString;
  
  var copyText = navigator.clipboard ? s => {
    return navigator.clipboard.writeText (s);
  } : function (s) { // for insecure context
    var e = document.createElement ('temp-text');
    e.style.whiteSpace = "pre";
    e.textContent = s;
    document.body.appendChild (e);
    var range = document.createRange ();
    range.selectNode (e);
    getSelection ().empty ();
    getSelection ().addRange (range);
    document.execCommand ('copy');
    // empty string cannot be copied
    e.parentNode.removeChild (e);
    // return undefined
  }; // copyText

  async function copyTextWithToast (e, s) {
    await copyText (s);

    // recompute!
    var m = parseCSSString (getComputedStyle (e).getPropertyValue ('--paco-copied-message'), 'Copied!');
    exportable.$paco.showToast ({text: m, className: 'paco-copied'});
  } // copyTextWithToast

  defineElement ({
    name: 'a',
    is: 'copy-url',
    props: {
      pcInit: function () {
        this.onclick = () => { copyTextWithToast (this, this.href); return false };
      }, // pcInit
    },
  }); // <a is=copy-url>

  defineElement ({
    name: 'button',
    is: 'copy-text-content',
    props: {
      pcInit: function () {
        this.onclick = () => this.pcClick ();
      }, // pcInit
      pcClick: function () {
        var selector = this.getAttribute ('data-selector');
        var selected = document.querySelector (selector);
        if (!selected) {
          throw new Error ("Selector |"+selector+"| does not match any element in the document");
        }

        copyTextWithToast (this, selected.textContent);
      }, // pcClick
    },
  }); // <button is=copy-text-content>

  defineElement ({
    name: 'can-copy',
    props: {
      pcInit: function () {
        // recompute!
        var m = parseCSSString (getComputedStyle (this).getPropertyValue ('--paco-copy-button-label'), 'Copy');

        var b = document.createElement ('button');
        b.type = 'button';
        b.textContent = m;
        b.onclick = () => this.pcCopy ();
        this.appendChild (b);
      }, // pcInit
      pcCopy: function () {
        var e = this.querySelector ('code, data, time');
        if (!e) throw new Error ('No copied data element');

        var text;

        // recompute!
        var t = getComputedStyle (e).getPropertyValue ('--paco-copy-format') || 'auto';
        if (/^\s*unix-tz-json\s*$/.test (t)) {
          var d = {};
          var dt = new Date (e.getAttribute ('datetime') || e.textContent);
          d.unix = dt.valueOf () / 1000; // or NaN
          var tz = parseFloat (e.getAttribute ('data-tzoffset'));
          if (Number.isFinite (tz)) d.tzOffset = tz;
          text = JSON.stringify (d);
        } else {
          text = e.textContent;
        }

        copyTextWithToast (this, text);
      }, // pcCopy
    }, // props
  }); // <can-copy>

  defineElement ({
    name: 'popup-menu',
    props: {
      pcInit: function () {
        this.addEventListener ('click', (ev) => this.pmClick (ev));
        var mo = new MutationObserver ((mutations) => {
          this.pmToggle (this.hasAttribute ('open'));
        });
        mo.observe (this, {attributes: true, attributeFilter: ['open']});
        setTimeout (() => {
          if (this.hasAttribute ('open') && !this.pmGlobalClickHandler) {
            this.pmToggle (true);
          }
        }, 100);

        // recompute!
        var s = getComputedStyle (this);
        var ha = s.getPropertyValue ('--paco-hover-action') || '';
        if (/^\s*open\s*$/.test (ha)) {
          this.addEventListener ('mouseover', function () {
            if (!this.hasAttribute ('open')) {
              this.setAttribute ('open', '');
              this.pcSetOpenByHover = true;
              var ev = new Event ('click');
              ev.pmEventHandledBy = this;
              window.dispatchEvent (ev);
            }
          });
        }
      }, // pcInit
      pmClick: function (ev) {
        var current = ev.target;
        var targetType = 'outside';
        while (current) {
          if (current === this) {
            targetType = 'this';
            break;
          } else if (current.localName === 'button') {
            if (current.parentNode === this) {
              targetType = 'button';
              break;
            } else if (current.parentNode.localName === 'popup-menu') {
              targetType = 'submenu';
              break;
            } else {
              targetType = 'command';
              break;
            }
          } else if (current.localName === 'a') {
            targetType = 'command';
            break;
          } else if (current.localName === 'menu-main' &&
                     current.parentNode === this) {
            targetType = 'menu';
            break;
          }
          current = current.parentNode;
        } // current

        if (targetType === 'button') {
          if (this.pcOpenByHover && this.hasAttribute ('open')) {
            delete this.pcOpenByHover;
          } else {
            this.toggle ();
          }
        } else if (targetType === 'menu' || targetType === 'submenu') {
          ev.stopPropagation ();
        } else {
          ev.stopPropagation ();
          this.toggle (false);
        }
        ev.pmEventHandledBy = this;
      }, // pmClick

      toggle: function (show) {
        if (show === undefined) {
          show = !this.hasAttribute ('open');
        }
        if (show) {
          this.setAttribute ('open', '');
        } else {
          this.removeAttribute ('open');
        }
      }, // toggle
      pmToggle: function (show) {
        if (show) {
          if (!this.pmGlobalClickHandler) {
            this.pmGlobalClickHandler = (ev) => {
              var p = ev.pmEventHandledBy;
              while (p) {
                if (p === this) return;
                p = p.parentNode;
              }
              this.toggle (false);
            };
            window.addEventListener ('click', this.pmGlobalClickHandler);
            this.pmLayout ();
          }
        } else {
          if (this.pmGlobalClickHandler) {
            window.removeEventListener ('click', this.pmGlobalClickHandler);
            delete this.pmGlobalClickHandler;

            var ev = new Event ('toggle', {bubbles: true});
            this.dispatchEvent (ev);
          }
        }
        delete this.pcOpenByHover;
        if (this.pcSetOpenByHover) {
          this.pcOpenByHover = true;
          delete this.pcSetOpenByHover;
        }
      }, // pmToggle

      pmLayout: function () {
        if (!this.hasAttribute ('open')) return;
      
        var button = this.querySelector ('button');
        var menu = this.querySelector ('menu-main');
        if (!button || !menu) return;

        menu.style.top = 'auto';
        menu.style.left = 'auto';
        var menuWidth = menu.offsetWidth;
        var menuTop = menu.offsetTop;
        var menuHeight = menu.offsetHeight;
        if (getComputedStyle (menu).direction === 'rtl') {
          var parent = menu.offsetParent || document.documentElement;
          if (button.offsetLeft + menuWidth > parent.offsetWidth) {
            menu.style.left = button.offsetLeft + button.offsetWidth - menuWidth + 'px';
          } else {
            menu.style.left = button.offsetLeft + 'px';
          }
        } else {
          var right = button.offsetLeft + button.offsetWidth;
          if (right > menuWidth) {
            menu.style.left = (right - menuWidth) + 'px';
          } else {
            menu.style.left = 'auto';
          }
        }

        var ev = new Event ('toggle', {bubbles: true});
        this.dispatchEvent (ev);
      }, // pmLayout
    },
  }); // popup-menu

  defineElement ({
    name: 'tab-set',
    props: {
      pcInit: function () {
        this.pcInitialURL = location.href;
        Promise.resolve ().then (() => {
          this.tsInit ({});
          this.setAttribute ('ready', '');
        });
        new MutationObserver (() => this.tsInit ({})).observe (this, {childList: true});

        if (!window.pcTSListenersInstalled) {
          window.pcTSListenersInstalled = true;
          window.addEventListener ('hashchange', () => {
            document.querySelectorAll ('tab-set').forEach (e => {
              Promise.resolve ().then (() => e.tsShowTabByURL ({initiatorType: 'url'}));
            });
          });
          window.addEventListener ('pcLocationChange', (ev) => {
            document.querySelectorAll ('tab-set').forEach (e => {
              Promise.resolve ().then (() => e.tsShowTabByURL ({initiator: ev.pcInitiator, initiatorType: 'url'}));
            });
          });
        }
      }, // pcInit
      tsInit: function (opts) {
        var tabMenu = null;
        var tabSections = [];
        Array.prototype.forEach.call (this.children, function (f) {
          if (f.localName === 'section') {
            tabSections.push (f);
          } else if (f.localName === 'tab-menu') {
            tabMenu = f;
          }
        });
      
        if (!tabMenu) return;

        var x = null;
        Array.prototype.slice.call (tabMenu.childNodes).forEach (e => {
          if (e.localName === 'tab-menu-extras') {
            x = x || e;
          } else {
            e.remove ();
          }
        });
        tabSections.forEach ((f) => {
          var header = f.querySelector ('h1');
          var a = document.createElement ('a');
          var path = f.getAttribute ('data-pjax');
          if (!path && f.id) {
            path = '#' + encodeURIComponent (f.id);
          }
          a.href = 'javascript:';
          if (path !== null) {
            try {
              a.href = new URL (path, this.pcInitialURL);
            } catch (e) { } // e.g. <about:srcdoc>
          }
          a.onclick = () => {
            this.tsShowTab (a.tsSection, {initiatorType: 'tab'});
            return false;
          };
          a.textContent = header ? header.textContent : '§';
          a.className = f.getAttribute ('data-tab-button-class') || '';
          if (f.classList.contains ('active')) a.classList.add ('active');
          a.tsSection = f;
          tabMenu.insertBefore (a, x);
        });

        this.tsShowTabByURL ({initiatorType: null});
      }, // tsInit
      tsShowTabByURL: function (opts) {
        if (opts.initiator === this) return;
        var tabSections = [];
        Array.prototype.forEach.call (this.children, function (f) {
          if (f.localName === 'section') {
            tabSections.push (f);
          }
        });
        var currentURL = location.href;
        var currentPageURL = currentURL.replace (/#.+$/, '');
        var initial = null;
        var matchedTabSections = [];
        tabSections.forEach (f => {
          var path = f.getAttribute ('data-pjax');
          if (!path && f.id) {
            path = '#' + encodeURIComponent (f.id);
          }
          if (path !== null) {
            try {
              var url = new URL (path, this.pcInitialURL);
              if (url.href === currentURL) {
                initial = f;
              } else if (url.href === currentPageURL) {
                initial = initial || f;
              }
              if (this.pcLastSelectedTabURL &&
                  this.pcLastSelectedTabURL === url.href) {
                matchedTabSections.push (f);                
              }
            } catch (e) { } // e.g. <about:srcdoc>
          }
          var paths = (f.getAttribute ('data-pjax-selecting') || "").split (/\s+/).filter (_ => _.length);
          paths.forEach (path => {
            try {
              var url = new URL (path, this.pcInitialURL);
              if (url.href === currentURL) {
                initial = initial || f;
              } else if (url.href === currentPageURL) {
                initial = initial || f;
              } else if (/#/.test (currentURL) &&
                         currentURL.substring (0, url.href.length) === url.href) {
                initial = initial || f;
              }
            } catch (e) { } // e.g. <about:srcdoc>
          });
        });
        if ((!initial || !opts.initiatorType) && matchedTabSections.length) {
          initial = matchedTabSections[0];
        }
        if (!initial) {
          var hasActive = false;
          var nonActive = tabSections.filter (t => {
            if (t.classList.contains ('active')) {
              hasActive = true;
              return false;
            } else {
              return true;
            }
          });
          if (!hasActive) initial = nonActive[0]; // or undefined
        }
        if (initial) this.tsShowTab (initial, {initiatorType: opts.initiatorType});
      }, // tsShowTabByURL
      tsShowTab: function (f, opts) {
        var tabMenu = null;
        var tabSections = [];
        Array.prototype.forEach.call (this.children, function (f) {
          if (f.localName === 'section') {
            tabSections.push (f);
          } else if (f.localName === 'tab-menu') {
            tabMenu = f;
          }
        });

        tabMenu.querySelectorAll ('a').forEach ((g) => {
          g.classList.toggle ('active', g.tsSection === f);
        });
        tabSections.forEach ((g) => {
          g.classList.toggle ('active', f === g);
        });
        var path = f.getAttribute ('data-pjax');
        if (!path && f.id) {
          path = '#' + encodeURIComponent (f.id);
        }
        if (path !== null) {
          try {
            var x = location;
            var y = new URL (path, this.pcInitialURL);
            if (x.hash && y.hash === '') y += x.hash;
            
            if (x.href !== y.href) {
              history.replaceState (null, null, y);
              var evc = new Event ('pcLocationChange', {bubbles: true});
              evc.pcInitiator = this;
              Promise.resolve ().then (() => window.dispatchEvent (evc));
              if (opts.initiatorType === 'tab') {
                this.pcLastSelectedTabURL = y.href;
              }
            }
          } catch (e) { } // e.g. <about:srcdoc>
        }
        var ev = new Event ('show', {bubbles: true});
        Promise.resolve ().then (() => f.dispatchEvent (ev));
      }, // tsShowTab
    },
  }); // tab-set

  defineElement ({
    name: 'sub-window',
    props: {
      pcInit: function () {
        Object.defineProperty (this, 'mode', {
          get: () => this.pcMode,
          set: (newValue) => this.pcSetMode (newValue),
        });
        
        this.querySelectorAll ('button[data-sub-window-action]').forEach (_ => {
          _.onclick = () => this.pcRunAction (_.getAttribute ('data-sub-window-action'));
        });
        
        this.pcMinimized = this.querySelector ('sub-window-minimized') || document.createElement ('sub-window-minimized');
        this.pcMinimized.remove ();

        this.pcSetMode ('default');
      }, // pcInit
      pcRunAction: function (action) {
        if (action === 'minimize') {
          return this.pcSetMode ('minimized');
        } else if (action === 'unminimize') {
          return this.pcSetMode ('default');
        } else {
          throw new Error ('Unknown sub-window action type |'+action+'|');
        }
      }, // pcRunAction
      pcMinimizedContainer: function () {
        var c = document.querySelector ('sub-window-minimized-container');
        if (!c) {
          c = document.createElement ('sub-window-minimized-container');
          document.body.appendChild (c);
        }
        return c;
      }, // pcMinimizedContainer
      pcSetMode: function (newMode) {
        if (this.pcMode === newMode) return;
        this.pcMode = newMode;
        this.hidden = newMode === 'minimized';
        if (newMode === 'minimized') {
          this.pcMinimizedContainer ().appendChild (this.pcMinimized);
        } else {
          this.pcMinimized.remove ();
        }
        return Promise.resolve ().then (() => {
          if (!this.pcSetDimension) return;
          return this.pcSetDimension (); // or throw
        });
      }, // pcSetMode
    },
  }); // <sub-window>

  // <toast-group>
  exportable.$paco.showToast = function (opts) {
    var g = document.querySelector ('toast-group');
    if (!g) {
      g = document.createElement ('toast-group');
      (document.body || document.head || document.documentElement).appendChild (g);
    }

    var b = document.createElement ('toast-box');
    if (opts.className != null) b.className = opts.className;

    g.appendChild (b);

    if (opts.fragment) {
      b.appendChild (opts.fragment);
    } else { // no opts.fragment
      // recompute!
      var t = parseCSSString (getComputedStyle (b).getPropertyValue ('--paco-close-button-label'), '\u00D7');
      
      var h = document.createElement ('toast-box-header');
      var button = document.createElement ('button');
      button.type = 'button';
      button.setAttribute ('is', 'toast-close-button');
      button.textContent = t;
      h.appendChild (button);
      b.appendChild (h);

      var m = document.createElement ('toast-box-main');
      m.textContent = opts.text;
      b.appendChild (m);
    } // no opts.fragment

    return b;
  }; // showToast

  defineElement ({
    name: 'toast-box',
    props: {
      pcInit: function () {
        this.querySelectorAll ('button[is=toast-close-button]').forEach (_ => {
          _.onclick = () => this.pcClose ();
        });

        // recompute!
        var v = getComputedStyle (this).getPropertyValue ('--paco-toast-autoclose') || 'auto';
        if (/^\s*none\s*$/.test (v)) {
          //
        } else {
          var s = NaN;
          if (/^\s*[0-9.+-]+s\s*$/.test (v)) {
            s = parseFloat (v) * 1000;
          } else if (/^\s*[0-9.+-]+ms\s*$/.test (v)) {
            s = parseFloat (v);
          }
          if (!Number.isFinite (s) || s <= 0) s = 5*1000;
          setTimeout (() => this.pcClose (), s);
        }

        this.addEventListener ('pcDone', () => this.pcClose (), {once: true});
      }, // pcInit
      pcClose: function () {
        this.remove ();
      }, // pcClose
    },
  }); // <toast-box>
  
  defs.loader.src = function (opts) {
    if (!this.hasAttribute ('src')) return {};
    var url = this.getAttribute ('src');
    if (opts.ref) {
      url += /\?/.test (url) ? '&' : '?';
      url += 'ref=' + encodeURIComponent (opts.ref);
    }
    if (opts.limit) {
      url += /\?/.test (url) ? '&' : '?';
      url += 'limit=' + encodeURIComponent (opts.limit);
    }
    return fetch (url, {
      credentials: "same-origin",
    }).then ((res) => res.json ()).then ((json) => {
      if (!this.hasAttribute ('key')) throw new Error ("|key| is not specified");
      json = json || {};
      return {
        data: json[this.getAttribute ('key')],
        prev: {ref: json.prev_ref, has: json.has_prev, limit: opts.limit},
        next: {ref: json.next_ref, has: json.has_next, limit: opts.limit},
      };
    }).catch (e => exportable.$paco.catchFetchError (e, {
      url: url,
    }));
  }; // loader=src

  defs.filter["default"] = function (data) {
    var list = data.data;
    if (!Array.isArray (list)) {
      list = Object.values (list);
    }
    // XXX sort=""
    return {
      data: list,
      prev: data.prev,
      next: data.next,
    };
  }; // filter=default

  defineElement ({
    name: 'list-container',
    pcActionStatus: true,
    props: {
      pcInit: function () {
        var selector = 'a.list-prev, a.list-next, button.list-prev, button.list-next, ' + this.lcGetListContainerSelector ();
      new MutationObserver ((mutations) => {
        mutations.forEach ((m) => {
          Array.prototype.forEach.call (m.addedNodes, (e) => {
            if (e.nodeType === e.ELEMENT_NODE) {
              if (e.matches (selector) || e.querySelector (selector)) {
                this.pcClearListContainer ();
                this.lcDataChanges.changed = true;
                this.lcRequestRender ();
              }
            }
          });
        });
      }).observe (this, {childList: true, subtree: true});

      this.addEventListener ('pctemplatesetupdated', (ev) => {
        this.lcTemplateSet = ev.pcTemplateSet;
        this.pcClearListContainer ();
        if (this.lcDataChanges) this.lcDataChanges.changed = true;
        this.lcRequestRender ();
      });
        this.load ({});
      }, // pcInit

      lcGetNextInterval: function (currentInterval) {
        if (!currentInterval) return 10 * 1000;
        var interval = currentInterval * 2;
        if (interval > 10*60*1000) interval * 10*60*1000;
        return interval;
      }, // lcGetNextInterval
      load: function (opts) {
        if (!opts.page || opts.replace) {
          this.lcClearList ();
          this.pcNeedClearListContainer = true;
        }
        return this.lcLoad (opts).then ((done) => {
          if (done) {
            this.lcDataChanges.scroll = opts.scroll;
            return this.lcRequestRender ();
          }
        }).then (() => {
          if (!this.hasAttribute ('autoreload')) return;
          var interval = this.lcGetNextInterval (opts.arInterval);
          clearTimeout (this.lcAutoReloadTimer);
          this.lcAutoReloadTimer = setTimeout (() => {
            this.load ({arInterval: interval});
          }, interval);
        }, (e) => {
          if (!this.hasAttribute ('autoreload')) return;
          var interval = this.lcGetNextInterval (opts.arInterval);
          clearTimeout (this.lcAutoReloadTimer);
          this.lcAutoReloadTimer = setTimeout (() => {
            this.load ({arInterval: interval});
          }, interval);
          throw e;
        });
      }, // load
      loadPrev: function (opts2) {
        var opts = {};
        Object.keys (this.lcPrev).forEach (_ => opts[_] = this.lcPrev[_]);
        Object.keys (opts2 || {}).forEach (_ => opts[_] = opts2[_]);
        return this.load (opts);
      }, // loadPrev
      loadNext: function (opts2) {
        var opts = {};
        Object.keys (this.lcNext).forEach (_ => opts[_] = this.lcNext[_]);
        Object.keys (opts2 || {}).forEach (_ => opts[_] = opts2[_]);
        return this.load (opts);
      }, // loadNext
      lcClearList: function () {
        this.lcData = [];
        this.lcDataChanges = {append: [], prepend: [], changed: false};
        this.lcPrev = {};
        this.lcNext = {};
      }, // lcClearList
      pcClearListContainer: function () {
        var listContainer = this.lcGetListContainer ();
        if (!listContainer) return;
        if (listContainer.localName === 'tab-set') {
          Array.prototype.slice.call (listContainer.childNodes).forEach (n => {
            if (n.localName !== 'tab-menu') n.remove ();
          });
        } else {
          listContainer.textContent = '';
        }
      }, // pcClearListContainer
      lcGetListContainerSelector: function () {
        var type = this.getAttribute ('type');
        if (type === 'table') {
          return 'tbody';
        } else if (type === 'tab-set') {
          return 'tab-set';
        } else if (type === 'ul' || type === 'ol') {
          return type;
        } else {
          return 'list-main';
        }
      }, // lcGetListContainerSelector
      lcGetListContainer: function () {
        return this.querySelector (this.lcGetListContainerSelector ());
      }, // lcGetListContainer
      
      lcLoad: function (opts) {
        var resolve;
        var reject;
        this.loaded = new Promise ((a, b) => {
          resolve = a;
          reject = b;
        });
        this.loaded.catch ((e) => {}); // set [[handled]] true (the error is also reported by ActionStatus)
        var as = this.pcActionStatus ();
        as.start ({stages: ['loader', 'filter', 'render']});
        as.stageStart ('loader');
        this.querySelectorAll ('list-is-empty').forEach ((e) => {
          e.hidden = true;
        });
        return getDef ("loader", this.getAttribute ('loader') || 'src').then ((loader) => {
          return loader.call (this, opts);
        }).then ((result) => {
          as.stageEnd ('loader');
          as.stageStart ('filter');
          return getDef ("filter", this.getAttribute ('filter') || 'default').then ((filter) => {
            return filter.call (this, result);
          });
        }).then ((result) => {
          var newList = result.data || [];
          var prev = (opts.page === 'prev' ? result.next : result.prev) || {};
          var next = (opts.page === 'prev' ? result.prev : result.next) || {};
          prev = {
            has: prev.has,
            ref: prev.ref,
            limit: prev.limit,
            page: 'prev',
          };
          next = {
            has: next.has,
            ref: next.ref,
            limit: next.limit,
            page: 'next',
          };
          if (this.hasAttribute ('reverse')) {
            newList = newList.reverse ();
            if (opts.page === 'prev' && !opts.replace) {
              newList = newList.reverse ();
              this.lcData = newList.concat (this.lcData);
              this.lcDataChanges.append
                  = this.lcDataChanges.append.concat (newList);
              this.lcPrev = prev;
            } else if (opts.page === 'next' && !opts.replace) {
              this.lcData = this.lcData.concat (newList);
              this.lcDataChanges.prepend
                  = newList.concat (this.lcDataChanges.prepend);
              this.lcNext = next;
            } else {
              this.lcData = newList;
              this.lcDataChanges = {prepend: [], append: [], changed: true};
              this.lcPrev = prev;
              this.lcNext = next;
            }
          } else { // not reverse
            if (opts.page === 'prev' && !opts.replace) {
              newList = newList.reverse ();
              this.lcData = newList.concat (this.lcData);
              this.lcDataChanges.prepend
                  = newList.concat (this.lcDataChanges.prepend);
              this.lcPrev = prev;
            } else if (opts.page === 'next' && !opts.replace) {
              this.lcData = this.lcData.concat (newList);
              this.lcDataChanges.append
                  = this.lcDataChanges.append.concat (newList);
              this.lcNext = next;
            } else {
              this.lcData = newList;
              this.lcDataChanges = {prepend: [], append: [], changed: true};
              this.lcPrev = prev;
              this.lcNext = next;
            }
          }
          as.end ({ok: true});
          resolve ();
          return true;
        }).catch ((e) => {
          reject (e);
          as.end ({error: e});
          return false;
        });
      }, // lcLoad

      lcRequestRender: function () {
        clearTimeout (this.lcRenderRequestedTimer);
        this.lcRenderRequested = true;
        this.lcRenderRequestedTimer = setTimeout (() => {
          if (!this.lcRenderRequested) return;
          this.lcRender ();
          this.lcRenderRequested = false;
        }, 0);
      }, // lcRequestRender
      lcRender: function () {
        if (!this.lcTemplateSet) return;

        var listContainer = this.lcGetListContainer ();
        if (!listContainer) return;

        if (this.pcNeedClearListContainer) {
          this.pcClearListContainer ();
          delete this.pcNeedClearListContainer;
        }

        this.querySelectorAll ('a.list-prev, button.list-prev').forEach ((e) => {
          e.hidden = ! this.lcPrev.has;
          if (e.localName === 'a') {
            e.href = this.lcPrev.linkURL || 'javascript:';
          }
          e.onclick = () => { this.loadPrev ({
            scroll: e.getAttribute ('data-list-scroll'),
            replace: e.hasAttribute ('data-list-replace'),
          }); return false };
        });
        this.querySelectorAll ('button.list-reload').forEach (e => {
          e.onclick = () => this.load ({});
        });
        this.querySelectorAll ('a.list-next, button.list-next').forEach ((e) => {
          e.hidden = ! this.lcNext.has;
          if (e.localName === 'a') {
            e.href = this.lcNext.linkURL || 'javascript:';
          }
          e.onclick = () => { this.loadNext ({
            scroll: e.getAttribute ('data-list-scroll'),
            replace: e.hasAttribute ('data-list-replace'),
          }); return false };
        });
        var hasListItem = this.lcData.length > 0;
        this.querySelectorAll ('list-is-empty').forEach ((e) => {
          e.hidden = hasListItem;
        });
        if (this.hasAttribute ('hascontainer')) {
          var e = this.parentNode;
          while (e && e.localName !== 'section') {
            e = e.parentNode;
          }
          if (e && e.localName === 'section') {
            e.hidden = !hasListItem;
          }
        }

      var tm = this.lcTemplateSet;
      var changes = this.lcDataChanges;
      this.lcDataChanges = {changed: false, prepend: [], append: []};
        var itemLN = {
          tbody: 'tr',
          'tab-set': 'section',
          ul: 'li',
          ol: 'li',
        }[listContainer.localName] || 'list-item';
      return Promise.resolve ().then (() => {
        if (changes.changed) {
          return $promised.forEach ((object) => {
            var e = tm.createFromTemplate (itemLN, object);
            listContainer.appendChild (e);
          }, this.lcData);
        } else {
          var scrollRef;
          var scrollRefTop;
          if (changes.scroll === 'preserve') {
            scrollRef = listContainer.firstElementChild;
          }
          if (scrollRef) scrollRefTop = scrollRef.offsetTop;
          var f = document.createDocumentFragment ();
          return Promise.all ([
            $promised.forEach ((object) => {
              var e = tm.createFromTemplate (itemLN, object);
              f.appendChild (e);
            }, changes.prepend).then (() => {
              listContainer.insertBefore (f, listContainer.firstChild);
            }),
            $promised.forEach ((object) => {
              var e = tm.createFromTemplate (itemLN, object);
              listContainer.appendChild (e);
            }, changes.append),
          ]).then (() => {
            if (scrollRef) {
              var delta = scrollRef.offsetTop - scrollRefTop;
              // XXX nearest scrollable area
              if (delta) document.documentElement.scrollTop += delta;
            }
          });
        }
        }).then (() => {
          this.dispatchEvent (new Event ('pcRendered', {bubbles: true}));
        });
      }, // lcRender
    },
    templateSet: true,
  }); // list-container

  defineElement ({
    name: 'form',
    is: 'save-data',
    pcActionStatus: true,
    props: {
      pcInit: function () {
        this.sdCheck ();
        this.addEventListener ('click', (ev) => {
          var e = ev.target;
          while (e) {
            if (e.localName === 'button') break;
            // |input| buttons are intentionally not supported
            if (e === this) {
              e = null;
              break;
            }
            e = e.parentNode;
          }
          this.sdClickedButton = e;
        });
        this.addEventListener ('change', (ev) => {
          this.setAttribute ('data-pc-modified', '');
        });
        this.onsubmit = function () {
          this.sdCheck ();

          if (this.hasAttribute ('data-confirm')) {
            if (!confirm (this.getAttribute ('data-confirm'))) return false;
          }
          
          var fd = new FormData (this);
          if (this.sdClickedButton) {
            if (this.sdClickedButton.name &&
                this.sdClickedButton.type === 'submit') {
              fd.append (this.sdClickedButton.name, this.sdClickedButton.value);
            }
            this.sdClickedButton = null;
          }

          this.pc_cantSendFocus = true;
          var disabledControls = this.querySelectorAll
              ('input:enabled, select:enabled, textarea:enabled, button:enabled');
          var customControls = this.querySelectorAll ('[formcontrol]:not([disabled])');
          disabledControls.forEach ((_) => _.setAttribute ('disabled', ''));
          customControls.forEach ((_) => _.setAttribute ('disabled', ''));

          var validators = (this.getAttribute ('data-validator') || '')
              .split (/\s+/)
              .filter (function (_) { return _.length });
          var nextActions = (this.getAttribute ('data-next') || '')
              .split (/\s+/)
              .filter (function (_) { return _.length })
              .map (function (_) {
                return _.split (/:/);
              });

          var as = this.pcActionStatus ();
          as.start ({stages: ['formdata', 'formvalidator', 'saver', 'formsaved']});
          as.stageStart ('formdata');
          
          $promised.forEach ((_) => {
            if (_.pcModifyFormData) {
              return _.pcModifyFormData (fd);
            } else {
              console.log (_, "No |pcModifyFormData| method");
              throw "A form control is not initialized";
            }
          }, customControls).then (() => {
            as.stageStart ('formvalidator');
            return $promised.forEach ((_) => {
              return getDef ("formvalidator", _).then ((handler) => {
                return handler.call (this, {
                  formData: fd,
                });
              });
            }, validators);
          }).then (() => {
            as.stageStart ('saver');
            return getDef ("saver", this.getAttribute ('data-saver') || 'form').then ((saver) => {
              return saver.call (this, fd);
            });
          }).then ((res) => {
            this.removeAttribute ('data-pc-modified');
            as.stageStart ('formsaved');
            var p;
            var getJSON = function () {
              return p = p || res.json ();
            };
            return $promised.forEach ((_) => {
              return getDef ("formsaved", _[0]).then ((handler) => {
                return handler.call (this, {
                  args: _,
                  response: res,
                  json: getJSON,
                });
              });
            }, nextActions);
          }).then (() => {
            disabledControls.forEach ((_) => _.removeAttribute ('disabled'));
            customControls.forEach ((_) => _.removeAttribute ('disabled'));
            as.end ({ok: true});

            var e = this.pc_focusToBeSent;
            if (e) Promise.resolve ().then (() => e.focus ());
            this.pc_cantSendFocus = false;
            this.pc_focusToBeSent = null;
          }).catch ((e) => {
            disabledControls.forEach ((_) => _.removeAttribute ('disabled'));
            customControls.forEach ((_) => _.removeAttribute ('disabled'));
            as.end ({error: e});
            
            this.pc_cantSendFocus = false;
            this.pc_focusToBeSent = null; // discard
          });
          return false;
        }; // onsubmit
      }, // sdInit
      sdCheck: function () {
        if (!this.hasAttribute ('action') &&
            !this.hasAttribute ('data-saver')) {
          console.log (this, 'Warning: form[is=save-data] does not have |action| attribute');
        }
        if (this.method !== 'post') {
          console.log (this, 'Warning: form[is=save-data] does not have |method| attribute whose value is |POST|');
        }
        if (this.hasAttribute ('enctype') &&
            this.enctype !== 'multipart/form-data') {
          console.log (this, 'Warning: form[is=save-data] have |enctype| attribute which is ignored');
        }
        if (this.hasAttribute ('target')) {
          console.log (this, 'Warning: form[is=save-data] have a |target| attribute');
        }
        if (this.hasAttribute ('onsubmit')) {
          console.log (this, 'Warning: form[is=save-data] have an |onsubmit| attribute');
        }
      }, // sdCheck

      pcSendFocus: function (e) {
        if (this.pc_cantSendFocus) {
          this.pc_focusToBeSent = e;
        } else {
          Promise.resolve ().then (() => e.focus ());
        }
      }, // pcSendFocus
    }, // props
  }); // <form is=save-data>

  defs.saver.form = function (fd) {
    return fetch (this.action, {
      credentials: 'same-origin',
      method: 'POST',
      referrerPolicy: 'same-origin',
      body: fd,
    }).then ((res) => {
      if (res.status !== 200) throw res;
      return res;
    }).catch (e => exportable.$paco.catchFetchError (e, {
      url: this.action,
      method: 'POST',
    }));
  }; // form

  defs.formsaved.reset = function (args) {
    this.reset ();
  }; // reset

  defs.formsaved.go = function (args) {
    return args.json ().then ((json) => {
      location.href = $fill.string (args.args[1], json);
      return new Promise (() => {});
    });
  }; // go

  defs.formsaved.focus = function (args) {
    var e = this.querySelector (args.args[1]);
    this.pcSendFocus (e);
  }; // focus

  defineElement ({
    name: 'before-unload-check',
    props: {
      pcInit: function () {
        window.addEventListener ('beforeunload', (ev) => {
          if (document.querySelector ('form[data-pc-modified]')) {
            ev.returnValue = '!';
          }
        });
        // XXX on disconnect
      }, // pcInit
    },
  }); // <before-unload-check>

  defineElement ({
    name: 'input-tzoffset',
    props: {
      pcInit: function () {
        this.setAttribute ('formcontrol', '');
        
        new MutationObserver ((mutations) => {
          this.pcRender ();
        }).observe (this, {childList: true});
        this.pcRequestRender ();

        var value = this.value !== undefined ? this.value : parseFloat (this.getAttribute ('value'));
        if (!Number.isFinite (value)) {
          if (this.hasAttribute ('platformvalue')) {
            value = -(new Date).getTimezoneOffset () * 60;
          } else {
            value = 0;
          }
        }
        Object.defineProperty (this, 'value', {
          get: () => value,
          set: (newValue) => {
            newValue = parseFloat (newValue);
            if (Number.isFinite (newValue) && value !== newValue) {
              value = newValue;
              this.pcRequestRender ();
            }
          },
        });
      }, // pcInit
      pcRequestRender: function () {
        this.pcRenderTimer = setTimeout (() => this.pcRender (), 0);
      }, // pcRequestRender
      pcRender: function () {
        var value = this.value;
        this.querySelectorAll ('select').forEach (c => {
          c.value = value >= 0 ? '+1' : '-1';
          c.required = true;
          c.onchange = () => {
            var v = this.value;
            if (c.value === '+1') {
              if (v < 0) this.value = -v;
            } else {
              if (v > 0) this.value = -v;
            }
          };
        });
        this.querySelectorAll ('input[type=time]').forEach (c => {
          c.valueAsNumber = (value >= 0 ? value : -value)*1000;
          c.required = true;
          c.onchange = () => {
            this.value = (this.value >= 0 ? c.valueAsNumber : -c.valueAsNumber) / 1000;
          };
        });
        this.querySelectorAll ('time').forEach (t => {
          t.setAttribute ('data-tzoffset', value);
        });

        this.querySelectorAll ('enum-value[data-tzoffset-type=sign]').forEach (t => {
          t.setAttribute ('value', value >= 0 ? 'plus' : 'minus');
        });
        this.querySelectorAll ('unit-number[data-tzoffset-type=time]').forEach (t => {
          t.setAttribute ('value', value >= 0 ? value : -value);
        });
        
        var pfValue = -(new Date).getTimezoneOffset () * 60;
        var pfDelta = value - pfValue;
        this.querySelectorAll ('enum-value[data-tzoffset-type=platformdelta-sign]').forEach (t => {
          t.setAttribute ('value', pfDelta >= 0 ? 'plus' : 'minus');
        });
        this.querySelectorAll ('unit-number[data-tzoffset-type=platformdelta-time]').forEach (t => {
          t.setAttribute ('value', pfDelta >= 0 ? pfDelta : -pfDelta);
        });
      }, // pcRender
      pcModifyFormData: function (fd) {
        var name = this.getAttribute ('name');
        if (!name) return;
        fd.append (name, this.value);
      }, // pcModifyFormData
    },
  }); // <input-tzoffset>
  defs.filltype["input-tzoffset"] = 'idlattribute';

  defineElement ({
    name: 'input-datetime',
    props: {
      pcInit: function () {
        this.setAttribute ('formcontrol', '');
        
        new MutationObserver ((mutations) => {
          this.pcRender ();
        }).observe (this, {childList: true});
        this.pcRequestRender ();

        var mo = new MutationObserver (() => {
          var newValue = parseFloat (this.getAttribute ('tzoffset'));
          if (Number.isFinite (newValue) && newValue !== this.pcValueTZ) {
            var v = this.value;
            this.pcValueTZ = newValue;
            setValue (v);
          }
        });
        mo.observe (this, {attributes: true, attributeFilter: ['tzoffset']});

        this.pcValueTZ = parseFloat (this.getAttribute ('tzoffset'));
        if (!Number.isFinite (this.pcValueTZ)) {
          this.pcValueTZ = -(new Date).getTimezoneOffset () * 60;
        }
        this.pcMinStep = 1;
        var setValue = (newValue) => {
          var d = new Date ((newValue + this.pcValueTZ) * 1000);
          this.pcValueDate = Math.floor (d.valueOf () / (24 * 60 * 60 * 1000)) * 24 * 60 * 60;
          this.pcValueTime = d.valueOf () / 1000 - this.pcValueDate;
          this.pcRequestRender ();
        }; // setValue
        
        var value = this.value !== undefined ? this.value : parseFloat (this.getAttribute ('value'));
        if (!Number.isFinite (value)) {
          setValue ((new Date).valueOf () / 1000); // now
          this.pcValueTime = 0;
        } else {
          setValue (value);
        }
        
        Object.defineProperty (this, 'value', {
          get: () => this.pcValueDate + this.pcValueTime - this.pcValueTZ,
          set: (newValue) => {
            newValue = parseFloat (newValue);
            if (Number.isFinite (newValue)) {
              setValue (newValue);
            }
          },
        });
      }, // pcInit
      pcRequestRender: function () {
        this.pcRenderTimer = setTimeout (() => this.pcRender (), 0);
      }, // pcRequestRender
      pcRender: function () {
        this.querySelectorAll ('input[type=date]').forEach (c => {
          c.valueAsNumber = this.pcValueDate * 1000;
          c.required = true;
          c.onchange = () => {
            this.pcValueDate = Math.floor (c.valueAsNumber / 1000);
            this.pcRequestRender ();
          };
        });
        this.querySelectorAll ('input[type=time]').forEach (c => {
          c.valueAsNumber = this.pcValueTime * 1000;
          c.required = true;
          c.onchange = () => {
            this.pcValueTime = c.valueAsNumber / 1000;
            this.pcRequestRender ();
          };
        });
        var valueDate = new Date (this.value * 1000);
        this.querySelectorAll ('time').forEach (t => {
          t.setAttribute ('datetime', valueDate.toISOString ());
        });
        
        this.querySelectorAll ('button[data-dt-type]').forEach (t => {
          t.onclick = () => this.pcHandleButton (t);
        });
      }, // pcRender
      pcHandleButton: function (button) {
        var type = button.getAttribute ('data-dt-type');
        if (type === 'set') {
          this.value = button.value;
        } else if (type === 'set-now') {
          this.value = (new Date).valueOf () / 1000;
        } else if (type === 'set-today') {
          var now = new Date;
          var lDay = new Date (now.toISOString ().replace (/T.*/, 'T00:00'));
          var uDay = new Date (now.toISOString ().replace (/T.*/, 'T00:00Z'));
          var delta = -now.getTimezoneOffset () * 60 - this.pcValueTZ;
          var time = (now.valueOf () - lDay.valueOf ()) / 1000;
          if (time >= delta) {
            this.value = uDay.valueOf () / 1000 - this.pcValueTZ;
          } else {
            this.value = uDay.valueOf () / 1000 - this.pcValueTZ - 24*60*60;
          }
        } else {
          throw new Error ('Unknown type: button[data-dt-type="'+type+'"]');
        }
        setTimeout (() => {
          this.dispatchEvent (new Event ('change', {bubbles: true}));
        }, 0);
      }, // pcHandleButton
      pcModifyFormData: function (fd) {
        var name = this.getAttribute ('name');
        if (!name) return;
        fd.append (name, this.value);
      }, // pcModifyFormData
    },
  }); // <input-datetime>
  defs.filltype["input-datetime"] = 'idlattribute';

  defineElement ({
    name: 'sandboxed-viewer',
    props: {
      pcInit: function () {
        this.pcMethods = {
          pcSetDimension: (args) => {
            //this.style.width = args.width + 'px';
            this.style.height = args.height + 'px';
            //console.log (args);
          }, // pcSetDimension
        };
        this.pcIFrame = document.createElement ('iframe');
        this.pcChannelOutsideKey = '' + Math.random ();
        this.pcChannelInsideKey = '' + Math.random ();
        this.pcIFrame.src = 'data:text/html;charset=utf-8,' + encodeURIComponent ('<!DOCTYPE HTML><script>onmessage=(ev)=>{if (ev.data&&ev.data[0]==="'+this.pcChannelOutsideKey+'"){new Function(ev.data[1])(ev.ports[0],"'+this.pcChannelInsideKey+'")}}</script>');
        this.pcIFrame.sandbox = 'allow-scripts allow-same-origin allow-forms ' + (this.getAttribute ('allowsandbox') || '');
        this.pcIFrame.allow = this.getAttribute ('allow') || '';
        this.pcIFrame.onload = () => this.pcCreateChannel ();
        this.appendChild (this.pcIFrame);
        this.ready = new Promise ((ok, ng) => {
          this.pcIsReady = ok;
        });
        if (this.hasAttribute ('seamlessheight')) {
          this.ready.then (() => this.pcSetSeamlessHeight ());
        }
      }, // pcInit
      pcCreateChannel: function () {
        var mp = new MessageChannel;
        this.pcIFrame.contentWindow.postMessage ([this.pcChannelOutsideKey, `
          var port = arguments[0];
          var insideKey = arguments[1];
          port.postMessage (insideKey);
          self.pcMethods = self.pcMethods || {};
          self.pcMethods.pcPing = (args) => {
            return args;
          };
          self.pcMethods.pcEval = (args) => {
            if (args.code == null) throw new TypeError ('|code| is not specified');
            var f = Object.getPrototypeOf (async function(){}).constructor (args.code);
            return f ();
          };
          self.pcRegisterMethod = (name, code) => {
            self.pcMethods[name] = code;
          };
          port.onmessage = (ev) => {
            var returnPort = ev.ports[0];
            return Promise.resolve ().then (() => {
              if (self.pcMethods[ev.data[0]]) {
                return self.pcMethods[ev.data[0]] (ev.data[1]);
              } else {
                throw new TypeError ('Unknown method |'+ev.data[0]+'| is invoked');
              }
            }).then ((r) => {
              returnPort.postMessage ({ok: true, result: r});
            }, (e) => {
              if (e instanceof Error) {
                returnPort.postMessage ({result: {
                  name: e.name,
                  message: e.message,
                }, error: true});
              } else {
                port.postMessage ({result: e});
              }
            }).then (() => returnPort.close ());
          }; // onmessage
          self.pcInvoke = function (method, args) {
            var returnChannel = new MessageChannel;
            return new Promise ((ok, ng) => {
              returnChannel.port1.onmessage = function (ev) {
                if (ev.data.ok) {
                  ok (ev.data.result);
                } else if (ev.data.error) {
                  var e = new Error (ev.data.result.message);
                  e.name = ev.data.result.name;
                  ng (e);
                } else {
                  ng (ev.data.result);
                }
                returnChannel.port1.close ();
              };
              port.postMessage ([method, args], [returnChannel.port2]);
            });
          }; // pcInvoke
        `], '*', [mp.port2]);
        mp.port1.onmessage = (ev) => {
          if (ev.data !== this.pcChannelInsideKey) {
            throw new Error ('Iframe sent back an invalid inside key |'+ev.data+'| (|'+this.pcChannelInsideKey+'| expected)');
          }
          mp.port1.onmessage = (ev) => {
            var returnPort = ev.ports[0];
            return Promise.resolve ().then (() => {
              if (this.pcMethods[ev.data[0]]) {
                return this.pcMethods[ev.data[0]] (ev.data[1]);
              } else {
                throw new TypeError ('Unknown method |'+ev.data[0]+'| is invoked');
              }
            }).then ((r) => {
              returnPort.postMessage ({ok: true, result: r});
            }, (e) => {
              if (e instanceof Error) {
                returnPort.postMessage ({result: {
                  name: e.name,
                  message: e.message,
                }, error: true});
              } else {
                port.postMessage ({result: e});
              }
            }).then (() => returnPort.close ());
          }; // onmessage
          this.pcChannelPort = mp.port1;
          if (this.pcIsReady) {
            this.pcIsReady ();
            delete this.pcIsReady;
          }
        }; // onmessage
      }, // pcCreateChannel
      pc_Invoke: function (method, args) {
        var returnChannel = new MessageChannel;
        return new Promise ((ok, ng) => {
          returnChannel.port1.onmessage = function (ev) {
            if (ev.data.ok) {
              ok (ev.data.result);
            } else if (ev.data.error) {
              var e = new Error (ev.data.result.message);
              e.name = ev.data.result.name;
              ng (e);
            } else {
              ng (ev.data.result);
            }
            returnChannel.port1.close ();
          };
          this.pcChannelPort.postMessage ([method, args], [returnChannel.port2]);
        });
      }, // pc_Invoke
      pcInvoke: function (method, args) {
        return new Promise ((ok, ng) => {
          this.pc_Invoke ('pcPing', {}).then (ok);
          setTimeout (ng, 1000);
        }).catch (() => {
          // Reconnect.  Safari can disconnect active MessageChannel
          // when e.g. a file picker dialog is shown...
          if (!this.pcIsReady) this.ready = new Promise ((ok, ng) => {
            this.pcIsReady = ok;
          });
          if (this.pcChannelPort) this.pcChannelPort.close ();
          this.pcCreateChannel ();
          return this.ready;
        }).then (() => this.pc_Invoke (method, args));
      }, // pcInvoke
      pcRegisterMethod: function (name, code) {
        this.pcMethods[name] = code;
      }, // pcRegisterMethod
      pcSetSeamlessHeight: function () {
        return Promise.resolve ().then (() => {
          if (!window.ResizeObserver) {
            return this.pcInvoke ('pcEval', {code: `
              self.pcResizeObserver = function (cb) {
                this.cb = cb;
              };
              self.pcResizeObserver.prototype.observe = function (e) {
                new MutationObserver (() => {
                  this.cb ();
                }).observe (e, {childList: true, subtree: true, attributes: true});
                document.body.addEventListener ('load', () => {
                  this.cb ();
                }, true);
                window.addEventListener ('resize', () => {
                  this.cb ();
                }, true);
                Promise.resolve ().then (this.cb);
              };
            `});
          }
        }).then (() => {
          return this.pcInvoke ('pcEval', {code: `
            var ob = self.ResizeObserver || self.pcResizeObserver;
            var observer = new ob (() => {
              var rect = document.documentElement.getBoundingClientRect ();
              pcInvoke ('pcSetDimension', {
                height: rect.height,
                width: rect.width,
              });
            });
            observer.observe (document.body);
          `});
        });
      }, // pcSetSeamless
      focus: function () {
        if (this.pcIFrame) this.pcIFrame.focus ();
      }, // focus
    }, // props
  }); // <sandboxed-viewer>
  
  defineElement ({
    name: 'image-editor',
    props: {
    pcInit: function () {
      this.ieResize ({resizeEvent: true});
      var mo = new MutationObserver ((mutations) => {
        var resized = false;
        mutations.forEach ((mutation) => {
          if (mutation.attributeName === 'width' ||
              mutation.attributeName === 'height') {
            if (!resized) {
              resized = true;
              this.ieResize ({resizeEvent: true, changeEvent: true});
            }
          }
        });
      });
      mo.observe (this, {attributes: true, attributeFilter: ['width', 'height']});

      new MutationObserver (function (mutations) {
        mutations.forEach (function (m) {
          Array.prototype.forEach.call (m.addedNodes, function (e) {
            if (e.nodeType === e.ELEMENT_NODE &&
                e.localName === 'image-layer') {
              upgrade (e);
            }
          });
        });
      }).observe (this, {childList: true});
      Array.prototype.slice.call (this.children).forEach ((e) => {
        if (e.localName === 'image-layer') {
          Promise.resolve (e).then (upgrade);
        }
      });

      if (this.hasAttribute ('data-onresize')) {
        this.setAttribute ('onresize', this.getAttribute ('data-onresize'));
      }
    }, // pcInit

    ieResize: function (opts) {
      var width = 0;
      var height = 0;
      var fixedWidth = parseFloat (this.getAttribute ('width'));
      var fixedHeight = parseFloat (this.getAttribute ('height'));
      if (!(fixedWidth > 0) || !(fixedHeight > 0)) {
        Array.prototype.slice.call (this.children).forEach ((e) => {
          var w = e.left + e.width;
          var h = e.top + e.height;
          if (w > width) width = w;
          if (h > height) height = h;
        });
        width = width || 300;
        height = height || 150;
      }
      if (fixedWidth > 0) width = fixedWidth;
      if (fixedHeight > 0) height = fixedHeight;
      var resize = opts.resizeEvent && (this.width !== width || this.height !== height);
      this.width = width;
      this.height = height;
      this.style.width = width + 'px';
      this.style.height = height + 'px';
      if (resize) {
        Promise.resolve ().then (() => {
          this.dispatchEvent (new Event ('resize', {bubbles: true}));
        });
      }
      if (opts.changeEvent) {
        Promise.resolve ().then (() => {
          this.dispatchEvent (new Event ('change', {bubbles: true}));
        });
      }
    }, // ieResize

    ieCanvasToBlob: function (type, quality) {
      return new Promise ((ok) => {
        var canvas = document.createElement ('canvas');
        canvas.width = Math.ceil (this.width);
        canvas.height = Math.ceil (this.height);
        var context = canvas.getContext ('2d');
        Array.prototype.slice.call (this.children).forEach ((e) => {
          if (e.localName === 'image-layer' && e.pcUpgraded) {
            context.drawImage (e.ieCanvas, e.left, e.top, e.width, e.height);
          }
        });
        if (canvas.toBlob) {
          return canvas.toBlob (ok, type, quality);
        } else {
          var decoded = atob (canvas.toDataURL (type, quality).split (',')[1]);
          var byteLength = decoded.length;
          var view = new Uint8Array (byteLength);
          for (var i = 0; i < byteLength; i++) {
            view[i] = decoded.charCodeAt (i);
          }
          ok (new Blob ([view], {type: type || 'image/png'}));
        }
      });
    }, // ieCanvasToBlob
    getPNGBlob: function () {
      return this.ieCanvasToBlob ('image/png');
    }, // getPNGBlob
    getJPEGBlob: function () {
      return this.ieCanvasToBlob ('image/jpeg');
    }, // getJPEGBlob
    },
  }); // image-editor

  defineElement ({
    name: 'image-layer',
    notTopLevel: true,
    props: {
    pcInit: function () {
      this.ieCanvas = document.createElement ('canvas');
      this.appendChild (this.ieCanvas);
      if (this.parentNode) {
        this.ieCanvas.width = this.parentNode.width;
        this.ieCanvas.height = this.parentNode.height;
      }
      this.ieTogglePlaceholder (true);

      // XXX not tested
      var mo = new MutationObserver (function (mutations) {
        mutations.forEach ((mutation) => {
          if (mutation.attributeName === 'movable' ||
              mutation.attributeName === 'useplaceholder') {
            this.ieTogglePlaceholder (null);
          }
        });
      });
      mo.observe (this, {attributes: true, attributeFilter: ['movable', 'useplaceholder']});

      this.top = 0;
      this.left = 0;
      this.ieScaleFactor = 1.0;
      this.width = this.ieCanvas.width /* * this.ieScalerFactor */;
      this.height = this.ieCanvas.height /* * this.ieScaleFactor */;
      if (this.parentNode && this.parentNode.ieResize) this.parentNode.ieResize ({});
      this.dispatchEvent (new Event ('resize', {bubbles: true}));
      this.dispatchEvent (new Event ('change', {bubbles: true}));
    }, // pcInit

    cbCommands: {
      startCaptureMode: {},
      endCaptureMode: {},
      selectImageFromCaptureModeAndEndCaptureMode: {},
      
      selectImageFromFile: {},
      selectImageFromGooglePhotos: {},

      rotateClockwise: {},
      rotateCounterclockwise: {},
    },

    ieSetClickMode: function (mode) {
      if (mode === this.ieClickMode) return;
      if (mode === 'selectImage') {
        this.ieClickMode = mode;
        // XXX We don't have tests of this behavior...
        this.ieClickListener = (ev) => this.selectImageFromFile ().catch ((e) => {
          var ev = new Event ('error', {bubbles: true});
          ev.exception = e;
          var notHandled = this.dispatchEvent (ev);
          if (notHandled) throw e;
        });
        this.addEventListener ('click', this.ieClickListener);
      } else if (mode === 'none') { 
        this.ieClickMode = mode;
        if (this.ieClickListener) {
          this.removeEventListener ('click', this.ieClickListener);
          delete this.ieClickListener;
        }
      } else {
        throw new Error ("Bad mode |"+mode+"|");
      }
    }, // ieSetClickMode
    ieSetDnDMode: function (mode) {
      if (this.ieDnDMode === mode) return;
      if (mode === 'selectImage') {
        this.ieDnDMode = mode;
        var setDropEffect = function (dt) {
          var hasFile = false;
          var items = dt.items;
          for (var i = 0; i < items.length; i++) {
            if (items[i].kind === "file") {
              hasFile = true;
              break;
            }
          }
          if (hasFile) {
            dt.dropEffect = "copy";
            return false;
          } else {
            dt.dropEffect = "none";
            return true;
          }
        }; // setDropEffect
        var targetted = 0;
        this.ieDnDdragenterHandler = (ev) => {
          targetted++;
          if (!setDropEffect (ev.dataTransfer)) {
            this.classList.add ('drop-target');
            ev.preventDefault ();
          }
        };
        this.ieDnDdragoverHandler = (ev) => {
          if (!setDropEffect (ev.dataTransfer)) ev.preventDefault ();
        };
        this.ieDnDdragleaveHandler = (ev) => {
          targetted--;
          if (targetted <= 0) {
            this.classList.remove ('drop-target');
          }
        };
        this.ieDnDdropHandler = (ev) => {
          this.classList.remove ('drop-target');
          targetted = 0;
        
          var file = ev.dataTransfer.files[0];
          if (file) {
            this.ieSetImageFile (file).catch ((e) => {
              var ev = new Event ('error', {bubbles: true});
              ev.exception = e;
              return Promise.resolve.then (() => {
                var notHandled = this.dispatchEvent (ev);
                if (notHandled) throw e;
              });
            });
          }
          ev.preventDefault ();
        };
        // XXX We don't have tests of DnD...
        this.addEventListener ('dragenter', this.ieDnDdragenterHandler);
        this.addEventListener ('dragover', this.ieDnDdragoverHandler);
        this.addEventListener ('dragleave', this.ieDnDdragleaveHandler);
        this.addEventListener ('drop', this.ieDnDdropHandler);
      } else if (mode === 'none') {
        this.ieDnDMode = mode;
        if (this.ieDnDdragenterHandler) {
          this.removeEventListener ('dragenter', this.ieDnDdragenterHandler);
          this.removeEventListener ('dragover', this.ieDnDdragoverHandler);
          this.removeEventListener ('dragleave', this.ieDnDdragleaveHandler);
          this.removeEventListener ('drop', this.ieDnDdropHandler);
          delete this.ieDnDdragenterHandler;
          delete this.ieDnDdragoverHandler;
          delete this.ieDnDdragleaveHandler;
          delete this.ieDnDdropHandler;
        }
      } else {
        throw new Error ("Bad mode |"+mode+"|");
      }
    }, // ieSetDnDMode
    ieSetMoveMode: function (mode) {
      if (this.ieMoveMode === mode) return;
      if (mode === 'editOffset') {
        this.ieMoveMode = mode;
        var dragging = null;
        this.ieMouseDownHandler = (ev) => {
          dragging = [this.left, this.top,
                      this.offsetLeft + ev.offsetX,
                      this.offsetTop + ev.offsetY];
        };
        this.ieMouseMoveHandler = (ev) => {
          if (dragging) {
            this.ieMove (
              dragging[0] + this.offsetLeft + ev.offsetX - dragging[2],
              dragging[1] + this.offsetTop + ev.offsetY - dragging[3],
            );
          }
        };
        this.ieMouseUpHandler = (ev) => dragging = null;
        this.ieKeyDownHandler = (ev) => {
          if (dragging) return;
          if (ev.keyCode === 38) {
            this.ieMove (this.left, this.top-1);
            ev.preventDefault ();
          } else if (ev.keyCode === 39) {
            this.ieMove (this.left+1, this.top);
            ev.preventDefault ();
          } else if (ev.keyCode === 40) {
            this.ieMove (this.left, this.top+1);
            ev.preventDefault ();
          } else if (ev.keyCode === 37) {
            this.ieMove (this.left-1, this.top);
            ev.preventDefault ();
          }
        };
        // XXX we don't have tests of dnd and keyboard operations
        var m = this.ieMoveContainer = this;
        m.addEventListener ('mousedown', this.ieMouseDownHandler);
        m.addEventListener ('mousemove', this.ieMouseMoveHandler);
        window.addEventListener ('mouseup', this.ieMouseUpHandler);
        m.addEventListener ('keydown', this.ieKeyDownHandler);
        m.tabIndex = 0;
      } else if (mode === 'none') {
        var m = this.ieMoveContainer;
        if (m) {
          m.removeEventListener ('mousedown', this.ieMouseDownHandler);
          m.removeEventListener ('mousemove', this.ieMouseMoveHandler);
          window.removeEventListener ('mouseup', this.ieMouseUpHandler);
          m.removeEventListener ('keydown', this.ieKeyDownHandler);
          delete this.ieMouseDownHandler;
          delete this.ieMouseMoveHandler;
          delete this.ieMouseUpHandler;
          delete this.ieKeyDownHandler;
          delete this.ieMoveContainer;
        }
      } else {
        throw new Error ("Bad mode |"+mode+"|");
      }
    }, // ieSetMoveMode

    // XXX not tested
    startCaptureMode: function () {
      if (this.ieEndCaptureMode) return;
      this.ieEndCaptureMode = () => {};

      var videoWidth = this.width;
      var videoHeight = this.height;
      var TimeoutError = function () {
        this.name = "TimeoutError";
        this.message = "Camera timeout";
      };
      var run = () => {
        return navigator.mediaDevices.getUserMedia ({video: {
          width: videoWidth, height: videoHeight,
          //XXX facingMode: opts.facingMode, // |user| or |environment|
        }, audio: false}).then ((stream) => {
          var video;
          var cancelTimer;
          this.ieEndCaptureMode = function () {
            stream.getVideoTracks ()[0].stop ();
            delete this.ieCaptureNow;
            if (video) video.remove ();
            clearTimeout (cancelTimer);
            delete this.ieEndCaptureMode;
          };

          return new Promise ((ok, ng) => {
            video = document.createElement ('video');
            video.classList.add ('capture');
            video.onloadedmetadata = (ev) => {
              if (!this.ieEndCaptureMode) return;

              video.play ();
              this.ieCaptureNow = function () {
                return this.ieSelectImageByElement (video, videoWidth, videoHeight);
              };
              ok ();
              clearTimeout (cancelTimer);
            };
            video.srcObject = stream;
            this.appendChild (video);
            cancelTimer = setTimeout (() => {
              ng (new TimeoutError);
              if (this.ieEndCaptureMode) this.ieEndCaptureMode ();
            }, 500);
          });
        });
      }; // run
      var tryCount = 0;
      var tryRun = () => {
        return run ().catch ((e) => {
          // Some browser with some camera device sometimes (but not
          // always) fails to fire loadedmetadata...
          if (e instanceof TimeoutError && tryCount++ < 10) {
            return tryRun ();
          } else {
            throw e;
          }
        });
      };
      tryRun ();
    }, // startCaptureMode
    endCaptureMode: function () {
      if (this.ieEndCaptureMode) this.ieEndCaptureMode ();
    }, // endCaptureMode

    ieTogglePlaceholder: function (newValue) {
      if (newValue === null) newValue = this.classList.contains ("placeholder");
      if (newValue) { // is placeholder
        this.classList.add ('placeholder');
        if (this.hasAttribute ('useplaceholderui')) {
          this.ieSetClickMode ('selectImage');
          this.ieSetDnDMode ('selectImage');
          this.ieSetMoveMode ('none');
        } else {
          this.ieSetClickMode ('none');
          this.ieSetDnDMode ('none');
          this.ieSetMoveMode (this.hasAttribute ('movable') ? 'editOffset' : 'none');
        }
      } else { // is image
        this.classList.remove ('placeholder');
        this.ieSetClickMode ('none');
        this.ieSetDnDMode ('none');
        this.ieSetMoveMode (this.hasAttribute ('movable') ? 'editOffset' : 'none');
      }
    }, // ieTogglePlaceholder      

    ieSelectImageByElement: function (element, width, height) {
      var ev = new Event ('pcImageSelect', {bubbles: true});
      ev.element = element;
      this.dispatchEvent (ev);

      this.ieCanvas.width = width;
      this.ieCanvas.height = height;
      var context = this.ieCanvas.getContext ('2d');
      context.drawImage (element, 0, 0, width, height);
      this.ieUpdateDimension ();
      this.ieTogglePlaceholder (false);
      return Promise.resolve ();
    }, // ieSelectImageByElement
    selectImageByURL: function (url) {
      return new Promise ((ok, ng) => {
        var img = document.createElement ('img');
        img.src = url;
        img.setAttribute ('crossorigin', '');
        img.onload = function () {
          ok (img);
        };
        img.onerror = (ev) => {
          var e = new Error ('Failed to load the image <'+img.src+'>');
          e.name = 'ImageLoadError';
          ng (e);
        };
      }).then ((img) => {
        return this.ieSelectImageByElement (img, img.naturalWidth, img.naturalHeight);
      });
    }, // selectImageByURL
    ieSetImageFile: function (file) {
      var url = URL.createObjectURL (file);
      return this.selectImageByURL (url).then (() => {
        URL.revokeObjectURL (url);
      }, (e) => {
        URL.revokeObjectURL (url);
        throw e;
      });
    }, // ieSetImageFile
    // XXX We don't have tests of this method >_<
    selectImageFromFile: function () {
      if (this.ieFileCancel) this.ieFileCancel ();
      return new Promise ((ok, ng) => {
        var input = document.createElement ('input');
        input.type = 'file';
        input.accept = 'image/*';
        this.ieFileCancel = () => {
          ng (new DOMException ("The user does not choose a file", "AbortError"));
          delete this.ieFileCancel;
        };
        input.onchange = () => {
          if (input.files[0]) {
            ok (input.files[0]);
          } else {
            // This is unlikely called.  There is no way to hook on "cancel".
            this.ieFileCancel ();
          }
        };
        input.click ();
      }).then ((file) => {
        return this.ieSetImageFile (file);
      });
    }, // selectImageFromFile
    // XXX not tested
    selectImageFromCaptureModeAndEndCaptureMode: function () {
      if (!this.ieCaptureNow) {
        return Promise.reject (new Error ("Capturing is not available"));
      }
      return this.ieCaptureNow ().then (() => {
        this.endCaptureMode ();
      });
    }, // selectImageFromCaptureModeAndEndCaptureMode

    // ieGooglePickerAPI
    ieLoadGooglePickerAPI: function () {
      return Promise.resolve ();
    }, // ieLoadGooglePickerAPI
    //ieGoogleOAuthToken
    iePrepareGoogleOAuth: function () {
      return Promise.resolve ();
    }, // iePrepareGoogleOAuth
    // XXX not tested :-<
    selectImageFromGooglePhotos: function () {
      if (!this.hasAttribute ('data-test')) alert ('Google no longer supports this feature.');
      return Promise.reject (new DOMException ('Google Picker API no longer supports Google Photos.', 'AbortError'));
    }, // selectImageFromGooglePhotos

    ieRotateByDegree: function (degree) {
      var canvas = document.createElement ('canvas');
      canvas.width = this.ieCanvas.height;
      canvas.height = this.ieCanvas.width;
      var context = canvas.getContext ('2d');
      context.translate (canvas.width / 2, canvas.height / 2);
      context.rotate (degree * 2 * Math.PI / 360);
      context.drawImage (this.ieCanvas, -canvas.height / 2, -canvas.width / 2);
      context.resetTransform ();
      this.replaceChild (canvas, this.ieCanvas);
      this.ieCanvas = canvas;
      this.ieUpdateDimension ();
    }, // ieRotateByDegree
    rotateClockwise: function () {
      return this.ieRotateByDegree (90);
    }, // rotateClockwise
    rotateCounterclockwise: function () {
      return this.ieRotateByDegree (-90);
    }, // rotateCounterclockwise

    ieMove: function (x, y) {
      this.left = x;
      this.top = y;
      this.style.left = this.left + "px";
      this.style.top = this.top + "px";
      if (!this.ieMoveTimer) {
        this.ieMoveTimer = setTimeout (() => {
          if (this.parentNode && this.parentNode.ieResize) this.parentNode.ieResize ({resizeEvent: true, changeEvent: true});
          this.ieMoveTimer = null;
        }, 100);
      }
    }, // ieMove
    ieUpdateDimension: function () {
      var oldWidth = this.width;
      var oldHeight = this.height;
      if (this.getAttribute ('anchorpoint') === 'center') {
        var x = this.left + this.width / 2;
        var y = this.top + this.height / 2;
        this.width = this.ieCanvas.width * this.ieScaleFactor;
        this.height = this.ieCanvas.height * this.ieScaleFactor; 
        this.left = x - this.width / 2;
        this.top = y - this.height / 2;
        this.style.left = this.left + "px";
        this.style.top = this.top + "px";
      } else {
        this.width = this.ieCanvas.width * this.ieScaleFactor;
        this.height = this.ieCanvas.height * this.ieScaleFactor;
      }
      this.ieCanvas.style.width = this.width + "px";
      this.ieCanvas.style.height = this.height + "px";
      if (oldWidth !== this.width || oldHeight !== this.height) {
        if (this.parentNode && this.parentNode.ieResize) this.parentNode.ieResize ({});

        this.dispatchEvent (new Event ('resize', {bubbles: true}));
      }
      this.dispatchEvent (new Event ('change', {bubbles: true}));
    }, // ieUpdateDimension

    setScale: function (newScale) {
      if (this.ieScaleFactor === newScale) return;
      this.ieScaleFactor = newScale;
      this.ieUpdateDimension ();
    }, // setScale
    },
  }); // <image-layer>

  class InvalidValueError extends Error {
    constructor (value) {
      super ('The specified value |'+value+'| is invalid');
      this.name = 'InvalidValueError';
      this.pcValue = value;
    };
  }; // InvalidValueError

  defineElement ({
    name: 'table-mapper',
    props: {
      pcInit: function () {
        this.pcHeader = [];
        this.pcRawData = [];
        this.pcExpected = {};
        this.pcOverrideMapping = [];
        this.pcComputedData = [];
        this.pcComputedMapping = [];
        this.addEventListener ('change', (ev) => {
          if (ev.target.localName === 'select' &&
              ev.target.getAttribute ('is') === 'table-mapper-header') {
            var index = ev.target.getAttribute ('data-index');
            var mappedKey = ev.target.value;
            if (index != null) {
              this.pcOverrideMapping[index] = this.pcOverrideMapping[index] || {};
              this.pcOverrideMapping[index].mappedKey = mappedKey;
              this.pcRender ();
            }
          }
        }); // onchange
        this.pcEvaluated = Promise.resolve ();
      }, // pcInit
      setRawData: function (data, opts) {
        this.pcRawData = Array.prototype.slice.call (data || []);
        if (opts.header) {
          this.pcHeader = this.pcRawData.shift ();
        } else {
          this.pcHeader = [];
        }
        this.pcRender ();
      }, // setRawData
      setExpectedStructure: function (data) {
        this.pcExpected = data || {};
        this.pcRender ();
      }, // setExpectedStructure
      pcRecompute: function () {
        var newProps = {pcComputedInError: false};
        var mapping = newProps.pcComputedMapping = [];
        var hasMapping = [];
        var mapped = {};
        for (var i = 0; i < this.pcHeader.length; i++) {
          mapping[i] = {
            index: i,
            headerValue: this.pcHeader[i], // or undefined
            errorCount: 0,
            errors: [],
          };
          if (this.pcOverrideMapping[i] &&
              this.pcOverrideMapping[i].mappedKey != null) {
            if (this.pcOverrideMapping[i].mappedKey === '') {
              hasMapping[i] = true;
            } else {
              var key = this.pcOverrideMapping[i].mappedKey;
              if (!mapped[key]) {
                mapping[i].mappedKey = key;
                hasMapping[i] = true;
                mapped[key] = true;
              }
            }
          }
        } // i
        for (var i = 0; i < this.pcHeader.length; i++) {
          if (hasMapping[i]) {
            //
          } else if (mapping[i].headerValue) {
            if (this.pcExpected[mapping[i].headerValue]) {
              var key = mapping[i].headerValue;
              if (!mapped[key]) {
                mapping[i].mappedKey = key;
                hasMapping[i] = true;
                mapped[key] = true;
              }
            } else {
              var keys = Object.keys (this.pcExpected);
              for (var j = 0; j < keys.length; j++) {
                var key = keys[j];
                if ((this.pcExpected[key].headerValues || []).includes (mapping[i].headerValue)) {
                  if (!mapped[key]) {
                    mapping[i].mappedKey = key;
                    hasMapping[i] = true;
                    mapped[key] = true;
                  }
                  break;
                }
              }
            }
          }
        }

        var wait = [];
        newProps.pcComputedData = [];
        var state = {};
        for (var rowIndex = 0; rowIndex < this.pcRawData.length; rowIndex++) ((rowIndex) => {
          var raw = this.pcRawData[rowIndex];
          var data = {};
          for (var i = 0; i < mapping.length; i++) ((i) => {
            if (mapping[i] && mapping[i].mappedKey) {
              var value = raw[i]; // or undefined
              var fieldDef = this.pcExpected[mapping[i].mappedKey];
              if (fieldDef.valueMapping) {
                var replaced = fieldDef.valueMapping[value];
                if (replaced == null || !fieldDef.valueMapping.hasOwnProperty (value)) {
                  if (!fieldDef.allowOtherValues) {
                    var error = new InvalidValueError (value);
                    mapping[i].errorCount++;
                    mapping[i].errors.push (error);
                    data.pcErrors = data.pcErrors || {};
                    data.pcErrors[mapping[i].mappedKey] = error;
                    newProps.pcComputedInError = true;
                    return; // continue i
                  }
                } else {
                  value = replaced;
                }
              } // valueMapping
              if (fieldDef.validator) {
                wait.push (Promise.resolve ().then (() => {
                  return fieldDef.validator (value, state);
                }).then (_ => {
                  data[mapping[i].mappedKey] = _;
                }, error => {
                  mapping[i].errorCount++;
                  mapping[i].errors.push (error);
                  data.pcErrors = data.pcErrors || {};
                  data.pcErrors[mapping[i].mappedKey] = error;
                  newProps.pcComputedInError = true;
                }));
                return; // continue i
              }
              data[mapping[i].mappedKey] = value;
            }
          }) (i);
          newProps.pcComputedData[rowIndex] = {
            data: data,
            raw: raw,
          };
        }) (rowIndex);
        return Promise.all (wait).then (() => {
          for (var n in newProps) {
            this[n] = newProps[n];
          }
        });  
      }, // pcRecompute
      pcRender: function () {
        clearTimeout (this.pcRenderTimer);
        this.pcRenderTimer = setTimeout (() => {
          this._pcRender ();
        }, 100);
        if (!this.pcResolveEvaluated)
        this.pcEvaluated = new Promise (a => {
          this.pcResolveEvaluated = a;
        });
      }, // pcRender
      _pcRender: function () {
        var done = this.pcResolveEvaluated; // or undefined
        delete this.pcResolveEvaluated;
        this.pcRecompute ().then (() => {
          this.querySelectorAll ('list-container[loader=tableMapperLoader]').forEach (_ => {
            _.load ({});
          });
          if (done) done ();
        });
      }, // _pcRender
      evaluate: function () {
        return this.pcEvaluated;
      }, // evaluate
      getComputedData: function () {
        return this.pcComputedData;
      }, // getComputedData
      getComputedInError: function () {
        return this.pcComputedInError || false;
      }, // getComputedInError
    },
  }); // <table-mapper>

  defs.loader.tableMapperLoader = function () {
    var tm = this;
    while (tm && tm.localName !== 'table-mapper') {
      tm = tm.parentNode;
    }

    var data = [];
    if (tm) {
      var type = this.getAttribute ('loader-type');
      if (type === 'data') {
        data = tm.pcComputedData;
      } else if (type === 'mapping') {
        data = tm.pcComputedMapping;
      } else {
        console.log (this, 'Unknown |loader-type| value: |'+type+'|');
      }
    } else {
      console.log (this, 'No ancestor <table-mapper>');
    }

    var limit = parseInt (this.getAttribute ('loader-limit'));
    if (Number.isFinite (limit)) {
      data = data.slice (0, limit);
    }

    return {
      data: data,
    };
  }; // loader=tableMapperLoader

  defineElement ({
    name: 'select',
    is: 'table-mapper-header',
    props: {
      pcInit: function () {
        this.pcRender ();
      }, // pcInit
      pcRender: function () {
        var tm = this;
        while (tm && tm.localName !== 'table-mapper') {
          tm = tm.parentNode;
        } 
        if (!tm) return;

        this.querySelectorAll ('option:not([value=""])').forEach (_ => _.remove ());
        Object.keys (tm.pcExpected).forEach (key => {
          var opt = document.createElement ('option');
          opt.value = key;
          opt.label = tm.pcExpected[key].label || key;
          this.appendChild (opt);
        });
        this.value = this.getAttribute ('data-mappedkey') || '';
      }, // pcRender
    },
  }); // <select is=table-mapper-header>

  (document.currentScript.getAttribute ('data-export') || '').split (/\s+/).filter ((_) => { return _.length }).forEach ((name) => {
    self[name] = exportable[name];
  });
}) ();

/*

Copyright 2017-2021 Wakaba <wakaba@suikawiki.org>.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Affero General Public License for more details.

You does not have received a copy of the GNU Affero General Public
License along with this program, see <https://www.gnu.org/licenses/>.

*/
function TER (c) {
  this.container = c;
  this._initialize ();
} // TER

(function () {

  /* Based on HTML Standard's definition of "global date and time
     string", but allows Unicode 5.1.0 White_Space where it was
     allowed in earlier drafts of HTML5. */
  var globalDateAndTimeStringPattern = /^([0-9]{4,})-([0-9]{2})-([0-9]{2})(?:[\u0009-\u000D\u0020\u0085\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+(?:T[\u0009-\u000D\u0020\u0085\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]*)?|T[\u0009-\u000D\u0020\u0085\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]*)([0-9]{2}):([0-9]{2})(?::([0-9]{2})(?:\.([0-9]+))?)?[\u0009-\u000D\u0020\u0085\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]*(?:Z|([+-])([0-9]{2}):([0-9]{2}))$/;

  /* HTML Standard's definition of "date string" */
  var dateStringPattern = /^([0-9]{4,})-([0-9]{2})-([0-9]{2})$/;

  function parseTimeElement (el) {
    var datetime = el.getAttribute ('datetime');
    if (datetime === null) {
      datetime = el.textContent;

      /* Unicode 5.1.0 White_Space */
      datetime = datetime.replace
                     (/^[\u0009-\u000D\u0020\u0085\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/, '')
                         .replace
                     (/[\u0009-\u000D\u0020\u0085\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+$/, '');
    }

    if (m = datetime.match (globalDateAndTimeStringPattern)) {
      if (m[1] < 100) {
        return new Date (NaN);
      } else if (m[8] && (m[9] > 23 || m[9] < -23)) {
        return new Date (NaN);
      } else if (m[8] && m[10] > 59) {
        return new Date (NaN);
      }
      var d = new Date (Date.UTC (m[1], m[2] - 1, m[3], m[4], m[5], m[6] || 0));
      if (m[1] != d.getUTCFullYear () ||
          m[2] != d.getUTCMonth () + 1 ||
          m[3] != d.getUTCDate () ||
          m[4] != d.getUTCHours () ||
          m[5] != d.getUTCMinutes () ||
          (m[6] || 0) != d.getUTCSeconds ()) {
        return new Date (NaN); // bad date error.
      }
      if (m[7]) {
        var ms = (m[7] + "000").substring (0, 3);
        d.setMilliseconds (ms);
      }
      if (m[9] != null) {
        var offset = parseInt (m[9], 10) * 60 + parseInt (m[10], 10);
        offset *= 60 * 1000;
        if (m[8] == '-') offset *= -1;
        d = new Date (d.valueOf () - offset);
      }
      d.hasDate = true;
      d.hasTime = true;
      d.hasTimezone = true;
      return d;
    } else if (m = datetime.match (dateStringPattern)) {
      if (m[1] < 100) {
        return new Date (NaN);
      }
      /* For old browsers (which don't support the options parameter
         of `toLocaleDateString` method) the time value is set to
         12:00, so that most cases are covered. */
      var d = new Date (Date.UTC (m[1], m[2] - 1, m[3], 12, 0, 0));
      if (m[1] != d.getUTCFullYear () ||
          m[2] != d.getUTCMonth () + 1 ||
          m[3] != d.getUTCDate ()) {
        return new Date (NaN); // bad date error.
      }
      d.hasDate = true;
      return d;
    } else {
      return new Date (NaN);
    }
  } // parseTimeElement

  function _2digit (i) {
    return i < 10 ? '0' + i : i;
  } // _2digit

  function _mod (m, n) {
    return ((m % n) + n) % n;
  };
  
  function _year (munix, year, dts) {
    var defs = TER.defs.dts[dts];
    var v = munix / 1000 / 60 / 60 / 24;
    var def = defs[0];
    for (var i = defs.length-1; i >= 1; i--) {
      if (defs[i][0] <= v) {
        def = defs[i];
        break;
      }
    }
    return def[1].map (_ => {
      if (_ instanceof Array) {
        if (_[0] === 'Y') {
          var y = year - _[1];
          return y === 1 ? '元' : y;
        } else if (_[0] === 'y') {
          return year - _[1];
        } else if (_[0] === 'k') {
          var kk = [
            '甲子','乙丑','丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申',
            '癸酉','甲戌','乙亥','丙子','丁丑','戊寅','己卯','庚辰','辛巳',
            '壬午','癸未','甲申','乙酉','丙戌','丁亥','戊子','己丑','庚寅',
            '辛卯','壬辰','癸巳','甲午','乙未','丙申','丁酉','戊戌','己亥',
            '庚子','辛丑','壬寅','癸卯','甲辰','乙巳','丙午','丁未','戊申',
            '己酉','庚戌','辛亥','壬子','癸丑','甲寅','乙卯','丙辰','丁巳',
            '戊午','己未','庚申','辛酉','壬戌','癸亥',
          ];
          return kk[_mod (year - 4, 60)];
        } else {
          throw _[0];
        }
      } else {
        return _;
      }
    }).join ("");
  } // _year

  function _setDateContent (el, date) {
    var dts = getComputedStyle (el).getPropertyValue ('--timejs-serialization');
    dts = dts.replace (/^\s+/, '').replace (/\s+$/, '');
    if (dts === 'dtsjp1') {
      el.textContent = _year (date.valueOf (), date.getUTCFullYear (), dts) + '年' + (date.getUTCMonth () + 1) + '月' + date.getUTCDate () + '日(' + ['日','月','火','水','木','金','土'][date.getUTCDay ()] + ')';
    } else if (dts === 'dtsjp2') {
      el.textContent = _year (date.valueOf (), date.getUTCFullYear (), dts) + '.' + (date.getUTCMonth () + 1) + '.' + date.getUTCDate ();
    } else if (dts === 'dtsjp3') {
      el.textContent = _year (date.valueOf (), date.getUTCFullYear (), dts) + '/' + (date.getUTCMonth () + 1) + '/' + date.getUTCDate ();
    } else {
      el.textContent = date.toLocaleDateString (navigator.language, {
        "timeZone": "UTC",
      });
    }
  } // _setDateContent

  function _setMonthDayDateContent (el, date) {
    var dts = getComputedStyle (el).getPropertyValue ('--timejs-serialization');
    dts = dts.replace (/^\s+/, '').replace (/\s+$/, '');
    if (dts === 'dtsjp1') {
      el.textContent = (date.getUTCMonth () + 1) + '月' + date.getUTCDate () + '日(' + ['日','月','火','水','木','金','土'][date.getUTCDay ()] + ')';
    } else if (dts === 'dtsjp2') {
      el.textContent = (date.getUTCMonth () + 1) + '.' + date.getUTCDate ();
    } else if (dts === 'dtsjp3') {
      el.textContent = (date.getUTCMonth () + 1) + '/' + date.getUTCDate ();
    } else {
      el.textContent = date.toLocaleDateString (navigator.language, {
        "timeZone": "UTC",
        month: "numeric",
        day: "numeric",
      });
    }
  } // _setMonthDayDateContent

  function _setMonthDayTimeContent (el, date) {
    var dts = getComputedStyle (el).getPropertyValue ('--timejs-serialization');
    dts = dts.replace (/^\s+/, '').replace (/\s+$/, '');
    if (dts === 'dtsjp1') {
      el.textContent = (date.getMonth () + 1) + '月' + date.getDate () + '日(' + ['日','月','火','水','木','金','土'][date.getDay ()] + ') ' + date.getHours () + '時' + date.getMinutes () + '分' + date.getSeconds () + '秒';
    } else if (dts === 'dtsjp2') {
      el.textContent = (date.getMonth () + 1) + '.' + date.getDate () + ' ' + date.getHours () + ':' + _2digit (date.getMinutes ()) + ':' + _2digit (date.getSeconds ());
    } else if (dts === 'dtsjp3') {
      el.textContent = (date.getMonth () + 1) + '/' + date.getDate () + ' ' + date.getHours () + ':' + _2digit (date.getMinutes ()) + ':' + _2digit (date.getSeconds ());
    } else {
      el.textContent = date.toLocaleString (navigator.language, {
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
    }
  } // _setMonthDayTimeContent

  function _setDateTimeContent (el, date) {
    var dts = getComputedStyle (el).getPropertyValue ('--timejs-serialization');
    dts = dts.replace (/^\s+/, '').replace (/\s+$/, '');
    if (dts === 'dtsjp1') {
      el.textContent = _year (date.valueOf () - date.getTimezoneOffset () * 60 * 1000, date.getFullYear (), dts) + '年' + (date.getMonth () + 1) + '月' + date.getDate () + '日(' + ['日','月','火','水','木','金','土'][date.getDay ()] + ') ' + date.getHours () + '時' + date.getMinutes () + '分' + date.getSeconds () + '秒';
    } else if (dts === 'dtsjp2') {
      el.textContent = _year (date.valueOf () - date.getTimezoneOffset () * 60 * 1000, date.getFullYear (), dts) + '.' + (date.getMonth () + 1) + '.' + date.getDate () + ' ' + date.getHours () + ':' + _2digit (date.getMinutes ()) + ':' + _2digit (date.getSeconds ());
    } else if (dts === 'dtsjp3') {
      el.textContent = _year (date.valueOf () - date.getTimezoneOffset () * 60 * 1000, date.getFullYear (), dts) + '/' + (date.getMonth () + 1) + '/' + date.getDate () + ' ' + date.getHours () + ':' + _2digit (date.getMinutes ()) + ':' + _2digit (date.getSeconds ());
    } else {
      el.textContent = date.toLocaleString (navigator.language, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
    }
  } // _setDateTimeContent
  
  function setDateContent (el, date) {
    if (!el.getAttribute ('title')) {
      el.setAttribute ('title', el.textContent);
    }
    if (!el.getAttribute ('datetime')) {
      var r = '';
      r = date.getUTCFullYear (); // JS does not support years 0001-0999
      r += '-' + ('0' + (date.getUTCMonth () + 1)).slice (-2);
      r += '-' + ('0' + date.getUTCDate ()).slice (-2);
      el.setAttribute ('datetime', r);
    }
    _setDateContent (el, date);
  } // setDateContent

  function setMonthDayDateContent (el, date) {
    if (!el.getAttribute ('title')) {
      el.setAttribute ('title', el.textContent);
    }
    if (!el.getAttribute ('datetime')) {
      var r = '';
      r = date.getUTCFullYear (); // JS does not support years 0001-0999
      r += '-' + ('0' + (date.getUTCMonth () + 1)).slice (-2);
      r += '-' + ('0' + date.getUTCDate ()).slice (-2);
      el.setAttribute ('datetime', r);
    }

    var lang = navigator.language;
    if (new Date ().toLocaleString (lang, {timeZone: 'UTC', year: "numeric"}) ===
        date.toLocaleString (lang, {timeZone: 'UTC', year: "numeric"})) {
      _setMonthDayDateContent (el, date);
    } else {
      _setDateContent (el, date);
    }
  } // setMonthDayDateContent

  function setMonthDayTimeContent (el, date) {
    if (!el.getAttribute ('title')) {
      el.setAttribute ('title', el.textContent);
    }
    if (!el.getAttribute ('datetime')) {
      // XXX If year is outside of 1000-9999, ...
      el.setAttribute ('datetime', date.toISOString ());
    }

    var tzoffset = el.getAttribute ('data-tzoffset');
    var usedDate = date;
    if (tzoffset !== null) {
      tzoffset = parseFloat (tzoffset);
      usedDate = new Date (date.valueOf () + date.getTimezoneOffset () * 60 * 1000 + tzoffset * 1000);
    }
    
    var lang = navigator.language;
    if (new Date ().toLocaleString (lang, {timeZone: 'UTC', year: "numeric"}) ===
        usedDate.toLocaleString (lang, {timeZone: 'UTC', year: "numeric"})) {
      _setMonthDayTimeContent (el, usedDate);
    } else {
      _setDateTimeContent (el, usedDate);
    }
  } // setMonthDayTimeContent

  function setDateTimeContent (el, date) {
    if (!el.getAttribute ('title')) {
      el.setAttribute ('title', el.textContent);
    }
    if (!el.getAttribute ('datetime')) {
      // XXX If year is outside of 1000-9999, ...
      el.setAttribute ('datetime', date.toISOString ());
    }

    var tzoffset = el.getAttribute ('data-tzoffset');
    var usedDate = date;
    if (tzoffset !== null) {
      tzoffset = parseFloat (tzoffset);
      usedDate = new Date (date.valueOf () + date.getTimezoneOffset () * 60 * 1000 + tzoffset * 1000);
    }
    _setDateTimeContent (el, usedDate);
  } // setDateTimeContent

  function setAmbtimeContent (el, date, opts) {
    if (!el.getAttribute ('title')) {
      el.setAttribute ('title', el.textContent);
    }
    if (!el.getAttribute ('datetime')) {
      // XXX If year is outside of 1000-9999, ...
      el.setAttribute ('datetime', date.toISOString ());
    }

    var text = TER.Delta.prototype.text;
    var dateValue = date.valueOf ();
    var nowValue = new Date ().valueOf ();

    var diff = dateValue - nowValue;
    if (diff < 0) diff = -diff;

    if (diff == 0) {
      el.textContent = text.now ();
      return;
    }

    var v;
    diff = Math.floor (diff / 1000);
    if (diff < 60) {
      v = text.second (diff);
    } else {
      var f = diff;
      diff = Math.floor (diff / 60);
      if (diff < 60) {
        v = text.minute (diff);
        f -= diff * 60;
        if (f > 0) v += text.sep () + text.second (f);
      } else {
        f = diff;
        diff = Math.floor (diff / 60);
        if (diff < 50) {
          v = text.hour (diff);
          f -= diff * 60;
          if (f > 0) v += text.sep () + text.minute (f);
        } else {
          f = diff;
          diff = Math.floor (diff / 24);
          if (diff < 100 || opts.deltaOnly) {
            v = text.day (diff);
            f -= diff * 24;
            if (f > 0) v += text.sep () + text.hour (f);
          } else {
            return setDateTimeContent (el, date);
          }
        }
      }
    }

    if (dateValue < nowValue) {
      v = text.before (v);
    } else {
      v = text.after (v);
    }
    el.textContent = v;
  } // setAmbtimeContent

TER.prototype._initialize = function () {
  if (this.container.localName === 'time') {
    this._initTimeElement (this.container);
  } else {
    var els = this.container.getElementsByTagName ('time');
    var elsL = els.length;
    for (var i = 0; i < elsL; i++) {
      var el = els[i];
      if (!el) break; /* If <time> is nested */
      this._initTimeElement (el);
    }
  }
}; // TER.prototype._initialize

  TER.prototype._initTimeElement = function (el) {
    if (el.terUpgraded) return;
    el.terUpgraded = true;
    
    var self = this;
    this._replaceTimeContent (el);
    new MutationObserver (function (mutations) {
      self._replaceTimeContent (el);
    }).observe (el, {attributeFilter: ['data-tzoffset']});
  }; // _initTimeElement

  TER.prototype._replaceTimeContent = function (el) {
    var date = parseTimeElement (el);
    if (isNaN (date.valueOf ())) return;
    if (date.hasTimezone) { /* full date */
      setDateTimeContent (el, date);
    } else if (date.hasDate) {
      setDateContent (el, date);
    }
  }; // _replaceTimeContent

  TER.Delta = function (c) {
    TER.apply (this, [c]);
  }; // TER.Delta
  TER.Delta.prototype = new TER (document.createElement ('time'));

  TER.Delta.prototype._replaceTimeContent = function (el) {
    var date = parseTimeElement (el);
    if (isNaN (date.valueOf ())) return;
    if (date.hasTimezone) { /* full date */
      setAmbtimeContent (el, date, {});
    } else if (date.hasDate) {
      setDateContent (el, date);
    }
  }; // _replaceTimeContent

  (function (selector) {
    if (!selector) return;

    var replaceContent = function (el) {
      var date = parseTimeElement (el);
      if (isNaN (date.valueOf ())) return;
      var format = el.getAttribute ('data-format');
      if (format === 'datetime') {
        setDateTimeContent (el, date);
      } else if (format === 'date') {
        setDateContent (el, date);
      } else if (format === 'monthday') {
        setMonthDayDateContent (el, date);
      } else if (format === 'monthdaytime') {
        setMonthDayTimeContent (el, date);
      } else if (format === 'ambtime') {
        setAmbtimeContent (el, date, {});
      } else if (format === 'deltatime') {
        setAmbtimeContent (el, date, {deltaOnly: true});
      } else { // auto
        if (date.hasTimezone) { /* full date */
          setDateTimeContent (el, date);
        } else if (date.hasDate) {
          setDateContent (el, date);
        }
      }
    }; // replaceContent
    
    var op = function (el) {
      if (el.terUpgraded) return;
      el.terUpgraded = true;

      replaceContent (el);
      new MutationObserver (function (mutations) {
        replaceContent (el);
      }).observe (el, {attributeFilter: ['datetime', 'data-tzoffset']});
    }; // op
    
    var mo = new MutationObserver (function (mutations) {
      mutations.forEach (function (m) {
        Array.prototype.forEach.call (m.addedNodes, function (e) {
          if (e.nodeType === e.ELEMENT_NODE) {
            if (e.matches && e.matches (selector)) op (e);
            Array.prototype.forEach.call (e.querySelectorAll (selector), op);
          }
        });
      });
    });
    Promise.resolve ().then (() => {
      mo.observe (document, {childList: true, subtree: true});
      Array.prototype.forEach.call (document.querySelectorAll (selector), op);
    });

  }) (document.currentScript.getAttribute ('data-time-selector') ||
      document.currentScript.getAttribute ('data-selector') /* backcompat */);
}) ();

TER.Delta.Text = {};

TER.Delta.Text.en = {
  day: function (n) {
    return n + ' day' + (n == 1 ? '' : 's');
  },
  hour: function (n) {
    return n + ' hour' + (n == 1 ? '' : 's');
  },
  minute: function (n) {
    return n + ' minute' + (n == 1 ? '' : 's');
  },
  second: function (n) {
    return n + ' second' + (n == 1 ? '' : 's');
  },
  before: function (s) {
    return s + ' ago';
  },
  after: function (s) {
    return 'in ' + s;
  },
  now: function () {
    return 'just now';
  },
  sep: function () {
    return ' ';
  }
};

TER.Delta.Text.ja = {
  day: function (n) {
    return n + '日';
  },
  hour: function (n) {
    return n + '時間';
  },
  minute: function (n) {
    return n + '分';
  },
  second: function (n) {
    return n + '秒';
  },
  before: function (s) {
    return s + '前';
  },
  after: function (s) {
    return s + '後';
  },
  now: function () {
    return '今';
  },
  sep: function () {
    return '';
  }
};

(function () {
  var lang = navigator.language;
  if (lang.match (/^[jJ][aA](?:-|$)/)) {
    TER.Delta.prototype.text = TER.Delta.Text.ja;
  } else {
    TER.Delta.prototype.text = TER.Delta.Text.en;
  }
})();

if (window.TEROnLoad) {
  TEROnLoad ();
}

/*

Usage:

Just insert:

  <script src="path/to/time.js" data-time-selector="time" async></script>

... where the |data-time-selector| attribute value is a selector that
only matches with |time| elements that should be processed.  Then any
|time| element matched with the selector when the script is executed,
as well as any |time| element matched with the selector inserted after
the script's execution, is processed appropriately.  E.g.:

  <time>2008-12-20T23:27+09:00</time>
  <!-- Will be rendered as a date and time, e.g.
       "20 December 2008 11:27:00 PM" -->

  <time>2008-12-20</time>
  <time data-format=date>2008-12-20T23:27+09:00</time>
  <!-- Will be rendered as a date, e.g. "20 December 2008" -->

  <time data-format=monthday>2008-12-20</time>
  <time data-format=monthday>2008-12-20T23:27+09:00</time>
  <!-- Will be rendered as a date, e.g. "20 December 2008" but the
       year component is omitted if it is same as this year, e.g.
       "December 20" if it's 2008. -->

  <time data-format=monthdaytime>2008-12-20T23:27+09:00</time>
  <!-- Will be rendered as a date and time, e.g.
       "20 December 2008 11:27:00 PM" but the year component is omitted
       if it is same as this year, e.g. "December 20 11:27:00 PM" if
       it's 2008. -->

  <time data-format=ambtime>2008-12-20T23:27+09:00</time>
  <!-- Will be rendered as an "ambtime" in English or Japanese
       depending on the user's language preference, such as "2 hours
       ago", if the date is within 100 days from "today" -->

  <time data-format=deltatime>2008-12-20T23:27+09:00</time>
  <!-- Will be rendered as an "ambtime" in English or Japanese
       depending on the user's language preference, such as "2 hours
       ago" -->

When the |time| element's |datetime| or |data-tzoffset| attribute
value is changed, the element's content is updated appropriately.
(Note that the element's content's mutation is ignored.)

The '--timejs-serialization' CSS property can be used to specify the
date and time serialization format.  This version supports following
serializations:

  Property value     Output example
  -----------------  ----------------------------------
  'auto' (default)   (platform dependent)
  'dtsjp1'           令和元(2019)年9月28日 1時23分45秒
  'dtsjp2'           R1(2019).9.28 1:23:45
  'dtsjp3'           2019(R1)/9/28 1:23:45

For backward compatibility with previous versions of this script, if
there is no |data-time-selector| or |data-selector| attribute, the
script does nothing by default, except for defining the |TER| global
property.  By invoking |new TER (/element/)| or |new TER.Delta
(/element/)| constructor, where /element/ is an element node, any
|time| element in the /element/ subtree (or /element/ itself if it is
a |time| element) is processed appropriately.  The |TER| constructor
is equivalent to no |data-format| attribute and the |TER.Delta|
constructor is equivalent to |data-format=ambtime|.

Repository:

Latest version of this script is available in Git repository
<https://github.com/wakaba/timejs>.

Specification:

HTML Standard <https://html.spec.whatwg.org/#the-time-element>.

This script interprets "global date and time string" using older
parsing rules as defined in previous versions of the HTML spec, which
is a willful violation to the current HTML Living Standard.

*/

/* ***** BEGIN LICENSE BLOCK *****
 *
 * Copyright 2008-2020 Wakaba <wakaba@suikawiki.org>.  All rights reserved.
 *
 * Copyright 2017 Hatena <http://hatenacorp.jp/>.  All rights reserved.
 *
 * This program is free software; you can redistribute it and/or 
 * modify it under the same terms as Perl itself.
 *
 * Alternatively, the contents of this file may be used 
 * under the following terms (the "MPL/GPL/LGPL"), 
 * in which case the provisions of the MPL/GPL/LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of the MPL/GPL/LGPL, and not to allow others to
 * use your version of this file under the terms of the Perl, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the MPL/GPL/LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the Perl or the MPL/GPL/LGPL.
 *
 * "MPL/GPL/LGPL":
 *
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * <https://www.mozilla.org/MPL/>
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is TER code.
 *
 * The Initial Developer of the Original Code is Wakaba.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Wakaba <wakaba@suikawiki.org>
 *   Hatena <http://hatenacorp.jp/>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the LGPL or the GPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
TER.defs = {"dts":{"dtsjp1":[[null,["グレゴリオ暦西暦",["Y",0]]],[-962750,["グレゴリオ暦神武天皇即位前",["k"],"(",["Y",0],")"]],[-960181,["グレゴリオ暦神武天皇",["Y",-660],"(",["Y",0],")"]],[-931329,["グレゴリオ暦綏靖天皇",["Y",-581],"(",["Y",0],")"]],[-919281,["グレゴリオ暦安寧天皇",["Y",-548],"(",["Y",0],")"]],[-905401,["グレゴリオ暦懿徳天皇",["Y",-510],"(",["Y",0],")"]],[-892615,["グレゴリオ暦孝昭天皇",["Y",-475],"(",["Y",0],")"]],[-862316,["グレゴリオ暦孝安天皇",["Y",-392],"(",["Y",0],")"]],[-825049,["グレゴリオ暦孝霊天皇",["Y",-290],"(",["Y",0],")"]],[-797290,["グレゴリオ暦孝元天皇",["Y",-214],"(",["Y",0],")"]],[-776471,["グレゴリオ暦開化天皇",["Y",-157],"(",["Y",0],")"]],[-754559,["グレゴリオ暦崇神天皇",["Y",-97],"(",["Y",0],")"]],[-729724,["グレゴリオ暦垂仁天皇",["Y",-29],"(",["Y",0],")"]],[-693549,["グレゴリオ暦景行天皇",["Y",70],"(",["Y",0],")"]],[-671637,["グレゴリオ暦成務天皇",["Y",130],"(",["Y",0],")"]],[-649371,["グレゴリオ暦仲哀天皇",["Y",191],"(",["Y",0],")"]],[-646093,["グレゴリオ暦神功皇后摂政",["Y",200],"(",["Y",0],")"]],[-620874,["グレゴリオ暦応神天皇",["Y",269],"(",["Y",0],")"]],[-605164,["グレゴリオ暦仁徳天皇",["Y",312],"(",["Y",0],")"]],[-573389,["グレゴリオ暦履中天皇",["Y",399],"(",["Y",0],")"]],[-571204,["グレゴリオ暦反正天皇",["Y",405],"(",["Y",0],")"]],[-569018,["グレゴリオ暦允恭天皇",["Y",411],"(",["Y",0],")"]],[-553662,["グレゴリオ暦安康天皇",["Y",453],"(",["Y",0],")"]],[-552570,["グレゴリオ暦雄略天皇",["Y",456],"(",["Y",0],")"]],[-544183,["グレゴリオ暦清寧天皇",["Y",479],"(",["Y",0],")"]],[-542352,["グレゴリオ暦顕宗天皇",["Y",484],"(",["Y",0],")"]],[-541260,["グレゴリオ暦仁賢天皇",["Y",487],"(",["Y",0],")"]],[-537243,["グレゴリオ暦武烈天皇",["Y",498],"(",["Y",0],")"]],[-534320,["グレゴリオ暦継体天皇",["Y",506],"(",["Y",0],")"]],[-524457,["グレゴリオ暦安閑天皇",["Y",533],"(",["Y",0],")"]],[-523718,["グレゴリオ暦宣化天皇",["Y",535],"(",["Y",0],")"]],[-522271,["グレゴリオ暦欽明天皇",["Y",539],"(",["Y",0],")"]],[-510577,["グレゴリオ暦敏達天皇",["Y",571],"(",["Y",0],")"]],[-505469,["グレゴリオ暦用明天皇",["Y",585],"(",["Y",0],")"]],[-504730,["グレゴリオ暦崇峻天皇",["Y",587],"(",["Y",0],")"]],[-502899,["グレゴリオ暦推古天皇",["Y",592],"(",["Y",0],")"]],[-489758,["グレゴリオ暦舒明天皇",["Y",628],"(",["Y",0],")"]],[-485004,["グレゴリオ暦皇極天皇",["Y",641],"(",["Y",0],")"]],[-483746,["グレゴリオ暦大化",["Y",644],"(",["Y",0],")"]],[-482037,["グレゴリオ暦白雉",["Y",649],"(",["Y",0],")"]],[-480249,["グレゴリオ暦斉明天皇",["Y",654],"(",["Y",0],")"]],[-477710,["グレゴリオ暦天智天皇",["Y",661],"(",["Y",0],")"]],[-474048,["グレゴリオ暦天武天皇",["Y",671],"(",["Y",0],")"]],[-468743,["グレゴリオ暦朱鳥",["Y",685],"(",["Y",0],")"]],[-468555,["グレゴリオ暦持統天皇",["Y",686],"(",["Y",0],")"]],[-464717,["グレゴリオ暦文武天皇",["Y",696],"(",["Y",0],")"]],[-463367,["グレゴリオ暦大宝",["Y",700],"(",["Y",0],")"]],[-462227,["グレゴリオ暦慶雲",["Y",703],"(",["Y",0],")"]],[-460896,["グレゴリオ暦和銅",["Y",707],"(",["Y",0],")"]],[-458101,["グレゴリオ暦霊亀",["Y",714],"(",["Y",0],")"]],[-457288,["グレゴリオ暦養老",["Y",716],"(",["Y",0],")"]],[-455027,["グレゴリオ暦神亀",["Y",723],"(",["Y",0],")"]],[-453018,["グレゴリオ暦天平",["Y",728],"(",["Y",0],")"]],[-445834,["グレゴリオ暦天平感宝",["Y",748],"(",["Y",0],")"]],[-445727,["グレゴリオ暦天平勝宝",["Y",748],"(",["Y",0],")"]],[-442787,["グレゴリオ暦天平宝字",["Y",756],"(",["Y",0],")"]],[-440082,["グレゴリオ暦天平神護",["Y",764],"(",["Y",0],")"]],[-439128,["グレゴリオ暦神護景雲",["Y",766],"(",["Y",0],")"]],[-437992,["グレゴリオ暦宝亀",["Y",769],"(",["Y",0],")"]],[-434240,["グレゴリオ暦天応",["Y",780],"(",["Y",0],")"]],[-433632,["グレゴリオ暦延暦",["Y",781],"(",["Y",0],")"]],[-424980,["グレゴリオ暦大同",["Y",805],"(",["Y",0],")"]],[-423385,["グレゴリオ暦弘仁",["Y",809],"(",["Y",0],")"]],[-418526,["グレゴリオ暦天長",["Y",823],"(",["Y",0],")"]],[-414867,["グレゴリオ暦承和",["Y",833],"(",["Y",0],")"]],[-409601,["グレゴリオ暦嘉祥",["Y",847],"(",["Y",0],")"]],[-408551,["グレゴリオ暦仁寿",["Y",850],"(",["Y",0],")"]],[-407250,["グレゴリオ暦斉衡",["Y",853],"(",["Y",0],")"]],[-406432,["グレゴリオ暦天安",["Y",856],"(",["Y",0],")"]],[-405641,["グレゴリオ暦貞観",["Y",858],"(",["Y",0],")"]],[-399054,["グレゴリオ暦元慶",["Y",876],"(",["Y",0],")"]],[-396214,["グレゴリオ暦仁和",["Y",884],"(",["Y",0],")"]],[-394673,["グレゴリオ暦寛平",["Y",888],"(",["Y",0],")"]],[-391396,["グレゴリオ暦昌泰",["Y",897],"(",["Y",0],")"]],[-390197,["グレゴリオ暦延喜",["Y",900],"(",["Y",0],")"]],[-382256,["グレゴリオ暦延長",["Y",922],"(",["Y",0],")"]],[-379347,["グレゴリオ暦承平",["Y",930],"(",["Y",0],")"]],[-376753,["グレゴリオ暦天慶",["Y",937],"(",["Y",0],")"]],[-373504,["グレゴリオ暦天暦",["Y",946],"(",["Y",0],")"]],[-369661,["グレゴリオ暦天徳",["Y",956],"(",["Y",0],")"]],[-368461,["グレゴリオ暦応和",["Y",960],"(",["Y",0],")"]],[-367198,["グレゴリオ暦康保",["Y",963],"(",["Y",0],")"]],[-365717,["グレゴリオ暦安和",["Y",967],"(",["Y",0],")"]],[-365115,["グレゴリオ暦天禄",["Y",969],"(",["Y",0],")"]],[-363761,["グレゴリオ暦天延",["Y",972],"(",["Y",0],")"]],[-362823,["グレゴリオ暦貞元",["Y",975],"(",["Y",0],")"]],[-361951,["グレゴリオ暦天元",["Y",977],"(",["Y",0],")"]],[-360341,["グレゴリオ暦永観",["Y",982],"(",["Y",0],")"]],[-359620,["グレゴリオ暦寛和",["Y",984],"(",["Y",0],")"]],[-358904,["グレゴリオ暦永延",["Y",986],"(",["Y",0],")"]],[-358045,["グレゴリオ暦永祚",["Y",988],"(",["Y",0],")"]],[-357603,["グレゴリオ暦正暦",["Y",989],"(",["Y",0],")"]],[-356023,["グレゴリオ暦長徳",["Y",994],"(",["Y",0],")"]],[-354614,["グレゴリオ暦長保",["Y",998],"(",["Y",0],")"]],[-352599,["グレゴリオ暦寛弘",["Y",1003],"(",["Y",0],")"]],[-349493,["グレゴリオ暦長和",["Y",1011],"(",["Y",0],")"]],[-347930,["グレゴリオ暦寛仁",["Y",1016],"(",["Y",0],")"]],[-346534,["グレゴリオ暦治安",["Y",1020],"(",["Y",0],")"]],[-345283,["グレゴリオ暦万寿",["Y",1023],"(",["Y",0],")"]],[-343823,["グレゴリオ暦長元",["Y",1027],"(",["Y",0],")"]],[-340637,["グレゴリオ暦長暦",["Y",1036],"(",["Y",0],")"]],[-339320,["グレゴリオ暦長久",["Y",1039],"(",["Y",0],")"]],[-337859,["グレゴリオ暦寛徳",["Y",1043],"(",["Y",0],")"]],[-337337,["グレゴリオ暦永承",["Y",1045],"(",["Y",0],")"]],[-334889,["グレゴリオ暦天喜",["Y",1052],"(",["Y",0],")"]],[-332834,["グレゴリオ暦康平",["Y",1057],"(",["Y",0],")"]],[-330292,["グレゴリオ暦治暦",["Y",1064],"(",["Y",0],")"]],[-328952,["グレゴリオ暦延久",["Y",1068],"(",["Y",0],")"]],[-326993,["グレゴリオ暦承保",["Y",1073],"(",["Y",0],")"]],[-325817,["グレゴリオ暦承暦",["Y",1076],"(",["Y",0],")"]],[-324614,["グレゴリオ暦永保",["Y",1080],"(",["Y",0],")"]],[-323525,["グレゴリオ暦応徳",["Y",1083],"(",["Y",0],")"]],[-322373,["グレゴリオ暦寛治",["Y",1086],"(",["Y",0],")"]],[-319559,["グレゴリオ暦嘉保",["Y",1093],"(",["Y",0],")"]],[-318848,["グレゴリオ暦永長",["Y",1095],"(",["Y",0],")"]],[-318490,["グレゴリオ暦承徳",["Y",1096],"(",["Y",0],")"]],[-317863,["グレゴリオ暦康和",["Y",1098],"(",["Y",0],")"]],[-316227,["グレゴリオ暦長治",["Y",1103],"(",["Y",0],")"]],[-315431,["グレゴリオ暦嘉承",["Y",1105],"(",["Y",0],")"]],[-314581,["グレゴリオ暦天仁",["Y",1107],"(",["Y",0],")"]],[-313891,["グレゴリオ暦天永",["Y",1109],"(",["Y",0],")"]],[-312770,["グレゴリオ暦永久",["Y",1112],"(",["Y",0],")"]],[-311066,["グレゴリオ暦元永",["Y",1117],"(",["Y",0],")"]],[-310321,["グレゴリオ暦保安",["Y",1119],"(",["Y",0],")"]],[-308851,["グレゴリオ暦天治",["Y",1123],"(",["Y",0],")"]],[-308213,["グレゴリオ暦大治",["Y",1125],"(",["Y",0],")"]],[-306374,["グレゴリオ暦天承",["Y",1130],"(",["Y",0],")"]],[-305803,["グレゴリオ暦長承",["Y",1131],"(",["Y",0],")"]],[-304811,["グレゴリオ暦保延",["Y",1134],"(",["Y",0],")"]],[-302555,["グレゴリオ暦永治",["Y",1140],"(",["Y",0],")"]],[-302270,["グレゴリオ暦康治",["Y",1141],"(",["Y",0],")"]],[-301597,["グレゴリオ暦天養",["Y",1143],"(",["Y",0],")"]],[-301095,["グレゴリオ暦久安",["Y",1144],"(",["Y",0],")"]],[-299083,["グレゴリオ暦仁平",["Y",1150],"(",["Y",0],")"]],[-297694,["グレゴリオ暦久寿",["Y",1153],"(",["Y",0],")"]],[-297163,["グレゴリオ暦保元",["Y",1155],"(",["Y",0],")"]],[-296077,["グレゴリオ暦平治",["Y",1158],"(",["Y",0],")"]],[-295792,["グレゴリオ暦永暦",["Y",1159],"(",["Y",0],")"]],[-295208,["グレゴリオ暦応保",["Y",1160],"(",["Y",0],")"]],[-294621,["グレゴリオ暦長寛",["Y",1162],"(",["Y",0],")"]],[-293819,["グレゴリオ暦永万",["Y",1164],"(",["Y",0],")"]],[-293383,["グレゴリオ暦仁安",["Y",1165],"(",["Y",0],")"]],[-292427,["グレゴリオ暦嘉応",["Y",1168],"(",["Y",0],")"]],[-291676,["グレゴリオ暦承安",["Y",1170],"(",["Y",0],")"]],[-290134,["グレゴリオ暦安元",["Y",1174],"(",["Y",0],")"]],[-289390,["グレゴリオ暦治承",["Y",1176],"(",["Y",0],")"]],[-287933,["グレゴリオ暦養和",["Y",1180],"(",["Y",0],")"]],[-287625,["グレゴリオ暦寿永",["Y",1181],"(",["Y",0],")"]],[-286927,["グレゴリオ暦元暦",["Y",1183],"(",["Y",0],")"]],[-286457,["グレゴリオ暦文治",["Y",1184],"(",["Y",0],")"]],[-284747,["グレゴリオ暦建久",["Y",1189],"(",["Y",0],")"]],[-281453,["グレゴリオ暦正治",["Y",1198],"(",["Y",0],")"]],[-280787,["グレゴリオ暦建仁",["Y",1200],"(",["Y",0],")"]],[-279687,["グレゴリオ暦元久",["Y",1203],"(",["Y",0],")"]],[-278883,["グレゴリオ暦建永",["Y",1205],"(",["Y",0],")"]],[-278354,["グレゴリオ暦承元",["Y",1206],"(",["Y",0],")"]],[-277100,["グレゴリオ暦建暦",["Y",1210],"(",["Y",0],")"]],[-276099,["グレゴリオ暦建保",["Y",1212],"(",["Y",0],")"]],[-274144,["グレゴリオ暦承久",["Y",1218],"(",["Y",0],")"]],[-273050,["グレゴリオ暦貞応",["Y",1221],"(",["Y",0],")"]],[-272099,["グレゴリオ暦元仁",["Y",1223],"(",["Y",0],")"]],[-271951,["グレゴリオ暦嘉禄",["Y",1224],"(",["Y",0],")"]],[-270986,["グレゴリオ暦安貞",["Y",1226],"(",["Y",0],")"]],[-270548,["グレゴリオ暦寛喜",["Y",1228],"(",["Y",0],")"]],[-269429,["グレゴリオ暦貞永",["Y",1231],"(",["Y",0],")"]],[-269032,["グレゴリオ暦天福",["Y",1232],"(",["Y",0],")"]],[-268481,["グレゴリオ暦文暦",["Y",1233],"(",["Y",0],")"]],[-268142,["グレゴリオ暦嘉禎",["Y",1234],"(",["Y",0],")"]],[-266987,["グレゴリオ暦暦仁",["Y",1237],"(",["Y",0],")"]],[-266914,["グレゴリオ暦延応",["Y",1238],"(",["Y",0],")"]],[-266403,["グレゴリオ暦仁治",["Y",1239],"(",["Y",0],")"]],[-265448,["グレゴリオ暦寛元",["Y",1242],"(",["Y",0],")"]],[-263969,["グレゴリオ暦宝治",["Y",1246],"(",["Y",0],")"]],[-263211,["グレゴリオ暦建長",["Y",1248],"(",["Y",0],")"]],[-260479,["グレゴリオ暦康元",["Y",1255],"(",["Y",0],")"]],[-260321,["グレゴリオ暦正嘉",["Y",1256],"(",["Y",0],")"]],[-259571,["グレゴリオ暦正元",["Y",1258],"(",["Y",0],")"]],[-259171,["グレゴリオ暦文応",["Y",1259],"(",["Y",0],")"]],[-258869,["グレゴリオ暦弘長",["Y",1260],"(",["Y",0],")"]],[-257768,["グレゴリオ暦文永",["Y",1263],"(",["Y",0],")"]],[-253695,["グレゴリオ暦建治",["Y",1274],"(",["Y",0],")"]],[-252659,["グレゴリオ暦弘安",["Y",1277],"(",["Y",0],")"]],[-248939,["グレゴリオ暦正応",["Y",1287],"(",["Y",0],")"]],[-247013,["グレゴリオ暦永仁",["Y",1292],"(",["Y",0],")"]],[-244926,["グレゴリオ暦正安",["Y",1298],"(",["Y",0],")"]],[-243631,["グレゴリオ暦乾元",["Y",1301],"(",["Y",0],")"]],[-243351,["グレゴリオ暦嘉元",["Y",1302],"(",["Y",0],")"]],[-242131,["グレゴリオ暦徳治",["Y",1305],"(",["Y",0],")"]],[-241457,["グレゴリオ暦延慶",["Y",1307],"(",["Y",0],")"]],[-240551,["グレゴリオ暦応長",["Y",1310],"(",["Y",0],")"]],[-240205,["グレゴリオ暦正和",["Y",1311],"(",["Y",0],")"]],[-238421,["グレゴリオ暦文保",["Y",1316],"(",["Y",0],")"]],[-237628,["グレゴリオ暦元応",["Y",1318],"(",["Y",0],")"]],[-236954,["グレゴリオ暦元亨",["Y",1320],"(",["Y",0],")"]],[-235580,["グレゴリオ暦正中",["Y",1323],"(",["Y",0],")"]],[-235061,["グレゴリオ暦嘉暦",["Y",1325],"(",["Y",0],")"]],[-233848,["グレゴリオ暦元徳",["Y",1328],"(",["Y",0],")"]],[-233129,["グレゴリオ暦元弘",["Y",1330],"/元徳",["Y",1328],"(",["Y",0],")"]],[-232874,["グレゴリオ暦元弘",["Y",1330],"/正慶",["Y",1331],"(",["Y",0],")"]],[-232464,["グレゴリオ暦元弘",["Y",1330],"(",["Y",0],")"]],[-232223,["グレゴリオ暦建武",["Y",1333],"(",["Y",0],")"]],[-231455,["グレゴリオ暦延元",["Y",1335],"(",["Y",0],")"]],[-231352,["グレゴリオ暦延元",["Y",1335],"/建武",["Y",1333],"(",["Y",0],")"]],[-230542,["グレゴリオ暦延元",["Y",1335],"/暦応",["Y",1337],"(",["Y",0],")"]],[-229950,["グレゴリオ暦興国",["Y",1339],"/暦応",["Y",1337],"(",["Y",0],")"]],[-229213,["グレゴリオ暦興国",["Y",1339],"/康永",["Y",1341],"(",["Y",0],")"]],[-227950,["グレゴリオ暦興国",["Y",1339],"/貞和",["Y",1344],"(",["Y",0],")"]],[-227519,["グレゴリオ暦正平",["Y",1345],"/貞和",["Y",1344],"(",["Y",0],")"]],[-226349,["グレゴリオ暦正平",["Y",1345],"/観応",["Y",1349],"(",["Y",0],")"]],[-225748,["グレゴリオ暦正平",["Y",1345],"(",["Y",0],")"]],[-225593,["グレゴリオ暦正平",["Y",1345],"/観応",["Y",1349],"(",["Y",0],")"]],[-225404,["グレゴリオ暦正平",["Y",1345],"/文和",["Y",1351],"(",["Y",0],")"]],[-224132,["グレゴリオ暦正平",["Y",1345],"/延文",["Y",1355],"(",["Y",0],")"]],[-222301,["グレゴリオ暦正平",["Y",1345],"/康安",["Y",1360],"(",["Y",0],")"]],[-221776,["グレゴリオ暦正平",["Y",1345],"/貞治",["Y",1361],"(",["Y",0],")"]],[-219802,["グレゴリオ暦正平",["Y",1345],"/応安",["Y",1367],"(",["Y",0],")"]],[-219076,["グレゴリオ暦建徳",["Y",1369],"/応安",["Y",1367],"(",["Y",0],")"]],[-218256,["グレゴリオ暦文中",["Y",1371],"/応安",["Y",1367],"(",["Y",0],")"]],[-217224,["グレゴリオ暦文中",["Y",1371],"/永和",["Y",1374],"(",["Y",0],")"]],[-217135,["グレゴリオ暦天授",["Y",1374],"/永和",["Y",1374],"(",["Y",0],")"]],[-215752,["グレゴリオ暦天授",["Y",1374],"/康暦",["Y",1378],"(",["Y",0],")"]],[-215055,["グレゴリオ暦弘和",["Y",1380],"/康暦",["Y",1378],"(",["Y",0],")"]],[-215041,["グレゴリオ暦弘和",["Y",1380],"/永徳",["Y",1380],"(",["Y",0],")"]],[-213946,["グレゴリオ暦弘和",["Y",1380],"/至徳",["Y",1383],"(",["Y",0],")"]],[-213886,["グレゴリオ暦元中",["Y",1383],"/至徳",["Y",1383],"(",["Y",0],")"]],[-212651,["グレゴリオ暦元中",["Y",1383],"/嘉慶",["Y",1386],"(",["Y",0],")"]],[-212132,["グレゴリオ暦元中",["Y",1383],"/康応",["Y",1388],"(",["Y",0],")"]],[-211731,["グレゴリオ暦元中",["Y",1383],"/明徳",["Y",1389],"(",["Y",0],")"]],[-210779,["グレゴリオ暦明徳",["Y",1389],"(",["Y",0],")"]],[-210158,["グレゴリオ暦応永",["Y",1393],"(",["Y",0],")"]],[-197792,["グレゴリオ暦正長",["Y",1427],"(",["Y",0],")"]],[-197312,["グレゴリオ暦永享",["Y",1428],"(",["Y",0],")"]],[-193136,["グレゴリオ暦嘉吉",["Y",1440],"(",["Y",0],")"]],[-192056,["グレゴリオ暦文安",["Y",1443],"(",["Y",0],")"]],[-190055,["グレゴリオ暦宝徳",["Y",1448],"(",["Y",0],")"]],[-188965,["グレゴリオ暦享徳",["Y",1451],"(",["Y",0],")"]],[-187843,["グレゴリオ暦康正",["Y",1454],"(",["Y",0],")"]],[-187072,["グレゴリオ暦長禄",["Y",1456],"(",["Y",0],")"]],[-185868,["グレゴリオ暦寛正",["Y",1459],"(",["Y",0],")"]],[-184001,["グレゴリオ暦文正",["Y",1465],"(",["Y",0],")"]],[-183610,["グレゴリオ暦応仁",["Y",1466],"(",["Y",0],")"]],[-182819,["グレゴリオ暦文明",["Y",1468],"(",["Y",0],")"]],[-176183,["グレゴリオ暦長享",["Y",1486],"(",["Y",0],")"]],[-175414,["グレゴリオ暦延徳",["Y",1488],"(",["Y",0],")"]],[-174353,["グレゴリオ暦明応",["Y",1491],"(",["Y",0],")"]],[-171213,["グレゴリオ暦文亀",["Y",1500],"(",["Y",0],")"]],[-170119,["グレゴリオ暦永正",["Y",1503],"(",["Y",0],")"]],[-163719,["グレゴリオ暦大永",["Y",1520],"(",["Y",0],")"]],[-161182,["グレゴリオ暦享禄",["Y",1527],"(",["Y",0],")"]],[-159726,["グレゴリオ暦天文",["Y",1531],"(",["Y",0],")"]],[-151256,["グレゴリオ暦弘治",["Y",1554],"(",["Y",0],")"]],[-150394,["グレゴリオ暦永禄",["Y",1557],"(",["Y",0],")"]],[-145941,["グレゴリオ暦元亀",["Y",1569],"(",["Y",0],")"]],[-144755,["グレゴリオ暦天正",["Y",1572],"(",["Y",0],")"]],[-137687,["グレゴリオ暦文禄",["Y",1591],"(",["Y",0],")"]],[-136251,["グレゴリオ暦慶長",["Y",1595],"(",["Y",0],")"]],[-129414,["グレゴリオ暦元和",["Y",1614],"(",["Y",0],")"]],[-126267,["グレゴリオ暦寛永",["Y",1623],"(",["Y",0],")"]],[-118691,["グレゴリオ暦正保",["Y",1643],"(",["Y",0],")"]],[-117511,["グレゴリオ暦慶安",["Y",1647],"(",["Y",0],")"]],[-115854,["グレゴリオ暦承応",["Y",1651],"(",["Y",0],")"]],[-114914,["グレゴリオ暦明暦",["Y",1654],"(",["Y",0],")"]],[-113723,["グレゴリオ暦万治",["Y",1657],"(",["Y",0],")"]],[-112717,["グレゴリオ暦寛文",["Y",1660],"(",["Y",0],")"]],[-108174,["グレゴリオ暦延宝",["Y",1672],"(",["Y",0],")"]],[-105242,["グレゴリオ暦天和",["Y",1680],"(",["Y",0],")"]],[-104364,["グレゴリオ暦貞享",["Y",1683],"(",["Y",0],")"]],[-102702,["グレゴリオ暦元禄",["Y",1687],"(",["Y",0],")"]],[-97049,["グレゴリオ暦宝永",["Y",1703],"(",["Y",0],")"]],[-94437,["グレゴリオ暦正徳",["Y",1710],"(",["Y",0],")"]],[-92551,["グレゴリオ暦享保",["Y",1715],"(",["Y",0],")"]],[-85309,["グレゴリオ暦元文",["Y",1735],"(",["Y",0],")"]],[-83539,["グレゴリオ暦寛保",["Y",1740],"(",["Y",0],")"]],[-82452,["グレゴリオ暦延享",["Y",1743],"(",["Y",0],")"]],[-80867,["グレゴリオ暦寛延",["Y",1747],"(",["Y",0],")"]],[-79641,["グレゴリオ暦宝暦",["Y",1750],"(",["Y",0],")"]],[-75059,["グレゴリオ暦明和",["Y",1763],"(",["Y",0],")"]],[-71974,["グレゴリオ暦安永",["Y",1771],"(",["Y",0],")"]],[-68916,["グレゴリオ暦天明",["Y",1780],"(",["Y",0],")"]],[-66059,["グレゴリオ暦寛政",["Y",1788],"(",["Y",0],")"]],[-61649,["グレゴリオ暦享和",["Y",1800],"(",["Y",0],")"]],[-60550,["グレゴリオ暦文化",["Y",1803],"(",["Y",0],")"]],[-55372,["グレゴリオ暦文政",["Y",1817],"(",["Y",0],")"]],[-50747,["グレゴリオ暦天保",["Y",1829],"(",["Y",0],")"]],[-45647,["グレゴリオ暦弘化",["Y",1843],"(",["Y",0],")"]],[-44469,["グレゴリオ暦嘉永",["Y",1847],"(",["Y",0],")"]],[-41989,["グレゴリオ暦安政",["Y",1853],"(",["Y",0],")"]],[-40079,["グレゴリオ暦万延",["Y",1859],"(",["Y",0],")"]],[-39724,["グレゴリオ暦文久",["Y",1860],"(",["Y",0],")"]],[-38630,["グレゴリオ暦元治",["Y",1863],"(",["Y",0],")"]],[-38230,["グレゴリオ暦慶応",["Y",1864],"(",["Y",0],")"]],[-36959,["グレゴリオ暦明治",["Y",1867],"(",["Y",0],")"]],[-35428,["明治",["Y",1867],"(",["Y",0],")"]],[-20974,["大正",["Y",1911],"(",["Y",0],")"]],[-15713,["昭和",["Y",1925],"(",["Y",0],")"]],[6947,["平成",["Y",1988],"(",["Y",0],")"]],[18017,["令和",["Y",2018],"(",["Y",0],")"]]],"dtsjp2":[[null,["グレゴリオ暦西暦",["y",0]]],[-962750,["グレゴリオ暦神武天皇即位前",["k"],"(",["y",0],")"]],[-960181,["グレゴリオ暦神武",["y",-660],"(",["y",0],")"]],[-931329,["グレゴリオ暦綏靖",["y",-581],"(",["y",0],")"]],[-919281,["グレゴリオ暦安寧",["y",-548],"(",["y",0],")"]],[-905401,["グレゴリオ暦懿徳",["y",-510],"(",["y",0],")"]],[-892615,["グレゴリオ暦孝昭",["y",-475],"(",["y",0],")"]],[-862316,["グレゴリオ暦孝安",["y",-392],"(",["y",0],")"]],[-825049,["グレゴリオ暦孝霊",["y",-290],"(",["y",0],")"]],[-797290,["グレゴリオ暦孝元",["y",-214],"(",["y",0],")"]],[-776471,["グレゴリオ暦開化",["y",-157],"(",["y",0],")"]],[-754559,["グレゴリオ暦崇神",["y",-97],"(",["y",0],")"]],[-729724,["グレゴリオ暦垂仁",["y",-29],"(",["y",0],")"]],[-693549,["グレゴリオ暦景行",["y",70],"(",["y",0],")"]],[-671637,["グレゴリオ暦成務",["y",130],"(",["y",0],")"]],[-649371,["グレゴリオ暦仲哀",["y",191],"(",["y",0],")"]],[-646093,["グレゴリオ暦神功",["y",200],"(",["y",0],")"]],[-620874,["グレゴリオ暦応神",["y",269],"(",["y",0],")"]],[-605164,["グレゴリオ暦仁徳",["y",312],"(",["y",0],")"]],[-573389,["グレゴリオ暦履中",["y",399],"(",["y",0],")"]],[-571204,["グレゴリオ暦反正",["y",405],"(",["y",0],")"]],[-569018,["グレゴリオ暦允恭",["y",411],"(",["y",0],")"]],[-553662,["グレゴリオ暦安康",["y",453],"(",["y",0],")"]],[-552570,["グレゴリオ暦雄略",["y",456],"(",["y",0],")"]],[-544183,["グレゴリオ暦清寧",["y",479],"(",["y",0],")"]],[-542352,["グレゴリオ暦顕宗",["y",484],"(",["y",0],")"]],[-541260,["グレゴリオ暦仁賢",["y",487],"(",["y",0],")"]],[-537243,["グレゴリオ暦武烈",["y",498],"(",["y",0],")"]],[-534320,["グレゴリオ暦継体",["y",506],"(",["y",0],")"]],[-524457,["グレゴリオ暦安閑",["y",533],"(",["y",0],")"]],[-523718,["グレゴリオ暦宣化",["y",535],"(",["y",0],")"]],[-522271,["グレゴリオ暦欽明",["y",539],"(",["y",0],")"]],[-510577,["グレゴリオ暦敏達",["y",571],"(",["y",0],")"]],[-505469,["グレゴリオ暦用明",["y",585],"(",["y",0],")"]],[-504730,["グレゴリオ暦崇峻",["y",587],"(",["y",0],")"]],[-502899,["グレゴリオ暦推古",["y",592],"(",["y",0],")"]],[-489758,["グレゴリオ暦舒明",["y",628],"(",["y",0],")"]],[-485004,["グレゴリオ暦皇極",["y",641],"(",["y",0],")"]],[-483746,["グレゴリオ暦大化",["y",644],"(",["y",0],")"]],[-482037,["グレゴリオ暦白雉",["y",649],"(",["y",0],")"]],[-480249,["グレゴリオ暦斉明",["y",654],"(",["y",0],")"]],[-477710,["グレゴリオ暦天智",["y",661],"(",["y",0],")"]],[-474048,["グレゴリオ暦天武",["y",671],"(",["y",0],")"]],[-468743,["グレゴリオ暦朱鳥",["y",685],"(",["y",0],")"]],[-468555,["グレゴリオ暦持統",["y",686],"(",["y",0],")"]],[-464717,["グレゴリオ暦文武",["y",696],"(",["y",0],")"]],[-463367,["グレゴリオ暦大宝",["y",700],"(",["y",0],")"]],[-462227,["グレゴリオ暦慶雲",["y",703],"(",["y",0],")"]],[-460896,["グレゴリオ暦和銅",["y",707],"(",["y",0],")"]],[-458101,["グレゴリオ暦霊亀",["y",714],"(",["y",0],")"]],[-457288,["グレゴリオ暦養老",["y",716],"(",["y",0],")"]],[-455027,["グレゴリオ暦神亀",["y",723],"(",["y",0],")"]],[-453018,["グレゴリオ暦天平",["y",728],"(",["y",0],")"]],[-445834,["グレゴリオ暦天平感宝",["y",748],"(",["y",0],")"]],[-445727,["グレゴリオ暦天平勝宝",["y",748],"(",["y",0],")"]],[-442787,["グレゴリオ暦天平宝字",["y",756],"(",["y",0],")"]],[-440082,["グレゴリオ暦天平神護",["y",764],"(",["y",0],")"]],[-439128,["グレゴリオ暦神護景雲",["y",766],"(",["y",0],")"]],[-437992,["グレゴリオ暦宝亀",["y",769],"(",["y",0],")"]],[-434240,["グレゴリオ暦天応",["y",780],"(",["y",0],")"]],[-433632,["グレゴリオ暦延暦",["y",781],"(",["y",0],")"]],[-424980,["グレゴリオ暦大同",["y",805],"(",["y",0],")"]],[-423385,["グレゴリオ暦弘仁",["y",809],"(",["y",0],")"]],[-418526,["グレゴリオ暦天長",["y",823],"(",["y",0],")"]],[-414867,["グレゴリオ暦承和",["y",833],"(",["y",0],")"]],[-409601,["グレゴリオ暦嘉祥",["y",847],"(",["y",0],")"]],[-408551,["グレゴリオ暦仁寿",["y",850],"(",["y",0],")"]],[-407250,["グレゴリオ暦斉衡",["y",853],"(",["y",0],")"]],[-406432,["グレゴリオ暦天安",["y",856],"(",["y",0],")"]],[-405641,["グレゴリオ暦貞観",["y",858],"(",["y",0],")"]],[-399054,["グレゴリオ暦元慶",["y",876],"(",["y",0],")"]],[-396214,["グレゴリオ暦仁和",["y",884],"(",["y",0],")"]],[-394673,["グレゴリオ暦寛平",["y",888],"(",["y",0],")"]],[-391396,["グレゴリオ暦昌泰",["y",897],"(",["y",0],")"]],[-390197,["グレゴリオ暦延喜",["y",900],"(",["y",0],")"]],[-382256,["グレゴリオ暦延長",["y",922],"(",["y",0],")"]],[-379347,["グレゴリオ暦承平",["y",930],"(",["y",0],")"]],[-376753,["グレゴリオ暦天慶",["y",937],"(",["y",0],")"]],[-373504,["グレゴリオ暦天暦",["y",946],"(",["y",0],")"]],[-369661,["グレゴリオ暦天徳",["y",956],"(",["y",0],")"]],[-368461,["グレゴリオ暦応和",["y",960],"(",["y",0],")"]],[-367198,["グレゴリオ暦康保",["y",963],"(",["y",0],")"]],[-365717,["グレゴリオ暦安和",["y",967],"(",["y",0],")"]],[-365115,["グレゴリオ暦天禄",["y",969],"(",["y",0],")"]],[-363761,["グレゴリオ暦天延",["y",972],"(",["y",0],")"]],[-362823,["グレゴリオ暦貞元",["y",975],"(",["y",0],")"]],[-361951,["グレゴリオ暦天元",["y",977],"(",["y",0],")"]],[-360341,["グレゴリオ暦永観",["y",982],"(",["y",0],")"]],[-359620,["グレゴリオ暦寛和",["y",984],"(",["y",0],")"]],[-358904,["グレゴリオ暦永延",["y",986],"(",["y",0],")"]],[-358045,["グレゴリオ暦永祚",["y",988],"(",["y",0],")"]],[-357603,["グレゴリオ暦正暦",["y",989],"(",["y",0],")"]],[-356023,["グレゴリオ暦長徳",["y",994],"(",["y",0],")"]],[-354614,["グレゴリオ暦長保",["y",998],"(",["y",0],")"]],[-352599,["グレゴリオ暦寛弘",["y",1003],"(",["y",0],")"]],[-349493,["グレゴリオ暦長和",["y",1011],"(",["y",0],")"]],[-347930,["グレゴリオ暦寛仁",["y",1016],"(",["y",0],")"]],[-346534,["グレゴリオ暦治安",["y",1020],"(",["y",0],")"]],[-345283,["グレゴリオ暦万寿",["y",1023],"(",["y",0],")"]],[-343823,["グレゴリオ暦長元",["y",1027],"(",["y",0],")"]],[-340637,["グレゴリオ暦長暦",["y",1036],"(",["y",0],")"]],[-339320,["グレゴリオ暦長久",["y",1039],"(",["y",0],")"]],[-337859,["グレゴリオ暦寛徳",["y",1043],"(",["y",0],")"]],[-337337,["グレゴリオ暦永承",["y",1045],"(",["y",0],")"]],[-334889,["グレゴリオ暦天喜",["y",1052],"(",["y",0],")"]],[-332834,["グレゴリオ暦康平",["y",1057],"(",["y",0],")"]],[-330292,["グレゴリオ暦治暦",["y",1064],"(",["y",0],")"]],[-328952,["グレゴリオ暦延久",["y",1068],"(",["y",0],")"]],[-326993,["グレゴリオ暦承保",["y",1073],"(",["y",0],")"]],[-325817,["グレゴリオ暦承暦",["y",1076],"(",["y",0],")"]],[-324614,["グレゴリオ暦永保",["y",1080],"(",["y",0],")"]],[-323525,["グレゴリオ暦応徳",["y",1083],"(",["y",0],")"]],[-322373,["グレゴリオ暦寛治",["y",1086],"(",["y",0],")"]],[-319559,["グレゴリオ暦嘉保",["y",1093],"(",["y",0],")"]],[-318848,["グレゴリオ暦永長",["y",1095],"(",["y",0],")"]],[-318490,["グレゴリオ暦承徳",["y",1096],"(",["y",0],")"]],[-317863,["グレゴリオ暦康和",["y",1098],"(",["y",0],")"]],[-316227,["グレゴリオ暦長治",["y",1103],"(",["y",0],")"]],[-315431,["グレゴリオ暦嘉承",["y",1105],"(",["y",0],")"]],[-314581,["グレゴリオ暦天仁",["y",1107],"(",["y",0],")"]],[-313891,["グレゴリオ暦天永",["y",1109],"(",["y",0],")"]],[-312770,["グレゴリオ暦永久",["y",1112],"(",["y",0],")"]],[-311066,["グレゴリオ暦元永",["y",1117],"(",["y",0],")"]],[-310321,["グレゴリオ暦保安",["y",1119],"(",["y",0],")"]],[-308851,["グレゴリオ暦天治",["y",1123],"(",["y",0],")"]],[-308213,["グレゴリオ暦大治",["y",1125],"(",["y",0],")"]],[-306374,["グレゴリオ暦天承",["y",1130],"(",["y",0],")"]],[-305803,["グレゴリオ暦長承",["y",1131],"(",["y",0],")"]],[-304811,["グレゴリオ暦保延",["y",1134],"(",["y",0],")"]],[-302555,["グレゴリオ暦永治",["y",1140],"(",["y",0],")"]],[-302270,["グレゴリオ暦康治",["y",1141],"(",["y",0],")"]],[-301597,["グレゴリオ暦天養",["y",1143],"(",["y",0],")"]],[-301095,["グレゴリオ暦久安",["y",1144],"(",["y",0],")"]],[-299083,["グレゴリオ暦仁平",["y",1150],"(",["y",0],")"]],[-297694,["グレゴリオ暦久寿",["y",1153],"(",["y",0],")"]],[-297163,["グレゴリオ暦保元",["y",1155],"(",["y",0],")"]],[-296077,["グレゴリオ暦平治",["y",1158],"(",["y",0],")"]],[-295792,["グレゴリオ暦永暦",["y",1159],"(",["y",0],")"]],[-295208,["グレゴリオ暦応保",["y",1160],"(",["y",0],")"]],[-294621,["グレゴリオ暦長寛",["y",1162],"(",["y",0],")"]],[-293819,["グレゴリオ暦永万",["y",1164],"(",["y",0],")"]],[-293383,["グレゴリオ暦仁安",["y",1165],"(",["y",0],")"]],[-292427,["グレゴリオ暦嘉応",["y",1168],"(",["y",0],")"]],[-291676,["グレゴリオ暦承安",["y",1170],"(",["y",0],")"]],[-290134,["グレゴリオ暦安元",["y",1174],"(",["y",0],")"]],[-289390,["グレゴリオ暦治承",["y",1176],"(",["y",0],")"]],[-287933,["グレゴリオ暦養和",["y",1180],"(",["y",0],")"]],[-287625,["グレゴリオ暦寿永",["y",1181],"(",["y",0],")"]],[-286927,["グレゴリオ暦元暦",["y",1183],"(",["y",0],")"]],[-286457,["グレゴリオ暦文治",["y",1184],"(",["y",0],")"]],[-284747,["グレゴリオ暦建久",["y",1189],"(",["y",0],")"]],[-281453,["グレゴリオ暦正治",["y",1198],"(",["y",0],")"]],[-280787,["グレゴリオ暦建仁",["y",1200],"(",["y",0],")"]],[-279687,["グレゴリオ暦元久",["y",1203],"(",["y",0],")"]],[-278883,["グレゴリオ暦建永",["y",1205],"(",["y",0],")"]],[-278354,["グレゴリオ暦承元",["y",1206],"(",["y",0],")"]],[-277100,["グレゴリオ暦建暦",["y",1210],"(",["y",0],")"]],[-276099,["グレゴリオ暦建保",["y",1212],"(",["y",0],")"]],[-274144,["グレゴリオ暦承久",["y",1218],"(",["y",0],")"]],[-273050,["グレゴリオ暦貞応",["y",1221],"(",["y",0],")"]],[-272099,["グレゴリオ暦元仁",["y",1223],"(",["y",0],")"]],[-271951,["グレゴリオ暦嘉禄",["y",1224],"(",["y",0],")"]],[-270986,["グレゴリオ暦安貞",["y",1226],"(",["y",0],")"]],[-270548,["グレゴリオ暦寛喜",["y",1228],"(",["y",0],")"]],[-269429,["グレゴリオ暦貞永",["y",1231],"(",["y",0],")"]],[-269032,["グレゴリオ暦天福",["y",1232],"(",["y",0],")"]],[-268481,["グレゴリオ暦文暦",["y",1233],"(",["y",0],")"]],[-268142,["グレゴリオ暦嘉禎",["y",1234],"(",["y",0],")"]],[-266987,["グレゴリオ暦暦仁",["y",1237],"(",["y",0],")"]],[-266914,["グレゴリオ暦延応",["y",1238],"(",["y",0],")"]],[-266403,["グレゴリオ暦仁治",["y",1239],"(",["y",0],")"]],[-265448,["グレゴリオ暦寛元",["y",1242],"(",["y",0],")"]],[-263969,["グレゴリオ暦宝治",["y",1246],"(",["y",0],")"]],[-263211,["グレゴリオ暦建長",["y",1248],"(",["y",0],")"]],[-260479,["グレゴリオ暦康元",["y",1255],"(",["y",0],")"]],[-260321,["グレゴリオ暦正嘉",["y",1256],"(",["y",0],")"]],[-259571,["グレゴリオ暦正元",["y",1258],"(",["y",0],")"]],[-259171,["グレゴリオ暦文応",["y",1259],"(",["y",0],")"]],[-258869,["グレゴリオ暦弘長",["y",1260],"(",["y",0],")"]],[-257768,["グレゴリオ暦文永",["y",1263],"(",["y",0],")"]],[-253695,["グレゴリオ暦建治",["y",1274],"(",["y",0],")"]],[-252659,["グレゴリオ暦弘安",["y",1277],"(",["y",0],")"]],[-248939,["グレゴリオ暦正応",["y",1287],"(",["y",0],")"]],[-247013,["グレゴリオ暦永仁",["y",1292],"(",["y",0],")"]],[-244926,["グレゴリオ暦正安",["y",1298],"(",["y",0],")"]],[-243631,["グレゴリオ暦乾元",["y",1301],"(",["y",0],")"]],[-243351,["グレゴリオ暦嘉元",["y",1302],"(",["y",0],")"]],[-242131,["グレゴリオ暦徳治",["y",1305],"(",["y",0],")"]],[-241457,["グレゴリオ暦延慶",["y",1307],"(",["y",0],")"]],[-240551,["グレゴリオ暦応長",["y",1310],"(",["y",0],")"]],[-240205,["グレゴリオ暦正和",["y",1311],"(",["y",0],")"]],[-238421,["グレゴリオ暦文保",["y",1316],"(",["y",0],")"]],[-237628,["グレゴリオ暦元応",["y",1318],"(",["y",0],")"]],[-236954,["グレゴリオ暦元亨",["y",1320],"(",["y",0],")"]],[-235580,["グレゴリオ暦正中",["y",1323],"(",["y",0],")"]],[-235061,["グレゴリオ暦嘉暦",["y",1325],"(",["y",0],")"]],[-233848,["グレゴリオ暦元徳",["y",1328],"(",["y",0],")"]],[-233129,["グレゴリオ暦元弘",["y",1330],"/元徳",["y",1328],"(",["y",0],")"]],[-232874,["グレゴリオ暦元弘",["y",1330],"/正慶",["y",1331],"(",["y",0],")"]],[-232464,["グレゴリオ暦元弘",["y",1330],"(",["y",0],")"]],[-232223,["グレゴリオ暦建武",["y",1333],"(",["y",0],")"]],[-231455,["グレゴリオ暦延元",["y",1335],"(",["y",0],")"]],[-231352,["グレゴリオ暦延元",["y",1335],"/建武",["y",1333],"(",["y",0],")"]],[-230542,["グレゴリオ暦延元",["y",1335],"/暦応",["y",1337],"(",["y",0],")"]],[-229950,["グレゴリオ暦興国",["y",1339],"/暦応",["y",1337],"(",["y",0],")"]],[-229213,["グレゴリオ暦興国",["y",1339],"/康永",["y",1341],"(",["y",0],")"]],[-227950,["グレゴリオ暦興国",["y",1339],"/貞和",["y",1344],"(",["y",0],")"]],[-227519,["グレゴリオ暦正平",["y",1345],"/貞和",["y",1344],"(",["y",0],")"]],[-226349,["グレゴリオ暦正平",["y",1345],"/観応",["y",1349],"(",["y",0],")"]],[-225748,["グレゴリオ暦正平",["y",1345],"(",["y",0],")"]],[-225593,["グレゴリオ暦正平",["y",1345],"/観応",["y",1349],"(",["y",0],")"]],[-225404,["グレゴリオ暦正平",["y",1345],"/文和",["y",1351],"(",["y",0],")"]],[-224132,["グレゴリオ暦正平",["y",1345],"/延文",["y",1355],"(",["y",0],")"]],[-222301,["グレゴリオ暦正平",["y",1345],"/康安",["y",1360],"(",["y",0],")"]],[-221776,["グレゴリオ暦正平",["y",1345],"/貞治",["y",1361],"(",["y",0],")"]],[-219802,["グレゴリオ暦正平",["y",1345],"/応安",["y",1367],"(",["y",0],")"]],[-219076,["グレゴリオ暦建徳",["y",1369],"/応安",["y",1367],"(",["y",0],")"]],[-218256,["グレゴリオ暦文中",["y",1371],"/応安",["y",1367],"(",["y",0],")"]],[-217224,["グレゴリオ暦文中",["y",1371],"/永和",["y",1374],"(",["y",0],")"]],[-217135,["グレゴリオ暦天授",["y",1374],"/永和",["y",1374],"(",["y",0],")"]],[-215752,["グレゴリオ暦天授",["y",1374],"/康暦",["y",1378],"(",["y",0],")"]],[-215055,["グレゴリオ暦弘和",["y",1380],"/康暦",["y",1378],"(",["y",0],")"]],[-215041,["グレゴリオ暦弘和",["y",1380],"/永徳",["y",1380],"(",["y",0],")"]],[-213946,["グレゴリオ暦弘和",["y",1380],"/至徳",["y",1383],"(",["y",0],")"]],[-213886,["グレゴリオ暦元中",["y",1383],"/至徳",["y",1383],"(",["y",0],")"]],[-212651,["グレゴリオ暦元中",["y",1383],"/嘉慶",["y",1386],"(",["y",0],")"]],[-212132,["グレゴリオ暦元中",["y",1383],"/康応",["y",1388],"(",["y",0],")"]],[-211731,["グレゴリオ暦元中",["y",1383],"/明徳",["y",1389],"(",["y",0],")"]],[-210779,["グレゴリオ暦明徳",["y",1389],"(",["y",0],")"]],[-210158,["グレゴリオ暦応永",["y",1393],"(",["y",0],")"]],[-197792,["グレゴリオ暦正長",["y",1427],"(",["y",0],")"]],[-197312,["グレゴリオ暦永享",["y",1428],"(",["y",0],")"]],[-193136,["グレゴリオ暦嘉吉",["y",1440],"(",["y",0],")"]],[-192056,["グレゴリオ暦文安",["y",1443],"(",["y",0],")"]],[-190055,["グレゴリオ暦宝徳",["y",1448],"(",["y",0],")"]],[-188965,["グレゴリオ暦享徳",["y",1451],"(",["y",0],")"]],[-187843,["グレゴリオ暦康正",["y",1454],"(",["y",0],")"]],[-187072,["グレゴリオ暦長禄",["y",1456],"(",["y",0],")"]],[-185868,["グレゴリオ暦寛正",["y",1459],"(",["y",0],")"]],[-184001,["グレゴリオ暦文正",["y",1465],"(",["y",0],")"]],[-183610,["グレゴリオ暦応仁",["y",1466],"(",["y",0],")"]],[-182819,["グレゴリオ暦文明",["y",1468],"(",["y",0],")"]],[-176183,["グレゴリオ暦長享",["y",1486],"(",["y",0],")"]],[-175414,["グレゴリオ暦延徳",["y",1488],"(",["y",0],")"]],[-174353,["グレゴリオ暦明応",["y",1491],"(",["y",0],")"]],[-171213,["グレゴリオ暦文亀",["y",1500],"(",["y",0],")"]],[-170119,["グレゴリオ暦永正",["y",1503],"(",["y",0],")"]],[-163719,["グレゴリオ暦大永",["y",1520],"(",["y",0],")"]],[-161182,["グレゴリオ暦享禄",["y",1527],"(",["y",0],")"]],[-159726,["グレゴリオ暦天文",["y",1531],"(",["y",0],")"]],[-151256,["グレゴリオ暦弘治",["y",1554],"(",["y",0],")"]],[-150394,["グレゴリオ暦永禄",["y",1557],"(",["y",0],")"]],[-145941,["グレゴリオ暦元亀",["y",1569],"(",["y",0],")"]],[-144755,["グレゴリオ暦天正",["y",1572],"(",["y",0],")"]],[-137687,["グレゴリオ暦文禄",["y",1591],"(",["y",0],")"]],[-136251,["グレゴリオ暦慶長",["y",1595],"(",["y",0],")"]],[-129414,["グレゴリオ暦元和",["y",1614],"(",["y",0],")"]],[-126267,["グレゴリオ暦寛永",["y",1623],"(",["y",0],")"]],[-118691,["グレゴリオ暦正保",["y",1643],"(",["y",0],")"]],[-117511,["グレゴリオ暦慶安",["y",1647],"(",["y",0],")"]],[-115854,["グレゴリオ暦承応",["y",1651],"(",["y",0],")"]],[-114914,["グレゴリオ暦明暦",["y",1654],"(",["y",0],")"]],[-113723,["グレゴリオ暦万治",["y",1657],"(",["y",0],")"]],[-112717,["グレゴリオ暦寛文",["y",1660],"(",["y",0],")"]],[-108174,["グレゴリオ暦延宝",["y",1672],"(",["y",0],")"]],[-105242,["グレゴリオ暦天和",["y",1680],"(",["y",0],")"]],[-104364,["グレゴリオ暦貞享",["y",1683],"(",["y",0],")"]],[-102702,["グレゴリオ暦元禄",["y",1687],"(",["y",0],")"]],[-97049,["グレゴリオ暦宝永",["y",1703],"(",["y",0],")"]],[-94437,["グレゴリオ暦正徳",["y",1710],"(",["y",0],")"]],[-92551,["グレゴリオ暦享保",["y",1715],"(",["y",0],")"]],[-85309,["グレゴリオ暦元文",["y",1735],"(",["y",0],")"]],[-83539,["グレゴリオ暦寛保",["y",1740],"(",["y",0],")"]],[-82452,["グレゴリオ暦延享",["y",1743],"(",["y",0],")"]],[-80867,["グレゴリオ暦寛延",["y",1747],"(",["y",0],")"]],[-79641,["グレゴリオ暦宝暦",["y",1750],"(",["y",0],")"]],[-75059,["グレゴリオ暦明和",["y",1763],"(",["y",0],")"]],[-71974,["グレゴリオ暦安永",["y",1771],"(",["y",0],")"]],[-68916,["グレゴリオ暦天明",["y",1780],"(",["y",0],")"]],[-66059,["グレゴリオ暦寛政",["y",1788],"(",["y",0],")"]],[-61649,["グレゴリオ暦享和",["y",1800],"(",["y",0],")"]],[-60550,["グレゴリオ暦文化",["y",1803],"(",["y",0],")"]],[-55372,["グレゴリオ暦文政",["y",1817],"(",["y",0],")"]],[-50747,["グレゴリオ暦天保",["y",1829],"(",["y",0],")"]],[-45647,["グレゴリオ暦弘化",["y",1843],"(",["y",0],")"]],[-44469,["グレゴリオ暦嘉永",["y",1847],"(",["y",0],")"]],[-41989,["グレゴリオ暦安政",["y",1853],"(",["y",0],")"]],[-40079,["グレゴリオ暦万延",["y",1859],"(",["y",0],")"]],[-39724,["グレゴリオ暦文久",["y",1860],"(",["y",0],")"]],[-38630,["グレゴリオ暦元治",["y",1863],"(",["y",0],")"]],[-38230,["グレゴリオ暦慶応",["y",1864],"(",["y",0],")"]],[-36959,["グレゴリオ暦M",["y",1867],"(",["y",0],")"]],[-35428,["M",["y",1867],"(",["y",0],")"]],[-20974,["T",["y",1911],"(",["y",0],")"]],[-15713,["S",["y",1925],"(",["y",0],")"]],[6947,["H",["y",1988],"(",["y",0],")"]],[18017,["R",["y",2018],"(",["y",0],")"]]],"dtsjp3":[[null,["グレゴリオ暦",["y",0]]],[-962750,["グレゴリオ暦",["y",0],"(神武天皇即位前",["k"],")"]],[-960181,["グレゴリオ暦",["y",0],"(神武",["y",-660],")"]],[-931329,["グレゴリオ暦",["y",0],"(綏靖",["y",-581],")"]],[-919281,["グレゴリオ暦",["y",0],"(安寧",["y",-548],")"]],[-905401,["グレゴリオ暦",["y",0],"(懿徳",["y",-510],")"]],[-892615,["グレゴリオ暦",["y",0],"(孝昭",["y",-475],")"]],[-862316,["グレゴリオ暦",["y",0],"(孝安",["y",-392],")"]],[-825049,["グレゴリオ暦",["y",0],"(孝霊",["y",-290],")"]],[-797290,["グレゴリオ暦",["y",0],"(孝元",["y",-214],")"]],[-776471,["グレゴリオ暦",["y",0],"(開化",["y",-157],")"]],[-754559,["グレゴリオ暦",["y",0],"(崇神",["y",-97],")"]],[-729724,["グレゴリオ暦",["y",0],"(垂仁",["y",-29],")"]],[-693549,["グレゴリオ暦",["y",0],"(景行",["y",70],")"]],[-671637,["グレゴリオ暦",["y",0],"(成務",["y",130],")"]],[-649371,["グレゴリオ暦",["y",0],"(仲哀",["y",191],")"]],[-646093,["グレゴリオ暦",["y",0],"(神功",["y",200],")"]],[-620874,["グレゴリオ暦",["y",0],"(応神",["y",269],")"]],[-605164,["グレゴリオ暦",["y",0],"(仁徳",["y",312],")"]],[-573389,["グレゴリオ暦",["y",0],"(履中",["y",399],")"]],[-571204,["グレゴリオ暦",["y",0],"(反正",["y",405],")"]],[-569018,["グレゴリオ暦",["y",0],"(允恭",["y",411],")"]],[-553662,["グレゴリオ暦",["y",0],"(安康",["y",453],")"]],[-552570,["グレゴリオ暦",["y",0],"(雄略",["y",456],")"]],[-544183,["グレゴリオ暦",["y",0],"(清寧",["y",479],")"]],[-542352,["グレゴリオ暦",["y",0],"(顕宗",["y",484],")"]],[-541260,["グレゴリオ暦",["y",0],"(仁賢",["y",487],")"]],[-537243,["グレゴリオ暦",["y",0],"(武烈",["y",498],")"]],[-534320,["グレゴリオ暦",["y",0],"(継体",["y",506],")"]],[-524457,["グレゴリオ暦",["y",0],"(安閑",["y",533],")"]],[-523718,["グレゴリオ暦",["y",0],"(宣化",["y",535],")"]],[-522271,["グレゴリオ暦",["y",0],"(欽明",["y",539],")"]],[-510577,["グレゴリオ暦",["y",0],"(敏達",["y",571],")"]],[-505469,["グレゴリオ暦",["y",0],"(用明",["y",585],")"]],[-504730,["グレゴリオ暦",["y",0],"(崇峻",["y",587],")"]],[-502899,["グレゴリオ暦",["y",0],"(推古",["y",592],")"]],[-489758,["グレゴリオ暦",["y",0],"(舒明",["y",628],")"]],[-485004,["グレゴリオ暦",["y",0],"(皇極",["y",641],")"]],[-483746,["グレゴリオ暦",["y",0],"(大化",["y",644],")"]],[-482037,["グレゴリオ暦",["y",0],"(白雉",["y",649],")"]],[-480249,["グレゴリオ暦",["y",0],"(斉明",["y",654],")"]],[-477710,["グレゴリオ暦",["y",0],"(天智",["y",661],")"]],[-474048,["グレゴリオ暦",["y",0],"(天武",["y",671],")"]],[-468743,["グレゴリオ暦",["y",0],"(朱鳥",["y",685],")"]],[-468555,["グレゴリオ暦",["y",0],"(持統",["y",686],")"]],[-464717,["グレゴリオ暦",["y",0],"(文武",["y",696],")"]],[-463367,["グレゴリオ暦",["y",0],"(大宝",["y",700],")"]],[-462227,["グレゴリオ暦",["y",0],"(慶雲",["y",703],")"]],[-460896,["グレゴリオ暦",["y",0],"(和銅",["y",707],")"]],[-458101,["グレゴリオ暦",["y",0],"(霊亀",["y",714],")"]],[-457288,["グレゴリオ暦",["y",0],"(養老",["y",716],")"]],[-455027,["グレゴリオ暦",["y",0],"(神亀",["y",723],")"]],[-453018,["グレゴリオ暦",["y",0],"(天平",["y",728],")"]],[-445834,["グレゴリオ暦",["y",0],"(天平感宝",["y",748],")"]],[-445727,["グレゴリオ暦",["y",0],"(天平勝宝",["y",748],")"]],[-442787,["グレゴリオ暦",["y",0],"(天平宝字",["y",756],")"]],[-440082,["グレゴリオ暦",["y",0],"(天平神護",["y",764],")"]],[-439128,["グレゴリオ暦",["y",0],"(神護景雲",["y",766],")"]],[-437992,["グレゴリオ暦",["y",0],"(宝亀",["y",769],")"]],[-434240,["グレゴリオ暦",["y",0],"(天応",["y",780],")"]],[-433632,["グレゴリオ暦",["y",0],"(延暦",["y",781],")"]],[-424980,["グレゴリオ暦",["y",0],"(大同",["y",805],")"]],[-423385,["グレゴリオ暦",["y",0],"(弘仁",["y",809],")"]],[-418526,["グレゴリオ暦",["y",0],"(天長",["y",823],")"]],[-414867,["グレゴリオ暦",["y",0],"(承和",["y",833],")"]],[-409601,["グレゴリオ暦",["y",0],"(嘉祥",["y",847],")"]],[-408551,["グレゴリオ暦",["y",0],"(仁寿",["y",850],")"]],[-407250,["グレゴリオ暦",["y",0],"(斉衡",["y",853],")"]],[-406432,["グレゴリオ暦",["y",0],"(天安",["y",856],")"]],[-405641,["グレゴリオ暦",["y",0],"(貞観",["y",858],")"]],[-399054,["グレゴリオ暦",["y",0],"(元慶",["y",876],")"]],[-396214,["グレゴリオ暦",["y",0],"(仁和",["y",884],")"]],[-394673,["グレゴリオ暦",["y",0],"(寛平",["y",888],")"]],[-391396,["グレゴリオ暦",["y",0],"(昌泰",["y",897],")"]],[-390197,["グレゴリオ暦",["y",0],"(延喜",["y",900],")"]],[-382256,["グレゴリオ暦",["y",0],"(延長",["y",922],")"]],[-379347,["グレゴリオ暦",["y",0],"(承平",["y",930],")"]],[-376753,["グレゴリオ暦",["y",0],"(天慶",["y",937],")"]],[-373504,["グレゴリオ暦",["y",0],"(天暦",["y",946],")"]],[-369661,["グレゴリオ暦",["y",0],"(天徳",["y",956],")"]],[-368461,["グレゴリオ暦",["y",0],"(応和",["y",960],")"]],[-367198,["グレゴリオ暦",["y",0],"(康保",["y",963],")"]],[-365717,["グレゴリオ暦",["y",0],"(安和",["y",967],")"]],[-365115,["グレゴリオ暦",["y",0],"(天禄",["y",969],")"]],[-363761,["グレゴリオ暦",["y",0],"(天延",["y",972],")"]],[-362823,["グレゴリオ暦",["y",0],"(貞元",["y",975],")"]],[-361951,["グレゴリオ暦",["y",0],"(天元",["y",977],")"]],[-360341,["グレゴリオ暦",["y",0],"(永観",["y",982],")"]],[-359620,["グレゴリオ暦",["y",0],"(寛和",["y",984],")"]],[-358904,["グレゴリオ暦",["y",0],"(永延",["y",986],")"]],[-358045,["グレゴリオ暦",["y",0],"(永祚",["y",988],")"]],[-357603,["グレゴリオ暦",["y",0],"(正暦",["y",989],")"]],[-356023,["グレゴリオ暦",["y",0],"(長徳",["y",994],")"]],[-354614,["グレゴリオ暦",["y",0],"(長保",["y",998],")"]],[-352599,["グレゴリオ暦",["y",0],"(寛弘",["y",1003],")"]],[-349493,["グレゴリオ暦",["y",0],"(長和",["y",1011],")"]],[-347930,["グレゴリオ暦",["y",0],"(寛仁",["y",1016],")"]],[-346534,["グレゴリオ暦",["y",0],"(治安",["y",1020],")"]],[-345283,["グレゴリオ暦",["y",0],"(万寿",["y",1023],")"]],[-343823,["グレゴリオ暦",["y",0],"(長元",["y",1027],")"]],[-340637,["グレゴリオ暦",["y",0],"(長暦",["y",1036],")"]],[-339320,["グレゴリオ暦",["y",0],"(長久",["y",1039],")"]],[-337859,["グレゴリオ暦",["y",0],"(寛徳",["y",1043],")"]],[-337337,["グレゴリオ暦",["y",0],"(永承",["y",1045],")"]],[-334889,["グレゴリオ暦",["y",0],"(天喜",["y",1052],")"]],[-332834,["グレゴリオ暦",["y",0],"(康平",["y",1057],")"]],[-330292,["グレゴリオ暦",["y",0],"(治暦",["y",1064],")"]],[-328952,["グレゴリオ暦",["y",0],"(延久",["y",1068],")"]],[-326993,["グレゴリオ暦",["y",0],"(承保",["y",1073],")"]],[-325817,["グレゴリオ暦",["y",0],"(承暦",["y",1076],")"]],[-324614,["グレゴリオ暦",["y",0],"(永保",["y",1080],")"]],[-323525,["グレゴリオ暦",["y",0],"(応徳",["y",1083],")"]],[-322373,["グレゴリオ暦",["y",0],"(寛治",["y",1086],")"]],[-319559,["グレゴリオ暦",["y",0],"(嘉保",["y",1093],")"]],[-318848,["グレゴリオ暦",["y",0],"(永長",["y",1095],")"]],[-318490,["グレゴリオ暦",["y",0],"(承徳",["y",1096],")"]],[-317863,["グレゴリオ暦",["y",0],"(康和",["y",1098],")"]],[-316227,["グレゴリオ暦",["y",0],"(長治",["y",1103],")"]],[-315431,["グレゴリオ暦",["y",0],"(嘉承",["y",1105],")"]],[-314581,["グレゴリオ暦",["y",0],"(天仁",["y",1107],")"]],[-313891,["グレゴリオ暦",["y",0],"(天永",["y",1109],")"]],[-312770,["グレゴリオ暦",["y",0],"(永久",["y",1112],")"]],[-311066,["グレゴリオ暦",["y",0],"(元永",["y",1117],")"]],[-310321,["グレゴリオ暦",["y",0],"(保安",["y",1119],")"]],[-308851,["グレゴリオ暦",["y",0],"(天治",["y",1123],")"]],[-308213,["グレゴリオ暦",["y",0],"(大治",["y",1125],")"]],[-306374,["グレゴリオ暦",["y",0],"(天承",["y",1130],")"]],[-305803,["グレゴリオ暦",["y",0],"(長承",["y",1131],")"]],[-304811,["グレゴリオ暦",["y",0],"(保延",["y",1134],")"]],[-302555,["グレゴリオ暦",["y",0],"(永治",["y",1140],")"]],[-302270,["グレゴリオ暦",["y",0],"(康治",["y",1141],")"]],[-301597,["グレゴリオ暦",["y",0],"(天養",["y",1143],")"]],[-301095,["グレゴリオ暦",["y",0],"(久安",["y",1144],")"]],[-299083,["グレゴリオ暦",["y",0],"(仁平",["y",1150],")"]],[-297694,["グレゴリオ暦",["y",0],"(久寿",["y",1153],")"]],[-297163,["グレゴリオ暦",["y",0],"(保元",["y",1155],")"]],[-296077,["グレゴリオ暦",["y",0],"(平治",["y",1158],")"]],[-295792,["グレゴリオ暦",["y",0],"(永暦",["y",1159],")"]],[-295208,["グレゴリオ暦",["y",0],"(応保",["y",1160],")"]],[-294621,["グレゴリオ暦",["y",0],"(長寛",["y",1162],")"]],[-293819,["グレゴリオ暦",["y",0],"(永万",["y",1164],")"]],[-293383,["グレゴリオ暦",["y",0],"(仁安",["y",1165],")"]],[-292427,["グレゴリオ暦",["y",0],"(嘉応",["y",1168],")"]],[-291676,["グレゴリオ暦",["y",0],"(承安",["y",1170],")"]],[-290134,["グレゴリオ暦",["y",0],"(安元",["y",1174],")"]],[-289390,["グレゴリオ暦",["y",0],"(治承",["y",1176],")"]],[-287933,["グレゴリオ暦",["y",0],"(養和",["y",1180],")"]],[-287625,["グレゴリオ暦",["y",0],"(寿永",["y",1181],")"]],[-286927,["グレゴリオ暦",["y",0],"(元暦",["y",1183],")"]],[-286457,["グレゴリオ暦",["y",0],"(文治",["y",1184],")"]],[-284747,["グレゴリオ暦",["y",0],"(建久",["y",1189],")"]],[-281453,["グレゴリオ暦",["y",0],"(正治",["y",1198],")"]],[-280787,["グレゴリオ暦",["y",0],"(建仁",["y",1200],")"]],[-279687,["グレゴリオ暦",["y",0],"(元久",["y",1203],")"]],[-278883,["グレゴリオ暦",["y",0],"(建永",["y",1205],")"]],[-278354,["グレゴリオ暦",["y",0],"(承元",["y",1206],")"]],[-277100,["グレゴリオ暦",["y",0],"(建暦",["y",1210],")"]],[-276099,["グレゴリオ暦",["y",0],"(建保",["y",1212],")"]],[-274144,["グレゴリオ暦",["y",0],"(承久",["y",1218],")"]],[-273050,["グレゴリオ暦",["y",0],"(貞応",["y",1221],")"]],[-272099,["グレゴリオ暦",["y",0],"(元仁",["y",1223],")"]],[-271951,["グレゴリオ暦",["y",0],"(嘉禄",["y",1224],")"]],[-270986,["グレゴリオ暦",["y",0],"(安貞",["y",1226],")"]],[-270548,["グレゴリオ暦",["y",0],"(寛喜",["y",1228],")"]],[-269429,["グレゴリオ暦",["y",0],"(貞永",["y",1231],")"]],[-269032,["グレゴリオ暦",["y",0],"(天福",["y",1232],")"]],[-268481,["グレゴリオ暦",["y",0],"(文暦",["y",1233],")"]],[-268142,["グレゴリオ暦",["y",0],"(嘉禎",["y",1234],")"]],[-266987,["グレゴリオ暦",["y",0],"(暦仁",["y",1237],")"]],[-266914,["グレゴリオ暦",["y",0],"(延応",["y",1238],")"]],[-266403,["グレゴリオ暦",["y",0],"(仁治",["y",1239],")"]],[-265448,["グレゴリオ暦",["y",0],"(寛元",["y",1242],")"]],[-263969,["グレゴリオ暦",["y",0],"(宝治",["y",1246],")"]],[-263211,["グレゴリオ暦",["y",0],"(建長",["y",1248],")"]],[-260479,["グレゴリオ暦",["y",0],"(康元",["y",1255],")"]],[-260321,["グレゴリオ暦",["y",0],"(正嘉",["y",1256],")"]],[-259571,["グレゴリオ暦",["y",0],"(正元",["y",1258],")"]],[-259171,["グレゴリオ暦",["y",0],"(文応",["y",1259],")"]],[-258869,["グレゴリオ暦",["y",0],"(弘長",["y",1260],")"]],[-257768,["グレゴリオ暦",["y",0],"(文永",["y",1263],")"]],[-253695,["グレゴリオ暦",["y",0],"(建治",["y",1274],")"]],[-252659,["グレゴリオ暦",["y",0],"(弘安",["y",1277],")"]],[-248939,["グレゴリオ暦",["y",0],"(正応",["y",1287],")"]],[-247013,["グレゴリオ暦",["y",0],"(永仁",["y",1292],")"]],[-244926,["グレゴリオ暦",["y",0],"(正安",["y",1298],")"]],[-243631,["グレゴリオ暦",["y",0],"(乾元",["y",1301],")"]],[-243351,["グレゴリオ暦",["y",0],"(嘉元",["y",1302],")"]],[-242131,["グレゴリオ暦",["y",0],"(徳治",["y",1305],")"]],[-241457,["グレゴリオ暦",["y",0],"(延慶",["y",1307],")"]],[-240551,["グレゴリオ暦",["y",0],"(応長",["y",1310],")"]],[-240205,["グレゴリオ暦",["y",0],"(正和",["y",1311],")"]],[-238421,["グレゴリオ暦",["y",0],"(文保",["y",1316],")"]],[-237628,["グレゴリオ暦",["y",0],"(元応",["y",1318],")"]],[-236954,["グレゴリオ暦",["y",0],"(元亨",["y",1320],")"]],[-235580,["グレゴリオ暦",["y",0],"(正中",["y",1323],")"]],[-235061,["グレゴリオ暦",["y",0],"(嘉暦",["y",1325],")"]],[-233848,["グレゴリオ暦",["y",0],"(元徳",["y",1328],")"]],[-233129,["グレゴリオ暦",["y",0],"(元弘",["y",1330],"/元徳",["y",1328],")"]],[-232874,["グレゴリオ暦",["y",0],"(元弘",["y",1330],"/正慶",["y",1331],")"]],[-232464,["グレゴリオ暦",["y",0],"(元弘",["y",1330],")"]],[-232223,["グレゴリオ暦",["y",0],"(建武",["y",1333],")"]],[-231455,["グレゴリオ暦",["y",0],"(延元",["y",1335],")"]],[-231352,["グレゴリオ暦",["y",0],"(延元",["y",1335],"/建武",["y",1333],")"]],[-230542,["グレゴリオ暦",["y",0],"(延元",["y",1335],"/暦応",["y",1337],")"]],[-229950,["グレゴリオ暦",["y",0],"(興国",["y",1339],"/暦応",["y",1337],")"]],[-229213,["グレゴリオ暦",["y",0],"(興国",["y",1339],"/康永",["y",1341],")"]],[-227950,["グレゴリオ暦",["y",0],"(興国",["y",1339],"/貞和",["y",1344],")"]],[-227519,["グレゴリオ暦",["y",0],"(正平",["y",1345],"/貞和",["y",1344],")"]],[-226349,["グレゴリオ暦",["y",0],"(正平",["y",1345],"/観応",["y",1349],")"]],[-225748,["グレゴリオ暦",["y",0],"(正平",["y",1345],")"]],[-225593,["グレゴリオ暦",["y",0],"(正平",["y",1345],"/観応",["y",1349],")"]],[-225404,["グレゴリオ暦",["y",0],"(正平",["y",1345],"/文和",["y",1351],")"]],[-224132,["グレゴリオ暦",["y",0],"(正平",["y",1345],"/延文",["y",1355],")"]],[-222301,["グレゴリオ暦",["y",0],"(正平",["y",1345],"/康安",["y",1360],")"]],[-221776,["グレゴリオ暦",["y",0],"(正平",["y",1345],"/貞治",["y",1361],")"]],[-219802,["グレゴリオ暦",["y",0],"(正平",["y",1345],"/応安",["y",1367],")"]],[-219076,["グレゴリオ暦",["y",0],"(建徳",["y",1369],"/応安",["y",1367],")"]],[-218256,["グレゴリオ暦",["y",0],"(文中",["y",1371],"/応安",["y",1367],")"]],[-217224,["グレゴリオ暦",["y",0],"(文中",["y",1371],"/永和",["y",1374],")"]],[-217135,["グレゴリオ暦",["y",0],"(天授",["y",1374],"/永和",["y",1374],")"]],[-215752,["グレゴリオ暦",["y",0],"(天授",["y",1374],"/康暦",["y",1378],")"]],[-215055,["グレゴリオ暦",["y",0],"(弘和",["y",1380],"/康暦",["y",1378],")"]],[-215041,["グレゴリオ暦",["y",0],"(弘和",["y",1380],"/永徳",["y",1380],")"]],[-213946,["グレゴリオ暦",["y",0],"(弘和",["y",1380],"/至徳",["y",1383],")"]],[-213886,["グレゴリオ暦",["y",0],"(元中",["y",1383],"/至徳",["y",1383],")"]],[-212651,["グレゴリオ暦",["y",0],"(元中",["y",1383],"/嘉慶",["y",1386],")"]],[-212132,["グレゴリオ暦",["y",0],"(元中",["y",1383],"/康応",["y",1388],")"]],[-211731,["グレゴリオ暦",["y",0],"(元中",["y",1383],"/明徳",["y",1389],")"]],[-210779,["グレゴリオ暦",["y",0],"(明徳",["y",1389],")"]],[-210158,["グレゴリオ暦",["y",0],"(応永",["y",1393],")"]],[-197792,["グレゴリオ暦",["y",0],"(正長",["y",1427],")"]],[-197312,["グレゴリオ暦",["y",0],"(永享",["y",1428],")"]],[-193136,["グレゴリオ暦",["y",0],"(嘉吉",["y",1440],")"]],[-192056,["グレゴリオ暦",["y",0],"(文安",["y",1443],")"]],[-190055,["グレゴリオ暦",["y",0],"(宝徳",["y",1448],")"]],[-188965,["グレゴリオ暦",["y",0],"(享徳",["y",1451],")"]],[-187843,["グレゴリオ暦",["y",0],"(康正",["y",1454],")"]],[-187072,["グレゴリオ暦",["y",0],"(長禄",["y",1456],")"]],[-185868,["グレゴリオ暦",["y",0],"(寛正",["y",1459],")"]],[-184001,["グレゴリオ暦",["y",0],"(文正",["y",1465],")"]],[-183610,["グレゴリオ暦",["y",0],"(応仁",["y",1466],")"]],[-182819,["グレゴリオ暦",["y",0],"(文明",["y",1468],")"]],[-176183,["グレゴリオ暦",["y",0],"(長享",["y",1486],")"]],[-175414,["グレゴリオ暦",["y",0],"(延徳",["y",1488],")"]],[-174353,["グレゴリオ暦",["y",0],"(明応",["y",1491],")"]],[-171213,["グレゴリオ暦",["y",0],"(文亀",["y",1500],")"]],[-170119,["グレゴリオ暦",["y",0],"(永正",["y",1503],")"]],[-163719,["グレゴリオ暦",["y",0],"(大永",["y",1520],")"]],[-161182,["グレゴリオ暦",["y",0],"(享禄",["y",1527],")"]],[-159726,["グレゴリオ暦",["y",0],"(天文",["y",1531],")"]],[-151256,["グレゴリオ暦",["y",0],"(弘治",["y",1554],")"]],[-150394,["グレゴリオ暦",["y",0],"(永禄",["y",1557],")"]],[-145941,["グレゴリオ暦",["y",0],"(元亀",["y",1569],")"]],[-144755,["グレゴリオ暦",["y",0],"(天正",["y",1572],")"]],[-137687,["グレゴリオ暦",["y",0],"(文禄",["y",1591],")"]],[-136251,["グレゴリオ暦",["y",0],"(慶長",["y",1595],")"]],[-129414,["グレゴリオ暦",["y",0],"(元和",["y",1614],")"]],[-126267,["グレゴリオ暦",["y",0],"(寛永",["y",1623],")"]],[-118691,["グレゴリオ暦",["y",0],"(正保",["y",1643],")"]],[-117511,["グレゴリオ暦",["y",0],"(慶安",["y",1647],")"]],[-115854,["グレゴリオ暦",["y",0],"(承応",["y",1651],")"]],[-114914,["グレゴリオ暦",["y",0],"(明暦",["y",1654],")"]],[-113723,["グレゴリオ暦",["y",0],"(万治",["y",1657],")"]],[-112717,["グレゴリオ暦",["y",0],"(寛文",["y",1660],")"]],[-108174,["グレゴリオ暦",["y",0],"(延宝",["y",1672],")"]],[-105242,["グレゴリオ暦",["y",0],"(天和",["y",1680],")"]],[-104364,["グレゴリオ暦",["y",0],"(貞享",["y",1683],")"]],[-102702,["グレゴリオ暦",["y",0],"(元禄",["y",1687],")"]],[-97049,["グレゴリオ暦",["y",0],"(宝永",["y",1703],")"]],[-94437,["グレゴリオ暦",["y",0],"(正徳",["y",1710],")"]],[-92551,["グレゴリオ暦",["y",0],"(享保",["y",1715],")"]],[-85309,["グレゴリオ暦",["y",0],"(元文",["y",1735],")"]],[-83539,["グレゴリオ暦",["y",0],"(寛保",["y",1740],")"]],[-82452,["グレゴリオ暦",["y",0],"(延享",["y",1743],")"]],[-80867,["グレゴリオ暦",["y",0],"(寛延",["y",1747],")"]],[-79641,["グレゴリオ暦",["y",0],"(宝暦",["y",1750],")"]],[-75059,["グレゴリオ暦",["y",0],"(明和",["y",1763],")"]],[-71974,["グレゴリオ暦",["y",0],"(安永",["y",1771],")"]],[-68916,["グレゴリオ暦",["y",0],"(天明",["y",1780],")"]],[-66059,["グレゴリオ暦",["y",0],"(寛政",["y",1788],")"]],[-61649,["グレゴリオ暦",["y",0],"(享和",["y",1800],")"]],[-60550,["グレゴリオ暦",["y",0],"(文化",["y",1803],")"]],[-55372,["グレゴリオ暦",["y",0],"(文政",["y",1817],")"]],[-50747,["グレゴリオ暦",["y",0],"(天保",["y",1829],")"]],[-45647,["グレゴリオ暦",["y",0],"(弘化",["y",1843],")"]],[-44469,["グレゴリオ暦",["y",0],"(嘉永",["y",1847],")"]],[-41989,["グレゴリオ暦",["y",0],"(安政",["y",1853],")"]],[-40079,["グレゴリオ暦",["y",0],"(万延",["y",1859],")"]],[-39724,["グレゴリオ暦",["y",0],"(文久",["y",1860],")"]],[-38630,["グレゴリオ暦",["y",0],"(元治",["y",1863],")"]],[-38230,["グレゴリオ暦",["y",0],"(慶応",["y",1864],")"]],[-36959,["グレゴリオ暦",["y",0],"(M",["y",1867],")"]],[-35428,["",["y",0],"(M",["y",1867],")"]],[-20974,["",["y",0],"(T",["y",1911],")"]],[-15713,["",["y",0],"(S",["y",1925],")"]],[6947,["",["y",0],"(H",["y",1988],")"]],[18017,["",["y",0],"(R",["y",2018],")"]]]}};