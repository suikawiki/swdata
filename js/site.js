
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

      var args = {};
      var path = location.pathname;

      var m = path.match (/^\/y\/(-?[0-9]+)\/$/);
      if (m) {
        args.name = 'year-item-index';
        args.year = parseFloat (m[1]);
      }
      
      var e = this.swTemplateSet.createFromTemplate ('div', args);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
        
    }, // swUpdate
  },
}); // <section is=sw-page-main>

(() => {

  var def = document.createElementNS ('data:,pc', 'templateselector');
  def.setAttribute ('name', 'selectPageTemplate');
  def.pcHandler = function (templates, obj) {
    return templates[obj.name] || templates[""];
  };
  document.head.appendChild (def);
  
}) ();

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

      var args = {value0: v, value1: v+1};
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
}); // <sw-data-year>

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

      var args = {value: v};
      var ts = await $getTemplateSet (this.localName);
      var e = ts.createFromTemplate ('div', args);
      this.textContent = '';
      while (e.firstChild) {
        this.appendChild (e.firstChild);
      }
      
    }, // swUpdate
  },
}); // <sw-data-year>

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
          while (true) {
            if (0 === mod (y, 4)) break;
            y++;
          }
          return ['year', y];
        } else if (name === 'prev-proleptic-julian-leap-year') {
          var y = parseFloat (this.getAttribute ('arg-year'));
          y--;
          while (true) {
            if (0 === mod (y, 4)) break;
            y--;
          }
          return ['year', y];
        } else if (name === 'next-proleptic-gregorian-leap-year') {
          var y = parseFloat (this.getAttribute ('arg-year'));
          y++;
          while (true) {
            if (0 === mod (y, 4) && !(0 === mod (y, 100) && !(0 === mod (y, 400)))) break;
            y++;
          }
          return ['year', y];
        } else if (name === 'prev-proleptic-gregorian-leap-year') {
          var y = parseFloat (this.getAttribute ('arg-year'));
          y--;
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

/*

Copyright 2020 Wakaba <wakaba@suikawiki.org>.

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
