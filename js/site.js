
var SWD = {
  _load: {},
  _cached: {},
};

SWD.isReload = location.search === "?reload";
SWD.isLocal = !! location.hostname.match (/local/);

SWD.Env = {workerMethodCode: [], workerMethodSI: [],
           workerMethodPostprocessor: [],
           workerMethodHandleOtherValues: []};
SWD.Env.isWorker = !self.document;

var defs = function (code) {
  code ();
};

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

var defineWorkerMethod = (name, toSerializableInput, workerCode, opts) => {
  SWD.Env.workerMethodSI[name] = toSerializableInput;
  if (opts) {
    SWD.Env.workerMethodHandleOtherValues[name] = opts.handleOtherValues; // or undefined
  }
};

var hasWorkerMethod = (name, code) => {
  return function () {
    var self = this;
    var args = arguments;
    return SWD.Env.startWorker ().then (() => {
      return SWD.Env.workerMethodSI[name].apply (self, args);
    }).then (args => {
      var mc = new MessageChannel ();
      SWD.Env._workerPort.postMessage ({
        type: 'method',
        name,
        args,
      }, [mc.port2]);
      return new Promise ((ok, ng) => {
        mc.port1.onmessage = async ev => {
          if (ev.data.type === 'return') {
            if (ev.data.otherValues) {
              var ho = SWD.Env.workerMethodHandleOtherValues[name];
              if (!ho) throw new Error ('handleOtherValues for |'+name+'| is not defined');
              ho (args, ev.data.otherValues);
            }
            ok (ev.data.value);
          } else if (ev.data.type === 'error') {
            ng (ev.data.value);
          } else {
            console.log (ev);
            ng (new Error ("Unknown method return message"));
          }
          mc.port1.close ();
        };
      });
    });
  };
};

if (SWD.Env.isWorker) {
  defs = defineElement = defineListLoader = () => {};
  addEventListener ('message', ev => {
    if (ev.data.type === 'init') {
      ev.ports[0].onmessage = ev => {
        if (ev.data.type === 'method') {
          Promise.resolve ().then (() => {
            return SWD.Env.workerMethodCode[ev.data.name].apply (null, ev.data.args);
          }).then (async rv => {
            var sCode = SWD.Env.workerMethodPostprocessor[ev.data.name];
            if (sCode) {
              var {value, otherValues} = await sCode (ev.data.args, rv);
              ev.ports[0].postMessage ({type: 'return', value, otherValues});
            } else {
              ev.ports[0].postMessage ({type: 'return', value: rv});
            }
          }, e => {
            ev.ports[0].postMessage ({type: 'error', value: e});
          });
        } else {
          console.log (ev);
          throw new Error ("Unknown message received: " + ev.data.type);
        }
      }
      ev.ports[0].postMessage ({type: 'init'});
    } else {
      console.log ("message" , ev);
      throw new Error ("Unknown message received: " + ev.data.type);
    }
  });

  defineWorkerMethod = (name, toSerializableInput, workerCode, opts) => {
    SWD.Env.workerMethodCode[name] = workerCode;
    if (opts) {
      SWD.Env.workerMethodPostprocessor[name] = opts.postprocessor; // or undefined
    }
  };

  hasWorkerMethod = (name, code) => code;
}

SWD.Env.startWorker = function () {
  if (this._swP) return this._swP;
  var name = 'swdEnvWorker';
  if (SWD.isReload) name += '?reload';

  var start = (w, to) => {
    return new Promise ((ok, ng) => {
      var timer;
      if (to) timer = setTimeout (ng, 300);

      var url = '/js/site.js';
      if (SWD.isReload) url += '?reload';
      this._worker = new w (url, {name});
      this._worker.onerror = ng;
      
      var m = new MessageChannel ();
      this._worker.postMessage ({type: 'init'}, [m.port2]);
      m.port1.onmessage = ev => {
        clearTimeout (timer);
        if (ev.data.type === 'init') {
          ok ();
        } else {
          console.log (ev);
        }
      };
      this._workerPort = m.port1;
    });
  }; // start
  
  this._swP = start (self.SharedWorker || self.Worker, true).catch (() => {
    console.log ("new SharedWorker failed; Retry with dedicated Worker");
    return start (self.Worker, false);
  });

  return this._swP;
}; // SWD.Env.startWorker

SWD._dataRes = function (name, opts) {
  var url = '/data/' + name;
  var gzipped = false;
  if (!SWD.isLocal && /^charrels/.test (name)) {
    url = 'https://manakai.github.io/data-chars/local/generated/' + name + '.gz';
    gzipped = true;
  } else if (opts.dsKey) {
    if (SWD.isLocal) {
      url = '/data/charrels/' + opts.dsKey + '/' + name;
    } else {
      url = 'https://manakai.github.io/data-chars/local/generated/charrels/' + opts.dsKey + '/' + name;
    }
  }

  if (SWD._load[url]) return SWD._load[url];
  
  return SWD._load[url] = fetch (url, {
    cache: (SWD.isReload ? 'reload' : undefined),
  }).then (async res => {
    if (res.status !== 200) {
      if (res.status === 404 && opts.allow404) {
        return {};
      } else {
        throw res;
      }
    }
    if (gzipped) {
      var ds = new DecompressionStream ('gzip');
      var rs = res.body.pipeThrough (ds);
      var reader = rs.getReader ();
      var values = [];
      while (true) {
        var {value, done} = await reader.read ();
        if (done) break;
        values.push (value);
      }
      var blob = new Blob (values);
      if (opts.type === 'json') {
        return blob.text ().then (text => JSON.parse (text));
      } else if (opts.type === 'jsonlKeyed') {
        return res.text ().then (text => {
          var obj = {};
          text.split (/\n/).forEach (line => {
            if (line) {
              var json = JSON.parse (line);
              obj[json[0]] = json[1];
            }
          });
          return obj;
        });
      } else if (opts.type === 'jsonlLined') {
        return res.text ().then (text => {
          return text.split (/\n/).map (line => {
            if (line) return JSON.parse (line);
          });
        });
      } else if (opts.type === 'arrayBuffer') {
        return blob.arrayBuffer ();
      } else {
        throw opts.type;
      }
    } else {
      if (opts.type === 'json') {
        return res.json ();
      } else if (opts.type === 'jsonlKeyed') {
        return res.text ().then (text => {
          var obj = {};
          text.split (/\n/).forEach (line => {
            if (line) {
              var json = JSON.parse (line);
              obj[json[0]] = json[1];
            }
          });
          return obj;
        });
      } else if (opts.type === 'jsonlLined') {
        return res.text ().then (text => {
          return text.split (/\n/).map (line => {
            if (line) return JSON.parse (line);
          });
        });
      } else if (opts.type === 'arrayBuffer') {
        return res.arrayBuffer ();
      } else {
        throw opts.type;
      }
    }
  });
}; // SWD._dataRes

SWD.data = function (name, opts) {
  return SWD._dataRes (name, {type: 'json', ...opts});
}; // SWD.data

SWD.dataAB = function (name, opts) {
  return SWD._dataRes (name, {...opts, type: 'arrayBuffer'});
}; // SWD.dataAB

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
      557 : 'BE rho',
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

SWD.eraLabelSets = async function (id) {
  if (!SWD._eraLabels) {
    SWD._eraLabels = SWD.data ('calendar-era-labels.json');
  }

  var all = await SWD._eraLabels;
  var era = all.eras[id] || {};
  return era.label_sets || {};
}; // SWD.eraLabelSets

SWD.relatedEras = async function (id) {
  if (!SWD._eraRelations) {
    SWD._eraRelations = SWD.data ('calendar-era-relations.json');
  }

  var all = await SWD._eraRelations;
  var era = all.eras[id] || {};
  return era.relateds || {};
}; // SWD.relatedEras

SWD.canonEra = async function (id) {
  var relateds = await SWD.relatedEras (id);
  var rids = Object.keys (relateds);
  for (var i = 0; i < rids.length; i++) {
    if (relateds[rids[i]].cognate_canon) {
      return await SWD.era (rids[i]);
    }
  }
  return null;
}; // SWD.canonEra

SWD._geoObjectDefs = {
  macroregions: {
    id: 'macroregions', fileName: 'macroregions.json',
    name: '地域',
    keys: {name: ['ja_name', 'en_name']},
    getIds: x => Object.keys (x.areas),
    getGetGoById: (x, y) => x.areas[y],
    mapZoom: 1,
    mainProps: [
      {
        key: 'code',
        name: 'UN M.49 符号',
      },
    ],
  },
  countries: {
    id: 'countries', fileName: 'countries.json',
    name: '国',
    keys: {
      name: ['ja_name', 'en_name'],
      short_name: ['ja_short_name', 'en_short_name'],
    },
    getIds: x => Object.keys (x.areas),
    getGetGoById: (x, y) => x.areas[y],
    mainProps: [
      {
        key: 'code',
        name: 'ISO 3166-1 2文字国符号',
      },
      {
        key: 'code3',
        name: 'ISO 3166-1 3文字国符号',
      },
      {
        key: 'iso3166_numeric',
        name: 'ISO 3166-1 3桁国符号',
      },
      {
        key: 'stanag',
        name: 'GEC 国符号',
      },
      {
        key: 'stanag',
        name: 'STANAG 国符号',
      },
    ],
    link_props: [
      {
        key: 'wref_ja',
        name: 'Wikipedia (日)',
        wikipedia: 'ja',
      },
      {
        key: 'wref_en',
        name: 'Wikipedia (英)',
        wikipedia: 'en',
      },
      {
        key: 'mofa_area_url',
        name: '外務省各国・地域情勢',
      },
      {
        key: 'mofa_anzen_url',
        name: '外務省海外安全情報',
      },
      {
        key: 'world_factbook_url',
        name: 'The World Factbook',
      },
    ],
  },
  'jp-regions': {
    id: 'jp-regions', fileName: 'jp-regions-full-flatten.json',
    name: '日本の地方自治体',
    keys: {
      name: ['name'],
      kanaName: ['kana'],
      enName: ['latin'],
      position: ['position', 'office'],
    },
    getIds: x => Object.keys (x.regions),
    getGetGoById: (x, y) => x.regions[y],
    mainProps: [
      {
        key: 'code',
        name: '全国地方公共団体コード',
      },
    ],
    linkProps: [
      {
        key: 'wref',
        name: 'Wikipedia',
        wikipedia: 'ja',
      },
      {
        key: 'url',
        name: 'Web サイト',
      },
    ],
  },
}; // SWD._geoObjectDefs

SWD.geoObject = async function (type, id) {
  var def = SWD._geoObjectDefs[type];
  if (!def) return null;

  var json = await SWD.data (def.fileName);
  var data = def.getGetGoById (json, id);
  if (!data) return null;

  return new SWDGeoObject (def, type, id, data);
}; // SWD.geoObject

SWD.geoObjectList = async function (type) {
  var def = SWD._geoObjectDefs[type];
  if (!def) return null;

  var json = await SWD.data (def.fileName);
  return def.getIds (json).map (id => {
    var data = def.getGetGoById (json, id);
    return new SWDGeoObject (def, type, id, data);
  });
}; // SWD.geoObjectList

function SWDGeoObject (def, type, id, data) {
  this.goDef = def;
  this.goType = type;
  this.goId = id;
  this._data = data;
}

SWDGeoObject.prototype.getPropValue = function (propName) {
  var names = this.goDef.keys[propName] || [propName];
  for (var i = 0; i < names.length; i++) {
    if (this._data[names[i]] != null) {
      return this._data[names[i]];
    }
  }
  return null;
}; // getPropValue

Object.defineProperty (SWDGeoObject.prototype, 'name', {
  get: function () {
    if (this._name !== undefined) return this._name;
    return this._name = this.getPropValue ('name');
  },
});
Object.defineProperty (SWDGeoObject.prototype, 'kanaName', {
  get: function () {
    return this.getPropValue ('kanaName');
  },
});
Object.defineProperty (SWDGeoObject.prototype, 'enName', {
  get: function () {
    return this.getPropValue ('enName');
  },
});

SWDGeoObject.prototype._latlon = function () {
  if (this._ll !== undefined) return this._ll;

  var latlon = this.getPropValue ('position');
  if (latlon == null) {
    return this._ll = null;
  } else if (typeof latlon === 'object') {
    return this._ll = latlon.position || null;
  } else {
    return this._ll = latlon;
  }
}; // _latlon

Object.defineProperty (SWDGeoObject.prototype, 'lat', {
  get: function () {
    var ll = this._latlon ();
    if (ll) return ll[0];
    return null;
  },
});
Object.defineProperty (SWDGeoObject.prototype, 'lon', {
  get: function () {
    var ll = this._latlon ();
    if (ll) return ll[1];
    return null;
  },
});

Object.defineProperty (SWDGeoObject.prototype, 'swName', {
  get: function () {
    return this.getPropValue ('name');
  },
});



SWD.tag = async function (id) {
  var tags = await SWD.tagsByIds ([id]);
  return tags[0]; // or undefined
};

SWD.tagsByIds = async function (ids) {
  var tags = (await SWD.data ('tags.json')).tags;
  return ids.map (_ => tags[_]);
}; // SWD.tagsByIds

var mod = (n, m) => ((n%m) + m) % m;

SWD.openPage = function (url) {
  return Promise.resolve ().then (async () => {
    var args = {};
    var path = url.pathname;

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
          if (args.era) {
            args.name = 'page-era-item-index';
            args.canonEra = await SWD.canonEra (args.era.id);
          }
          return args;
        }

        // /e/{}/graph
        // /e/{}/kanshi
        var m = path.match (/^\/e\/([0-9]+)\/(graph|kanshi)$/);
        if (m) {
          args.eraId = parseFloat (m[1]);
          args.era = await SWD.era (args.eraId);
          if (args.era) {
            args.name = 'page-era-item-' + m[2];
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
            args.eraSequenceSpecifications = Array.prototype.slice.call (url.searchParams.getAll ('sequence')).join (' ');
          }
          return args;
        }

    if (/^\/spots\//.test (path)) {
      args.site = 'world';
    }

    // /spots/{type}/{id}
    var m = path.match (/^\/spots\/([a-z0-9-]+)\/([1-9][0-9]*)$/);
    if (m) {
      args.geoObject = await SWD.geoObject (m[1], m[2]);
      if (args.geoObject) {
        args.name = 'page-geoobject-item-item';
        return args;
      }
    }
    // /spots/{type}
    var m = path.match (/^\/spots\/([a-z0-9-]+)$/);
    if (m) {
      args.geoObjectList = await SWD.geoObjectList (m[1]);
      if (args.geoObjectList) {
        args.name = 'page-geoobject-item';
        return args;
      }
    }

    // //ANTENNA/{}/{}
    var m = path.match (/^\/(web|radio|houses)\/([0-9]+)-([0-9]+)-([0-9]+)$/);
    if (m) {
      args.name = 'page-antenna-item-day';
      args.antennaCategory = await SWD.antennaCategory (m[1]);
      args.antennaDay = Date.UTC (m[2], m[3] - 1, m[4], 0, 0, 0) / 1000;
      args.site = 'antenna';

      if (args.antennaCategory.isSensitive) args.isSensitive = true;
      var data = await SWD.antennaDayList (args.antennaCategory.type, args.antennaDay * 1000);
      if (!data.data.length) args.isEmpty = true;

      return args;
    }
    // //ANTENNA/{}/
    var m = path.match (/^\/(web|radio|houses)\/$/);
    if (m) {
      args.name = 'page-antenna-item-day';
      args.antennaCategory = await SWD.antennaCategory (m[1]);
      var d = new Date;
      args.antennaDay = Date.UTC (d.getFullYear (), d.getMonth (), d.getDate () - 1, 0, 0, 0) / 1000;
      args.site = 'antenna';

      if (args.antennaCategory.isSensitive) args.isSensitive = true;
      var data = await SWD.antennaDayList (args.antennaCategory.type, args.antennaDay * 1000);
      if (!data.data.length) args.isEmpty = true;
      
      return args;
    }

    var m = path.match (/^\/radio\/p\/([A-Za-z0-9_-]+)$/);
    if (m) {
      args.radioProgram = await SWD.radioProgram (m[1]);
      args.antennaCategory = await SWD.antennaCategory ('radio');
      if (args.radioProgram) {
        args.name = 'page-antenna-radio-program-item';
        args.site = 'antenna';
        return args;
      }
    }

    var m = path.match (/^\/char\/([0-9A-Fa-f]{4,8})$/);
    if (m) { // /char/{code}
      args.char = SWD.char ('unicode', parseInt (m[1], 16));
      args.name = 'page-char-index';
      args.site = 'chars';
      args.isSensitive = args.char.isSensitive;
      return args;
    }
    var m = path.match (/^\/char\/([0-9A-Fa-f]{4,6}(?::[0-9A-Fa-f]{4,6})+)$/);
    if (m) { // /char/{code}:{code}:...:{code}
      args.char = SWD.char ('text', m[1].split (/:/).map (_ => String.fromCodePoint (parseInt (_, 16))).join (''));
      args.name = 'page-char-index';
      args.site = 'chars';
      args.isSensitive = args.char.isSensitive;
      return args;
    }
    var m = path.match (/^\/char\/char:([^/]+)$/);
    if (m) { // /char/char:{char}
      try {
        args.char = SWD.char ('char', decodeURIComponent (m[1]));
        args.name = 'page-char-index';
        args.site = 'chars';
        args.isSensitive = args.char.isSensitive;
        return args;
      } catch (e) { }
    }

    // XXX /char/{name}
    // XXX /string

    if (path === '/char/routes') {
      args.char1 = SWD.char ('char', url.searchParams.get ('char1') || '');
      args.char2 = SWD.char ('char', url.searchParams.get ('char2') || '');
      args.chars = [args.char1, args.char2];
      args.name = 'page-char-routes';
      args.site = 'chars';
      args.isSensitive = args.char1.isSensitive || args.char2.isSensitive;
      return args;
    }

    args.name = {
      '/y/': 'page-year-index',
      '/y/determination': 'page-year-determination',
      '/e/': 'page-era-index',
      '/e/first': 'page-era-first',
    }[path]; // or undefined
    if (args.name) return args;
    
    if (path === '/world') {
      args.name = 'page-world';
      args.site = 'world';
      return args;
    }
    if (path === '/chars') {
      args.name = 'page-chars';
      args.site = 'chars';
      return args;
    }
    if (path === '/antenna') {
      args.name = 'page-antenna';
      args.site = 'antenna';
      return args;
    }

    args.name = {
      '/': 'page-index',
      '/about': 'page-about',
      '/license': 'page-license',
    }[path]; // or undefined

    if (path === '/') {
      if (location.hostname === 'world.suikawiki.org') {
        args.name = 'page-world';
      } else if (location.hostname === 'chars.suikawiki.org') {
        args.name = 'page-chars';
      } else if (location.hostname === 'ja.chars.suikawiki.org') {
        args.name = 'page-chars';
      } else if (location.hostname === 'en.chars.suikawiki.org') {
        args.name = 'page-chars';
      } else if (location.hostname === 'antenna.suikawiki.org') {
        args.name = 'page-antenna';
      }
    }

    if (!args.site) {
      args.site = {
        'antenna.suikawiki.org': 'antenna',
        'chars.suikawiki.org': 'chars',
        'en.chars.suikawiki.org': 'chars',
        'ja.chars.suikawiki.org': 'chars',
        'world.suikawiki.org': 'world',
      }[location.hostname];
    }

    if (!args.name) args.isEmpty = true;

    return args;
  }).then (async args => {
    var ma = document.querySelector ('page-area[template=pageMainTemplate]');
    await ma.ready;
    ma.swArgs = args;
    var mx = args.mx = ma.swUpdate ();
    var title;
    var mxEls = {'t-title': mx['t-title'], 't-category': mx['t-category']};
    var updateTitle = () => {
      title = (mxEls['t-title'] || {textContent: ''}).textContent;
      document.title = [
        title,
        (mxEls['t-category'] || {textContent: ''}).textContent,
        'SuikaWiki',
      ].filter (_ => _.length).join (' - ');
    };
    updateTitle ();
    var pp = [];
    document.querySelectorAll ('page-area').forEach (_ => {
      var t = _.getAttribute ('template');
      if (t === 'pageMainTemplate') {
        //
      } else if (t === 'pageHeaderTemplate') {
        _.swArgs = args;
        pp.push (_.ready.then (() => {
          _.swUpdate ();
          _.querySelectorAll ('[data-html]').forEach (_ => {
            var k = _.getAttribute ('data-html');
            if (mx[k]) {
              while (mx[k].firstChild) {
                _.appendChild (mx[k].firstChild);
              }
              mxEls[k] = _;
            }
          });
        }));
      } else {
        _.ready.then (() => {
          _.swArgs = args;
          _.swUpdate ();
        });
      }
    });
    document.body.classList.toggle ('has-large', !!args.hasLargeContent);
    Promise.all (pp).then (() => {
      if (mxEls['t-title']) new MutationObserver (function (mutations) {
        updateTitle ();
      }).observe (mxEls['t-title'], {childList: true, subtree: true});
    });

    var obj = {};
    var x = mx['t-sw'] ? 'https://wiki.suikawiki.org/n/' + encodeURIComponent (mx['t-sw'].textContent) : '';
    if (x) obj.swHref = x;
    document.querySelectorAll ('.content-links').forEach (_ => {
      _.hidden = ! obj.swHref;
      $fill (_, obj);
    });
    document.querySelectorAll ('nav[is=sw-page-breadcrumbs]').forEach (_ => {
      _.value = args.geoObject;
    });
    document.querySelectorAll ('nav[is=sw-page-pager]').forEach (_ => {
      _.value = args;
    });
    document.querySelectorAll ('.search-form input[data-field=searchText]').forEach (_ => {
      _.value = (mx['t-keyword'] || {textContent: title}).textContent;
    });

    var obj = {};
    obj.siteShortLabel = {
      'world': 'World.',
      'antenna': 'Antenna.',
      'chars': 'Chars.',
    }[args.site];
    if (!obj.siteShortLabel) obj.siteShortLabel = 'Data.';
    obj.siteLabel = obj.siteShortLabel + 'SuikaWiki.org';
    document.querySelectorAll ('header.site, footer.site').forEach (_ => {
      $fill (_, obj);
    });
    document.documentElement.setAttribute ('data-site', args.site || 'data');
  });
}; // SWD.openPage

defineElement ({
  name: 'page-area',
  templateSet: true,
  props: {
    pcInit: function () {
      var ok;
      this.ready = new Promise ((x, y) => ok = x);
      this.addEventListener ('pctemplatesetupdated', (ev) => {
        this.swTemplateSet = ev.pcTemplateSet;
        this.swUpdate ();
        ok ();
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: function () {
      if (!this.swTemplateSet) return;
      if (!this.swArgs) return;

      var e = this.swTemplateSet.createFromTemplate ('div', this.swArgs);
      this.textContent = '';
      while (e.firstChild) {
        if (/^t-/.test (e.firstChild.localName)) {
          e[e.firstChild.localName] = e.firstChild;
          e.firstChild.remove ();
        } else {
          this.appendChild (e.firstChild);
        }
      }

      this.querySelectorAll ('list-container[loader=swGOPropListLoader]').forEach (_ => _.swGeoObject = this.swArgs.geoObject);
      this.querySelectorAll ('list-container[loader=swGOListLoader]').forEach (_ => _.swGeoObjectList = this.swArgs.geoObjectList);

      return e;
    }, // swUpdate
  },
}); // <page-area>

defineElement ({
  name: 'page-ready',
  props: {
    pcInit: function () {
      var url = new window.URL (location.href);
      return SWD.openPage (url);
    },
  },
});

defs (() => {

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'selectPageTemplate');
  def.pcHandler = function (templates, obj) {
    if (templates[obj.name]) return templates[obj.name];
    return templates[""];
  };
  document.head.appendChild (def);

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'selectAdsTemplate');
  def.pcHandler = function (templates, obj) {
    if (obj.isEmpty || obj.isSensitive) {
      return templates[""];
    } else {
      return templates.primary;
    }
  };
  document.head.appendChild (def);
  
});

defineElement ({
  name: 'nav',
  is: 'sw-page-breadcrumbs',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: () => v,
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      setTimeout (() => this.swUpdate (), 0);
    }, // pcInit
    swUpdate: async function () {
      var go = this.value;
      this.hidden = ! go;
      if (!go) return;
      
      var goDef = go.goDef;
      var items = [];
      if (goDef.id === 'countries' || goDef.id === 'macroregions') {
        var region = await (goDef.id === 'countries' ? SWD.geoObject ('macroregions', go.getPropValue ('submacroregion') || 1) : go);

        var sups = region.getPropValue ('superregions') || {};
        var superRegionPs = Object.keys (sups).sort ((a, b) => sups[b] - sups[a]).map (_ => SWD.geoObject ('macroregions', _));
        for (var i = 0; i < superRegionPs.length; i++) {
          var superRegion = await superRegionPs[i];
          items.push (['/spots/macroregions/' + superRegion.goId,
                       superRegion.name]);
        }
        if (goDef.id === 'countries') {
          items.push (['/spots/'+region.goType+'/' + region.goId,
                       region.name]);
        }
      } else if (goDef.id === 'jp-regions') {
        items.push (['/spots/macroregions/1', '世界']);
        items.push (['/spots/countries/57', '日本国']);
        var keys = ['pref_id', 'city_id', 'district_id'];
        for (var i = 0; i < keys.length; i++) {
          var id = go.getPropValue (keys[i]);
          if (!id) continue;
          var aGo = await SWD.geoObject ('jp-regions', id);
          if (!aGo) continue;
          items.push (['/spots/jp-regions/' + aGo.goId, aGo.name]);
        }
      }
      items.push (['', go.name]);
      
      this.textContent = '';
      var p = document.createElement ('p');
      var last = items.pop ();
      items.forEach (item => {
        var a = document.createElement ('a');
        a.href = item[0];
        a.textContent = item[1];
        p.appendChild (a);
        p.appendChild (document.createTextNode (' > '));
      });
      {
        var a = document.createElement ('a');
        a.href = last[0];
        a.textContent = last[1];
        p.appendChild (a);
      }
      this.appendChild (p);
    }, // swUpdate
  },
}); // <nav is=sw-page-breadcrumbs>

defineElement ({
  name: 'nav',
  is: 'sw-page-pager',
  //fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: () => v,
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      setTimeout (() => this.swUpdate (), 0);
    }, // pcInit
    swUpdate: async function () {
      var args = this.value || {};
      var day = args.antennaDay;
      this.hidden = ! day;
      if (!day) return;

      var prev = new Date (day*1000 - 24*60*60*1000);
      var next = new Date (day*1000 + 24*60*60*1000);

      var prevURL = prev.toISOString ().replace (/T.*$/, '');
      var nextURL = next.toISOString ().replace (/T.*$/, '');

      $fill (this, {prevURL, nextURL});
    }, // swUpdate
  },
}); // <nav is=sw-page-pager>
      

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

defs (() => {

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'selectBooleanTemplate');
  def.pcHandler = function (templates, obj) {
    return templates[obj.class + '-' + obj.name] || templates[obj.name] || templates[""];
  };
  document.head.appendChild (def);
  
});

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

/* ------ Characters ------ */

SWD.Char = function () {};

SWD.Char.hex4 = function (n) {
  var hex = n.toString (16).toUpperCase ();
  if (hex.length < 4) {
    hex = ('000' + hex).substr (-4);
  }
  return hex;
}; // SWD.Char.hex4

SWD.Char.uplus = function (n) {
  var hex = n.toString (16).toUpperCase ();
  if (hex.length < 4) {
    hex = ('000' + hex).substr (-4);
  }
  return 'U+' + hex;
}; // SWD.Char.uplus

Object.defineProperty (SWD.Char.prototype, 'text', {
  get: function () {
    if (this.type === 'unicode') {
      return String.fromCodePoint (this.unicode);
    } else if (this.type === 'vs') {
      return String.fromCodePoint (this.unicode) +
             String.fromCodePoint (this.unicode2);
    } else if (this.type === 'string') {
      return this.string;
    } else {
      return null;
    }
  },
}); // char.text

Object.defineProperty (SWD.Char.prototype, 'uplus', {
  get: function () {
    if (this.type === 'unicode') {
      return SWD.Char.uplus (this.unicode);
    } else if (this.type === 'vs') {
      return '<' + SWD.Char.uplus (this.unicode) + ', ' + SWD.Char.uplus (this.unicode2) + '>';
    } else if (this.type === 'string') {
      return '<' + [...this.string].map (_ => SWD.Char.uplus (_.codePointAt (0))).join (', ') + '>';
    } else if (this.type === 'char') {
      var m = this._char.match (/^:u-([a-z]+)-([0-9a-f]+)$/);
      if (m) {
        return SWD.Char.uplus (m[2]);
      }
    }

    return null;
  },
}); // char.uplus

Object.defineProperty (SWD.Char.prototype, 'mj', {
  get: function () {
    if (this.type === 'char') {
      var m = this._char.match (/^:(MJ[0-9]+)$/);
      if (m) return m[1];
    }

    return null;
  },
}); // char.mj

Object.defineProperty (SWD.Char.prototype, 'mjGlyphName', {
  get: function () {
    if (this.type === 'char') {
      var m = this._char.match (/^:MJ([0-9]+)$/);
      if (m) {
        return 'mj' + m[1];
      }
    }

    return null;
  },
}); // char.mjGlyphName

Object.defineProperty (SWD.Char.prototype, 'mkt', {
  get: function () {
    if (this.type === 'char') {
      var m = this._char.match (/^:(?:cns|cnsold|gb|jis|ks|kps|cccii)(?:-[a-z]+-|)([0-9]+-[0-9]+-[0-9]+)$/);
      if (m) return m[1];
    }

    return null;
  },
}); // char.mkt

Object.defineProperty (SWD.Char.prototype, 'cid', {
  get: function () {
    if (this.type === 'char') {
      var m = this._char.match (/^:(?:ac|ag|aj|ak|aj2-|ak1-)([0-9]+)$/);
      if (m) return m[1];
    }

    return null;
  },
}); // char.cid

Object.defineProperty (SWD.Char.prototype, 'cidFontKey', {
  get: function () {
    if (this.type === 'char') {
      var m = this._char.match (/^:(ac|ag|aj|ak|aj2-|ak1-)(?:[0-9]+)$/);
      if (m) return m[1];
    }

    return null;
  },
}); // char.cidFontKey

Object.defineProperty (SWD.Char.prototype, 'char', {
  get: function () {
    if (this.type === 'unicode' || this.type === 'vs') {
      var u = this.unicode;
      var s;
      if (u === 0x002E ||
          u === 0x003A ||
          (0x0000 <= u && u <= 0x001F) ||
          (0x007F <= u && u <= 0x009F) ||
          (0xD800 <= u && u <= 0xDFFF)) {
        //XXX noncharacter
        s = ':u' + u.toString (16);
      } else {
        s = String.fromCodePoint (u);
      }
      if (this.type === 'vs') {
        s += String.fromCodePoint (this.unicode2);
      }
      return s;
    } else if (this.type === 'char') {
      return this._char;
    } else if (this.type === 'string') {
      if (this.string[0] === "." || this.string[0] === ":") {
        // XXX surrogate
        return [...this.string].map (_ => ':u' + _.codePointAt (0).toString (16)).join ('');
      } else {
        return this.string;
      }
    } else {
      return null;
    }
  },
}); // char.char

Object.defineProperty (SWD.Char.prototype, 'url', {
  get: function () {
    if (this.type === 'unicode') {
      return '/char/' + SWD.Char.hex4 (this.unicode);
    } else if (this.type === 'vs') {
      return '/char/' + SWD.Char.hex4 (this.unicode) + ':' + SWD.Char.hex4 (this.unicode2);
    } else if (this.type === 'string') {
      // XXX surrogate, noncharacter
      return '/char/' + [...this.string].map (_ => SWD.Char.hex4 (_.codePointAt (0))).join (':');
    } else if (this.type === 'char') {
      return '/char/char:' + encodeURIComponent (this._char);
    } else {
      return null;
    }
  },
}); // char.url

SWD.Char.prototype._getNames = async function () {
  if (this.type === 'unicode') {
    var names = await SWD.data ('char-names.json');
    var c = names.code_to_name[SWD.Char.uplus (this.unicode)];
    return c || {};
  } else {
    return {name: this.char};
  }
}; // _getNames

Object.defineProperty (SWD.Char.prototype, 'isSensitive', {
  get: function () {
    if (this.type === 'unicode') {
      return false;
    } else if (this.type === 'char') {
      if (this._char.match (/^:[A-Za-z]+[0-9]+-[0-9]+-[0-9]+$/)) {
        return false;
      }
    }

    return true;
  },
}); // char.isSensitive

Object.defineProperty (SWD.Char.prototype, 'categoryURL', {
  get: function () {
    return 'https://chars.suikawiki.org';
  },
}); // char.categoryURL

Object.defineProperty (SWD.Char.prototype, 'categoryName', {
  get: function () {
    return {
      unicode: 'Unicode 符号点',
    }[this.type] || '文字';
  },
}); // char.categoryName

SWD.Char.prototype.applyDelta = function (delta) {
  var delta = parseInt (delta);
  if (Number.isFinite (delta)) {
    if (this.type === 'unicode') {
      var x = this.unicode + delta;
      if (0x0000 <= x && x <= 0x10FFFF) {
        return SWD.char ('unicode', x);
      } else {
        return null;
      }
    } else {
      return null;
    }
  } else {
    return this;
  }
}; // char.applyDelta

SWD.char = function (type, value) {
  if (type === 'unicode') {
    var c = new SWD.Char;
    if (0 <= value && value <= 0x10FFFF) {
      c.type = type;
      c.unicode = value;
      return c;
    } else if (value <= 0x7FFFFFFF) {
      type = 'char';
      value = ':u-old-' + value.toString (16);
    } else {
      type = 'char';
      value = ':c' + value;
    }
  }

  if (type === 'char') {
    if (value[0] === ':' || value[0] === '.') {
      //
    } else {
      type = 'text';
    }
  }

  if (type === 'text') {
    var c = new SWD.Char;
    if (value.length === 1 || [...value].length === 1) {
      c.type = 'unicode';
      c.unicode = value.codePointAt (0);
      return c;
    } else if (/^.[\u180B-\u180D\u180F\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/us.test (value)) {
      c.type = 'vs';
      [c.unicode, c.unicode2] = [...value].map (_ => _.codePointAt (0));
      return c;
    } else {
      c.type = 'string';
      c.string = value;
      return c;
    }
  }

  if (type === 'char') {
    var c = new SWD.Char;
    if (value.charAt (0) === ':') {
      var m = value.match (/^(?::u[1-9a-f][0-9a-f]{0,4}|:u10[0-9a-f]{4}|:u0)+$/);
      if (m) {
        var v = m[0].split (/:u/);
        v.shift ();
        c.string = v.map (_ => String.fromCodePoint (parseInt (_, 16))).join ('');
        if ([...c.string].length === 1) {
          c.type = 'unicode';
          c.unicode = c.string.codePointAt (0);
          delete c.string;
          return c;
        } else {
          c.type = 'string';
          return c;
        }
      }
    }

    c.type = 'char';
    c._char = value;
    return c;
  } else {
    throw type;
  }
}; // SWD.char

defineElement ({
  name: 'sw-data-charcode',
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
      if (this.hidden = v == null) return;

      var args = {};
      var type = this.getAttribute ('type');
      var template = this.localName;
      if (type === 'mkt') {
        var w = v.split (/-/);
        args.men = parseFloat (w[0]);
        args.ku = parseFloat (w[1]);
        args.ten = parseFloat (w[2]);
        args.gl = args.ku * 0x100 + args.ten + 0x2121;
        args.gr = args.gl + 0x8080;
        template += '-mkt';
      } else {
        args.code = v;
        args.hex = args.code.toString (16).toUpperCase ();
      }
      
      var ts = await $getTemplateSet (this.getAttribute ('template') || template);
      var e = ts.createFromTemplate ('div', args);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
      
    }, // swUpdate
  },
}); // <sw-data-charcode>

defineElement ({
  name: 'sw-data-char',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      var vt = this.getAttribute ('valuetype');
      if (vt) v = SWD.char (vt, v);
      Object.defineProperty (this, 'value', {
        get: function () {
          return v;
        },
        set: function (newValue) {
          v = newValue; // or null
          var vt = this.getAttribute ('valuetype');
          if (vt) v = SWD.char (vt, v);
          this.swUpdate ();
        },
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: async function () {
      var v = this.value;
      if (this.hidden = v == null) return;

      v = v.applyDelta (this.getAttribute ('delta'));
      if (!v) {
        this.hidden = true;
        return;
      }

      if (!v.names) v.names = await v._getNames ();

      var ts = await $getTemplateSet (this.getAttribute ('template') || this.localName);
      var e = ts.createFromTemplate ('div', v);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
      
    }, // swUpdate
  },
}); // <sw-data-char>

defs (() => {

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'swDataCharItemSelector');
  def.pcHandler = function (templates, obj) {
    if (obj.type === 'unicode' || obj.type === 'vs' ||
        obj.type === 'string') {
      return templates.text || templates[""];
    } else if (obj.type === 'char') {
      var char = obj.char;
      if (/^:MJ[0-9]+$/.test (char)) {
        return templates.mj || templates[""];
      } else if (/^:koseki90[01][0-9]{3}$/.test (char)) {
        return templates.kosekiKana || templates.touki || templates[""];
      } else if (/^:(?:J[ABCDEFT]|KS|TK)[0-9A-F]+S*$/.test (char)) {
        return templates.heisei || templates[""];
      } else if (/^:(?:koseki|touki|ninjal)[0-9]+$/.test (char)) {
        return templates.touki || templates[""];
      } else if (/^:(?:cns)[0-9]+-[0-9]+-[0-9]+$/.test (char)) {
        return templates.cns || templates[""];
      } else if (/^:(?:jis)[0-9]+-[0-9]+-[0-9]+$/.test (char)) {
        return templates.jis || templates[""];
      } else if (/^:(?:jis-[a-z][0-9a-z]*-)[12]-[0-9]+-[0-9]+$/.test (char)) {
        return templates.jisVariant || templates[""];
      } else if (/^:(?:ac|ag|aj|ak|aj2-|ak1-)[0-9]+$/.test (char)) {
        return templates.cid || templates[""];
      } else if (/:u-juki-[0-9a-f]+$/.test (char)) {
        return templates.juki || templates[""];
      } else if (/:u-[a-z]+-[0-9a-f]+$/.test (char)) {
        return templates.u || templates[""];
      } else if (/:b5-[0-9a-f]+$/.test (char)) {
        return templates.big5 || templates[""];
      } else if (/:b5-[a-z]+-[0-9a-f]+$/.test (char)) {
        return templates.big5 || templates[""];
      }
      //gb ks kps cnsold swc b5 cccii
    }
    
    return templates[""];
  };
  document.head.appendChild (def);

});

SWD.Char._relDataSets = {
  chars: {key: 'chars'},
  hans: {key: 'hans'},
  kanas: {key: 'kanas'},
  kchars: {key: 'kchars'},
  glyphs: {key: 'glyphs'},
};

//if (SWD.isLocal) SWD.Char._relDataSets.test1 = {key: 'test1'};

SWD.Char._relDataRoot = async function (ds) {
  ds.dataRoot = await SWD.data ('charrels/' + ds.key + '/tbl-index.json');

  var _eint = v => {
    var r = [];

    while (true) {
      var x = v & 0b00111111;
      v = v >> 6;
      if (v) {
        r.push (0b11000000 | x);
      } else {
        r.push (0b10000000 | x);
        break;
      }
    }

    return r;
  }; // _eint
  
  var prefixToEChar = {};
  var ecs = ds.dataRoot.echars;
  for (var i = 0; i < ecs.length; i++) {
    var ec = ecs[i];
    prefixToEChar[ec.prefix] = ec;
  }
  
  ds.nEncodeChar = c => {
    var m = c.match (/^:([0-9A-Za-z_-]+[A-Za-z_-])([0-9]+)$/);
    var ec = prefixToEChar[m && m[1]];
    if (ec && ec.type === 'dec') {
      return Uint8Array.from ([0, ec.byte].concat (_eint (m[2])));
    }
    var m = c.match (/^:([0-9A-Za-z_-]+-)([0-9a-f]{1,8})$/);
    var ec = prefixToEChar[m && m[1]];
    if (ec && ec.type === 'hex') {
      return Uint8Array.from ([0, ec.byte].concat (_eint (parseInt (m[2], 16))));
    }
    var m = c.match (/^:([A-Za-z0-9_-]+)-([1-9][0-9]*)-([1-9]|[1-8][0-9]|9[0-4])$/);
    var ec = prefixToEChar[m && m[1]];
    if (ec && ec.type === 'kt') {
      var v = (m[2]-1)*94 + (m[3]-1);
      return Uint8Array.from ([0, ec.byte].concat (_eint (v)));
    }
    var cc = [...c];
    if (cc.length === 1) {
      var cc1 = cc[0].codePointAt (0);
      var ec = prefixToEChar[Math.floor (cc1 / 0x1000)];
      if (ec && ec.type === 'urow') {
        return Uint8Array.from ([0, ec.byte].concat (_eint (cc1 % 0x1000)));
      }
    } else if (cc.length === 2) {
      var ec = prefixToEChar[cc[1].codePointAt (0)];
      if (ec && ec.type === 'suffix') {
        return Uint8Array.from ([0, ec.byte].concat (_eint (cc[0].codePointAt (0))));
      }
    }
    return (new TextEncoder ("utf-8")).encode ("\u0000" + c + "\u0001");
  }; // nEncodeChar

  var ecByteToEC = [];
  ds.dataRoot.echars.forEach (ec => {
    ecByteToEC[ec.byte] = ec;
  });
  ds.toChar = (b, c) => {
    var ec = ecByteToEC[b];
    if (!ec) throw new Error ("Bad b: " + b);

    if (ec.type === 'dec') {
      if (ec.prefix === 'MJ' || ec.prefix === 'koseki' || ec.prefix === 'KS') {
        c = ("00000" + c) . substr (-6);
      } else if (ec.prefix === 'touki' || ec.prefix === 'TK') {
        c = ("0000000" + c) . substr (-8);
      }
      return ':' + ec.prefix + c;
    } else if (ec.type === 'hex') {
      return ':' + ec.prefix + c.toString (16);
    } else if (ec.type === 'kt') {
      var k = Math.floor (c / 94) + 1;
      var t = (c % 94) + 1;
      return ':' + ec.prefix + '-' + k + '-' + t;
    } else if (ec.type === 'urow') {
      c = parseInt (ec.prefix) * 0x1000 + c;
      return String.fromCodePoint (c);
    } else if (ec.type === 'suffix') {
      return String.fromCodePoint (c) + String.fromCodePoint (parseInt (ec.prefix));
    } else {
      throw new Error ('Bad type: ' + ec.type);
    }
  }; // ds.toChar

  
  var rMap = ds.rMap = []
  for (var i = 0; i < ds.dataRoot.rels.length; i++) {
    var rels = ds.dataRoot.rels[i].rels;
    if (rels) {
      rMap[i] = rels;
    }
  }
  
}; // SWD.Char._relDataRoot

defineWorkerMethod ('SWDCharGetRelationIndexMap', (dsKey) => [dsKey], (dsKey) => {
  return SWD.Char._getRelationIndexMap (dsKey);
});
//
SWD.Char._getRelationIndexMap = hasWorkerMethod ('SWDCharGetRelationIndexMap', async function (dsKey) {
  var ds = SWD.Char._relDataSets[dsKey];
  if (!ds) throw new Error ("Bad /dsKey/: |"+dsKey+"|");

  if (!ds.dataRoot) {
    await SWD.Char._relDataRoot (ds);
  }
  
  return ds.dataRoot.rels;
}); // SWD.Char._getRelationIndexMap

SWD.Char.getRelationIndexMap = async function (dsKey) {
  if (SWD._cached["CharGetRelationIndexMap:" + dsKey]) return SWD._cached["CharGetRelationIndexMap:" + dsKey];
  var v = SWD._cached["CharGetRelationIndexMap:" + dsKey] = await SWD.Char._getRelationIndexMap (dsKey);
  return v;
};

SWD.Char._relDataClusters = async function (ds) {
  ds.dataClusters = new Uint8Array (await SWD.dataAB ('charrels/' + ds.key + '/tbl-clusters.dat'));
};

SWD.Char._relClusterIndexFromTbl = function (ds, def, index) {
  var offset = def.offset + index * 3;
  if (def.offset_next <= offset) {
    return null;
  }

  var tbl = ds.dataClusters;
  return tbl[offset] * 0x10000 + tbl[offset+1] * 0x100 + tbl[offset+2];
}; // SWD.Char._relClusterIndexFromTbl

SWD.Char._charsFromTbl = function (ds, level, index) {
  var x0 = index >> 16;
  var x1 = (index >> 8) % 0x100;
  var x2 = index % 0x100;
  var tbl = ds.dataClusters;
  var length = tbl.length;
  var chars = [];
  var defs = ds.dataRoot.tables.slice ();
  var i = 0;
  while (i < length) {
    if (x0 === tbl[i] && x1 === tbl[i+1] && x2 === tbl[i+2]) {
      while (defs.length && defs[0].offset_next <= i) {
        defs.shift ();
      }
      var def = defs[0];
      if (def.level_key !== level) {
        //
      } else if (def.type === 'unicode') {
        chars.push (String.fromCodePoint ((i - def.offset) / 3 + def.code_offset));
      } else if (def.type === 'unicode-suffix') {
        chars.push (String.fromCodePoint ((i - def.offset) / 3 + def.code_offset) + String.fromCodePoint (def.suffix));
      } else if (def.type === 'unicode-hangul2') {
        var v = (i - def.offset) / 3 + def.code_offset;
        chars.push (String.fromCodePoint (Math.floor (v / (0xA7-0x5F)) + 0x1100) +
                    String.fromCodePoint (v % (0xA7-0x5F) + 0x1160));
      } else if (def.type === 'unicode-hangul3') {
        var v = (i - def.offset) / 3 + def.code_offset;
        chars.push (String.fromCodePoint (Math.floor (v / (0xC2-0xA7) / (0x75-0x5F)) + 0x1100) +
                    String.fromCodePoint (Math.floor (v / (0xC2-0xA7)) % (0x75-0x5F) + 0x1160) +
                    String.fromCodePoint (v % (0xC2-0xA7) + 0x11A8));
      } else if (def.type === 'MJ') {
        var char = "00000" + ((i - def.offset) / 3 + def.code_offset);
        char = char.substr (-6);
        chars.push (':MJ' + char);
      } else if (def.type === 'UK-') {
        var char = "0000" + ((i - def.offset) / 3 + def.code_offset);
        char = char.substr (-5);
        chars.push (':UK-' + char);
      } else if (def.type === 'jis' || def.type.match (/^jis-[a-z]+-/)) {
        var char = ((i - def.offset) / 3 + def.code_offset);
        var tt = 94 + (0xFC-0xEF)*2;
        char = Math.floor (char / 94 / tt) + '-' + ((Math.floor (char / 94) % tt) + 1) + '-' + ((char % 94) + 1);
        chars.push (':' + def.type + char);
      } else if (def.type === 'cns' || def.type.match (/^cns-[a-z]+-/) ||
                 def.type === 'gb' || def.type === 'ks' ||
                 def.type === 'kps' || def.type === 'cccii') {
        var char = ((i - def.offset) / 3 + def.code_offset);
        char = Math.floor (char / 94 / 94) + '-' + ((Math.floor (char / 94) % 94) + 1) + '-' + ((char % 94) + 1);
        chars.push (':' + def.type + char);
      } else if (def.type === 'swc' ||
                 def.type === 'aj' || def.type === 'ac' || def.type === 'ag' ||
                 def.type === 'ak' || def.type === 'aj2-' ||
                 def.type === 'ak1-' ||
                 def.type === 'm') {
        var char = ((i - def.offset) / 3 + def.code_offset);
        chars.push (':' + def.type + char);
      } else if (def.type.match (/^u-[a-z]+-$/)) {
        var char = ((i - def.offset) / 3 + def.code_offset);
        chars.push (':' + def.type + char.toString (16));
      } else if (def.type.match (/^b5-$/)) {
        var char = ((i - def.offset) / 3 + def.code_offset);
        chars.push (':' + def.type + char.toString (16));
      } else if (def.type.match (/^b5-[a-z]+-$/)) {
        var char = ((i - def.offset) / 3 + def.code_offset);
        chars.push (':' + def.type + char.toString (16));
      } else {
        throw new Error ("bad table entry: " + def.type);
      }
    }
    i += 3;
  }
  return chars;
}; // SWD.Char._charsFromTbl

SWD.Char._relDataRels = async function (ds) {
  ds.dataRels = new Uint8Array (await SWD.dataAB ('charrels/' + ds.key + '/tbl-rels.dat'));
};

SWD.Char._relsFromTbl = function (ds, char) {
  var tbl = ds.dataRels;
  var rMap = ds.rMap;
  var bchar = ds.nEncodeChar (char);

  var start = tbl.indexOf (bchar[0]);
  while (true) {
    if (start < 0) return [];
    var bs = tbl.slice (start, start + bchar.byteLength);
    if (bchar.every ((v, i) => v === bs[i])) {
      break;
    } else {
      start = tbl.indexOf (bchar[0], start + 1);
    }
  }
  start += bchar.byteLength;

  var end = tbl.indexOf (0x00, start);
  if (end < 0) return []; // broken

  var r = tbl.slice (start, end);
  var rels = [];
  var i = 0;
  var rL = r.byteLength;
  while (i < rL) {
    var b = r[i];
    var c2;
    if ((0x20 <= b && b <= 0x7E) || (0xC2 <= b && b <= 0xF4)) {
      var bc2Start = i;
      while (i < rL && r[i] !== 0x01) i++;
      var bc2 = r.slice (bc2Start, i);
      if (bc2.byteLength === 0) continue; // at end or broken
      c2 = (new TextDecoder ('utf-8')).decode (bc2);
      i++;
    } else { // b : type
      i++;
      var c = 0;
      var s = 0;
      while (i < rL && r[i] & 0b01000000) {
        c = c | ((r[i] & 0b00111111) << s);
        i++;
        s += 6;
      }
      c = c | ((r[i] & 0b00111111) << s);
      i++;
      c2 = ds.toChar (b, c);
    }

    var v2Start = i;
    while (i < rL && r[i] !== 0x01) i++;
    var v2 = r.slice (v2Start, i);
    i++;
    var i2 = 0;
    var l2 = v2.byteLength;
    var rr = [];
    while (i2 < l2) {
      var v = 0;
      var s = 0;
      while (i2 < l2 && v2[i2] & 0b01000000) {
        v = v | ((v2[i2] & 0b00111111) << s);
        i2++;
        s += 6;
      }
      v = v | ((v2[i2] & 0b00111111) << s);
      i2++;
      if (rMap[v]) {
        rr = rr.concat (rMap[v].map (_ => [ds.key, _]));
      } else {
        rr.push ([ds.key, v]);
      }
    }
    rels.push ([c2, rr]);
  }
  return rels;
}; // SWD.Char._relsFromTbl

SWD.Char._relDataLeaders = async function (ds) {
  ds.dataLeaders = new Uint8Array (await SWD.dataAB ('charrels/' + ds.key + '/tbl-leaders.dat'));
};

SWD.Char._leadersFromTbl = function (ds, char) {
  var tbl = ds.dataLeaders;
  var bchar = ds.nEncodeChar (char);

  var start = tbl.indexOf (bchar[0]);
  while (true) {
    if (start < 0) return null; // not found
    var bs = tbl.slice (start, start + bchar.byteLength);
    if (bchar.every ((v, i) => v === bs[i])) {
      break;
    } else {
      start = tbl.indexOf (bchar[0], start + 1);
    }
  }
  start += bchar.byteLength;

  var end = tbl.indexOf (0x00, start);
  if (end < 0) return null; // broken
  while (start >= end) {
    start++;
    end = tbl.indexOf (0x00, start);
    if (end < 0) return null; // broken
    
    var r = tbl.slice (start, end);
    var rL = r.byteLength;
    var i = 0;
    if ((0x20 <= r[i] && r[i] <= 0x7E) || (0xC2 <= r[i] && r[i] <= 0xF4)) {
      while (i < rL && r[i] !== 0x01) i++;
      i++;
    } else {
      i++;
      while (i < rL && r[i] & 0b01000000) {
        i++;
      }
      i++;
    }
    start += i;

  }

  var r = tbl.slice (start, end);
  var rL = r.byteLength;
  var i = 0;
  var xx = [];
  while (i < rL) {
    var b = r[i];
    var c2;
    if ((0x20 <= b && b <= 0x7E) || (0xC2 <= b && b <= 0xF4)) {
      var bc2Start = i;
      while (i < rL && r[i] !== 0x01) i++;
      var bc2 = r.slice (bc2Start, i);
      if (bc2.byteLength === 0) continue; // at end or broken
      c2 = (new TextDecoder ('utf-8')).decode (bc2);
      i++;
    } else if (b == 0x01) {
      c2 = null;
      i++;
    } else { // b : type
      i++;
      var c = 0;
      var s = 0;
      while (i < rL && r[i] & 0b01000000) {
        c = c | ((r[i] & 0b00111111) << s);
        i++;
        s += 6;
      }
      c = c | ((r[i] & 0b00111111) << s);
      i++;
      c2 = ds.toChar (b, c);
    }
    xx.push (c2);
  }
  return xx;
}; // SWD.Char._leadersFromTbl

SWD.Char._dsGetCluster = function (ds, level, char) {
  var charLength = [...char].length;
  
  if (charLength === 1) {
    var cc = char.codePointAt (0);
    var def;
    var defs = ds.dataRoot.tables;
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      if (d.level_key === level && d.type === 'unicode' &&
          d.code_offset <= cc && cc < d.code_offset_next) {
        def = d;
        break;
      }
    }
    
    if (def) {
      var index = SWD.Char._relClusterIndexFromTbl (ds, def, cc - def.code_offset);
      if (index !== null) return index ? {index} : null;
    }
  } // charLength 1

  if (charLength === 2) {
    var [cc1, cc2] = [...char].map (_ => _.codePointAt (0));
    var def;
    var defs = ds.dataRoot.tables;
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      if (d.level_key === level && d.type === 'unicode-suffix' &&
          d.suffix === cc2 &&
          d.code_offset <= cc1 && cc1 < d.code_offset_next) {
        def = d;
        break;
      }
    }
    if (def) {
      var index = SWD.Char._relClusterIndexFromTbl (ds, def, cc1 - def.code_offset);
      if (index !== null) return index ? {index} : null;
    }

    if (0x1100 <= cc1 && cc1 <= 0xD7FF &&
        0x1160 <= cc2 && cc2 <= 0x11A7) {
      var cc = (cc1 - 0x1100) * (0xA7-0x5F) + (cc2 - 0x1160);
      for (var i = 0; i < defs.length; i++) {
        var d = defs[i];
        if (d.level_key === level && d.type === 'unicode-hangul2' &&
            d.code_offset <= cc && cc < d.code_offset_next) {
          def = d;
          break;
        }
      }
    }
    if (def) {
      var index = SWD.Char._relClusterIndexFromTbl (ds, def, cc - def.code_offset);
      if (index !== null) return index ? {index} : null;
    }
  } // charLength 2

  if (charLength === 3) {
    var [cc1, cc2, cc3] = [...char].map (_ => _.codePointAt (0));
    var def;
    var defs = ds.dataRoot.tables;
    if (0x1100 <= cc1 && cc1 <= 0xD7FF &&
        0x1160 <= cc2 && cc2 <= 0x1175 &&
        0x11A8 <= cc3 && cc3 <= 0x11C2) {
      var cc = (cc1 - 0x1100) * (0x75-0x5F) * (0xC2-0xA7) + (cc2 - 0x1160) * (0xC2-0xA7) + (cc3 - 0x11A8);
      for (var i = 0; i < defs.length; i++) {
        var d = defs[i];
        if (d.level_key === level && d.type === 'unicode-hangul3' &&
            d.code_offset <= cc && cc < d.code_offset_next) {
          def = d;
          break;
        }
      }
    }
    if (def) {
      var index = SWD.Char._relClusterIndexFromTbl (ds, def, cc - def.code_offset);
      if (index !== null) return index ? {index} : null;
    }
  } // charLength 3

  var m = char.match (/^:(MJ|aj|ac|ag|ak|aj2-|ak1-|UK-|swc)([0-9]+)$/);
  if (m) {
    var type = m[1];
    var cc1 = parseInt (m[2]);
    var def;
    var defs = ds.dataRoot.tables;
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      if (d.level_key === level && d.type === type &&
          d.code_offset <= cc1 && cc1 < d.code_offset_next) {
        def = d;
        break;
      }
    }
    
    if (def) {
      var index = SWD.Char._relClusterIndexFromTbl (ds, def, cc1 - def.code_offset);
      if (index !== null) return index ? {index} : null;
    }
  }

  var m = char.match (/^:(u-[a-z]+-)([0-9a-f]+)$/);
  if (m) {
    var type = m[1];
    var cc1 = parseInt (m[2], 16);
    var def;
    var defs = ds.dataRoot.tables;
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      if (d.level_key === level && d.type === type &&
          d.code_offset <= cc1 && cc1 < d.code_offset_next) {
        def = d;
        break;
      }
    }
    
    if (def) {
      var index = SWD.Char._relClusterIndexFromTbl (ds, def, cc1 - def.code_offset);
      if (index !== null) return index ? {index} : null;
    }
  }

  var m = char.match (/^:(b5-[a-z]+-|b5-)([0-9a-f]+)$/);
  if (m) {
    var type = m[1];
    var cc1 = parseInt (m[2], 16);
    var def;
    var defs = ds.dataRoot.tables;
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      if (d.level_key === level && d.type === type &&
          d.code_offset <= cc1 && cc1 < d.code_offset_next) {
        def = d;
        break;
      }
    }
    
    if (def) {
      var index = SWD.Char._relClusterIndexFromTbl (ds, def, cc1 - def.code_offset);
      if (index !== null) return index ? {index} : null;
    }
  }

  var m = char.match (/^:(jis|jis-[a-z]+-)([0-9]+)-([0-9]+)-([0-9]+)$/);
  if (m) {
    var type = m[1];
    var cc1 = parseInt (m[2]) * 94*(94+(0xFC-0xEF)*2) + (parseInt (m[3]) - 1) * 94 + (parseInt (m[4]) - 1);
    var def;
    var defs = ds.dataRoot.tables;
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      if (d.level_key === level && d.type === type &&
          d.code_offset <= cc1 && cc1 < d.code_offset_next) {
        def = d;
        break;
      }
    }
    
    if (def) {
      var index = SWD.Char._relClusterIndexFromTbl (ds, def, cc1 - def.code_offset);
      if (index !== null) return index ? {index} : null;
    }
  }

  var m = char.match (/^:(cns|cns-[a-z]+-|gb|ks|kps|cccii)([0-9]+)-([1-9][0-9]*)-([1-9][0-9]*)$/);
  if (m) {
    var type = m[1];
    var cc1 = parseInt (m[2]) * 94*94 + (parseInt (m[3]) - 1) * 94 + (parseInt (m[4]) - 1);
    var def;
    var defs = ds.dataRoot.tables;
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      if (d.level_key === level && d.type === type &&
          d.code_offset <= cc1 && cc1 < d.code_offset_next) {
        def = d;
        break;
      }
    }
    
    if (def) {
      var index = SWD.Char._relClusterIndexFromTbl (ds, def, cc1 - def.code_offset);
      if (index !== null) return index ? {index} : null;
    }
  }

  {
    var index = (ds.dataRoot.others[level] || {})[char];
    if (index == null) return null;

    return {index};
  }
}; // SWD.Char._dsGetCluster


defineWorkerMethod ('SWDCharGetClusterChars', (level, char, dsKey) => {
  return [level, char, dsKey];
}, (level, char, dsKey) => {
  return SWD.Char.getClusterChars (level, char, dsKey);
});
//
SWD.Char.getClusterChars = hasWorkerMethod ('SWDCharGetClusterChars', async function (level, char, dsKey) {
  var ds = SWD.Char._relDataSets[dsKey];

  await SWD.Char._relDataRoot (ds);
  await SWD.Char._relDataClusters (ds);
    
  var chars = [];
  
  var r = SWD.Char._dsGetCluster (ds, level, char);
  if (!r) return chars;
  
  var index = r.index;
  for (var _ in (ds.dataRoot.others[level] || {})) {
    if (ds.dataRoot.others[level][_] === index) {
      chars.push (_);
    }
  }

  return chars.concat (SWD.Char._charsFromTbl (ds, level, index));
}); // SWD.Char.getClusterChars


defineWorkerMethod ('SWDCharGetRels', (dsKey, c) => {
  return [dsKey, c];
}, (dsKey, c) => {
  return SWD.Char.getRels (dsKey, c);
});
//
SWD.Char.getRels = hasWorkerMethod ('SWDCharGetRels', async function (dsKey, char) {
  var ds = SWD.Char._relDataSets[dsKey];
  await SWD.Char._relDataRoot (ds);
  await SWD.Char._relDataRels (ds);

  return SWD.Char._relsFromTbl (ds, char);
}); // SWD.Char.getRels

defineWorkerMethod ('SWDCharGetRelsAll', (char) => [char], (char) => {
  return SWD.Char.getRelsAll (char);
});
//
SWD.Char.getRelsAll = hasWorkerMethod ('SWDCharGetRelsAll', async function (char) {
  var rels = {};

  var p = [];
  for (var _ in SWD.Char._relDataSets) {
    var ds = SWD.Char._relDataSets[_];
    p.push (((async (ds) => {
      await SWD.Char._relDataRoot (ds);
      await SWD.Char._relDataRels (ds);
      return ds;
    }) (ds)));
  }

  return Promise.all (p).then (dss => {
    dss.forEach (ds => {
      SWD.Char._relsFromTbl (ds, char).forEach (_ => {
        rels[_[0]] = rels[_[0]] || [_[0], []];
        rels[_[0]][1] = rels[_[0]][1].concat (_[1]);
      });
    });

    return Object.values (rels);
  });
}); // SWD.Char.getRelsAll


defineWorkerMethod ('SWDCharGetLeaders', (c, d) => [c, d], (c, d) => {
  return SWD.Char.getLeaders (c, d);
}, {
  postprocessor: (args, rv) => {
    var ds = SWD.Char._relDataSets[args[1]];
    var otherValues = {
      leaderTypes: ds.dataRoot.leader_types,
    };
    return {value: rv, otherValues};
  },
  handleOtherValues: (args, ov) => {
    var ds = SWD.Char._relDataSets[args[1]];
    ds.leaderTypes = ov.leaderTypes;
  },
});
//
SWD.Char.getLeaders = hasWorkerMethod ('SWDCharGetLeaders', async function (char, dsKey) {
  var ds = SWD.Char._relDataSets[dsKey];
  await SWD.Char._relDataRoot (ds);
  await SWD.Char._relDataLeaders (ds);
  
  return SWD.Char._leadersFromTbl (ds, char) || [char];
}); // SWD.Char.getLeaders


SWD.Char._mjc = {};
SWD.Char.getMJChar = async function (char) {
  if (SWD.Char._mjc[char]) return SWD.Char._mjc[char];

  return SWD.Char._mjc[char] = Promise.resolve ().then (async () => {
    var keys = ['hans', 'kanas', 'chars'];
    for (var i = 0; i < keys.length; i++) {
      var ds = SWD.Char._relDataSets[keys[i]];
      var rr = await SWD.Char.getRels (ds.key, char);

      var relTypes = await SWD.Char.getRelationIndexMap (ds.key);
      var relId1 = relTypes.findIndex (_ => _.key === "rev:mj:X0213");
      var relId2 = relTypes.findIndex (_ => _.key === "rev:mj:X0212");
      var relId3 = relTypes.findIndex (_ => _.key === "rev:mj:戸籍統一文字番号");
      var relId4 = relTypes.findIndex (_ => _.key === "rev:mj:登記統一文字番号");
      var relId5 = relTypes.findIndex (_ => _.key === "rev:mj:住基ネット統一文字コード");
      var relId6 = relTypes.findIndex (_ => _.key === "ninjal:MJ文字図形名");

      var r = rr.find (_ => _[1].find (_ => _[1] === relId1 || _[1] === relId2 || _[1] === relId3 || _[1] === relId4 || _[1] === relId5 || _[1] === relId6));
      if (r) return r[0];
    }

    return null;
  });
}; // SWD.Char.getMJChar

SWD.Char._cnsc = {};
SWD.Char.getCNSChar = async function (char) {
  if (SWD.Char._cnsc[char]) return SWD.Char._cnsc[char];

  return SWD.Char._cnsc[char] = Promise.resolve ().then (async () => {
    var keys = ['hans', 'kanas', 'kchars', 'chars'];
    for (var i = 0; i < keys.length; i++) {
      var ds = SWD.Char._relDataSets[keys[i]];
      var rr = await SWD.Char.getRels (ds.key, char);

      var relTypes = await SWD.Char.getRelationIndexMap (ds.key);
      var relId1 = relTypes.findIndex (_ => _.key === "cns:unicode");

      var r = rr.find (_ => _[1].find (_ => _[1] === relId1));
      if (r) return r[0];
    }

    return null;
  });
}; // SWD.Char.getCNSChar


SWD.Char.RelData = {};

SWD.Char.RelData._charToIndex = function (index, char) {
  var len = [...char].length;

  var m;
  if (len === 1) {
    var c = char.codePointAt (0);
    if (c <= 0x10FFFF) {
      return 1 + Math.floor (c / 0x200);
    }
  } else if (len == 2) {
    var [c1, c2] = [...char];
    var code1 = c1.codePointAt (0);
    var x = (code1 % 2) ? 0x100 : 0;
    var vs = c2.codePointAt (0);
    if (0xE0100 <= vs && vs <= 0xE01FF) {
      return vs - 0xE0000 + x;
    } else {
      return 0xFF;
    }
  } else if (m = char.match (index.prefixPattern)) {
    return index.prefix_to_index[m[1]];
  } else if (/^:u-/.test (char)) {
    return 0x300;
  } else if (3 <= len && len <= 10) {
    return 0x400 - 2 + len;
  }

  return 0;
}; // _charToIndex

SWD.Char.RelData._load = async function (dsKey) {
  var k = 'dsIndex' + dsKey;
  var index = SWD._cached[k];
  if (!index) {
    index = SWD._cached[k] = await SWD.data ('merged-rels/index.json', {dsKey});
    index.prefixPattern = new RegExp ('^:(' + index.prefix_pattern + ')');
    index.relDefs = [];
    Object.keys (index.rel_types).forEach (rel => {
      index.relDefs[index.rel_types[rel].id] = index.rel_types[rel];
      index.rel_types[rel].key = rel;
    });
    index.leaderTypes = [];
    Object.values (index.leader_types).forEach (lt => {
      index.leaderTypes[lt.index] = lt;
    });
    index.clusterLevels = [];
    Object.values (index.cluster_levels).forEach (lt => {
      index.clusterLevels[lt.index] =
      index.clusterLevels[lt.key] = lt;
    });
  }
  return index;
}; // _load

defineWorkerMethod ('SWDCharRelDataGetClusterChars', (level, char, dsKey) => {
  return [level, char, dsKey];
}, (level, char, dsKey) => {
  return SWD.Char.RelData.getClusterChars (level, char, dsKey);
});
//
SWD.Char.RelData.getClusterChars = hasWorkerMethod ('SWDCharRelDataGetClusterChars', async function (level, char, dsKey) {
  var index = await SWD.Char.RelData._load (dsKey);
  
  var fileIndex = SWD.Char.RelData._charToIndex (index, char);
  var part = await SWD.data ('char-cluster/part-' + fileIndex + '.jsonl?' + index.timestamp, {dsKey, type: 'jsonlKeyed', allow404: true});
  var clusters = (part[char] || []);

  var clusterIndex = index.clusterLevels[level].index;
  var clusterId = clusters[clusterIndex];
  if (clusterId === undefined) return [];

  const cPartSize = 5000;
  var cFileIndex = Math.floor (clusterId / cPartSize);
  var part = await SWD.data ('cluster-chars/part-' + clusterIndex + '-' + cFileIndex + '.jsonl?' + index.timestamp, {dsKey, type: 'jsonlKeyed', allow404: true});

  return part[clusterId] || [];
}); // SWD.Char.RelData.getClusterChars


defineWorkerMethod ('SWDCharRelDataGetLeaderTypes', (dsKey) => [dsKey], (dsKey) => {
  return SWD.Char.RelData.getLeaderTypes (dsKey);
});
//
SWD.Char.RelData.getLeaderTypes = hasWorkerMethod ('SWDCharRelDataGetLeaderTypes', async function (dsKey) {
  var index = await SWD.Char.RelData._load (dsKey);

  return index.leaderTypes;
}); // SWD.Char.RelData.getLeaderTypes

defineWorkerMethod ('SWDCharRelDataGetLeaders', (c, d) => [c, d], (c, d) => {
  return SWD.Char.RelData.getLeaders (c, d);
});
//
SWD.Char.RelData.getLeaders = hasWorkerMethod ('SWDCharRelDataGetLeaders', async function (char, dsKey) {
  var index = await SWD.Char.RelData._load (dsKey);
  
  var fileIndex = SWD.Char.RelData._charToIndex (index, char);
  var part = await SWD.data ('char-leaders/part-' + fileIndex + '.jsonl?' + index.timestamp, {dsKey, type: 'jsonlKeyed', allow404: true});

  return part[char] || [];
}); // SWD.Char.RelData.getLeaders

defineWorkerMethod ('SWDCharRelDataGetRelDefs', (dsKey) => [dsKey], (dsKey) => {
  return SWD.Char.RelData.getRelDefs (dsKey);
});
//
SWD.Char.RelData.getRelDefs = hasWorkerMethod ('SWDCharRelDataGetRelDefs', async function (dsKey) {
  var index = await SWD.Char.RelData._load (dsKey);

  return index.relDefs;
}); // SWD.Char.RelData.getRelDefs

defineWorkerMethod ('SWDCharRelDataGetRels', (dsKey, c) => [dsKey, c], (dsKey, c) => {
  return SWD.Char.RelData.getRels (dsKey, c);
});
//
SWD.Char.RelData.getRels = hasWorkerMethod ('SWDCharRelDataGetRels', async function (dsKey, char) {
  var index = await SWD.Char.RelData._load (dsKey);
  
  var fileIndex = SWD.Char.RelData._charToIndex (index, char);
  var part = await SWD.data ('merged-rels/part-' + fileIndex + '.jsonl?' + index.timestamp, {dsKey, type: 'jsonlKeyed', allow404: true});

  return part[char] || {};
}); // SWD.Char.RelData.getRels

SWD.Char.RelData._relGlyphInfo = function (opts) {
  return SWD._cached[opts.key] = SWD._cached[opts.key] || Promise.resolve ().then (async () => {
    var keys = opts.dsKeys;
    for (let i = 0; i < keys.length; i++) {
      var rds = await SWD.Char.RelData.getRelDefs (keys[i]);
      var rr = await SWD.Char.RelData.getRels (keys[i], opts.char);
      for (let c2 in rr) {
        var relIds = rr[c2];
        for (let k = 0; k < relIds.length; k++) {
          var rel = rds[relIds[k]];
          var r = opts.code (c2, rel);
          if (r) return r;
        }
      }
    }
    return null;
  });
}; // SWD.Char.RelData._relGlyphInfo

defineWorkerMethod ('SWDCharRelDataGetGlyphInfo', (c) => [c], (opts) => {
  return SWD.Char.RelData._getGlyphInfo (opts);
});
//
SWD.Char.RelData._getGlyphInfo = hasWorkerMethod ('SWDCharRelDataGetGlyphInfo', async function (opts) {
  if (opts.mapper === 'auto') {
    let m;
    if (m = opts.char.match (/^:jis-(dot16v?|dot24v?)-1-([0-9]+)-([0-9]+)$/)) {
      var glyphId = (m[2] - 1) * 94 + (m[3] - 1);
      var fontName = /16/.test (m[1]) ? 'jiskan16' : 'jiskan24';
      return {
        fontName,
        glyphId,
        approximate: (!! /v/.test (m[1])),
      };
    }
  }
  
  if (opts.mapper === 'mj') {
    var char = opts.char;
    var approximate = false;
    if (/^:(?:J[ABCDEFT]|KS|TK)/.test (char)) {
      var m1 = await SWD.Char.RelData._relGlyphInfo ({
        char: char,
        key: 'mjGlyphInfo.KS:' + char,
        dsKeys: ['hans', 'kanas', 'chars'],
        code: (c2, rel) => {
          if ((rel.key === 'manakai:implements') &&
              /^:(?:jis[12]|u-juki|koseki|touki)/.test (c2)) {
            return {char: c2};
          } else if (rel.key === 'manakai:implements:juki') {
            return {char: c2};
          }
          return null;
        },
      });
      if (m1) {
        char = m1.char
        approximate = true;
      } else {
        return null;
      }
    }
    return SWD.Char.RelData._relGlyphInfo ({
      char: char,
      key: 'mjGlyphInfo:' + opts.char + ':' + approximate,
      dsKeys: ['hans', 'kanas', 'chars'],
      code: (c2, rel) => {
        if (rel.key === 'rev:mj:X0213' ||
            rel.key === 'rev:mj:X0212' ||
            rel.key === 'rev:mj:戸籍統一文字番号' ||
            rel.key === 'rev:mj:登記統一文字番号' ||
            rel.key === 'rev:mj:住基ネット統一文字コード') {
          return {glyphName: c2.replace (/^:/, '').toLowerCase (),
                  approximate: true};
        } else if (rel.key === 'ninjal:MJ文字図形名') {
          return {glyphName: c2.replace (/^:/, '').toLowerCase (),
                  approximate};
        }
        return null;
      },
    });
  } else if (opts.mapper === 'cns') {
    var char = opts.char;
    var approximate = false;
    if (/^:b5-/.test (char)) {
      var m1 = await SWD.Char.RelData._relGlyphInfo ({
        char: char,
        key: 'cnsGlyphInfo.b5:' + char,
        dsKeys: ['hans', 'kanas', 'chars'],
        code: (c2, rel) => {
          if (rel.key === 'rev:cns:big5' ||
              rel.key === 'rev:cns:big5:符號') {
            return {char: c2};
          }
          return null;
        },
      });
      if (m1) {
        char = m1.char
        approximate = true;
      } else {
        return null;
      }
    }
    return SWD.Char.RelData._relGlyphInfo ({
      char: char,
      key: 'cnsGlyphInfo:' + char + ':' + approximate,
      dsKeys: ['hans', 'kanas', 'kchars', 'chars'],
      code: (c2, rel) => {
        if (rel.key === 'cns:unicode') {
          return {string: c2, approximate};
        }
        return null;
      },
    });
  } else if (opts.mapper === 'u') {
    var m = (opts.char || '').match (/^:u-([a-z]+)-([0-9a-f]+)$/);
    if (m && m[1] === name) {
      return {string: String.fromCodePoint (parseInt (m[2], 16))};
    }
  }

  return null;
}); // SWD.Char.RelData._getGlyphInfo

SWD.Char.RelData.getGlyphInfo = async function (opts) {
  if (opts.mapper) {
    var mapped = await SWD.Char.RelData._getGlyphInfo (opts);
    return mapped || null;
  }
        
  if (opts.glyphId === '' && opts.glyphName === '' && opts.string === '') return null;

  return opts;
}; // SWD.Char.RelData.getGlyphInfo

defineElement ({
  name: 'sw-char-cluster',
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
      if (this.parentNode.hidden = v == null) return;

      this.textContent = '';

      var dsKey = this.getAttribute ('type');
      if (!dsKey) return;
      var relDefs = await SWD.Char.RelData.getRelDefs (dsKey);

      var progress = document.createElement ('progress');
      this.appendChild (progress);

      var chars = await SWD.Char.RelData.getClusterChars ("EQUIV", v.char, dsKey);
      var inCluster = new Set (chars);
      var leaders = await SWD.Char.RelData.getLeaders (v.char, dsKey);

      if (chars.length === 0 && leaders.length <= 1) {
        this.parentNode.hidden = true;
        progress.remove ();
        return;
      }

      if (leaders.length === 1) {
        var c = document.createElement ('sw-char-leaders');
        var ts = await $getTemplateSet ('sw-char-leader-single');
        var e = ts.createFromTemplate ('figure', {
          char: SWD.char ('char', leaders[0]),
        });
        c.appendChild (e);
        this.appendChild (c);
      } else if (leaders.length) {
        var c = document.createElement ('sw-char-leaders');
        var ts = await $getTemplateSet ('sw-char-leader-item');
        var tse = await $getTemplateSet ('sw-char-leader-empty-item');
        var lts = await SWD.Char.RelData.getLeaderTypes (dsKey);
        lts.forEach (lt => {
          if (!lt) return;
          if (leaders[lt.index]) {
            var e = ts.createFromTemplate ('figure', {
              char: SWD.char ('char', leaders[lt.index]),
              def: lt,
            });
            c.appendChild (e);
          } else {
            var e = tse.createFromTemplate ('figure', {
              def: lt,
            });
            c.appendChild (e);
          }
        });
        this.appendChild (c);
      }
      
      var c = document.createElement ('ul');
      for (var i = 0; i < chars.length; i++) {
        var char = chars[i];
        var li = document.createElement ('li');

        var e = document.createElement ('sw-data-char');
        e.value = SWD.char ('char', char);
        e.setAttribute ('template', 'sw-data-char-item');
        if (inCluster.has (char)) e.classList.toggle ('in-cluster');
        li.appendChild (e);

        /*
        var relItems = await SWD.Char.getRels (dsKey, char);
        var relTypeSets = {};
        for (let j = 0; j < relItems.length; j++) {
          var relItem = relItems[j];
          var relChar = relItem[0];
          var relTypes = [];
          for (let k = 0; k < relItem[1].length; k++) {
            var relDSKey = relItem[1][k][0];
            if (!relTypeSets[relDSKey]) {
              relTypeSets[relDSKey] = await SWD.Char.getRelationIndexMap (relDSKey);
            }
          }
        }
        
        var ul = document.createElement ('ul');
        relItems.map (relItem => {
          var relChar = relItem[0];
          var relTypes = relItem[1].map (_ => relTypeSets[_[0]][_[1]]);
          var maxWeight = Math.max (...relTypes.map (_ => _.weight));
          return {relChar, relTypes, maxWeight};
        }).sort ((a, b) => b.maxWeight - a.maxWeight).forEach (_ => {
          var li2 = document.createElement ('li');

          var f = document.createElement ('sw-data-char');
          f.value = SWD.char ('char', _.relChar);
          f.setAttribute ('template', 'sw-data-char-item');
          if (inCluster.has (_.relChar)) f.classList.toggle ('in-cluster');
          li2.appendChild (f);

          {
            var ul2 = document.createElement ('ul');
            ul2.classList.toggle ('char-rel-list');
            _.relTypes.sort ((a, b) => {
              return b.weight - a.weight;
            }).forEach (rel => {
              var li3 = document.createElement ('li');
              var code = document.createElement ('sw-data-char-rel');
              code.value = rel;
              li3.appendChild (code);
              ul2.appendChild (li3);
            });
            li2.appendChild (ul2);
          }
          
          ul.appendChild (li2);
        }); // relItems
        li.appendChild (ul);
        */

        var relItems = await SWD.Char.RelData.getRels (dsKey, char);
        var ul = document.createElement ('ul');
        Object.keys (relItems).map (rc => {
          var rds = relItems[rc].map (_ => relDefs[_] || console.log ("RelDef not found", relDefs, relItems[rc], char, rc, _));
          var mw = Math.max (...rds.map (_ => _.weight));
          return {rc, rds, mw};
        }).sort ((a, b) => b.mw - a.mw).forEach (_ => {
          var li2 = document.createElement ('li');

          var f = document.createElement ('sw-data-char');
          f.value = SWD.char ('char', _.rc);
          f.setAttribute ('template', 'sw-data-char-item');
          if (inCluster.has (_.rc)) f.classList.toggle ('in-cluster');
          li2.appendChild (f);

          {
            var ul2 = document.createElement ('ul');
            ul2.classList.toggle ('char-rel-list');
            _.rds.sort ((a, b) => {
              return b.weight - a.weight;
            }).forEach (rd => {
              var li3 = document.createElement ('li');
              var code = document.createElement ('sw-data-char-rel');
              code.value = rd;
              li3.appendChild (code);
              ul2.appendChild (li3);
            });
            li2.appendChild (ul2);
          }
          
          ul.appendChild (li2);
        }); // relItems
        li.appendChild (ul);

        c.appendChild (li);
      }

      this.appendChild (c);
      progress.remove ();
    }, // swUpdate
  },
}); // <sw-char-cluster>

SWD.Char.routes = async function (char1, char2, opts) {
  var maxDistance = opts.maxDistance || 30;
  var p = [];

  if (char1.char === char2.char && char1.char !== null) {
    var item = [[char1, []]];
    if (opts.onfound) p.push (Promise.resolve (item).then (opts.onfound));
    await Promise.all (p);
    return [ item ];
  }

  var char1Char = char1.char;
  var char2Char = char2.char;
  var char = char1;
  var found = [];
  var dups = {};
  var dupsNeedReport = {};
  var reportDups = dd => {
    dd.forEach (route => {
      p.push (Promise.resolve (route).then (opts.ondup));
      checkDups (route);
    });
  };
  var checkDups = route => {
    route.forEach (_ => {
      var char = _[0].char;
      if (!dupsNeedReport[char]) {
        dupsNeedReport[char] = true;
        var dd = dups[char];
        delete dups[char];
        if (dd) reportDups (dd);
      }
    });
  };
  var current = [ [[char1, []]] ];
  current[0].seen = new Set ([char1Char]);
  var currentSeen = {};
  currentSeen[char1Char] = true;
  while (true) {
    //console.log ("length", current[0].length, "routes", current.length); // debug
    p.push (Promise.resolve (current[0].length).then (opts.onhop));
    var next = [];
    var nextSeen = {};
    for (var n in currentSeen) { nextSeen[n] = currentSeen[n] }
    for (var i = 0; i < current.length; i++) {
      var route = current[i];
      var char = route.at (-1)[0];
      var relItems = [];
      for (let dsKey in SWD.Char._relDataSets) {
        var relDefs = await SWD.Char.RelData.getRelDefs (dsKey);
        var items = await SWD.Char.RelData.getRels (dsKey, char.char)
        for (let c2 in items) {
          relItems[c2] = (relItems[c2] || []).concat (items[c2].map (_ => relDefs[_]));
        }
      }
      Object.keys (relItems).forEach (relChar => {
      /*
      var relItems = await SWD.Char.getRelsAll (char.char);
      var relTypeSets = {};
      for (let j = 0; j < relItems.length; j++) {
        var relItem = relItems[j];
        var relChar = relItem[0];
        var relTypes = [];
        for (let k = 0; k < relItem[1].length; k++) {
          var relDSKey = relItem[1][k][0];
          if (!relTypeSets[relDSKey]) {
            relTypeSets[relDSKey] = await SWD.Char.getRelationIndexMap (relDSKey);
          }
          relTypes.push (relTypeSets[relDSKey][relItem[1][k][1]]);
        }
        var item = route.concat ([
          [SWD.char ('char', relChar), relTypes]
        ]);
        */
        var item = route.concat ([
          [SWD.char ('char', relChar), relItems[relChar]]
        ]);
        item.seen = new Set (route.seen);
        //if (currentSeen[relChar]) {
        if (relChar === char2Char) {
          found.push (item);
          delete item.seen;
          p.push (Promise.resolve (item).then (opts.onfound));
          checkDups (item);
        } else if (nextSeen[relChar]) {
          if (item.seen.has (relChar)) {
            //
          } else if (dupsNeedReport[relChar]) {
            delete item.seen;
            reportDups ([item]);
          } else {
            dups[relChar] = dups[relChar] || [];
            delete item.seen;
            dups[relChar].push (item);
          }
        } else {
          next.push (item);
          item.seen.add (relChar);
        }
        nextSeen[relChar] = true;
      //} // relItems
      }); // relItems

      await new Promise (_ => setTimeout (_, 0));
    } // route
    if (!next.length) break;
    //if (found.length) break;
    if (next[0].length > maxDistance) break;
    current = next;
    currentSeen = nextSeen;
  } // while

  await Promise.all (p);
  return found;
}; // SWD.Char.routes

defineElement ({
  name: 'sw-char-routes',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      this.swInit ();
    }, // pcInit
    swInit: async function () {
      var char1 = this.value[0];
      var char2 = this.value[1];

      var as = document.createElement ('action-status');
      as.innerHTML = '<progress></progress><action-status-message></action-status-message>';
      var progress = as.firstChild;
      this.appendChild (as);

      this.querySelectorAll ('input[name=filterChar]').forEach (_ => {
        _.oninput = () => {
          clearTimeout (this.swUpdateRoutesTimer);
          this.swUpdateRoutesTimer = setTimeout (() => this.swUpdateRoutes (), 500);
        };
      });
      
      var maxDistance = 30;
      progress.max = maxDistance;
      var n = 0;

      this.swRunning = true;
      this.swRoutes = [];
      var results = await SWD.Char.routes (char1, char2, {
        maxDistance,
        onhop: hop => {
          progress.value = hop;
        },
        onfound: route => {
          this.swInsertRoute (route, {});
        },
        ondup: route => {
          this.swInsertRoute (route, {partial: true});
        },
      });

      delete this.swRunning;
      this.swUpdateActionStatus ();
    }, // swInit
    swUpdateRoutes: function () {
      var list = this.querySelector ('list-main');
      list.textContent = '';

      var match = this.swMatcher ();
      this.swRoutes.forEach (([route, partial]) => {
        if (!match (route)) return;
        
        list.appendChild (this.swCreateRouteElement (route, {
          partial,
          activeChar: match.char,
        }));
      });

      this.swUpdateActionStatus ();
    }, // swUpdateRoutes
    swUpdateActionStatus: function () {
      var as = this.querySelector ('action-status');

      if (this.swRoutes.length) {
        if (this.querySelector ('list-main ol')) {
          as.hidden = ! this.swRunning;
          as.querySelector ('action-status-message').hidden = false;
        } else {
          as.hidden = false;
          var m = as.querySelector ('action-status-message');
          m.hidden = false;
          m.textContent = this.getAttribute ('nomatch');
        }
      } else {
        as.hidden = false;
        var m = as.querySelector ('action-status-message');
        m.hidden = false;
        m.textContent = this.getAttribute ('notfound');
      }
    }, // swUpdateActionStatus
    swInsertRoute: function (route, opts) {
      this.swRoutes.push ([route, opts.partial]);

      var match = this.swMatcher ();
      if (match (route)) {
        this.querySelector ('list-main').appendChild (this.swCreateRouteElement (route, {
          partial: opts.partial,
          activeChar: match.char,
        }));
      }

      this.swUpdateActionStatus ();
    }, // swInsertRoute
    swMatcher: function () {
      var char;
      this.querySelectorAll ('input[name=filterChar]').forEach (_ => {
        if (_.value.length) char = _.value;
      });
      if (char) {
        char = SWD.char ('char', char).char;
        var code = route => {
          for (var i = 0; i < route.length; i++) {
            if (route[i][0].char === char) {
              return true;
            }
          }
          return false;
        };
        code.char = char;
        return code;
      } else {
        return (route) => true;
      }
    }, // swMatcher
    swSetCharFilter: function (char) {
      this.querySelectorAll ('input[name=filterChar]').forEach (_ => {
        _.value = char;
      });
      this.swUpdateRoutes ();
    }, // swSetCharFilter
    swCreateRouteElement: function (route, {partial, activeChar}) {
      var ol = document.createElement ('ol');

      if (partial) route.at (-1).partialLast = true;

      route.forEach (step => {
        var li = document.createElement ('li');

        if (step[1].length) {
          var ul = document.createElement ('ul');
          ul.classList.toggle ('char-rel-list');
          step[1].forEach (rel => {
            var li = document.createElement ('li');
            var code = document.createElement ('sw-data-char-rel');
            code.value = rel;
            li.appendChild (code);
            ul.appendChild (li);
          });
          li.appendChild (ul);
        }
        
        var c = document.createElement ('sw-data-char');
        c.setAttribute ('template', 'sw-data-char-item');
        c.classList.toggle ('active', activeChar === step[0].char);
        c.value = step[0];
        li.appendChild (c);

        ol.appendChild (li);
      });

      if (partial) {
        var li = document.createElement ('li');
        li.className = 'continue';
        li.innerHTML = '<a href=javascript:></a>';
        var a = li.firstChild;
        var char = route.at (-1)[0].char;
        a.onclick = () => this.swSetCharFilter (char);
        a.textContent = this.getAttribute ('continue');
        ol.appendChild (li);
      }
      
      ol.querySelector (':scope > li:first-child sw-data-char').classList.add ('in-cluster');
      if (!partial) ol.querySelector (':scope > li:last-child sw-data-char').classList.add ('in-cluster');
      return ol;
    }, // swInsertRoute
  },
}); // <sw-char-routes>

defineElement ({
  name: 'sw-data-char-rel',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      this.swUpdate ();
    },
    swUpdate: async function () {
      var args = this.value;
      
      var ts = await $getTemplateSet (this.localName);
      var e = ts.createFromTemplate ('div', args);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
    }, // swUpdate
  },
}); // <sw-data-char-rel>

/* ------ Fonts ------ */

SWD.Font = {};

SWD.Font._otjs = function () {
  return this._otjsp = this._otjsp || new Promise ((ok, ng) => {
    if (self.importScripts) {
      try {
        importScripts ('/js/opentype.js');
        ok ();
      } catch (e) {
        ng (e);
      }
    } else {
      var s = document.createElement ('script');
      s.src = '/js/opentype.js';
      s.onload = ok;
      s.onerror = ng;
      document.head.appendChild (s);
    }
  });
}; // SWD.Font._otjs

SWD.Font.info = async function (opts) {
  var info = opts;
  if (!info.type && info.name) {
    var json = await SWD.data ('fonts.json');
    info = json[opts.name] || opts;
  }
  return info;
}; // SWD.Font.info

SWD.Font._fonts = {};
SWD.Font.load = async function (opts) {
  var info = await SWD.Font.info (opts);
  var f = new SWD.Font.Font;
  f.info = info;
  return f;
}; // SWD.Font.load

SWD.Font.Font = function () { };

SWD.Font.Font.prototype._load = async function () {
  if (this._loaded) return;
  this._loaded = true;
  
  var info = this.info;
  if (info.type === 'opentype') {
    var key = info.url;
    if (SWD.Font._fonts[key]) return this.otf = await SWD.Font._fonts[key];
    var abf = fetch (info.url).then (res => {
      if (res.status !== 200) throw res;
      return res.arrayBuffer ();
    });
    this.otf = await (SWD.Font._fonts[key] = SWD.Font._otjs ().then (async () => {
      var ab = await abf;
      return opentype.parse (ab, {});
    }));
  } else if (info.type === 'opentype-ranged') {
    //
  } else if (info.type === 'bitmap') {
    var key = info.url;
    if (SWD.Font._fonts[key]) return this.bitmap = await SWD.Font._fonts[key];
    this.bitmap = SWD.Font._fonts[key] = await (fetch (info.url).then (res => {
      if (res.status !== 200) throw res;
      return res.arrayBuffer ();
    }));
  } else if (info.type === 'native') {
    //
  } else {
    throw ["glyph _load", info];
  }
}; // _load

SWD.Font.Font.prototype._getGlyphDataById = async function (glyphId) {
  await this._load ();
  if (this.otf) {
    var glyph = this.otf.glyphs.get (glyphId);
    var upem = this.otf.unitsPerEm;
    var h = this.otf.tables.os2.sTypoAscender - this.otf.tables.os2.sTypoDescender;
    if (h < upem) h = upem;
    
    var path = glyph.getPath (0, h + this.otf.tables.os2.sTypoDescender, upem, {});
    var pathData = path.toPathData ();
    
    return {
      width: upem,
      height: h,
      pathData,
    };
  } else if (this.bitmap) {
    var size = this.info.size;
    var blength = size * size / 8;
    var bytes = this.bitmap.slice (blength * glyphId, blength * glyphId + blength);
    var ta = new Uint8Array (bytes);
    return {
      width: size,
      height: size,
      bitmap: ta,
    };
  } else {
    throw ["glyph by id", this];
  }
}; // _getGlyphDataById

SWD.Font.Font.prototype._getGlyphDataByName = async function (glyphName) {
  await this._load ();
  if (this.otf) {
    var glyphId = this.otf.glyphNames.names.indexOf (glyphName); // or -1
    if (glyphId === -1) return null;
    return this._getGlyphDataById (glyphId);
  } else {
    throw ["glyph by name", glyphName, this];
  }
}; // _getGlyphDataByName

SWD.Font.Font.prototype._getGlyphDataByUniChar = async function (character) {
  await this._load ();
  if (this.otf) {
    var glyph = this.otf.charToGlyph (character);
    if (glyph.index === 0) throw glyph;
    return this._getGlyphDataById (glyph.index);
  } else if (this.info.type === 'opentype-ranged') {
    var c = character.codePointAt (0);
    var item;
    for (var i = 0; i < this.info.files.length; i++) {
      var r = this.info.files[i];
      if (parseInt (r.range[0], 16) <= c && c <= parseInt (r.range[1], 16)) {
        item = r;
        break;
      }
    }
    if (!item) throw ["glyph range not found", this];

    var font = await SWD.Font.load ({type: 'opentype', url: item.url});
    return font._getGlyphDataByUniChar (character);
  } else {
    throw ["glyph by char", this];
  }
}; // _getGlyphDataByUniChar

SWD.Font.Font.prototype.getGlyphData = hasWorkerMethod ('GetFontGlyphData', async function (opts) {
  if (opts.glyphId != null && opts.glyphId !== "") {
    return this._getGlyphDataById (opts.glyphId); // or throw
  } else if (opts.glyphName != null && opts.glyphName !== "") {
    return this._getGlyphDataByName (opts.glyphName); // or throw or null
  } else if ([...opts.string].length === 1) {
    return this._getGlyphDataByUniChar (opts.string); // or throw
  } else {
    throw opts;
  }
}, opts => {
  return [this.info, opts];
}); // getGlyphData

defineWorkerMethod ('GetFontGlyphData', function (opts) {
  return [this.info, opts];
}, (info, opts) => {
  var f = new SWD.Font.Font;
  f.info = info;
  return f.getGlyphData (opts);
});

SWD.Font.Font.prototype.getGlyphElement = async function (opts) {
  var gd = await this.getGlyphData (opts);
  if (!gd) return null;
  
  if (gd.pathData) {
    var svg = document.createElementNS
        ('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute ('viewBox', [0, 0, gd.width, gd.height].join (' '));
    svg.setAttribute ('class', 'font-glyph');

    var path = document.createElementNS ('http://www.w3.org/2000/svg', 'path');
    path.setAttribute ('d', gd.pathData);

    svg.appendChild (path);
    return svg;
  } else if (gd.bitmap) {
    var blength = gd.width * gd.height / 8;
    var ta = gd.bitmap;
    
    var canvas = document.createElement ('canvas');
    canvas.width = gd.width;
    canvas.height = gd.height;
    canvas.setAttribute ('class', 'font-glyph');
    var ctx = canvas.getContext ('2d');

    var id = ctx.getImageData (0, 0, gd.width, gd.height);
    for (var i = 0; i < gd.width*gd.height; i++) {
      var b = 7 - (i % 8);
      if (ta[Math.floor (i / 8)] & (1 << b)) {
        id.data[i*4] = id.data[i*4+1] = id.data[i*4+2] = 0x00;
        id.data[i*4+3] = 0xFF;
      }
    }
    ctx.putImageData (id, 0, 0);
    
    return canvas;
  } else {
    throw ["getGlyphElement", this];
  }
}; // getGlyphElement

defineElement ({
  name: 'sw-font-glyph',
  props: {
    pcInit: function () {
      return this.swUpdate ();
    },
    swUpdate: async function () {
      var name = this.getAttribute ('name');
      var fontLoading;
      if (name) fontLoading = SWD.Font.load ({name});

      var glyphInfo = await SWD.Char.RelData.getGlyphInfo ({
        char: this.getAttribute ('char'),
        mapper: this.getAttribute ('mapper'),
        glyphId: this.getAttribute ('glyphid'),
        glyphName: this.getAttribute ('glyphname'),
        string: this.getAttribute ('string'),
      });
      if (!glyphInfo) return;
      var font;
      if (glyphInfo.fontName) {
        font = await SWD.Font.load ({name: glyphInfo.fontName});
      } else {
        font = await fontLoading;
      }

      try {
        var el = await font.getGlyphElement (glyphInfo);
        this.classList.toggle ('approximate', !!glyphInfo.approximate);
        if (el) {
          this.hidden = false;
          this.appendChild (el);
        } else {
          this.hidden = true;
        }
      } catch (e) {
        if (this.hasAttribute ('optional')) {
          this.parentNode.hidden = true;
        } else {
          throw ["sw-font-glyph swUpdate failed", e];
        }
      }
    }, // swUpdate
  },
}); // <sw-font-glyph>

defineElement ({
  name: 'sw-char-fonts',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      this.swUpdate ();
    },
    swUpdate: async function () {
      var char = this.value;
      if (char.type === 'unicode' || char.type === 'vs' ||
          char.type === 'string') {
        var ts = await $getTemplateSet ('sw-char-fonts-string-item');
        var e = ts.createFromTemplate ('figure', {
          string: char.text,
        });
        this.appendChild (e);

        if (char.type === 'unicode') {
          var ts = await $getTemplateSet ('sw-char-fonts-font-item');
          var names = ['mj', 'cns', 'ak'];
          for (var i = 0; i < names.length; i++) {
            var name = names[i];
            var info = await SWD.Font.info ({name});
            var e = ts.createFromTemplate ('figure', {
              name,
              string: char.text,
              info,
              optional: '',
            });
            this.appendChild (e);
          }
        }
      } else if (char.type === 'char') {
        var m = char.char.match (/^:(a[jcgk]|ak1-)([1-9][0-9]*|0)$/);
        if (m) {
          var glyphId = m[2];
          var ts = await $getTemplateSet ('sw-char-fonts-font-item');
          var key = m[1];
          var names = [key];
          if (key === 'aj') names.push ('mj');
          if (key === 'ak') names.push ('HaranoAjiGothicKR');
          for (var i = 0; i < names.length; i++) {
            var name = names[i];
            var info = await SWD.Font.info ({name});
            if (info.hasAJ1GlyphNames) {
              var e = ts.createFromTemplate ('figure', {
                name,
                glyphName: key + glyphId,
                info,
              });
              this.appendChild (e);
            } else {
              var e = ts.createFromTemplate ('figure', {
                name,
                glyphId,
                info,
              });
              this.appendChild (e);
            }
          }
        }
        
        var m = char.char.match (/^:(MJ[0-9]+)$/);
        if (m) {
          var ts = await $getTemplateSet ('sw-char-fonts-font-item');
          var key = m[1];
          var names = ['mj'];
          for (var i = 0; i < names.length; i++) {
            var name = names[i];
            var info = await SWD.Font.info ({name});
            var e = ts.createFromTemplate ('figure', {
              name,
              glyphName: key.toLowerCase (),
              info,
            });
            this.appendChild (e);
          }
        }
        
        var m = char.char.match (/^:jis([0-9]+)-([0-9]+)-([0-9]+)$/);
        if (m) {
          var ts = await $getTemplateSet ('sw-char-fonts-font-item');
          var names = ['mj'];
          for (var i = 0; i < names.length; i++) {
            var name = names[i];
            var info = await SWD.Font.info ({name});
            var e = ts.createFromTemplate ('figure', {
              name,
              mapper: 'mj',
              char: char.char,
              info,
            });
            this.appendChild (e);
          }
          if (m[1] === "1") {
            names = ['jiskan16', 'jiskan24'];
            for (var i = 0; i < names.length; i++) {
              var name = names[i];
              var info = await SWD.Font.info ({name});
              var e = ts.createFromTemplate ('figure', {
                name,
                glyphId: (parseInt (m[2]) - 1) * 94 + (parseInt (m[3]) - 1),
                info,
              });
              this.appendChild (e);
            }
          }
        }
        var m = char.char.match (/^:jis-dot(16|24)-1-([0-9]+)-([0-9]+)$/);
        if (m) {
          var ts = await $getTemplateSet ('sw-char-fonts-font-item');
          var name = 'jiskan' + m[1];
          var info = await SWD.Font.info ({name});
          var e = ts.createFromTemplate ('figure', {
            name,
            glyphId: (parseInt (m[2]) - 1) * 94 + (parseInt (m[3]) - 1),
            info,
          });
          this.appendChild (e);
        }
        
        var m = char.char.match (/^:cns[0-9]+-[0-9]+-[0-9]+$/);
        if (m) {
          var ts = await $getTemplateSet ('sw-char-fonts-font-item');
          var names = ['cns'];
          for (var i = 0; i < names.length; i++) {
            var name = names[i];
            var info = await SWD.Font.info ({name});
            var e = ts.createFromTemplate ('figure', {
              name,
              mapper: 'cns',
              char: char.char,
              info,
            });
            this.appendChild (e);
          }
        }
      }
    }, // swUpdate
  },
}); // <sw-char-fonts>

/* ------ Kanshi ------ */

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
      args.canCopy = this.hasAttribute ('can-copy');
      args.link =  this.hasAttribute ('link');
      
      var ts = await $getTemplateSet (this.localName);
      var e = ts.createFromTemplate ('div', args);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
      
    }, // swUpdate
  },
}); // <sw-data-year>

defs (() => {

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'swDataYearSelector');
  def.pcHandler = function (templates, obj) {
    if (obj.era) {
      if (obj.format === 'text') {
        if (obj.canCopy && obj.link) {
          return templates.eraTextCanCopyLink;
        } else if (obj.canCopy) {
          return templates.eraTextCanCopy;
        } else {
          return templates.eraText;
        }
      } else if (obj.format === 'eraWithYear') {
        return templates.eraWithYear;
      } else if (obj.format === 'eraADYear') {
        return templates.eraADYear;
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
  
});

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
      if (id == null) {
        this.hidden = true;
        return;
      }
      this.hidden = false;
      
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
  name: 'sw-month-calendar',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      var v = this.value;
      Object.defineProperty (this, 'value', {
        get: () => v,
        set: function (newValue) {
          v = newValue;
          this.swUpdate ();
        },
      });
      this.swUpdate ();
    }, // pcInit
    swUpdate: function () {
      var v = this.value;
      if (v == null) return;

      var thisDay = new Date (v * 1000);
      var wday = (thisDay.getUTCDay () - thisDay.getUTCDate () + 1 + 7*5) % 7;
      var last = new Date (Date.UTC (thisDay.getUTCFullYear (), thisDay.getUTCMonth () + 1, 0, 0, 0, 0)).getUTCDate ();
      var month = [[]];
      for (var i = 0; i < wday; i++) {
        month[0][i] = ['prev-month', i - wday + 1];
      }
      for (var i = 1; i <= last; i++) {
        if (month[0].length === 7) month.unshift ([]);
        month[0].push (['', i]);
      }
      for (var i = month[0].length; i < 7; i++) {
        month[0].push (['next-month', month[0][0][1] + i]);
      }

      var link = (d, label, c) => {
        var day = new Date (Date.UTC (thisDay.getUTCFullYear (), thisDay.getUTCMonth (), d, 0, 0, 0));
        var a = document.createElement ('a');
        if (c) a.className = c;
        a.href = day.toISOString ().replace (/T.*$/, '');
        a.textContent = label || day.getUTCDate ();
        return a;
      };

      this.textContent = '';
      var table = document.createElement ('table');
      var cap = document.createElement ('caption');
      cap.appendChild (link (0, '<', 'prev-month'));
      var time = document.createElement ('time');
      time.textContent = thisDay.toISOString ().replace (/-[0-9]+T.*$/, '')
      cap.appendChild (time);
      cap.appendChild (link (last+1, '>', 'next-month'));
      table.appendChild (cap);
      var tbody = document.createElement ('tbody');
      month.reverse ().forEach (w => {
        var tr = document.createElement ('tr');
        w.forEach (_ => {
          var td = document.createElement ('td');
          td.appendChild (link (_[1], null, _[0]));
          tr.appendChild (td);
        });
        tbody.appendChild (tr);
      });
      table.appendChild (tbody);
      this.appendChild (table);
      
    }, // swUpdate
  },
}); // <sw-month-calendar>

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
    if (era && Number.isFinite (era.table_latest_year)) {
      limit = era.table_latest_year - ref + 1;
    }
  }
  if (!Number.isFinite (limit) || limit <= 0) limit = 100;
  if (!Number.isFinite (nextLimit)) nextLimit = 100;
  if (limit > 300) limit = 300;
  if (era &&
      Number.isFinite (era.table_oldest_year) &&
      era.table_oldest_year + limit < era.known_oldest_year) {
    ref = era.known_oldest_year;
  }
  
  var years = [];
  for (var i = ref; i < ref + limit; i++) {
    var y = {year: i, eraId};
    if (era) {
      y.inRange = era.start_year <= i && i <= era.end_year;
      y.inKnownRange = era.known_oldest_year <= i && i <= era.known_latest_year;
    }
    years.push (y);
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
    var FUTURE = 9999; // Y10K!
    return Object.values (eras).sort ((a, b) => {
      var A = a.offset || a.start_year || a.end_year || FUTURE;
      if (a.offset === 0) A = 0;
      var B = b.offset || b.start_year || b.end_year || FUTURE;
      if (b.offset === 0) B = 0;
      return A - B ||
             a.start_year - b.start_year ||
             a.end_year - b.end_year ||
             a.id - b.id;
    });
  }).then (eras => {
    return {data: eras};
  });
});

SWD.wrefToImageURL = function (wref) {
  var fileName = wref.replace (/^[^:]+:/, '').replace (/ /g, '_');
  var hash = md5 (fileName);
  return 'https://upload.wikimedia.org/wikipedia/commons/'
      + hash.substring (0, 1)
      + '/'
      + hash.substring (0, 2)
      + '/'
      + encodeURIComponent (fileName);
}; // SWD.wrefToImageURL

defineListLoader ('swGOPropListLoader', async function (opts) {
  var go = this.swGeoObject;
  var ps = this.getAttribute ('loader-props');
  var list = [];
  if (ps === 'mainProps') {
    list = go.goDef.mainProps.map (_ => {
      return {
        name: _.name,
        value: go.getPropValue (_.key),
      };
    });
  } else if (ps === 'locationProps') {
    if (go.goDef.id === 'jp-regions') {
      var office = go.getPropValue ('office');
      if (office) {
        var nameSuffix = go.name.substring (go.name.length - 1);
        var label = {
          city: '市役所',
          ward: '区役所',
          town: '町役場',
          village: '村役場',
        }[go.getPropValue ('type')] || nameSuffix + '庁';
        list.push ({
          name: label + '所在地',
          label,
          value: office,
        });
      }
    }
  } else if (ps === 'symbolProps') {
    var symbols = go.getPropValue ('area_symbols') || {};
    Object.keys (symbols).forEach (st => {
      var items = symbols[st];
      items.forEach (symbol => {
        if (st === 'flag' || st === 'mark') {
          //
        } else {
          var nameSuffix = go.name.substring (go.name.length - 1);
          var name = {
            tree: nameSuffix + '木',
            flower: nameSuffix + '花',
            bird: nameSuffix + '鳥',
            fish: nameSuffix + '魚',
            song: nameSuffix + '歌',
            day: nameSuffix + 'の日',
            misc: 'その他',
          }[st] || st;
          var url = symbol.wref ? SWD.wrefToImageURL (symbol.wref) : null;
          var dateValue;
          var dateLabel;
          if (symbol.date_value) {
            var m = symbol.date_value.match (/^([0-9]+)-([0-9]+)$/);
            dateValue = '--' + symbol.date_value;
            dateLabel = parseInt (m[1]) + '月' + parseInt (m[2]) + '日';
          }
          list.push ({
            name,
            value: symbol.name,
            dateValue,
            dateLabel,
            wref: symbol.wref,
            wrefLinkURL: url,
            wrefImageURL: url,
          });
        }
      });
    });
  } else if (ps === 'linkProps') {
    var props = go.goDef.linkProps || [];
    props.forEach (prop => {
      var value = go.getPropValue (prop.key);
      if (value == null) return;
      if (prop.wikipedia) {
        value = 'https://' + prop.wikipedia + '.wikipedia.org/wiki/' + encodeURIComponent (value);
      }
      list.push ({label: prop.name, url: value});
    });
  } else if (ps === 'children') {
    var ct = this.getAttribute ('loader-gotype');
    if (go.goType === 'countries' && go.goId == 57) {
      if (ct === 'jp-prefs') {
        var x = await SWD.geoObjectList ('jp-regions');
        x = x.filter (_ => _.getPropValue ('type') === 'pref');
        x = x.sort ((a, b) => a.getPropValue ('code') - b.getPropValue ('code'));
        list = list.concat (x);
      }
    } else {
      var items = go.getPropValue (this.getAttribute ('loader-key')) || {};
      var keys = Object.keys (items);
      for (var i = 0; i < keys.length; i++) {
        var cGO = await SWD.geoObject (ct, keys[i]);
        list.push (cGO);
      }
    }
  } else if (ps === 'names') {
    list.push ({
      name: go.name,
      kanaName: go.kanaName,
      enName: go.enName,
    });
    var sn = go.getPropValue ('short_name');
    if (sn != null) {
      list.push ({
        name: sn,
        kanaName: go.getPropValue ('kana_short_name'),
        enName: go.getPropValue ('en_short_name'),
      });
    }
  } else if (ps === 'images') {
    var ff = go.getPropValue ('wikipedia_flag_file_name');
    if (ff) {
      var url = SWD.wrefToImageURL (ff);
      list.push ({
        wrefLinkURL: url,
        wrefImageURL: url,
        class: 'flag',
        title: '旗',
      });
    } else {
      var symbols = go.getPropValue ('area_symbols') || [];
      var flags = symbols.flag || [];
      flags.forEach (symbol => {
        var url = SWD.wrefToImageURL (symbol.wref);
        list.push ({
          wrefLinkURL: url,
          wrefImageURL: url,
          class: 'flag',
          title: '旗',
        });
      });
    }

    var wi = go.getPropValue ('wikipedia_image');
    if (wi && wi.wref) {
      var url = SWD.wrefToImageURL (wi.wref);
      list.push ({
        wrefLinkURL: url,
        wrefImageURL: url,
        caption: wi.desc,
      });
    }

    /*
    wi = go.getPropValue ('wikipedia_location_image_wref');
    if (wi) {
      var url = SWD.wrefToImageURL (wi);
      list.push ({
        wrefLinkURL: url,
        wrefImageURL: url,
      });
    }
    */
  } else {
    throw new Error ("Unknown |data-props| value: |"+ps+"|");
  }
  return {data: list};
});

defineListLoader ('swGOListLoader', function (opts) {
  var list = this.swGeoObjectList;
  return {data: list};
});

var RelatedEraTypeIndex = {
  cognate_canon:       10,
  cognate_deviates:    11,
  cognate_deviated:    12,
  name_reuses:         20,
  name_reused:         21,
  name_equal:          22,
  abbr_equal:          23,
  name_rev_equal:      24,
  yomi_equal:          25,
  year_equal:          55,
  transition_prevnext: 60,
  transition_prev:     61,
  transition_next:     62,
  year_range_overlap:  67,
  name_similar:        80,
  other:               99,
};
defineListLoader ('swRelatedEraListLoader', function (opts) {
  var thisEraId = this.getAttribute ('loader-eraid');
  return SWD.relatedEras (thisEraId).then (async _ => {
    var eraIds = Object.keys (_);
    var data = eraIds.map (eraId => {
      var types = _[eraId];
      var type = 'other';
      if (types.cognate_canon) {
        type = 'cognate_canon';
      } else if (types.cognate_deviated) {
        type = 'cognate_deviated';
      } else if (types.cognate_deviates) {
        type = 'cognate_deviates';
      } else if (types.name_reuses) {
        type = 'name_reuses';
      } else if (types.name_reused) {
        type = 'name_reused';
      } else if (types.transition_prev && types.transition_next) {
        type = 'transition_prevnext';
      } else if (types.transition_prev) {
        type = 'transition_prev';
      } else if (types.transition_next) {
        type = 'transition_next';
      } else if (types.name_equal) {
        type = 'name_equal';
      } else if (types.abbr_equal) {
        type = 'abbr_equal';
      } else if (types.year_equal) {
        type = 'year_equal';
      } else if (types.name_rev_equal) {
        type = 'name_rev_equal';
      } else if (types.label_equal) {
        type = 'yomi_equal';
      } else if (types.year_range_overlap) {
        type = 'year_range_overlap';
      } else if (types.label_similar) {
        type = 'name_similar';
      }
      return {eraId, type, types, _ti: RelatedEraTypeIndex[type]};
    });
    for (var i = 0; i < data.length; i++) {
      var era = await SWD.era (data[i].eraId);
      data[i]._eraOffset = era.offset != null ? era.offset : +Infinity;
    }
    data = data.sort ((a, b) => a._ti - b._ti || a._eraOffset - b._eraOffset);
    return {data};
  });
}); // swRelatedEraListLoader

defineListLoader ('swTransitionListLoader', async function (opts) {
  var eraId = this.getAttribute ('loader-eraid');
  var era = await SWD.era (eraId);
  if (!era) throw new Error ("Era not found: " + eraId);

  var items = await SWD.eraTransitionsByEraId (eraId);

  var year = parseFloat (this.getAttribute ('loader-year'));
  if (Number.isFinite (year)) {
    items = items.filter (_ => {
      var d = _.day || _.day_start
      return d.year === year;
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

defineListLoader ('swLabelSetListLoader', async function (opts) {
  var eraId = this.getAttribute ('loader-eraid');
  var lss = await SWD.eraLabelSets (eraId);
  return {data: lss.map (_ => {return {item:_}})};
}); // swLabelSetListLoader

defineElement ({
  name: 'sw-label-set',
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
    swUpdate: function () {
      var labelSet = this.value;

      var stToHTML = st => {
        var c = document.createDocumentFragment ();
        st.forEach (s => {
          if (Array.isArray (s)) {
            s.forEach (_ => {
              if (/^:/.test (_)) {
                var x = document.createElement ('span');
                x.className = 'charref';
                x.textContent = _;
                c.appendChild (x);
              } else {
                c.appendChild (document.createTextNode (_));
              }
            });
          } else if (s === '..') {
            c.appendChild (document.createTextNode ('.'));
          } else if (s === '._') {
            c.appendChild (document.createTextNode (' '));
          } else if (s === '.-') {
            c.appendChild (document.createTextNode ('-'));
          } else if (s === ".'") {
            c.appendChild (document.createTextNode ("'"));
          } else if (s === ".・") {
            c.appendChild (document.createTextNode (""));
          } else if (s === ".(") {
            c.appendChild (document.createTextNode (" ("));
          } else if (s === ".)") {
            c.appendChild (document.createTextNode (") "));
          } else {
            c.appendChild (document.createTextNode (s));
          }
        });
        return c;
      }; // stToHTML

      var readFGs = (fgs, opts) => {
        var out = {
          cn: [], tw: [], ja: [], ja_kana: [], ja_latin: [],
          kr: [], kr_hangul: [],
          en: [], vi: [], vi_latin: [], others: [],
          expandeds: [],
        };
        fgs.forEach (fg => {
          if (fg.form_group_type === 'han' ||
              fg.form_group_type === 'ja' ||
              fg.form_group_type === 'vi' ||
              fg.form_group_type === 'kana') {
            fg.form_sets.forEach (fs => {
              if (fs.form_set_type === 'hanzi') {
                if (fs.cn) out.cn.push (['zh-Hans-CN', fs.cn, opts.captioned ? 'cn' : null]);
                if (fs.cn_complex) out.cn.push (['zh-Hant-CN', fs.cn_complex, 'cn_complex']);
                if (fs.hk) out.cn.push (['zh-HK', fs.hk, 'hk']);
                if (fs.tw) out.tw.push (['zh-TW', fs.tw, opts.captioned ? 'tw' : null]);
                if (fs.jp) out.ja.push (['ja', fs.jp, opts.captioned ? 'jp' : null]);
                if (fs.jp_h22) out.ja.push (['ja', fs.jp_h22, 'jp_h22']);
                if (fs.jp_new) out.ja.push (['ja', fs.jp_new, 'jp_new']);
                if (fs.jp_old) out.ja.push (['ja', fs.jp_old, 'jp_old']);
                if (fs.kr) out.kr.push (['ko-KR', fs.kr, 'kr_hanzi']);
                (fs.others || []).forEach (_ => out.others.push (['und', _]));
              } else if (fs.form_set_type === 'yomi' ||
                         fs.form_set_type === 'kana') {
                if (fs.kana) out.ja.push (['ja', fs.kana, opts.captioned ? 'jp' : null]);
                if (fs.hiragana_modern) out.ja_kana.push (['ja', fs.hiragana_modern, opts.captioned ? 'jp' : null]);
                if (fs.hiragana_classic) out.ja_kana.push (['ja', fs.hiragana_classic, 'ja_hiragana_classic']);
                (fs.hiragana_others || []).forEach (_ => out.ja_kana.push (['ja', _, 'ja_hiragana_other']));
                (fs.han_others || []).forEach (_ => out.ja_kana.push (['ja', _, 'ja_han_other']));
                (fs.hiragana_wrongs || []).forEach (_ => out.ja_kana.push (['ja', _, 'ja_hiragana_wrong']));
                if (fs.ja_latin) out.ja_latin.push (['ja-Latn', fs.ja_latin, opts.captioned ? 'jp' : null]);
                if (fs.ja_latin_normal) out.ja_latin.push (['ja-Latn', fs.ja_latin_normal, 'ja_latin_normal']);
                if (fs.ja_latin_macron) out.ja_latin.push (['ja-Latn', fs.ja_latin_macron, 'ja_latin_macron']);
                (fs.ja_latin_others || []).forEach (_ => out.ja_latin.push (['ja-Latn', _, 'ja_latin_other']));
                if (fs.ja_latin_old) out.ja.push (['ja-Latn', fs.ja_latin_old, 'ja_latin_old']);
                (fs.ja_latin_old_wrongs || []).forEach (_ => out.ja_latin.push (['ja-Latn', _, 'ja_latin_old_wrong']));
                if (fs.on_types) out.ja_kana.push (['on_types', fs.on_types]);
              } else if (fs.form_set_type === 'korean') {
                if (fs.origin_lang === 'vi') {
                  if (fs.kr) out.kr_hangul.push (['ko-KR', fs.kr, 'kr_vi']);
                  if (fs.kr_fukui) out.kr_hangul.push (['ko-Latn-KR', fs.kr_fukui, 'kr_vi_fukui']);
                } else if (fs.origin_lang === 'ja') {
                  if (fs.kr) out.kr_hangul.push (['ko-KR', fs.kr, 'kr_ja']);
                  if (fs.kr_fukui) out.kr_hangul.push (['ko-Latn-KR', fs.kr_fukui, 'kr_ja_fukui']);
                } else {
                  if (fs.kr) out.kr_hangul.push (['ko-KR', fs.kr, opts.captioned ? 'kr' : null]);
                  if (fs.kr_fukui) out.kr_hangul.push (['ko-Latn-KR', fs.kr_fukui, 'kr_fukui']);
                }
                if (fs.kp) out.kr_hangul.push (['ko-KP', fs.kp, 'kp']);
                if (fs.kp_fukui) out.kr_hangul.push (['ko-Latn-KP', fs.kp_fukui, 'kp_fukui']);
                if (fs.ko) out.kr_hangul.push (['ko', fs.ko, 'ko']);
                if (fs.ko_fukui) out.kr_hangul.push (['ko-Latn', fs.ko_fukui, 'ko_fukui']);
              } else if (fs.form_set_type === 'vietnamese') {
                if (fs.vi) out.vi_latin.push (['vi', fs.vi, opts.captioned ? 'vi' : null]);
                if (fs.vi_old) out.vi_latin.push (['vi', fs.vi_old, 'vi_old']);
                if (fs.vi_katakana) out.vi_latin.push (['vi-Kana', fs.vi_katakana, 'vi_katakana']);
              } else if (fs.form_set_type === 'chinese') {
                if (fs.bopomofo) out.tw.push (['zh-Bopo', fs.bopomofo, 'bopomofo']);
                if (fs.nan_bopomofo) out.tw.push (['nan-Bopo', fs.nan_bopomofo, 'nan_bopomofo']);
                if (fs.pinyin) out.cn.push (['zh-Latn', fs.pinyin, 'pinyin']);
                if (fs.zh_alalc) out.cn.push (['zh-Latn', fs.zh_alalc, 'zh_alalc']);
                if (fs.nan_poj) out.cn.push (['nan-Latn', fs.nan_poj, 'nan_poj']);
                if (fs.nan_tl) out.tw.push (['nan-Latn', fs.nan_tl, 'nan_tl']);
              } else if (fs.form_set_type === 'sinkan') {
                if (fs.sinkan && fs.origin_lang === 'zh') out.tw.push (['fos', fs.sinkan, 'sinkan_zh']);
              } else if (fs.form_set_type === 'alphabetical') {
                if (fs.en) {
                  if (fs.origin_lang === 'zh_pinyin') {
                    out.en.push (['en', fs.en, 'en_zh_pinyin']);
                  } else {
                    out.en.push (['en', fs.en, opts.captioned ? 'en' : null]);
                  }
                }
                if (fs.en_la) out.en.push (['en', fs.en_la, 'en_la']);
                if (fs.en_old) out.en.push (['en', fs.en_old, 'en_old']);
                if (fs.es) out.others.push (['es', fs.es, 'es']);
                if (fs.es_old) out.others.push (['es', fs.es_old, 'es_old']);
                if (fs.la) out.others.push (['la', fs.la, opts.captioned ? 'la' : null]);
                if (fs.ja_latin) out.ja_latin.push (['ja-Latn', fs.ja_latin, opts.captioned ? 'jp' : null]);
                if (fs.ja_latin_old) out.ja_latin.push (['ja-Latn', fs.ja_latin_old, 'ja_latin_old']);
                (fs.ja_latin_old_wrongs || []).forEach (_ => out.ja_latin.push (['ja-Latn', _, 'ja_latin_old_wrong']));
                if (fs.fr) {
                  if (fs.origin_lang === 'ja') {
                    out.others.push (['fr', fs.fr, 'fr_ja']);
                  } else {
                    out.others.push (['fr', fs.fr, 'fr']);
                  }
                }
                if (fs.fr_old) out.others.push (['fr', fs.fr_old, 'fr_old']);
                if (fs.it) out.others.push (['it', fs.it, 'it']);
                if (fs.po) out.others.push (['po', fs.po, 'po']);
                (fs.others || []).forEach (_ => out.others.push (['und', _, 'other']));
              }
            });
          } else if (fg.form_group_type === 'alphabetical') {
            fg.form_sets.forEach (fs => {
              if (fs.form_set_type === 'alphabetical') {
                if (fs.en) {
                  if (fs.origin_lang === 'zh_pinyin') {
                    out.en.push (['en', fs.en, 'en_zh_pinyin']);
                  } else if (fs.origin_lang === 'kr') {
                    out.en.push (['en', fs.en, 'en_kr']);
                  } else {
                    out.en.push (['en', fs.en, opts.captioned ? 'en' : null]);
                  }
                }
                if (fs.en_la) out.en.push (['en', fs.en_la, 'en_la']);
                if (fs.en_old) out.en.push (['en', fs.en_old, 'en_old']);
                if (fs.es) out.others.push (['es', fs.es, 'es']);
                if (fs.es_old) out.others.push (['es', fs.es_old, 'es_old']);
                if (fs.la) out.others.push (['la', fs.la, opts.captioned ? 'la' : null]);
                if (fs.ja_latin) out.ja_latin.push (['ja-Latn', fs.ja_latin, opts.captioned ? 'jp' : null]);
                if (fs.ja_latin_old) out.ja_latin.push (['ja-Latn', fs.ja_latin_old, 'ja_latin_old']);
                (fs.ja_latin_old_wrongs || []).forEach (_ => out.ja_latin.push (['ja-Latn', _, 'ja_latin_old_wrong']));
                if (fs.fr) out.others.push (['fr', fs.fr, 'fr']);
                if (fs.fr_old) out.others.push (['fr', fs.fr_old, 'fr_old']);
                if (fs.it) out.others.push (['it', fs.it, 'it']);
                if (fs.po) out.others.push (['po', fs.po, 'po']);
                (fs.others || []).forEach (_ => out.others.push (['und', _, 'other']));
              }
            });
          } else if (fg.form_group_type === 'symbols') {
            fg.form_sets.forEach (fs => {
              if (fs.form_set_type === 'symbols') {
                (fs.others || []).forEach (_ => out.others.push (['und', _, 'other']));
              }
            });
          } else if (fg.form_group_type === 'compound') {
            var fgout = null;
            var defaultOnly = false;
            for (var i = 0; i < fg.items.length; i++) {
              var ifg = fg.items[i];
              var iout = readFGs ([ifg], {});
              if (ifg.form_group_type === 'symbols') {
                iout.others.forEach (_ => {
                  iout.ja.push (['ja', _[1], null]);
                  iout.cn.push (['zh-Hans-CN', _[1], null]);
                  iout.cn.push (['zh-Hant-CN', _[1], null]);
                  iout.cn.push (['zh-HK', _[1], null]);
                  iout.tw.push (['zh-TW', _[1], null]);
                  iout.kr.push (['ko-KR', _[1], 'kr']);
                });
              }
              if (fgout) {
                var matched = false;
                ['ja', 'ja_kana', 'ja_latin', 'cn', 'tw', 'kr'].forEach (k => {
                  var or = (defaultOnly ||
                            ifg.form_group_type === 'kana' ||
                            ifg.form_group_type === 'symbols') &&
                      (k === 'ja' || k === 'cn' || k === 'tw' || k === 'kr');
                  if (iout[k].length && fgout[k].length) {
                    var x = [];
                    fgout[k].forEach (p => {
                      iout[k].forEach (q => {
                        if (p[0] !== q[0]) return;
                        if (!or && p[2] !== q[2]) return;
                        if (p[2] && q[2] && p[2] !== q[2]) return;
                        var w = p[1];
                        if (k === 'ja_latin') w = w.concat (["._"]);
                        w = w.concat (q[1]);
                        x.push ([p[0], w, p[2] || q[2]]);
                      });
                    });
                    fgout[k] = x;
                    matched = true;
                  } else {
                    fgout[k] = [];
                  }
                });
                if (matched) {
                  fgout.kr_hangul = fgout.en =
                  fgout.others = fgout.expandeds = [];
                } else {
                  fgout = null;
                  break;
                }
                if (ifg.form_group_type !== 'kana' &&
                    ifg.form_group_type !== 'symbols') defaultOnly = false;
              } else {
                fgout = iout;
                if (ifg.form_group_type === 'kana' ||
                    ifg.form_group_type === 'symbols') defaultOnly = true;
              }
            }
            if (fgout) {
              for (var n in fgout) {
                out[n] = out[n].concat (fgout[n]);
              }
            }
          } // fg

          if ((fg.expandeds || []).length) {
            fg.expandeds.forEach (xlabel => {
              var xout = readFGs (xlabel.form_groups, {captioned: true});
              out.expandeds = out.expandeds
                  .concat (xout.en)
                  .concat (xout.ja)
                  .concat (xout.cn)
                  .concat (xout.tw)
                  .concat (xout.kr)
                  .concat (xout.vi)
                  .concat (xout.others);
            });
          }
        }); // fg

        out.kr = out.kr_hangul.concat (out.kr);
        out.vi = out.vi_latin.concat (out.vi);
        
        return out;
      }; // readFGs

      var ul = document.createElement ('ul');
      labelSet.labels.forEach (label => {
        var li = document.createElement ('li');

        if (label.abbr) {
          var s = document.createElement ('span');
          s.className = 'label-info-caption';
          s.textContent = '省略形';
          li.appendChild (s);
        }

        var out = readFGs (label.form_groups, {});
        var dl = document.createElement ('dl');
        [
          [[out.ja, out.ja_kana, out.ja_latin], '日本語'],
          [[out.cn], '中文'],
          [[out.tw], '中華民國國語'],
          [[out.kr], '조선어'],
          [[out.vi], 'Tiếng Việt'],
          [[out.en], 'English'],
          [[out.others], 'その他'],
          [[out.expandeds], '展開形', 'expanded'],
        ].forEach (([lists, header, cls]) => {
          if (!lists.filter (_ => _.length).length) return;
          var div = document.createElement ('div');
          if (cls) div.classList.add (cls);
          var dt = document.createElement ('dt');
          dt.textContent = header;
          var dd = document.createElement ('dd');
          lists.forEach (list => {
            if (!list.length) return;
            var ul1 = document.createElement ('ul');
            //var found = {};
            list.forEach (([lang, st, variant]) => {
              var li1 = document.createElement ('li');

              if (lang === 'on_types') {
                st.forEach (_ => {
                  var s = document.createElement ('span');
                  s.className = 'label-on-type label-on-type-' + _;
                  s.innerHTML = {
                    K: '<span>漢音</span>',
                    G: '<span>呉音</span>',
                    KG: '<span>漢音</span> = <span>呉音</span>',
                  }[_] || '<span>?</span>';
                  li1.appendChild (s);
                });
                ul1.appendChild (li1);
                return;
              }
              
              var data = document.createElement ('data');
              data.lang = lang;
              data.classList.toggle ('primary', !variant);
              data.appendChild (stToHTML (st));
              if (variant) {
                var s = document.createElement ('span');
                s.className = 'label-info-caption';
                s.textContent = {
                  cn: '简体字',
                  cn_complex: '繁體字',
                  hk: '香港漢字',
                  tw: '中華民國國語',
                  pinyin: '汉语拼音',
                  zh_alalc: 'ALA-LC',
                  bopomofo: '注音符號',
                  nan_poj: '閩南語白話字',
                  nan_tl: '閩南語臺羅',
                  nan_bopomofo: '方音符號系統',
                  jp: '日本語',
                  jp_old: '日本旧字体',
                  jp_new: '日本新字体',
                  jp_h22: '平成22年',
                  ja_hiragana_classic: '歴史的仮名遣',
                  ja_hiragana_other: '旧表記',
                  ja_hiragana_wrong: '誤表記',
                  ja_han_other: '読み',
                  ja_latin: '日本語ローマ字',
                  ja_latin_normal: '翻字',
                  ja_latin_macron: 'マクロン表記',
                  ja_latin_other: '異表記',
                  ja_latin_old: '旧表記',
                  ja_latin_old_wrong: '誤表記',
                  kr_hanzi: '韓國漢字',
                  kr: '韓國',
                  kr_vi: '越南語系韓國',
                  kr_ja: '日本語系韓國',
                  kp: '北朝鮮',
                  ko: '朝鮮',
                  kr_fukui: '韓國福井式',
                  kr_vi_fukui: '越南語系韓國福井式',
                  kr_ja_fukui: '日本語系韓國福井式',
                  kp_fukui: '北朝鮮福井式',
                  ko_fukui: '朝鮮福井式',
                  sinkan_zh: '中文系新港語',
                  en: 'English',
                  en_zh_pinyin: '汉语拼音系English',
                  en_kr: '韓國語系English',
                  en_la: 'ラテン語系English',
                  en_old: 'English (旧)',
                  es: '西語',
                  es_old: '西語 (旧)',
                  fr: '仏語',
                  fr_ja: '日本語系仏語',
                  fr_old: '仏語 (旧)',
                  la: 'ラテン語',
                  it: 'イタリア語',
                  po: 'ポルトガル語',
                  vi: 'Tiếng Việt',
                  vi_old: 'Chữ Quốc Ngữ (旧)',
                  vi_katakana: '越南語カタカナ',
                  other: '',
                }[variant];
                data.classList.toggle ('label-form-variant-' + variant);
                li1.appendChild (s);
              }
              var cc = document.createElement ('can-copy');
              cc.appendChild (data);
              li1.appendChild (cc);
              //if (!found[li1.innerHTML]) {
              //  found[li1.innerHTML] = true;
                ul1.appendChild (li1);
              //}
            });
            dd.appendChild (ul1);
          }); // list
          div.appendChild (dt);
          div.appendChild (dd);
          dl.appendChild (div);
        });
        li.appendChild (dl);
        
        ul.appendChild (li);
      });
      this.appendChild (ul);
    }, // swUpdate
  },
}); // <sw-label-set>

defineElement ({
  name: 'dl',
  is: 'sw-era-code-list',
  props: {
    pcInit: function () {
      var missings = [];
      this.querySelectorAll ('div').forEach (_ => {
        var code = _.querySelector ('[data-field]');
        if (code) {
          if (code.textContent === '' && code.value == null) {
            _.hidden = true;
            _.querySelectorAll ('a').forEach (_ => missings.push (_));
          }
        } else if (_.classList.contains ('missing')) {
          if (missings.length) {
            var dd = _.querySelector ('dd');
            missings.forEach (_ => {
              dd.appendChild (_);
            });
          } else {
            _.hidden = true;
          }
        }
      });
    }, // pcInit
  }, 
}); // <dl is=sw-era-code-list>

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

defs (() => {

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'swTransitionDescSelector');
  def.pcHandler = function (templates, obj) {
    return templates[obj.action_tag_id] || templates[""];
  };
  document.head.appendChild (def);

});

defineElement ({
  name: 'sw-era-transition-graph',
  props: {
    /*
      <https://data.suikawiki.org/tag/1756/graph?sequence=651&sequence=651%2B1801&sequence=651%2B1171>:
      三国時代
    
      <https://data.suikawiki.org/tag/1933/graph?sequence=1366&sequence=1366%2B1957&sequence=1366%2B1957%2B1524>:
      五代
      <https://data.suikawiki.org/tag/1933/graph?sequence=1366%2B1936-2053&sequence=1366%2B1952-1955&sequence=1366%2B1952%2B1955-1969&sequence=1366%2B1952%2B1955-1969%2B1957-1973&sequence=1366%2B1952%2B1955-1969%2B1957-1973%2B1524&sequence=1366%2B2054&sequence=1366%2B1945&sequence=1366%2B1936%2B2046&sequence=1366%2B1942&sequence=1366%2B2081&sequence=1366%2B1154&sequence=1366%2B2053>:
      五代十国
      
      <https://data.suikawiki.org/tag/1003/graph?sequence=756%2B1065&sequence=756>:
      日本南北朝時代
    */
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
          var v = seq.split (/(?<!\+)(?=[+-][+]?)/);
          var startEraId = v.shift ();
          var startEra = await SWD.era (startEraId);
          if (!startEra) throw new Error ('Era |'+startEraId+'| not found');

          var includedTags = [];
          var included2Tags = [];
          var excludedTags = [];
          for (var j = 0; j < v.length; j++) {
            var m = v[j].match (/^([+-][+]?)([0-9]+)$/);
            if (!m) throw new Error ('Bad sequence specification |'+seq+'|');
            var tag = await SWD.tag (m[2]);
            if (!tag) throw new Error ('Tag |'+m[2]+'| not found');
            if (m[1] === '+') includedTags.push (tag);
            if (m[1] === '++') included2Tags.push (tag);
            if (m[1] === '-') excludedTags.push (tag);
          }

          var items = await this.extractTransitionSequence ({
            startEra,
            includedTags,
            included2Tags,
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
      var tagsIncluded2 = (opts.included2Tags || []).map (_ => _.id);
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
        var matched1 = [];
        var matched2 = [];
        var matched3 = [];
        var matched4 = [];
        var matchedOthers = [];
        var matchedOthers2 = [];
        var matchedOthers3 = [];

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
                (!tr.tag_ids[2107] /* 分離 */ || direction === 'incoming')) {
              fdMatched = true;
              if (hasTag (tr, tagsIncluded) && !hasTag (tr, tagsExcluded)) {
                matched2.push (tr);
              }
              if (!hasTag (tr, tagsExcluded)) {
                fd = fd || tr;
              }
            }
            if (tr.type === 'commenced' || tr.type === 'administrative') {
              if (tr.tag_ids[2107] /* 分離 */) {
                if (hasTag (tr, tagsIncluded) && !hasTag (tr, tagsExcluded)) {
                  matched1.push (tr);
                } else {
                  if (direction === 'incoming' || era.end_year != null) {
                    matchedOthers.push (tr);
                  }
                }
              } else {
                if (hasTag (tr, tagsIncluded) && !hasTag (tr, tagsExcluded)) {
                  matched1.push (tr);
                } else {
                  matchedOthers.push (tr);
                }
              }
            }
            if ((tr.type === 'wartime' ||
                 tr.type === 'received' ||
                 tr.type === 'firstday' ||
                 tr.type === 'renamed') && !fdMatched) {
              if (hasTag (tr, tagsIncluded) && !hasTag (tr, tagsExcluded)) {
                matched2.push (tr);
              } else {
                if (!tr.tag_ids[2107] /* 分離 */ ||
                    direction === 'incoming' ||
                    era.end_year != null) {
                  matchedOthers.push (tr);
                }
              }
            }
            if (tr.type === 'wartime/possible' ||
                tr.type === 'received/possible' ||
                tr.type === 'firstday/possible' ||
                tr.type === 'renamed/possible') {
              if (hasTag (tr, tagsIncluded2) && !hasTag (tr, tagsExcluded)) {
                matched3.push (tr);
              } else {
                if (!tr.tag_ids[2107] /* 分離 */ ||
                    direction === 'incoming' ||
                    era.end_year != null) {
                  matchedOthers2.push (tr);
                }
              }
            }
            if (tr.type === 'wartime/incorrect' ||
                tr.type === 'administrative/incorrect' ||
                tr.type === 'received/incorrect' ||
                tr.type === 'firstday/incorrect' ||
                tr.type === 'renamed/incorrect') {
              if (hasTag (tr, tagsIncluded2) && !hasTag (tr, tagsExcluded)) {
                matched4.push (tr);
              } else {
                if (!tr.tag_ids[2107] /* 分離 */ ||
                    direction === 'incoming' ||
                    era.end_year != null) {
                  matchedOthers3.push (tr);
                }
              }
            }
            if (tr.type === 'firstyearstart' &&
                tr.tag_ids[2108] /* 即位元年年始 */) {
              fys = fys || tr;
            }
          } // prev or next

          if (matched1.length || matched2.length || matched3.length ||
              matched4.length) {
            if ((direction === 'outgoing' && tr.next_era_ids[era.id]) ||
                (direction === 'incoming' && tr.prev_era_ids[era.id])) {
              break;
            }
          }
        } // tr

        //if (era.id == 60) console.log (matched1, matched2, matched3, matched4, fd, fys, matchedOthers, matchedOthers2, matchedOthers3);
        if (matched1.length) return matched1[0];
        if (matched2.length) return matched2[0];
        if (matched3.length) return matched3[0];
        if (matched4.length) return matched4[0];
        if (fd !== null) return fd;
        if (matchedOthers.length) return matchedOthers[matchedOthers.length-1];
        if (matchedOthers2.length) return matchedOthers2[matchedOthers2.length-1];
        if (matchedOthers3.length) return matchedOthers3[matchedOthers3.length-1];
        if (fys !== null) return fys;
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
                break;
              } else {
                console.log ('Multiple next eras', tr);
                nextEraIds = nextEraIds.sort ((a, b) => a - b);
                nextEraId = nextEraIds[0];
              }
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
        'firstday/canceled': true,
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
            (tr.type === 'firstyearstart' && tr.tag_ids[2108] /* 即位元年年始 */) ||
            tr.type === 'deviated' ||
            tr.type === 'taboorenamed' ||
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
                latest_year: era.table_latest_year != null ? era.table_latest_year : era.known_latest_year,
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
          latest_year: era.table_latest_year != null ? era.table_latest_year : era.known_latest_year,
        };
        var c = eraStates[era.id];

        if (c.era.tag_ids[2301] /* 継続中 */) {
        //c.era.start_year != null && c.end_year == null
          c.end_year = FUTURE;
          c.latest_year = FUTURE;
        }
        var future_year = year;
        if (c.era.tag_ids[2300] /* 利用中 */) {
          future_year = FUTURE;
          c.latest_year = FUTURE;
        }

        if (c.selected) {
          var year = era.known_oldest_year;
          if (year == null) year = era.start_year;
          if (year == null && era.offset != null) year = era.offset+1;
          if (year == null) year = era.table_oldest_year;
          if (!Number.isFinite (year)) year = FUTURE;

          if (c.latest_year > FUTURE) c.latest_year = FUTURE;
          if (c.end_year > FUTURE) c.end_year = FUTURE;
          
          [era.known_oldest_year,
           era.table_latest_year,
           era.known_latest_year,
           c.latest_year,
           era.start_year, c.end_year,
           (c.latest_year >= thisYear ? thisYear : year),
           year, future_year].forEach (yy => {
             if (yy > FUTURE) return;
             
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
      ['year-background',
       'era-transitions',
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

        if (args.backgroundCircle) {
          var c = document.createElementNS
              ('http://www.w3.org/2000/svg', 'circle');
          c.setAttribute ('cx', args.x);
          c.setAttribute ('cy', args.y);
          var r = args.width > args.height ? args.width : args.height;
          c.setAttribute ('r', r/2);
          c.setAttribute ('class', 'year-number-cover');
          layers['era-lines-cover'].appendChild (c);
        }
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
          backgroundCircle: true,
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
      var yearBorders = [];

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
          var cy = c.latest_year;
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
        } else {
          yearBorders.push (yearRows[year].top);
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
      }); // shownYears
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
      yearBorders.forEach (y => {
        insertLine ({
          start: [0, y],
          end: [nextColumn, y],
          classList: ['year-border'],
          layer: 'year-background',
        });
      });

      Object.values (eraStates).forEach (c => {
        var years = Object.keys (c.yearAreas).map (_ => parseInt (_)).sort ((a,b) => a-b);
        if (c.selected) {
          var first = years.length ? years[0] : null;
          if (c.era.known_oldest_year < first) first = c.era.known_oldest_year;
          var last = years.length ? years[years.length-1] : null;
          if (last < c.latest_year) last = c.latest_year;
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
              seqLineS[item.era.id] = seqLineS[item.era.id] || (seqLined[item.era.id] = (seqLined[item.era.id] || 0) + 1);
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
                end: [ap[1][0]+seqLineS[item.era.id]*seqLineShift, ap[1][1]],
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
      } // sequences

      svg.setAttribute ('width', nextColumn);
      svg.setAttribute ('height', nextRow);

      this.textContent = '';
      this.appendChild (svg);
    }, // swRender
  },
}); // <sw-era-transition-graph>

defineElement ({
  name: 'table',
  is: 'sw-era-list-by-first-year',
  props: {
    pcInit: function () {
      return this.swRender ();
    }, // pcInit
    swRender: async function () {
      var FUTURE = 9999; // Y10K!
      var eras = await SWD.eraList ({});
      var years = new Set;
      var yearEras = [];
      eras.forEach (era => {
        var y = era.offset + 1;
        if (era.offset == null) {
          y = era.start_year || era.end_year || FUTURE;
          y += 0.5;
        }
        years.add (y);
        yearEras[y] = yearEras[y] || [];
        yearEras[y].push (era);
      });

      var tbody = this.tBodies[0];
      tbody.innerHTML = '';
      var prev = NaN;
      Array.from (years).sort ((a, b) => a-b).forEach (y => {
        var unknownYear = Math.floor (y) !== y;
        if (prev + 1 < y || unknownYear || Math.floor (prev) !== prev) {
          tbody = document.createElement ('tbody');
          this.appendChild (tbody);
        }
        prev = y;
        var tr = document.createElement ('tr');
        
        var th = document.createElement ('th');
        th.setAttribute ('class', 'year-header');
        if (!unknownYear && y !== FUTURE) {
          var year = document.createElement ('sw-data-year');
          year.value = y;
          year.setAttribute ('format', 'yearHeader');
          th.appendChild (year);
        }
        tr.appendChild (th);

        var td = document.createElement ('td');
        yearEras[y].sort ((a, b) => {
          return a.start_year - b.start_year ||
                 a.end_year - b.end_year ||
                 a.id - b.id;
        }).forEach (era => {
          var e = document.createElement ('sw-data-era');
          e.setAttribute ('class', 'era-list-item');
          e.value = era.id;
          e.setAttribute ('template', 'sw-data-era-in-menu');
          td.appendChild (e);
        });
        tr.appendChild (td);
        
        tbody.appendChild (tr);
      });
    }, // swRender
  }, 
}); // <table is=sw-era-list-by-first-year>

defineElement ({
  name: 'table',
  is: 'sw-era-kanshi-years',
  props: {
    pcInit: function () {
      return this.swRender ();
    }, // pcInit
    swRender: async function () {
      var thisYear = (new Date).getFullYear ();

      var eraId = this.getAttribute ('eraid');
      var relateds = await SWD.relatedEras (eraId);
      var eraIds = Object.keys (relateds).filter (_ => relateds[_].label_equal);
      eraIds.unshift (eraId);

      var eees = [];
      for (var i = 0; i < eraIds.length; i++) {
        var era = await SWD.era (eraIds[i]);

        var core_start = era.start_year;
        if (core_start == null) core_start = era.offset;
        if (core_start == null) core_start = thisYear - 60;
        var start = era.known_oldest_year;
        if (start == null) start = core_start;
        var core_end = era.end_year;
        if (era.start_year != null && era.end_year == null) core_end = thisYear;
        if (core_end == null) core_end = thisYear;
        var end = era.known_latest_year;
        if (era.start_year != null && era.end_year == null) end = thisYear;
        if (end == null) end = thisYear;
        var kStart = mod (start - 4, 60);
        var first = start - kStart;
        var cols = 1;
        while (first + cols * 60 < end) {
          cols++;
        }
        var eee = {first, cols, start, end, core_start, core_end, era,
                   kStart};
        if (eraId == era.id) {
          eee.active = true;
          eee._ne = true;
        } else {
          eee.active = false;
          eee._ne = relateds[era.id].name_equal || 0;
        }
        eees.push (eee);
      } // era

      eees = eees.sort ((a, b) => {
        return b._ne - a._ne ||
               a.kStart - b.kStart ||
               a.start - b.start ||
               a.end - b.end ||
               a.era.id - b.era.id;
      });
      
      var thead = this.tHead;
      var headers = thead.rows[0];
      eees.forEach (eee => {
        var cg = document.createElement ('colgroup');
        cg.span = eee.cols;
        this.insertBefore (cg, thead);
        
        var th = document.createElement ('th');
        th.setAttribute ('colspan', eee.cols);
        th.classList.toggle ('active', eee.active);
        var e = document.createElement ('sw-data-era');
        e.value = eee.era.id;
        e.setAttribute ('template', 'sw-data-era-item');
        th.appendChild (e);
        headers.appendChild (th);
      }); // eee

      var tbody = this.tBodies[0];
      for (var i = 0; i < 60; i++) {
        var tr = document.createElement ('tr');

        var th = document.createElement ('th');
        var e = document.createElement ('sw-data-kanshi');
        e.value = i;
        th.appendChild (e);
        tr.appendChild (th);

        eees.forEach (eee => {
          for (var j = 0; j < eee.cols; j++) {
            var y = eee.first + j * 60 + i;
            var td = document.createElement ('td');
            td.classList.toggle ('active', eee.active);
            td.classList.toggle ('year-numbers', true);
            if (eee.start <= y && y <= eee.end) {
              td.classList.toggle ('in-era-known-year', true);
              if (eee.core_start <= y && y <= eee.core_end) {
                td.classList.toggle ('in-era-year', true);
              }
            }
            var e = document.createElement ('sw-data-year');
            e.value = y;
            e.setAttribute ('eraid', eee.era.id);
            e.setAttribute ('format', 'eraADYear');
            td.appendChild (e);
            tr.appendChild (td);
          }
        }); // eee

        tbody.appendChild (tr);
      }
    }, // swRender
  }, 
}); // <table is=sw-era-kanshi-years>

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
  is: 'sw-calc-form',
  props: {
    pcInit: function () {
      this.oninput = () => this.swUpdate ();
      this.action = 'javascript:';
      this.swUpdate ();
    }, // pcInit
    swUpdate: function () {
      var nn = this.querySelector ('input[type=number]');
      if (!nn) return;

      if (nn.value) {
        var n = nn.valueAsNumber;
        this.querySelectorAll ('output').forEach (_ => {
          var m = n;
          
          var a = _.getAttribute ('data-add');
          if (a) m += parseFloat (a);

          var s = _.getAttribute ('data-subtract');
          if (s) m -= parseFloat (s);

          _.textContent = m;
        });
      } else {
        this.querySelectorAll ('output').forEach (_ => _.textContent = '');
      }
    }, // swUpdate
  },
}); // <form is=sw-calc-form>

defineElement ({
  name: 'form',
  is: 'sw-year-determination-form',
  props: {
    pcInit: function () {
      var thisYear = (new Date).getFullYear ();
      
      this.action = 'javascript:';
      this.oninput = () => this.swUpdate ();
      this.onchange = () => {
        var iy = parseFloat (this.elements.input_year.value);
        if (Number.isFinite (iy)) {
          this.swAddYear (iy);
        }
      };
      this.swYears = [0, 1];

      var s = new window.URL (location.href).searchParams;
      this.elements.input_year.value = s.get ('input_year') || 1;
      this.elements.input_ref_year.value = s.get ('input_ref_year') || thisYear;
      this.elements.input_ref_era.value = s.get ('input_ref_era') || 'ad';
      
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
      var ry0 = ry;
      var re = form.elements.input_ref_era.value;
      if (re === 'bc') {
        ry = 1 - ry;
      } else if (re === 'kouki') {
        ry -= 660;
      } else if (re === 'bkouki') {
        ry = 1 - ry - 660;
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

      var u = location.pathname + '?input_year=' + iy + '&input_ref_year=' + ry0 + '&input_ref_era=' + re;
      history.replaceState (null, null, u);

      setTimeout (() => {
        form.querySelectorAll ('.active').forEach (_ => {
          _.parentNode.scrollLeft = _.offsetLeft + _.offsetWidth/2 - _.parentNode.offsetWidth/2;
        });
      }, 100);
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


function createMapFromSpotList (mapId, selectors, onselect) {
  var spots = document.querySelectorAll (selectors);
  if (spots.length) {
    var pos = new google.maps.LatLng
        (spots[0].getAttribute ('data-spot-lat'),
         spots[0].getAttribute ('data-spot-lon'));
    var mapEl = mapId.nodeType ? mapId : document.getElementById (mapId);
    var map = new google.maps.Map
        (mapEl, {
           center: pos,
           zoom: parseInt (mapEl.getAttribute ('data-map-zoom')) || 6,
           mapTypeId: google.maps.MapTypeId.HYBRID
         });
    for (var i = 0; i < spots.length; i++) (function (el) {
      var pos = new google.maps.LatLng
          (el.getAttribute ('data-spot-lat'),
           el.getAttribute ('data-spot-lon'));
      var marker = new google.maps.Marker ({
        position: pos,
        map: map,
        title: el.getAttribute ('data-spot-name') || el.textContent
      });
      google.maps.event.addListener (marker, 'click', function () {
        if (onselect) {
          onselect (el);
        } else {
          for (var j = 0; j < spots.length; j++) {
            if (spots[j] === el) {
              spots[j].className += ' selected';
            } else {
              spots[j].className = spots[j].className.replace (/\bselected\b/g, '');
            }
          }
        }
      });
    }) (spots[i]);
  }
} // createMapFromSpotList



SWD._antennaCategories = {};
[
  {type: 'web', name: 'Web', urlPrefix: '/web/'},
  {type: 'houses', name: '住居', urlPrefix: '/houses/', noOld: true, isSensitive: true},
  {type: 'radio', name: 'アニメ関連番組', urlPrefix: '/radio/'},
  {type: 'date', name: '日', urlPrefix: 'https://data.suikawiki.org/datetime/'},
].map (_ => SWD._antennaCategories[_.type] = _);

SWD.antennaCategoryList = async function () {
  return SWD._antennaCategories;
}; // SWD.antennaCategoryList

defineListLoader ('swAntennaCategoryListLoader', async function (opts) {
  var list = await SWD.antennaCategoryList ();
  return {data: list};
});

defineElement ({
  name: 'sw-antenna-recent-list',
  props: {
    pcInit: function () {
      this.swUpdate ();
    }, // pcInit
    swUpdate: async function () {
      var ts = await $getTemplateSet (this.localName);
      var list = this.querySelector ('ol');
      list.textContent = '';
      
      var urlPrefix = this.getAttribute ('href');
      var d = new Date () . valueOf ();
      for (var i = 0; i < 10; i++) {
        var item = {
          urlPrefix,
          dayYMD: new Date (d) . toISOString () . replace (/T.*/, ''),
        };
        item.day = new Date (item.dayYMD + 'T00:00:00Z').valueOf () / 1000;

        var e = ts.createFromTemplate ('li', item);
        list.appendChild (e);

        d -= 24*60*60*1000;
      }
    }, // swUpdate
  },
}); // <sw-antenna-recent-list>

SWD.antennaCategory = async function (t) {
  return SWD._antennaCategories[t]; // or undefined
}; // SWD.antennaCategory

SWD.antennaDayList = async function (cat, dv) {
  var day = new Date (dv);
  var c = await SWD.antennaCategory (cat);
  if (c.noOld && (new Date).valueOf () - dv > 100*24*60*60*1000) {
    return {data: []};
  }
  var ymd = day.toISOString ().replace (/T.*$/, '');
  var ym = ymd.replace (/-[0-9]+$/, '');
  return SWD.data ('antenna/' + cat + '/' + ym + '.json').catch (res => {
    if (res.status === 404) return {items: []};
    throw res;
  }).then (json => {
    var start = new Date (ymd + 'T00:00:00Z') . valueOf () / 1000;
    var end = new Date (ymd + 'T24:00:00Z') . valueOf () / 1000;
    var list = json.items.filter (_ => {
      return start <= _.timestamp && _.timestamp < end;
    });
    list.forEach (_ => {
      if (!_.blog_title) delete _.blog_title;
      if (!_.title && _.body) {
        _.title = _.body.substring (0, 60);
      }
      if (!_.title) _.title = _.blog_title;
      _.authors = [_.author].concat (_.casts || []).filter (_ => _ && _.length);
      _.blogLinkURL = _.program_key ? '/radio/p/' + _.program_key : _.url;
    });
    return {data: list};
  });
}; // SWD.antennaDayList

defineListLoader ('swAntennaDayListLoader', async function (opts) {
  var cat = this.getAttribute ('loader-category');
  var dv = this.getAttribute ('loader-day') * 1000;
  return SWD.antennaDayList (cat, dv);
});

defineElement ({
  name: 'sw-keyword-list',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      this.swUpdate ();
    },
    swUpdate: function () {
      (this.value || []).forEach (_ => {
        this.appendChild (document.createTextNode (' '));
        var a = this.appendChild (document.createElement ('a'));
        a.textContent = _;
        a.href = 'https://wiki.suikawiki.org/n/' + encodeURIComponent (_);
      });
    }, // swUpdate
  },
}); // <sw-keyword-list>

defineElement ({
  name: 'sw-hashtag-list',
  fill: 'idlattribute',
  props: {
    pcInit: function () {
      this.swUpdate ();
    },
    swUpdate: function () {
      (this.value || []).forEach (_ => {
        this.appendChild (document.createTextNode (' '));
        var a = this.appendChild (document.createElement ('a'));
        a.textContent = '#' + _;
        a.href = 'https://twitter.com/hashtag/' + encodeURIComponent (_);
      });
    }, // swUpdate
  },
}); // <sw-hashtag-list>

SWD.radioProgram = async function (key) {
  var programs = await SWD.data ('antenna/radio/programs.json');
  return programs[key]; // or undefined
}; // SWD.radioProgram



defineListLoader ('swRecentListLoader', async function (opts) {
  var key = this.getAttribute ('loader-key');
  return fetch ('https://suikawiki.org/feed' + (key ? '/' + key : ''), {
    mode: 'cors',
    cache: (SWD.isReload ? 'reload' : undefined),
  }).then (res => {
    if (res.status !== 200) throw res;
    return res.text ();
  }).then (text => {
    var div = document.createElement ('div');
    div.innerHTML = text;

    var list = Array.prototype.slice.call (div.querySelectorAll ('entry'), 0, 20).map (e => {
      var url = e.querySelector ('link[href]:not([rel])').getAttribute ('href');
      var label = e.querySelector ('title').textContent;
      return {url, label};
    });
    
    return {data: list};
  });
});

/* ------ Tags ------ */

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

defineElement ({
  name: 'sw-data-tag',
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

      var tags = await SWD.tagsByIds ([v]);
      
      var ts = await $getTemplateSet (this.getAttribute ('template') || this.localName);
      var e = ts.createFromTemplate ('div', tags[0]);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
    }, // swUpdate
  },
}); // <sw-data-tag>

/*

Copyright 2014-2023 Wakaba <wakaba@suikawiki.org>.

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
