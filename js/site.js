
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

        var m = path.match (/^\/e\/([0-9]+)\/$/);
        if (m) {
          args.eraId = parseFloat (m[1]);
          args.era = await SWD.era (args.eraId);
          if (args.era) args.name = 'page-era-item-index';
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
    pcInit: async function () {
      var tagId = this.getAttribute ('tagid');
      var eras = await SWD.eraList ({tagId});
      var eraIds = {};
      var eraIdToEras = {};
      var yearTrs = {};
      var FUTURE = 9999; // Y10K!
      eras.forEach (era => {
        eraIds[era.id] = true;
        eraIdToEras[era.id] = era;
        yearTrs[era.known_oldest_year] = [];
        yearTrs[era.known_latest_year] = [];
        yearTrs[era.start_year] = [];
        yearTrs[era.end_year] = [];
      });
      yearTrs[FUTURE] = [];
      delete yearTrs.null;
      delete yearTrs.undefined;
      var trs = await SWD.eraTransitions ();
      var eraStates = [];
      for (var _ in trs) {
        var tr = trs[_];
        if ({
          firstday: true,
          administrative: true,
          wartime: true,
        }[tr.type]) {
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
                selected: loaded,
                year: -Infinity,
                yearNumbers: [],
                end_year: era.end_year,
                known_latest_year: era.known_latest_year,
              };
              if (c.era.start_year != null && c.end_year == null) {
                c.end_year = FUTURE;
                c.known_latest_year = FUTURE;
              }
            }
          }
        }
      } // trs
      eras.forEach (era => {
        if (!eraStates[era.id]) {
          var c = eraStates[era.id] = {
            era,
            selected: true,
            year: -Infinity,
            yearNumbers: [],
            end_year: era.end_year,
            known_latest_year: era.known_latest_year,
          };
          if (c.era.start_year != null && c.end_year == null) {
            c.end_year = FUTURE;
            c.known_latest_year = FUTURE;
          }
          var year = era.known_oldest_year;
          if (year == null) year = era.start_year;
          if (year == null) year = era.offset+1;
          if (!Number.isFinite (year)) year = FUTURE;
          var tr = {
            relevant_era_ids: {},
            prev_era_ids: {}, next_era_ids: {},
          };
          tr.relevant_era_ids[era.id] = true;
          if (!yearTrs[year]) yearTrs[year] = [];
          yearTrs[year].push (tr);
        }
      });

      var table = document.createElement ('table');
      var svg = document.createElementNS ('http://www.w3.org/2000/svg', 'svg');

      var layers = {};
      ['era-lines', 'year-boundaries', 'era-transitions', ''].forEach (_ => {
        var g = document.createElementNS ('http://www.w3.org/2000/svg', 'g');
        layers[_] = g;
        svg.appendChild (g);
      });
      
      var items = [];
      var nextColumn = 0;
      var columnWidth = 5*16;
      var eraHeaderHeight = 16*3;
      var nextRow = 0;
      var rowHeight = 2*16;
      var arrowHeight = 7;
      var arrowMargin = 16*1.5;
      var rowHeaderWidth = 16*10;
      var rowHeaderHeight = 16*5;
      var yearNumberWidth = 16*3;
      var yearNumberHeight = 16*1.5;
      var yearBoundaryMarginTop = 16;
      var yearBoundaryMarginBottom = 16;

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
        if (args.className === 'year-boundary') {
          var n = Math.floor ((args.end[0] - args.start[0]) / 48);
          var text = '';
          for (var i = 0; i < n; i++) {
            text += "\u2003";
          }
          return insertText ({
            className: args.className,
            text,
            left: args.start[0],
            y: args.start[1] - 48,
            width: args.end[0] - args.start[0],
            height: 48,
            layer: args.layer,
          });
        }
        var line = document.createElementNS
            ('http://www.w3.org/2000/svg', 'line');
        var margin = args.margin || 0;
        if (args.start[0] < args.end[0]) {
          line.setAttribute ('x1', args.start[0] + margin);
          line.setAttribute ('x2', args.end[0] - margin);
        } else {
          line.setAttribute ('x1', args.start[0] - margin);
          line.setAttribute ('x2', args.end[0] + margin);
        }
        line.setAttribute ('y1', args.start[1]);
        line.setAttribute ('y2', args.end[1]);
        line.setAttribute ('class', args.className);
        if (args.lineType) line.setAttribute ('data-type', args.lineType);
        layers[args.layer || ''].appendChild (line);
      }; // insertLine

      var activeEraStates = [];
      var inactivatedEraStates = [];
      var yearRows = [];
      var insertEraHeader = (c, refYear) => {
        var bottom = nextRow;
        if (refYear != lastYear) bottom = yearRows[refYear].top;
        c.column.bottom = bottom;
        if (c.yearNumbers[refYear] && c.yearNumbers[refYear].top < bottom) {
          bottom = c.yearNumbers[refYear].top;
        }
        insertText ({
          classList: [
            'era-header',
            c.selected ? 'selected' : null,
            c.era.tag_ids[1200] ? 'incorrect' : null,
          ],
          element: 'sw-data-era',
          template: 'sw-data-era-item',
          value: c.era.id,
          left: c.column.left,
          top: bottom - eraHeaderHeight,
          width: columnWidth,
          height: eraHeaderHeight,
        });
      }; // insertEraHeader

      var insertYearLine2 = (c, close) => {
            console.log(c);
        if (Number.isFinite (c.lineStartY)) {
          if (c.selected) {
            var bottom = c.bottom;
            if (c.lineStartY < bottom) {
              insertLine ({
                start: [c.column.hCenter, c.lineStartY],
                end: [c.column.hCenter, bottom],
                className: (c.known_latest_year === c.end_year ? 'era-line era-range-line _2' : 'era-line era-known-line _2'), // _2 is for debugging
                layer: 'era-lines',
              });
              if (c.column.bottom < bottom) c.column.bottom = bottom;
            }
          } else { // not selected
            var bottom = c.lineEndY;
            if (bottom < c.bottom) bottom = c.bottom;
            if (c.lineStartY < bottom) {
              insertLine ({
                start: [c.column.hCenter, c.lineStartY],
                end: [c.column.hCenter, bottom],
                className: 'era-line era-continue-line',
                layer: 'era-lines',
              });
              c.bottom = bottom;
              if (c.column.bottom < bottom) c.column.bottom = bottom;
            }
            delete c.lineStartY;
          }
        }

        if (close) {
          var column = c.column;
          delete column.assigned;
          /*insertLine ({
            start: [column.left, column.bottom],
            end: [column.hCenter, column.bottom],
          });*/
        }
      }; // insertYearLine2

      var insertYearNumber = (c, year) => {
        if (c.yearNumbers[year]) return false;
        
        if (c.year < year) {
          insertYearLine2 (c, c.known_latest_year < year);
          
          var yr = year - c.era.offset;
          if (c.era.offset == null || year === FUTURE) yr = "\u2003";
          var y = nextRow;
          if (year != lastYear) {
            if (!yearRows[year]) return false;
            y = yearRows[year].top;
          }
          if (c.column.bottom < y + yearNumberHeight) {
            c.column.bottom = y + yearNumberHeight;
          }
          c.yearNumbers[year] = {top: y};
          y += yearNumberHeight/2;
          c.yearNumbers[year].vCenter = y;
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
          c.year = year;

          if (!c.selected) {
            var yTop = yearRows[year].top - yearBoundaryMarginBottom;
            if (c.era.known_oldest_year < year) {
              insertLine ({
                start: [c.column.hCenter, yTop],
                end: [c.column.hCenter, y],
                className: 'era-line era-continue-line',
                layer: 'era-lines',
              });
            }
            if (year < c.known_latest_year) {
              c.lineStartY = y;
              c.lineEndY = y + rowHeaderHeight/2;
            } else if (year == c.known_latest_year) {
              c.lineStartY = y;
              c.lineEndY = y;
            }
            console.log(c,c.lineStartY);
          } // !c.selected
          
          return true;
        }
        
        return false;
      }; // insertYearNumber

      var lastYear = -Infinity;
      var lastYearRow = -rowHeaderHeight;
      var yearBoundaries = [];
      var insertYearHeader = (year) => {
        if (year <= lastYear) return;

        inactivatedEraStates.forEach (c => insertYearLine2 (c, true));

        var insertedYears = {};
        insertedYears[year] = [];
        inactivatedEraStates = [];
        activeEraStates = activeEraStates.filter (c => {
          var cy = c.era.known_oldest_year;
          if (lastYear < cy && cy <= year) {
            insertedYears[cy] = insertedYears[cy] || [];
            insertedYears[cy].push (c);
          }
          var cy = c.era.start_year;
          if (lastYear < cy && cy <= year) {
            insertedYears[cy] = insertedYears[cy] || [];
            insertedYears[cy].push (c);
          }
          var cy = c.end_year;
          if (lastYear < cy && cy <= year) {
            insertedYears[cy] = insertedYears[cy] || [];
            insertedYears[cy].push (c);
          }
          
          var cy = c.known_latest_year;
          if (lastYear < cy && cy <= year) {
            insertedYears[cy] = insertedYears[cy] || [];
            insertedYears[cy].push (c);
            inactivatedEraStates.push (c);
            return false;
          }
          return true;
        });

        Object.keys (insertedYears).sort ((a,b) => a-b).forEach (y => {
          y = parseInt (y);
          if (lastYearRow + rowHeaderHeight > nextRow) {
            nextRow = lastYearRow + rowHeaderHeight;
          }
          if (lastYear + 1 < y) {
            nextRow += yearBoundaryMarginTop;
            yearBoundaries.push (nextRow);
            nextRow += yearBoundaryMarginBottom;
          }
          yearRows[y] = {
            top: nextRow,
          };
          if (y !== FUTURE) insertText ({
            className: 'year-header',
            element: 'sw-data-year',
            format: 'yearHeader',
            value: y,
            left: 0,
            top: yearRows[y].top,
            width: rowHeaderWidth,
            height: rowHeaderHeight,
          });
          lastYear = y;
          lastYearRow = nextRow;

          insertedYears[y].forEach (c => {
            if (c.selected) {
              if (c.era.known_oldest_year != null) {
                insertYearNumber (c, c.era.known_oldest_year);
              }
              var endYear = c.era.end_year;
              if (c.era.start_year != null) {
                insertYearNumber (c, c.era.start_year);
              }
              if (c.end_year != null) {
                insertYearNumber (c, c.end_year);
              }
              if (c.known_latest_year != null) {
                insertYearNumber (c, c.known_latest_year);
              }
              if (c.yearNumbers[c.era.known_oldest_year] &&
                  c.yearNumbers[c.known_latest_year]) {
                insertLine ({
                  start: [c.column.hCenter,
                          c.yearNumbers[c.era.known_oldest_year].vCenter],
                  end: [c.column.hCenter,
                        c.yearNumbers[c.known_latest_year].vCenter],
                  className: 'era-line era-known-line',
                  layer: 'era-lines',
                });
                if (c.known_latest_year == lastYear &&
                    c.known_latest_year !== c.end_year) {
                  c.lineStartY = c.yearNumbers[c.known_latest_year].vCenter;
                }
              }
              if (c.yearNumbers[c.era.start_year] &&
                  c.yearNumbers[c.end_year]) {
                insertLine ({
                  start: [c.column.hCenter,
                          c.yearNumbers[c.era.start_year].vCenter],
                  end: [c.column.hCenter, c.yearNumbers[c.end_year].vCenter],
                  className: 'era-line era-range-line',
                  layer: 'era-lines',
                });
                if (c.end_year == lastYear &&
                    c.known_latest_year === c.end_year) {
                  c.lineStartY = c.yearNumbers[c.end_year].vCenter;
                }
              }
            } // c.selected
          });
        });
      }; // insertYearHeader

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
          } else if (col.bottom + yearBoundaryMarginBottom/*abused!*/ + eraHeaderHeight < nextRow) {
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
      }; // assignColumn
      
      var years = Object.keys (yearTrs).sort ((a,b) => a-b);
      for (var i = 0; i < years.length; i++) {
        if ((i % 30) === 1) {
          await new Promise (ok => setTimeout (ok, 100));
        }
        var year = years[i];
        var ehs = {};
        yearTrs[year].forEach (tr => {
          var cs = Object.keys (tr.prev_era_ids || {}).sort ((a,b) => a-b)
              .concat (Object.keys (tr.relevant_era_ids).sort ((a,b) => a-b))
              .map (id => eraStates[id]);
          cs.forEach (c => {
            if (c.headerAdded) return;

            assignColumn (c, cs);
            if (c.selected &&
                c.era.known_oldest_year != null &&
                c.era.known_oldest_year < year) {
              insertYearNumber (c, c.era.known_oldest_year);
              insertEraHeader (c, c.era.known_oldest_year);
            } else {
              ehs[c.era.id] = true;
            }
            activeEraStates.push (c);
            
            c.headerAdded = true;
          }); // c
        });
        insertYearHeader (year);
        var needYNHeight = false;
        yearTrs[year].forEach (tr => {
          var ynInserted = false;
          Object.keys (tr.relevant_era_ids).forEach (id => {
            var c = eraStates[id];
            ynInserted = insertYearNumber (c, year) || ynInserted;
            if (ehs[id]) insertEraHeader (c, year);
            delete ehs[id];
          });

          var lines = [];
          Object.keys (tr.prev_era_ids || {}).forEach (pid => {
            var pc = eraStates[pid];
            var x1 = pc.column.hCenter;
            Object.keys (tr.next_era_ids || {}).forEach (nid => {
              var nc = eraStates[nid];
              var x2 = nc.column.hCenter;
              lines.push ([x1, x2, pc, nc]);
            });
          });
          if (ynInserted) needYNHeight = true;
          if (!lines.length) return;
          
          var y = nextRow;
          if (!ynInserted || lines.length * arrowHeight > yearNumberHeight) {
            //
          } else {
            y = nextRow + (yearNumberHeight - lines.length * arrowHeight) / 2;
          }
          lines.forEach (_ => {
            _[4] = y + arrowHeight/2;
            y += arrowHeight;
            _[2].bottom = y;
            _[3].bottom = y;
            insertLine ({
              start: [_[0], _[4]],
              end: [_[1], _[4]],
              margin: arrowMargin,
              className: 'era-transition',
              lineType: tr.type,
              layer: 'era-transitions',
            });
          }); // lines
          if (ynInserted && nextRow + yearNumberHeight > y) {
            nextRow += yearNumberHeight;
          } else {
            nextRow = y;
          }
          needYNHeight = false;
        }); // trs
        if (needYNHeight) nextRow += yearNumberHeight;
      } // year
      insertYearHeader (FUTURE);
      nextRow += yearNumberHeight; // sometimes more than required

      nextColumn += columnWidth;
      yearBoundaries.forEach (y => {
        insertLine ({
          start: [0, y],
          end: [nextColumn, y],
          className: 'year-boundary',
          layer: 'year-boundaries',
        });
      });

      svg.setAttribute ('width', nextColumn);
      svg.setAttribute ('height', nextRow);

      this.textContent = '';
      this.appendChild (svg);
    }, // pcInit
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
