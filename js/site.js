
var SWD = {_load: {}};
SWD.data = function (name) {
  if (SWD._load[name]) return SWD._load[name];
  return SWD._load[name] = fetch ('/data/' + name).then (res => {
    if (res.status !== 200) throw res;
    return res.json ();
  });
}; // SWD.data

SWD.era = async function (eraId) {
  var list = await SWD.eraList ({});
  return list[eraId]; // or undefined
}; // SWD.era

SWD.eraList = async function (opts) {
  if (!SWD._eras) {
    var json = await SWD.data ('calendar-era-defs.json');
    SWD._eras = [];
    Object.values (json.eras).forEach (_ => {
      SWD._eras[_.id] = _;
    });

    // XXX
    var XXXlist = {
      543 : 'BE alpha',
      544 : 'BE beta',
      949 : 'BE gamma',
      566 : 'BE delta',
      531 : 'BE epsilon',
      1027 : 'BE zeta',
      948 : 'BE eta',
      565 : 'BE theta',
      542 : 'BE iota',
      950 : 'BE kappa',
      951 : 'BE lambda',
      608 : 'BE mu',
      928 : 'BE nu',
      567 : 'BE xi',
      444 : 'BE omicron',
      1028 : 'BE pi',
      // rho
      // sigma
      // tau
      // upsilon
      // phi
      // chi
      // psi
      // omega

      960 : 'BE gamma-11',
      947 : 'BE gamma+2',
      532 : 'BE epsilon-1',
      536 : 'BE epsilon-5',
      545 : 'BE beta-1',
      554 : 'BE theta-9',
  
      941 : '(BE) eta+7',

        "-638" : 'Burma',
        "-590" : 'Fasli-',
        "-591" : 'Fasli+',
    };
    Object.keys (XXXlist).forEach (id => {
      SWD._eras[20000 + parseFloat (id)] = {id: 20000 + parseFloat (id), name: XXXlist[id], offset: -parseFloat (id)};
    });

  }
  var list = SWD._eras;
  if (opts.tagId) {
    list = list.filter (_ => (_.tag_ids || {})[opts.tagId]);
  }
  return list;
}; // SWD.eraList

SWD.eraTransitions = async function () {
  if (!SWD._eraTransitions) {
    SWD._eraTransitions = SWD.data ('calendar-era-transitions.json');
  }

  var all = await SWD._eraTransitions;
  return all.transitions;
}; // SWD.eraTransitions

SWD.eraTransitionsByEraId = async function (eraId) {
  var list = await SWD.eraTransitions ();
  return list.filter (_ => _.relevant_era_ids[eraId]);
}; // SWD.eraTransitionsByEraId

SWD.tag = async function (id) {
  var tags = await SWD.tagsByIds ([id]);
  return tags[0]; // or undefined
};

SWD.tagsByIds = async function (ids) {
  var tags = (await SWD.data ('tags.json')).tags;
  return ids.map (_ => tags[_]);
}; // SWD.tagsByIds

var defineElement = function (def) {
  var e = document.createElementNS ('data:,pc', 'element');
  e.pcDef = def;
  document.head.appendChild (e);

  if (def.fill) {
    var e = document.createElementNS ('data:,pc', 'filltype');
    e.setAttribute ('name', def.name);
    e.setAttribute ('content', def.fill);
    document.head.appendChild (e);
    delete def.fill;
  }
}; // defineElement

var defineListLoader = function (name, code) {
  var e = document.createElementNS ('data:,pc', 'loader');
  e.setAttribute ('name', name);
  e.pcHandler = code;
  document.head.appendChild (e);
}; // defineListLoader

var mod = (n, m) => ((n%m) + m) % m;

defineElement ({
  name: 'section',
  is: 'sw-page-main',
  templateSet: true,
  props: {
    pcInit: function () {
      this.addEventListener ('pctemplatesetupdated', (ev) => {
        this.swTemplateSet = ev.pcTemplateSet;
        this.swUpdate ();
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: function () {
      if (!this.swTemplateSet) return;

      return Promise.resolve ().then (async () => {
        var args = {};
        var path = location.pathname;

        var m = path.match (/^\/y\/(-?[0-9]+)\/$/);
        if (m) {
          args.name = 'page-year-item-index';
          args.year = parseFloat (m[1]);
          return args;
        }

        // /e/{}/
        var m = path.match (/^\/e\/([0-9]+)\/$/);
        if (m) {
          args.eraId = parseFloat (m[1]);
          args.era = await SWD.era (args.eraId);
          if (args.era) args.name = 'page-era-item-index';
          return args;
        }

        // /e/{}/graph
        var m = path.match (/^\/e\/([0-9]+)\/graph$/);
        if (m) {
          args.eraId = parseFloat (m[1]);
          args.era = await SWD.era (args.eraId);
          if (args.era) {
            args.name = 'page-era-item-graph';
            args.hasLargeContent = true;
          }
          return args;
        }

        // /tag/{}/
        var m = path.match (/^\/tag\/([0-9]+)\/$/);
        if (m) {
          args.tagId = parseFloat (m[1]);
          args.tag = await SWD.tag (args.tagId);
          if (args.tag) args.name = 'page-tag-item-index';
          return args;
        }

        // /tag/{}/graph
        var m = path.match (/^\/tag\/([0-9]+)\/graph$/);
        if (m) {
          args.tagId = parseFloat (m[1]);
          args.tag = await SWD.tag (args.tagId);
          if (args.tag) {
            args.name = 'page-tag-item-graph';
            args.hasLargeContent = true;
            var qp = (new window.URL (location.href)).searchParams;
            args.eraSequenceSpecifications = Array.prototype.slice.call (qp.getAll ('sequence')).join (' ');
          }
          return args;
        }

        args.name = {
          '/y/': 'page-year-index',
          '/y/determination': 'page-year-determination',
          '/e/': 'page-era-index',
        }[path]; // or undefined

        return args;
      }).then (args => {
        var e = this.swTemplateSet.createFromTemplate ('div', args);
        this.textContent = '';
        while (e.firstChild) {
          this.appendChild (e.firstChild);
        }
        document.title = $fill.string (e.title, args);
        document.body.classList.toggle ('has-large', !!args.hasLargeContent);
      });
    }, // swUpdate
  },
}); // <section is=sw-page-main>

defineElement ({
  name: 'div',
  is: 'sw-page-side',
  templateSet: true,
  props: {
    pcInit: function () {
      this.addEventListener ('pctemplatesetupdated', (ev) => {
        this.swTemplateSet = ev.pcTemplateSet;
        this.swUpdate ();
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: function () {
      if (!this.swTemplateSet) return;

      return Promise.resolve ().then (async () => {
        var args = {};
        var path = location.pathname;

        /*
        // /tag/{}/
        var m = path.match (/^\/tag\/([0-9]+)\/(?:graph|)$/);
        if (m) {
          args.tagId = parseFloat (m[1]);
          args.tag = await SWD.tag (args.tagId);
          if (args.tag) args.name = 'page-tag-item-*';
          return args;
        }
        */

        args.name = '';
        return args;
      }).then (args => {
        var e = this.swTemplateSet.createFromTemplate ('div', args);
        this.textContent = '';
        while (e.firstChild) {
          this.appendChild (e.firstChild);
        }
      });
    }, // swUpdate
  },
}); // <div is=sw-page-side>

(() => {

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'selectPageTemplate');
  def.pcHandler = function (templates, obj) {
    if (templates[obj.name]) return templates[obj.name];

    console.log ("Page template |"+obj.name+"| not found");
    return templates[""];
  };
  document.head.appendChild (def);
  
}) ();

defineElement ({
  name: 'sw-if-defined',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: function () {
          return v;
        },
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      setTimeout (() => this.swUpdate (), 0);
    }, // pcInit
    swUpdate: function () {
      var v = this.value != null;
      if (this.hasAttribute ('not')) v = ! v;
      this.hidden = ! v;
    }, // swUpdate
  },
}); // <sw-if-defined>

defineElement ({
  name: 'sw-data-boolean',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: function () {
          return v;
        },
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: async function () {
      var v = this.value;
      var args = {name: v ? 'true' : 'false', class: this.className};
      var ts = await $getTemplateSet (this.localName);
      var e = ts.createFromTemplate ('div', args);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
      
    }, // swUpdate
  },
}); // <sw-data-boolean>

(() => {

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'selectBooleanTemplate');
  def.pcHandler = function (templates, obj) {
    return templates[obj.class + '-' + obj.name] || templates[obj.name] || templates[""];
  };
  document.head.appendChild (def);
  
}) ();

defineElement ({
  name: 'sw-data-number',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: function () {
          return v;
        },
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: async function () {
      var v = this.value;
      var delta = parseFloat (this.getAttribute ('delta'));
      if (Number.isFinite (delta)) v += delta;

      var args = {value: v};
      var ts = await $getTemplateSet (this.localName);
      var e = ts.createFromTemplate ('div', args);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
      
    }, // swUpdate
  },
}); // <sw-data-number>

defineElement ({
  name: 'sw-data-kanshi',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: function () {
          return v;
        },
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: async function () {
      var v = this.value;

      var args = {value0: v, value1: v+1, context: this};
      args.label = [
        '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未',
        '壬申', '癸酉', '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯',
        '庚辰', '辛巳', '壬午', '癸未', '甲申', '乙酉', '丙戌', '丁亥',
        '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳', '甲午', '乙未',
        '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
        '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥',
        '壬子', '癸丑', '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未',
        '庚申', '辛酉', '壬戌', '癸亥',
      ][v];
      
      var ts = await $getTemplateSet (this.localName);
      var e = ts.createFromTemplate ('div', args);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
      
    }, // swUpdate
  },
}); // <sw-data-kanshi>

defineElement ({
  name: 'sw-data-year',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: function () {
          return v;
        },
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: async function () {
      var v = this.value;
      var delta = parseFloat (this.getAttribute ('delta'));
      if (Number.isFinite (delta)) v += delta;

      var eraId = this.getAttribute ('eraid');
      var era;
      if (eraId) era = await SWD.era (eraId);

      var args = {value: v, era};
      if (era) {
        args.era = era;
        args.eraValue = v - era.offset;
        args.eraName = this.getAttribute ('eraname') || era.name;
      }
      args.format = this.getAttribute ('format');
      
      var ts = await $getTemplateSet (this.localName);
      var e = ts.createFromTemplate ('div', args);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
      
    }, // swUpdate
  },
}); // <sw-data-year>

(() => {

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'swDataYearSelector');
  def.pcHandler = function (templates, obj) {
    if (obj.era) {
      if (obj.format === 'text') {
        return templates.eraText;
      } else if (obj.format === 'eraWithYear') {
        return templates.eraWithYear;
      } else {
        return templates.era;
      }
    } else if (obj.format === 'yearHeader') {
      return templates.yearHeader;
    } else {
      return templates[""];
    }
  };
  document.head.appendChild (def);

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'swDataValueSelector');
  def.pcHandler = function (templates, obj) {
    if (obj.context.hasAttribute ('text')) {
      return templates.text;
    } else {
      return templates[""];
    }
  };
  document.head.appendChild (def);
  
}) ();

defineElement ({
  name: 'sw-data-era',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: function () {
          return v;
        },
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: async function () {
      var id = this.value;
      var args = await SWD.era (id);
      var ts = await $getTemplateSet (this.getAttribute ('template') || this.localName);
      var e = ts.createFromTemplate ('div', args);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
    }, // swUpdate
  },
}); // <sw-data-era>

defineElement ({
  name: 'sw-algorithm',
  props: {
    pcInit: function () {
      this.swUpdate ();
    }, // pcInit
    swUpdate: async function () {
      var name = this.getAttribute ('name');
      return Promise.resolve ().then (() => {
        if (name === 'is-proleptic-julian-leap-year') {
          var y = parseFloat (this.getAttribute ('arg-year'));
          return ['leap', 0 === mod (y, 4)];
        } else if (name === 'is-proleptic-gregorian-leap-year') {
          var y = parseFloat (this.getAttribute ('arg-year'));
          return ['leap', 0 === mod (y, 4) && !(0 === mod (y, 100) && !(0 === mod (y, 400)))];
        } else if (name === 'next-proleptic-julian-leap-year') {
          var y = parseFloat (this.getAttribute ('arg-year'));
          y++;
          if (!Number.isFinite (y)) throw new Error ("Bad |arg-year|");
          while (true) {
            if (0 === mod (y, 4)) break;
            y++;
          }
          return ['year', y];
        } else if (name === 'prev-proleptic-julian-leap-year') {
          var y = parseFloat (this.getAttribute ('arg-year'));
          y--;
          if (!Number.isFinite (y)) throw new Error ("Bad |arg-year|");
          while (true) {
            if (0 === mod (y, 4)) break;
            y--;
          }
          return ['year', y];
        } else if (name === 'next-proleptic-gregorian-leap-year') {
          var y = parseFloat (this.getAttribute ('arg-year'));
          y++;
          if (!Number.isFinite (y)) throw new Error ("Bad |arg-year|");
          while (true) {
            if (0 === mod (y, 4) && !(0 === mod (y, 100) && !(0 === mod (y, 400)))) break;
            y++;
          }
          return ['year', y];
        } else if (name === 'prev-proleptic-gregorian-leap-year') {
          var y = parseFloat (this.getAttribute ('arg-year'));
          y--;
          if (!Number.isFinite (y)) throw new Error ("Bad |arg-year|");
          while (true) {
            if (0 === mod (y, 4) && !(0 === mod (y, 100) && !(0 === mod (y, 400)))) break;
            y--;
          }
          return ['year', y];
        } else if (name === 'before-epoch-year') {
          var y = parseFloat (this.getAttribute ('arg-year'));
          return 1 - y;
        } else if (name === 'kanshi-year') {
          var y = parseFloat (this.getAttribute ('arg-year'));
          return ['kanshi', mod (y - 4, 60)];
        } else {
          throw new TypeError ('Unknown algorithm |'+name+'|');
        }
      }).then (r => {
        if (r === true || r === false) {
          var s = document.createElement ('sw-data-boolean');
          s.value = r;
          return s;
        } else if (typeof r === 'number') {
          var s = document.createElement ('sw-data-number');
          s.value = r;
          return s;
        } else if (Array.isArray (r) && r[0] === 'leap') {
          var s = document.createElement ('sw-data-boolean');
          s.className = r[0];
          s.value = r[1];
          return s;
        } else if (Array.isArray (r)) {
          if (r[0] === 'year') {
            var s = document.createElement ('sw-data-year');
            s.value = r[1];
            return s;
          } else if (r[0] === 'kanshi') {
            var s = document.createElement ('sw-data-kanshi');
            s.value = r[1];
            if (this.hasAttribute ('value-text')) s.setAttribute ('text', '');
            return s;
          }
        }
        
        var s = document.createElement ('span'); // XXX
        s.appendChild (document.createTextNode (r));
        return s;
      }, e => {
        var s = document.createElement ('span'); // XXX
        s.appendChild (document.createTextNode (e));
        return s;
      }).then (s => {
        this.textContent = '';
        this.appendChild (s);
      });
    }, // swUpdate
  },
}); // <sw-algorithm>

defineListLoader ('swYearListLoader', async function (opts) {
  var eraId = this.getAttribute ('loader-eraid');
  var era;
  if (eraId) era = await SWD.era (eraId);

  if (era && !Number.isFinite (era.offset)) {
    return {data: []};
  }
  
  var ref = null;
  var reversed = false;
  if (Array.isArray (opts.ref)) {
    ref = opts.ref[0];
    reversed = opts.ref[1];
  }
  if (!ref && era) {
    if (Number.isFinite (era.table_oldest_year)) ref = era.table_oldest_year;
  }
  if (!Number.isFinite (ref)) ref = 2000;
  
  var limit = parseInt (opts.limit);
  var nextLimit = limit;
  if (!Number.isFinite (limit)) {
    if (Number.isFinite (era.table_latest_year)) {
      limit = era.table_latest_year - ref + 1;
    }
  }
  if (!Number.isFinite (limit) || limit <= 0) limit = 100;
  if (!Number.isFinite (nextLimit)) nextLimit = 100;
  if (limit > 300) limit = 300;
  if (Number.isFinite (era.table_oldest_year) &&
      era.table_oldest_year + limit < era.known_oldest_year) {
    ref = era.known_oldest_year;
  }
  
  var years = [];
  for (var i = ref; i < ref + limit; i++) {
    years.push ({year: i, eraId,
                 inRange: era.start_year <= i && i <= era.end_year,
                 inKnownRange: era.known_oldest_year <= i && i <= era.known_latest_year});
  }
  if (reversed) {
    return {data: years.reverse (),
            prev: {ref: [ref + nextLimit, false], has: true, limit: nextLimit},
            next: {ref: [ref - limit, true], has: true, limit: nextLimit}};
  } else {
    return {data: years,
            prev: {ref: [ref - nextLimit, true], has: true, limit: nextLimit},
            next: {ref: [ref + limit, false], has: true, limit: nextLimit}};
  }
});

defineListLoader ('swEraListLoader', function (opts) {
  return SWD.eraList ({
    tagId: this.getAttribute ('loader-tagid'),
  }).then (eras => {
    return Object.values (eras).sort ((a, b) => {
      return a.offset - b.offset ||
             a.start_year - b.start_year ||
             a.end_year - b.end_year ||
             a.id-b.id;
    });
  }).then (eras => {
    return {data: eras};
  });
});

defineListLoader ('swTransitionListLoader', async function (opts) {
  var eraId = this.getAttribute ('loader-eraid');
  var era = await SWD.era (eraId);
  if (!era) throw new Error ("Era not found: " + eraId);

  var items = await SWD.eraTransitionsByEraId (eraId);

  var year = parseFloat (this.getAttribute ('loader-year'));
  if (Number.isFinite (year)) {
    items = items.filter (_ => {
      var d = _.day || _.day_start
      // XXX primary calendar
      var ds;
      if (_.tag_ids[1344]) {
        ds = d.gregorian;
      } else {
        ds = d.nongli_tiger || d.kyuureki || d.gregorian;
      }
      var m = ds.match (/^(-?[0-9]+)/);
      var y = parseFloat (m[1]);
      return y === year;
    });
  }

  items.forEach (_ => {
    _.self = _;
    _.type2 = _.type.replace (/\//g, '-');
    _.neighbors = {
      year: year,
      thisEraId: eraId,
      prev_era_ids: Object.keys (_.prev_era_ids || {}).filter (_ => _ != eraId),
      next_era_ids: Object.keys (_.next_era_ids || {}).filter (_ => _ != eraId),
      relevant_era_ids: _.relevant_era_ids,
    };

    _.day_hidden = _.day ? null : '';
    _.day_range_hidden = _.day_start ? null : '';
  });

  return {data: items};
});

defineListLoader ('swRelatedTagListLoader', function (opts) {
  var thisTagId = this.getAttribute ('loader-tagid');
  return SWD.eraList ({
    tagId: thisTagId,
  }).then (eras => {
    var tagIds = {};
    Object.values (eras).forEach (era => {
      Object.keys (era.tag_ids || {}).forEach (tagId => {
        tagIds[tagId] = (tagIds[tagId] || 0) + 1;
      });
    });
    delete tagIds[thisTagId];
    var list = Object.keys (tagIds).sort ((a,b) => tagIds[b]-tagIds[a] || a-b).slice (0, 30);
    return SWD.tagsByIds (list);
  }).then (tags => {
    return {data: tags};
  });
});

defineElement ({
  name: 'sw-transition-neighbors',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: function () {
          return v;
        },
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: async function () {
      this.textContent = '';

      var v = this.value;
      var items = [];
      v.prev_era_ids.forEach (_ => {
        var untilFirstDay = 0+v.relevant_era_ids[v.thisEraId].until_first_day;
        var sinceFirstDay = -untilFirstDay;
        if (untilFirstDay < 0 || !Number.isFinite (untilFirstDay)) untilFirstDay = null;
        if (sinceFirstDay <= 0 || !Number.isFinite (sinceFirstDay)) sinceFirstDay = null;
        items.push ({year: v.year, era_id: _, direction: 'prev',
                     untilFirstDay, sinceFirstDay});
      });
      v.next_era_ids.forEach (_ => {
        var untilFirstDay = 0+v.relevant_era_ids[_].until_first_day;
        var sinceFirstDay = -untilFirstDay;
        if (untilFirstDay < 0 || !Number.isFinite (untilFirstDay)) untilFirstDay = null;
        if (sinceFirstDay <= 0 || !Number.isFinite (sinceFirstDay)) sinceFirstDay = null;
        items.push ({year: v.year, era_id: _, direction: 'next',
                     untilFirstDay, sinceFirstDay});
      });
      if (!items.length) return;
      
      var ts = await $getTemplateSet (this.localName);

      items.forEach (item => {
        var e = ts.createFromTemplate ('div', item);
        this.appendChild (e);
      });
    }, // swUpdate
  },
}); // <sw-transition-neighbors>

defineElement ({
  name: 'sw-transition-desc',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: function () {
          return v;
        },
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: async function () {
      var ts = await $getTemplateSet (this.localName);
      var e = ts.createFromTemplate ('div', this.value);
      
      this.textContent = '';
      this.appendChild (e);
    }, // swUpdate
  },
}); // <sw-transition-desc>

(() => {

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'swTransitionDescSelector');
  def.pcHandler = function (templates, obj) {
    return templates[obj.action_tag_id] || templates[""];
  };
  document.head.appendChild (def);
  
}) ();

defineElement ({
  name: 'sw-era-transition-graph',
  props: {
    // </tag/1756/graph?sequence=651&sequence=651%2B1801&sequence=651%2B1171>:
    // 三国時代
    //
    // </tag/1933/graph?sequence=1366&sequence=1366%2B1957&sequence=1366%2B1957%2B1524>:
    // 五代
    //
    // </tag/1003/graph?sequence=756%2B1065&sequence=756>: 日本南北朝時代
    pcInit: async function () {
      var eras = [];
      var eraClassLists = [];
      var sequences = [];

      var eraId = this.getAttribute ('eraid');
      if (eraId !== null) {
        var era = await SWD.era (eraId);
        if (!era) throw new Error ('Era |'+eraId+'| not found');

        var items = await this.extractTransitionSequence ({
          startEra: era,
        });
        eras = eras.concat (items.map (_ => {
          eraClassLists[_.era.id] = eraClassLists[_.era.id] || [];
          eraClassLists[_.era.id].push ('in-sequence', 'in-sequence-0');
          return _.era;
        }));
        sequences.push (items);
      } else {
        var tagId = this.getAttribute ('tagid');
        var eras = await SWD.eraList ({tagId});
        eras.forEach (era => {
          eraClassLists[era.id] = eraClassLists[era.id] || [];
          eraClassLists[era.id].push ('in-tag');
        });

        var seqs = (this.getAttribute ('sequences') || '').split (/\s+/).filter (_ => _.length);
        for (var i = 0; i < seqs.length; i++) {
          var seq = seqs[i];
          var v = seq.split (/(?=[+-])/);
          var startEraId = v.shift ();
          var startEra = await SWD.era (startEraId);
          if (!startEra) throw new Error ('Era |'+startEraId+'| not found');

          var includedTags = [];
          var excludedTags = [];
          for (var j = 0; j < v.length; j++) {
            var m = v[j].match (/^([+-])([0-9]+)$/);
            if (!m) throw new Error ('Bad sequence specification |'+seq+'|');
            var tag = await SWD.tag (m[2]);
            if (!tag) throw new Error ('Tag |'+m[2]+'| not found');
            if (m[1] === '+') includedTags.push (tag);
            if (m[1] === '-') excludedTags.push (tag);
          }

          var items = await this.extractTransitionSequence ({
            startEra,
            includedTags,
            excludedTags,
          });
          eras = eras.concat (items.map (_ => {
            eraClassLists[_.era.id] = eraClassLists[_.era.id] || [];
            eraClassLists[_.era.id].push ('in-sequence', 'in-sequence-' + i);
            return _.era;
          }));
          sequences.push (items);
        } // seq
      }
      
      return this.swRender ({
        eras,
        eraClassLists,
        sequences,
      });
    }, // pcInit

    extractTransitionSequence: async function (opts) {
      var tagsIncluded = (opts.includedTags || []).map (_ => _.id);
      var tagsExcluded = (opts.excludedTags || []).map (_ => _.id);
      var hasTag = (tr, tags) => {
        for (var i = 0; i < tags.length; i++) {
          if (tr.tag_ids[tags[i]]) return true;
        }
        return false;
      };
      
      var getTransition = async (era, mjd, direction) => {
        var fys = null;
        var fd = null;
        var matched = [];
        var matchedOthers = [];

        var trs = await SWD.eraTransitionsByEraId (era.id);
        for (var i = 0; i < trs.length; i++) {
          var tr = trs[i];
          if (tr.day != null) {
            if (tr.day.mjd < mjd) continue;
          } else if (tr.day_start != null) {
            if (tr.day_end.mjd < mjd) continue;
          } else {
            console.log ("Bad transition", tr);
            continue;
          }

          var fdMatched = false;
          if ((direction === 'incoming' && tr.next_era_ids && tr.next_era_ids[era.id]) ||
              (direction === 'outgoing' && tr.prev_era_ids && tr.prev_era_ids[era.id])) {
            if ((tr.type === 'firstday' || tr.type === 'renamed') &&
                (!(tr.tag_ids[1359] /* 起事建元 */ ||
                   tr.tag_ids[2043] /* 起事廃元 */ ||
                   tr.tag_ids[1420] /* 発生 */ ||
                   (era.tag_ids[1078] /* 公年号 */ && tr.tag_ids[2045] /* マイクロネーション建元 */) ||
                   tr.tag_ids[1492] /* 併用 */) ||
                 direction === 'incoming')) {
              fdMatched = true;
              if (hasTag (tr, tagsIncluded) && !hasTag (tr, tagsExcluded)) {
                matched.push (tr);
              }
              if (!hasTag (tr, tagsExcluded)) {
                fd = fd || tr;
              }
            }
            if ((tr.type === 'commenced' &&
                 !(tr.tag_ids[1420] /* 発生 */ ||
                   (era.tag_ids[1078] /* 公年号 */ && tr.tag_ids[2045] /* マイクロネーション建元 */) ||
                   tr.tag_ids[1492] /* 併用 */)) ||
                tr.type === 'administrative') {
              if (hasTag (tr, tagsIncluded) && !hasTag (tr, tagsExcluded)) {
                matched.push (tr);
              } else {
                matchedOthers.push (tr);
              }
            }
            if (tr.type === 'wartime' || tr.type === 'received' ||
                ((tr.type === 'firstday' ||
                  tr.type === 'renamed') && !fdMatched)) {
              if (hasTag (tr, tagsIncluded) && !hasTag (tr, tagsExcluded)) {
                matched.push (tr);
              } else {
                matchedOthers.push (tr);
              }
            }
            if (tr.type === 'firstyearstart') {
              if (tr.tag_ids[1342] /* 天皇即位元年年始 */) {
                fys = fys || tr;
              }
            }
          } // tr
        } // prev or next

        if (matched.length) return matched[0];
        if (fd !== null) return fd;
        if (fys !== null) return fys;
        if (matchedOthers.length) return matchedOthers[matchedOthers.length-1];
        return null;
      }; // getTransition

      var items = [];
      var lastItem;
      var tr = await getTransition (opts.startEra, -Infinity, 'incoming');
      if (tr !== null) {
        lastItem = {
          prevEra: null,
          era: opts.startEra,
          transition: tr,
          day: tr.day || tr.day_end,
          delta: 0,
        };
        items.push (lastItem);
      } else {
        console.log ('No incoming transition', opts.startEra);
        lastItem = {
          prevEra: null,
          era: opts.startEra,
          transition: null,
          day: null,
          delta: null,
        };
        items.push (lastItem);
      } // tr

      var seen = new Set;
      while (true) {
        var tr = await getTransition (lastItem.era, (lastItem.day ? lastItem.day.mjd : -Infinity), 'outgoing');
          if (tr === null) break;
          if (seen.has (tr)) {
            console.log ("Transition loop", tr);
            break;
          }
          seen.add (tr);
          
          var nextEraIds = Object.keys (tr.next_era_ids);
          var nextEraId = null;
          if (nextEraIds.length === 1) {
            nextEraId = nextEraIds[0];
          } else {
            var nextEras = [];
            for (var i = 0; i < nextEraIds.length; i++) {
              var era = await SWD.era (nextEraIds[i]);
              nextEras[nextEraIds[i]] = era;
            }
            nextEraIds = nextEraIds.filter (_ => !nextEras[_].tag_ids[1200] /* 旧説 */);
            if (nextEraIds.length === 1) {
              nextEraId = nextEraIds[0];
            } else {
              if (nextEraIds.length === 0) {
                console.log ('No next era', tr);
              } else {
                console.log ('Multiple next eras', tr);
              }
              break;
            }
          }
          var delta = 0;
          if (tr.type === 'wartime' && tr.tag_ids[1226] /* 陥落 */) {
            delta = 1;
          }
          lastItem = {
            prevEra: lastItem.era,
            //era
            transition: tr,
            day: tr.day || tr.day_end,
            delta,
          };
          lastItem.era = await SWD.era (nextEraId);
          items.push (lastItem);
        } // while

      return items;
    }, // extractTransitionSequence
    
    swRender: async function ({eras, sequences, eraClassLists}) {
      var eraIds = {};
      var eraIdToEras = {};
      var yearTrs = {};
      var FUTURE = 9999; // Y10K!
      var thisYear = (new Date).getFullYear ();
      yearTrs[thisYear] = [];
      yearTrs[FUTURE] = [];
      eras.forEach (era => {
        eraIds[era.id] = true;
        eraIdToEras[era.id] = era;
      });
      var trs = await SWD.eraTransitions ();
      var trArrows = new Map;
      sequences.forEach (seq => {
        seq.forEach (item => {
          if (item.transition) trArrows.set (item.transition, []);
        });
      });
      var arrowVisibleTransitionTypes = {
        firstday: true,
        'firstday/possible': true,
        'firstday/incorrect': true,
        commenced: true,
        'commenced/possible': true,
        'commenced/incorrect': true,
        renamed: true,
        administrative: true,
        'administrative/possible': true,
        'administrative/incorrect': true,
        wartime: true,
        'wartime/possible': true,
        'wartime/incorrect': true,
      };
      var eraStates = [];
      for (var _ in trs) {
        var tr = trs[_];
        if (arrowVisibleTransitionTypes[tr.type] ||
            (tr.type === 'firstyearstart' && tr.tag_ids[1342] /* 天皇即位元年年始 */) ||
            trArrows.get (tr)) {
          var pushed = false;
          for (var id in tr.relevant_era_ids) {
            if (eraIds[id]) {
              var year = (tr.day || tr.day_start).year;
              yearTrs[year] = yearTrs[year] || [];
              yearTrs[year].push (tr);
              pushed = true;
              break;
            }
          }
          if (pushed) {
            for (var id in tr.relevant_era_ids) {
              var era = eraIdToEras[id];
              if (eraStates[id]) continue;
              var loaded = !!era;
              if (!loaded) era = await SWD.era (id);
              var c = eraStates[id] = {
                era,
                eraClassList: eraClassLists[id] || [],
                selected: loaded,
                year: -Infinity,
                yearAreas: [],
                end_year: era.end_year,
                known_latest_year: era.known_latest_year,
              };
            }
          }
        }
      } // trs
      eras.forEach (era => {
        if (!eraStates[era.id]) eraStates[era.id] = {
          era,
          eraClassList: eraClassLists[era.id] || [],
          selected: true,
          year: -Infinity,
          yearAreas: [],
          end_year: era.end_year,
          known_latest_year: era.known_latest_year,
        };
        var c = eraStates[era.id];

        if (c.era.start_year != null && c.end_year == null) {
          c.end_year = FUTURE;
          c.known_latest_year = FUTURE;
        }

        if (c.selected) {
          var year = era.known_oldest_year;
          if (year == null) year = era.start_year;
          if (year == null) year = era.offset+1;
          if (!Number.isFinite (year)) year = FUTURE;
          
          [era.known_oldest_year, c.known_latest_year,
           era.start_year, c.end_year,
           (c.known_latest_year >= thisYear ? thisYear : year),
           year].forEach (yy => {
             if (!yearTrs[yy]) yearTrs[yy] = [];
        
             var tr = {relevant_era_ids: {}, prev_era_ids: {}, next_era_ids: {}};
             tr.relevant_era_ids[era.id] = true;
             yearTrs[yy].push (tr);
           });
        } // c.selected
      }); // eras
      delete yearTrs.null;
      delete yearTrs.undefined;
      sequences.forEach (seq => {
        if (seq.length) eraStates[seq[seq.length-1].era.id].dontUnassign = true;
      });

      var table = document.createElement ('table');
      var svg = document.createElementNS ('http://www.w3.org/2000/svg', 'svg');

      var layers = {};
      ['era-transitions',
       'era-lines-cover', 'era-lines',
       'era-transition-sequence',
       'year-boundaries', ''].forEach (_ => {
        var g = document.createElementNS ('http://www.w3.org/2000/svg', 'g');
        layers[_] = g;
        svg.appendChild (g);
      });
      
      var items = [];
      var nextColumn = 0;
      var columnWidth = 5*16;
      var eraHeaderHeight = 16*3;
      var eraHeaderMargin = 4;
      var nextRow = 0;
      var rowHeight = 2*16;
      var arrowHeight = 7;
      var arrowMargin = 16*1.5;
      var rowHeaderWidth = 16*10;
      var rowHeaderHeight = 16*6;
      var yearNumberWidth = 16*3;
      var yearNumberHeight = 16*1.5;
      var yearBoundaryMarginTop = 16;
      var yearBoundaryMarginBottom = 16;
      var yearContinueLength = 16*2;
      var seqLineShift = 5;

      var insertText = args => {
        var fo = document.createElementNS
            ('http://www.w3.org/2000/svg', 'foreignObject');
        if (args.left != null) {
          fo.setAttribute ('x', args.left);
        } else {
          fo.setAttribute ('x', args.x - args.width/2);
        }
        if (args.top != null) {
          fo.setAttribute ('y', args.top);
        } else {
          fo.setAttribute ('y', args.y - args.height/2);
        }
        fo.setAttribute ('width', args.width);
        fo.setAttribute ('height', args.height);

        var div = document.createElement ('div');
        if (args.className) div.className = args.className;
        (args.classList || []).forEach (_ => div.classList.toggle (_, !!_));
        if (args.element) {
          var e = document.createElement (args.element);
          if (args.template) e.setAttribute ('template', args.template);
          if (args.format) e.setAttribute ('format', args.format);
          if (args.value != null) e.value = args.value;
          div.appendChild (e);
        } else {
          div.textContent = args.text;
        }

        if (args.debug) {
          fo.setAttribute ('data-debug', JSON.stringify (args.debug));
        }

        fo.appendChild (div);
        layers[args.layer || ''].appendChild (fo);
      }; // insertText

      var insertLine = function (args) {
        if (args.wave) {
          var n = Math.floor ((args.end[0] - args.start[0]) / 48);
          var text = '';
          for (var i = 0; i < n; i++) {
            text += "\u2003";
          }
          return insertText ({
            classList: args.classList,
            text,
            left: args.start[0],
            y: args.start[1] - 36,
            width: args.end[0] - args.start[0],
            height: 48,
            layer: args.layer,
          });
        }
        
        var line = document.createElementNS
            ('http://www.w3.org/2000/svg', 'line');
        var hMargin = args.hMargin || 0;
        if (args.start[0] < args.end[0]) {
          line.setAttribute ('x1', args.start[0] + hMargin);
          line.setAttribute ('x2', args.end[0] - hMargin);
        } else {
          line.setAttribute ('x1', args.start[0] - hMargin);
          line.setAttribute ('x2', args.end[0] + hMargin);
        }
        var vMargin = args.vMargin || 0;
        if (args.start[1] < args.end[1]) {
          line.setAttribute ('y1', args.start[1] + vMargin);
          line.setAttribute ('y2', args.end[1] - vMargin);
        } else {
          line.setAttribute ('y1', args.start[1] - vMargin);
          line.setAttribute ('y2', args.end[1] + vMargin);
        }
        line.setAttribute ('class', (args.classList || []).filter (_ => _ != null).join (' '));
        layers[args.layer || ''].appendChild (line);

        if (args.coverLayer) {
          var line = document.createElementNS
              ('http://www.w3.org/2000/svg', 'line');
          line.setAttribute ('x1', args.start[0]);
          line.setAttribute ('x2', args.end[0]);
          line.setAttribute ('class', (args.coverClassList || []).filter (_ => _ != null).join (' '));
          layers[args.coverLayer || ''].appendChild (line);
        }
      }; // insertLine

      var activeEraStates = [];
      var inactivatedEraStates = [];
      var yearRows = [];

      var extendEraYearArea = (c, year, opts) => {
        if (!c.yearAreas[year]) c.yearAreas[year] = {};
        var ya = c.yearAreas[year];
        if (opts.top) {
          if (!ya.top || opts.top < ya.top) ya.top = opts.top;
        }
        if (opts.bottom) {
          if (!ya.bottom || ya.bottom < opts.bottom) ya.bottom = opts.bottom;
          if (!c.bottom || c.bottom < opts.bottom) c.bottom = opts.bottom;
          if (c.column.bottom < opts.bottom) c.column.bottom = opts.bottom;
          if (!yearRows[year].bottom || yearRows[year].bottom < opts.bottom) {
            yearRows[year].bottom = opts.bottom;
          }
        }
        if (opts.anBottom) {
          if (!ya.anBottom || ya.anBottom < opts.anBottom) ya.anBottom = opts.anBottom;
          if (!yearRows[year].anBottom || yearRows[year].anBottom < opts.anBottom) yearRows[year].anBottom = opts.anBottom;
        }
        if (opts.vCenter) ya.vCenter = opts.vCenter;
      }; // extendEraYearArea

      var insertYearNumber = (c, year) => {
        var yr = year - c.era.offset;
        if (c.era.offset == null || year === FUTURE) yr = "\u2003";

        var ya = c.yearAreas[year] || {};
        var y;
        if (ya.top) {
          y = ya.top + arrowHeight/2;
        } else {
          y = yearRows[year].top + yearNumberHeight/2;
        }

        insertText ({
          text: yr,
          x: c.column.hCenter,
          y,
          width: yearNumberWidth,
          height: yearNumberHeight,
          classList: [
            'era-year-number',
            c.era.tag_ids[1200] ? 'incorrect' : null,
          ],
        });

        extendEraYearArea (c, year, {top: y-yearNumberHeight/2,
                                     bottom: y+yearNumberHeight/2,
                                     anBottom: y+yearNumberHeight/2,
                                     vCenter: y});
      }; // insertYearNumber

      var insertEraHeader = (c, year, opts) => {
        var x = c.yearAreas[year].vCenter;
        if (opts.bottom) {
          x += yearNumberHeight/2 + eraHeaderMargin;
          if (x < c.yearAreas[year].anBottom) x = c.yearAreas[year].anBottom;
        } else {
          x -= yearNumberHeight/2 + eraHeaderMargin;
          x -= eraHeaderHeight;
        }
        insertText ({
          classList: [
            'era-header',
            c.selected ? 'selected' : null,
            ...c.eraClassList,
            c.era.tag_ids[1200] ? 'incorrect' : null,
            opts.bottom ? 'bottom' : null,
          ],
          element: 'sw-data-era',
          template: 'sw-data-era-item',
          value: c.era.id,
          left: c.column.left,
          top: x,
          width: columnWidth,
          height: eraHeaderHeight,
        });
      }; // insertEraHeader

      var lastYear = -Infinity;
      var lastYearRow = -rowHeaderHeight;
      var yearBoundaries = [];

      nextColumn += rowHeaderWidth;
      nextRow += eraHeaderHeight;

      var Columns = [];
      var assignColumn = (c, refCS) => {
        if (c.column) return;

        var weights = [];
        refCS.forEach (cc => {
          if (cc.column) {
            weights[cc.column.index-3] = (weights[cc.column.index-3] || 0) + 1;
            weights[cc.column.index-2] = (weights[cc.column.index-2] || 0) + 2;
            weights[cc.column.index-1] = (weights[cc.column.index-1] || 0) + 3;
            weights[cc.column.index+1] = (weights[cc.column.index+1] || 0) + 3;
            weights[cc.column.index+2] = (weights[cc.column.index+2] || 0) + 2;
            weights[cc.column.index+3] = (weights[cc.column.index+3] || 0) + 1;
            if (Columns.length-1 < cc.column.index+3) {
              weights[Columns.length-1] = (weights[Columns.length-1]) + 3;
              weights[Columns.length-2] = (weights[Columns.length-2]) + 2;
              weights[Columns.length-3] = (weights[Columns.length-3]) + 1;
            }
          }
        });
        
        var column;
        var cols = Columns.filter (_ => !_.assigned);
        if (weights.length > Columns.length) cols.push ({new: true, index: Columns.length});
        cols = cols.sort ((a,b) => (weights[b.index]||0)-(weights[a.index]||0));
        for (var i = 0; i < cols.length; i++) {
          var col = cols[i];
          if (col.new) {
            break;
          } else if (col.bottom + eraHeaderHeight + yearBoundaryMarginBottom/*abused!*/ + eraHeaderHeight < nextRow) {
            column = col;
            break;
          }
        }
        if (!column) {
          column = {
            left: nextColumn,
            hCenter: nextColumn + columnWidth/2,
            index: Columns.length,
          };
          Columns.push (column);
          nextColumn += columnWidth;
        }
        
        column.assigned = c;
        c.column = column;
        c.column.bottom = nextRow;
      }; // assignColumn
      
      var years = Object.keys (yearTrs).map (_ => parseInt (_)).sort ((a,b) => a-b);
      var shownYears = [];
      for (var i = 0; i < years.length; i++) {
        if ((i % 30) === 1) {
          await new Promise (ok => setTimeout (ok, 100));
        }
        var year = years[i];
        var needYearNumbers = new Set;
        yearTrs[year].forEach (tr => {
          var cs = Object.keys (tr.prev_era_ids || {}).sort ((a,b) => a-b)
              .concat (Object.keys (tr.relevant_era_ids).sort ((a,b) => a-b))
              .map (id => eraStates[id]);
          cs.forEach (c => {
            if (c.assigned) return;
            assignColumn (c, cs);
            activeEraStates.push (c);
            c.assigned = true;
          }); // c
        });

        inactivatedEraStates.forEach (c => delete c.column.assigned);
        inactivatedEraStates = [];
        activeEraStates = activeEraStates.filter (c => {
          var cy = c.known_latest_year;
          if (lastYear < cy && cy <= year) {
            if (!c.dontUnassign) inactivatedEraStates.push (c);
            return false;
          }
          return true;
        });
        
        var yearBoundary = undefined;
        if (lastYear + 1 < year) {
          nextRow += yearBoundaryMarginTop;
          yearBoundary = nextRow;
          nextRow += yearBoundaryMarginBottom;
        }
        yearRows[year] = {
          yearBoundary,
          top: nextRow,
          bottom: nextRow,
        };
        lastYear = year;
        lastYearRow = nextRow;

        var hasTrType = [];
        yearTrs[year].forEach (tr => {
          Object.keys (tr.prev_era_ids || []).forEach (pid => {
            Object.keys (tr.next_era_ids || []).forEach (nid => {
              hasTrType[ [pid, nid, tr.type] ] = true;
            });
          });
        });

        var aY = nextRow + yearNumberHeight/2 - arrowHeight/2;
        yearTrs[year].forEach (tr => {
          Object.keys (tr.relevant_era_ids).forEach (id => {
            var c = eraStates[id];
            needYearNumbers.add (c);
          });

          var sType = (tr.type || '').split (/\//);
          var lines = [];
          Object.keys (tr.prev_era_ids || {}).forEach (pid => {
            var pc = eraStates[pid];
            Object.keys (tr.next_era_ids || {}).forEach (nid => {
              var nc = eraStates[nid];
              if (sType[1] &&
                  hasTrType[ [pid, nid, sType[0]] ] &&
                  !trArrows.get (tr)) return;
              if ((sType[0] === 'commenced' ||
                   sType[0] === 'firstyearstart') &&
                  hasTrType[ [pid, nid, 'firstday'] ] &&
                  !trArrows.get (tr)) return;
              lines.push ([pc, nc]);
            });
          });

          if (lines.length) {
            var trArrowList = trArrows.get (tr) || [];
            trArrows.set (tr, trArrowList);
            lines.forEach (_ => {
              extendEraYearArea (_[0], year, {top: aY,
                                              anBottom: aY+arrowHeight-1,
                                              bottom: aY+arrowHeight-1});
              extendEraYearArea (_[1], year, {top: aY,
                                              anBottom: aY+arrowHeight-1,
                                              bottom: aY+arrowHeight-1});
              var start = [_[0].column.hCenter, aY+arrowHeight/2];
              var end = [_[1].column.hCenter, aY+arrowHeight/2];
              if (arrowVisibleTransitionTypes[tr.type] ||
                  (tr.type === 'firstyearstart' && tr.tag_ids[1342] /* 天皇即位元年年始 */)) insertLine ({
                start,
                end,
                hMargin: arrowMargin,
                classList: [
                  'era-transition',
                  'transition-' + tr.type,
                  tr.tag_ids[1359] ? 'tag-1359' : null, /* 起事建元 */
                  tr.tag_ids[1200] ? 'incorrect' : null,
                ],
                layer: 'era-transitions',
              });
              trArrowList[ [_[0].era.id, _[1].era.id] ] = [start, end];
              aY += arrowHeight;
            }); // lines
          } // lines
        }); // trs

        if (needYearNumbers.size) {
          Array.from (needYearNumbers).forEach (c => {
            insertYearNumber (c, year);
          });
        } // needYearNumbers

        if (yearRows[year].top === yearRows[year].bottom) continue;
        if (yearRows[year].yearBoundary) {
          yearBoundaries.push (yearRows[year].yearBoundary);
        }
        shownYears.push (year);
        if (yearRows[year].bottom < yearRows[year].top + rowHeaderHeight) {
          yearRows[year].bottom = yearRows[year].top + rowHeaderHeight - 1;
        }
        nextRow = yearRows[year].bottom + 1;
      } // year

      if (nextColumn < rowHeaderWidth + columnWidth*5) nextColumn = rowHeaderWidth + columnWidth*5;
      shownYears.forEach (year => {
        if (year === FUTURE) return;
        insertText ({
          classList: [
            'year-header',
            (year == thisYear ? 'this-year' : null),
          ],
          element: 'sw-data-year',
          format: 'yearHeader',
          value: year,
          left: 0,
          top: yearRows[year].top,
          width: rowHeaderWidth,
          height: rowHeaderHeight,
        });
        insertText ({
          classList: [
            'year-header', 'right',
            (year == thisYear ? 'this-year' : null),
          ],
          element: 'sw-data-year',
          format: 'yearHeader',
          value: year,
          left: nextColumn,
          top: yearRows[year].top,
          width: rowHeaderWidth,
          height: rowHeaderHeight,
        });
      });
      nextColumn += rowHeaderWidth;
      yearBoundaries.forEach (y => {
        insertLine ({
          start: [0, y],
          end: [nextColumn, y],
          classList: ['year-boundary'],
          wave: true,
          layer: 'year-boundaries',
        });
      });

      Object.values (eraStates).forEach (c => {
        var years = Object.keys (c.yearAreas).map (_ => parseInt (_)).sort ((a,b) => a-b);
        if (c.selected) {
          var first = years.length ? years[0] : null;
          if (c.era.known_oldest_year < first) first = c.era.known_oldest_year;
          var last = years.length ? years[years.length-1] : null;
          if (last < c.known_latest_year) last = c.known_latest_year;
          if (first != null && last != null) {
            insertLine ({
              start: [c.column.hCenter, c.yearAreas[first].vCenter],
              end: [c.column.hCenter, c.yearAreas[last].vCenter],
              classList: [
                'era-line', 'era-known-line',
                c.era.tag_ids[1200] ? 'incorrect' : null,
              ],
              layer: 'era-lines',
            });
            insertLine ({
              start: [c.column.hCenter, c.yearAreas[first].vCenter],
              end: [c.column.hCenter, c.yearAreas[last].vCenter],
              classList: ['era-line-cover'],
              layer: 'era-lines-cover',
              vMargin: -yearNumberHeight/2,
            });
          }
          if (c.era.start_year != null && c.end_year != null) {
            insertLine ({
              start: [c.column.hCenter,
                      c.yearAreas[c.era.start_year].vCenter],
              end: [c.column.hCenter, c.yearAreas[c.end_year].bottom],
              classList: [
                'era-line', 'era-range-line',
                c.era.tag_ids[1200] ? 'incorrect' : null,
              ],
              layer: 'era-lines',
            });
          }
          var years = Object.keys (c.yearAreas).map (_ => parseInt (_)).sort ((a,b) => a-b);
          insertEraHeader (c, years[0], {});
          if (c.yearAreas[years[years.length-1]].vCenter - c.yearAreas[years[0]].vCenter > eraHeaderHeight * 5) {
            insertEraHeader (c, years[years.length-1], {bottom: true});
          }
        } else { // not c.selected
          var minYear = c.era.start_year;
          var maxYear = c.end_year;
          if (years[0] < minYear) minYear = years[0];
          if (maxYear < years[years.length-1]) maxYear = years[years.length-1];
          var lastVCenter = -Infinity;
          var lastEYear = null;
          var lastInserted = true;
          years.forEach (year => {
            var ya = c.yearAreas[year];
            if (minYear < year) {
              insertLine ({
                start: [c.column.hCenter, ya.vCenter],
                end: [c.column.hCenter, yearRows[year].top - yearContinueLength],
                classList: [
                  'era-line', 'era-continue-line',
                  c.era.tag_ids[1200] ? 'incorrect' : null,
                ],
                layer: 'era-lines',
              });
              extendEraYearArea (c, year, {top: yearRows[year].top - yearContinueLength,
                                           bottom: ya.vCenter});
            }
            if (year < maxYear) {
              insertLine ({
                start: [c.column.hCenter, ya.vCenter],
                end: [c.column.hCenter, yearRows[year].anBottom + yearContinueLength],
                classList: [
                  'era-line', 'era-continue-line',
                  c.era.tag_ids[1200] ? 'incorrect' : null,
                ],
                layer: 'era-lines',
              });
              extendEraYearArea (c, year, {top: ya.vCenter,
                                           bottom: yearRows[year].anBottom + yearContinueLength});
            } else if (year === maxYear) {
              insertLine ({
                start: [c.column.hCenter, ya.vCenter],
                end: [c.column.hCenter, ya.bottom],
                classList: [
                  'era-line', 'era-continue-line',
                  c.era.tag_ids[1200] ? 'incorrect' : null,
                ],
                layer: 'era-lines',
              });
            }
            var pInsertYear = !lastInserted ? lastEYear : null;
            lastInserted = false;
            lastEYear = year;
            if (c.yearAreas[year].vCenter - lastVCenter > eraHeaderHeight * 5) {
              if (pInsertYear !== null) {
                insertEraHeader (c, pInsertYear, {bottom: true});
              }
              if (year === minYear) {
                insertEraHeader (c, year, {});
                lastInserted = true;
              } else if (year === maxYear) {
                insertEraHeader (c, year, {bottom: true});
                lastInserted = true;
              } else if (year === years[0]) {
                insertEraHeader (c, year, {});
                lastInserted = true;
              } else if (year === years[years.length-1]) {
                insertEraHeader (c, year, {bottom: true});
                lastInserted = true;
              } else {
                insertEraHeader (c, year, {});
                lastInserted = true;
              }
            }
            lastVCenter = c.yearAreas[year].vCenter;
          });
        } // !c.selected?
      }); // era

      var seqLined = {};
      for (var i = 0; i < sequences.length; i++) {
        var seq = sequences[i];
        var lastPoint = null;
        var seqLineS = {};
        seq.forEach (item => {
          var trArrowList = trArrows.get (item.transition);
          if (trArrowList) {
            var prevEraId = item.prevEra ? item.prevEra.id : Object.keys (item.transition.prev_era_ids || {})[0];
            var ap = trArrowList[ [prevEraId, item.era.id] ];
            if (ap) {
              seqLineS[prevEraId] = seqLineS[prevEraId] || (seqLined[prevEraId] = (seqLined[prevEraId] || 0) + 1);
              if (lastPoint) insertLine ({
                start: [lastPoint[0]+seqLineS[prevEraId]*seqLineShift, lastPoint[1]],
                end: [ap[0][0]+seqLineS[prevEraId]*seqLineShift, ap[0][1]],
                vMargin: -seqLineShift/2,
                classList: [
                  'era-line', 'era-transition-sequence-line',
                  'in-sequence-' + i,
                ],
                layer: 'era-transition-sequence',
              });
              insertLine ({
                start: [ap[0][0]+seqLineS[prevEraId]*seqLineShift, ap[0][1]],
                end: ap[1],
                classList: [
                  'era-line', 'era-transition-sequence-line',
                  'in-sequence-' + i,
                ],
                layer: 'era-transition-sequence',
              });
              lastPoint = ap[1];
            } else { // !ap
              console.log ("Arrow not found", item, trArrowList);
            }
          } else { // !trArrowList
            if (item.transition) {
              console.log ("Transition not found", item, trArrows);
            } else {
              var c = eraStates[item.era.id];
              var ya = c.yearAreas[c.era.start_year] || c.yearAreas[c.era.known_oldest_year] || c.yearAreas[c.era.offset+1];
              if (ya) lastPoint = [c.column.hCenter, ya.vCenter];
            }
          }
        }); // item
        if (lastPoint) {
          var era = seq[seq.length-1].era;
          var c = eraStates[era.id];
          var bottom = yearRows[FUTURE].bottom;
          seqLineS[era.id] = seqLineS[era.id] || (seqLined[era.id] = (seqLined[era.id] || 0) + 1);
          insertLine ({
            start: [lastPoint[0]+seqLineS[era.id]*seqLineShift, lastPoint[1]],
            end: [c.column.hCenter+seqLineS[era.id]*seqLineShift, bottom],
            vMargin: -seqLineShift/2,
            classList: [
              'era-line', 'era-transition-sequence-line',
              'in-sequence-' + i,
            ],
            layer: 'era-transition-sequence',
          });
        }
        console.log (seq);
      } // sequences

      svg.setAttribute ('width', nextColumn);
      svg.setAttribute ('height', nextRow);

      this.textContent = '';
      this.appendChild (svg);
    }, // swRender
  },
}); // <sw-era-transition-graph>

defineElement ({
  name: 'sw-data-day',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: function () {
          return v;
        },
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: async function () {
      var v = this.value;
      this.hidden = !v;
      if (!v) return;

      var args = {value: v};
      args.weekday = mod (args.value.mjd - 4, 7);
      
      var m = args.value.gregorian.match (/^(-?[0-9]+)-([0-9]+)-([0-9]+)$/);
      args.gregorian = {year: parseFloat (m[1]),
                        month: parseFloat (m[2]),
                        day: parseFloat (m[3])};
      
      var m = args.value.julian.match (/^(-?[0-9]+)-([0-9]+)-([0-9]+)$/);
      args.julian = {year: parseFloat (m[1]),
                     month: parseFloat (m[2]),
                     day: parseFloat (m[3])};

      var m = (args.value.nongli_tiger || '').match (/^(-?[0-9]+)-([0-9]+)('|)-([0-9]+)$/);
      if (m) args.nongli_tiger = {year: parseFloat (m[1]),
                                  month: parseFloat (m[2]),
                                  leap_month: !!m[3],
                                  day: parseFloat (m[4])};
      if (!m) args.nongli_tiger_hidden = '';

      var m = (args.value.nongli_ox || '').match (/^(-?[0-9]+)-([0-9]+)('|)-([0-9]+)$/);
      if (m) args.nongli_ox = {year: parseFloat (m[1]),
                                  month: parseFloat (m[2]),
                                  leap_month: !!m[3],
                                  day: parseFloat (m[4])};
      if (!m) args.nongli_ox_hidden = '';
      
      var m = (args.value.nongli_rat || '').match (/^(-?[0-9]+)-([0-9]+)('|)-([0-9]+)$/);
      if (m) args.nongli_rat = {year: parseFloat (m[1]),
                                  month: parseFloat (m[2]),
                                  leap_month: !!m[3],
                                  day: parseFloat (m[4])};
      if (!m) args.nongli_rat_hidden = '';

      var m = (args.value.nongli_qin || '').match (/^(-?[0-9]+)-(-?[0-9]+)('|)-([0-9]+)$/);
      if (m) args.nongli_qin = {year: parseFloat (m[1]),
                                  month: parseFloat (m[2]),
                                  leap_month: !!m[3],
                                  day: parseFloat (m[4])};
      if (!m) args.nongli_qin_hidden = '';

      var m = (args.value.nongli_wuzhou || '').match (/^(-?[0-9]+)-(-?[0-9]+)('|)-([0-9]+)$/);
      if (m) args.nongli_wuzhou = {year: parseFloat (m[1]),
                                  month: parseFloat (m[2]),
                                  leap_month: !!m[3],
                                  day: parseFloat (m[4])};
      if (!m) args.nongli_wuzhou_hidden = '';
      
      var m = (args.value.kyuureki || '').match (/^(-?[0-9]+)-([0-9]+)('|)-([0-9]+)$/);
      if (m) args.kyuureki = {year: parseFloat (m[1]),
                                  month: parseFloat (m[2]),
                                  leap_month: !!m[3],
                                  day: parseFloat (m[4])};
      if (!m) args.kyuureki_hidden = '';
      
      var ts = await $getTemplateSet (this.localName);
      var e = ts.createFromTemplate ('div', args);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
      
    }, // swUpdate
  },
}); // <sw-data-day>

defineElement ({
  name: 'form',
  is: 'sw-year-determination-form',
  props: {
    pcInit: function () {
      this.oninput = () => this.swUpdate ();
      this.onchange = () => {
        var iy = parseFloat (this.elements.input_year.value);
        if (Number.isFinite (iy)) {
          this.swAddYear (iy);
        }
      };
      this.swYears = [0, 1];
      this.swUpdate ();
    }, // pcInit
    swUpdate: function () {
      clearTimeout (this._swUpdateTimer);
      this._swUpdateTimer = setTimeout (() => this._swUpdate (), 300);
    }, // swUpdate
    _swUpdate: function () {
      var form = this;

      var iy = form.elements.input_year.value;
      var ry = form.elements.input_ref_year.value;
      var re = form.elements.input_ref_era.value;
      if (re === 'bc') {
        ry = 1 - ry;
      } else if (re === 'kouki') {
        ry -= 660;
      }
      var offset = ry - iy;

      var tbody = this.querySelector ('tbody');
      var template = this.querySelector ('table template');
      tbody.textContent = '';
      this.swYears.forEach (delta => {
        var tr = document.createElement ('tr');
        tr.appendChild (template.content.cloneNode (true));
        $fill (tr, {delta});
        tbody.appendChild (tr);
      });

      form.querySelectorAll ('[data-value=year]').forEach (o => {
        o.value = offset + parseFloat (o.getAttribute ('data-delta'));
      });
      form.querySelectorAll ('[data-arg-year]').forEach (o => {
        o.setAttribute ('arg-year', offset + parseFloat (o.getAttribute ('data-delta')));
      });
      form.querySelectorAll ('[data-text=year]').forEach (o => {
        var y = offset + parseFloat (o.getAttribute ('data-delta'));
        if (o.hasAttribute ('data-text-bc')) {
          o.textContent = 1 - y;
        } else {
          o.textContent = y + parseFloat (o.getAttribute ('data-text-delta'));
        }
      });

      SWD.eraList ({}).then (eras => {
        form.querySelectorAll ('list-container[data-name=output_era_list]').forEach (l => {
          var delta = parseFloat (l.getAttribute ('data-delta'));
          l.swValue = eras.filter (_ => _.offset === offset + delta);
          l.load ({});
        });
      });
      
      form.elements.output_ad_year_new.onclick = () => {
        var delta = parseFloat (form.elements.output_ad_year_new_delta.value);
        if (!Number.isFinite (delta)) return;
        this.swAddYear (delta);
      };
    }, // _swUpdate
    swAddYear: function (delta) {
      var found = [];
      this.swYears = this.swYears.concat ([delta]).filter (_ => {
        if (found[_]) return false;
        return found[_] = true;
      });
      this.swUpdate ();
    }, // swAddYear
  },
}); // <form is=sw-year-determination-form>

defineListLoader ('swValueListLoader', function (opts) {
  var data = this.swValue || [];
  return {data};
});

defineElement ({
  name: 'sw-tags',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      setTimeout (() => this.swUpdate (), 0);

      var vals = this.value || {};
      if ("object" !== typeof vals) {
        var v = {};
        v[vals] = true;
        vals = v;
      }
      Object.defineProperty (this, 'value', {
        get: function () {
          return vals;
        },
        set: function (newVals) {
          vals = newVals || {};
          if ("object" !== typeof vals) {
            var v = {};
            v[vals] = true;
            vals = v;
          }
          this.swUpdate ();
        },
      });

      // preload
      SWD.data ('tags.json');
    }, // pcInit
    swUpdate: async function () {
      var tags = await SWD.tagsByIds (Object.keys (this.value));

      this.textContent = '';
      tags.sort ((a, b) => a.label < b.label ? -1 : +1).forEach (tag => {
        var e = document.createElement ('a');
        e.href = '/tag/' + tag.id + '/';
        e.textContent = tag.label;
        this.appendChild (e);
        this.appendChild (document.createTextNode (' '));
      });
    }, // swUpdate
  },
}); // <sw-tags>

/*

Copyright 2020-2021 Wakaba <wakaba@suikawiki.org>.

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
