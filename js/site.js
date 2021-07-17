
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
      });
    }, // swUpdate
  },
}); // <section is=sw-page-main>

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
      this.hidden = ! this.value;
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
        args.format = this.getAttribute ('format');
      }
      
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
      var ts = await $getTemplateSet (this.localName);
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
  if (!ref) ref = 2000;
  
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
  
  var years = [];
  for (var i = ref; i < ref + limit; i++) {
    years.push ({year: i, eraId});
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
    return Object.values (eras).sort ((a, b) => a.id-b.id);
  }).then (eras => {
    return {data: eras};
  });
});

defineListLoader ('swTransitionListLoader', async function (opts) {
  var eraId = this.getAttribute ('loader-eraid');
  var era = await SWD.era (eraId);
  if (!era) throw new Error ("Era not found: " + eraId);

  var items = era.transitions;

  var year = parseFloat (this.getAttribute ('loader-year'));
  if (Number.isFinite (year)) {
    // XXX primary calendar
    items = items.filter (_ => {
      var d = _.day || _.day_start
      var m = (d.nongli_tiger || d.kyuureki || d.gregorian).match (/^(-?[0-9]+)/);
      var y = parseFloat (m[1]);
      return y === year;
    });
  }

  items.forEach (_ => {
    _.type2 = _.type.replace (/\//g, '-');
    _.neighbors = {
      year: year,
      prev_era_ids: _.prev_era_ids,
      next_era_ids: _.next_era_ids,
    };

    _.day_hidden = _.day ? null : '';
    _.day_range_hidden = _.day_start ? null : '';
  });

  return {data: items};
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
      Object.keys (v.prev_era_ids || {}).forEach (_ => {
        items.push ({year: v.year, era_id: _, direction: 'prev'});
      });
      Object.keys (v.next_era_ids || {}).forEach (_ => {
        items.push ({year: v.year, era_id: _, direction: 'next'});
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
      Object.defineProperty (this, 'value', {
        get: function () {
          return vals;
        },
        set: function (newVals) {
          vals = newVals;
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
